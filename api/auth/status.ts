import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, sendJson } from '../_lib/http.js'
import { getSessionSecret, getWorkbookData, readUsers, validateWorkbookConfiguration, type PublicUser } from '../_lib/workbook.js'
import { getSessionUser, getSignedSessionUser, hasSignedSession, refreshSessionCookie } from '../_lib/session.js'
import { getSnapshot } from '../erp.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    getSessionSecret()
    if (!hasSignedSession(request)) {
      validateWorkbookConfiguration()
      sendJson(response, 200, { configured: true, user: null })
      return
    }

    const signedInUser = getSignedSessionUser(request)
    if (signedInUser) {
      sendJson(response, 200, { configured: true, user: signedInUser })
      return
    }

    const data = await getWorkbookData()
    const users = readUsers(data.sheets.Users || [])
    let user: PublicUser | null = null
    try {
      user = await getSessionUser(request, users)
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 401) throw error
    }
    if (user) refreshSessionCookie(response, request, user, data.capabilities?.sessionBoundWrites === true)
    sendJson(response, 200, {
      configured: true,
      user,
      workbook: user ? getSnapshot(data, user) : undefined,
    })
  } catch (error) {
    handleApiError(response, error, 'Authentication status')
  }
}
