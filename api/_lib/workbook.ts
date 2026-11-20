import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import * as XLSX from 'xlsx'
import { ApiError } from './http.js'

const pbkdf2 = promisify(pbkdf2Callback)
const USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At']
const USER_ROLES = ['Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager'] as const

export type UserRole = typeof USER_ROLES[number]
export type WorkbookUser = {
  id: string
  name: string
  username: string
  role: UserRole
  active: boolean
  salt: string
  passwordHash: string
  createdAt: string
}
export type PublicUser = Pick<WorkbookUser, 'id' | 'name' | 'username' | 'role' | 'active'>
export type WorkbookContext = {
  workbook: XLSX.WorkBook
  version: string
  etag: string
  name: string
}

function getConfiguration() {
  const { GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, GOOGLE_DRIVE_WORKBOOK_ID, SESSION_SECRET } = process.env
  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN || !GOOGLE_DRIVE_WORKBOOK_ID || !SESSION_SECRET) {
    throw new ApiError(503, 'Google Drive login is not configured. Add the required Vercel environment variables.')
  }
  if (SESSION_SECRET.length < 32) {
    throw new ApiError(503, 'SESSION_SECRET must contain at least 32 characters.')
  }
  return { clientId: GOOGLE_DRIVE_CLIENT_ID, clientSecret: GOOGLE_DRIVE_CLIENT_SECRET, refreshToken: GOOGLE_DRIVE_REFRESH_TOKEN, workbookId: GOOGLE_DRIVE_WORKBOOK_ID, sessionSecret: SESSION_SECRET }
}

async function getAccessToken() {
  const config = getConfiguration()
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!response.ok) throw new ApiError(503, 'Google Drive authorization failed. Check the Vercel Drive credentials.')
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('access_token' in result) || typeof result.access_token !== 'string') {
    throw new ApiError(503, 'Google Drive did not return an access token.')
  }
  return { accessToken: result.access_token, config }
}

async function getFileMetadata(accessToken: string, workbookId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(workbookId)}?fields=id,name,version,mimeType`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 404) throw new ApiError(404, 'The configured master workbook was not found in Google Drive.')
  if (!response.ok) throw new ApiError(503, 'Could not read the master workbook metadata from Google Drive.')
  const result: unknown = await response.json()
  if (!result || typeof result !== 'object' || !('version' in result) || !('name' in result)) {
    throw new ApiError(503, 'Google Drive returned invalid workbook metadata.')
  }
  return {
    version: String(result.version),
    name: String(result.name),
    etag: response.headers.get('etag') || '',
  }
}

export async function loadWorkbook(): Promise<WorkbookContext> {
  const { accessToken, config } = await getAccessToken()
  const metadata = await getFileMetadata(accessToken, config.workbookId)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(config.workbookId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new ApiError(503, 'Could not download the master workbook from Google Drive.')
  const bytes = Buffer.from(await response.arrayBuffer())
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'buffer', cellStyles: true, cellFormula: true })
  } catch {
    throw new ApiError(422, 'The configured Drive file is not a readable Excel workbook.')
  }
  return { workbook, ...metadata }
}

export async function saveWorkbook(context: WorkbookContext) {
  const { accessToken, config } = await getAccessToken()
  const current = await getFileMetadata(accessToken, config.workbookId)
  if (current.version !== context.version) {
    throw new ApiError(409, 'The master workbook changed during this request. Reload it and retry.')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(config.workbookId)}/copy?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${context.name.replace(/\.xlsx$/i, '')}-Backup-${timestamp}.xlsx` }),
  })
  if (!backupResponse.ok) throw new ApiError(503, 'Could not create a Drive backup; workbook was not changed.')

  const finalCheck = await getFileMetadata(accessToken, config.workbookId)
  if (finalCheck.version !== context.version) {
    throw new ApiError(409, 'The master workbook changed while preparing a backup. No changes were saved.')
  }

  const content = XLSX.write(context.workbook, { bookType: 'xlsx', type: 'buffer', compression: true })
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  if (current.etag) headers['If-Match'] = current.etag
  const uploadResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(config.workbookId)}?uploadType=media`, {
    method: 'PATCH',
    headers,
    body: content,
  })
  if (uploadResponse.status === 412) throw new ApiError(409, 'The master workbook changed before save. Reload it and retry.')
  if (!uploadResponse.ok) throw new ApiError(503, 'Google Drive rejected the workbook update. The backup remains available.')
}

function getUsersSheet(workbook: XLSX.WorkBook) {
  const name = workbook.SheetNames.find(sheetName => sheetName.toLowerCase() === 'users')
  if (!name) return undefined
  return workbook.Sheets[name]
}

export function readUsers(workbook: XLSX.WorkBook): WorkbookUser[] {
  const sheet = getUsersSheet(workbook)
  if (!sheet) return []
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return records.flatMap(row => {
    const role = String(row.Role || '')
    const salt = String(row['Password Salt'] || '')
    const passwordHash = String(row['Password Hash'] || '')
    const id = String(row['User ID'] || '')
    const username = String(row.Username || '').trim().toLowerCase()
    if (!id || !username || !salt || !passwordHash || !USER_ROLES.includes(role as UserRole)) return []
    return [{
      id,
      name: String(row.Name || ''),
      username,
      role: role as UserRole,
      active: String(row.Active).toLowerCase() === 'true',
      salt,
      passwordHash,
      createdAt: String(row['Created At'] || ''),
    }]
  })
}

export function publicUser(user: WorkbookUser): PublicUser {
  return { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active }
}

export function appendUser(workbook: XLSX.WorkBook, user: WorkbookUser) {
  const row = {
    'User ID': user.id,
    Name: user.name,
    Username: user.username,
    Role: user.role,
    Active: user.active ? 'TRUE' : 'FALSE',
    'Password Salt': user.salt,
    'Password Hash': user.passwordHash,
    'Created At': user.createdAt,
  }
  const sheet = getUsersSheet(workbook)
  if (sheet) {
    XLSX.utils.sheet_add_json(sheet, [row], { skipHeader: true, origin: -1 })
    return
  }
  const newSheet = XLSX.utils.json_to_sheet([row], { header: USER_COLUMNS })
  XLSX.utils.book_append_sheet(workbook, newSheet, 'Users')
}

export async function makePasswordHash(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await pbkdf2(password, salt, 310_000, 32, 'sha256')
  return { salt, passwordHash: hash.toString('hex') }
}

export async function verifyPassword(password: string, salt: string, passwordHash: string) {
  const expected = Buffer.from(passwordHash, 'hex')
  const actual = await pbkdf2(password, salt, 310_000, expected.length, 'sha256')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function isUserRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole)
}

export function newUser(input: { id: string; name: string; username: string; role: UserRole; passwordHash: string; salt: string }): WorkbookUser {
  return { ...input, active: true, createdAt: new Date().toISOString() }
}

export function getSessionSecret() {
  return getConfiguration().sessionSecret
}
