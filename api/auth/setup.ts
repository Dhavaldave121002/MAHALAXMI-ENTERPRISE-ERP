import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../_lib/http.js'
import { createInitialAdmin, getSessionSecret, makePasswordHash, newUser, publicUser, type UserRole } from '../_lib/workbook.js'
import { setSessionCookie } from '../_lib/session.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    getSessionSecret()
    const body = await readJsonBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (name.length < 2 || username.length < 3 || !/^[a-z0-9._-]+$/.test(username) || password.length < 10) {
      throw new ApiError(400, 'Enter a name, a valid login ID, and a password of at least 10 characters.')
    }

    const credentials = await makePasswordHash(password)
    const adminRole: UserRole = 'Super Admin'
    const admin = newUser({ id: randomUUID(), name, username, role: adminRole, ...credentials })
    await createInitialAdmin(admin)
    setSessionCookie(response, admin)
    sendJson(response, 201, { user: publicUser(admin) })
  } catch (error) {
    handleApiError(response, error, 'Initial admin setup')
  }
}
