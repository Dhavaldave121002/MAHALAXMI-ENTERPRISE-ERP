import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { createScreenSharingAccessToken, getCameraBrowserUrl, getScreenSharingRoomName } from '../camera.js'
import { getSessionUser } from '../session.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const user = await getSessionUser(request)
    const isAdmin = user.role === 'Super Admin'
    const scope = new URL(request.url || '/', 'http://localhost').searchParams.get('scope')
    if (scope !== 'screen') throw new ApiError(403, 'Webcam capture is disabled. Use approved screen sharing instead.')
    const token = await createScreenSharingAccessToken(user, isAdmin)
    sendJson(response, 200, {
      token,
      url: getCameraBrowserUrl(),
      roomName: getScreenSharingRoomName(),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(response, error, 'Camera token')
      return
    }
    handleApiError(response, error, 'Camera token')
  }
}
