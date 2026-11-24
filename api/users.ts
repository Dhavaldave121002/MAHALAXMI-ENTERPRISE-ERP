import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import { appendUser, ECOMMERCE_PLATFORMS, isUserRole, listUsers, makePasswordHash, newUser, publicUser, setUserActive, type EcommercePlatform, type UserRole } from './_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST, PATCH')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const currentUser = await getSessionUser(request, users)
    requireAdmin(currentUser)
    if (request.method === 'GET') {
      sendJson(response, 200, { users: users.map(publicUser) })
      return
    }

    const body = await readJsonBody(request)
    if (request.method === 'POST') {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      const roleValue = typeof body.role === 'string' ? body.role : ''
      const requestedPlatforms = body.platforms === undefined ? [] : body.platforms
      if (name.length < 2 || username.length < 3 || !/^[a-z0-9._-]+$/.test(username) || password.length < 10) {
        throw new ApiError(400, 'Enter a name, valid login ID, and password of at least 10 characters.')
      }
      if (!isUserRole(roleValue) || roleValue === 'Super Admin') {
        throw new ApiError(403, 'Only the initial account can be Super Admin.')
      }
      if (!Array.isArray(requestedPlatforms) || requestedPlatforms.some(platform => typeof platform !== 'string' || !ECOMMERCE_PLATFORMS.includes(platform as EcommercePlatform))) {
        throw new ApiError(400, 'Choose valid marketplace platforms.')
      }
      const platforms = [...new Set(requestedPlatforms as EcommercePlatform[])]
      if (roleValue === 'E-commerce Executive' && platforms.length === 0) {
        throw new ApiError(400, 'Assign at least one marketplace platform to an E-commerce Executive.')
      }
      if (roleValue !== 'E-commerce Executive' && platforms.length > 0) {
        throw new ApiError(400, 'Marketplace platform access can only be assigned to E-commerce Executives.')
      }
      if (users.some(user => user.username === username)) throw new ApiError(409, 'That login ID is already in use.')
      const credentials = await makePasswordHash(password)
      const user = newUser({
        id: randomUUID(),
        name,
        username,
        role: roleValue as UserRole,
        platforms,
        ...credentials,
      })
      await appendUser(user, currentUser)
      sendJson(response, 201, { user: publicUser(user) })
      return
    }

    const id = typeof body.id === 'string' ? body.id : ''
    const active = body.active
    if (!id || typeof active !== 'boolean') throw new ApiError(400, 'A user ID and active status are required.')
    if (id === currentUser.id && !active) throw new ApiError(400, 'You cannot deactivate your own account.')
    const target = users.find(user => user.id === id)
    if (!target) throw new ApiError(404, 'User account was not found.')
    if (!active && target.role === 'Super Admin' && users.filter(user => user.role === 'Super Admin' && user.active).length <= 1) {
      throw new ApiError(400, 'The only Super Admin account cannot be deactivated.')
    }
    await setUserActive(id, active, currentUser)
    sendJson(response, 200, { ok: true })
  } catch (error) {
    handleApiError(response, error, 'User management')
  }
}
