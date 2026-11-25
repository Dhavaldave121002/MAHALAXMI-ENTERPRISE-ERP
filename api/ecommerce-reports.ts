import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, sendJson } from './_lib/http.js'
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
    if (user.role === 'Super Admin') requireAdmin(user)
    else if (user.role !== 'E-commerce Executive' && user.role !== 'E-commerce Manager') {
      throw new ApiError(403, 'Only an E-commerce Executive, E-commerce Manager, or Super Admin can view daily reports.')
    }
    const result = await listWorkbookEcommerceReports(user)
    const visibleReports = user.role === 'Super Admin'
      ? result.reports
      : user.role === 'E-commerce Manager'
        ? result.reports.filter(report =>
          (String(report.userId || '') === user.id && report.platform === 'TEAM') ||
          users.some(account =>
            account.id === String(report.userId || '') && account.role === 'E-commerce Executive' && account.managerId === user.id,
          ),
        )
        : result.reports.filter(report => String(report.userId || '') === user.id)
    const reports = visibleReports.map(report => ({
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
