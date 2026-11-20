import { randomUUID } from 'node:crypto'
import * as XLSX from 'xlsx'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import { appendUser, isUserRole, loadWorkbook, makePasswordHash, newUser, publicUser, readUsers, saveWorkbook, type UserRole } from './_lib/workbook.js'

function setUserActive(workbook: XLSX.WorkBook, userId: string, active: boolean) {
  const sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'users')
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet || !sheet['!ref']) throw new ApiError(404, 'User account sheet was not found.')
  const range = XLSX.utils.decode_range(sheet['!ref'])
  const headerColumns = new Map<string, number>()
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const header = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })]?.v
    headerColumns.set(String(header || '').trim().toLowerCase(), column)
  }
  const idColumn = headerColumns.get('user id')
  const activeColumn = headerColumns.get('active')
  if (idColumn === undefined || activeColumn === undefined) throw new ApiError(422, 'The Users sheet is missing required columns.')
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const id = String(sheet[XLSX.utils.encode_cell({ r: row, c: idColumn })]?.v || '')
    if (id === userId) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: activeColumn })
      const oldCell = sheet[cellAddress]
      sheet[cellAddress] = { ...oldCell, t: 's', v: active ? 'TRUE' : 'FALSE' }
      return
    }
  }
  throw new ApiError(404, 'User account was not found.')
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST', 'PATCH'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST, PATCH')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const context = await loadWorkbook()
    const currentUser = getSessionUser(request, context)
    requireAdmin(currentUser)
    if (request.method === 'GET') {
      sendJson(response, 200, { users: readUsers(context.workbook).map(publicUser) })
      return
    }

    const body = await readJsonBody(request)
    if (request.method === 'POST') {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      const roleValue = typeof body.role === 'string' ? body.role : ''
      if (name.length < 2 || username.length < 3 || !/^[a-z0-9._-]+$/.test(username) || password.length < 10) {
        throw new ApiError(400, 'Enter a name, valid login ID, and password of at least 10 characters.')
      }
      if (!isUserRole(roleValue) || roleValue === 'Super Admin') {
        throw new ApiError(403, 'Only the initial account can be Super Admin.')
      }
      const existingUsers = readUsers(context.workbook)
      if (existingUsers.some(user => user.username === username)) throw new ApiError(409, 'That login ID is already in use.')
      const credentials = await makePasswordHash(password)
      const user = newUser({
        id: randomUUID(),
        name,
        username,
        role: roleValue as UserRole,
        ...credentials,
      })
      appendUser(context.workbook, user)
      await saveWorkbook(context)
      sendJson(response, 201, { user: publicUser(user) })
      return
    }

    const id = typeof body.id === 'string' ? body.id : ''
    const active = body.active
    if (!id || typeof active !== 'boolean') throw new ApiError(400, 'A user ID and active status are required.')
    if (id === currentUser.id && !active) throw new ApiError(400, 'You cannot deactivate your own account.')
    const users = readUsers(context.workbook)
    const target = users.find(user => user.id === id)
    if (!target) throw new ApiError(404, 'User account was not found.')
    if (!active && target.role === 'Super Admin' && users.filter(user => user.role === 'Super Admin' && user.active).length <= 1) {
      throw new ApiError(400, 'The only Super Admin account cannot be deactivated.')
    }
    setUserActive(context.workbook, id, active)
    await saveWorkbook(context)
    sendJson(response, 200, { ok: true })
  } catch (error) {
    handleApiError(response, error, 'User management')
  }
}
