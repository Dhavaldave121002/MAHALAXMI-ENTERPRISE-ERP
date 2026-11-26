import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import auditHandler from './_lib/auditHandler.js'
import { getSessionClaims, getSessionUser, refreshSessionCookie, requireAdmin, requireProductionSupervisor, requireSupervisorOrAdmin } from './_lib/session.js'
import {
  addWorkbookMarketplaceListing,
  addWorkbookRawMaterial,
  addWorkbookSupplier,
  setWorkbookSupplierActive,
  recordWorkbookAccountExpense,
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
  reviewWorkbookProductionQuality,
  readWorkbookChatAttachment,
  recordWorkbookSalesActivity,
  sendWorkbookChatMessage,
  setWorkbookSalesTarget,
  setWorkbookProductionTarget,
  submitWorkbookGraphicDesignTask,
  updateWorkbookGraphicDesignProgress,
  reviewWorkbookGraphicDesignTask,
  setWorkbookChatTyping,
  readUsers,
  readSheetRecords,
  resetWorkbookData,
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
const SOCIAL_PLATFORMS = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn'] as const
const DESIGN_PROGRESS = ['Not started', 'In progress', 'Completed'] as const
type Machine = { id: string; name: string; type: string; operator: string; status: string }
type Production = {
  id: string
  date: string
  machine: string
  block: string
  sku: string
  product: string
  actual: number
  rejected: number
  qcStatus: 'Pending' | 'Reviewed'
  qcApproved: number
  qcRejected: number
  qcReviewedBy: string
  qcReviewedAt: string
  createdBy: string
}
type GraphicDesignTask = {
  id: string
  plannedDate: string
  month: string
  sku: string
  product: string
  platforms: string[]
  contentType: 'Post' | 'Video'
  brief: string
  caption: string
  script: string
  shootStatus: 'Not required' | 'Not started' | 'In progress' | 'Completed'
  editStatus: 'Not started' | 'In progress' | 'Completed'
  reviewStatus: 'Pending' | 'Approved' | 'Rejected'
  reviewNote: string
  createdById: string
  createdBy: string
  createdAt: string
  reviewedBy: string
  reviewedAt: string
}
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
  supplier: string; supplierId: string; issued: number; machineConsumption: number; stitchingConsumption: number;
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
  supplierId: string; supplier: string; unitCost: number; totalCost: number; unitPrice: number; totalAmount: number;
  hasRecordedCost: boolean; hasRecordedPrice: boolean;
  openingStock: number; closingStock: number; createdBy: string
}
type Supplier = {
  id: string; name: string; contactPerson: string; phone: string; email: string; address: string;
  notes: string; status: string; createdAt: string; createdBy: string; updatedAt: string; updatedBy: string
}
type AccountExpense = {
  id: string; date: string; category: string; description: string; amount: number;
  paymentMethod: string; referenceId: string; createdAt: string; createdBy: string
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
    supplierId: text(row['Supplier ID']),
    supplier: text(row.Supplier),
    unitCost: number(row['Unit Cost']),
    totalCost: number(row['Total Cost']),
    unitPrice: number(row['Unit Price']),
    totalAmount: number(row['Total Amount']),
    hasRecordedCost: row['Total Cost'] !== undefined && row['Total Cost'] !== null && row['Total Cost'] !== '',
    hasRecordedPrice: row['Total Amount'] !== undefined && row['Total Amount'] !== null && row['Total Amount'] !== '',
    openingStock: number(row['Opening Stock']),
    closingStock: number(row['Closing Stock']),
    createdBy: text(row['Created By']),
  }
}

function productionFromRecord(row: Record<string, unknown>, index: number): Production {
  const actual = number(row['Actual Quantity'])
  const rejected = number(row['Rejected Quantity'])
  const statusValue = text(row['QC Status'])
  const normalizedStatus = statusValue.toLowerCase()
  if (statusValue && normalizedStatus !== 'pending' && normalizedStatus !== 'reviewed') {
    throw new ApiError(503, 'A production record has an invalid QC status.')
  }

  const qcStatus = normalizedStatus === 'pending' ? 'Pending' : 'Reviewed'
  const approvedValue = row['QC Approved Quantity']
  const rejectedValue = row['QC Rejected Quantity']
  const qcApproved = approvedValue === undefined || approvedValue === '' || approvedValue === null
    ? qcStatus === 'Pending' ? 0 : Math.max(0, actual - rejected)
    : number(approvedValue)
  const qcRejected = rejectedValue === undefined || rejectedValue === '' || rejectedValue === null
    ? qcStatus === 'Pending' ? 0 : rejected
    : number(rejectedValue)
  if (
    !Number.isInteger(actual) || actual < 0 ||
    !Number.isInteger(rejected) || rejected < 0 || rejected > actual ||
    !Number.isInteger(qcApproved) || qcApproved < 0 ||
    !Number.isInteger(qcRejected) || qcRejected < 0 ||
    (qcStatus === 'Reviewed' && qcApproved + qcRejected !== actual) ||
    (qcStatus === 'Pending' && qcApproved + qcRejected > actual)
  ) throw new ApiError(503, 'A production record has invalid production or QC quantities.')
  return {
    id: text(row['Production ID']) || `PRO-${index + 1}`,
    date: dateKey(row.Date),
    machine: text(row['Machine ID']),
    block: text(row['Production Block']),
    sku: text(row['Variant SKU']) || text(row['Master SKU']),
    product: text(row['Product Name']),
    actual,
    rejected,
    qcStatus,
    qcApproved,
    qcRejected,
    qcReviewedBy: text(row['QC Reviewed By']),
    qcReviewedAt: text(row['QC Reviewed At']),
    createdBy: text(row['Created By']),
  }
}

function graphicDesignTaskFromRecord(row: Record<string, unknown>): GraphicDesignTask {
  const platforms = text(row.Platforms).split(',').map(value => value.trim()).filter(Boolean)
  const contentType = text(row['Content Type'])
  const shootStatus = text(row['Shoot Status'])
  const editStatus = text(row['Edit Status'])
  const reviewStatus = text(row['Review Status'])
  const month = text(row.Month)
  const plannedDate = dateKey(row['Planned Date'])
  if (
    !text(row['Task ID']) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) || plannedDate.slice(0, 7) !== month ||
    !text(row['Product SKU']) || !text(row['Product Name']) ||
    !platforms.length || platforms.some(platform => !SOCIAL_PLATFORMS.includes(platform as typeof SOCIAL_PLATFORMS[number])) ||
    !['Post', 'Video'].includes(contentType) ||
    (!DESIGN_PROGRESS.includes(shootStatus as typeof DESIGN_PROGRESS[number]) && shootStatus !== 'Not required') ||
    !DESIGN_PROGRESS.includes(editStatus as typeof DESIGN_PROGRESS[number]) ||
    !['Pending', 'Approved', 'Rejected'].includes(reviewStatus)
  ) throw new ApiError(503, 'The Graphic_Design_Tasks sheet contains an invalid task.')
  return {
    id: text(row['Task ID']),
    plannedDate,
    month,
    sku: text(row['Product SKU']),
    product: text(row['Product Name']),
    platforms,
    contentType: contentType as GraphicDesignTask['contentType'],
    brief: text(row.Brief),
    caption: text(row.Caption),
    script: text(row.Script),
    shootStatus: shootStatus as GraphicDesignTask['shootStatus'],
    editStatus: editStatus as GraphicDesignTask['editStatus'],
    reviewStatus: reviewStatus as GraphicDesignTask['reviewStatus'],
    reviewNote: text(row['Review Note']),
    createdById: text(row['Created By ID']),
    createdBy: text(row['Created By']),
    createdAt: text(row['Created At']),
    reviewedBy: text(row['Reviewed By']),
    reviewedAt: text(row['Reviewed At']),
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

export function getSnapshot(data: WorkbookData, user: PublicUser) {
  if (user.role === 'E-commerce Executive' || user.role === 'E-commerce Manager') {
    return {
      products: [],
      marketplaceListings: [],
      machines: [],
      production: [],
      productionTargets: [],
      rawMaterials: [],
      finishedGoods: [],
      stockMovements: [],
      suppliers: [],
      accountExpenses: [],
      salesLeads: [],
      salesActivities: [],
      salesOrders: [],
      salesTargets: [],
      salesUsers: [],
      graphicDesignTasks: [],
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
      supplierId: text(row['Supplier ID']),
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
      supplierId: text(row['Supplier ID']),
      supplier: text(row.Supplier),
      unitCost: number(row['Unit Cost']),
      totalCost: number(row['Total Cost']),
      unitPrice: number(row['Unit Price']),
      totalAmount: number(row['Total Amount']),
      hasRecordedCost: row['Total Cost'] !== undefined && row['Total Cost'] !== null && row['Total Cost'] !== '',
      hasRecordedPrice: row['Total Amount'] !== undefined && row['Total Amount'] !== null && row['Total Amount'] !== '',
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
  const graphicDesignTasks = optionalRecords(data, 'Graphic_Design_Tasks')
    .filter(row => user.role === 'Super Admin' || (user.role === 'Graphic Designer' && text(row['Created By ID']) === user.id))
    .map(graphicDesignTaskFromRecord)
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
    return [productionFromRecord(row, index)]
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
  const suppliers: Supplier[] = optionalRecords(data, 'Suppliers').flatMap(row => {
    const id = text(row['Supplier ID'])
    const name = text(row['Supplier Name'])
    if (!id || !name) return []
    return [{
      id,
      name,
      contactPerson: text(row['Contact Person']),
      phone: text(row.Phone),
      email: text(row.Email),
      address: text(row.Address),
      notes: text(row.Notes),
      status: text(row.Status) || 'Active',
      createdAt: text(row['Created At']),
      createdBy: text(row['Created By']),
      updatedAt: text(row['Updated At']),
      updatedBy: text(row['Updated By']),
    }]
  })
  const accountExpenses: AccountExpense[] = optionalRecords(data, 'Accounts_Expenses').flatMap(row => {
    const id = text(row['Expense ID'])
    if (!id) return []
    const date = dateKey(row.Date)
    const amount = number(row.Amount)
    if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date) || !Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(503, 'The Accounts_Expenses sheet contains an invalid expense record.')
    }
    return [{
      id,
      date,
      category: text(row.Category),
      description: text(row.Description),
      amount,
      paymentMethod: text(row['Payment Method']),
      referenceId: text(row['Reference ID']),
      createdAt: text(row['Created At']),
      createdBy: text(row['Created By']),
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
    suppliers: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? suppliers : [],
    accountExpenses: user.role === 'Super Admin' ? accountExpenses : [],
    salesLeads,
    salesActivities,
    salesOrders,
    salesTargets,
    salesUsers,
    graphicDesignTasks: user.role === 'Super Admin' || user.role === 'Graphic Designer' ? graphicDesignTasks : [],
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
  let finishedGoods: Record<string, unknown>[] = []
  if (body.finishedGoods !== undefined) {
    if (!Array.isArray(body.finishedGoods)) throw new ApiError(400, 'finishedGoods must be an array.')
    if (body.finishedGoods.length > 5000) throw new ApiError(400, 'finishedGoods cannot contain more than 5000 rows.')
    if (body.finishedGoods.length) {
      finishedGoods = marketplaceImportRows(body, 'finishedGoods', ['Product SKU', 'Product Name', 'Opening Stock'], 5000)
      for (const [index, item] of finishedGoods.entries()) {
        const openingStock = Number(item['Opening Stock'])
        if (!Number.isInteger(openingStock) || openingStock < 0 || openingStock > 10000000) {
          throw new ApiError(400, `finishedGoods row ${index + 1} Opening Stock must be a whole number from 0 to 10,000,000.`)
        }
      }
    }
  }
  for (const [index, listing] of listings.entries()) {
    if (!MARKETPLACES.includes(text(listing.Platform))) {
      throw new ApiError(400, `Marketplace_Listings_Import row ${index + 1} uses an unsupported platform.`)
    }
  }
  return importWorkbookMarketplaceCatalog({
    products, variants, listings, finishedGoods, createdBy: user.name, sessionUserId: user.id, sessionRole: user.role,
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
    qcStatus: 'Pending',
    qcApproved: 0,
    qcRejected: 0,
    qcReviewedBy: '',
    qcReviewedAt: '',
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

async function reviewProductionQuality(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  requireSupervisorOrAdmin(user)
  const productionId = requiredText(body.productionId, 'Production batch', 120)
  const rows = records(data, 'Production')
  const recordIndex = rows.findIndex(row => text(row['Production ID']) === productionId)
  if (recordIndex < 0) throw new ApiError(404, 'The production batch was not found.')
  const currentRecord = productionFromRecord(rows[recordIndex], recordIndex)
  if (currentRecord.qcStatus !== 'Pending') throw new ApiError(409, 'This batch is not awaiting quality review.')

  const approved = Number(body.approved)
  const rejected = Number(body.rejected)
  if (
    !Number.isInteger(approved) || approved < 0 ||
    !Number.isInteger(rejected) || rejected < 0 ||
    approved + rejected !== currentRecord.actual
  ) {
    throw new ApiError(400, `QC pass and reject quantities must be whole numbers that add up to ${currentRecord.actual}.`)
  }

  const result = await reviewWorkbookProductionQuality({
    id: user.id,
    role: user.role,
    productionId,
    approved,
    rejected,
    createdBy: user.name,
  })
  const updatedRecord = productionFromRecord(result.record, recordIndex)
  const stock = result.finishedGood
  const finishedGood: FinishedGood = {
    sku: text(stock['Product SKU']),
    name: text(stock['Product Name']) || text(stock['Product SKU']),
    openingStock: number(stock['Opening Stock']),
    productionReceived: number(stock['Production Received']),
    qualityApproved: number(stock['Quality Approved']),
    rejected: number(stock.Rejected),
    reservedStock: number(stock['Reserved Stock']),
    availableStock: number(stock['Available Stock']),
    dispatchedStock: number(stock['Dispatched Stock']),
    returnedStock: number(stock['Returned Stock']),
    damagedStock: number(stock['Damaged Stock']),
    adjustmentIn: number(stock['Adjustment In']),
    adjustmentOut: number(stock['Adjustment Out']),
    status: text(stock.Status) || 'Active',
  }
  return {
    record: updatedRecord,
    finishedGood,
    stockMovement: result.movement ? stockMovementFromRecord(result.movement) : null,
    backupName: result.backupName,
  }
}

function validateGraphicDesignDate(date: string, month: string) {
  const parsed = Date.parse(`${date}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) ||
      new Date(parsed).toISOString().slice(0, 10) !== date || date.slice(0, 7) !== month) {
    throw new ApiError(400, 'Choose a valid posting date within the selected month.')
  }
}

function mapGraphicDesignTask(record: Record<string, unknown>) {
  return graphicDesignTaskFromRecord(record)
}

async function submitGraphicDesignTask(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  if (user.role !== 'Graphic Designer') throw new ApiError(403, 'Only a Graphic Designer can submit social content tasks.')
  const plannedDate = requiredText(body.plannedDate, 'Planned posting date', 10)
  const month = requiredText(body.month, 'Plan month', 7)
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'Choose a valid plan month.')
  validateGraphicDesignDate(plannedDate, month)
  const sku = requiredText(body.sku, 'Product', 100)
  const product = productionSkus(getSnapshot(data, user).products).find(item => item.sku.toLowerCase() === sku.toLowerCase())
  if (!product) throw new ApiError(400, 'Choose an active product or variant from the catalog.')
  if (!Array.isArray(body.platforms)) throw new ApiError(400, 'Choose at least one social platform.')
  const platforms = [...new Set(body.platforms.map(value => text(value)))]
  if (!platforms.length || platforms.some(platform => !SOCIAL_PLATFORMS.includes(platform as typeof SOCIAL_PLATFORMS[number]))) {
    throw new ApiError(400, 'Choose at least one valid social platform.')
  }
  const contentType = text(body.contentType)
  if (!['Post', 'Video'].includes(contentType)) throw new ApiError(400, 'Choose Post or Video content.')
  const brief = requiredText(body.brief, 'Creative brief', 2000)
  const caption = text(body.caption)
  const script = text(body.script)
  if (caption.length > 2000 || script.length > 5000) throw new ApiError(400, 'Caption or script exceeds the allowed character limit.')
  if (contentType === 'Video' && !script) throw new ApiError(400, 'Add a video script or shot-by-shot description for video content.')
  const saved = await submitWorkbookGraphicDesignTask({
    id: user.id,
    role: user.role,
    plannedDate,
    month,
    sku: product.sku,
    productName: product.name,
    platforms,
    contentType,
    brief,
    caption,
    script,
  })
  return { task: mapGraphicDesignTask(saved.task), backupName: saved.backupName }
}

async function updateGraphicDesignProgress(user: PublicUser, body: Record<string, unknown>) {
  if (user.role !== 'Graphic Designer' && user.role !== 'Super Admin') {
    throw new ApiError(403, 'Only the task owner or Super Admin can update creative production progress.')
  }
  const taskId = requiredText(body.taskId, 'Creative task', 120)
  const shootStatus = text(body.shootStatus)
  const editStatus = text(body.editStatus)
  if (!(DESIGN_PROGRESS as readonly string[]).includes(editStatus) ||
      (shootStatus !== 'Not required' && !(DESIGN_PROGRESS as readonly string[]).includes(shootStatus))) {
    throw new ApiError(400, 'Choose valid shoot and edit statuses.')
  }
  return updateWorkbookGraphicDesignProgress({ id: user.id, role: user.role, taskId, shootStatus, editStatus })
    .then(saved => ({ task: mapGraphicDesignTask(saved.task), backupName: saved.backupName }))
}

async function reviewGraphicDesignTask(user: PublicUser, body: Record<string, unknown>) {
  if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can review social content tasks.')
  const taskId = requiredText(body.taskId, 'Creative task', 120)
  const decision = text(body.decision)
  if (decision !== 'Approved' && decision !== 'Rejected') throw new ApiError(400, 'Choose Approved or Rejected.')
  const reviewNote = text(body.reviewNote)
  if (reviewNote.length > 1000) throw new ApiError(400, 'Review notes must be 1,000 characters or fewer.')
  const saved = await reviewWorkbookGraphicDesignTask({
    id: user.id, role: user.role, taskId, decision, reviewNote, createdBy: user.name,
  })
  return { task: mapGraphicDesignTask(saved.task), backupName: saved.backupName }
}

async function addRawMaterial(user: PublicUser, body: Record<string, unknown>) {
  const sku = requiredText(body.sku, 'Material SKU', 100)
  const name = requiredText(body.name, 'Material name', 180)
  const unit = requiredText(body.unit, 'Unit', 40)
  const openingStock = nonnegativeNumber(body.openingStock, 'Opening stock')
  const reorderLevel = nonnegativeNumber(body.reorderLevel, 'Reorder level')
  const unitCost = nonnegativeNumber(body.unitCost, 'Average unit cost')
  const supplierId = requiredText(body.supplierId, 'Supplier', 120)
  const result = await addWorkbookRawMaterial({
    sku, name, unit, openingStock, reorderLevel, unitCost, supplierId, createdBy: user.name,
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
    supplierId: text(material['Supplier ID']),
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
  const supplierId = text(body.supplierId)
  const unitCost = body.unitCost === undefined || body.unitCost === '' ? undefined : nonnegativeNumber(body.unitCost, 'Unit cost')
  const unitPrice = body.unitPrice === undefined || body.unitPrice === '' ? undefined : nonnegativeNumber(body.unitPrice, 'Unit sale price')
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
    if (type === 'Purchase Inward' && (!supplierId || unitCost === undefined)) {
      throw new ApiError(400, 'Select a supplier and enter the purchase unit cost.')
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
    supplierId: supplierId.slice(0, 120),
    linkToDispatch,
    machineId: text(body.machineId).slice(0, 100),
    unitCost: unitCost === undefined ? '' : unitCost,
    unitPrice: unitPrice === undefined ? '' : unitPrice,
    createdBy: user.name,
    sessionUserId: user.id,
    sessionRole: user.role,
  })
  return result
}

async function addSupplier(user: PublicUser, body: Record<string, unknown>) {
  requireProductionSupervisor(user)
  const name = requiredText(body.name, 'Supplier name', 180)
  const contactPerson = text(body.contactPerson)
  const phone = text(body.phone)
  const email = text(body.email)
  const address = text(body.address)
  const notes = text(body.notes)
  if ([contactPerson, phone, email, address, notes].some(value => value.split('').some(character => character.charCodeAt(0) < 32))) {
    throw new ApiError(400, 'Supplier details cannot contain control characters.')
  }
  if (contactPerson.length > 120 || phone.length > 40 || email.length > 180 || address.length > 300 || notes.length > 500) {
    throw new ApiError(400, 'One or more supplier details exceed their supported length.')
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid supplier email address.')
  return addWorkbookSupplier({
    name, contactPerson, phone, email, address, notes,
    createdBy: user.name, sessionUserId: user.id, sessionRole: user.role,
  })
}

async function setSupplierActive(user: PublicUser, body: Record<string, unknown>) {
  requireProductionSupervisor(user)
  const supplierId = requiredText(body.supplierId, 'Supplier', 120)
  if (typeof body.active !== 'boolean') throw new ApiError(400, 'Choose whether the supplier is active.')
  return setWorkbookSupplierActive({
    supplierId, active: body.active, createdBy: user.name, sessionUserId: user.id, sessionRole: user.role,
  })
}

async function recordAccountExpense(user: PublicUser, body: Record<string, unknown>) {
  requireAdmin(user)
  if (!body.expense || typeof body.expense !== 'object' || Array.isArray(body.expense)) {
    throw new ApiError(400, 'Enter a valid expense record.')
  }
  const input = body.expense as Record<string, unknown>
  const date = requiredText(input.date, 'Expense date', 10)
  const dateValue = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00.000Z`) : Number.NaN
  if (!Number.isFinite(dateValue) || new Date(dateValue).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Enter a valid expense date.')
  }
  const category = requiredText(input.category, 'Expense category', 80)
  const description = requiredText(input.description, 'Description', 300)
  const amount = nonnegativeNumber(input.amount, 'Amount')
  if (amount <= 0 || amount > 1_000_000_000) throw new ApiError(400, 'Amount must be greater than zero and within the supported range.')
  const paymentMethod = requiredText(input.paymentMethod, 'Payment method', 40)
  if (!['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'].includes(paymentMethod)) {
    throw new ApiError(400, 'Choose a supported payment method.')
  }
  const referenceId = text(input.referenceId)
  if (referenceId.length > 100) throw new ApiError(400, 'Reference ID must be 100 characters or fewer.')
  return recordWorkbookAccountExpense({
    expense: { date, category, description, amount, paymentMethod, referenceId },
    createdBy: user.name, sessionUserId: user.id, sessionRole: user.role,
  })
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
      const sessionUser = await getSessionUser(request)
      if (sessionUser.role === 'E-commerce Executive' || sessionUser.role === 'E-commerce Manager') {
        const emptyWorkbook: WorkbookData = {
          name: 'Mahalaxmi-Enterprise-Master.xlsx',
          sheetCount: 0,
          sheetNames: [],
          sheets: {},
          capabilities: { sessionBoundWrites: true },
        }
        refreshSessionCookie(response, request, sessionUser, true)
        sendJson(response, 200, { ...getSnapshot(emptyWorkbook, sessionUser), user: sessionUser })
        return
      }
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
      'addProduction', 'reviewProductionQuality', 'submitGraphicDesignTask', 'addProduct', 'addVariant', 'addMarketplaceListing', 'addMachine', 'setProductionTarget',
    ]
    const sessionBoundActions = [
      'addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook', 'resetErpData',
      'addSupplier', 'setSupplierActive', 'recordAccountExpense',
      'importSalesLeads', 'addSalesLead', 'assignSalesLead', 'recordSalesActivity', 'createSalesOrder', 'cancelSalesOrder', 'setSalesTarget',
      'listChatData', 'listChatMessages', 'listChatTyping', 'setChatTyping', 'sendChatMessage', 'readChatAttachment',
    ]
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
    if (action === 'resetErpData') {
      requireAdmin(user)
      const confirmation = requiredText(body.confirmation, 'Reset confirmation', 20)
      if (confirmation !== 'RESET ERP') throw new ApiError(400, 'Type RESET ERP to confirm the data reset.')
      const result = await resetWorkbookData({ id: user.id, role: user.role, confirmation })
      sendJson(response, 200, { result })
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
    if (action === 'reviewProductionQuality') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for QC validation.')
      const result = await reviewProductionQuality(data, user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'submitGraphicDesignTask') {
      if (!data) throw new ApiError(500, 'Workbook data is unavailable for creative task validation.')
      const result = await submitGraphicDesignTask(data, user, body)
      sendJson(response, 201, result)
      return
    }
    if (action === 'updateGraphicDesignProgress') {
      const result = await updateGraphicDesignProgress(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'reviewGraphicDesignTask') {
      const result = await reviewGraphicDesignTask(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'addRawMaterial') {
      requireProductionSupervisor(user)
      const result = await addRawMaterial(user, body)
      sendJson(response, 201, result)
      return
    }
    if (action === 'applyStockMovement') {
      requireProductionSupervisor(user)
      const result = await applyStockMovement(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'addSupplier') {
      const result = await addSupplier(user, body)
      sendJson(response, 201, result)
      return
    }
    if (action === 'setSupplierActive') {
      const result = await setSupplierActive(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'recordAccountExpense') {
      const result = await recordAccountExpense(user, body)
      sendJson(response, 201, result)
      return
    }
    if (action === 'initializeZeroFinishedStock') {
      requireProductionSupervisor(user)
      const result = await initializeWorkbookZeroFinishedStock(user)
      sendJson(response, 200, result)
      return
    }
    if (action === 'archiveStockItem') {
      requireProductionSupervisor(user)
      const result = await archiveStockItem(user, body)
      sendJson(response, 200, result)
      return
    }
    if (action === 'deleteUnusedStockItem') {
      requireProductionSupervisor(user)
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
      const assignedUserId = requiredText(body.assignedUserId, 'Sales Executive', 120)
      if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 500) {
        throw new ApiError(400, 'Import between 1 and 500 lead rows at a time.')
      }
      const rows = body.rows.map((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new ApiError(400, `Lead row ${index + 1} is invalid.`)
        const lead = row as Record<string, unknown>
        const rowAssignedUserId = text(lead.assignedUserId) || assignedUserId
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
      if (!body.lead || typeof body.lead !== 'object' || Array.isArray(body.lead)) throw new ApiError(400, 'Enter lead details.')
      const lead = body.lead as Record<string, unknown>
      requiredText(lead.assignedUserId, 'Sales Executive', 120)
      const result = await addWorkbookSalesLead({ id: user.id, role: user.role, lead })
      sendJson(response, 201, result)
      return
    }
    if (action === 'assignSalesLead') {
      requireAdmin(user)
      const result = await assignWorkbookSalesLead({
        id: user.id, role: user.role,
        leadId: requiredText(body.leadId, 'Lead', 160),
        assignedUserId: requiredText(body.assignedUserId, 'Sales Executive', 120),
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
      const leadId = text(body.leadId)
      const customerName = text(body.customerName)
      const productName = text(body.productName)
      if (leadId.length > 160 || customerName.length > 180 || productName.length > 300) {
        throw new ApiError(400, 'Customer name, product name, or lead ID is too long.')
      }
      if (!leadId && !customerName) {
        throw new ApiError(400, 'Choose an assigned lead or enter a customer name.')
      }
      const sku = requiredText(body.sku, 'Product SKU', 100)
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
      const salesUserId = requiredText(body.salesUserId, 'Sales Executive', 120)
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
