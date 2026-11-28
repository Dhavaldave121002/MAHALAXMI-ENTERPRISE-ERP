import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import {
  createWorkbookDailyTask,
  downloadWorkbookDailyTaskAttachment,
  listWorkbookDailyTasks,
  listUsers,
  reviewWorkbookDailyTask,
  updateWorkbookDailyTask,
  type UserRole,
} from './_lib/workbook.js'

type DailyTaskStatus = 'Assigned' | 'In Progress' | 'Submitted' | 'Needs Changes' | 'Approved'
const TASK_ROLES: UserRole[] = [
  'Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager',
  'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer',
]
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function hasControlCharacters(value: string, allowLineFeed = false) {
  return value.split('').some(character => {
    const code = character.charCodeAt(0)
    return (code < 32 && !(allowLineFeed && code === 10)) || code === 127
  })
}

function taskFromRecord(record: Record<string, unknown>) {
  const status = text(record.status ?? record.Status)
  const assigneeRole = text(record.assigneeRole ?? record['Assigned To Role'])
  if (!['Assigned', 'In Progress', 'Submitted', 'Needs Changes', 'Approved'].includes(status) ||
      !TASK_ROLES.includes(assigneeRole as UserRole)) {
    throw new ApiError(503, 'Apps Script returned a daily task with invalid status or assignee data.')
  }
  return {
    id: text(record.id ?? record['Task ID']),
    taskDate: text(record.taskDate ?? record['Task Date']),
    title: text(record.title ?? record.Title),
    description: text(record.description ?? record.Description),
    attachmentName: text(record.attachmentName ?? record['Attachment Name']),
    assigneeId: text(record.assigneeId ?? record['Assigned To ID']),
    assigneeName: text(record.assigneeName ?? record['Assigned To Name']),
    assigneeRole: assigneeRole as UserRole,
    createdBy: text(record.createdBy ?? record['Created By']),
    createdAt: text(record.createdAt ?? record['Created At']),
    updatedAt: text(record.updatedAt ?? record['Updated At']),
    status: status as DailyTaskStatus,
    completed: text(record.completed ?? record['Completed Work']),
    pending: text(record.pending ?? record['Pending Work']),
    issues: text(record.issues ?? record.Issues),
    reviewedBy: text(record.reviewedBy ?? record['Reviewed By']),
    reviewedAt: text(record.reviewedAt ?? record['Reviewed At']),
    reviewNote: text(record.reviewNote ?? record['Review Note']),
  }
}

function requireTaskDate(value: unknown) {
  const taskDate = text(value)
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(taskDate) ? new Date(`${taskDate}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== taskDate) {
    throw new ApiError(400, 'Choose a valid task date.')
  }
  return taskDate
}

function optionalAttachment(value: unknown) {
  if (value === undefined || value === null) return undefined
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'Choose a valid PDF or TXT attachment.')
  }
  const attachment = value as Record<string, unknown>
  const fileName = text(attachment.fileName)
  const mimeType = text(attachment.mimeType).toLowerCase()
  const base64 = typeof attachment.base64 === 'string' ? attachment.base64 : ''
  const isPdf = /\.pdf$/i.test(fileName) && mimeType === 'application/pdf'
  const isText = /\.txt$/i.test(fileName) && mimeType === 'text/plain'
  if (!fileName || fileName.length > 180 || hasControlCharacters(fileName) ||
      fileName.includes('/') || fileName.includes('\\') || (!isPdf && !isText) ||
      !base64 || base64.length > 4_200_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new ApiError(400, 'Attach a PDF or TXT file up to 3 MB.')
  }
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.length > MAX_ATTACHMENT_BYTES || bytes.length === 0 ||
      (isPdf && (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-')) ||
      (isText && bytes.includes(0))) {
    throw new ApiError(400, 'The attachment must be a valid PDF or text file up to 3 MB.')
  }
  return { fileName, mimeType, base64 }
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
    if (request.method === 'GET') {
      const url = new URL(request.url || '/', 'http://localhost')
      const attachmentTaskId = url.searchParams.get('attachment')
      if (attachmentTaskId !== null) {
        if (!attachmentTaskId || attachmentTaskId.length > 120) {
          throw new ApiError(400, 'A valid daily task ID is required.')
        }
        const result = await downloadWorkbookDailyTaskAttachment(user, attachmentTaskId)
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(result.base64) || result.base64.length > 4_200_000) {
          throw new ApiError(503, 'The task attachment could not be read.')
        }
        const file = Buffer.from(result.base64, 'base64')
        const isPdf = result.mimeType === 'application/pdf' && /\.pdf$/i.test(result.fileName)
        const isText = result.mimeType === 'text/plain' && /\.txt$/i.test(result.fileName)
        if (file.length === 0 || file.length > MAX_ATTACHMENT_BYTES ||
            (!isPdf && !isText) ||
            (isPdf && (file.length < 5 || file.subarray(0, 5).toString('ascii') !== '%PDF-')) ||
            (isText && file.includes(0))) {
          throw new ApiError(503, 'The stored task attachment is invalid.')
        }
        const fileName = result.fileName.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 180) || 'task-attachment'
        const encodedName = encodeURIComponent(fileName).replace(/[!'()*]/g, character =>
          `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
        )
        response.statusCode = 200
        response.setHeader('Content-Type', result.mimeType)
        response.setHeader('Content-Length', String(file.length))
        response.setHeader('Content-Disposition', `attachment; filename="task-attachment"; filename*=UTF-8''${encodedName}`)
        response.setHeader('Cache-Control', 'private, no-store')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.end(file)
        return
      }
      const result = await listWorkbookDailyTasks(user)
      const tasks = result.tasks.map(taskFromRecord).filter(task =>
        user.role === 'Super Admin' || task.assigneeId === user.id,
      )
      sendJson(response, 200, { tasks })
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    if (action === 'create') {
      if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can assign company daily tasks.')
      const taskDate = requireTaskDate(body.taskDate)
      const title = text(body.title)
      const description = typeof body.description === 'string' ? body.description.replace(/\r\n?/g, '\n').trim() : ''
      if (!title || title.length > 200 || hasControlCharacters(title)) {
        throw new ApiError(400, 'Enter a task title up to 200 characters.')
      }
      if (!description || description.length > 3000 || hasControlCharacters(description, true)) {
        throw new ApiError(400, 'Enter task instructions up to 3,000 characters.')
      }
      if (!Array.isArray(body.recipientIds) || body.recipientIds.length === 0 || body.recipientIds.length > 500) {
        throw new ApiError(400, 'Choose at least one active employee for this task.')
      }
      const recipientIds = Array.from(new Set(body.recipientIds.map(text)))
      if (recipientIds.some(id => !id || id.length > 120 || hasControlCharacters(id))) {
        throw new ApiError(400, 'Choose valid employee accounts for this task.')
      }
      const activeEmployees = new Set(users
        .filter(account => account.active && account.role !== 'Super Admin')
        .map(account => account.id))
      if (recipientIds.some(id => !activeEmployees.has(id))) {
        throw new ApiError(400, 'Tasks can only be assigned to active non-admin employee accounts.')
      }
      const attachment = optionalAttachment(body.attachment)
      const result = await createWorkbookDailyTask({
        id: user.id,
        role: user.role,
        taskDate,
        title,
        description,
        recipientIds,
        attachment,
      })
      sendJson(response, 201, { tasks: result.tasks.map(taskFromRecord) })
      return
    }

    if (action === 'updateStatus') {
      if (user.role === 'Super Admin') throw new ApiError(403, 'Super Admin reviews employee submissions instead of reporting on assigned tasks.')
      const taskId = text(body.taskId)
      const status = body.status
      const completed = typeof body.completed === 'string' ? body.completed.trim() : ''
      const pending = typeof body.pending === 'string' ? body.pending.trim() : ''
      const issues = typeof body.issues === 'string' ? body.issues.trim() : ''
      if (!taskId || taskId.length > 120 || (status !== 'In Progress' && status !== 'Submitted')) {
        throw new ApiError(400, 'Choose a valid task and progress status.')
      }
      if ([completed, pending, issues].some(value => hasControlCharacters(value, true))) {
        throw new ApiError(400, 'Work-report fields contain unsupported characters.')
      }
      if (status === 'Submitted' && !completed) throw new ApiError(400, 'Describe completed work before submitting the task.')
      const result = await updateWorkbookDailyTask({
        id: user.id,
        role: user.role,
        taskId,
        status,
        completed,
        pending,
        issues,
      })
      sendJson(response, 200, { task: taskFromRecord(result.task) })
      return
    }

    if (action === 'review') {
      if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can review company daily tasks.')
      const taskId = text(body.taskId)
      const decision = body.decision
      const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : ''
      if (!taskId || taskId.length > 120 || (decision !== 'Approved' && decision !== 'Needs Changes')) {
        throw new ApiError(400, 'Choose a valid task review decision.')
      }
      if (reviewNote.length > 1000 || (decision === 'Needs Changes' && !reviewNote)) {
        throw new ApiError(400, 'Add a review note of up to 1,000 characters when requesting changes.')
      }
      const result = await reviewWorkbookDailyTask({
        id: user.id,
        role: user.role,
        taskId,
        decision,
        reviewNote,
      })
      sendJson(response, 200, { task: taskFromRecord(result.task) })
      return
    }

    throw new ApiError(400, 'Choose a valid daily task action.')
  } catch (error) {
    handleApiError(response, error, 'Company daily tasks')
  }
}
