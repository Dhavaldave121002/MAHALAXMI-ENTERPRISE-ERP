import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { ApiError } from './http.js'

const pbkdf2 = promisify(pbkdf2Callback)
const USER_ROLES = ['Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer'] as const
export const ECOMMERCE_PLATFORMS = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA'] as const
const USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At', 'Assigned Platforms', 'Manager ID']

export type UserRole = typeof USER_ROLES[number]
export type EcommercePlatform = typeof ECOMMERCE_PLATFORMS[number]
export type EcommerceExecutiveTarget = {
  executiveId: string
  executiveName: string
  platforms: EcommercePlatform[]
  dailyTarget: number
  monthlyTarget: number
}
export type EcommerceManagerTarget = {
  managerId: string
  managerName: string
  platforms: EcommercePlatform[]
  dailyTarget: number
  monthlyTarget: number
}
export type EcommerceTargetSettings = {
  dailyTarget?: number
  monthlyTarget?: number
  executives?: EcommerceExecutiveTarget[]
  managers?: EcommerceManagerTarget[]
}
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
  managerId: string
}
export type PublicUser = Pick<WorkbookUser, 'id' | 'name' | 'username' | 'role' | 'active' | 'platforms' | 'managerId'>
export type WorkbookCapabilities = { sessionBoundWrites?: boolean }
export type WorkbookData = {
  name: string
  sheetCount: number
  sheetNames: string[]
  sheets: Record<string, Record<string, unknown>[]>
  capabilities?: WorkbookCapabilities
}

const WORKBOOK_DATA_CACHE_MS = 2_000
const READ_ONLY_APPS_SCRIPT_ACTIONS = new Set([
  'getWorkbookData',
  'getUsers',
  'listAuditEvents',
  'recordAuditEvent',
  'listChatData',
  'listChatMessages',
  'listChatTyping',
  'setChatTyping',
  'sendChatMessage',
  'readChatAttachment',
  'listEcommerceLabels',
  'downloadEcommerceLabel',
  'startCameraClipUpload',
  'uploadCameraClipChunk',
  'listCameraClips',
  'readCameraClipRange',
  'cleanupExpiredCameraClips',
  'listEcommerceReports',
  'listEcommerceTasks',
  'submitGraphicDesignReport',
  'listGraphicDesignReports',
  'listSalesReports',
  'getEcommerceTargets',
])
let workbookDataCache: { data: WorkbookData; expiresAt: number } | null = null
let workbookDataRequest: Promise<WorkbookData> | null = null
let workbookDataGeneration = 0

function invalidateWorkbookDataCache() {
  workbookDataGeneration += 1
  workbookDataCache = null
  workbookDataRequest = null
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

export function validateWorkbookConfiguration() {
  getAppsScriptConfiguration()
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
  if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string') {
    if (result.error === 'Unknown ERP action.' || result.error === 'Unknown audit event.') {
      throw new ApiError(503, 'The connected Google Apps Script deployment is outdated. Deploy the latest Code.gs as a new web-app version.')
    }
  }
  if (!result || typeof result !== 'object' || Array.isArray(result) || !('ok' in result)) {
    const responseKeys = result && typeof result === 'object' && !Array.isArray(result)
      ? Object.keys(result).slice(0, 8)
      : []
    console.error('Google Apps Script returned an unexpected response envelope.', {
      status: response.status,
      contentType: response.headers.get('content-type') || 'unknown',
      responseKeys,
    })
    throw new ApiError(
      503,
      'Connected Apps Script returned an incompatible response. Verify Vercel GOOGLE_APPS_SCRIPT_URL points to the current /exec deployment and deploy the latest Code.gs.',
    )
  }
  if (result.ok !== true) {
    const status = 'status' in result && typeof result.status === 'number' ? result.status : 503
    const message = 'error' in result && typeof result.error === 'string' ? result.error : 'Google Apps Script request failed.'
    if (message === 'Unknown ERP action.' || message === 'Unknown audit event.') {
      throw new ApiError(503, 'The connected Google Apps Script deployment is outdated. Deploy the latest Code.gs as a new web-app version.')
    }
    throw new ApiError(status >= 400 && status < 500 ? status : 503, message)
  }
  if (!('data' in result)) throw new ApiError(503, 'Google Apps Script response is missing its data.')
  if (!READ_ONLY_APPS_SCRIPT_ACTIONS.has(action)) invalidateWorkbookDataCache()
  return result.data as T
}

export async function getWorkbookData(): Promise<WorkbookData> {
  if (workbookDataCache && workbookDataCache.expiresAt > Date.now()) return workbookDataCache.data
  if (workbookDataRequest) return workbookDataRequest

  const generation = workbookDataGeneration
  const request = callAppsScript<WorkbookData>('getWorkbookData').then(data => {
    if (!data || !Array.isArray(data.sheetNames) || !data.sheets || typeof data.sheets !== 'object') {
      throw new ApiError(503, 'Google Apps Script returned an invalid workbook structure.')
    }
    if (generation === workbookDataGeneration) {
      workbookDataCache = { data, expiresAt: Date.now() + WORKBOOK_DATA_CACHE_MS }
    }
    return data
  })
  workbookDataRequest = request
  try {
    return await request
  } finally {
    if (workbookDataRequest === request) workbookDataRequest = null
  }
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
      managerId: String(row['Manager ID'] || '').trim(),
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
    'Manager ID': user.managerId,
  }
}

export async function createInitialAdmin(user: WorkbookUser) {
  await callAppsScript('createInitialAdmin', { user: toSheetUser(user) })
}

export async function appendUser(user: WorkbookUser, actor: Pick<PublicUser, 'id' | 'role'>) {
  await callAppsScript('appendUser', { user: toSheetUser(user), ...sessionBoundPayload(actor) })
}

export async function setUserActive(userId: string, active: boolean, actor: Pick<PublicUser, 'id' | 'role'>) {
  await callAppsScript('setUserActive', { id: userId, active, ...sessionBoundPayload(actor) })
}

export async function setUserManager(executiveId: string, managerId: string, actor: Pick<PublicUser, 'id' | 'role'>) {
  await callAppsScript('setUserManager', { executiveId, managerId, ...sessionBoundPayload(actor) })
}

export async function appendWorkbookRecord(
  sheet: string,
  record: Record<string, unknown>,
  requiredHeaders: string[],
  actor: Pick<PublicUser, 'id' | 'role'>,
  ensureColumns: string[] = [],
) {
  await callAppsScript('appendRecord', { sheet, record, requiredHeaders, ensureColumns, ...sessionBoundPayload(actor) })
}

export async function addWorkbookMarketplaceListing(input: Record<string, unknown>, actor: Pick<PublicUser, 'id' | 'role'>) {
  return callAppsScript<{ appended: boolean; listing: Record<string, unknown> }>('addMarketplaceListing', { ...input, ...sessionBoundPayload(actor) })
}

type SessionBoundInput = Pick<PublicUser, 'id' | 'role'>

function sessionBoundPayload(user: SessionBoundInput) {
  return { sessionUserId: user.id, sessionRole: user.role }
}

export async function resetWorkbookData(input: SessionBoundInput & { confirmation: string }) {
  return callAppsScript<{
    backupFolderName: string
    backupFiles: string[]
    clearedSheets: string[]
    clearedRecords: number
    archivedFolders: string[]
  }>('resetErpData', { ...input, ...sessionBoundPayload(input) })
}

export async function updateWorkbookMarketplaceListing(input: SessionBoundInput & {
  platform: EcommercePlatform
  listingId: string
  platformSku: string
  mrp?: number
  sellingPrice?: number
}) {
  return callAppsScript<{ listing: Record<string, unknown> }>('updateMarketplaceListing', { ...input, ...sessionBoundPayload(input) })
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

export async function startCameraClipUpload(input: SessionBoundInput & {
  kind: 'camera' | 'screen'
  fileName: string
  startedAt: number
  totalBytes: number
}) {
  return callAppsScript<{ uploadUrl: string; chunkSize: number }>('startCameraClipUpload', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function uploadCameraClipChunk(input: SessionBoundInput & {
  uploadUrl: string
  startByte: number
  endByte: number
  totalBytes: number
  base64: string
}) {
  return callAppsScript<{ complete: boolean; nextOffset?: number; fileId?: string }>('uploadCameraClipChunk', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function listCameraClips(user: SessionBoundInput) {
  return callAppsScript<{
    clips: {
      id: string
      userId: string
      userName: string
      kind: 'camera' | 'screen'
      startedAt: string
      uploadedAt: string
      size: number
      mimeType: string
    }[]
  }>('listCameraClips', sessionBoundPayload(user))
}

export async function readCameraClipRange(input: SessionBoundInput & {
  fileId: string
  startByte: number
  endByte: number
}) {
  return callAppsScript<{
    base64: string
    startByte: number
    endByte: number
    totalBytes: number
    mimeType: string
  }>('readCameraClipRange', { ...input, ...sessionBoundPayload(input) })
}

export async function cleanupCameraClips() {
  return callAppsScript<number>('cleanupExpiredCameraClips')
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
  return callAppsScript<{ targets: EcommerceTargetSettings }>(
    'getEcommerceTargets',
    sessionBoundPayload(user),
  )
}

export async function setWorkbookEcommerceTarget(input: SessionBoundInput & {
  targetType: 'manager' | 'executive'
  targetId: string
  dailyTarget: number
  monthlyTarget: number
}) {
  return callAppsScript<{ targetType: 'manager' | 'executive'; targetId: string; dailyTarget: number; monthlyTarget: number }>(
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
  platform: EcommercePlatform | 'TEAM'
  completed: string
  pending: string
  issues: string
}) {
  return callAppsScript<{ report: Record<string, unknown> }>('submitEcommerceReport', { ...input, ...sessionBoundPayload(input) })
}

export async function listWorkbookEcommerceReports(user: SessionBoundInput) {
  return callAppsScript<{ reports: Record<string, unknown>[] }>('listEcommerceReports', sessionBoundPayload(user))
}

export async function listWorkbookEcommerceTasks(user: SessionBoundInput) {
  return callAppsScript<{ tasks: Record<string, unknown>[] }>('listEcommerceTasks', sessionBoundPayload(user))
}

export async function createWorkbookEcommerceTask(input: SessionBoundInput & {
  executiveId: string
  taskDate: string
  title: string
  description: string
}) {
  return callAppsScript<{ task: Record<string, unknown> }>('createEcommerceTask', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function updateWorkbookEcommerceTask(input: SessionBoundInput & {
  taskId: string
  status: 'In Progress' | 'Submitted'
}) {
  return callAppsScript<{ task: Record<string, unknown> }>('updateEcommerceTask', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function reviewWorkbookEcommerceTask(input: SessionBoundInput & {
  taskId: string
  decision: 'Approved' | 'Needs Changes'
  reviewNote: string
}) {
  return callAppsScript<{ task: Record<string, unknown> }>('reviewEcommerceTask', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function submitWorkbookGraphicDesignReport(input: SessionBoundInput & {
  completed: string
  pending: string
  issues: string
}) {
  return callAppsScript<{ report: Record<string, unknown> }>('submitGraphicDesignReport', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function listWorkbookGraphicDesignReports(user: SessionBoundInput) {
  return callAppsScript<{ reports: Record<string, unknown>[] }>(
    'listGraphicDesignReports',
    sessionBoundPayload(user),
  )
}

export async function submitWorkbookSalesReport(input: SessionBoundInput & {
  completed: string
  pending: string
  issues: string
}) {
  return callAppsScript<{ report: Record<string, unknown> }>('submitSalesReport', {
    ...input,
    ...sessionBoundPayload(input),
  })
}

export async function listWorkbookSalesReports(user: SessionBoundInput) {
  return callAppsScript<{ reports: Record<string, unknown>[] }>('listSalesReports', sessionBoundPayload(user))
}

export async function importWorkbookMarketplaceCatalog(input: {
  products: Record<string, unknown>[]
  variants: Record<string, unknown>[]
  listings: Record<string, unknown>[]
  finishedGoods: Record<string, unknown>[]
  createdBy: string
  sessionUserId: string
  sessionRole: string
}) {
  return callAppsScript<{
    added: { products: number; variants: number; listings: number }
    updated?: { products: number; variants: number; listings: number }
    skipped: { products: number; variants: number; listings: number }
    openingStock?: { added: number; skipped: number }
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

export async function recordWorkbookProduction(record: Record<string, unknown>, actor: Pick<PublicUser, 'id' | 'role'>) {
  return callAppsScript<{ finishedGood: Record<string, unknown>; movement: Record<string, unknown> | null }>(
    'recordProduction',
    { record, ...sessionBoundPayload(actor) },
  )
}

export async function reviewWorkbookProductionQuality(input: SessionBoundInput & {
  productionId: string
  approved: number
  rejected: number
  createdBy: string
}) {
  return callAppsScript<{
    record: Record<string, unknown>
    finishedGood: Record<string, unknown>
    movement: Record<string, unknown> | null
    backupName: string
  }>('reviewProductionQuality', { ...input, ...sessionBoundPayload(input) })
}

export async function submitWorkbookGraphicDesignTask(input: SessionBoundInput & Record<string, unknown>) {
  return callAppsScript<{ task: Record<string, unknown>; backupName: string }>(
    'submitGraphicDesignTask',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function updateWorkbookGraphicDesignProgress(input: SessionBoundInput & {
  taskId: string
  shootStatus: string
  editStatus: string
}) {
  return callAppsScript<{ task: Record<string, unknown>; backupName: string }>(
    'updateGraphicDesignProgress',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function reviewWorkbookGraphicDesignTask(input: SessionBoundInput & {
  taskId: string
  decision: 'Approved' | 'Rejected'
  reviewNote: string
  createdBy: string
}) {
  return callAppsScript<{ task: Record<string, unknown>; backupName: string }>(
    'reviewGraphicDesignTask',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export type AuditEvent = {
  id: string
  timestamp: string
  userId: string
  userName: string
  role: UserRole
  action: string
  target: string
  outcome: string
}

export async function recordWorkbookAuditEvent(input: {
  userId: string
  userName: string
  role: UserRole
  eventType: 'login' | 'logout' | 'module_view' | 'screen_recording_started' | 'screen_recording_stopped'
  module?: string
}) {
  return callAppsScript<{ recorded: boolean }>('recordAuditEvent', input)
}

export async function listWorkbookAuditEvents() {
  return callAppsScript<{ events: AuditEvent[]; retentionDays: number }>('listAuditEvents')
}

export type ChatContact = { id: string; name: string; role: UserRole }
export type ChatThread = {
  conversationId: string
  participant1Id: string
  participant1Name: string
  participant2Id: string
  participant2Name: string
  lastMessage: string
  sentAt: string
  lastSenderId: string
}
export type ChatMessage = {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: UserRole
  sentAt: string
  text: string
  attachment: { name: string; mimeType: string; size: number } | null
}
export type ChatAttachment = { name: string; mimeType: string; size: number; base64: string }
export type ChatTypingUser = { userId: string; name: string }

export async function listWorkbookChatData(user: SessionBoundInput) {
  return callAppsScript<{ contacts: ChatContact[]; threads: ChatThread[]; retentionHours: number }>(
    'listChatData',
    sessionBoundPayload(user),
  )
}

export async function listWorkbookChatMessages(user: SessionBoundInput, conversationId: string) {
  return callAppsScript<{ messages: ChatMessage[]; hasOlder: boolean }>(
    'listChatMessages',
    { ...sessionBoundPayload(user), conversationId },
  )
}

export async function listWorkbookChatTyping(user: SessionBoundInput, conversationId: string) {
  return callAppsScript<{ typingUsers: ChatTypingUser[] }>(
    'listChatTyping',
    { ...sessionBoundPayload(user), conversationId },
  )
}

export async function setWorkbookChatTyping(user: SessionBoundInput, conversationId: string, typing: boolean) {
  return callAppsScript<{ typing: boolean }>(
    'setChatTyping',
    { ...sessionBoundPayload(user), conversationId, typing },
  )
}

export async function sendWorkbookChatMessage(input: SessionBoundInput & {
  recipientId: string
  text: string
  attachment?: { name: string; mimeType: string; base64: string }
}) {
  return callAppsScript<{ message: ChatMessage }>(
    'sendChatMessage',
    { ...sessionBoundPayload(input), recipientId: input.recipientId, text: input.text, attachment: input.attachment },
  )
}

export async function readWorkbookChatAttachment(user: SessionBoundInput, messageId: string) {
  return callAppsScript<ChatAttachment>(
    'readChatAttachment',
    { ...sessionBoundPayload(user), messageId },
  )
}

export async function setWorkbookProductionTarget(input: SessionBoundInput & {
  period: 'daily' | 'weekly' | 'monthly'
  date: string
  machineId: string
  sku: string
  productName: string
  targetQuantity: number
  createdBy: string
}) {
  return callAppsScript<{
    target: Record<string, unknown>
    unchanged: boolean
    backupName: string
  }>('setProductionTarget', { ...input, ...sessionBoundPayload(input) })
}

export async function importWorkbookSalesLeads(input: SessionBoundInput & {
  rows: Record<string, unknown>[]
  assignedUserId: string
}) {
  return callAppsScript<{ added: number; skipped: number; backupName: string }>(
    'importSalesLeads',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function addWorkbookSalesLead(input: SessionBoundInput & {
  lead: Record<string, unknown>
}) {
  return callAppsScript<{ lead: Record<string, unknown>; backupName: string }>(
    'addSalesLead',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function assignWorkbookSalesLead(input: SessionBoundInput & {
  leadId: string
  assignedUserId: string
}) {
  return callAppsScript<{ lead: Record<string, unknown> }>(
    'assignSalesLead',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function recordWorkbookSalesActivity(input: SessionBoundInput & {
  leadId: string
  status: string
  activityType: string
  outcome: string
  notes: string
  nextFollowUp: string
}) {
  return callAppsScript<{ lead: Record<string, unknown>; activity: Record<string, unknown> }>(
    'recordSalesActivity',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export async function createWorkbookSalesOrder(input: SessionBoundInput & {
  leadId: string
  customerName: string
  sku: string
  productName: string
  quantity: number
  unitPrice: number
  notes: string
}) {
  return callAppsScript<{
    order: Record<string, unknown>
    item: Record<string, unknown>
    movement: Record<string, unknown>
  }>('createSalesOrder', { ...input, ...sessionBoundPayload(input) })
}

export async function cancelWorkbookSalesOrder(input: SessionBoundInput & { orderId: string }) {
  return callAppsScript<{
    order: Record<string, unknown>
    item: Record<string, unknown>
    movement: Record<string, unknown>
  }>('cancelSalesOrder', { ...input, ...sessionBoundPayload(input) })
}

export async function setWorkbookSalesTarget(input: SessionBoundInput & {
  salesUserId: string
  period: 'monthly' | 'yearly'
  periodKey: string
  targetAmount: number
}) {
  return callAppsScript<{ target: Record<string, unknown>; backupName: string }>(
    'setSalesTarget',
    { ...input, ...sessionBoundPayload(input) },
  )
}

export function publicUser(user: WorkbookUser): PublicUser {
  return { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active, platforms: user.platforms, managerId: user.managerId }
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

export function newUser(input: { id: string; name: string; username: string; role: UserRole; passwordHash: string; salt: string; platforms?: EcommercePlatform[]; managerId?: string }): WorkbookUser {
  const platforms = ECOMMERCE_PLATFORMS.filter(platform => input.platforms?.includes(platform))
  if (input.role === 'E-commerce Executive' && platforms.length === 0) {
    throw new ApiError(400, 'Assign at least one marketplace platform to an E-commerce Executive.')
  }
  if (input.role === 'E-commerce Executive' && !input.managerId) {
    throw new ApiError(400, 'Assign the E-commerce Executive to an active E-commerce Manager.')
  }
  return { ...input, managerId: input.managerId || '', platforms, active: true, createdAt: new Date().toISOString() }
}

export function userColumns() {
  return [...USER_COLUMNS]
}
