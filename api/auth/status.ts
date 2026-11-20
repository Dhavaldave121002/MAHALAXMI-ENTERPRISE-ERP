import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { handleApiError, sendJson } from '../_lib/http.js'
import { loadWorkbook, readUsers } from '../_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const context = await loadWorkbook()
    const users = readUsers(context.workbook)
    const hasAdmin = users.some(user => user.role === 'Super Admin')
    sendJson(response, 200, { configured: true, needsAdminSetup: !hasAdmin, workbookName: context.name })
  } catch (error) {
    handleApiError(response, error, 'Authentication status')
  }
}
