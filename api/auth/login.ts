import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../_lib/http.js'
import { setSessionCookie } from '../_lib/session.js'
import { getSessionSecret, listUsers, publicUser, verifyPassword } from '../_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    getSessionSecret()
    const body = await readJsonBody(request)
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const scope = body.scope === 'admin' ? 'admin' : 'team'
    if (!username || !password) throw new ApiError(400, 'Enter your login ID and password.')

    const user = (await listUsers()).find(item => item.username === username && item.active)
    if (!user || !await verifyPassword(password, user.salt, user.passwordHash)) {
      throw new ApiError(401, 'Login ID or password is incorrect.')
    }
    if (scope === 'admin' && user.role !== 'Super Admin') {
      throw new ApiError(403, 'The /admin login is only for the Super Admin.')
    }
    setSessionCookie(response, user)
    sendJson(response, 200, { user: publicUser(user) })
  } catch (error) {
    handleApiError(response, error, 'Login')
  }
}
