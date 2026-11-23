import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, sendJson } from '../_lib/http.js'
import { getSessionSecret, listUsers } from '../_lib/workbook.js'
import { getSessionUser } from '../_lib/session.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    getSessionSecret()
    const users = await listUsers()
    const hasAdmin = users.some(user => user.role === 'Super Admin')
    let user = null
    try {
      user = await getSessionUser(request, users)
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 401) throw error
    }
    sendJson(response, 200, { configured: true, needsAdminSetup: !hasAdmin, user })
  } catch (error) {
    handleApiError(response, error, 'Authentication status')
  }
}
