import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, sendJson } from '../_lib/http.js'
import { clearSessionCookie, getSignedSessionUser, hasSignedSession } from '../_lib/session.js'
import { recordWorkbookAuditEvent } from '../_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  clearSessionCookie(response)
  let user: ReturnType<typeof getSignedSessionUser> = null
  let auditWarning = ''
  try {
    user = hasSignedSession(request) ? getSignedSessionUser(request) : null
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 503) throw error
    auditWarning = 'You are signed out, but activity logging is temporarily unavailable.'
  }
  if (user) {
    try {
      await recordWorkbookAuditEvent({
        userId: user.id,
        userName: user.name,
        role: user.role,
        eventType: 'logout',
      })
    } catch {
      console.error('Sign-out could not be added to the ERP audit log.')
      auditWarning = 'You are signed out, but activity logging is temporarily unavailable.'
    }
  }
  sendJson(response, 200, { ok: true, auditWarning })
}
