import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import {
  ECOMMERCE_PLATFORMS,
  getWorkbookData,
  listUsers,
  listWorkbookEcommerceLabels,
  listWorkbookEcommerceTargets,
  readSheetRecords,
  setWorkbookEcommerceTarget,
  updateWorkbookMarketplaceListing,
  uploadWorkbookEcommerceLabel,
  submitWorkbookEcommerceReport,
  type EcommercePlatform,
  type PublicUser,
  type WorkbookData,
  type WorkbookUser,
  publicUser,
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
  if (!['E-commerce Executive', 'E-commerce Manager', 'Production Supervisor', 'Super Admin'].includes(user.role)) {
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

export function workspaceData(data: WorkbookData, user: PublicUser, users: WorkbookUser[]) {
  const team = user.role === 'E-commerce Manager'
    ? users.filter(account => account.role === 'E-commerce Executive' && account.managerId === user.id)
    : []
  const teamPlatforms = ECOMMERCE_PLATFORMS.filter(platform => team.some(account => account.active && account.platforms.includes(platform)))
  const platforms = user.role === 'E-commerce Executive'
    ? user.platforms
    : user.role === 'E-commerce Manager' ? teamPlatforms : [...ECOMMERCE_PLATFORMS]
  const finishedRows = readSheetRecords(data, 'Finished_Goods')
  const previousSkusByCurrent = new Map<string, string[]>()
  readSheetRecords(data, 'Products').forEach(row => {
    const currentSku = text(row['Master SKU']).toLowerCase()
    if (!currentSku) return
    const previousSkus = text(row['Previous SKUs']).split('|').map(sku => sku.trim().toLowerCase()).filter(Boolean)
    if (previousSkus.length) previousSkusByCurrent.set(currentSku, previousSkus)
  })
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
      mrp: number(row.MRP),
      sellingPrice: number(row['Selling Price']),
      availableStock: stock?.availableStock ?? 0,
      stockStatus: stock?.status || 'Not initialized',
      status: text(row.Status) || 'Active',
    }]
  })
  const listingPriceBySku = new Map<string, number>()
  const movementListings = readSheetRecords(data, 'Marketplace_Listings')
  movementListings.forEach(row => {
    const platform = platformOf(row.Platform)
    if (!platform || !platforms.includes(platform)) return
    const productSku = text(row['Product SKU']).toLowerCase()
    const masterSku = text(row['Master SKU']).toLowerCase()
    const platformSku = text(row['Platform SKU']).toLowerCase()
    const sellingPrice = number(row['Selling Price'])
    if (productSku) {
      listingPriceBySku.set(`${platform}:${productSku}`, sellingPrice)
      listingPriceBySku.set(productSku, sellingPrice)
      if (productSku === masterSku) {
        const previousSkus = previousSkusByCurrent.get(masterSku) ?? []
        previousSkus.forEach(previousSku => {
          listingPriceBySku.set(`${platform}:${previousSku}`, sellingPrice)
          listingPriceBySku.set(previousSku, sellingPrice)
        })
      }
    }
    if (platformSku) listingPriceBySku.set(`${platform}:${platformSku}`, sellingPrice)
  })
  const movements = readSheetRecords(data, 'Stock_Movement').flatMap(row => {
    const platform = platformOf(row['Sales Channel'])
    const type = text(row['Movement Type'])
    const itemType = text(row['Item Type'])
    const referenceId = text(row['Reference ID'])
    if (!platform || !platforms.includes(platform) || itemType !== 'Finished Goods' ||
        !['Dispatch', 'Return', 'Damage'].includes(type) || !referenceId) return []
    const sku = text(row.SKU)
    const sellingPrice = listingPriceBySku.get(`${platform}:${sku.toLowerCase()}`)
      ?? listingPriceBySku.get(sku.toLowerCase())
      ?? 0
    return [{
      id: text(row['Movement ID']),
      date: text(row['Date/Time']),
      platform,
      type,
      orderNumber: referenceId,
      sku: text(row.SKU),
      quantity: number(row.Quantity),
      unitSellingPrice: sellingPrice,
      reason: text(row.Reason),
    }]
  }).sort((a, b) => b.date.localeCompare(a.date))
  return { platforms, listings, movements, team: team.map(publicUser) }
}

function requireText(value: unknown, label: string, maximum?: number) {
  if (typeof value !== 'string') throw new ApiError(400, `${label} is required.`)
  const result = text(value)
  const hasControlCharacters = result.split('').some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  if (!result || (maximum !== undefined && result.length > maximum) || hasControlCharacters) {
    throw new ApiError(400, maximum === undefined ? `${label} is required.` : `${label} is required and must be ${maximum} characters or fewer.`)
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
      const targetRequest = user.role === 'Super Admin' || user.role === 'E-commerce Executive' || user.role === 'E-commerce Manager'
        ? listWorkbookEcommerceTargets(user)
        : Promise.resolve({ targets: {} })
      const labelRequest = user.role === 'Super Admin'
        ? Promise.resolve({ labels: [] })
        : listWorkbookEcommerceLabels(user)
      const [data, labelResult, targetResult] = await Promise.all([
        getWorkbookData(),
        labelRequest,
        targetRequest,
      ])
      sendJson(response, 200, { ...workspaceData(data, user, users), labels: labelResult.labels, targets: targetResult.targets })
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)

    if (action === 'setTarget') {
      const targetType = body.targetType === 'manager' ? 'manager' : body.targetType === 'executive' || body.targetType === undefined ? 'executive' : null
      if (!targetType) throw new ApiError(400, 'Choose a manager or executive target.')
      const targetId = requireText(body.targetId ?? body.executiveId ?? body.managerId, targetType === 'manager' ? 'E-commerce Manager account' : 'E-commerce Executive account', 120)
      const target = users.find(account => account.id === targetId && account.active &&
        account.role === (targetType === 'manager' ? 'E-commerce Manager' : 'E-commerce Executive'))
      if (!target) throw new ApiError(404, `The selected active E-commerce ${targetType === 'manager' ? 'Manager' : 'Executive'} account was not found.`)
      if (targetType === 'manager' && user.role !== 'Super Admin') {
        throw new ApiError(403, 'Only the Super Admin can set E-commerce Manager targets.')
      }
      if (targetType === 'executive' && user.role !== 'Super Admin' &&
          !(user.role === 'E-commerce Manager' && target.managerId === user.id)) {
        throw new ApiError(403, 'You can only set targets for your own E-commerce Executives.')
      }
      const { dailyTarget, monthlyTarget } = body
      if (typeof dailyTarget !== 'number' || !Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
          typeof monthlyTarget !== 'number' || !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
        throw new ApiError(400, 'Daily and monthly order targets must be whole numbers from 0 to 100,000.')
      }
      const result = await setWorkbookEcommerceTarget({ id: user.id, role: user.role, targetType, targetId, dailyTarget, monthlyTarget })
      sendJson(response, 200, result)
      return
    }

    if (action === 'submitReport') {
      if (user.role !== 'E-commerce Executive' && user.role !== 'E-commerce Manager') {
        throw new ApiError(403, 'Only an E-commerce Executive or Manager can submit a daily report.')
      }
      let platform: EcommercePlatform | 'TEAM'
      if (user.role === 'E-commerce Manager') {
        platform = 'TEAM'
      } else {
        platform = requirePlatform(body.platform)
        requirePlatformAccess(user, platform)
      }
      const completed = requireText(body.completed, 'Completed work')
      if ((body.pending !== undefined && typeof body.pending !== 'string') ||
          (body.issues !== undefined && typeof body.issues !== 'string')) {
        throw new ApiError(400, 'Pending work and issues must be text.')
      }
      const pending = typeof body.pending === 'string' ? body.pending.trim() : ''
      const issues = typeof body.issues === 'string' ? body.issues.trim() : ''
      const result = await submitWorkbookEcommerceReport({ id: user.id, role: user.role, platform, completed, pending, issues })
      sendJson(response, 200, result)
      return
    }

    const platform = requirePlatform(body.platform)
    requirePlatformAccess(user, platform)

    if (action === 'updateListing' || action === 'updateSku') {
      if (user.role !== 'E-commerce Executive' && user.role !== 'Super Admin') {
        throw new ApiError(403, 'Only an E-commerce Executive or Super Admin can update a marketplace listing.')
      }
      const listingId = requireText(body.listingId, 'Marketplace listing', 120)
      const platformSku = requireText(body.platformSku, 'Platform SKU', 120)
      const hasMrp = body.mrp !== undefined
      const hasSellingPrice = body.sellingPrice !== undefined
      if (hasMrp !== hasSellingPrice) throw new ApiError(400, 'Enter both MRP and selling price.')
      let prices: { mrp?: number; sellingPrice?: number } = {}
      if (hasMrp) {
        if (typeof body.mrp !== 'number' || !Number.isFinite(body.mrp) || body.mrp < 0 ||
            typeof body.sellingPrice !== 'number' || !Number.isFinite(body.sellingPrice) || body.sellingPrice < 0) {
          throw new ApiError(400, 'MRP and selling price must be non-negative numbers.')
        }
        prices = { mrp: body.mrp, sellingPrice: body.sellingPrice }
      }
      const result = await updateWorkbookMarketplaceListing({ id: user.id, role: user.role, platform, listingId, platformSku, ...prices })
      sendJson(response, 200, result)
      return
    }

    if (action === 'uploadLabel') {
      if (user.role !== 'E-commerce Executive') {
        throw new ApiError(403, 'Only an E-commerce Executive can upload shipping labels.')
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

    throw new ApiError(400, 'Choose a valid e-commerce operation.')
  } catch (error) {
    handleApiError(response, error, 'E-commerce workspace')
  }
}
