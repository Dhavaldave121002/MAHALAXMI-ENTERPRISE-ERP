import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import {
  ECOMMERCE_PLATFORMS,
  importWorkbookMarketplaceRows,
  listUsers,
  listWorkbookMarketplaceRows,
  type EcommercePlatform,
  type PublicUser,
} from './_lib/workbook.js'

function text(value: unknown, label: string, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, `${label} is required.`)
    return ''
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ApiError(400, `${label} must be text.`)
  }
  const result = String(value).trim()
  if (required && !result) throw new ApiError(400, `${label} is required.`)
  if (result.length > 200) throw new ApiError(400, `${label} must be 200 characters or fewer.`)
  for (let index = 0; index < result.length; index += 1) {
    const code = result.charCodeAt(index)
    if (code < 32 || code === 127) throw new ApiError(400, `${label} contains unsupported control characters.`)
  }
  return result
}

function amount(value: unknown, label: string, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null
  if (value !== undefined && value !== null && value !== '' &&
      typeof value !== 'number' && typeof value !== 'string') {
    throw new ApiError(400, `${label} must be a valid amount.`)
  }
  const parsed = Number(value === '' || value === undefined || value === null ? 0 : value)
  if (!Number.isFinite(parsed) || Math.abs(parsed) > 1_000_000_000_000) {
    throw new ApiError(400, `${label} must be a valid amount.`)
  }
  return parsed
}

function platformOf(value: unknown): EcommercePlatform {
  const normalized = text(value, 'Platform', true).toUpperCase()
  const canonical = normalized === 'AMAZON.IN' || normalized === 'AMAZON.COM' ? 'AMAZON' : normalized
  if (!ECOMMERCE_PLATFORMS.includes(canonical as EcommercePlatform)) {
    throw new ApiError(400, 'Platform must be Amazon, Flipkart, Meesho, Shopify, or Myntra.')
  }
  return canonical as EcommercePlatform
}

function storedAmount(value: unknown, label: string, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null
  const parsed = Number(value === '' || value === undefined || value === null ? 0 : value)
  if (!Number.isFinite(parsed)) throw new ApiError(503, `Stored marketplace reconciliation data has an invalid ${label}.`)
  return parsed
}

function marketplaceRecord(row: Record<string, unknown>) {
  const recordType = text(row['Record Type'], 'Stored Record Type', true)
  if (recordType !== 'ORDER' && recordType !== 'SETTLEMENT') {
    throw new ApiError(503, 'Stored marketplace reconciliation data has an invalid record type.')
  }
  const recordId = String(row['Record ID'] || '')
  const platform = String(row.Platform || '')
  return {
    id: `${platform}|${recordType}|${recordId}`,
    recordType,
    recordId,
    platform,
    transactionDate: String(row['Transaction Date'] || ''),
    orderId: String(row['Order ID'] || ''),
    settlementId: String(row['Settlement ID'] || ''),
    platformSku: String(row['Platform SKU'] || ''),
    erpSku: String(row['ERP SKU'] || ''),
    quantity: storedAmount(row.Quantity, 'Quantity') || 0,
    grossSales: storedAmount(row['Gross Sales'], 'Gross Sales') || 0,
    refunds: storedAmount(row.Refunds, 'Refunds') || 0,
    marketplaceFees: storedAmount(row['Marketplace Fees'], 'Marketplace Fees') || 0,
    shippingFees: storedAmount(row['Shipping Fees'], 'Shipping Fees') || 0,
    advertisingFees: storedAmount(row['Advertising Fees'], 'Advertising Fees') || 0,
    otherCharges: storedAmount(row['Other Charges'], 'Other Charges') || 0,
    taxWithheld: storedAmount(row['Tax Withheld'], 'Tax Withheld') || 0,
    productCost: storedAmount(row['Product Cost'], 'Product Cost', true),
    expectedSettlement: storedAmount(row['Expected Settlement'], 'Expected Settlement') || 0,
    bankCredit: storedAmount(row['Bank Credit'], 'Bank Credit', true),
    importedBy: String(row['Imported By'] || ''),
    importedAt: String(row['Imported At'] || ''),
  }
}

function normalizeRow(value: unknown, index: number, user: PublicUser) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, `Row ${index + 2} must contain marketplace report data.`)
  }
  const source = value as Record<string, unknown>
  const recordType = text(source.recordType, 'Record Type', true).toUpperCase()
  if (recordType !== 'ORDER' && recordType !== 'SETTLEMENT') {
    throw new ApiError(400, `Row ${index + 2}: Record Type must be ORDER or SETTLEMENT.`)
  }
  const platform = platformOf(source.platform)
  if (user.role === 'E-commerce Executive' && !user.platforms.includes(platform)) {
    throw new ApiError(403, `Row ${index + 2}: ${platform} is not assigned to your account.`)
  }
  const recordId = text(source.recordId, 'Record ID', true)
  const transactionDate = text(source.transactionDate, 'Transaction Date', true)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
      Number.isNaN(Date.parse(`${transactionDate}T00:00:00Z`)) ||
      new Date(`${transactionDate}T00:00:00Z`).toISOString().slice(0, 10) !== transactionDate) {
    throw new ApiError(400, `Row ${index + 2}: Transaction Date must use YYYY-MM-DD.`)
  }

  const orderId = text(source.orderId, 'Order ID')
  const settlementId = text(source.settlementId, 'Settlement ID')
  const platformSku = text(source.platformSku, 'Platform SKU')
  const erpSku = text(source.erpSku, 'ERP SKU')
  const quantity = amount(source.quantity, 'Quantity') ?? 0
  if (quantity < 0 || !Number.isInteger(quantity)) {
    throw new ApiError(400, `Row ${index + 2}: Quantity must be a whole number of zero or more.`)
  }
  if (recordType === 'ORDER' && (!orderId || (!platformSku && !erpSku) || quantity < 1)) {
    throw new ApiError(400, `Row ${index + 2}: ORDER rows need an Order ID, SKU, and quantity of at least 1.`)
  }
  if (recordType === 'ORDER' && (source.grossSales === undefined || source.grossSales === null || source.grossSales === '')) {
    throw new ApiError(400, `Row ${index + 2}: Gross Sales is required for ORDER rows (enter 0 when applicable).`)
  }
  if (recordType === 'SETTLEMENT' && !settlementId) {
    throw new ApiError(400, `Row ${index + 2}: SETTLEMENT rows need a Settlement ID.`)
  }
  if (recordType === 'SETTLEMENT' &&
      (source.expectedSettlement === undefined || source.expectedSettlement === null || source.expectedSettlement === '')) {
    throw new ApiError(400, `Row ${index + 2}: Expected Settlement is required for SETTLEMENT rows.`)
  }

  const amounts = {
    grossSales: amount(source.grossSales, 'Gross Sales'),
    refunds: amount(source.refunds, 'Refunds'),
    marketplaceFees: amount(source.marketplaceFees, 'Marketplace Fees'),
    shippingFees: amount(source.shippingFees, 'Shipping Fees'),
    advertisingFees: amount(source.advertisingFees, 'Advertising Fees'),
    otherCharges: amount(source.otherCharges, 'Other Charges'),
    taxWithheld: amount(source.taxWithheld, 'Tax Withheld'),
    productCost: amount(source.productCost, 'Product Cost', true),
    expectedSettlement: amount(source.expectedSettlement, 'Expected Settlement'),
    bankCredit: amount(source.bankCredit, 'Bank Credit', true),
  }
  const nonNegativeAmounts = [
    ['Gross Sales', amounts.grossSales], ['Refunds', amounts.refunds],
    ['Marketplace Fees', amounts.marketplaceFees], ['Shipping Fees', amounts.shippingFees],
    ['Advertising Fees', amounts.advertisingFees], ['Tax Withheld', amounts.taxWithheld],
    ['Product Cost', amounts.productCost], ['Bank Credit', amounts.bankCredit],
  ] as const
  for (const [label, value] of nonNegativeAmounts) {
    if (value !== null && value < 0) throw new ApiError(400, `Row ${index + 2}: ${label} cannot be negative.`)
  }
  if (recordType === 'ORDER' &&
      (amounts.expectedSettlement !== 0 || amounts.bankCredit !== null)) {
    throw new ApiError(400, `Row ${index + 2}: Put payout amounts only on a separate SETTLEMENT row to prevent double counting.`)
  }
  if (recordType === 'SETTLEMENT' &&
      (orderId || platformSku || erpSku || quantity !== 0 || amounts.grossSales !== 0 ||
       amounts.refunds !== 0 || amounts.marketplaceFees !== 0 || amounts.shippingFees !== 0 ||
       amounts.advertisingFees !== 0 || amounts.otherCharges !== 0 || amounts.taxWithheld !== 0 ||
       amounts.productCost !== null)) {
    throw new ApiError(400, `Row ${index + 2}: Put order and SKU amounts only on ORDER rows.`)
  }

  return {
    recordId,
    recordType,
    platform,
    transactionDate,
    orderId,
    settlementId,
    platformSku,
    erpSku,
    quantity,
    ...amounts,
  }
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const user = await getSessionUser(request, users)
    if (request.method === 'GET') {
      if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can view marketplace reconciliation.')
      const result = await listWorkbookMarketplaceRows(user)
      if (!Array.isArray(result.records) || !Array.isArray(result.expenses)) {
        throw new ApiError(503, 'Apps Script returned invalid marketplace reconciliation data.')
      }
      const records = result.records.map(marketplaceRecord)
      const erpExpenses = result.expenses.map(row => ({
        date: text(row.Date, 'Stored ERP expense date', true),
        amount: storedAmount(row.Amount, 'ERP expense amount') || 0,
      }))
      sendJson(response, 200, { records, erpExpenses })
      return
    }

    if (user.role !== 'E-commerce Executive' && user.role !== 'Super Admin') {
      throw new ApiError(403, 'Only an E-commerce Executive or the Super Admin can import marketplace reports.')
    }
    const body = await readJsonBody(request)
    if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 500) {
      throw new ApiError(400, 'Import between 1 and 500 report rows per batch.')
    }
    const rows = body.rows.map((row, index) => normalizeRow(row, index, user))
    const result = await importWorkbookMarketplaceRows({ ...user, rows })
    if (!Array.isArray(result.records)) {
      throw new ApiError(503, 'Apps Script returned no imported records. Deploy the latest Code.gs as a new web-app version.')
    }
    sendJson(response, 200, { ...result, records: result.records.map(marketplaceRecord) })
  } catch (error) {
    handleApiError(response, error, 'Marketplace reconciliation')
  }
}
