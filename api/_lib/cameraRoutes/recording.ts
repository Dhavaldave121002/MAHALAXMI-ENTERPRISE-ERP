import { EgressStatus, TrackSource } from 'livekit-server-sdk'
import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../http.js'
import { createCameraClients, createCameraEgressRequest, isCameraEgressForUser, isScheduledCameraUser } from '../camera.js'
import { getSessionUser } from '../session.js'
import { cameraRoomName } from '../../../shared/cameraSchedule.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const user = await getSessionUser(request)
    if (user.role === 'Super Admin') throw new ApiError(403, 'The Super Admin account is a camera viewer, not a camera publisher.')
    const body = await readJsonBody(request)
    const action = body.action
    if (!['start', 'stop', 'status'].includes(String(action))) {
      throw new ApiError(400, 'Choose a valid recording action.')
    }
    if (action === 'start') isScheduledCameraUser(user)

    const { roomService, egress } = createCameraClients()
    const roomName = cameraRoomName()
    if (action === 'start') {
      const participants = await roomService.listParticipants(roomName)
      const participant = participants.find(item => item.identity === user.id)
      const hasActiveCamera = participant?.tracks.some(track => track.source === TrackSource.CAMERA && !track.muted)
      if (!hasActiveCamera) throw new ApiError(409, 'Start your camera before starting its recording.')

      const activeEgress = await egress.listEgress({ roomName, active: true })
      const existing = activeEgress.find(item => isCameraEgressForUser(item, user.id))
      if (existing) {
        sendJson(response, 200, {
          egressId: existing.egressId,
          status: existing.status === EgressStatus.EGRESS_ACTIVE ? 'active' : 'starting',
        })
        return
      }

      const info = await egress.startEgress(createCameraEgressRequest(roomName, user, Date.now()))
      sendJson(response, 201, {
        egressId: info.egressId,
        status: info.status === EgressStatus.EGRESS_ACTIVE ? 'active' : 'starting',
      })
      return
    }

    const egressId = typeof body.egressId === 'string' ? body.egressId.trim() : ''
    if (!/^[A-Za-z0-9_-]{5,128}$/.test(egressId)) throw new ApiError(400, 'A valid recording ID is required.')
    const activeEgress = await egress.listEgress({ roomName, egressId, active: true })
    const ownEgress = activeEgress.find(item => item.egressId === egressId && isCameraEgressForUser(item, user.id))
    if (!ownEgress) {
      sendJson(response, 200, { status: 'stopped' })
      return
    }
    if (action === 'stop') {
      const info = await egress.stopEgress(egressId)
      sendJson(response, 200, { status: info.status })
      return
    }
    sendJson(response, 200, {
      status: ownEgress.status === EgressStatus.EGRESS_ACTIVE ? 'active' : 'starting',
      error: ownEgress.error || '',
      active: ownEgress.status === EgressStatus.EGRESS_ACTIVE || ownEgress.status === EgressStatus.EGRESS_STARTING,
    })
  } catch (error) {
    handleApiError(response, error, 'Camera recording')
  }
}
