import type { ApiRequest, ApiResponse } from '../http.js'
import { handleApiError, sendJson } from '../http.js'
import { getSessionUser } from '../session.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    sendJson(response, 200, { user: await getSessionUser(request) })
  } catch (error) {
    handleApiError(response, error, 'Session lookup')
  }
}
