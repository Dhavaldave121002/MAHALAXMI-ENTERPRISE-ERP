import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { createCameraAccessToken, getCameraBrowserUrl, isScheduledCameraUser } from '../camera.js'
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
