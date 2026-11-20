import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../_lib/http.js'
import { appendUser, loadWorkbook, makePasswordHash, newUser, readUsers, saveWorkbook, type UserRole } from '../_lib/workbook.js'
import { setSessionCookie } from '../_lib/session.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const body = await readJsonBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (name.length < 2 || username.length < 3 || !/^[a-z0-9._-]+$/.test(username) || password.length < 10) {
      throw new ApiError(400, 'Enter a name, a valid login ID, and a password of at least 10 characters.')
    }

    const context = await loadWorkbook()
    const users = readUsers(context.workbook)
    if (users.some(user => user.role === 'Super Admin')) {
      throw new ApiError(409, 'The Super Admin account is already set up. Sign in instead.')
    }
    if (users.some(user => user.username === username)) throw new ApiError(409, 'That login ID is already in use.')

    const credentials = await makePasswordHash(password)
    const adminRole: UserRole = 'Super Admin'
    const admin = newUser({ id: randomUUID(), name, username, role: adminRole, ...credentials })
    appendUser(context.workbook, admin)
    await saveWorkbook(context)
    setSessionCookie(response, admin.id)
    sendJson(response, 201, { user: { id: admin.id, name: admin.name, username: admin.username, role: admin.role, active: true } })
  } catch (error) {
    handleApiError(response, error, 'Initial admin setup')
  }
}
