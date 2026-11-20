import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { handleApiError, sendJson } from '../_lib/http.js'
import { getSessionUser } from '../_lib/session.js'
import { loadWorkbook } from '../_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const context = await loadWorkbook()
    sendJson(response, 200, { user: getSessionUser(request, context) })
  } catch (error) {
    handleApiError(response, error, 'Session lookup')
  }
}
