import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import {
  ECOMMERCE_PLATFORMS,
  getWorkbookData,
  listUsers,
  listWorkbookEcommerceLabels,
  readSheetRecords,
  updateWorkbookMarketplaceSku,
  uploadWorkbookEcommerceLabel,
  submitWorkbookEcommerceReport,
  type EcommercePlatform,
  type PublicUser,
  type WorkbookData,
} from './_lib/workbook.js'

function text(value: unknown) {
  return String(value ?? '').trim()
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function platformOf(value: unknown): EcommercePlatform | null {
  if (typeof value !== 'string') return null
  const normalized = text(value).toUpperCase()
  const canonical = normalized === 'AMAZON.IN' || normalized === 'AMAZON.COM' ? 'AMAZON' : normalized
  return ECOMMERCE_PLATFORMS.includes(canonical as EcommercePlatform) ? canonical as EcommercePlatform : null
}

function requirePlatform(value: unknown): EcommercePlatform {
  const platform = platformOf(value)
  if (!platform) throw new ApiError(400, 'Choose a valid marketplace platform.')
  return platform
}

function requireWorkspaceRole(user: PublicUser) {
  if (!['E-commerce Executive', 'Production Supervisor', 'Super Admin'].includes(user.role)) {
    throw new ApiError(403, 'This account cannot access the e-commerce workspace.')
  }
}

function requirePlatformAccess(user: PublicUser, platform: EcommercePlatform) {
  requireWorkspaceRole(user)
  if (user.role === 'E-commerce Executive' && !user.platforms.includes(platform)) {
    throw new ApiError(403, 'This marketplace platform is not assigned to your account.')
  }
}

function availableStock(row: Record<string, unknown>) {
  const stored = row['Available Stock']
  if (stored !== undefined && stored !== '') return number(stored)
  const approved = row['Quality Approved'] === undefined || row['Quality Approved'] === ''
    ? Math.max(0, number(row['Production Received']) - number(row.Rejected))
    : number(row['Quality Approved'])
  return number(row['Opening Stock']) + approved + number(row['Returned Stock']) + number(row['Adjustment In'])
    - number(row['Dispatched Stock']) - number(row['Damaged Stock']) - number(row['Reserved Stock']) - number(row['Adjustment Out'])
}

function workspaceData(data: WorkbookData, user: PublicUser) {
  const platforms = user.role === 'E-commerce Executive' ? user.platforms : [...ECOMMERCE_PLATFORMS]
  const finishedRows = readSheetRecords(data, 'Finished_Goods')
  const stockBySku = new Map(finishedRows.map(row => [text(row['Product SKU']).toLowerCase(), {
    availableStock: availableStock(row),
    status: text(row.Status) || 'Active',
  }]))
  const listings = readSheetRecords(data, 'Marketplace_Listings').flatMap(row => {
    const platform = platformOf(row.Platform)
    const id = text(row['Listing ID'])
    const productSku = text(row['Product SKU'])
    if (!platform || !platforms.includes(platform) || !id || !productSku) return []
    const stock = stockBySku.get(productSku.toLowerCase())
    return [{
      id,
      platform,
      platformSku: text(row['Platform SKU']),
      productSku,
      productName: text(row['Product Name']) || productSku,
      availableStock: stock?.availableStock ?? 0,
      stockStatus: stock?.status || 'Not initialized',
      status: text(row.Status) || 'Active',
    }]
  })
  const movements = readSheetRecords(data, 'Stock_Movement').flatMap(row => {
    const platform = platformOf(row['Sales Channel'])
    const type = text(row['Movement Type'])
    const itemType = text(row['Item Type'])
    const referenceId = text(row['Reference ID'])
    if (!platform || !platforms.includes(platform) || itemType !== 'Finished Goods' ||
        !['Dispatch', 'Return', 'Damage'].includes(type) || !referenceId) return []
    return [{
      id: text(row['Movement ID']),
      date: text(row['Date/Time']),
      platform,
      type,
      orderNumber: referenceId,
      sku: text(row.SKU),
      quantity: number(row.Quantity),
      reason: text(row.Reason),
    }]
  }).sort((a, b) => b.date.localeCompare(a.date))
  return { platforms, listings, movements }
}

function requireText(value: unknown, label: string, maximum: number) {
  if (typeof value !== 'string') throw new ApiError(400, `${label} is required and must be ${maximum} characters or fewer.`)
  const result = text(value)
  const hasControlCharacters = result.split('').some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  if (!result || result.length > maximum || hasControlCharacters) {
    throw new ApiError(400, `${label} is required and must be ${maximum} characters or fewer.`)
  }
  return result
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
    requireWorkspaceRole(user)

    if (request.method === 'GET') {
      const [data, labelResult] = await Promise.all([
        getWorkbookData(),
        listWorkbookEcommerceLabels(user),
      ])
      sendJson(response, 200, { ...workspaceData(data, user), labels: labelResult.labels })
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    const platform = requirePlatform(body.platform)
    requirePlatformAccess(user, platform)

    if (action === 'updateSku') {
      if (user.role !== 'E-commerce Executive' && user.role !== 'Super Admin') {
        throw new ApiError(403, 'Only an E-commerce Executive or Super Admin can update a marketplace SKU.')
      }
      const listingId = requireText(body.listingId, 'Marketplace listing', 120)
      const platformSku = requireText(body.platformSku, 'Platform SKU', 120)
      const result = await updateWorkbookMarketplaceSku({ id: user.id, role: user.role, platform, listingId, platformSku })
      sendJson(response, 200, result)
      return
    }

    if (action === 'uploadLabel') {
      if (user.role !== 'E-commerce Executive' && user.role !== 'Super Admin') {
        throw new ApiError(403, 'Only an E-commerce Executive or Super Admin can upload shipping labels.')
      }
      const orderNumber = requireText(body.orderNumber, 'Order number', 120)
      const fileName = requireText(body.fileName, 'PDF file name', 180)
      if (!/\.pdf$/i.test(fileName)) throw new ApiError(400, 'Upload a PDF shipping label.')
      const base64 = typeof body.base64 === 'string' ? body.base64 : ''
      if (!base64 || base64.length > 4200000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
        throw new ApiError(413, 'Shipping-label PDFs must be 3 MB or smaller.')
      }
      const label = await uploadWorkbookEcommerceLabel({ id: user.id, role: user.role, platform, orderNumber, fileName, base64 })
      sendJson(response, 201, { label })
      return
    }

    if (action === 'submitReport') {
      if (user.role !== 'E-commerce Executive') {
        throw new ApiError(403, 'Only an E-commerce Executive can submit a daily report.')
      }
      const completed = requireText(body.completed, 'Completed work', 3000)
      if ((body.pending !== undefined && typeof body.pending !== 'string') ||
          (body.issues !== undefined && typeof body.issues !== 'string')) {
        throw new ApiError(400, 'Pending work and issues must be text.')
      }
      const pending = typeof body.pending === 'string' ? body.pending.trim() : ''
      const issues = typeof body.issues === 'string' ? body.issues.trim() : ''
      if (pending.length > 3000 || issues.length > 3000) throw new ApiError(400, 'Each report field must be 3,000 characters or fewer.')
      const result = await submitWorkbookEcommerceReport({ id: user.id, role: user.role, platform, completed, pending, issues })
      sendJson(response, 200, result)
      return
    }

    throw new ApiError(400, 'Choose a valid e-commerce operation.')
  } catch (error) {
    handleApiError(response, error, 'E-commerce workspace')
  }
}
