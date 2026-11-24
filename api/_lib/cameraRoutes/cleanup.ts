import { timingSafeEqual } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { createCameraClients } from '../camera.js'
import { cameraRoomName, cameraScheduleForRole } from '../../../shared/cameraSchedule.js'
import { cleanupCameraClips, listUsers } from '../workbook.js'

function isAuthorized(request: ApiRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.authorization || ''
  if (!secret || !authorization.startsWith('Bearer ')) return false
  const provided = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    if (!isAuthorized(request)) throw new ApiError(401, 'Unauthorized scheduled cleanup request.')
    const { roomService } = createCameraClients()
    const users = await listUsers()
    const roomName = cameraRoomName()
    const rooms = await roomService.listRooms([roomName])
    let disconnected = 0
    if (rooms.length) {
      const participants = await roomService.listParticipants(roomName)
      const userById = new Map(users.map(user => [user.id, user]))
      for (const participant of participants) {
        const user = userById.get(participant.identity)
        if (user?.active && user.role !== 'Super Admin' && cameraScheduleForRole(user.role).state === 'active') continue
        await roomService.removeParticipant(roomName, participant.identity)
        disconnected += 1
      }
    }

    const deleted = await cleanupCameraClips()
    sendJson(response, 200, { deleted, disconnected })
  } catch (error) {
    handleApiError(response, error, 'Camera recording cleanup')
  }
}
