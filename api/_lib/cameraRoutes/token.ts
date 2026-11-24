import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { createCameraAccessToken, createCameraClients, getCameraBrowserUrl, isScheduledCameraUser } from '../camera.js'
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
    const isAdmin = user.role === 'Super Admin'
    if (!isAdmin) isScheduledCameraUser(user)
    const { roomService } = createCameraClients()
    try {
      await roomService.listRooms([cameraRoomName()])
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      console.error('LiveKit camera credential check failed:', reason)
      throw new ApiError(
        503,
        'LiveKit rejected the configured URL/API key/API secret. Verify all three belong to the same LiveKit project, then redeploy.',
      )
    }
    const token = await createCameraAccessToken(user, isAdmin)
    sendJson(response, 200, {
      token,
      url: getCameraBrowserUrl(),
      roomName: cameraRoomName(),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(response, error, 'Camera token')
      return
    }
    handleApiError(response, error, 'Camera token')
  }
}
