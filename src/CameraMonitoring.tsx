import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Circle, Play, RefreshCw, Video, VideoOff, X } from 'lucide-react'
import { RemoteVideoTrack, Room, RoomEvent, Track } from 'livekit-client'
import { cameraScheduleForRole } from '../shared/cameraSchedule'

type CameraUser = { id: string; name: string; role: string }
type ApiResult = { error?: string }
type CameraRecorderSegment = {
  recorder: MediaRecorder
  chunks: Blob[]
  startedAt: number
  timer: number
  done: Promise<void>
}

const CAMERA_CLIP_DURATION_MS = 5 * 60 * 1000
const CAMERA_UPLOAD_RETRY_LIMIT = 3

async function cameraApi<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const result = await response.json() as T & ApiResult
  if (!response.ok) throw new Error(result.error || 'Camera request failed.')
  return result
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const stride = 0x8000
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + stride, bytes.length)))
  }
  return btoa(binary)
}

async function uploadCameraClip(blob: Blob, startedAt: number) {
  const upload = await cameraApi<{ uploadToken: string; chunkSize: number }>('/api/cameras/recording', {
    method: 'POST',
    body: JSON.stringify({ action: 'createUpload', startedAt, totalBytes: blob.size }),
  })
  if (!upload.uploadToken || !Number.isSafeInteger(upload.chunkSize) || upload.chunkSize < 256 * 1024) {
    throw new Error('The server returned an invalid Google Drive upload session.')
  }

  let offset = 0
  while (offset < blob.size) {
    const chunk = blob.slice(offset, Math.min(offset + upload.chunkSize, blob.size))
    const bytes = new Uint8Array(await chunk.arrayBuffer())
    const base64 = bytesToBase64(bytes)
    let response: { complete: boolean; nextOffset?: number } | null = null
    let lastError: unknown
    for (let attempt = 0; attempt < CAMERA_UPLOAD_RETRY_LIMIT; attempt += 1) {
      try {
        response = await cameraApi<{ complete: boolean; nextOffset?: number }>('/api/cameras/recording', {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadChunk',
            uploadToken: upload.uploadToken,
            startByte: offset,
            endByte: offset + bytes.length - 1,
            base64,
          }),
        })
        break
      } catch (error) {
        lastError = error
        if (attempt + 1 < CAMERA_UPLOAD_RETRY_LIMIT) {
          await new Promise(resolve => window.setTimeout(resolve, 750 * (attempt + 1)))
        }
      }
    }
    if (!response) throw lastError instanceof Error ? lastError : new Error('The camera clip could not be uploaded.')
    if (response.complete) {
      if (offset + bytes.length !== blob.size) throw new Error('Google Drive completed the camera clip before all bytes were sent.')
      return
    }
    if (
      typeof response.nextOffset !== 'number' ||
      !Number.isSafeInteger(response.nextOffset) ||
      response.nextOffset <= offset ||
      response.nextOffset > blob.size
    ) throw new Error('Google Drive returned an invalid camera clip upload offset.')
    offset = response.nextOffset
  }
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Camera monitoring could not be started.'
}

function cameraUploadErrorMessage(error: unknown) {
  const message = messageFor(error)
  if (message.includes('UrlFetchApp.fetch') || message.includes('script.external_request')) {
    return 'Apps Script authorization is required before clips can be saved. Ask the administrator to run installEcommerceLabelCleanupTrigger in Apps Script and approve the requested permissions, then retry.'
  }
  return message
}

export function CameraPublisher({ user }: { user: CameraUser }) {
  const [now, setNow] = useState(() => new Date())
  const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'error' | 'paused'>('idle')
  const [detail, setDetail] = useState('')
  const [pausedDate, setPausedDate] = useState('')
  const [retry, setRetry] = useState(0)
  const [recordingActive, setRecordingActive] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const recorderSegmentRef = useRef<CameraRecorderSegment | null>(null)
  const recordingEnabledRef = useRef(false)
  const pendingUploadsRef = useRef(new Set<Promise<void>>())
  const uploadErrorRef = useRef('')
  const uploadQueueRef = useRef(Promise.resolve())
  const attemptRef = useRef(0)
  const startingRef = useRef(false)
  const previewRef = useRef<HTMLVideoElement>(null)
  const schedule = cameraScheduleForRole(user.role, now)
  const manualPause = pausedDate === schedule.roomDate

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const stopCamera = useCallback(async (nextDetail: string, quiet = false) => {
    attemptRef.current += 1
    recordingEnabledRef.current = false
    const room = roomRef.current
    const track = trackRef.current
    const segment = recorderSegmentRef.current
    roomRef.current = null
    trackRef.current = null
    recorderSegmentRef.current = null
    startingRef.current = false
    if (segment) {
      window.clearTimeout(segment.timer)
      if (segment.recorder.state !== 'inactive') segment.recorder.stop()
    }
    if (!quiet) {
      setRecordingActive(false)
      setPreviewReady(false)
      setStatus('idle')
      setDetail('Camera is off. Saving the final clip to Drive.')
    }
    let cleanupError = uploadErrorRef.current
    if (room && track) {
      try {
        const unpublish = room.localParticipant.unpublishTrack(track)
        track.stop()
        if (previewRef.current) previewRef.current.srcObject = null
        await unpublish
      } catch (error) {
        if (!cleanupError) cleanupError = messageFor(error)
      }
    }
    if (room) {
      try {
        await room.disconnect()
      } catch (error) {
        if (!cleanupError) cleanupError = messageFor(error)
      }
    }
    track?.stop()
    if (previewRef.current) previewRef.current.srcObject = null
    const pendingUploads = await Promise.allSettled([...pendingUploadsRef.current])
    const failedUpload = pendingUploads.find(result => result.status === 'rejected')
    if (failedUpload?.status === 'rejected' && !cleanupError) {
      cleanupError = messageFor(failedUpload.reason)
    }
    if (!cleanupError) uploadErrorRef.current = ''
    if (!quiet) {
      setStatus(cleanupError ? 'error' : 'idle')
      setDetail(cleanupError || nextDetail)
    }
    return cleanupError
  }, [])

  const startRecorderSegment = useCallback(function startRecorderSegmentImpl(stream: MediaStream, attempt: number) {
    const mimeType = ['video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type))
    if (!mimeType) throw new Error('This browser cannot create a supported camera recording.')
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 500_000 })
    const segment: CameraRecorderSegment = {
      recorder,
      chunks: [],
      startedAt: Date.now(),
      timer: 0,
      done: Promise.resolve(),
    }
    let resolveDone: () => void = () => undefined
    let rejectDone: (error: unknown) => void = () => undefined
    segment.done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve
      rejectDone = reject
    })
    recorder.ondataavailable = event => {
      if (event.data.size) segment.chunks.push(event.data)
    }
    recorder.onerror = () => rejectDone(new Error('The browser camera recorder encountered an error.'))
    recorder.onstop = () => {
      const clip = new Blob(segment.chunks, { type: mimeType })
      if (!clip.size) {
        resolveDone()
        return
      }
      const upload = uploadQueueRef.current.catch(() => undefined).then(() => uploadCameraClip(clip, segment.startedAt))
      uploadQueueRef.current = upload
      void upload.then(resolveDone, rejectDone)
    }
    recorder.start()
    recorderSegmentRef.current = segment
    pendingUploadsRef.current.add(segment.done)
    void segment.done.then(
      () => pendingUploadsRef.current.delete(segment.done),
      error => {
        pendingUploadsRef.current.delete(segment.done)
        const failureDetail = `A camera clip could not be saved to Drive: ${cameraUploadErrorMessage(error)}`
        uploadErrorRef.current = failureDetail
        if (recordingEnabledRef.current && attempt === attemptRef.current) {
          recordingEnabledRef.current = false
          void stopCamera(failureDetail).then(() => {
            setStatus('error')
            setDetail(failureDetail)
          })
        }
      },
    )
    segment.timer = window.setTimeout(() => {
      if (!recordingEnabledRef.current || attempt !== attemptRef.current) return
      const previous = recorderSegmentRef.current
      try {
        startRecorderSegmentImpl(stream, attempt)
        if (previous && previous.recorder.state !== 'inactive') previous.recorder.stop()
      } catch (error) {
        void stopCamera(`Camera recording could not continue: ${messageFor(error)}`)
      }
    }, CAMERA_CLIP_DURATION_MS)
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    if (roomRef.current || startingRef.current || cameraScheduleForRole(user.role).state !== 'active') return
    startingRef.current = true
    uploadErrorRef.current = ''
    const attempt = ++attemptRef.current
    setStatus('connecting')
    setDetail('Connecting securely and requesting browser camera permission. No microphone is used.')
    let room: Room | null = null
    let track: MediaStreamTrack | null = null
    try {
      const session = await cameraApi<{ token: string; url: string }>('/api/cameras/token', { method: 'POST' })
      if (attempt !== attemptRef.current) return
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support secure camera access.')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 15 } },
        audio: false,
      })
      track = stream.getVideoTracks()[0] || null
      if (!track) throw new Error('No webcam video track was provided by the browser.')
      if (attempt !== attemptRef.current) {
        track.stop()
        return
      }
      trackRef.current = track
      if (previewRef.current) {
        previewRef.current.srcObject = new MediaStream([track])
        void previewRef.current.play().catch(() => undefined)
      }
      setPreviewReady(true)
      room = new Room({ adaptiveStream: true })
      roomRef.current = room
      await room.connect(session.url, session.token)
      if (attempt !== attemptRef.current) {
        await room.disconnect()
        track.stop()
        return
      }
      await room.localParticipant.publishTrack(track, { source: Track.Source.Camera, name: 'work-camera' })
      if (attempt !== attemptRef.current) return
      const cameraStream = new MediaStream([track])
      recordingEnabledRef.current = true
      startRecorderSegment(cameraStream, attempt)
      setRecordingActive(true)
      setStatus('recording')
      setDetail('Your camera is live and recording. Private Drive clips save every 5 minutes.')
    } catch (error) {
      if (attempt === attemptRef.current) {
        if (room) await room.disconnect()
        track?.stop()
        if (trackRef.current === track) trackRef.current = null
        if (roomRef.current === room) roomRef.current = null
        if (previewRef.current) previewRef.current.srcObject = null
        setPreviewReady(false)
        setStatus('error')
        setDetail(messageFor(error))
      }
    } finally {
      if (attempt === attemptRef.current) startingRef.current = false
    }
  }, [startRecorderSegment, user.role])

  useEffect(() => {
    if (schedule.state !== 'active') {
      const timer = window.setTimeout(() => { void stopCamera(schedule.message) }, 0)
      return () => window.clearTimeout(timer)
    }
    if (manualPause) {
      return
    }
    const timer = window.setTimeout(() => { void startCamera() }, 0)
    return () => window.clearTimeout(timer)
  }, [schedule.state, schedule.message, manualPause, retry, startCamera, stopCamera])

  useEffect(() => {
    if (status !== 'recording' || !previewReady || !previewRef.current || !trackRef.current) return
    const video = previewRef.current
    video.srcObject = new MediaStream([trackRef.current])
    void video.play().catch(() => undefined)
    return () => { video.srcObject = null }
  }, [status, previewReady])

  useEffect(() => () => { void stopCamera('', true) }, [stopCamera])

  const pauseCamera = async () => {
    setPausedDate(schedule.roomDate)
    const cleanupError = await stopCamera('Camera paused by you.')
    setStatus(cleanupError ? 'error' : 'paused')
    setDetail(cleanupError || 'Camera paused by you. You can resume during your scheduled hours.')
  }

  return (
    <aside className={`camera-status-card camera-status-${status}`} aria-label="Work camera status">
      <div className="camera-status-heading">
        <div className="camera-status-icon">{status === 'error' ? <AlertTriangle size={17} /> : status === 'recording' ? <Video size={17} /> : <VideoOff size={17} />}</div>
        <div>
          <strong>{status === 'recording' ? recordingActive ? 'Camera live · recording' : 'Camera live · starting' : status === 'connecting' ? 'Starting work camera' : status === 'paused' ? 'Camera paused' : status === 'error' ? 'Camera unavailable' : schedule.state === 'active' ? 'Work camera starting' : 'Work camera off'}</strong>
          <span>{detail || schedule.message}</span>
        </div>
      </div>
      {status === 'recording' && previewReady && <video ref={previewRef} className="camera-self-preview" autoPlay muted playsInline aria-label="Your live camera preview" />}
      <p className="camera-privacy-note">Video only · No microphone · Admin can view scheduled live sessions · Private 5-minute Drive clips are deleted after 24 hours</p>
      <div className="camera-status-actions">
        {schedule.state === 'active' && status === 'recording' && <button type="button" className="camera-small-button" onClick={() => void pauseCamera()}><VideoOff size={14} /> Pause</button>}
        {schedule.state === 'active' && (status === 'error' || status === 'paused') && <button type="button" className="camera-small-button" onClick={() => { setPausedDate(''); setRetry(value => value + 1) }}><Video size={14} /> {status === 'paused' ? 'Resume' : 'Retry'}</button>}
        {schedule.state !== 'active' && <span className="camera-off-indicator"><Circle size={8} /> Not recording</span>}
      </div>
    </aside>
  )
}

type StaffCamera = {
  id: string
  name: string
  role: string
  schedule: 'active' | 'break' | 'off'
  scheduleMessage: string
  connected: boolean
  cameraPublished: boolean
  cameraMuted: boolean
}
type CameraRecording = { id: string; userId: string; userName: string; startedAt: string; size: number }
type CameraTileData = { id: string; name: string; role: string; track: RemoteVideoTrack }

function CameraTile({ item }: { item: CameraTileData }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    item.track.attach(video)
    return () => { item.track.detach(video) }
  }, [item.track])
  return (
    <article className="camera-live-tile">
      <video ref={videoRef} autoPlay muted playsInline aria-label={`Live camera for ${item.name}`} />
      <div className="camera-live-tile-caption"><span><Circle size={8} /> LIVE</span><strong>{item.name}</strong><small>{item.role}</small></div>
    </article>
  )
}

function formatRecordingDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unknown time'
    : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(date)
}

function formatRecordingSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CameraMonitoringView() {
  const [staff, setStaff] = useState<StaffCamera[]>([])
  const [recordings, setRecordings] = useState<CameraRecording[]>([])
  const [tiles, setTiles] = useState<CameraTileData[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [playingUrl, setPlayingUrl] = useState('')
  const [playingName, setPlayingName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const roomRef = useRef<Room | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [overviewResult, recordingResult] = await Promise.allSettled([
        cameraApi<{ staff: StaffCamera[] }>('/api/cameras/overview'),
        cameraApi<{ recordings: CameraRecording[] }>('/api/cameras/recordings'),
      ])
      const errors: string[] = []
      if (overviewResult.status === 'fulfilled') {
        setStaff(overviewResult.value.staff)
      } else {
        errors.push(`Live cameras: ${messageFor(overviewResult.reason)}`)
      }
      if (recordingResult.status === 'fulfilled') {
        setRecordings(recordingResult.value.recordings)
      } else {
        errors.push(`Drive recordings: ${messageFor(recordingResult.reason)}`)
      }
      setError(errors.join(' '))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void refresh() }, 0)
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [refresh, refreshKey])

  useEffect(() => {
    let active = true
    const syncTiles = (room: Room) => {
      const next: CameraTileData[] = []
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.videoTrackPublications.values()) {
          if (publication.source !== Track.Source.Camera || !(publication.track instanceof RemoteVideoTrack)) continue
          next.push({
            id: participant.identity,
            name: participant.name || participant.identity,
            role: (() => {
              try {
                return (JSON.parse(participant.metadata || '{}') as { role?: string }).role || 'Team member'
              } catch {
                return 'Team member'
              }
            })(),
            track: publication.track,
          })
        }
      }
      if (active) setTiles(next)
    }
    const connect = async () => {
      try {
        const session = await cameraApi<{ token: string; url: string }>('/api/cameras/token', { method: 'POST' })
        if (!active) return
        const room = new Room({ adaptiveStream: true })
        roomRef.current = room
        room.on(RoomEvent.TrackSubscribed, () => syncTiles(room))
        room.on(RoomEvent.TrackUnsubscribed, () => syncTiles(room))
        room.on(RoomEvent.ParticipantConnected, () => syncTiles(room))
        room.on(RoomEvent.ParticipantDisconnected, () => syncTiles(room))
        await room.connect(session.url, session.token)
        if (active) syncTiles(room)
      } catch (connectError) {
        if (active) setError(messageFor(connectError))
      }
    }
    void connect()
    const timer = window.setInterval(() => {
      if (roomRef.current) syncTiles(roomRef.current)
    }, 3_000)
    return () => {
      active = false
      window.clearInterval(timer)
      if (roomRef.current) {
        void roomRef.current.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  const playRecording = async (recording: CameraRecording) => {
    setPlayingUrl(`/api/cameras/recordings?fileId=${encodeURIComponent(recording.id)}`)
    setPlayingName(`${recording.userName} · ${formatRecordingDate(recording.startedAt)}`)
    setError('')
  }

  const liveStaff = staff.filter(item => item.connected && item.cameraPublished && !item.cameraMuted).length

  return (
    <section className="camera-monitoring-page">
      <div className="page-heading">
        <div><p>SUPER ADMIN</p><h1>Camera monitoring</h1><span className="dashboard-description">Live webcam view and private video recordings for scheduled team hours.</span></div>
        <div className="heading-actions"><button className="secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div>
      </div>
      <div className="camera-policy-note"><Video size={18} /><span>Scheduled Monday–Saturday in India time; the 1:30–2:00 PM break is excluded. Production Supervisor: 9:30 AM–7:30 PM; Sales Executive: 10:00 AM–6:00 PM; other team roles: 10:00 AM–7:00 PM. Video only; microphone access is disabled. Recordings are private and removed after 24 hours.</span></div>
      {error && <p className="camera-error" role="alert"><AlertTriangle size={16} />{error}</p>}
      <section className="panel camera-panel">
        <div className="panel-heading"><div><h2>Live cameras</h2><p>{liveStaff} live · refreshes every 30 seconds</p></div><span className="camera-retention-tag"><Circle size={8} /> Live view</span></div>
        {tiles.length
          ? <div className="camera-live-grid">{tiles.map(item => <CameraTile key={item.id} item={item} />)}</div>
          : <div className="empty-state"><VideoOff size={24} /><strong>{busy ? 'Connecting to scheduled cameras' : 'No team cameras are live'}</strong><span>Staff cameras connect automatically during their scheduled hours after browser permission is granted.</span></div>}
      </section>
      <section className="panel camera-panel">
        <div className="panel-heading"><div><h2>Team camera status</h2><p>Active accounts and their current schedule</p></div></div>
        {staff.length
          ? <div className="dashboard-table"><table><thead><tr><th>Team member</th><th>Role</th><th>Schedule</th><th>Camera</th></tr></thead><tbody>{staff.map(item => {
            const cameraStatus = item.cameraPublished ? item.cameraMuted ? 'Paused' : 'Live' : item.connected ? 'Connected · no camera' : 'Not connected'
            return <tr key={item.id}><td>{item.name}</td><td>{item.role}</td><td>{item.scheduleMessage}</td><td><span className={`camera-status-pill ${item.cameraPublished && !item.cameraMuted ? 'is-live' : ''}`}>{cameraStatus}</span></td></tr>
          })}</tbody></table></div>
          : <div className="empty-state"><strong>No active team accounts</strong><span>Team accounts will appear here when available.</span></div>}
      </section>
      <section className="panel camera-panel">
        <div className="panel-heading"><div><h2>Recent recordings</h2><p>Private 5-minute clips from the last 24 hours</p></div><span className="camera-retention-tag">24-hour retention</span></div>
        {recordings.length
          ? <div className="dashboard-table"><table><thead><tr><th>Team member</th><th>Clip started (IST)</th><th>Size</th><th>Action</th></tr></thead><tbody>{recordings.map(recording => <tr key={recording.id}><td>{recording.userName}</td><td>{formatRecordingDate(recording.startedAt)}</td><td>{formatRecordingSize(recording.size)}</td><td><button className="secondary camera-play-button" type="button" onClick={() => playRecording(recording)}><Play size={14} /> Play</button></td></tr>)}</tbody></table></div>
          : <div className="empty-state"><Video size={24} /><strong>No recent recordings</strong><span>Completed scheduled sessions will appear here.</span></div>}
      </section>
      {playingUrl && <div className="camera-player-backdrop" role="presentation" onClick={() => setPlayingUrl('')}>
        <section className="camera-player-dialog" role="dialog" aria-modal="true" aria-label="Camera recording playback" onClick={event => event.stopPropagation()}>
          <div className="panel-heading"><div><h2>Recording playback</h2><p>{playingName}</p></div><button className="icon-button" type="button" aria-label="Close recording" onClick={() => setPlayingUrl('')}><X size={18} /></button></div>
          <video src={playingUrl} controls autoPlay playsInline onError={() => setError('This private camera recording could not be played. Refresh the list and try again.')} />
          <p>Private camera clips are deleted after 24 hours.</p>
        </section>
      </div>}
    </section>
  )
}
