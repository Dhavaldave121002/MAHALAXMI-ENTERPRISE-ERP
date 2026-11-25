import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import { listUsers, listWorkbookGraphicDesignReports, submitWorkbookGraphicDesignReport } from './_lib/workbook.js'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function reportFromRecord(record: Record<string, unknown>) {
  const date = text(record.date)
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null
  if (!text(record.id) || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new ApiError(503, 'Apps Script returned an invalid Graphic Designer daily report.')
  }
  return {
    id: text(record.id),
    date,
    userId: text(record.userId),
    userName: text(record.userName),
    completed: text(record.completed),
    pending: text(record.pending),
    issues: text(record.issues),
    createdAt: text(record.createdAt),
    updatedAt: text(record.updatedAt),
  }
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
    if (user.role !== 'Super Admin' && user.role !== 'Graphic Designer') {
      throw new ApiError(403, 'Only a Graphic Designer or Super Admin can access daily reports.')
    }

    if (request.method === 'GET') {
      const result = await listWorkbookGraphicDesignReports(user)
      const reports = result.reports.map(reportFromRecord).filter(report =>
        user.role === 'Super Admin' || report.userId === user.id,
      )
      sendJson(response, 200, { reports })
      return
    }

    if (user.role !== 'Graphic Designer') {
      throw new ApiError(403, 'Only a Graphic Designer can submit a daily report.')
    }
    const body = await readJsonBody(request)
    const completed = typeof body.completed === 'string' ? body.completed.trim() : ''
    const pending = typeof body.pending === 'string' ? body.pending.trim() : ''
    const issues = typeof body.issues === 'string' ? body.issues.trim() : ''
    if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
      throw new ApiError(400, 'Completed work is required; each report field must be 3,000 characters or fewer.')
    }
    const result = await submitWorkbookGraphicDesignReport({
      id: user.id,
      role: user.role,
      completed,
      pending,
      issues,
    })
    sendJson(response, 201, { report: reportFromRecord(result.report) })
  } catch (error) {
    handleApiError(response, error, 'Graphic Design daily reports')
  }
}
