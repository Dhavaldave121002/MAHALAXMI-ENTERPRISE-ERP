import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import auditHandler from './_lib/auditHandler.js'
import { getSessionClaims, getSessionUser, refreshSessionCookie, requireAdmin, requireSupervisorOrAdmin } from './_lib/session.js'
import {
  addWorkbookMarketplaceListing,
  addWorkbookRawMaterial,
  applyWorkbookStockMovement,
  archiveWorkbookStockItem,
  appendWorkbookRecord,
  addWorkbookSalesLead,
  assignWorkbookSalesLead,
  cancelWorkbookSalesOrder,
  createWorkbookSalesOrder,
  deleteUnusedWorkbookStockItem,
  getWorkbookData,
  listWorkbookChatData,
  listWorkbookChatMessages,
  listWorkbookChatTyping,
  importWorkbookSalesLeads,
  initializeWorkbookZeroFinishedStock,
  importWorkbookMarketplaceCatalog,
  recordWorkbookProduction,
  readWorkbookChatAttachment,
  recordWorkbookSalesActivity,
  sendWorkbookChatMessage,
  setWorkbookSalesTarget,
  setWorkbookProductionTarget,
  setWorkbookChatTyping,
  readUsers,
  readSheetRecords,
  type PublicUser,
  type WorkbookData,
} from './_lib/workbook.js'

type CatalogItem = {
  id: string
  sku: string
  masterSku: string
  name: string
  category: string
  mrp: number
  stock: number
  status: 'Active' | 'Draft'
  size: string
  color: string
  packQuantity: number
  isVariant: boolean
}

type MarketplaceListing = {
  id: string
  platform: string
  platformSku: string
  productSku: string
  masterSku: string
  productName: string
  mrp: number
  sellingPrice: number
  status: string
  createdBy: string
  createdAt: string
}

const MARKETPLACES = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
type Machine = { id: string; name: string; type: string; operator: string; status: string }
type Production = { id: string; date: string; machine: string; block: string; sku: string; product: string; actual: number; rejected: number; createdBy: string }
type ProductionTargetPeriod = 'daily' | 'weekly' | 'monthly'
type ProductionTarget = {
  id: string
  period: ProductionTargetPeriod
  startDate: string
  endDate: string
  machineId: string
  machineName: string
  sku: string
  productName: string
  targetQuantity: number
  actual: number
  createdBy: string
}
type RawMaterial = {
  id: string; sku: string; name: string; unit: string; openingStock: number; purchaseInward: number;
  supplier: string; issued: number; machineConsumption: number; stitchingConsumption: number;
  wastage: number; adjustmentIn: number; adjustmentOut: number; closingStock: number;
  reorderLevel: number; averageUnitCost: number; stockValue: number; status: string
}
type FinishedGood = {
  sku: string; name: string; openingStock: number; productionReceived: number; qualityApproved: number;
  rejected: number; reservedStock: number; availableStock: number; dispatchedStock: number;
  returnedStock: number; damagedStock: number; adjustmentIn: number; adjustmentOut: number; status: string
}
type StockMovement = {
  id: string; date: string; sku: string; itemType: string; type: string; quantity: number;
  referenceId: string; machineId: string; reason: string; salesChannel: string; deliveryPartner: string;
  openingStock: number; closingStock: number; createdBy: string
}
type SalesLead = {
  id: string; name: string; company: string; phone: string; email: string; productInterest: string;
  notes: string; referenceUrl: string; assignedUserId: string; assignedUserName: string;
  status: string; nextFollowUp: string; createdAt: string; createdBy: string; updatedAt: string
}
type SalesActivity = {
  id: string; leadId: string; type: string; outcome: string; notes: string; nextFollowUp: string;
  createdAt: string; createdBy: string; createdByName: string
}
type SalesOrder = {
  id: string; createdAt: string; salesUserId: string; salesUserName: string; leadId: string;
  customerName: string; sku: string; productName: string; quantity: number; unitPrice: number;
  amount: number; fulfilledQuantity: number; cancelledQuantity: number; status: string; notes: string
}

function stockMovementFromRecord(row: Record<string, unknown>): StockMovement {
  return {
    id: text(row['Movement ID']),
    date: text(row['Date/Time']),
    sku: text(row.SKU),
    itemType: text(row['Item Type']),
    type: text(row['Movement Type']),
    quantity: number(row.Quantity),
    referenceId: text(row['Reference ID']),
    machineId: text(row['Machine ID']),
    reason: text(row.Reason),
    salesChannel: text(row['Sales Channel']),
    deliveryPartner: text(row['Delivery Partner']),
    openingStock: number(row['Opening Stock']),
    closingStock: number(row['Closing Stock']),
    createdBy: text(row['Created By']),
  }
}

function text(value: unknown) {
  return String(value ?? '').trim()
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizedStatus(value: unknown): 'Active' | 'Draft' {
  return text(value).toLowerCase() === 'active' ? 'Active' : 'Draft'
}

function dateKey(value: unknown) {
  const input = text(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.slice(0, 10)
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? input : new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function dateKeyInIndia(value: unknown) {
  const input = text(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  const parsed = new Date(input)
  if (!input || Number.isNaN(parsed.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

function productionTargetPeriod(periodValue: unknown, dateValue: unknown) {
  const period = text(periodValue).toLowerCase()
  const date = text(dateValue)
  if (!['daily', 'weekly', 'monthly'].includes(period)) throw new ApiError(400, 'Choose a daily, weekly, or monthly target period.')
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00.000Z`) : Number.NaN
  if (!Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Choose a valid target date.')
  }
  if (period === 'daily') return { period: period as ProductionTargetPeriod, startDate: date, endDate: date }
  const anchor = new Date(`${date}T12:00:00.000Z`)
  if (period === 'weekly') {
    const weekday = anchor.getUTCDay()
    const start = new Date(anchor)
    start.setUTCDate(start.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday))
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)
    return {
      period: period as ProductionTargetPeriod,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }
  const [year, month] = date.split('-').map(Number)
  return {
    period: period as ProductionTargetPeriod,
    startDate: `${date.slice(0, 7)}-01`,
    endDate: new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10),
  }
}

function records(data: WorkbookData, sheetName: string) {
  return readSheetRecords(data, sheetName)
}

function optionalRecords(data: WorkbookData, sheetName: string) {
  const actualName = data.sheetNames.find(name => name.toLowerCase() === sheetName.toLowerCase())
  return actualName && Array.isArray(data.sheets[actualName]) ? data.sheets[actualName] : []
}

function productionSkus(products: CatalogItem[]) {
  const variantMasters = new Set(
    products.filter(item => item.isVariant && item.status === 'Active').map(item => item.masterSku.toLowerCase()),
  )
  return products.filter(item =>
    item.status === 'Active' && (item.isVariant || !variantMasters.has(item.sku.toLowerCase()))
  )
}

function productionTargetActual(data: WorkbookData, target: Omit<ProductionTarget, 'actual'>) {
  return records(data, 'Production').reduce((total, row) => {
    const date = dateKey(row.Date)
    if (date < target.startDate || date > target.endDate ||
        text(row['Machine ID']).toLowerCase() !== target.machineId.toLowerCase()) return total
    const sku = text(row['Variant SKU']) || text(row['Master SKU'])
    const sameProduct = target.sku
      ? sku.toLowerCase() === target.sku.toLowerCase()
      : !sku && text(row['Product Name']).toLowerCase() === target.productName.toLowerCase()
    return sameProduct ? total + number(row['Actual Quantity']) : total
  }, 0)
}

function salesOrderActiveAmount(order: SalesOrder) {
  return Math.round(Math.max(0, order.amount - order.unitPrice * order.cancelledQuantity) * 100) / 100
}

function salesTargetActual(orders: SalesOrder[], salesUserId: string, period: string, periodKey: string) {
  return orders.reduce((total, order) => {
    if (order.salesUserId !== salesUserId) return total
    const orderDate = dateKeyInIndia(order.createdAt)
    if (period === 'monthly' && orderDate.slice(0, 7) !== periodKey) return total
    if (period === 'yearly' && orderDate.slice(0, 4) !== periodKey) return total
    return Math.round((total + salesOrderActiveAmount(order)) * 100) / 100
  }, 0)
}

function requireActiveSalesExecutive(data: WorkbookData, userId: string) {
  const executive = optionalRecords(data, 'Users').find(row => {
    const active = row.Active === true || ['true', '1', 'yes'].includes(text(row.Active).toLowerCase())
    return active && text(row['User ID']) === userId && text(row.Role) === 'Sales Executive'
  })
  if (!executive) throw new ApiError(400, 'Choose an active Sales Executive account.')
}

export function getSnapshot(data: WorkbookData, user: PublicUser) {
  if (user.role === 'E-commerce Executive') {
    return {
      products: [],
      marketplaceListings: [],
      machines: [],
      production: [],
      productionTargets: [],
      rawMaterials: [],
      finishedGoods: [],
      stockMovements: [],
      salesLeads: [],
      salesActivities: [],
      salesOrders: [],
      salesTargets: [],
      salesUsers: [],
      workbookMeta: { loaded: true, name: data.name, sheetCount: data.sheetCount },
    }
  }
  const masters = records(data, 'Products')
  const variants = records(data, 'SKU_Variants')
  const finishedRows = records(data, 'Finished_Goods')
  const stockBySku = new Map(finishedRows.map(row => [text(row['Product SKU']).toLowerCase(), number(row['Available Stock'])]))
  const archivedFinishedSkus = new Set(finishedRows
    .filter(row => text(row.Status).toLowerCase() === 'archived')
    .map(row => text(row['Product SKU']).toLowerCase()))
  const productStock = (sku: string) => user.role === 'Super Admin' || user.role === 'Production Supervisor' || user.role === 'Sales Executive'
    ? stockBySku.get(sku.toLowerCase()) || 0
    : 0
  const rawMaterials: RawMaterial[] = optionalRecords(data, 'Raw_Materials').flatMap(row => {
    const sku = text(row['Material SKU'])
    if (!sku) return []
    return [{
      id: text(row['Material ID']),
      sku,
      name: text(row['Material Name']) || sku,
      unit: text(row.Unit),
      openingStock: number(row['Opening Stock']),
      purchaseInward: number(row['Purchase Inward']),
      supplier: text(row.Supplier),
      issued: number(row['Material Issued']),
      machineConsumption: number(row['Machine Consumption']),
      stitchingConsumption: number(row['Stitching Consumption']),
      wastage: number(row.Wastage),
      adjustmentIn: number(row['Adjustment In']),
      adjustmentOut: number(row['Adjustment Out']),
      closingStock: row['Closing Stock'] === undefined || row['Closing Stock'] === ''
        ? number(row['Opening Stock']) + number(row['Purchase Inward']) - number(row['Material Issued'])
          - number(row['Machine Consumption']) - number(row['Stitching Consumption']) - number(row.Wastage)
          + number(row['Adjustment In']) - number(row['Adjustment Out'])
        : number(row['Closing Stock']),
      reorderLevel: number(row['Reorder Level']),
      averageUnitCost: number(row['Average Unit Cost']),
      stockValue: number(row['Stock Value']),
      status: text(row.Status) || 'Active',
    }]
  })
  const finishedGoods: FinishedGood[] = optionalRecords(data, 'Finished_Goods').flatMap(row => {
    const sku = text(row['Product SKU'])
    if (!sku) return []
    return [{
      sku,
      name: text(row['Product Name']) || sku,
      openingStock: number(row['Opening Stock']),
      productionReceived: number(row['Production Received']),
      qualityApproved: number(row['Quality Approved']),
      rejected: number(row.Rejected),
      reservedStock: number(row['Reserved Stock']),
      availableStock: row['Available Stock'] === undefined || row['Available Stock'] === ''
        ? number(row['Opening Stock']) + (row['Quality Approved'] === undefined || row['Quality Approved'] === ''
          ? Math.max(0, number(row['Production Received']) - number(row.Rejected))
          : number(row['Quality Approved'])) + number(row['Returned Stock']) + number(row['Adjustment In'])
          - number(row['Dispatched Stock']) - number(row['Damaged Stock']) - number(row['Reserved Stock']) - number(row['Adjustment Out'])
        : number(row['Available Stock']),
      dispatchedStock: number(row['Dispatched Stock']),
      returnedStock: number(row['Returned Stock']),
      damagedStock: number(row['Damaged Stock']),
      adjustmentIn: number(row['Adjustment In']),
      adjustmentOut: number(row['Adjustment Out']),
      status: text(row.Status) || 'Active',
    }]
  })
  const stockMovements: StockMovement[] = optionalRecords(data, 'Stock_Movement').flatMap(row => {
    const id = text(row['Movement ID'])
    if (!id) return []
    return [{
      id,
      date: text(row['Date/Time']),
      sku: text(row.SKU),
      itemType: text(row['Item Type']),
      type: text(row['Movement Type']),
      quantity: number(row.Quantity),
      referenceId: text(row['Reference ID']),
      machineId: text(row['Machine ID']),
      reason: text(row.Reason),
      salesChannel: text(row['Sales Channel']),
      deliveryPartner: text(row['Delivery Partner']),
      openingStock: number(row['Opening Stock']),
      closingStock: number(row['Closing Stock']),
      createdBy: text(row['Created By']),
    }]
  })
  const salesLeads: SalesLead[] = optionalRecords(data, 'Sales_Leads').flatMap(row => {
    const id = text(row['Lead ID'])
    if (!id) return []
    const status = text(row.Status) || 'New'
    const referenceUrl = text(row['Reference URL'])
    if (!['New', 'Contacted', 'Qualified', 'Follow-up', 'Converted', 'Lost'].includes(status)) {
      throw new ApiError(503, 'The Sales_Leads sheet contains an invalid status.')
    }
    if (referenceUrl && (referenceUrl.length > 2000 || !/^https:\/\/\S+$/i.test(referenceUrl))) {
      throw new ApiError(503, 'The Sales_Leads sheet contains an invalid reference URL.')
    }
    return [{
      id,
      name: text(row.Name),
      company: text(row.Company),
      phone: text(row.Phone),
      email: text(row.Email),
      productInterest: text(row['Product Interest']),
      notes: text(row.Notes),
      referenceUrl,
      assignedUserId: text(row['Assigned User ID']),
      assignedUserName: text(row['Assigned User Name']),
      status,
      nextFollowUp: text(row['Next Follow-Up']),
      createdAt: text(row['Created At']),
      createdBy: text(row['Created By']),
      updatedAt: text(row['Updated At']),
    }]
  }).filter(lead => user.role !== 'Sales Executive' || lead.assignedUserId === user.id)
  const visibleLeadIds = new Set(salesLeads.map(lead => lead.id))
  const salesActivities: SalesActivity[] = optionalRecords(data, 'Sales_Activities').flatMap(row => {
    const id = text(row['Activity ID'])
    const leadId = text(row['Lead ID'])
    if (!id || !visibleLeadIds.has(leadId)) return []
    return [{
      id,
      leadId,
      type: text(row['Activity Type']),
      outcome: text(row.Outcome),
      notes: text(row.Notes),
      nextFollowUp: text(row['Next Follow-Up']),
      createdAt: text(row['Created At']),
      createdBy: text(row['Created By']),
      createdByName: text(row['Created By Name']),
    }]
  })
  const allSalesOrders: SalesOrder[] = optionalRecords(data, 'Sales_Orders').flatMap(row => {
    const id = text(row['Order ID'])
    if (!id) return []
    const quantity = number(row.Quantity)
    const fulfilledQuantity = number(row['Fulfilled Quantity'])
    const cancelledQuantity = number(row['Cancelled Quantity'])
    const unitPrice = number(row['Unit Price'])
    const amount = number(row.Amount)
    if (!text(row['Sales User ID']) || !text(row['Product SKU']) ||
        !Number.isInteger(quantity) || quantity < 1 ||
        !Number.isInteger(fulfilledQuantity) || fulfilledQuantity < 0 ||
        !Number.isInteger(cancelledQuantity) || cancelledQuantity < 0 ||
        fulfilledQuantity + cancelledQuantity > quantity ||
        unitPrice <= 0 || amount <= 0) {
      throw new ApiError(503, 'The Sales_Orders sheet contains an invalid order record.')
    }
    return [{
      id,
      createdAt: text(row['Created At']),
      salesUserId: text(row['Sales User ID']),
      salesUserName: text(row['Sales User Name']),
      leadId: text(row['Lead ID']),
      customerName: text(row['Customer Name']),
      sku: text(row['Product SKU']),
      productName: text(row['Product Name']),
      quantity,
      unitPrice,
      amount,
      fulfilledQuantity,
      cancelledQuantity,
      status: text(row.Status),
      notes: text(row.Notes),
    }]
  })
  const salesOrders = allSalesOrders.filter(order => user.role !== 'Sales Executive' || order.salesUserId === user.id)
  const salesTargets = optionalRecords(data, 'Sales_Targets').flatMap(row => {
    const id = text(row['Target ID'])
    if (!id) return []
    const salesUserId = text(row['Sales User ID'])
    const period = text(row.Period).toLowerCase()
    const periodKey = text(row['Period Key'])
    const targetAmount = number(row['Target Amount'])
    const validKey = period === 'monthly' ? /^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)
      : period === 'yearly' ? /^\d{4}$/.test(periodKey)
        : false
    if (!salesUserId || !validKey || !Number.isFinite(targetAmount) || targetAmount < 0) {
      throw new ApiError(503, 'The Sales_Targets sheet contains an invalid sales target.')
    }
    return [{
      id,
      salesUserId,
      salesUserName: text(row['Sales User Name']),
      period: period as 'monthly' | 'yearly',
      periodKey,
      targetAmount,
      actualAmount: salesTargetActual(allSalesOrders, salesUserId, period, periodKey),
      updatedAt: text(row['Updated At']),
      updatedBy: text(row['Updated By']),
    }]
  }).filter(target => user.role !== 'Sales Executive' || target.salesUserId === user.id)
  const salesUsers: { id: string; name: string; username: string; role: 'Sales Executive'; active: boolean }[] =
    optionalRecords(data, 'Users').flatMap(row => {
      const id = text(row['User ID'])
      const active = row.Active === true || ['true', '1', 'yes'].includes(text(row.Active).toLowerCase())
      if (!id || !active || text(row.Role) !== 'Sales Executive') return []
      if (user.role === 'Sales Executive' && id !== user.id) return []
      if (!['Sales Executive', 'Super Admin', 'Production Supervisor'].includes(user.role)) return []
      return [{ id, name: text(row.Name), username: text(row.Username), role: 'Sales Executive' as const, active }]
    })
  const masterBySku = new Map<string, CatalogItem>()
  const products: CatalogItem[] = masters.flatMap((row, index) => {
    const sku = text(row['Master SKU'])
    if (!sku) return []
    const item: CatalogItem = {
      id: text(row['Internal Product ID']) || `PID-${index + 1}`,
      sku,
      masterSku: sku,
      name: text(row['Product Title']) || sku,
      category: text(row.Category) || 'Uncategorized',
      mrp: number(row.MRP),
      stock: productStock(sku),
      status: (user.role === 'Super Admin' || user.role === 'Production Supervisor') && archivedFinishedSkus.has(sku.toLowerCase()) ? 'Draft' : normalizedStatus(row.Status),
      size: text(row.Size),
      color: text(row.Color),
      packQuantity: number(row['Pack Quantity']) || 1,
      isVariant: false,
    }
    masterBySku.set(sku.toLowerCase(), item)
    return [item]
  })

  for (const [index, row] of variants.entries()) {
    const sku = text(row['Variant SKU'])
    const masterSku = text(row['Master SKU'])
    if (!sku || !masterSku) continue
    const master = masterBySku.get(masterSku.toLowerCase())
    products.push({
      id: text(row['Variant ID']) || `VAR-${index + 1}`,
      sku,
      masterSku,
      name: master?.name || masterSku,
      category: master?.category || 'Uncategorized',
      mrp: number(row.MRP) || master?.mrp || 0,
      stock: productStock(sku),
      status: master?.status === 'Active' && !((user.role === 'Super Admin' || user.role === 'Production Supervisor') && archivedFinishedSkus.has(sku.toLowerCase())) ? normalizedStatus(row.Status) : 'Draft',
      size: text(row.Size),
      color: text(row.Color),
      packQuantity: number(row['Pack Quantity']) || 1,
      isVariant: true,
    })
  }

  const machines: Machine[] = records(data, 'Machines').flatMap((row, index) => {
    const id = text(row['Machine ID']) || `Machine ${String(index + 1).padStart(2, '0')}`
    if (!text(row['Machine Name']) && !text(row['Machine ID'])) return []
    return [{
      id,
      name: text(row['Machine Name']),
      type: text(row['Machine Type']),
      operator: text(row.Operator),
      status: text(row.Status) || 'Idle',
    }]
  })

  const production: Production[] = records(data, 'Production').flatMap((row, index) => {
    const createdBy = text(row['Created By'])
    if (user.role !== 'Production Supervisor' && user.role !== 'Super Admin' && createdBy.toLowerCase() !== user.name.toLowerCase()) return []
    return [{
      id: text(row['Production ID']) || `PRO-${index + 1}`,
      date: dateKey(row.Date),
      machine: text(row['Machine ID']),
      block: text(row['Production Block']),
      sku: text(row['Variant SKU']) || text(row['Master SKU']),
      product: text(row['Product Name']),
      actual: number(row['Actual Quantity']),
      rejected: number(row['Rejected Quantity']),
      createdBy,
    }]
  })
  const productionTargets: ProductionTarget[] = optionalRecords(data, 'Production_Targets').flatMap(row => {
    const period = text(row.Period).toLowerCase()
    const startDate = text(row['Period Start'])
    const endDate = text(row['Period End'])
    const machineId = text(row['Machine ID'])
    const sku = text(row['Product SKU'])
    const productName = text(row['Product Name'])
    const targetQuantity = number(row['Target Quantity'])
    const id = text(row['Target ID'])
    if (text(row.Status).toLowerCase() !== 'active') return []
    const validDate = (value: string) => {
      const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00.000Z`) : Number.NaN
      return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
    }
    if (!id || !['daily', 'weekly', 'monthly'].includes(period) ||
        !validDate(startDate) || !validDate(endDate) ||
        !machineId || !productName || !Number.isInteger(targetQuantity) || targetQuantity < 1) {
      throw new ApiError(503, 'The Production_Targets sheet contains an invalid target record.')
    }
    const expectedPeriod = productionTargetPeriod(period, startDate)
    if (expectedPeriod.startDate !== startDate || expectedPeriod.endDate !== endDate) {
      throw new ApiError(503, 'The Production_Targets sheet contains an invalid target period.')
    }
    const base = {
      id,
      period: period as ProductionTargetPeriod,
      startDate,
      endDate,
      machineId,
      machineName: text(row['Machine Name']) || machineId,
      sku,
      productName,
      targetQuantity,
      createdBy: text(row['Created By']),
    }
    return [{ ...base, actual: productionTargetActual(data, base) }]
  }).filter(target => {
    if (user.role === 'Super Admin' || user.role === 'Production Supervisor') return true
    if (user.role !== 'Machine Operator') return false
    return machines.some(machine => machine.id.toLowerCase() === target.machineId.toLowerCase() &&
      machine.operator.split(',').some(operator => operator.trim().toLowerCase() === user.name.toLowerCase()))
  })
  const productBySku = new Map<string, CatalogItem>()
  products.forEach(item => {
    if (!productBySku.has(item.sku.toLowerCase())) productBySku.set(item.sku.toLowerCase(), item)
  })
  const marketplaceListings: MarketplaceListing[] = optionalRecords(data, 'Marketplace_Listings').flatMap(row => {
    const id = text(row['Listing ID'])
    const platform = text(row.Platform)
    const platformSku = text(row['Platform SKU'])
    const productSku = text(row['Product SKU'])
    if (!platformSku || !productSku) return []
    const product = productBySku.get(productSku.toLowerCase())
    const masterSku = text(row['Master SKU']) || product?.masterSku || productSku
    const listingMrp = number(row.MRP)
    if (listingMrp) {
      if (product && product.mrp === 0) product.mrp = listingMrp
      const master = productBySku.get(masterSku.toLowerCase())
      if (master && !master.isVariant && master.mrp === 0) master.mrp = listingMrp
    }
    return [{
      id: id || `${platform}:${platformSku}`,
      platform,
      platformSku,
      productSku,
      masterSku,
      productName: text(row['Product Name']) || product?.name || productSku,
      mrp: number(row.MRP),
      sellingPrice: number(row['Selling Price']),
      status: text(row.Status) || 'Active',
      createdBy: text(row['Created By']),
      createdAt: text(row['Created At']),
    }]
  })

  return {
    products: user.role === 'Production Supervisor' || user.role === 'Super Admin' ? products : products.filter(item => item.status === 'Active'),
    marketplaceListings: user.role === 'Production Supervisor' || user.role === 'Super Admin' ? marketplaceListings : [],
    machines,
    production,
    productionTargets,
    rawMaterials: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? rawMaterials : [],
    finishedGoods: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? finishedGoods : [],
    stockMovements: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? stockMovements.reverse() : [],
    salesLeads,
    salesActivities,
    salesOrders,
    salesTargets,
    salesUsers,
    workbookMeta: { loaded: true, name: data.name, sheetCount: data.sheetCount },
  }
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const result = text(value)
  if (!result || result.length > maxLength || result.split('').some(character => character.charCodeAt(0) < 32)) {
    throw new ApiError(400, `${label} is required and must be ${maxLength} characters or fewer.`)
  }
  return result
}

function nonnegativeNumber(value: unknown, label: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new ApiError(400, `${label} must be a non-negative number.`)
  return parsed
}

function assertUniqueSku(data: WorkbookData, sku: string) {
  const target = sku.toLowerCase()
  const used = [
    ...records(data, 'Products').map(row => text(row['Master SKU'])),
    ...records(data, 'SKU_Variants').map(row => text(row['Variant SKU'])),
  ]
  if (used.some(existing => existing.toLowerCase() === target)) throw new ApiError(409, 'That SKU already exists in the master workbook.')
}

async function addProduct(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const sku = requiredText(body.sku, 'Master SKU', 100)
  const name = requiredText(body.name, 'Product name', 180)
  const category = text(body.category).slice(0, 100)
  const mrp = nonnegativeNumber(body.mrp, 'MRP')
  assertUniqueSku(data, sku)
  const createdAt = new Date().toISOString()
  const item: CatalogItem = {
    id: `PID-${randomUUID()}`,
    sku,
    masterSku: sku,
    name,
    category: category || 'Uncategorized',
    mrp,
    stock: 0,
    status: 'Active',
    size: '',
    color: '',
    packQuantity: 1,
    isVariant: false,
  }
  await appendWorkbookRecord('Products', {
    'Internal Product ID': item.id,
    'Master SKU': item.sku,
    'Product Title': item.name,
    Category: item.category,
    MRP: item.mrp,
    Status: item.status,
    'Created Date': createdAt,
    'Updated Date': createdAt,
  }, ['Internal Product ID', 'Master SKU', 'Product Title', 'Category', 'MRP', 'Status', 'Created Date', 'Updated Date'], user)
  return item
}

async function addVariant(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const masterSku = requiredText(body.masterSku, 'Master SKU', 100)
  const sku = requiredText(body.sku, 'Variant SKU', 100)
  const master = records(data, 'Products').find(row => text(row['Master SKU']).toLowerCase() === masterSku.toLowerCase())
  if (!master) throw new ApiError(404, 'Choose an existing master product before adding a SKU variant.')
  if (normalizedStatus(master.Status) !== 'Active') throw new ApiError(400, 'Activate the master product before adding variants.')
  assertUniqueSku(data, sku)
  const packQuantity = Number(body.packQuantity || 1)
  if (!Number.isInteger(packQuantity) || packQuantity < 1) throw new ApiError(400, 'Pack quantity must be a whole number greater than zero.')
  const mrp = nonnegativeNumber(body.mrp ?? master.MRP, 'MRP')
  const sellingPrice = nonnegativeNumber(body.sellingPrice ?? mrp, 'Selling price')
  const item: CatalogItem = {
    id: `VAR-${randomUUID()}`,
    sku,
    masterSku,
    name: text(master['Product Title']) || masterSku,
    category: text(master.Category) || 'Uncategorized',
    mrp,
    stock: 0,
    status: 'Active',
    size: text(body.size).slice(0, 60),
    color: text(body.color).slice(0, 60),
    packQuantity,
    isVariant: true,
  }
  await appendWorkbookRecord('SKU_Variants', {
    'Variant ID': item.id,
    'Master SKU': item.masterSku,
    'Variant SKU': item.sku,
    Size: item.size,
    Color: item.color,
    'Pack Quantity': item.packQuantity,
    MRP: item.mrp,
    'Selling Price': sellingPrice,
    Status: item.status,
  }, ['Variant ID', 'Master SKU', 'Variant SKU', 'Size', 'Color', 'Pack Quantity', 'MRP', 'Selling Price', 'Status'], user)
  return item
}

async function addMarketplaceListing(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const platform = requiredText(body.platform, 'Platform', 40)
  if (!MARKETPLACES.includes(platform)) throw new ApiError(400, 'Choose a supported marketplace platform.')
  const platformSku = requiredText(body.platformSku, 'Platform SKU', 100)
  const productSku = requiredText(body.productSku, 'Product SKU', 100)
  const mrp = Number(body.mrp)
  const sellingPrice = Number(body.sellingPrice)
  if (!Number.isFinite(mrp) || mrp < 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new ApiError(400, 'MRP and selling price must be valid non-negative amounts.')
  }
  const product = getSnapshot(data, user).products.find(item => item.sku.toLowerCase() === productSku.toLowerCase())
  if (!product || product.status !== 'Active') throw new ApiError(400, 'Choose an active product or variant from the catalog.')
  const duplicate = optionalRecords(data, 'Marketplace_Listings').some(row =>
    text(row.Platform).toLowerCase() === platform.toLowerCase() &&
    text(row['Platform SKU']).toLowerCase() === platformSku.toLowerCase()
  )
  if (duplicate) throw new ApiError(409, `The SKU ${platformSku} already exists on ${platform}.`)
  const listing: MarketplaceListing = {
    id: `LST-${randomUUID()}`,
    platform,
    platformSku,
    productSku: product.sku,
    masterSku: product.masterSku,
    productName: product.name,
    mrp,
    sellingPrice,
    status: 'Active',
    createdBy: user.name,
    createdAt: new Date().toISOString(),
  }
  await addWorkbookMarketplaceListing({
    id: listing.id,
    platform: listing.platform,
    platformSku: listing.platformSku,
    productSku: listing.productSku,
    masterSku: listing.masterSku,
    productName: listing.productName,
    mrp: listing.mrp,
    sellingPrice: listing.sellingPrice,
    createdBy: listing.createdBy,
    createdAt: listing.createdAt,
  }, user)
  return listing
}

function marketplaceImportRows(body: Record<string, unknown>, key: string, requiredHeaders: string[], maxRows: number) {
  const value = body[key]
  if (!Array.isArray(value) || value.length === 0 || value.length > maxRows) {
    throw new ApiError(400, `${key} must contain between 1 and ${maxRows} rows.`)
  }
  return value.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new ApiError(400, `${key} row ${index + 1} must be an object.`)
    }
    const record = row as Record<string, unknown>
    const missing = requiredHeaders.filter(header => !text(record[header]))
    if (missing.length) {
      throw new ApiError(400, `${key} row ${index + 1} is missing: ${missing.join(', ')}.`)
    }
    return record
  })
}

async function importMarketplaceWorkbook(user: PublicUser, body: Record<string, unknown>) {
  const products = marketplaceImportRows(body, 'products', ['Internal Product ID', 'Master SKU', 'Product Title'], 5000)
  const variants = marketplaceImportRows(body, 'variants', ['Variant ID', 'Master SKU', 'Variant SKU'], 10000)
  const listings = marketplaceImportRows(body, 'listings', ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name'], 10000)
  for (const [index, listing] of listings.entries()) {
    if (!MARKETPLACES.includes(text(listing.Platform))) {
      throw new ApiError(400, `Marketplace_Listings_Import row ${index + 1} uses an unsupported platform.`)
    }
  }
  return importWorkbookMarketplaceCatalog({
    products, variants, listings, createdBy: user.name, sessionUserId: user.id, sessionRole: user.role,
  })
}

async function addMachine(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Machine name', 100)
  const existing = records(data, 'Machines')
  let nextId = 1
  const ids = new Set(existing.map(row => text(row['Machine ID']).toLowerCase()))
  while (ids.has(`machine ${String(nextId).padStart(2, '0')}`)) nextId += 1
  const machine: Machine = {
    id: `Machine ${String(nextId).padStart(2, '0')}`,
    name,
    type: text(body.type).slice(0, 80),
    operator: text(body.operator).slice(0, 100),
    status: text(body.status) || 'Idle',
  }
  if (!['Idle', 'Running', 'Maintenance'].includes(machine.status)) throw new ApiError(400, 'Choose a valid machine status.')
  await appendWorkbookRecord('Machines', {
    'Machine ID': machine.id,
    'Machine Name': machine.name,
    'Machine Type': machine.type,
    Operator: machine.operator,
    Status: machine.status,
  }, ['Machine ID', 'Machine Name', 'Machine Type', 'Operator', 'Status'], user)
  return machine
}

async function setProductionTarget(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can assign production targets.')
  const period = text(body.period).toLowerCase()
  const date = requiredText(body.date, 'Target date', 10)
  const periodRange = productionTargetPeriod(period, date)
  const machineId = requiredText(body.machineId, 'Machine', 100)
  const machine = records(data, 'Machines').find(row => text(row['Machine ID']).toLowerCase() === machineId.toLowerCase())
  if (!machine) throw new ApiError(400, 'Choose a machine configured in the workbook.')
  if (text(machine.Status).toLowerCase() === 'maintenance') {
    throw new ApiError(400, 'A machine under maintenance cannot receive a production target.')
  }
  const sku = text(body.sku)
  const product = sku
    ? productionSkus(getSnapshot(data, user).products).find(item => item.sku.toLowerCase() === sku.toLowerCase())
    : undefined
  if (sku && !product) throw new ApiError(400, 'Choose an active product or variant from the catalog.')
  const productName = product
    ? product.name
    : requiredText(body.productName, 'Custom product name', 180)
  const targetQuantity = Number(body.targetQuantity)
  if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 1000000) {
    throw new ApiError(400, 'Target quantity must be a whole number from 1 to 1,000,000.')
  }
  const saved = await setWorkbookProductionTarget({
    period: periodRange.period,
    date,
    machineId,
    sku: product?.sku || '',
    productName,
    targetQuantity,
    createdBy: user.name,
    id: user.id,
    role: user.role,
  })
  const targetRecord = saved.target
  const base = {
    id: text(targetRecord['Target ID']),
    period: periodRange.period,
    startDate: text(targetRecord['Period Start']),
    endDate: text(targetRecord['Period End']),
    machineId: text(targetRecord['Machine ID']),
    machineName: text(targetRecord['Machine Name']) || machineId,
    sku: text(targetRecord['Product SKU']),
    productName: text(targetRecord['Product Name']),
    targetQuantity: number(targetRecord['Target Quantity']),
    createdBy: text(targetRecord['Created By']),
  }
  return {
    target: { ...base, actual: productionTargetActual(data, base) },
    unchanged: saved.unchanged,
    backupName: saved.backupName,
  }
}

async function addProduction(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  if (user.role === 'Store Manager') throw new ApiError(403, 'Your role cannot enter production records.')
  const date = requiredText(body.date, 'Production date', 10)
  const parsedDate = Date.parse(`${date}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Choose a valid production date.')
  }
  const machineId = requiredText(body.machine, 'Machine', 100)
  const block = requiredText(body.block, 'Production block', 20)
  if (!['Block 1', 'Block 2', 'Block 3'].includes(block)) throw new ApiError(400, 'Choose a valid production time block.')
  const machine = records(data, 'Machines').find(row => text(row['Machine ID']).toLowerCase() === machineId.toLowerCase())
  if (!machine) throw new ApiError(400, 'Choose a machine configured by the Admin.')
  if (text(machine.Status).toLowerCase() === 'maintenance') throw new ApiError(400, 'The selected machine is under maintenance.')
  const sku = requiredText(body.sku, 'SKU', 100)
  const catalog = productionSkus(getSnapshot(data, user).products).find(item => item.sku.toLowerCase() === sku.toLowerCase())
  if (!catalog) throw new ApiError(400, 'Choose an active SKU from the master workbook.')
  const actual = Number(body.actual)
  const rejected = Number(body.rejected)
  if (!Number.isInteger(actual) || actual <= 0 || !Number.isInteger(rejected) || rejected < 0 || rejected > actual) {
    throw new ApiError(400, 'Enter whole-number quantities; rejected quantity cannot exceed actual quantity.')
  }
  const id = `PRO-${randomUUID()}`
  const createdAt = new Date().toISOString()
  const productionRecord = {
    'Production ID': id,
    Date: date,
    'Machine ID': machineId,
    'Production Block': block,
    'Product Name': catalog.name,
    'Master SKU': catalog.masterSku,
    'Variant SKU': catalog.isVariant ? catalog.sku : '',
    Operator: user.name,
    'Actual Quantity': actual,
    'Rejected Quantity': rejected,
    'Created By': user.name,
    'Created Date': createdAt,
  }
  const stockResult = await recordWorkbookProduction(productionRecord, user)
  const savedRecord: Production = {
    id,
    date,
    machine: machineId,
    block,
    sku: catalog.sku,
    product: catalog.name,
    actual,
    rejected,
    createdBy: user.name,
  }
  if (user.role !== 'Super Admin' && user.role !== 'Production Supervisor') return savedRecord
  return {
    ...savedRecord,
    finishedGood: {
      sku,
      name: text(stockResult.finishedGood['Product Name']) || catalog.name,
      openingStock: number(stockResult.finishedGood['Opening Stock']),
      productionReceived: number(stockResult.finishedGood['Production Received']),
      qualityApproved: number(stockResult.finishedGood['Quality Approved']),
      rejected: number(stockResult.finishedGood.Rejected),
      reservedStock: number(stockResult.finishedGood['Reserved Stock']),
      availableStock: number(stockResult.finishedGood['Available Stock']),
      dispatchedStock: number(stockResult.finishedGood['Dispatched Stock']),
      returnedStock: number(stockResult.finishedGood['Returned Stock']),
      damagedStock: number(stockResult.finishedGood['Damaged Stock']),
      adjustmentIn: number(stockResult.finishedGood['Adjustment In']),
      adjustmentOut: number(stockResult.finishedGood['Adjustment Out']),
      status: text(stockResult.finishedGood.Status) || 'Active',
    } satisfies FinishedGood,
    stockMovement: stockResult.movement ? stockMovementFromRecord(stockResult.movement) : null,
  }
}

async function addRawMaterial(user: PublicUser, body: Record<string, unknown>) {
  const sku = requiredText(body.sku, 'Material SKU', 100)
  const name = requiredText(body.name, 'Material name', 180)
  const unit = requiredText(body.unit, 'Unit', 40)
  const openingStock = nonnegativeNumber(body.openingStock, 'Opening stock')
  const reorderLevel = nonnegativeNumber(body.reorderLevel, 'Reorder level')
  const unitCost = nonnegativeNumber(body.unitCost, 'Average unit cost')
  const supplier = text(body.supplier).slice(0, 180)
  const result = await addWorkbookRawMaterial({
    sku, name, unit, openingStock, reorderLevel, unitCost, supplier, createdBy: user.name,
    sessionUserId: user.id, sessionRole: user.role,
  })
  const material = result.material
  const mappedMaterial: RawMaterial = {
    id: text(material['Material ID']),
    sku: text(material['Material SKU']),
    name: text(material['Material Name']),
    unit: text(material.Unit),
    openingStock: number(material['Opening Stock']),
    purchaseInward: number(material['Purchase Inward']),
    supplier: text(material.Supplier),
    issued: number(material['Material Issued']),
    machineConsumption: number(material['Machine Consumption']),
    stitchingConsumption: number(material['Stitching Consumption']),
    wastage: number(material.Wastage),
    adjustmentIn: number(material['Adjustment In']),
    adjustmentOut: number(material['Adjustment Out']),
    closingStock: number(material['Closing Stock']),
    reorderLevel: number(material['Reorder Level']),
    averageUnitCost: number(material['Average Unit Cost']),
    stockValue: number(material['Stock Value']),
    status: text(material.Status) || 'Active',
  }
  return {
    material: mappedMaterial,
    movement: result.movement ? stockMovementFromRecord(result.movement) : null,
  }
}

async function applyStockMovement(user: PublicUser, body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  const type = requiredText(body.type, 'Movement type', 40)
  const quantity = nonnegativeNumber(body.quantity, 'Quantity')
  if (quantity <= 0 || quantity > 1_000_000_000) throw new ApiError(400, 'Quantity must be greater than zero and within the supported range.')
  const reason = text(body.reason)
  const referenceId = text(body.referenceId)
  const salesChannel = text(body.salesChannel)
  const deliveryPartner = text(body.deliveryPartner)
  const linkToDispatch = body.linkToDispatch === true
  if (reason.length > 300 || referenceId.length > 100) throw new ApiError(400, 'Reason or reference is too long.')
  if (body.linkToDispatch !== undefined && typeof body.linkToDispatch !== 'boolean') {
    throw new ApiError(400, 'Choose whether this return is linked to a dispatched order.')
  }
  if (linkToDispatch && (kind !== 'finished' || !['Return', 'Damage'].includes(type) || !referenceId || !salesChannel || deliveryPartner)) {
    throw new ApiError(400, 'A linked return requires a finished-goods order, platform, and order number.')
  }
  if (salesChannel || deliveryPartner) {
    const linkedOrderReturn = linkToDispatch && ['Return', 'Damage'].includes(type)
    if (kind !== 'finished' || (type !== 'Dispatch' && !linkedOrderReturn) || (type === 'Dispatch' && !deliveryPartner)) {
      throw new ApiError(400, 'A supported platform is required for dispatches and linked returns.')
    }
    if (!['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA', 'DIRECT'].includes(salesChannel)) {
      throw new ApiError(400, 'Choose a supported delivery channel.')
    }
    if (deliveryPartner.length > 100) throw new ApiError(400, 'Delivery partner name is too long.')
    if (type === 'Dispatch' && !referenceId) throw new ApiError(400, 'Enter the marketplace order number to enable order-linked returns.')
  }
  if (kind === 'raw') {
    if (!['Purchase Inward', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Adjustment In', 'Adjustment Out'].includes(type)) {
      throw new ApiError(400, 'Choose a supported raw-material movement type.')
    }
  } else if (kind === 'finished') {
    if (!['Opening Stock', 'Dispatch', 'Return', 'Damage', 'Adjustment In', 'Adjustment Out', 'Reserve', 'Release Reservation'].includes(type)) {
      throw new ApiError(400, 'Choose a supported finished-goods movement type.')
    }
    if (!Number.isInteger(quantity)) throw new ApiError(400, 'Finished-goods quantity must be a whole number.')
  } else {
    throw new ApiError(400, 'Choose raw material or finished goods.')
  }
  const result = await applyWorkbookStockMovement({
    kind, sku, type, quantity,
    reason: reason.slice(0, 300),
    referenceId: referenceId.slice(0, 100),
    salesChannel,
    deliveryPartner,
    linkToDispatch,
    machineId: text(body.machineId).slice(0, 100),
    unitCost: body.unitCost === undefined || body.unitCost === '' ? '' : nonnegativeNumber(body.unitCost, 'Unit cost'),
    createdBy: user.name,
    sessionUserId: user.id,
    sessionRole: user.role,
  })
  return result
}

async function archiveStockItem(user: PublicUser, body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  if (!['raw', 'finished'].includes(kind)) throw new ApiError(400, 'Choose a valid stock item type.')
  return archiveWorkbookStockItem({
    kind, sku, reason: text(body.reason).slice(0, 300), createdBy: user.name,
    sessionUserId: user.id, sessionRole: user.role,
  })
}

async function deleteUnusedStockItem(user: PublicUser, body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  if (!['raw', 'finished'].includes(kind)) throw new ApiError(400, 'Choose a valid stock item type.')
  return deleteUnusedWorkbookStockItem({ kind, sku, sessionUserId: user.id, sessionRole: user.role })
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const resource = new URL(request.url || '/', 'http://localhost').searchParams.get('resource')
  if (resource === 'audit') {
    await auditHandler(request, response)
    return
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    if (request.method === 'GET') {
      const data = await getWorkbookData()
      const users = readUsers(data.sheets.Users || [])
      const user = await getSessionUser(request, users)
      refreshSessionCookie(response, request, user, data.capabilities?.sessionBoundWrites === true)
      sendJson(response, 200, { ...getSnapshot(data, user), user })
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    const snapshotActions = [
      'addProduction', 'addProduct', 'addVariant', 'addMarketplaceListing', 'addMachine', 'setProductionTarget',
      'importSalesLeads', 'addSalesLead', 'assignSalesLead', 'recordSalesActivity', 'createSalesOrder',
      'cancelSalesOrder', 'setSalesTarget',
    ]
    const sessionBoundActions = ['addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook', 'listChatData', 'listChatMessages', 'listChatTyping', 'setChatTyping', 'sendChatMessage', 'readChatAttachment']
    const data = snapshotActions.includes(action) ? await getWorkbookData() : undefined
    const user = data
      ? await getSessionUser(request, readUsers(data.sheets.Users || []))
      : sessionBoundActions.includes(action)
        ? getSessionClaims(request) || await getSessionUser(request)
        : await getSessionUser(request)

    if (action === 'listChatData') {
      sendJson(response, 200, await listWorkbookChatData(user))
      return
    }
    if (action === 'listChatMessages') {
      const conversationId = requiredText(body.conversationId, 'Conversation', 300)
      const result = await listWorkbookChatMessages(user, conversationId)
      sendJson(response, 200, result)
      return
    }
    if (action === 'listChatTyping') {
      const conversationId = requiredText(body.conversationId, 'Conversation', 300)
      sendJson(response, 200, await listWorkbookChatTyping(user, conversationId))
      return
    }
    if (action === 'setChatTyping') {
      const conversationId = requiredText(body.conversationId, 'Conversation', 300)
      if (typeof body.typing !== 'boolean') throw new ApiError(400, 'Typing status must be true or false.')
      sendJson(response, 200, await setWorkbookChatTyping(user, conversationId, body.typing))
      return
    }
    if (action === 'sendChatMessage') {
      const recipientId = requiredText(body.recipientId, 'Recipient', 120)
      const message = typeof body.text === 'string' ? body.text.trim() : ''
      if (message.length > 4000) throw new ApiError(400, 'Messages must be 4,000 characters or fewer.')
      let attachment: { name: string; mimeType: string; base64: string } | undefined
      if (body.attachment !== undefined) {
        if (!body.attachment || typeof body.attachment !== 'object' || Array.isArray(body.attachment)) {
          throw new ApiError(400, 'Choose a valid image or PDF attachment.')
        }
        const file = body.attachment as Record<string, unknown>
        const name = typeof file.name === 'string' ? file.name.trim() : ''
        const mimeType = typeof file.mimeType === 'string' ? file.mimeType : ''
        const base64 = typeof file.base64 === 'string' ? file.base64 : ''
        if (!name || name.length > 180 || !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(mimeType)) {
          throw new ApiError(400, 'Only JPEG, PNG, GIF, WebP images and PDF files are supported.')
        }
        if (!base64 || base64.length > 4_194_304 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
          throw new ApiError(413, 'Attachments must be 3 MB or smaller.')
        }
        attachment = { name, mimeType, base64 }
      }
      if (!message && !attachment) throw new ApiError(400, 'Enter a message or attach an image/PDF.')
      const result = await sendWorkbookChatMessage({
        id: user.id,
        role: user.role,
        recipientId,
        text: message,
        attachment,
      })
      sendJson(response, 201, result)
      return
    }
    if (action === 'readChatAttachment') {
      const messageId = requiredText(body.messageId, 'Message', 120)
      sendJson(response, 200, await readWorkbookChatAttachment(user, messageId))
      return
    }

    if (action === 'addProduction') {
      if (!['Super Admin', 'Production Supervisor', 'Machine Operator'].includes(user.role)) {
        throw new ApiError(403, 'This account cannot record production.')
      }
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for production validation.')
      const record = await addProduction(data, user, body)
      sendJson(response, 201, { record })
      return
    }
    if (action === 'addRawMaterial') {
      requireSupervisorOrAdmin(user)
      const result = await addRawMaterial(user, body)
      sendJson(response, 201, result)
      return
    }
    if (action === 'applyStockMovement') {
      requireSupervisorOrAdmin(user)
      const result = await applyStockMovement(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'initializeZeroFinishedStock') {
      requireSupervisorOrAdmin(user)
      const result = await initializeWorkbookZeroFinishedStock(user)
      sendJson(response, 200, result)
      return
    }
    if (action === 'archiveStockItem') {
      requireSupervisorOrAdmin(user)
      const result = await archiveStockItem(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'deleteUnusedStockItem') {
      requireSupervisorOrAdmin(user)
      const result = await deleteUnusedStockItem(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'importMarketplaceWorkbook') {
      requireSupervisorOrAdmin(user)
      const result = await importMarketplaceWorkbook(user, body)
      sendJson(response, 200, { result })
      return
    }
    if (action === 'setProductionTarget') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for target validation.')
      const result = await setProductionTarget(data, user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'importSalesLeads') {
      requireAdmin(user)
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for sales lead validation.')
      const assignedUserId = requiredText(body.assignedUserId, 'Sales Executive', 120)
      requireActiveSalesExecutive(data, assignedUserId)
      if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 500) {
        throw new ApiError(400, 'Import between 1 and 500 lead rows at a time.')
      }
      const rows = body.rows.map((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new ApiError(400, `Lead row ${index + 1} is invalid.`)
        const lead = row as Record<string, unknown>
        const rowAssignedUserId = text(lead.assignedUserId) || assignedUserId
        requireActiveSalesExecutive(data, rowAssignedUserId)
        return { ...lead, assignedUserId: rowAssignedUserId }
      })
      const result = await importWorkbookSalesLeads({
        id: user.id, role: user.role, assignedUserId,
        rows,
      })
      sendJson(response, 200, result)
      return
    }
    if (action === 'addSalesLead') {
      requireAdmin(user)
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for sales lead validation.')
      if (!body.lead || typeof body.lead !== 'object' || Array.isArray(body.lead)) throw new ApiError(400, 'Enter lead details.')
      const lead = body.lead as Record<string, unknown>
      const assignedUserId = requiredText(lead.assignedUserId, 'Sales Executive', 120)
      requireActiveSalesExecutive(data, assignedUserId)
      const result = await addWorkbookSalesLead({ id: user.id, role: user.role, lead })
      sendJson(response, 201, result)
      return
    }
    if (action === 'assignSalesLead') {
      requireAdmin(user)
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for sales lead assignment.')
      const assignedUserId = requiredText(body.assignedUserId, 'Sales Executive', 120)
      requireActiveSalesExecutive(data, assignedUserId)
      const result = await assignWorkbookSalesLead({
        id: user.id, role: user.role,
        leadId: requiredText(body.leadId, 'Lead', 160),
        assignedUserId,
      })
      sendJson(response, 200, result)
      return
    }
    if (action === 'recordSalesActivity') {
      if (!['Sales Executive', 'Super Admin'].includes(user.role)) {
        throw new ApiError(403, 'Only the assigned Sales Executive or Super Admin can update a lead.')
      }
      const status = requiredText(body.status, 'Lead status', 30)
      const activityType = requiredText(body.activityType, 'Activity type', 20)
      const outcome = requiredText(body.outcome, 'Call outcome', 180)
      const notes = requiredText(body.notes, 'Call notes', 1000)
      const nextFollowUp = text(body.nextFollowUp)
      if (!['New', 'Contacted', 'Qualified', 'Follow-up', 'Converted', 'Lost'].includes(status) ||
          !['Call', 'WhatsApp', 'Meeting', 'Note'].includes(activityType)) {
        throw new ApiError(400, 'Choose a valid lead status and activity type.')
      }
      if (nextFollowUp && !/^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp)) throw new ApiError(400, 'Choose a valid follow-up date.')
      const result = await recordWorkbookSalesActivity({
        id: user.id, role: user.role,
        leadId: requiredText(body.leadId, 'Lead', 160),
        status, activityType, outcome, notes, nextFollowUp,
      })
      sendJson(response, 200, result)
      return
    }
    if (action === 'createSalesOrder') {
      if (user.role !== 'Sales Executive') throw new ApiError(403, 'Only a Sales Executive can book a sales order.')
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for order validation.')
      const leadId = text(body.leadId)
      const customerName = text(body.customerName)
      const productName = text(body.productName)
      if (leadId.length > 160 || customerName.length > 180 || productName.length > 300) {
        throw new ApiError(400, 'Customer name, product name, or lead ID is too long.')
      }
      if (leadId) {
        const assignedLead = optionalRecords(data, 'Sales_Leads').find(row =>
          text(row['Lead ID']) === leadId && text(row['Assigned User ID']) === user.id,
        )
        if (!assignedLead) throw new ApiError(403, 'You can only book orders for your assigned leads.')
      } else if (!customerName) {
        throw new ApiError(400, 'Choose an assigned lead or enter a customer name.')
      }
      const sku = requiredText(body.sku, 'Product SKU', 100)
      if (!productionSkus(getSnapshot(data, user).products).some(product => product.sku.toLowerCase() === sku.toLowerCase())) {
        throw new ApiError(400, 'Choose an active product SKU.')
      }
      const quantity = Number(body.quantity)
      const unitPrice = Number(body.unitPrice)
      const notes = text(body.notes)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000 ||
          !Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 100000000 || notes.length > 500) {
        throw new ApiError(400, 'Enter a valid order quantity, unit price, and note of 500 characters or fewer.')
      }
      const result = await createWorkbookSalesOrder({
        id: user.id, role: user.role, leadId, customerName, sku, productName, quantity, unitPrice,
        notes,
      })
      sendJson(response, 201, result)
      return
    }
    if (action === 'cancelSalesOrder') {
      if (!['Sales Executive', 'Super Admin'].includes(user.role)) {
        throw new ApiError(403, 'This account cannot cancel sales orders.')
      }
      const result = await cancelWorkbookSalesOrder({
        id: user.id, role: user.role, orderId: requiredText(body.orderId, 'Sales order', 160),
      })
      sendJson(response, 200, result)
      return
    }
    if (action === 'setSalesTarget') {
      requireAdmin(user)
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for sales target validation.')
      const salesUserId = requiredText(body.salesUserId, 'Sales Executive', 120)
      requireActiveSalesExecutive(data, salesUserId)
      const period = text(body.period).toLowerCase()
      const periodKey = requiredText(body.periodKey, 'Target period', 7)
      const targetAmount = Number(body.targetAmount)
      const validKey = period === 'monthly' ? /^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)
        : period === 'yearly' ? /^\d{4}$/.test(periodKey)
          : false
      if (!validKey || !Number.isFinite(targetAmount) || targetAmount < 0 || targetAmount > 100000000000) {
        throw new ApiError(400, 'Enter a valid monthly or yearly sales target amount.')
      }
      const result = await setWorkbookSalesTarget({
        id: user.id, role: user.role, salesUserId,
        period: period as 'monthly' | 'yearly', periodKey, targetAmount,
      })
      sendJson(response, 200, result)
      return
    }
    requireSupervisorOrAdmin(user)
    if (action === 'addProduct') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for product validation.')
      const product = await addProduct(data, user, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addVariant') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for SKU validation.')
      const product = await addVariant(data, user, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addMarketplaceListing') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for listing validation.')
      const listing = await addMarketplaceListing(data, user, body)
      sendJson(response, 201, { listing })
      return
    }
    if (action === 'addMachine') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for machine validation.')
      const machine = await addMachine(data, user, body)
      sendJson(response, 201, { machine })
      return
    }
    throw new ApiError(400, 'Choose a valid workbook operation.')
  } catch (error) {
    handleApiError(response, error, 'ERP workbook')
  }
}
