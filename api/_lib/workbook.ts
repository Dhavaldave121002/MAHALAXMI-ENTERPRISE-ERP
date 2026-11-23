import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { ApiError } from './http.js'

const pbkdf2 = promisify(pbkdf2Callback)
const USER_ROLES = ['Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Executive'] as const
export const ECOMMERCE_PLATFORMS = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA'] as const
const USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At', 'Assigned Platforms']

export type UserRole = typeof USER_ROLES[number]
export type EcommercePlatform = typeof ECOMMERCE_PLATFORMS[number]
export type WorkbookUser = {
  id: string
  name: string
  username: string
  role: UserRole
  active: boolean
  salt: string
  passwordHash: string
  createdAt: string
  platforms: EcommercePlatform[]
}
export type PublicUser = Pick<WorkbookUser, 'id' | 'name' | 'username' | 'role' | 'active' | 'platforms'>
export type WorkbookCapabilities = { sessionBoundWrites?: boolean }
export type WorkbookData = {
  name: string
  sheetCount: number
  sheetNames: string[]
  sheets: Record<string, Record<string, unknown>[]>
  capabilities?: WorkbookCapabilities
}

function getAppsScriptConfiguration() {
  const { GOOGLE_APPS_SCRIPT_URL, GOOGLE_APPS_SCRIPT_SECRET } = process.env
  if (!GOOGLE_APPS_SCRIPT_URL || !GOOGLE_APPS_SCRIPT_SECRET) {
    throw new ApiError(503, 'Google Sheets Apps Script is not configured. Add the required Vercel environment variables.')
  }
  let url: URL
  try {
    url = new URL(GOOGLE_APPS_SCRIPT_URL)
  } catch {
    throw new ApiError(503, 'GOOGLE_APPS_SCRIPT_URL must be a valid Apps Script web app URL.')
  }
  const isScriptPath = url.pathname.startsWith('/macros/s/') || url.pathname.startsWith('/a/macros/')
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !isScriptPath) {
    throw new ApiError(503, 'GOOGLE_APPS_SCRIPT_URL must be the deployed Google Apps Script web app URL.')
  }
  if (GOOGLE_APPS_SCRIPT_SECRET.length < 32) {
    throw new ApiError(503, 'GOOGLE_APPS_SCRIPT_SECRET must contain at least 32 characters.')
  }
  return { url: GOOGLE_APPS_SCRIPT_URL, secret: GOOGLE_APPS_SCRIPT_SECRET }
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) throw new ApiError(503, 'SESSION_SECRET must contain at least 32 characters.')
  return secret
}

async function callAppsScript<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const config = getAppsScriptConfiguration()
  let response: Response
  try {
    response = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: config.secret, action, payload }),
      cache: 'no-store',
      redirect: 'follow',
    })
  } catch {
    throw new ApiError(503, 'Could not reach the Google Apps Script web app. Check its deployment URL and access settings.')
  }
  if (!response.ok) throw new ApiError(503, 'Google Apps Script returned an HTTP error. Check its deployment.')

  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new ApiError(503, 'Google Apps Script did not return JSON. Check that the deployed web app is accessible.')
  }
  if (!result || typeof result !== 'object' || !('ok' in result)) {
    throw new ApiError(503, 'Google Apps Script returned an invalid response.')
  }
  if (result.ok !== true) {
    const status = 'status' in result && typeof result.status === 'number' ? result.status : 503
    const message = 'error' in result && typeof result.error === 'string' ? result.error : 'Google Apps Script request failed.'
    throw new ApiError(status >= 400 && status < 500 ? status : 503, message)
  }
  if (!('data' in result)) throw new ApiError(503, 'Google Apps Script response is missing its data.')
  return result.data as T
}

export async function getWorkbookData(): Promise<WorkbookData> {
  const data = await callAppsScript<WorkbookData>('getWorkbookData')
  if (!data || !Array.isArray(data.sheetNames) || !data.sheets || typeof data.sheets !== 'object') {
    throw new ApiError(503, 'Google Apps Script returned an invalid workbook structure.')
  }
  return data
}

export function readSheetRecords(data: WorkbookData, sheetName: string) {
  const actualName = data.sheetNames.find(name => name.toLowerCase() === sheetName.toLowerCase())
  if (!actualName) throw new ApiError(422, `The master Google Sheet is missing the ${sheetName} sheet.`)
  const rows = data.sheets[actualName]
  if (!Array.isArray(rows)) throw new ApiError(503, `Apps Script did not return rows for the ${sheetName} sheet.`)
  return rows
}

export function readUsers(rows: Record<string, unknown>[]): WorkbookUser[] {
  return rows.flatMap(row => {
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
      active: row.Active === true || ['true', '1', 'yes'].includes(String(row.Active || '').toLowerCase()),
      salt,
      passwordHash,
      createdAt: String(row['Created At'] || ''),
      platforms: parsePlatforms(row['Assigned Platforms']),
    }]
  })
}

function parsePlatforms(value: unknown): EcommercePlatform[] {
  const platforms = String(value || '').split(',').map(platform => platform.trim().toUpperCase())
  return ECOMMERCE_PLATFORMS.filter(platform => platforms.includes(platform))
}

export async function listUsers() {
  const result = await callAppsScript<{ users: Record<string, unknown>[] }>('getUsers')
  if (!result || !Array.isArray(result.users)) throw new ApiError(503, 'Apps Script returned an invalid user list.')
  return readUsers(result.users)
}

function toSheetUser(user: WorkbookUser) {
  return {
    'User ID': user.id,
    Name: user.name,
    Username: user.username,
    Role: user.role,
    Active: user.active ? 'TRUE' : 'FALSE',
    'Password Salt': user.salt,
    'Password Hash': user.passwordHash,
    'Created At': user.createdAt,
    'Assigned Platforms': user.platforms.join(','),
  }
}

export async function createInitialAdmin(user: WorkbookUser) {
  await callAppsScript('createInitialAdmin', { user: toSheetUser(user) })
}

export async function appendUser(user: WorkbookUser) {
  await callAppsScript('appendUser', { user: toSheetUser(user) })
}

export async function setUserActive(userId: string, active: boolean) {
  await callAppsScript('setUserActive', { id: userId, active })
}

export async function appendWorkbookRecord(
  sheet: string,
  record: Record<string, unknown>,
  requiredHeaders: string[],
  ensureColumns: string[] = [],
) {
  await callAppsScript('appendRecord', { sheet, record, requiredHeaders, ensureColumns })
}

export async function addWorkbookMarketplaceListing(input: Record<string, unknown>) {
  return callAppsScript<{ appended: boolean; listing: Record<string, unknown> }>('addMarketplaceListing', input)
}

type SessionBoundInput = Pick<PublicUser, 'id' | 'role'>

function sessionBoundPayload(user: SessionBoundInput) {
  return { sessionUserId: user.id, sessionRole: user.role }
}

export async function updateWorkbookMarketplaceSku(input: SessionBoundInput & {
  platform: EcommercePlatform
  listingId: string
  platformSku: string
}) {
  return callAppsScript<{ listing: Record<string, unknown> }>('updateMarketplaceSku', { ...input, ...sessionBoundPayload(input) })
}

export async function uploadWorkbookEcommerceLabel(input: SessionBoundInput & {
  platform: EcommercePlatform
  orderNumber: string
  fileName: string
  base64: string
}) {
  return callAppsScript<{
    id: string
    fileName: string
    orderNumber: string
    platform: EcommercePlatform
    uploadedBy: string
    uploadedAt: string
  }>('uploadEcommerceLabel', { ...input, ...sessionBoundPayload(input) })
}

export async function listWorkbookEcommerceLabels(user: SessionBoundInput, platform?: EcommercePlatform) {
  return callAppsScript<{
    labels: {
      id: string
      fileName: string
      orderNumber: string
      platform: EcommercePlatform
      uploadedBy: string
      uploadedAt: string
    }[]
  }>('listEcommerceLabels', { ...sessionBoundPayload(user), platform })
}

export async function listWorkbookEcommerceTargets(user: SessionBoundInput) {
  return callAppsScript<{ targets: Partial<Record<EcommercePlatform, number>> }>(
    'getEcommerceTargets',
    sessionBoundPayload(user),
  )
}

export async function setWorkbookEcommerceTarget(input: SessionBoundInput & {
  platform: EcommercePlatform
  target: number
}) {
  return callAppsScript<{ platform: EcommercePlatform; target: number }>(
    'setEcommerceTarget',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function downloadWorkbookEcommerceLabel(user: SessionBoundInput, fileId: string) {
  return callAppsScript<{ fileName: string; base64: string }>('downloadEcommerceLabel', {
    ...sessionBoundPayload(user),
    fileId,
  })
}

export async function submitWorkbookEcommerceReport(input: SessionBoundInput & {
  platform: EcommercePlatform
  completed: string
  pending: string
  issues: string
}) {
  return callAppsScript<{ report: Record<string, unknown> }>('submitEcommerceReport', { ...input, ...sessionBoundPayload(input) })
}

export async function listWorkbookEcommerceReports(user: SessionBoundInput) {
  return callAppsScript<{ reports: Record<string, unknown>[] }>('listEcommerceReports', sessionBoundPayload(user))
}

export async function importWorkbookMarketplaceCatalog(input: {
  products: Record<string, unknown>[]
  variants: Record<string, unknown>[]
  listings: Record<string, unknown>[]
  createdBy: string
  sessionUserId: string
  sessionRole: string
}) {
  return callAppsScript<{
    added: { products: number; variants: number; listings: number }
    skipped: { products: number; variants: number; listings: number }
    backupName: string
  }>('importMarketplaceWorkbook', input)
}

export async function addWorkbookRawMaterial(input: Record<string, unknown>) {
  return callAppsScript<{ material: Record<string, unknown>; movement: Record<string, unknown> | null }>('addRawMaterial', input)
}

export async function applyWorkbookStockMovement(input: Record<string, unknown>) {
  return callAppsScript<{ item: Record<string, unknown>; movement: Record<string, unknown> }>('applyStockMovement', input)
}

export async function initializeWorkbookZeroFinishedStock(user: PublicUser) {
  return callAppsScript<{ updated: number; unchanged: number; archived: number; targetStock: number }>(
    'initializeZeroFinishedStock',
    { createdBy: user.name, sessionUserId: user.id, sessionRole: user.role },
  )
}

export async function archiveWorkbookStockItem(input: Record<string, unknown>) {
  return callAppsScript<{ item: Record<string, unknown> }>('archiveStockItem', input)
}

export async function deleteUnusedWorkbookStockItem(input: Record<string, unknown>) {
  return callAppsScript<{ deleted: boolean; sku: string }>('deleteUnusedStockItem', input)
}

export async function recordWorkbookProduction(record: Record<string, unknown>) {
  return callAppsScript<{ finishedGood: Record<string, unknown>; movement: Record<string, unknown> | null }>('recordProduction', { record })
}

export function publicUser(user: WorkbookUser): PublicUser {
  return { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active, platforms: user.platforms }
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

export function newUser(input: { id: string; name: string; username: string; role: UserRole; passwordHash: string; salt: string; platforms?: EcommercePlatform[] }): WorkbookUser {
  const platforms = ECOMMERCE_PLATFORMS.filter(platform => input.platforms?.includes(platform))
  if (input.role === 'E-commerce Executive' && platforms.length === 0) {
    throw new ApiError(400, 'Assign at least one marketplace platform to an E-commerce Executive.')
  }
  return { ...input, platforms, active: true, createdAt: new Date().toISOString() }
}

export function userColumns() {
  return [...USER_COLUMNS]
}
