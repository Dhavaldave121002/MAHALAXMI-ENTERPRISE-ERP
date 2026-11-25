import type { ApiRequest, ApiResponse } from './http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './http.js'
import { getSessionUser, requireAdmin } from './session.js'
import { listWorkbookAuditEvents, recordWorkbookAuditEvent, type UserRole } from './workbook.js'

const ERP_MODULES = new Set([
  'Dashboard', 'Sales Dashboard', 'Sales Daily Report', 'Leads', 'Factory', 'Production',
  'Production Targets', 'Stitching', 'Raw Material', 'Finished Goods', 'Product Catalog',
  'Orders', 'Inventory', 'Stock Movement', 'Shipping & Delivery', 'Returns & RTO',
  'E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels',
  'Daily Work Report', 'Machines', 'Quality Control', 'Graphic Design', 'Employees', 'Suppliers', 'Accounts',
  'Reports', 'Excel Management', 'User Management', 'Settings', 'Audit Logs', 'Camera Monitoring', 'Chat',
])

const ADMIN_ONLY_MODULES = new Set([
  'Camera Monitoring', 'Employees', 'Suppliers', 'Accounts', 'Reports',
  'User Management', 'Settings', 'Audit Logs',
])

const ROLE_MODULES: Record<UserRole, Set<string>> = {
  'Super Admin': new Set([...ERP_MODULES].filter(module => module !== 'Daily Work Report')),
  'Production Supervisor': new Set([...ERP_MODULES].filter(module => module !== 'Daily Work Report' && !ADMIN_ONLY_MODULES.has(module))),
  'Machine Operator': new Set(['Dashboard', 'Production', 'Production Targets', 'Chat']),
  'Store Manager': new Set(['Dashboard', 'Chat']),
  'E-commerce Executive': new Set(['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Daily Work Report', 'Chat']),
  'E-commerce Manager': new Set(['E-commerce Workspace', 'Chat']),
  'Sales Executive': new Set(['Sales Dashboard', 'Sales Daily Report', 'Leads', 'Orders', 'Chat']),
  'Graphic Designer': new Set(['Dashboard', 'Graphic Design', 'Chat']),
}

export default async function auditHandler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const user = await getSessionUser(request)
    if (request.method === 'GET') {
      requireAdmin(user)
      sendJson(response, 200, await listWorkbookAuditEvents())
      return
    }

    const body = await readJsonBody(request)
    const module = typeof body.module === 'string' ? body.module : ''
    const eventType = body.eventType
    if (eventType === 'module_view') {
      if (!ERP_MODULES.has(module)) throw new ApiError(400, 'A valid ERP module activity event is required.')
      if (!ROLE_MODULES[user.role].has(module)) throw new ApiError(403, 'This account cannot open that ERP module.')
    } else if (eventType !== 'screen_recording_started' && eventType !== 'screen_recording_stopped') {
      throw new ApiError(400, 'A valid ERP activity event is required.')
    }
    await recordWorkbookAuditEvent({
      userId: user.id,
      userName: user.name,
      role: user.role,
      eventType,
      ...(eventType === 'module_view' ? { module } : {}),
    })
    sendJson(response, 200, { ok: true })
  } catch (error) {
    handleApiError(response, error, 'ERP audit log')
  }
}
