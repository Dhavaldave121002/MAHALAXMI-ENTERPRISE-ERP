import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import { appendUser, ECOMMERCE_PLATFORMS, isUserRole, listUsers, makePasswordHash, newUser, publicUser, setUserActive, setUserManager, type EcommercePlatform, type UserRole } from './_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST, PATCH')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const currentUser = await getSessionUser(request, users)
    if (request.method === 'GET') {
      if (currentUser.role === 'Super Admin') {
        sendJson(response, 200, { users: users.map(publicUser) })
        return
      }
      if (currentUser.role === 'E-commerce Manager') {
        sendJson(response, 200, {
          users: users.filter(user => user.role === 'E-commerce Executive' && user.managerId === currentUser.id).map(publicUser),
        })
        return
      }
      throw new ApiError(403, 'Only the Super Admin or an E-commerce Manager can view these accounts.')
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
      const isAdmin = currentUser.role === 'Super Admin'
      const isManager = currentUser.role === 'E-commerce Manager'
      if (!isUserRole(roleValue) || roleValue === 'Super Admin' ||
          (!isAdmin && !(isManager && roleValue === 'E-commerce Executive'))) {
        throw new ApiError(403, 'This account cannot create the requested role.')
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
      let managerId = ''
      if (roleValue === 'E-commerce Executive') {
        if (isManager) {
          managerId = currentUser.id
        } else {
          if (body.managerId !== undefined && typeof body.managerId !== 'string') {
            throw new ApiError(400, 'Choose an active E-commerce Manager or leave the manager unassigned.')
          }
          managerId = typeof body.managerId === 'string' ? body.managerId.trim() : ''
        }
        if (managerId) {
          const manager = users.find(account => account.id === managerId && account.role === 'E-commerce Manager' && account.active)
          if (!manager) throw new ApiError(400, 'Choose an active E-commerce Manager.')
        } else if (!isAdmin) {
          throw new ApiError(400, 'An E-commerce Manager must create executives assigned to their account.')
        }
      } else if (body.managerId !== undefined && body.managerId !== '') {
        throw new ApiError(400, 'Only E-commerce Executives can be assigned to a manager.')
      }
      if (users.some(user => user.username === username)) throw new ApiError(409, 'That login ID is already in use.')
      const credentials = await makePasswordHash(password)
      const user = newUser({
        id: randomUUID(),
        name,
        username,
        role: roleValue as UserRole,
        platforms,
        managerId,
        ...credentials,
      })
      await appendUser(user, currentUser)
      sendJson(response, 201, { user: publicUser(user) })
      return
    }

    const id = typeof body.id === 'string' ? body.id : ''
    if (Object.prototype.hasOwnProperty.call(body, 'managerId')) {
      if (currentUser.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can assign an executive manager.')
      if (!id || typeof body.managerId !== 'string') throw new ApiError(400, 'An executive ID and manager ID are required.')
      const executive = users.find(account => account.id === id && account.role === 'E-commerce Executive')
      if (!executive) throw new ApiError(404, 'E-commerce Executive account was not found.')
      const managerId = body.managerId.trim()
      if (managerId && !users.some(account => account.id === managerId && account.role === 'E-commerce Manager' && account.active)) {
        throw new ApiError(400, 'Choose an active E-commerce Manager.')
      }
      await setUserManager(id, managerId, currentUser)
      sendJson(response, 200, { ok: true, managerId })
      return
    }
    const active = body.active
    if (!id || typeof active !== 'boolean') throw new ApiError(400, 'A user ID and active status are required.')
    if (id === currentUser.id && !active) throw new ApiError(400, 'You cannot deactivate your own account.')
    const target = users.find(user => user.id === id)
    if (!target) throw new ApiError(404, 'User account was not found.')
    if (currentUser.role !== 'Super Admin' &&
        !(currentUser.role === 'E-commerce Manager' && target.role === 'E-commerce Executive' && target.managerId === currentUser.id)) {
      throw new ApiError(403, 'You can only change the status of your own executive accounts.')
    }
    if (!active && target.role === 'Super Admin' && users.filter(user => user.role === 'Super Admin' && user.active).length <= 1) {
      throw new ApiError(400, 'The only Super Admin account cannot be deactivated.')
    }
    await setUserActive(id, active, currentUser)
    sendJson(response, 200, { ok: true })
  } catch (error) {
    handleApiError(response, error, 'User management')
  }
}
