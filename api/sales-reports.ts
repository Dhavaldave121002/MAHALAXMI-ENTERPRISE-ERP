import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import { listUsers, listWorkbookSalesReports, submitWorkbookSalesReport } from './_lib/workbook.js'

function requiredReportText(value: unknown, label: string) {
  if (typeof value !== 'string') throw new ApiError(400, `${label} is required.`)
  const result = value.trim()
  const hasInvalidControl = result.split('').some(character => {
    const code = character.charCodeAt(0)
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127
  })
  if (!result || hasInvalidControl) {
    throw new ApiError(400, `${label} is required.`)
  }
  return result
}

function optionalReportText(value: unknown, label: string) {
  if (value === undefined) return ''
  if (typeof value !== 'string') throw new ApiError(400, `${label} must be text.`)
  const result = value.trim()
  const hasInvalidControl = result.split('').some(character => {
    const code = character.charCodeAt(0)
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127
  })
  if (hasInvalidControl) {
    throw new ApiError(400, `${label} contains unsupported characters.`)
  }
  return result
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const user = await getSessionUser(request, users)
    if (user.role === 'Super Admin') requireAdmin(user)
    else if (!['Sales Executive', 'Production Supervisor'].includes(user.role)) {
      throw new ApiError(403, 'Only Sales Executives, Production Supervisors, and the Super Admin can access Sales daily reports.')
    }

    if (request.method === 'GET') {
      const result = await listWorkbookSalesReports(user)
      const visibleReports = user.role === 'Sales Executive'
        ? result.reports.filter(report => String(report.userId || '') === user.id)
        : result.reports
      const reports = visibleReports.map(report => ({
        id: String(report.id || ''),
        date: String(report.date || ''),
        userId: String(report.userId || ''),
        userName: String(report.userName || ''),
        completed: String(report.completed || ''),
        pending: String(report.pending || ''),
        issues: String(report.issues || ''),
        updatedAt: String(report.updatedAt || ''),
      }))
      sendJson(response, 200, { reports })
      return
    }

    if (user.role !== 'Sales Executive') {
      throw new ApiError(403, 'Only a Sales Executive can submit a daily sales report.')
    }
    const body = await readJsonBody(request)
    const completed = requiredReportText(body.completed, 'Completed work')
    const pending = optionalReportText(body.pending, 'Pending work')
    const issues = optionalReportText(body.issues, 'Issues / notes')
    const result = await submitWorkbookSalesReport({
      id: user.id,
      role: user.role,
      completed,
      pending,
      issues,
    })
    sendJson(response, 200, result)
  } catch (error) {
    handleApiError(response, error, 'Sales daily reports')
  }
}
