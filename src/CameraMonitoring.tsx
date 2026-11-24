import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Circle, Play, RefreshCw, Video, VideoOff, X } from 'lucide-react'
import { RemoteVideoTrack, Room, RoomEvent, Track } from 'livekit-client'
import { cameraScheduleForRole } from '../shared/cameraSchedule'

type CameraUser = { id: string; name: string; role: string }
type ApiResult = { error?: string }

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

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Camera monitoring could not be started.'
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
  const egressIdRef = useRef('')
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
    const room = roomRef.current
    const track = trackRef.current
    const egressId = egressIdRef.current
    roomRef.current = null
    trackRef.current = null
    egressIdRef.current = ''
    startingRef.current = false
    if (!quiet) {
      setRecordingActive(false)
      setPreviewReady(false)
    }
    let cleanupError = ''
    try {
      if (egressId) {
        await cameraApi('/api/cameras/recording', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop', egressId }),
        })
      }
    } catch (error) {
      cleanupError = messageFor(error)
    }
    if (room && track) {
      try {
        await room.localParticipant.unpublishTrack(track)
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
    if (!quiet) {
      setStatus(cleanupError ? 'error' : 'idle')
      setDetail(cleanupError || nextDetail)
    }
    return cleanupError
  }, [])

  const startCamera = useCallback(async () => {
    if (roomRef.current || startingRef.current || cameraScheduleForRole(user.role).state !== 'active') return
    startingRef.current = true
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
      const recording = await cameraApi<{ egressId: string; status: string }>('/api/cameras/recording', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
      })
      if (attempt !== attemptRef.current) {
        await cameraApi('/api/cameras/recording', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop', egressId: recording.egressId }),
        }).catch(() => undefined)
        return
      }
      egressIdRef.current = recording.egressId
      setRecordingActive(recording.status === 'active')
      setStatus('recording')
      setDetail(recording.status === 'active' ? 'Your camera is live and recording.' : 'Your camera is live; recording is starting.')
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
  }, [user.role])

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

  useEffect(() => {
    if (status !== 'recording' || !egressIdRef.current) return
    let active = true
    const poll = async () => {
      const egressId = egressIdRef.current
      if (!egressId) return
      try {
        const result = await cameraApi<{ active: boolean; status: string; error: string }>('/api/cameras/recording', {
          method: 'POST',
          body: JSON.stringify({ action: 'status', egressId }),
        })
        if (!active) return
        if (!result.active) {
          await stopCamera(result.error || 'The recording stopped unexpectedly. Retry to restart the camera.')
          setStatus('error')
          setDetail(result.error || 'The recording stopped unexpectedly. Retry to restart the camera.')
        } else if (result.status === 'active') {
          setRecordingActive(true)
          setDetail('Your camera is live and recording.')
        }
      } catch (error) {
        if (!active) return
        setDetail(`Camera recording status could not be verified: ${messageFor(error)}`)
      }
    }
    const timer = window.setInterval(() => void poll(), 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [status, stopCamera])

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
      <p className="camera-privacy-note">Video only · No microphone · Admin can view scheduled live sessions · Recordings are deleted after 48 hours</p>
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
type CameraRecording = { key: string; userId: string; userName: string; startedAt: string; size: number }
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
      const [overview, recordingData] = await Promise.all([
        cameraApi<{ staff: StaffCamera[] }>('/api/cameras/overview'),
        cameraApi<{ recordings: CameraRecording[] }>('/api/cameras/recordings'),
      ])
      setStaff(overview.staff)
      setRecordings(recordingData.recordings)
      setError('')
    } catch (loadError) {
      setError(messageFor(loadError))
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
    try {
      const result = await cameraApi<{ url: string }>('/api/cameras/recordings', {
        method: 'POST',
        body: JSON.stringify({ key: recording.key }),
      })
      setPlayingUrl(result.url)
      setPlayingName(`${recording.userName} · ${formatRecordingDate(recording.startedAt)}`)
      setError('')
    } catch (playError) {
      setError(messageFor(playError))
    }
  }

  const liveStaff = staff.filter(item => item.connected && item.cameraPublished && !item.cameraMuted).length

  return (
    <section className="camera-monitoring-page">
      <div className="page-heading">
        <div><p>SUPER ADMIN</p><h1>Camera monitoring</h1><span className="dashboard-description">Live webcam view and private video recordings for scheduled team hours.</span></div>
        <div className="heading-actions"><button className="secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div>
      </div>
      <div className="camera-policy-note"><Video size={18} /><span>Scheduled Monday–Saturday in India time; the 1:30–2:00 PM break is excluded. Production Supervisor: 9:30 AM–7:30 PM; Sales Executive: 10:00 AM–6:00 PM; other team roles: 10:00 AM–7:00 PM. Video only; microphone access is disabled. Recordings are private and removed after 48 hours.</span></div>
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
        <div className="panel-heading"><div><h2>Recent recordings</h2><p>Private recordings from the last 48 hours · up to 100 newest</p></div><span className="camera-retention-tag">48-hour retention</span></div>
        {recordings.length
          ? <div className="dashboard-table"><table><thead><tr><th>Team member</th><th>Started (IST)</th><th>Size</th><th>Action</th></tr></thead><tbody>{recordings.map(recording => <tr key={recording.key}><td>{recording.userName}</td><td>{formatRecordingDate(recording.startedAt)}</td><td>{formatRecordingSize(recording.size)}</td><td><button className="secondary camera-play-button" type="button" onClick={() => void playRecording(recording)}><Play size={14} /> Play</button></td></tr>)}</tbody></table></div>
          : <div className="empty-state"><Video size={24} /><strong>No recent recordings</strong><span>Completed scheduled sessions will appear here.</span></div>}
      </section>
      {playingUrl && <div className="camera-player-backdrop" role="presentation" onClick={() => setPlayingUrl('')}>
        <section className="camera-player-dialog" role="dialog" aria-modal="true" aria-label="Camera recording playback" onClick={event => event.stopPropagation()}>
          <div className="panel-heading"><div><h2>Recording playback</h2><p>{playingName}</p></div><button className="icon-button" type="button" aria-label="Close recording" onClick={() => setPlayingUrl('')}><X size={18} /></button></div>
          <video src={playingUrl} controls autoPlay playsInline />
          <p>Access link expires after 15 minutes. Recording remains private and is deleted after 48 hours.</p>
        </section>
      </div>}
    </section>
  )
}
