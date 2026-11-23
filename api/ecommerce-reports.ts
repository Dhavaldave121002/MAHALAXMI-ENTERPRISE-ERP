import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { handleApiError, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import { listUsers, listWorkbookEcommerceReports } from './_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const user = await getSessionUser(request, users)
    requireAdmin(user)
    const result = await listWorkbookEcommerceReports(user)
    const reports = result.reports.map(report => ({
      id: String(report.id || ''),
      date: String(report.date || ''),
      platform: String(report.platform || ''),
      userName: String(report.userName || ''),
      completed: String(report.completed || ''),
      pending: String(report.pending || ''),
      issues: String(report.issues || ''),
      updatedAt: String(report.updatedAt || ''),
    }))
    sendJson(response, 200, { reports })
  } catch (error) {
    handleApiError(response, error, 'E-commerce daily reports')
  }
}
