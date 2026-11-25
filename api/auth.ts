import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { sendJson } from './_lib/http.js'
import login from './_lib/authRoutes/login.js'
import logout from './_lib/authRoutes/logout.js'
import session from './_lib/authRoutes/me.js'
import setup from './_lib/authRoutes/setup.js'
import status from './_lib/authRoutes/status.js'

const authRoutes: Record<string, (request: ApiRequest, response: ApiResponse) => Promise<void>> = {
  login,
  logout,
  me: session,
  setup,
  status,
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const action = new URL(request.url || '/', 'http://localhost').searchParams.get('action') || ''
  const route = authRoutes[action]
  if (!route) {
    sendJson(response, 404, { error: 'Authentication route not found.' })
    return
  }
  await route(request, response)
}
