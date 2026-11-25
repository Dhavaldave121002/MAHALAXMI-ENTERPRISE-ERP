import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import {
  createWorkbookEcommerceTask,
  listWorkbookEcommerceTasks,
  listUsers,
  reviewWorkbookEcommerceTask,
  updateWorkbookEcommerceTask,
} from './_lib/workbook.js'

type EcommerceTaskStatus = 'Assigned' | 'In Progress' | 'Submitted' | 'Needs Changes' | 'Approved'

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
  if (!['Assigned', 'In Progress', 'Submitted', 'Needs Changes', 'Approved'].includes(status)) {
    throw new ApiError(503, 'Apps Script returned a daily task with an invalid status.')
  }
  return {
    id: text(record.id ?? record['Task ID']),
    managerId: text(record.managerId ?? record['Manager ID']),
    managerName: text(record.managerName ?? record['Manager Name']),
    executiveId: text(record.executiveId ?? record['Executive ID']),
    executiveName: text(record.executiveName ?? record['Executive Name']),
    taskDate: text(record.taskDate ?? record['Task Date']),
    title: text(record.title ?? record.Title),
    description: text(record.description ?? record.Description),
    status: status as EcommerceTaskStatus,
    createdAt: text(record.createdAt ?? record['Created At']),
    updatedAt: text(record.updatedAt ?? record['Updated At']),
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
      if (!['Super Admin', 'E-commerce Manager', 'E-commerce Executive'].includes(user.role)) {
        throw new ApiError(403, 'Only E-commerce users and the Super Admin can view daily tasks.')
      }
      const result = await listWorkbookEcommerceTasks(user)
      const tasks = result.tasks.map(taskFromRecord).filter(task =>
        user.role === 'Super Admin' ||
        (user.role === 'E-commerce Manager' && task.managerId === user.id) ||
        (user.role === 'E-commerce Executive' && task.executiveId === user.id),
      )
      sendJson(response, 200, { tasks })
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    if (action === 'create') {
      if (user.role !== 'E-commerce Manager') throw new ApiError(403, 'Only an E-commerce Manager can assign daily tasks.')
      const executiveId = text(body.executiveId)
      const executive = users.find(account =>
        account.id === executiveId && account.active && account.role === 'E-commerce Executive' && account.managerId === user.id,
      )
      if (!executive) throw new ApiError(400, 'Choose an active Executive who reports to your manager account.')
      const title = text(body.title)
      const description = typeof body.description === 'string' ? body.description.replace(/\r\n?/g, '\n').trim() : ''
      if (!title || title.length > 200 || hasControlCharacters(title)) {
        throw new ApiError(400, 'Enter a task title up to 200 characters.')
      }
      if (description.length > 2000 || hasControlCharacters(description, true)) {
        throw new ApiError(400, 'Task details must be 2,000 characters or fewer.')
      }
      const result = await createWorkbookEcommerceTask({
        id: user.id,
        role: user.role,
        executiveId,
        taskDate: requireTaskDate(body.taskDate),
        title,
        description,
      })
      sendJson(response, 201, { task: taskFromRecord(result.task) })
      return
    }

    if (action === 'updateStatus') {
      if (user.role !== 'E-commerce Executive') throw new ApiError(403, 'Only the assigned Executive can update task progress.')
      const taskId = text(body.taskId)
      const status = body.status
      if (!taskId || taskId.length > 120 || (status !== 'In Progress' && status !== 'Submitted')) {
        throw new ApiError(400, 'Choose a valid daily task and progress status.')
      }
      const result = await updateWorkbookEcommerceTask({ id: user.id, role: user.role, taskId, status })
      sendJson(response, 200, { task: taskFromRecord(result.task) })
      return
    }

    if (action === 'review') {
      if (user.role !== 'E-commerce Manager') throw new ApiError(403, 'Only the owning Manager can review task completion.')
      const taskId = text(body.taskId)
      const decision = body.decision
      const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : ''
      if (!taskId || taskId.length > 120 || (decision !== 'Approved' && decision !== 'Needs Changes')) {
        throw new ApiError(400, 'Choose a valid task review decision.')
      }
      if (reviewNote.length > 1000 || (decision === 'Needs Changes' && !reviewNote)) {
        throw new ApiError(400, 'Add a review note of up to 1,000 characters when requesting changes.')
      }
      const result = await reviewWorkbookEcommerceTask({
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
    handleApiError(response, error, 'E-commerce daily tasks')
  }
}
