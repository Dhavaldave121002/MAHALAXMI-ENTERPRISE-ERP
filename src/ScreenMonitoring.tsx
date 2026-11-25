import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Circle, Play, RefreshCw, Video, VideoOff, X } from 'lucide-react'
import { RemoteVideoTrack, Room, RoomEvent, Track } from 'livekit-client'

type ApiResult = { error?: string }
type ScreenRecording = { id: string; userId: string; userName: string; kind: string; startedAt: string; size: number }
type ScreenShareTileData = { id: string; name: string; role: string; track: RemoteVideoTrack }

async function cameraApi<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const result = await response.json() as T & ApiResult
  if (!response.ok) throw new Error(result.error || 'Screen monitoring request failed.')
  return result
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Screen monitoring could not be loaded.'
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

function ScreenShareTile({ item }: { item: ScreenShareTileData }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    item.track.attach(video)
    return () => { item.track.detach(video) }
  }, [item.track])
  return (
    <article className="camera-live-tile camera-live-screen-tile">
      <video ref={videoRef} autoPlay muted playsInline aria-label={`Live screen share for ${item.name}`} />
      <div className="camera-live-tile-caption"><span><Circle size={8} /> LIVE SCREEN</span><strong>{item.name}</strong><small>{item.role}</small></div>
    </article>
  )
}

export function ScreenMonitoringView() {
  const [recordings, setRecordings] = useState<ScreenRecording[]>([])
  const [screenShareTiles, setScreenShareTiles] = useState<ScreenShareTileData[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [screenShareError, setScreenShareError] = useState('')
  const [playingUrl, setPlayingUrl] = useState('')
  const [playingName, setPlayingName] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const screenRoomRef = useRef<Room | null>(null)

  const refresh = useCallback(async () => {
    try {
      const result = await cameraApi<{ recordings: ScreenRecording[] }>('/api/cameras/recordings')
      setRecordings(result.recordings.filter(recording => recording.kind === 'screen'))
      setError('')
    } catch (refreshError) {
      setError(`Screen recordings: ${messageFor(refreshError)}`)
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
    const syncScreenShareTiles = (room: Room) => {
      const next: ScreenShareTileData[] = []
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.videoTrackPublications.values()) {
          if (publication.source !== Track.Source.ScreenShare || !(publication.track instanceof RemoteVideoTrack)) continue
          let role = 'Team member'
          try {
            role = (JSON.parse(participant.metadata || '{}') as { role?: string }).role || role
          } catch {
            role = 'Team member'
          }
          next.push({
            id: participant.identity,
            name: participant.name || participant.identity,
            role,
            track: publication.track,
          })
        }
      }
      if (active) setScreenShareTiles(next)
    }
    const connectScreenShares = async () => {
      let room: Room | null = null
      try {
        const session = await cameraApi<{ token: string; url: string }>('/api/cameras/token?scope=screen', { method: 'POST' })
        if (!active) return
        const connectedRoom = new Room({ adaptiveStream: true })
        room = connectedRoom
        screenRoomRef.current = connectedRoom
        connectedRoom.on(RoomEvent.TrackSubscribed, () => syncScreenShareTiles(connectedRoom))
        connectedRoom.on(RoomEvent.TrackUnsubscribed, () => syncScreenShareTiles(connectedRoom))
        connectedRoom.on(RoomEvent.ParticipantConnected, () => syncScreenShareTiles(connectedRoom))
        connectedRoom.on(RoomEvent.ParticipantDisconnected, () => syncScreenShareTiles(connectedRoom))
        await connectedRoom.connect(session.url, session.token)
        if (active) syncScreenShareTiles(connectedRoom)
      } catch (connectError) {
        let detail = messageFor(connectError)
        if (room) {
          if (screenRoomRef.current === room) screenRoomRef.current = null
          try {
            await room.disconnect()
          } catch (disconnectError) {
            detail = `${detail} ${messageFor(disconnectError)}`
          }
        }
        if (active) setScreenShareError(detail)
      }
    }
    void connectScreenShares()
    const timer = window.setInterval(() => {
      if (screenRoomRef.current) syncScreenShareTiles(screenRoomRef.current)
    }, 3_000)
    return () => {
      active = false
      window.clearInterval(timer)
      if (screenRoomRef.current) {
        void screenRoomRef.current.disconnect()
        screenRoomRef.current = null
      }
    }
  }, [])

  const playRecording = (recording: ScreenRecording) => {
    setPlayingUrl(`/api/cameras/recordings?fileId=${encodeURIComponent(recording.id)}`)
    setPlayingName(`${recording.userName} · ${formatRecordingDate(recording.startedAt)}`)
    setError('')
  }

  return (
    <section className="camera-monitoring-page">
      <div className="page-heading">
        <div><p>SUPER ADMIN</p><h1>Screen monitoring</h1><span className="dashboard-description">Team-member-approved screens appear live; webcam video appears only as an overlay in saved clips.</span></div>
        <div className="heading-actions"><button className="secondary" type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={16} /> Refresh</button></div>
      </div>
      <div className="camera-policy-note"><Video size={18} /><span>Recording is started by the team member and requires approval for both screen sharing and camera access. The webcam is composited as a picture-in-picture overlay in private saved clips only; it is not streamed live. A visible indicator and Stop control stay available. Clips are removed after 24 hours; no audio is captured.</span></div>
      {error && <p className="camera-error" role="alert"><AlertTriangle size={16} />{error}</p>}
      {screenShareError && <p className="camera-error" role="alert"><AlertTriangle size={16} />Live screen shares: {screenShareError}</p>}
      <section className="panel camera-panel">
        <div className="panel-heading"><div><h2>Live shared screens</h2><p>{screenShareTiles.length} live · updates instantly</p></div><span className="camera-retention-tag"><Circle size={8} /> Live view</span></div>
        {screenShareTiles.length
          ? <div className="camera-live-grid">{screenShareTiles.map(item => <ScreenShareTile key={item.id} item={item} />)}</div>
          : <div className="empty-state"><VideoOff size={24} /><strong>No team screens are being shared</strong><span>A screen appears here when a signed-in team member starts screen recording and approves the browser prompt.</span></div>}
      </section>
      <section className="panel camera-panel">
        <div className="panel-heading"><div><h2>Screen recordings</h2><p>Team-member-started clips; approved webcam appears in the saved picture-in-picture overlay · last 24 hours</p></div><span className="camera-retention-tag">24-hour retention</span></div>
        {recordings.length
          ? <div className="dashboard-table"><table><thead><tr><th>Team member</th><th>Clip started (IST)</th><th>Size</th><th>Action</th></tr></thead><tbody>{recordings.map(recording => <tr key={recording.id}><td>{recording.userName}</td><td>{formatRecordingDate(recording.startedAt)}</td><td>{formatRecordingSize(recording.size)}</td><td><button className="secondary camera-play-button" type="button" onClick={() => playRecording(recording)}><Play size={14} /> Play</button></td></tr>)}</tbody></table></div>
          : <div className="empty-state"><VideoOff size={24} /><strong>{busy ? 'Loading screen recordings…' : 'No screen recordings yet'}</strong><span>Completed, user-approved screen clips will appear here.</span></div>}
      </section>
      {playingUrl && <div className="camera-player-backdrop" role="presentation" onClick={() => setPlayingUrl('')}>
        <section className="camera-player-dialog" role="dialog" aria-modal="true" aria-label="Screen recording playback" onClick={event => event.stopPropagation()}>
          <div className="panel-heading"><div><h2>Recording playback</h2><p>{playingName}</p></div><button className="icon-button" type="button" aria-label="Close recording" onClick={() => setPlayingUrl('')}><X size={18} /></button></div>
          <video src={playingUrl} controls autoPlay playsInline onError={() => setError('This private screen recording could not be played. Refresh the list and try again.')} />
          <p>Private screen clips are deleted after 24 hours.</p>
        </section>
      </div>}
    </section>
  )
}
