import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Download, FileText, Plus, RefreshCw, Upload } from 'lucide-react'

type UserRole = 'Super Admin' | 'Production Supervisor' | 'Machine Operator' | 'Store Manager' |
  'E-commerce Manager' | 'E-commerce Executive' | 'Sales Executive' | 'Graphic Designer'
type TaskStatus = 'Assigned' | 'In Progress' | 'Submitted' | 'Needs Changes' | 'Approved'
type DailyTask = {
  id: string
  taskDate: string
  title: string
  description: string
  attachmentName: string
  assigneeId: string
  assigneeName: string
  assigneeRole: UserRole
  createdBy: string
  createdAt: string
  updatedAt: string
  status: TaskStatus
  completed: string
  pending: string
  issues: string
  reviewedBy: string
  reviewedAt: string
  reviewNote: string
}
type Employee = { id: string; name: string; role: UserRole; active: boolean }
type Props = { user: { id: string; name: string; role: UserRole } }
type ReportDraft = { completed: string; pending: string; issues: string }
type AssignmentScope = 'all' | 'roles' | 'selected'

const MAX_FILE_BYTES = 3 * 1024 * 1024
const EMPLOYEE_ROLES: UserRole[] = [
  'Production Supervisor', 'Machine Operator', 'Store Manager',
  'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer',
]

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store', ...init })
  } catch {
    throw new Error('Could not connect to the ERP server. Check your internet connection and retry.')
  }
  let result: { error?: string } & Record<string, unknown>
  try {
    result = await response.json() as { error?: string } & Record<string, unknown>
  } catch {
    throw new Error('The ERP API returned an invalid response. Reload the page and retry.')
  }
  if (!response.ok) throw new Error(result.error || 'The server request failed.')
  return result as T
}

function todayInIndia() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function formatTaskDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value || '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(`${value}T12:00:00+05:30`))
}

function formatTaskTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(date)
}

function statusClass(status: TaskStatus) {
  if (status === 'Approved') return 'approved'
  if (status === 'Needs Changes') return 'needs-changes'
  if (status === 'Submitted') return 'submitted'
  if (status === 'In Progress') return 'in-progress'
  return 'assigned'
}

function bytesToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)))
  }
  return window.btoa(binary)
}

function attachmentMimeType(file: File) {
  if (/\.pdf$/i.test(file.name)) return 'application/pdf'
  if (/\.txt$/i.test(file.name)) return 'text/plain'
  return file.type.toLowerCase()
}

export function DailyTasksView({ user }: Props) {
  const isAdmin = user.role === 'Super Admin'
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [savingTask, setSavingTask] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState('')
  const [scope, setScope] = useState<AssignmentScope>('all')
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [reportDrafts, setReportDrafts] = useState<Record<string, ReportDraft>>({})
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    Promise.all([
      requestJson<{ tasks: DailyTask[] }>('/api/daily-tasks'),
      isAdmin ? requestJson<{ users: Employee[] }>('/api/users') : Promise.resolve({ users: [] as Employee[] }),
    ]).then(([taskResult, userResult]) => {
      if (!active) return
      setTasks(taskResult.tasks)
      setEmployees(userResult.users.filter(employee => employee.active && employee.role !== 'Super Admin'))
    }).catch(requestError => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Daily tasks could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [isAdmin, reloadKey])

  const employeeRoles = useMemo(
    () => EMPLOYEE_ROLES.filter(role => employees.some(employee => employee.role === role)),
    [employees],
  )
  const recipientIds = useMemo(() => {
    if (scope === 'all') return employees.map(employee => employee.id)
    if (scope === 'roles') return employees.filter(employee => selectedRoles.includes(employee.role)).map(employee => employee.id)
    return employees.filter(employee => selectedEmployees.includes(employee.id)).map(employee => employee.id)
  }, [employees, scope, selectedEmployees, selectedRoles])

  const createTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    const taskDate = String(form.get('taskDate') || '')
    const file = form.get('attachment')
    if (!title || !description || !taskDate || recipientIds.length === 0) {
      setMessage('Add a title, task instructions, date, and at least one active employee.')
      return
    }
    setSavingTask(true)
    setMessage('')
    try {
      let attachment: { fileName: string; mimeType: string; base64: string } | undefined
      if (file instanceof File && file.size > 0) {
        const mimeType = attachmentMimeType(file)
        if (file.size > MAX_FILE_BYTES || !['application/pdf', 'text/plain'].includes(mimeType) ||
            (mimeType === 'application/pdf' && !/\.pdf$/i.test(file.name)) ||
            (mimeType === 'text/plain' && !/\.txt$/i.test(file.name))) {
          setMessage('Choose a PDF or TXT attachment no larger than 3 MB.')
          return
        }
        try {
          attachment = { fileName: file.name, mimeType, base64: bytesToBase64(await file.arrayBuffer()) }
        } catch {
          setMessage('The selected attachment could not be read. Choose it again and retry.')
          return
        }
      }
      const result = await requestJson<{ tasks: DailyTask[] }>('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', taskDate, title, description, recipientIds, attachment }),
      })
      setTasks(current => [...result.tasks, ...current])
      setMessage(`Task assigned to ${result.tasks.length} employee${result.tasks.length === 1 ? '' : 's'}.`)
      formElement.reset()
      setScope('all')
      setSelectedRoles([])
      setSelectedEmployees([])
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Daily task could not be assigned.')
    } finally {
      setSavingTask(false)
    }
  }

  const updateReport = async (task: DailyTask, status: 'In Progress' | 'Submitted') => {
    const draft = reportDrafts[task.id] || { completed: task.completed, pending: task.pending, issues: task.issues }
    if (status === 'Submitted' && !draft.completed.trim()) {
      setMessage('Describe completed work before submitting the task.')
      return
    }
    setBusyTaskId(task.id)
    setMessage('')
    try {
      const result = await requestJson<{ task: DailyTask }>('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', taskId: task.id, status, ...draft }),
      })
      setTasks(current => current.map(item => item.id === task.id ? result.task : item))
      setMessage(status === 'Submitted' ? 'Daily report sent to the Admin for review.' : 'Task marked in progress.')
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Task progress could not be saved.')
    } finally {
      setBusyTaskId('')
    }
  }

  const reviewTask = async (task: DailyTask, decision: 'Approved' | 'Needs Changes') => {
    const reviewNote = (reviewDrafts[task.id] || '').trim()
    if (decision === 'Needs Changes' && !reviewNote) {
      setMessage('Add a note explaining what needs to change.')
      return
    }
    setBusyTaskId(task.id)
    setMessage('')
    try {
      const result = await requestJson<{ task: DailyTask }>('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', taskId: task.id, decision, reviewNote }),
      })
      setTasks(current => current.map(item => item.id === task.id ? result.task : item))
      setMessage(decision === 'Approved' ? 'Employee report approved.' : 'Task returned to the employee for changes.')
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : 'Task review could not be saved.')
    } finally {
      setBusyTaskId('')
    }
  }

  const setReportField = (task: DailyTask, field: keyof ReportDraft, value: string) => {
    setReportDrafts(current => ({
      ...current,
      [task.id]: {
        ...(current[task.id] || { completed: task.completed, pending: task.pending, issues: task.issues }),
        [field]: value,
      },
    }))
  }

  return (
    <section className="daily-tasks-page">
      <div className="page-heading">
        <div>
          <p>WORK REPORTS</p>
          <h1>Daily Tasks</h1>
          <span className="dashboard-description">{isAdmin ? 'Assign work and review employee daily reports.' : 'See your assigned work and report progress to the Admin.'}</span>
        </div>
        <button className="secondary" type="button" onClick={() => { setError(''); setLoading(true); setReloadKey(value => value + 1) }} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <p className="daily-task-error" role="alert">{error}</p>}
      {message && <p className="daily-task-message" role="status" aria-live="polite">{message}</p>}

      {isAdmin && <section className="panel daily-task-panel">
        <div className="panel-heading"><div><h2>Assign a daily task</h2><p>Enter instructions in the form and optionally attach a private PDF or TXT reference.</p></div></div>
        <form className="daily-task-form" onSubmit={event => void createTask(event)}>
          <div className="daily-task-form-grid">
            <label>Task date<input name="taskDate" type="date" defaultValue={todayInIndia()} required /></label>
            <label>Task title<input name="title" required maxLength={200} placeholder="What needs to be done?" /></label>
            <label className="daily-task-instructions">Instructions<textarea name="description" rows={4} maxLength={3000} required placeholder="Describe the expected work and result." /></label>
            <label className="daily-task-file">Reference file (optional)<span><Upload size={15} /> PDF or TXT · max 3 MB</span><input name="attachment" type="file" accept=".pdf,.txt,application/pdf,text/plain" /></label>
          </div>
          <fieldset className="daily-task-recipients">
            <legend>Assign to</legend>
            <div className="daily-task-scope">
              <label><input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} /> All active employees ({employees.length})</label>
              <label><input type="radio" name="scope" checked={scope === 'roles'} onChange={() => setScope('roles')} /> Select role(s)</label>
              <label><input type="radio" name="scope" checked={scope === 'selected'} onChange={() => setScope('selected')} /> Select employee(s)</label>
            </div>
            {scope === 'roles' && <div className="daily-task-checklist">
              {employeeRoles.map(role => <label key={role}><input type="checkbox" checked={selectedRoles.includes(role)} onChange={event => setSelectedRoles(current => event.target.checked ? [...current, role] : current.filter(item => item !== role))} /> {role}</label>)}
            </div>}
            {scope === 'selected' && <div className="daily-task-checklist daily-task-employee-list">
              {employees.map(employee => <label key={employee.id}><input type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={event => setSelectedEmployees(current => event.target.checked ? [...current, employee.id] : current.filter(id => id !== employee.id))} /> {employee.name} <span>{employee.role}</span></label>)}
              {employees.length === 0 && <span className="daily-task-muted">No active employees available.</span>}
            </div>}
            <small>{recipientIds.length} employee{recipientIds.length === 1 ? '' : 's'} selected. Each employee receives a separate private task.</small>
          </fieldset>
          <button className="primary" type="submit" disabled={savingTask || loading || recipientIds.length === 0}>
            <Plus size={15} /> {savingTask ? 'Assigning…' : 'Assign task'}
          </button>
        </form>
      </section>}

      <section className="daily-task-list">
        <div className="daily-task-list-heading">
          <div><h2>{isAdmin ? 'Tasks and employee reports' : 'My assigned tasks'}</h2><p>{isAdmin ? `${tasks.length} employee assignment${tasks.length === 1 ? '' : 's'}` : `${tasks.length} task${tasks.length === 1 ? '' : 's'} assigned to you`}</p></div>
        </div>
        {loading && <div className="panel daily-task-empty" role="status">Loading daily tasks…</div>}
        {!loading && !error && tasks.length === 0 && <div className="panel daily-task-empty"><ClipboardCheck size={24} /><strong>{isAdmin ? 'No daily tasks yet' : 'No tasks assigned yet'}</strong><span>{isAdmin ? 'Use the form above to assign today’s work.' : 'Your Admin-assigned tasks will appear here.'}</span></div>}
        {!loading && tasks.map(task => {
          const draft = reportDrafts[task.id] || { completed: task.completed, pending: task.pending, issues: task.issues }
          const canReport = !isAdmin && ['Assigned', 'In Progress', 'Needs Changes'].includes(task.status)
          return <article className="panel daily-task-card" key={task.id}>
            <div className="daily-task-card-heading">
              <div>
                <span className="daily-task-date">{formatTaskDate(task.taskDate)}</span>
                <h3>{task.title}</h3>
                {isAdmin && <span className="daily-task-assignee">{task.assigneeName} · {task.assigneeRole}</span>}
              </div>
              <span className={`daily-task-status ${statusClass(task.status)}`}>{task.status === 'Submitted' ? 'Awaiting review' : task.status}</span>
            </div>
            {task.description && <p className="daily-task-description">{task.description}</p>}
            {task.attachmentName && <a className="daily-task-attachment" href={`/api/daily-tasks?attachment=${encodeURIComponent(task.id)}`}><FileText size={16} /> {task.attachmentName}<Download size={14} /></a>}
            {isAdmin ? <div className="daily-task-report">
              <div><strong>Completed</strong><p>{task.completed || 'No completion report yet.'}</p></div>
              {task.pending && <div><strong>Pending</strong><p>{task.pending}</p></div>}
              {task.issues && <div><strong>Issues / notes</strong><p>{task.issues}</p></div>}
              {task.reviewNote && <div className="daily-task-review-note"><strong>Review note</strong><p>{task.reviewNote}</p></div>}
              <div className="daily-task-card-footer"><span>Updated {formatTaskTime(task.updatedAt)}</span>{task.reviewedBy && <span>Reviewed by {task.reviewedBy}</span>}</div>
              {task.status === 'Submitted' && <div className="daily-task-review-actions">
                <label>Review note<textarea maxLength={1000} value={reviewDrafts[task.id] || ''} onChange={event => setReviewDrafts(current => ({ ...current, [task.id]: event.target.value }))} placeholder="Required when requesting changes" /></label>
                <div><button className="primary" type="button" disabled={busyTaskId !== ''} onClick={() => void reviewTask(task, 'Approved')}>{busyTaskId === task.id ? 'Saving…' : 'Approve report'}</button><button className="secondary" type="button" disabled={busyTaskId !== ''} onClick={() => void reviewTask(task, 'Needs Changes')}>Request changes</button></div>
              </div>}
            </div> : <div className="daily-task-report">
              {task.completed && <div><strong>Completed work</strong><p>{task.completed}</p></div>}
              {task.pending && <div><strong>Pending work</strong><p>{task.pending}</p></div>}
              {task.issues && <div><strong>Issues / notes</strong><p>{task.issues}</p></div>}
              {task.reviewNote && <div className="daily-task-review-note"><strong>Admin review</strong><p>{task.reviewNote}</p></div>}
              {canReport && <div className="daily-task-report-form">
                <label>Completed work<textarea rows={3} value={draft.completed} onChange={event => setReportField(task, 'completed', event.target.value)} placeholder="What did you complete for this task?" /></label>
                <label>Pending work<textarea rows={2} value={draft.pending} onChange={event => setReportField(task, 'pending', event.target.value)} placeholder="What remains unfinished?" /></label>
                <label>Issues / notes<textarea rows={2} value={draft.issues} onChange={event => setReportField(task, 'issues', event.target.value)} placeholder="Mention blockers or notes for the Admin." /></label>
                <div className="daily-task-report-buttons">
                  <button className="secondary" type="button" disabled={busyTaskId !== ''} onClick={() => void updateReport(task, 'In Progress')}>{busyTaskId === task.id ? 'Saving…' : 'Save progress'}</button>
                  <button className="primary" type="button" disabled={busyTaskId !== ''} onClick={() => void updateReport(task, 'Submitted')}><CheckCircle2 size={15} /> Submit report</button>
                </div>
              </div>}
              <div className="daily-task-card-footer"><span>Assigned by {task.createdBy || 'Admin'}</span><span>Updated {formatTaskTime(task.updatedAt)}</span></div>
            </div>}
          </article>
        })}
      </section>
    </section>
  )
}
