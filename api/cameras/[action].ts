import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { sendJson } from '../_lib/http.js'
import cleanup from '../_lib/cameraRoutes/cleanup.js'
import overview from '../_lib/cameraRoutes/overview.js'
import recording from '../_lib/cameraRoutes/recording.js'
import recordings from '../_lib/cameraRoutes/recordings.js'
import token from '../_lib/cameraRoutes/token.js'

const cameraRoutes: Record<string, (request: ApiRequest, response: ApiResponse) => Promise<void>> = {
  cleanup,
  overview,
  recording,
  recordings,
  token,
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const segments = new URL(request.url || '/', 'http://localhost').pathname.split('/').filter(Boolean)
  const action = segments[segments.length - 1] || ''
  const route = cameraRoutes[action]
  if (!route) {
    sendJson(response, 404, { error: 'Camera endpoint not found.' })
    return
  }
  await route(request, response)
}
