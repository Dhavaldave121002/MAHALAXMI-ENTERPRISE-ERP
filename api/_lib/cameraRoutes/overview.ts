import { TrackSource } from 'livekit-server-sdk'
import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { createCameraClients } from '../camera.js'
import { getSessionUser, requireAdmin } from '../session.js'
import { cameraRoomName, cameraScheduleForRole } from '../../../shared/cameraSchedule.js'
import { listUsers } from '../workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const currentUser = await getSessionUser(request)
    requireAdmin(currentUser)
    const users = await listUsers()
    const { roomService } = createCameraClients()
    const roomName = cameraRoomName()
    const rooms = await roomService.listRooms([roomName])
    const participants = rooms.length ? await roomService.listParticipants(roomName) : []
    const participantsById = new Map(participants.map(participant => [participant.identity, participant]))
    const staff = users.filter(user => user.active && user.role !== 'Super Admin').map(user => {
      const participant = participantsById.get(user.id)
      const camera = participant?.tracks.find(track => track.source === TrackSource.CAMERA)
      const schedule = cameraScheduleForRole(user.role)
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        schedule: schedule.state,
        scheduleMessage: schedule.message,
        connected: Boolean(participant),
        cameraPublished: Boolean(camera),
        cameraMuted: camera?.muted ?? false,
      }
    })
    sendJson(response, 200, { staff, roomName })
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(response, error, 'Camera overview')
      return
    }
    handleApiError(response, error, 'Camera overview')
  }
}
