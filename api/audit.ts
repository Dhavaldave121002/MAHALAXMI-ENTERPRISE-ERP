import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import { listWorkbookAuditEvents, recordWorkbookAuditEvent, type UserRole } from './_lib/workbook.js'

const ERP_MODULES = new Set([
  'Dashboard', 'Sales Dashboard', 'Sales Daily Report', 'Leads', 'Factory', 'Production',
  'Production Targets', 'Stitching', 'Raw Material', 'Finished Goods', 'Product Catalog',
  'Orders', 'Inventory', 'Stock Movement', 'Shipping & Delivery', 'Returns & RTO',
  'E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels',
  'Daily Work Report', 'Machines', 'Quality Control', 'Employees', 'Suppliers', 'Accounts',
  'Reports', 'Excel Management', 'User Management', 'Settings', 'Audit Logs', 'Camera Monitoring',
])

const ADMIN_ONLY_MODULES = new Set([
  'Camera Monitoring', 'Employees', 'Suppliers', 'Accounts', 'Reports',
  'User Management', 'Settings', 'Audit Logs',
])

const ROLE_MODULES: Record<UserRole, Set<string>> = {
  'Super Admin': new Set([...ERP_MODULES].filter(module => module !== 'Daily Work Report')),
  'Production Supervisor': new Set([...ERP_MODULES].filter(module => module !== 'Daily Work Report' && !ADMIN_ONLY_MODULES.has(module))),
  'Machine Operator': new Set(['Dashboard', 'Production', 'Production Targets']),
  'Store Manager': new Set(['Dashboard']),
  'E-commerce Executive': new Set(['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Daily Work Report']),
  'Sales Executive': new Set(['Sales Dashboard', 'Sales Daily Report', 'Leads', 'Orders']),
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
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
    if (body.eventType !== 'module_view' || !ERP_MODULES.has(module)) {
      throw new ApiError(400, 'A valid ERP module activity event is required.')
    }
    if (!ROLE_MODULES[user.role].has(module)) {
      throw new ApiError(403, 'This account cannot open that ERP module.')
    }
    await recordWorkbookAuditEvent({
      userId: user.id,
      userName: user.name,
      role: user.role,
      eventType: 'module_view',
      module,
    })
    sendJson(response, 200, { ok: true })
  } catch (error) {
    handleApiError(response, error, 'ERP audit log')
  }
}
