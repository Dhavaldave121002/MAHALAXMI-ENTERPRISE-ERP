import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertTriangle, Circle, Monitor, Square, Video } from 'lucide-react'
import { Room, Track } from 'livekit-client'
import { uploadPrivateClip } from './privateClipUpload'
import './ScreenRecording.css'

const SCREEN_CLIP_DURATION_MS = 5 * 60 * 1000
const MAX_SCREEN_CLIP_BYTES = 100 * 1024 * 1024

type ScreenRecordingStatus = 'idle' | 'requesting' | 'recording' | 'stopping' | 'error'
type ScreenRecordingControlHandle = { stopAndUpload: () => Promise<string> }
type ScreenRecordingUser = { id: string; name: string; role: string }
type PictureInPictureCapture = { stream: MediaStream; dispose: () => void }

function messageFor(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (/permission to call UrlFetchApp\.fetch|authorization is required to perform that action|missing required permissions?.*script\.external_request|insufficient authentication scopes/i.test(message)) {
    return 'Apps Script reports that its upload request lacks authorization. In the Apps Script editor, select authorizeCameraClipUploads (not onOpen), run it as the web-app deployment owner, and approve Drive/external-request permissions. If it succeeds, check Executions for the latest doPost failure and confirm Vercel uses this deployment URL.'
  }
  if (/unknown audit event|unknown erp action|deployment is outdated|google apps script returned an invalid response|incompatible response/i.test(message)) {
    return 'Screen recording needs an Apps Script update. Ask the Super Admin to deploy the latest Code.gs as a new web-app version.'
  }
  return message || 'Screen recording could not be completed.'
}

function screenShareWasDeclined(error: unknown) {
  return error instanceof Error && ['AbortError', 'NotAllowedError'].includes(error.name)
}

async function createPictureInPictureCapture(screenStream: MediaStream, cameraStream: MediaStream): Promise<PictureInPictureCapture> {
  const screenVideo = document.createElement('video')
  screenVideo.muted = true
  screenVideo.playsInline = true
  screenVideo.srcObject = screenStream

  const cameraVideo = document.createElement('video')
  cameraVideo.muted = true
  cameraVideo.playsInline = true
  cameraVideo.srcObject = cameraStream

  let captureStream: MediaStream | null = null
  let animationFrame: number | null = null
  try {
    await Promise.all([screenVideo.play(), cameraVideo.play()])
    const screenSettings = screenStream.getVideoTracks()[0]?.getSettings()
    const sourceWidth = screenVideo.videoWidth || screenSettings?.width || 1280
    const sourceHeight = screenVideo.videoHeight || screenSettings?.height || 720
    const scale = Math.min(1, 1920 / sourceWidth, 1080 / sourceHeight)
    const width = Math.max(2, Math.floor(sourceWidth * scale / 2) * 2)
    const height = Math.max(2, Math.floor(sourceHeight * scale / 2) * 2)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context || typeof canvas.captureStream !== 'function') {
      throw new Error('This browser cannot create a picture-in-picture recording.')
    }

    const overlayWidth = Math.round(width * 0.24)
    const overlayHeight = Math.round(overlayWidth * 0.75)
    const padding = Math.max(8, Math.round(width * 0.02))
    const overlayX = width - overlayWidth - padding
    const overlayY = height - overlayHeight - padding
    let lastFrameAt = 0
    const drawFrame = (timestamp: number) => {
      if (timestamp - lastFrameAt >= 100 &&
          screenVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          cameraVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        context.drawImage(screenVideo, 0, 0, width, height)
        context.fillStyle = '#fff'
        context.fillRect(overlayX - 2, overlayY - 2, overlayWidth + 4, overlayHeight + 4)
        const cameraWidth = cameraVideo.videoWidth
        const cameraHeight = cameraVideo.videoHeight
        const sourceAspect = cameraWidth / cameraHeight
        const targetAspect = overlayWidth / overlayHeight
        let cropX = 0
        let cropY = 0
        let cropWidth = cameraWidth
        let cropHeight = cameraHeight
        if (sourceAspect > targetAspect) {
          cropWidth = cameraHeight * targetAspect
          cropX = (cameraWidth - cropWidth) / 2
        } else {
          cropHeight = cameraWidth / targetAspect
          cropY = (cameraHeight - cropHeight) / 2
        }
        context.drawImage(
          cameraVideo,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          overlayX,
          overlayY,
          overlayWidth,
          overlayHeight,
        )
        lastFrameAt = timestamp
      }
      animationFrame = window.requestAnimationFrame(drawFrame)
    }
    drawFrame(0)
    captureStream = canvas.captureStream(10)
    return {
      stream: captureStream,
      dispose: () => {
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
        captureStream?.getTracks().forEach(track => track.stop())
        screenVideo.pause()
        cameraVideo.pause()
        screenVideo.srcObject = null
        cameraVideo.srcObject = null
      },
    }
  } catch (error) {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    captureStream?.getTracks().forEach(track => track.stop())
    screenVideo.pause()
    cameraVideo.pause()
    screenVideo.srcObject = null
    cameraVideo.srcObject = null
    throw error
  }
}

async function recordScreenAuditEvent(eventType: 'screen_recording_started' | 'screen_recording_stopped') {
  const response = await fetch('/api/erp?resource=audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType }),
    cache: 'no-store',
  })
  const result = await response.json() as { error?: string }
  if (!response.ok) throw new Error(result.error || 'Screen recording activity could not be logged.')
}

export type ScreenRecordingController = ScreenRecordingControlHandle

export const ScreenRecordingControl = forwardRef<ScreenRecordingControlHandle, { user: ScreenRecordingUser }>(
  function ScreenRecordingControl({ user }, ref) {
    const [status, setStatus] = useState<ScreenRecordingStatus>('idle')
    const [error, setError] = useState('')
    const [uploadsPending, setUploadsPending] = useState(0)
    const streamRef = useRef<MediaStream | null>(null)
    const cameraStreamRef = useRef<MediaStream | null>(null)
    const pictureInPictureRef = useRef<PictureInPictureCapture | null>(null)
    const screenRoomRef = useRef<Room | null>(null)
    const screenTrackRef = useRef<MediaStreamTrack | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const clipStartedAtRef = useRef(0)
    const flushTimerRef = useRef<number | null>(null)
    const activeRef = useRef(false)
    const startingRef = useRef(false)
    const cancelStartRef = useRef(false)
    const uploadQueueRef = useRef<Promise<void>>(Promise.resolve())
    const uploadErrorRef = useRef('')
    const stopPromiseRef = useRef<Promise<string> | null>(null)
    const stopRef = useRef<() => Promise<string>>(async () => '')

    const queueClip = useCallback((blob: Blob, startedAt: number, mimeType: string) => {
      if (blob.size > MAX_SCREEN_CLIP_BYTES) {
        const detail = 'A screen clip exceeded the 100 MB limit and could not be saved.'
        uploadErrorRef.current = detail
        setError(detail)
        if (activeRef.current) void stopRef.current()
        return
      }
      const upload = uploadQueueRef.current
        .catch(() => undefined)
        .then(() => uploadPrivateClip(new Blob([blob], { type: mimeType }), startedAt, 'screen'))
      const handledUpload = upload.then(() => undefined).catch(uploadError => {
        const detail = `A screen clip could not be saved to Drive: ${messageFor(uploadError)}`
        uploadErrorRef.current = detail
        setError(detail)
      })
      uploadQueueRef.current = handledUpload
      setUploadsPending(count => count + 1)
      void handledUpload.finally(() => setUploadsPending(count => Math.max(0, count - 1)))
    }, [])

    const flushClip = useCallback((mimeType: string) => {
      const chunks = chunksRef.current
      chunksRef.current = []
      const startedAt = clipStartedAtRef.current
      clipStartedAtRef.current = Date.now()
      if (!chunks.length) return
      const clip = new Blob(chunks, { type: mimeType })
      if (clip.size) queueClip(clip, startedAt, mimeType)
    }, [queueClip])

    const createClipRecorder = useCallback((stream: MediaStream, mimeType: string) => {
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500_000 })
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        uploadErrorRef.current = 'The browser screen recorder encountered an error.'
        setError(uploadErrorRef.current)
        void stopRef.current()
      }
      recorder.onstop = () => flushClip(recorder.mimeType || mimeType)
      return recorder
    }, [flushClip])

    const rotateClipRecorder = useCallback(async (mimeType: string) => {
      const recorder = recorderRef.current
      const stream = streamRef.current
      if (!activeRef.current || !recorder || !stream || recorder.state === 'inactive') return

      let stopFailed = false
      await new Promise<void>(resolve => {
        recorder.addEventListener('stop', () => resolve(), { once: true })
        try {
          recorder.stop()
        } catch (stopError) {
          stopFailed = true
          uploadErrorRef.current = `The screen clip could not be finalized: ${messageFor(stopError)}`
          setError(uploadErrorRef.current)
          flushClip(recorder.mimeType || mimeType)
          resolve()
        }
      })

      if (stopFailed) {
        void stopRef.current()
        return
      }
      if (!activeRef.current || streamRef.current !== stream) return
      try {
        const nextRecorder = createClipRecorder(stream, mimeType)
        recorderRef.current = nextRecorder
        clipStartedAtRef.current = Date.now()
        nextRecorder.start(1000)
      } catch (startError) {
        uploadErrorRef.current = `The next screen clip could not be started: ${messageFor(startError)}`
        setError(uploadErrorRef.current)
        void stopRef.current()
      }
    }, [createClipRecorder, flushClip])

    const stopAndUpload = useCallback(() => {
      if (stopPromiseRef.current) return stopPromiseRef.current
      if (!activeRef.current && !streamRef.current) return Promise.resolve(uploadErrorRef.current)

      const stopPromise = (async () => {
        activeRef.current = false
        setStatus('stopping')
        if (flushTimerRef.current !== null) {
          window.clearInterval(flushTimerRef.current)
          flushTimerRef.current = null
        }

        const recorder = recorderRef.current
        const stream = streamRef.current
        const cameraStream = cameraStreamRef.current
        const pictureInPicture = pictureInPictureRef.current
        const screenRoom = screenRoomRef.current
        const screenTrack = screenTrackRef.current
        recorderRef.current = null
        streamRef.current = null
        cameraStreamRef.current = null
        pictureInPictureRef.current = null
        screenRoomRef.current = null
        screenTrackRef.current = null
        if (recorder && recorder.state !== 'inactive') {
          await new Promise<void>(resolve => {
            recorder.addEventListener('stop', () => resolve(), { once: true })
            try {
              recorder.stop()
            } catch (stopError) {
              uploadErrorRef.current = `The final screen segment could not be finalized: ${messageFor(stopError)}`
              flushClip(recorder.mimeType || 'video/webm')
              resolve()
            }
          })
        } else if (recorder) {
          flushClip(recorder.mimeType || 'video/webm')
        }
        let failure = uploadErrorRef.current
        if (screenRoom) {
          try {
            if (screenTrack) await screenRoom.localParticipant.unpublishTrack(screenTrack, false)
            await screenRoom.disconnect()
          } catch (liveError) {
            if (!failure) failure = `Live screen sharing could not be stopped cleanly: ${messageFor(liveError)}`
          }
        }
        pictureInPicture?.dispose()
        cameraStream?.getTracks().forEach(track => track.stop())
        stream?.getTracks().forEach(track => track.stop())
        await uploadQueueRef.current

        if (!failure) failure = uploadErrorRef.current
        try {
          await recordScreenAuditEvent('screen_recording_stopped')
        } catch (auditError) {
          if (!failure) failure = `Recording stopped, but the activity event could not be logged: ${messageFor(auditError)}`
        }
        setStatus(failure ? 'error' : 'idle')
        setError(failure)
        return failure
      })()
      stopPromiseRef.current = stopPromise
      void stopPromise.then(() => {
        if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null
      }, () => {
        if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null
      })
      return stopPromise
    }, [flushClip])
    const stopAndCancelPendingStart = useCallback(async () => {
      if (startingRef.current) cancelStartRef.current = true
      return stopAndUpload()
    }, [stopAndUpload])
    stopRef.current = stopAndUpload
    useImperativeHandle(ref, () => ({ stopAndUpload: stopAndCancelPendingStart }), [stopAndCancelPendingStart])

    const startRecording = async () => {
      if (startingRef.current || status === 'requesting' || status === 'recording' || status === 'stopping') return
      startingRef.current = true
      cancelStartRef.current = false
      setError('')
      setStatus('requesting')
      let stream: MediaStream | null = null
      let cameraStream: MediaStream | null = null
      let pictureInPicture: PictureInPictureCapture | null = null
      let screenRoom: Room | null = null
      let screenTrack: MediaStreamTrack | null = null
      let sharePromptResolved = false
      let cameraPermissionPrompted = false
      let auditStarted = false
      let stopAuditAttempted = false
      const stopPendingCapture = () => {
        pictureInPicture?.dispose()
        pictureInPicture = null
        cameraStream?.getTracks().forEach(track => track.stop())
        cameraStream = null
        stream?.getTracks().forEach(track => track.stop())
        stream = null
      }
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('This browser does not support secure screen sharing.')
        }
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 10, max: 15 } }, audio: false })
        sharePromptResolved = true
        if (cancelStartRef.current) {
          stopPendingCapture()
          setStatus('idle')
          return
        }
        screenTrack = stream.getVideoTracks()[0] || null
        if (!screenTrack || screenTrack.readyState !== 'live') throw new Error('Choose an active screen or browser tab to record.')
        const mimeType = ['video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type))
        if (!mimeType) throw new Error('This browser cannot create a supported screen recording.')

        cameraPermissionPrompted = true
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15, max: 30 },
          },
          audio: false,
        })
        if (cameraStream.getVideoTracks()[0]?.readyState !== 'live') {
          throw new Error('Choose an active webcam to start picture-in-picture recording.')
        }
        if (cancelStartRef.current) {
          stopPendingCapture()
          setStatus('idle')
          return
        }
        pictureInPicture = await createPictureInPictureCapture(stream, cameraStream)
        if (cancelStartRef.current) {
          stopPendingCapture()
          setStatus('idle')
          return
        }

        await recordScreenAuditEvent('screen_recording_started')
        auditStarted = true
        if (cancelStartRef.current) {
          stopPendingCapture()
          await recordScreenAuditEvent('screen_recording_stopped')
          setStatus('idle')
          return
        }
        const liveSession = await fetch('/api/cameras/token?scope=screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })
        const liveResult = await liveSession.json() as { token?: string; url?: string; error?: string }
        if (!liveSession.ok || !liveResult.token || !liveResult.url) {
          throw new Error(liveResult.error || 'Live screen sharing could not be authorized.')
        }
        if (cancelStartRef.current) {
          stopPendingCapture()
          await recordScreenAuditEvent('screen_recording_stopped')
          setStatus('idle')
          return
        }
        screenRoom = new Room({ adaptiveStream: true })
        await screenRoom.connect(liveResult.url, liveResult.token)
        if (cancelStartRef.current) {
          await screenRoom.disconnect()
          stopPendingCapture()
          await recordScreenAuditEvent('screen_recording_stopped')
          setStatus('idle')
          return
        }
        if (screenTrack.readyState !== 'live') throw new Error('Screen sharing ended before recording could start.')
        if (cameraStream.getVideoTracks()[0]?.readyState !== 'live') {
          throw new Error('Webcam access ended before recording could start.')
        }
        await screenRoom.localParticipant.publishTrack(screenTrack, {
          source: Track.Source.ScreenShare,
          name: 'user-screen-share',
        })
        if (cancelStartRef.current) {
          await screenRoom.localParticipant.unpublishTrack(screenTrack, false)
          await screenRoom.disconnect()
          stopPendingCapture()
          await recordScreenAuditEvent('screen_recording_stopped')
          setStatus('idle')
          return
        }

        streamRef.current = stream
        cameraStreamRef.current = cameraStream
        pictureInPictureRef.current = pictureInPicture
        screenRoomRef.current = screenRoom
        screenTrackRef.current = screenTrack
        chunksRef.current = []
        clipStartedAtRef.current = Date.now()
        uploadQueueRef.current = Promise.resolve()
        uploadErrorRef.current = ''
        activeRef.current = true
        const recorder = createClipRecorder(pictureInPicture.stream, mimeType)
        recorderRef.current = recorder
        clipStartedAtRef.current = Date.now()
        recorder.start(1000)
        flushTimerRef.current = window.setInterval(() => { void rotateClipRecorder(mimeType) }, SCREEN_CLIP_DURATION_MS)
        screenTrack.addEventListener('ended', () => { void stopRef.current() }, { once: true })
        cameraStream.getVideoTracks()[0]?.addEventListener('ended', () => { void stopRef.current() }, { once: true })
        setStatus('recording')
      } catch (startError) {
        const wasDeclined = !sharePromptResolved && screenShareWasDeclined(startError)
        let detail = messageFor(startError)
        if (cameraPermissionPrompted && startError instanceof DOMException && startError.name === 'NotAllowedError') {
          detail = 'Webcam permission was not granted. Allow camera access to include the picture-in-picture overlay; no recording was started.'
        } else if (cameraPermissionPrompted && startError instanceof DOMException && startError.name === 'NotFoundError') {
          detail = 'No webcam was found. Connect a camera to start a screen recording with picture-in-picture.'
        }
        if (activeRef.current || streamRef.current) {
          stopAuditAttempted = true
          const stopError = await stopAndUpload()
          if (stopError) detail = stopError
        } else {
          if (screenRoom) {
            try {
              if (screenTrack) await screenRoom.localParticipant.unpublishTrack(screenTrack, false)
              await screenRoom.disconnect()
            } catch (stopError) {
              detail = `${detail} Live screen sharing cleanup failed: ${messageFor(stopError)}`
            }
          }
          stopPendingCapture()
        }
        if (auditStarted && !stopAuditAttempted) {
          try {
            await recordScreenAuditEvent('screen_recording_stopped')
          } catch {
            detail = `${detail} Recording status could not be confirmed in the audit log.`
          }
        }
        setStatus(wasDeclined ? 'idle' : 'error')
        setError(wasDeclined ? '' : detail)
      } finally {
        startingRef.current = false
      }
    }

    useEffect(() => {
      const warnBeforeClose = (event: BeforeUnloadEvent) => {
        if (!activeRef.current) return
        event.preventDefault()
        event.returnValue = ''
      }
      window.addEventListener('beforeunload', warnBeforeClose)
      return () => window.removeEventListener('beforeunload', warnBeforeClose)
    }, [])

    useEffect(() => () => {
      cancelStartRef.current = true
      activeRef.current = false
      if (flushTimerRef.current !== null) window.clearInterval(flushTimerRef.current)
      recorderRef.current?.stop()
      pictureInPictureRef.current?.dispose()
      cameraStreamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current?.getTracks().forEach(track => track.stop())
      if (screenRoomRef.current) {
        void screenRoomRef.current.disconnect()
        screenRoomRef.current = null
      }
    }, [])

    return (
      <section className={`screen-recording-card screen-recording-${status}`} aria-label="Optional screen and webcam recording">
        <div className="screen-recording-copy">
          <div className="screen-recording-icon">{status === 'error' ? <AlertTriangle size={17} /> : <Monitor size={17} />}</div>
          <div>
            <strong>{status === 'recording' ? 'Screen + webcam recording active' : status === 'requesting' ? 'Waiting for screen and camera approval' : status === 'stopping' ? 'Saving final picture-in-picture clip' : status === 'error' ? 'Screen recording issue' : 'Optional screen + webcam recording'}</strong>
            <span>
              {status === 'recording'
                ? `Screen shared live to the Super Admin · webcam is included only in saved clips · ${uploadsPending ? 'Saving a private clip…' : 'Private clips save every 5 minutes'}`
                : 'Start after login and approve both browser prompts. Select the ERP tab to limit screen capture; the entire screen may include other tabs or apps.'}
            </span>
          </div>
        </div>
        <p className="screen-recording-disclosure">
          {status === 'recording'
            ? `Video only, no audio. Webcam appears as a picture-in-picture overlay in private clips and is not streamed live. Clips are deleted after 24 hours. Signed in as ${user.name}.`
            : 'Recording is never automatic. Approve screen sharing and camera access to start; the webcam appears only as a picture-in-picture overlay in saved clips. Stop anytime. No audio, keystrokes, or browser history.'}
        </p>
        {error && <p className="screen-recording-error" role="alert">{error}</p>}
        <div className="screen-recording-actions">
          {status === 'recording'
            ? <button className="screen-recording-stop" type="button" onClick={() => { void stopAndUpload() }}><Square size={14} /> Stop recording</button>
            : <button className="screen-recording-start" type="button" onClick={() => { void startRecording() }} disabled={status === 'requesting' || status === 'stopping'}><Video size={15} /> {status === 'error' ? 'Try again' : status === 'requesting' ? 'Requesting…' : status === 'stopping' ? 'Saving…' : 'Start screen + webcam'}</button>}
          {status === 'recording' && <span className="screen-recording-live" role="status"><Circle size={8} /> Recording</span>}
        </div>
      </section>
    )
  },
)
