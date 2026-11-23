import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, sendJson } from '../_lib/http.js'
import { getSessionSecret, getWorkbookData, listUsers, readUsers, type PublicUser } from '../_lib/workbook.js'
import { getSessionUser, hasSignedSession } from '../_lib/session.js'
import { getSnapshot } from '../erp.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    getSessionSecret()
    const data = hasSignedSession(request) ? await getWorkbookData() : null
    const users = data ? readUsers(data.sheets.Users || []) : await listUsers()
    const hasAdmin = users.some(user => user.role === 'Super Admin')
    let user: PublicUser | null = null
    try {
      user = await getSessionUser(request, users)
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 401) throw error
    }
    sendJson(response, 200, {
      configured: true,
      needsAdminSetup: !hasAdmin,
      user,
      workbook: user && data ? getSnapshot(data, user) : undefined,
    })
  } catch (error) {
    handleApiError(response, error, 'Authentication status')
  }
}
