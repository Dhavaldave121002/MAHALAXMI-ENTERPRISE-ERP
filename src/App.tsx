import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, ArrowUpRight, BarChart3,
  Boxes, Building2, CircleDollarSign, ClipboardCheck, MessageCircle,
  Factory, FileSpreadsheet, Gauge, LayoutDashboard, Menu, Package,
  RotateCcw, Search, Settings, ShoppingCart, Target, Truck, UserCog, Users,
  Plus, Download, Upload, Bell, CheckCircle2, LogOut, LockKeyhole, Video,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as XLSX from 'xlsx'
import { SalesDailyReportView, SalesDashboardView, SalesLeadsView, SalesOrdersView } from './Sales'
import { ScreenRecordingControl, type ScreenRecordingController } from './ScreenRecording'
const CameraMonitoringView = lazy(() => import('./ScreenMonitoring').then(module => ({ default: module.ScreenMonitoringView })))
const ChatView = lazy(() => import('./Chat').then(module => ({ default: module.ChatView })))
import type { SalesAccount, SalesActivity, SalesActivityType, SalesLead, SalesLeadImportRow, SalesLeadStatus, SalesOrder, SalesTarget, SalesTargetPeriod } from './salesTypes'
import './App.css'

type Module = 'Dashboard' | 'Sales Dashboard' | 'Sales Daily Report' | 'Leads' | 'Production' | 'Production Targets' | 'Stitching' | 'Graphic Design' | 'Raw Material' | 'Finished Goods' |
  'Product Catalog' | 'Orders' | 'Inventory' |
  'Stock Movement' | 'Shipping & Delivery' | 'Returns & RTO' | 'E-commerce Workspace' | 'E-commerce Stock' |
  'E-commerce Orders' | 'Shipping Labels' | 'Daily Work Report' | 'Machines' | 'Quality Control' | 'Employees' |
  'Suppliers' | 'Accounts' | 'Reports' | 'Excel Management' | 'User Management' | 'Settings' | 'Audit Logs' | 'Camera Monitoring' | 'Chat'

type AuditEvent = {
  id: string
  timestamp: string
  userId: string
  userName: string
  role: Role
  action: string
  target: string
  outcome: string
}

type Product = {
  id: string; sku: string; masterSku: string; name: string; category: string; mrp: number; stock: number;
  status: 'Active' | 'Draft'; size: string; color: string; packQuantity: number; isVariant: boolean
}

type MarketplaceListing = {
  id: string; platform: string; platformSku: string; productSku: string; masterSku: string;
  productName: string; mrp: number; sellingPrice: number; status: string; createdBy?: string; createdAt?: string
}
type MarketplaceImportRows = {
  products: Record<string, unknown>[]
  variants: Record<string, unknown>[]
  listings: Record<string, unknown>[]
  finishedGoods: Record<string, unknown>[]
  issues: Record<string, unknown>[]
}
type MarketplaceImportResult = {
  added: { products: number; variants: number; listings: number }
  updated?: { products: number; variants: number; listings: number }
  skipped: { products: number; variants: number; listings: number }
  openingStock?: { added: number; skipped: number }
  renamedProducts?: number
  backupName: string
}
type ErpResetResult = {
  backupFolderName: string
  backupFiles: string[]
  clearedSheets: string[]
  clearedRecords: number
  archivedFolders: string[]
}
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
  createdBy?: string
}
type ProductionTargetPeriod = 'daily' | 'weekly' | 'monthly'
type ProductionTarget = {
  id: string; period: ProductionTargetPeriod; startDate: string; endDate: string; machineId: string; machineName: string;
  sku: string; productName: string; targetQuantity: number; actual: number; createdBy: string
}
type Role = 'Super Admin' | 'Production Supervisor' | 'Store Manager' | 'Machine Operator' | 'E-commerce Manager' | 'E-commerce Executive' | 'Sales Executive' | 'Graphic Designer'
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
type GraphicDesignDailyReport = {
  id: string
  date: string
  userId: string
  userName: string
  completed: string
  pending: string
  issues: string
  createdAt: string
  updatedAt: string
}
type EcommercePlatform = 'AMAZON' | 'FLIPKART' | 'MEESHO' | 'SHOPIFY' | 'MYNTRA'
type UserAccount = { id: string; name: string; username: string; role: Role; active: boolean; platforms: EcommercePlatform[]; managerId: string }
type EcommerceListing = { id: string; platform: EcommercePlatform; platformSku: string; productSku: string; productName: string; mrp: number; sellingPrice: number; availableStock: number; stockStatus: string; status: string }
type EcommerceMovement = { id: string; date: string; platform: EcommercePlatform; orderNumber: string; type: string; sku: string; quantity: number; unitSellingPrice: number; reason: string }
type EcommerceLabel = { id: string; platform: EcommercePlatform; orderNumber: string; fileName: string; uploadedAt: string; uploadedBy: string }
type EcommerceExecutiveTarget = { executiveId: string; executiveName: string; platforms: EcommercePlatform[]; dailyTarget: number; monthlyTarget: number }
type EcommerceManagerTarget = { managerId: string; managerName: string; platforms: EcommercePlatform[]; dailyTarget: number; monthlyTarget: number }
type EcommerceTargetData = { dailyTarget?: number; monthlyTarget?: number; executives?: EcommerceExecutiveTarget[]; managers?: EcommerceManagerTarget[] }
type EcommerceWorkspaceData = { platforms: EcommercePlatform[]; listings: EcommerceListing[]; movements: EcommerceMovement[]; labels: EcommerceLabel[]; targets: EcommerceTargetData; team?: UserAccount[] }
type EcommerceDailyReport = { id: string; date: string; platform: EcommercePlatform | 'TEAM'; userName: string; completed: string; pending: string; issues: string; updatedAt: string }
type EcommerceTaskStatus = 'Assigned' | 'In Progress' | 'Submitted' | 'Needs Changes' | 'Approved'
type EcommerceTask = {
  id: string
  managerId: string
  managerName: string
  executiveId: string
  executiveName: string
  taskDate: string
  title: string
  description: string
  status: EcommerceTaskStatus
  createdAt: string
  updatedAt: string
  reviewedBy: string
  reviewedAt: string
  reviewNote: string
}
type EcommercePlatformSummary = { platform: EcommercePlatform; dispatchedOrders: number; dispatchedUnits: number; dispatchedRevenue: number; returnValue: number; damagedValue: number; returnedOrders: number; returnedUnits: number; damagedOrders: number; damagedUnits: number; dailyReports: number }
type Machine = { id: string; name: string; type: string; operator: string; status: string }
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
type WorkbookSnapshot = {
  products: Product[]
  marketplaceListings: MarketplaceListing[]
  machines: Machine[]
  production: Production[]
  productionTargets: ProductionTarget[]
  rawMaterials: RawMaterial[]
  finishedGoods: FinishedGood[]
  stockMovements: StockMovement[]
  suppliers: Supplier[]
  accountExpenses: AccountExpense[]
  salesLeads: SalesLead[]
  salesActivities: SalesActivity[]
  salesOrders: SalesOrder[]
  salesTargets: SalesTarget[]
  salesUsers: SalesAccount[]
  graphicDesignTasks: GraphicDesignTask[]
  workbookMeta: { loaded: boolean; name: string; sheetCount: number }
}
type AuthStatus = 'checking' | 'ready' | 'unavailable'

function auditFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (/unknown erp action|deployment is outdated/i.test(message)) {
    return 'ERP activity logging is unavailable because the Apps Script deployment is outdated. The Super Admin must deploy the latest Code.gs as a new web-app version.'
  }
  if (/invalid api secret/i.test(message)) {
    return 'ERP activity logging failed: GOOGLE_APPS_SCRIPT_SECRET in Vercel does not match the secret configured in Apps Script. The administrator must align them and redeploy; do not share the secret in chat.'
  }
  if (/permission|authorization|not authorized|external_request/i.test(message)) {
    return 'ERP activity logging failed because Apps Script needs authorization. The Apps Script owner must approve the required Google Sheets and Drive permissions, then redeploy the web app.'
  }
  if (/audit spreadsheet|audit events sheet/i.test(message)) {
    return 'ERP activity logging failed because the private audit spreadsheet is missing or misconfigured. The administrator should check Apps Script Executions and the private audit-log setup.'
  }
  return 'ERP activity logging is temporarily unavailable. The ERP session can continue; the administrator should check the Vercel function logs and Apps Script Executions.'
}

const navSections: { label: string; items: Module[] }[] = [
  { label: 'MAIN', items: ['Dashboard', 'Production', 'Production Targets', 'Stitching', 'Quality Control'] },
  { label: 'COMMUNICATION', items: ['Chat'] },
  { label: 'INVENTORY', items: ['Raw Material', 'Finished Goods', 'Inventory', 'Stock Movement', 'Machines'] },
  { label: 'CATALOG', items: ['Product Catalog'] },
  { label: 'SALES', items: ['Sales Dashboard', 'Sales Daily Report', 'Leads', 'Orders', 'Shipping & Delivery', 'Returns & RTO'] },
  { label: 'E-COMMERCE', items: ['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels'] },
  { label: 'CREATIVE', items: ['Graphic Design'] },
  { label: 'WORK REPORTS', items: ['Daily Work Report'] },
  { label: 'MANAGEMENT', items: ['Employees', 'Suppliers', 'Accounts', 'Reports'] },
  { label: 'ADMIN', items: ['Camera Monitoring', 'Settings'] },
]
const settingsModules: Module[] = ['User Management', 'Excel Management', 'Audit Logs']
const marketplaces = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
const socialPlatforms = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn']
const deliveryChannels = ['DIRECT', 'AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
const ecommercePlatforms: EcommercePlatform[] = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
const deliveryPartnersByChannel: Record<string, string[]> = {
  DIRECT: ['CUSTOMER PICKUP', 'OWN DELIVERY', 'OTHER'],
  AMAZON: ['AMAZON', 'AMAZON FLEX', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  FLIPKART: ['FLIPKART', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  MEESHO: ['MEESHO', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  SHOPIFY: ['SHOPIFY DELIVERY', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  MYNTRA: ['MYNTRA DELIVERY', 'SHREE ANJI COURIER', 'DELIVERY APP'],
}
const deliveryMarketplacePlatforms: Record<string, string[]> = {
  DIRECT: [],
  AMAZON: ['AMAZON', 'AMAZON.IN', 'AMAZON.COM'],
  FLIPKART: ['FLIPKART'],
  MEESHO: ['MEESHO'],
  SHOPIFY: ['SHOPIFY'],
  MYNTRA: ['MYNTRA'],
}
const productionBlocks = [
  { name: 'Block 1', time: '09:30 AM – 12:30 PM', startMinute: 9 * 60 + 30, endMinute: 12 * 60 + 30 },
  { name: 'Block 2', time: '01:00 PM – 04:00 PM', startMinute: 13 * 60, endMinute: 16 * 60 },
  { name: 'Block 3', time: '04:20 PM – 07:00 PM', startMinute: 16 * 60 + 20, endMinute: 19 * 60 },
]

const moduleIcons: Record<Module, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard, 'Sales Dashboard': BarChart3, 'Sales Daily Report': ClipboardCheck, Leads: Users, Production: Factory, 'Production Targets': Target, Stitching: ClipboardCheck, 'Raw Material': Boxes,
  'Finished Goods': Package, 'Product Catalog': Archive, Orders: ShoppingCart, Inventory: Boxes,
  'Stock Movement': ArrowUpRight,
  'Shipping & Delivery': Truck, 'Returns & RTO': RotateCcw, Machines: Gauge,
  'Quality Control': ClipboardCheck, Employees: Users, Suppliers: Building2,
  Accounts: CircleDollarSign, Reports: BarChart3, 'Excel Management': FileSpreadsheet,
  'User Management': UserCog, Settings, 'Audit Logs': Archive, 'E-commerce Workspace': ShoppingCart,
  'E-commerce Stock': Boxes, 'E-commerce Orders': Truck, 'Shipping Labels': FileSpreadsheet,
  'Daily Work Report': ClipboardCheck, 'Camera Monitoring': Video,
  'Graphic Design': FileSpreadsheet,
  Chat: MessageCircle,
} as Record<Module, typeof LayoutDashboard>

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function landingModuleForRole(role: Role): Module {
  if (role === 'E-commerce Executive' || role === 'E-commerce Manager') return 'E-commerce Workspace'
  if (role === 'Sales Executive') return 'Sales Dashboard'
  if (role === 'Graphic Designer') return 'Graphic Design'
  return 'Dashboard'
}

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function indiaMonthKey(date = new Date()) {
  return indiaDateKey(date).slice(0, 7)
}

function monthForTimestamp(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}`
}

function dateForTimestamp(value: string) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? indiaDateKey(date) : ''
}

function summarizeEcommercePlatform(
  platform: EcommercePlatform,
  movements: EcommerceMovement[],
  reports: EcommerceDailyReport[],
  month: string,
): EcommercePlatformSummary {
  const rows = movements.filter(item => item.platform === platform && monthForTimestamp(item.date) === month)
  const rowsOfType = (type: string) => rows.filter(item => item.type === type)
  const uniqueOrders = (items: EcommerceMovement[]) => new Set(items.map(item => item.orderNumber.trim().toLowerCase()).filter(Boolean)).size
  const dispatched = rowsOfType('Dispatch')
  const returned = rowsOfType('Return')
  const damaged = rowsOfType('Damage')
  return {
    platform,
    dispatchedOrders: uniqueOrders(dispatched),
    dispatchedUnits: dispatched.reduce((total, item) => total + item.quantity, 0),
    dispatchedRevenue: dispatched.reduce((total, item) => total + item.quantity * (item.unitSellingPrice || 0), 0),
    returnedOrders: uniqueOrders(returned),
    returnedUnits: returned.reduce((total, item) => total + item.quantity, 0),
    damagedOrders: uniqueOrders(damaged),
    damagedUnits: damaged.reduce((total, item) => total + item.quantity, 0),
    returnValue: returned.reduce((total, item) => total + item.quantity * (item.unitSellingPrice || 0), 0),
    damagedValue: damaged.reduce((total, item) => total + item.quantity * (item.unitSellingPrice || 0), 0),
    dailyReports: reports.filter(report => report.platform === platform && report.date.slice(0, 7) === month).length,
  }
}

function countAssignedDispatchedOrders(
  movements: EcommerceMovement[],
  platforms: EcommercePlatform[],
  period: (movement: EcommerceMovement) => boolean,
) {
  const assignedPlatforms = new Set(platforms)
  return new Set(movements
    .filter(item => item.type === 'Dispatch' && assignedPlatforms.has(item.platform) && period(item))
    .map(item => `${item.platform}:${item.orderNumber.trim().toLowerCase()}`)
    .filter(order => !order.endsWith(':'))).size
}

function achievementPercent(actual: number, target: number) {
  return target > 0 ? Math.round((actual / target) * 100) : null
}

function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function productionTargetPeriodRange(period: ProductionTargetPeriod, dateKey: string) {
  if (period === 'daily') return { startDate: dateKey, endDate: dateKey }
  if (period === 'weekly') {
    const weekday = new Date(`${dateKey}T12:00:00Z`).getUTCDay()
    const startDate = shiftDateKey(dateKey, weekday === 0 ? -6 : 1 - weekday)
    return { startDate, endDate: shiftDateKey(startDate, 6) }
  }
  const [year, month] = dateKey.split('-').map(Number)
  return {
    startDate: `${dateKey.slice(0, 7)}-01`,
    endDate: new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10),
  }
}

function formatIndiaDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return dateKey
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatIndiaWeekday(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(date)
}

function formatIndiaDateTime(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return value || '—'
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod')} IST`
}

function currentProductionBlock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find(part => part.type === 'hour')?.value)
  const minute = Number(parts.find(part => part.type === 'minute')?.value)
  const timeInMinutes = hour * 60 + minute
  return productionBlocks.find(block => timeInMinutes >= block.startMinute && timeInMinutes < block.endMinute)
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store', ...init })
  } catch {
    throw new Error('Could not connect to the ERP server. Check your internet connection and reload the page.')
  }
  let result: { error?: string } & Record<string, unknown>
  try {
    result = await response.json() as { error?: string } & Record<string, unknown>
  } catch {
    throw new Error('The ERP API returned an invalid response. Confirm the Vercel API routes are deployed and check the deployment logs.')
  }
  if (!response.ok) throw new ApiResponseError(response.status, result.error || 'The server request failed.')
  return result as T
}

class ApiResponseError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

function recordText(record: Record<string, unknown>, key: string) {
  return String(record[key] ?? '')
}

function recordNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key] ?? 0)
  return Number.isFinite(value) ? value : 0
}

function toSalesLead(record: Record<string, unknown>): SalesLead {
  const status = recordText(record, 'Status')
  if (!['New', 'Contacted', 'Qualified', 'Follow-up', 'Converted', 'Lost'].includes(status)) {
    throw new Error('The saved sales lead returned an invalid status.')
  }
  return {
    id: recordText(record, 'Lead ID'),
    name: recordText(record, 'Name'),
    company: recordText(record, 'Company'),
    phone: recordText(record, 'Phone'),
    email: recordText(record, 'Email'),
    productInterest: recordText(record, 'Product Interest'),
    notes: recordText(record, 'Notes'),
    referenceUrl: recordText(record, 'Reference URL'),
    assignedUserId: recordText(record, 'Assigned User ID'),
    assignedUserName: recordText(record, 'Assigned User Name'),
    status: status as SalesLeadStatus,
    nextFollowUp: recordText(record, 'Next Follow-Up'),
    createdAt: recordText(record, 'Created At'),
    createdBy: recordText(record, 'Created By'),
    updatedAt: recordText(record, 'Updated At'),
  }
}

function toSalesActivity(record: Record<string, unknown>): SalesActivity {
  const type = recordText(record, 'Activity Type')
  if (!['Call', 'WhatsApp', 'Meeting', 'Note'].includes(type)) {
    throw new Error('The saved sales activity returned an invalid type.')
  }
  return {
    id: recordText(record, 'Activity ID'),
    leadId: recordText(record, 'Lead ID'),
    type: type as SalesActivityType,
    outcome: recordText(record, 'Outcome'),
    notes: recordText(record, 'Notes'),
    nextFollowUp: recordText(record, 'Next Follow-Up'),
    createdAt: recordText(record, 'Created At'),
    createdBy: recordText(record, 'Created By'),
    createdByName: recordText(record, 'Created By Name'),
  }
}

function toSalesOrder(record: Record<string, unknown>): SalesOrder {
  return {
    id: recordText(record, 'Order ID'),
    createdAt: recordText(record, 'Created At'),
    salesUserId: recordText(record, 'Sales User ID'),
    salesUserName: recordText(record, 'Sales User Name'),
    leadId: recordText(record, 'Lead ID'),
    customerName: recordText(record, 'Customer Name'),
    sku: recordText(record, 'Product SKU'),
    productName: recordText(record, 'Product Name'),
    quantity: recordNumber(record, 'Quantity'),
    unitPrice: recordNumber(record, 'Unit Price'),
    amount: recordNumber(record, 'Amount'),
    fulfilledQuantity: recordNumber(record, 'Fulfilled Quantity'),
    cancelledQuantity: recordNumber(record, 'Cancelled Quantity'),
    status: recordText(record, 'Status'),
    notes: recordText(record, 'Notes'),
  }
}

function salesTargetActualFromOrders(orders: SalesOrder[], salesUserId: string, period: SalesTargetPeriod, periodKey: string) {
  return orders.reduce((total, order) => {
    if (order.salesUserId !== salesUserId) return total
    const orderDate = dateForTimestamp(order.createdAt)
    if (period === 'monthly' && orderDate.slice(0, 7) !== periodKey) return total
    if (period === 'yearly' && orderDate.slice(0, 4) !== periodKey) return total
    const activeAmount = Math.max(0, order.amount - order.unitPrice * order.cancelledQuantity)
    return Math.round((total + activeAmount) * 100) / 100
  }, 0)
}

function toSalesTarget(record: Record<string, unknown>, orders: SalesOrder[]): SalesTarget {
  const period = recordText(record, 'Period').toLowerCase()
  if (period !== 'monthly' && period !== 'yearly') throw new Error('The saved sales target returned an invalid period.')
  const salesUserId = recordText(record, 'Sales User ID')
  const periodKey = recordText(record, 'Period Key')
  return {
    id: recordText(record, 'Target ID'),
    salesUserId,
    salesUserName: recordText(record, 'Sales User Name'),
    period,
    periodKey,
    targetAmount: recordNumber(record, 'Target Amount'),
    actualAmount: salesTargetActualFromOrders(orders, salesUserId, period, periodKey),
    updatedAt: recordText(record, 'Updated At'),
    updatedBy: recordText(record, 'Updated By'),
  }
}

function toFinishedGood(record: Record<string, unknown>): FinishedGood {
  const sku = recordText(record, 'Product SKU')
  return {
    sku,
    name: recordText(record, 'Product Name') || sku,
    openingStock: recordNumber(record, 'Opening Stock'),
    productionReceived: recordNumber(record, 'Production Received'),
    qualityApproved: recordNumber(record, 'Quality Approved'),
    rejected: recordNumber(record, 'Rejected'),
    reservedStock: recordNumber(record, 'Reserved Stock'),
    availableStock: recordNumber(record, 'Available Stock'),
    dispatchedStock: recordNumber(record, 'Dispatched Stock'),
    returnedStock: recordNumber(record, 'Returned Stock'),
    damagedStock: recordNumber(record, 'Damaged Stock'),
    adjustmentIn: recordNumber(record, 'Adjustment In'),
    adjustmentOut: recordNumber(record, 'Adjustment Out'),
    status: recordText(record, 'Status') || 'Active',
  }
}

function toRawMaterial(record: Record<string, unknown>): RawMaterial {
  return {
    id: recordText(record, 'Material ID'),
    sku: recordText(record, 'Material SKU'),
    name: recordText(record, 'Material Name'),
    unit: recordText(record, 'Unit'),
    openingStock: recordNumber(record, 'Opening Stock'),
    purchaseInward: recordNumber(record, 'Purchase Inward'),
    supplier: recordText(record, 'Supplier'),
    supplierId: recordText(record, 'Supplier ID'),
    issued: recordNumber(record, 'Material Issued'),
    machineConsumption: recordNumber(record, 'Machine Consumption'),
    stitchingConsumption: recordNumber(record, 'Stitching Consumption'),
    wastage: recordNumber(record, 'Wastage'),
    adjustmentIn: recordNumber(record, 'Adjustment In'),
    adjustmentOut: recordNumber(record, 'Adjustment Out'),
    closingStock: recordNumber(record, 'Closing Stock'),
    reorderLevel: recordNumber(record, 'Reorder Level'),
    averageUnitCost: recordNumber(record, 'Average Unit Cost'),
    stockValue: recordNumber(record, 'Stock Value'),
    status: recordText(record, 'Status') || 'Active',
  }
}

function toStockMovement(record: Record<string, unknown>): StockMovement {
  return {
    id: recordText(record, 'Movement ID'),
    date: recordText(record, 'Date/Time'),
    sku: recordText(record, 'SKU'),
    itemType: recordText(record, 'Item Type'),
    type: recordText(record, 'Movement Type'),
    quantity: recordNumber(record, 'Quantity'),
    referenceId: recordText(record, 'Reference ID'),
    machineId: recordText(record, 'Machine ID'),
    reason: recordText(record, 'Reason'),
    salesChannel: recordText(record, 'Sales Channel'),
    deliveryPartner: recordText(record, 'Delivery Partner'),
    supplierId: recordText(record, 'Supplier ID'),
    supplier: recordText(record, 'Supplier'),
    unitCost: recordNumber(record, 'Unit Cost'),
    totalCost: recordNumber(record, 'Total Cost'),
    unitPrice: recordNumber(record, 'Unit Price'),
    totalAmount: recordNumber(record, 'Total Amount'),
    hasRecordedCost: record['Total Cost'] !== undefined && record['Total Cost'] !== null && record['Total Cost'] !== '',
    hasRecordedPrice: record['Total Amount'] !== undefined && record['Total Amount'] !== null && record['Total Amount'] !== '',
    openingStock: recordNumber(record, 'Opening Stock'),
    closingStock: recordNumber(record, 'Closing Stock'),
    createdBy: recordText(record, 'Created By'),
  }
}

function toSupplier(record: Record<string, unknown>): Supplier {
  return {
    id: recordText(record, 'Supplier ID'),
    name: recordText(record, 'Supplier Name'),
    contactPerson: recordText(record, 'Contact Person'),
    phone: recordText(record, 'Phone'),
    email: recordText(record, 'Email'),
    address: recordText(record, 'Address'),
    notes: recordText(record, 'Notes'),
    status: recordText(record, 'Status') || 'Active',
    createdAt: recordText(record, 'Created At'),
    createdBy: recordText(record, 'Created By'),
    updatedAt: recordText(record, 'Updated At'),
    updatedBy: recordText(record, 'Updated By'),
  }
}

function toAccountExpense(record: Record<string, unknown>): AccountExpense {
  return {
    id: recordText(record, 'Expense ID'),
    date: recordText(record, 'Date'),
    category: recordText(record, 'Category'),
    description: recordText(record, 'Description'),
    amount: recordNumber(record, 'Amount'),
    paymentMethod: recordText(record, 'Payment Method'),
    referenceId: recordText(record, 'Reference ID'),
    createdAt: recordText(record, 'Created At'),
    createdBy: recordText(record, 'Created By'),
  }
}

export default function App() {
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
  const [module, setModule] = useState<Module>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [clock, setClock] = useState(new Date())
  const [sessionUser, setSessionUser] = useState<UserAccount | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [serverMessage, setServerMessage] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [users, setUsers] = useState<UserAccount[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([])
  const [production, setProduction] = useState<Production[]>([])
  const [productionTargets, setProductionTargets] = useState<ProductionTarget[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [accountExpenses, setAccountExpenses] = useState<AccountExpense[]>([])
  const [salesLeads, setSalesLeads] = useState<SalesLead[]>([])
  const [salesActivities, setSalesActivities] = useState<SalesActivity[]>([])
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([])
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([])
  const [salesAccounts, setSalesAccounts] = useState<SalesAccount[]>([])
  const [graphicDesignTasks, setGraphicDesignTasks] = useState<GraphicDesignTask[]>([])
  const [activityAuditWarning, setActivityAuditWarning] = useState('')
  const [toast, setToast] = useState('')
  const screenRecordingRef = useRef<ScreenRecordingController>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [zeroStockInitializationBusy, setZeroStockInitializationBusy] = useState(false)
  const workbookRefreshInFlight = useRef<Promise<void> | null>(null)
  const workbookLastRefreshAt = useRef(0)
  const lastAuditedModule = useRef('')
  const [workbookMeta, setWorkbookMeta] = useState({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })

  const applyWorkbookSnapshot = useCallback((data: WorkbookSnapshot) => {
    setProducts(data.products)
    setMarketplaceListings(data.marketplaceListings)
    setMachines(data.machines)
    setProduction(data.production)
    setProductionTargets(data.productionTargets)
    setRawMaterials(data.rawMaterials)
    setFinishedGoods(data.finishedGoods)
    setStockMovements(data.stockMovements)
    setSuppliers(data.suppliers)
    setAccountExpenses(data.accountExpenses)
    setSalesLeads(data.salesLeads)
    setSalesActivities(data.salesActivities)
    setSalesOrders(data.salesOrders)
    setSalesTargets(data.salesTargets)
    setSalesAccounts(data.salesUsers)
    setGraphicDesignTasks(data.graphicDesignTasks)
    setWorkbookMeta(data.workbookMeta)
    workbookLastRefreshAt.current = Date.now()
  }, [])

  const refreshWorkbook = useCallback(async () => {
    if (workbookRefreshInFlight.current) return workbookRefreshInFlight.current
    const request = (async () => {
      const data = await apiFetch<WorkbookSnapshot & { user: UserAccount }>('/api/erp')
      applyWorkbookSnapshot(data)
      setSessionUser(data.user)
    })()
    workbookRefreshInFlight.current = request
    try {
      await request
    } finally {
      if (workbookRefreshInFlight.current === request) workbookRefreshInFlight.current = null
    }
  }, [applyWorkbookSnapshot])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    localStorage.removeItem('erp-audit')
  }, [])

  useEffect(() => {
    if (!sessionUser) {
      lastAuditedModule.current = ''
      return
    }
    const visit = `${sessionUser.id}:${module}`
    if (lastAuditedModule.current === visit) return
    lastAuditedModule.current = visit
    let active = true
    void apiFetch('/api/erp?resource=audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'module_view', module }),
    }).then(() => {
      if (active) setActivityAuditWarning('')
    }).catch(error => {
      if (active) setActivityAuditWarning(auditFailureMessage(error))
    })
    return () => { active = false }
  }, [module, sessionUser])
  useEffect(() => {
    if (!mobileMenuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileMenuOpen])
  useEffect(() => {
    let active = true
    const initializeAuthentication = async () => {
      try {
        const statusResponse = await fetch('/api/auth/status', { cache: 'no-store' })
        const statusData = await statusResponse.json() as {
          error?: string
          configured?: boolean
          user?: UserAccount | null
          workbook?: WorkbookSnapshot
        }
        if (!statusResponse.ok || !statusData.configured) throw new Error(statusData.error || 'Google Sheets Apps Script is not configured.')
        if (!active) return
        if (statusData.user) {
          setSessionUser(statusData.user)
          setModule(landingModuleForRole(statusData.user.role))
          if (statusData.workbook) applyWorkbookSnapshot(statusData.workbook)
        }
        setAuthStatus('ready')
      } catch (error) {
        if (!active) return
        setAuthStatus('unavailable')
        setServerMessage(error instanceof Error ? error.message : 'Secure server login is unavailable.')
      }
    }
    void initializeAuthentication()
    return () => { active = false }
  }, [applyWorkbookSnapshot])
  useEffect(() => {
    let active = true
    if (!sessionUser || sessionUser.role !== 'Super Admin') {
      setUsers([])
      return () => { active = false }
    }
    fetch('/api/users', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json() as { error?: string; users?: UserAccount[] }
        if (!response.ok) throw new Error(result.error || 'Could not load user accounts')
        if (active) setUsers(result.users || [])
      })
      .catch(error => {
        if (active) setToast(error instanceof Error ? error.message : 'Could not load user accounts')
      })
    return () => { active = false }
  }, [sessionUser])
  useEffect(() => {
    let active = true
    if (!sessionUser) {
      setProducts([])
      setMarketplaceListings([])
      setMachines([])
      setProduction([])
      setRawMaterials([])
      setFinishedGoods([])
      setStockMovements([])
      setSalesLeads([])
      setSalesActivities([])
      setSalesOrders([])
      setSalesTargets([])
      setSalesAccounts([])
      setWorkbookMeta({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })
      return () => { active = false }
    }
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - workbookLastRefreshAt.current < 30_000) return
      void refreshWorkbook()
        .catch(error => {
          if (!active) return
          if (error instanceof ApiResponseError && error.status === 401) {
            setLoginError(error.message)
            setSessionUser(null)
            return
          }
          setToast(error instanceof Error ? error.message : 'Could not load the shared workbook')
        })
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [sessionUser, refreshWorkbook])

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2600) }

  const globalSearchResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query.length < 2) return []
    const matchedListings = marketplaceListings.filter(listing =>
      `${listing.platform} ${listing.platformSku} ${listing.productSku} ${listing.masterSku} ${listing.productName}`.toLowerCase().includes(query)
    )
    const matchingProducts = products.filter(product =>
      `${product.name} ${product.sku} ${product.masterSku} ${product.category}`.toLowerCase().includes(query)
    )
    const listingProducts = matchedListings.flatMap(listing => {
      const product = products.find(item => item.sku.toLowerCase() === listing.productSku.toLowerCase())
      return product ? [product] : []
    })
    const uniqueProducts = new Map([...matchingProducts, ...listingProducts].map(product => [product.sku.toLowerCase(), product]))
    return [...uniqueProducts.values()].slice(0, 8).map(product => ({
      product,
      listings: marketplaceListings.filter(listing =>
        listing.productSku.toLowerCase() === product.sku.toLowerCase() &&
        (matchedListings.some(match => match.id === listing.id) || matchingProducts.includes(product))
      ),
    }))
  }, [marketplaceListings, products, search])

  const saveProduct = async (input: { sku: string; name: string; category: string; mrp: number }) => {
    const result = await apiFetch<{ product: Product }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProduct', ...input }),
    })
    setProducts(prev => [...prev.filter(item => item.sku.toLowerCase() !== result.product.sku.toLowerCase()), result.product])
    workbookLastRefreshAt.current = Date.now()
    notify('Product saved to the shared workbook')
    return result.product
  }

  const saveVariant = async (input: { masterSku: string; sku: string; size: string; color: string; packQuantity: number; mrp?: number; sellingPrice?: number }) => {
    const result = await apiFetch<{ product: Product }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addVariant', ...input }),
    })
    setProducts(prev => [...prev.filter(item => item.sku.toLowerCase() !== result.product.sku.toLowerCase()), result.product])
    workbookLastRefreshAt.current = Date.now()
    notify('SKU saved to the shared workbook')
    return result.product
  }

  const saveMarketplaceListing = async (input: { platform: string; platformSku: string; productSku: string; mrp: number; sellingPrice: number }) => {
    const result = await apiFetch<{ listing: MarketplaceListing }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addMarketplaceListing', ...input }),
    })
    setMarketplaceListings(prev => [result.listing, ...prev.filter(item => item.id !== result.listing.id)])
    workbookLastRefreshAt.current = Date.now()
    notify('Marketplace SKU saved to the shared workbook')
    return result.listing
  }

  const importMarketplaceWorkbook = async (rows: Pick<MarketplaceImportRows, 'products' | 'variants' | 'listings' | 'finishedGoods'>) => {
    const response = await apiFetch<{ result: MarketplaceImportResult }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'importMarketplaceWorkbook', ...rows }),
    })
    void refreshWorkbook().catch(error => {
      const detail = error instanceof Error ? ` ${error.message}` : ''
      notify(`Import saved, but the catalog could not refresh automatically.${detail} Do not retry the import.`)
    })
    notify(`Import complete: ${response.result.added.products + response.result.added.variants + response.result.added.listings} catalog rows and ${response.result.openingStock?.added ?? 0} opening-stock rows added; ${response.result.updated ? response.result.updated.products + response.result.updated.variants + response.result.updated.listings : 0} catalog rows updated; ${response.result.renamedProducts ?? 0} product SKUs renamed.`)
    return response.result
  }

  const resetErpData = async (confirmation: string) => {
    if (!sessionUser || sessionUser.role !== 'Super Admin') throw new Error('Only the Super Admin can reset ERP data.')
    const response = await apiFetch<{ result: ErpResetResult }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resetErpData', confirmation }),
    })
    setUsers([sessionUser])
    let refreshFailed = false
    try {
      await refreshWorkbook()
    } catch {
      refreshFailed = true
    }
    setUsers([sessionUser])
    setSalesAccounts([])
    setModule('Dashboard')
    notify(`ERP reset complete: ${response.result.clearedRecords} records cleared. Private backup: ${response.result.backupFolderName}.${refreshFailed ? ' Reload the page to refresh the live workbook.' : ''}`)
    return response.result
  }

  const saveMachine = async (input: Omit<Machine, 'id'>) => {
    const result = await apiFetch<{ machine: Machine }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addMachine', ...input }),
    })
    setMachines(prev => [...prev, result.machine])
    workbookLastRefreshAt.current = Date.now()
    notify(`${result.machine.id} saved to the shared workbook`)
    return result.machine
  }

  const saveProduction = async (input: { date: string; machine: string; block: string; sku: string; product: string; actual: number; rejected: number }) => {
    const result = await apiFetch<{ record: Production & { finishedGood?: FinishedGood; stockMovement?: StockMovement | null } }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProduction', ...input }),
    })
    setProduction(prev => [result.record, ...prev.filter(item => item.id !== result.record.id)])
    setProductionTargets(previous => previous.map(target => {
      const inPeriod = result.record.date >= target.startDate && result.record.date <= target.endDate
      const sameMachine = result.record.machine.toLowerCase() === target.machineId.toLowerCase()
      const sameProduct = target.sku
        ? result.record.sku.toLowerCase() === target.sku.toLowerCase()
        : !result.record.sku && result.record.product.toLowerCase() === target.productName.toLowerCase()
      return inPeriod && sameMachine && sameProduct
        ? { ...target, actual: target.actual + result.record.actual }
        : target
    }))
    const finishedGood = result.record.finishedGood
    if (finishedGood) {
      setFinishedGoods(prev => [finishedGood, ...prev.filter(item => item.sku.toLowerCase() !== finishedGood.sku.toLowerCase())])
      setProducts(prev => prev.map(item => item.sku.toLowerCase() === finishedGood.sku.toLowerCase()
        ? { ...item, stock: finishedGood.availableStock }
        : item))
    }
    const stockMovement = result.record.stockMovement
    if (stockMovement) {
      setStockMovements(prev => [stockMovement, ...prev.filter(item => item.id !== stockMovement.id)])
    }
    workbookLastRefreshAt.current = Date.now()
    notify('Production entry saved to the shared workbook')
    return result.record
  }

  const reviewProductionQuality = async (input: { productionId: string; approved: number; rejected: number }) => {
    const result = await apiFetch<{
      record: Production
      finishedGood: FinishedGood
      stockMovement: StockMovement | null
    }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reviewProductionQuality', ...input }),
    })
    setProduction(previous => previous.map(record => record.id === result.record.id ? result.record : record))
    setFinishedGoods(previous => [result.finishedGood, ...previous.filter(item => item.sku.toLowerCase() !== result.finishedGood.sku.toLowerCase())])
    setProducts(previous => previous.map(item => item.sku.toLowerCase() === result.finishedGood.sku.toLowerCase()
      ? { ...item, stock: result.finishedGood.availableStock }
      : item))
    const stockMovement = result.stockMovement
    if (stockMovement) {
      setStockMovements(previous => [stockMovement, ...previous.filter(item => item.id !== stockMovement.id)])
    }
    workbookLastRefreshAt.current = Date.now()
    notify('Quality review saved; approved quantity is now available in Finished Goods.')
    return result.record
  }

  const submitGraphicDesignTask = async (input: {
    plannedDate: string
    month: string
    sku: string
    platforms: string[]
    contentType: 'Post' | 'Video'
    brief: string
    caption: string
    script: string
  }) => {
    const result = await apiFetch<{ task: GraphicDesignTask }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submitGraphicDesignTask', ...input }),
    })
    setGraphicDesignTasks(previous => [result.task, ...previous.filter(task => task.id !== result.task.id)])
    workbookLastRefreshAt.current = Date.now()
    notify('Social content task submitted for Admin review.')
    return result.task
  }

  const updateGraphicDesignProgress = async (input: {
    taskId: string
    shootStatus: GraphicDesignTask['shootStatus']
    editStatus: GraphicDesignTask['editStatus']
  }) => {
    const result = await apiFetch<{ task: GraphicDesignTask }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateGraphicDesignProgress', ...input }),
    })
    setGraphicDesignTasks(previous => previous.map(task => task.id === result.task.id ? result.task : task))
    workbookLastRefreshAt.current = Date.now()
    notify('Shoot and edit progress saved.')
    return result.task
  }

  const reviewGraphicDesignTask = async (input: {
    taskId: string
    decision: 'Approved' | 'Rejected'
    reviewNote: string
  }) => {
    const result = await apiFetch<{ task: GraphicDesignTask }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reviewGraphicDesignTask', ...input }),
    })
    setGraphicDesignTasks(previous => previous.map(task => task.id === result.task.id ? result.task : task))
    workbookLastRefreshAt.current = Date.now()
    notify(`Creative task ${result.task.reviewStatus.toLowerCase()}.`)
    return result.task
  }

  const saveProductionTarget = async (input: {
    period: ProductionTargetPeriod; date: string; machineId: string; sku: string; productName: string; targetQuantity: number
  }) => {
    const result = await apiFetch<{ target: ProductionTarget; unchanged: boolean; backupName: string }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setProductionTarget', ...input }),
    })
    setProductionTargets(previous => [result.target, ...previous.filter(target => target.id !== result.target.id)])
    workbookLastRefreshAt.current = Date.now()
    notify(result.unchanged ? 'This production target is already up to date.' : 'Production target saved to the shared workbook.')
    return result.target
  }

  const refreshAfterSalesWrite = async () => {
    workbookLastRefreshAt.current = 0
    try {
      await refreshWorkbook()
    } catch {
      notify('Sales data was saved, but this view could not refresh. Reload before retrying.')
    }
  }

  const refreshSalesTargetActuals = (orders: SalesOrder[]) => {
    setSalesTargets(previous => previous.map(target => ({
      ...target,
      actualAmount: salesTargetActualFromOrders(orders, target.salesUserId, target.period, target.periodKey),
    })))
  }

  const importSalesLeads = async (rows: SalesLeadImportRow[], assignedUserId: string) => {
    const result = await apiFetch<{ added: number; skipped: number }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'importSalesLeads', rows, assignedUserId }),
    })
    await refreshAfterSalesWrite()
    return result
  }

  const addSalesLead = async (lead: Omit<SalesLeadImportRow, 'assignedUserId'> & { assignedUserId: string }) => {
    const result = await apiFetch<{ lead: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addSalesLead', lead }),
    })
    const savedLead = toSalesLead(result.lead)
    setSalesLeads(previous => [savedLead, ...previous.filter(item => item.id !== savedLead.id)])
    workbookLastRefreshAt.current = Date.now()
  }

  const assignSalesLead = async (leadId: string, assignedUserId: string) => {
    const result = await apiFetch<{ lead: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assignSalesLead', leadId, assignedUserId }),
    })
    const savedLead = toSalesLead(result.lead)
    setSalesLeads(previous => previous.map(lead => lead.id === savedLead.id ? savedLead : lead))
    workbookLastRefreshAt.current = Date.now()
    notify('Lead reassigned.')
  }

  const updateSalesLead = async (input: { leadId: string; status: SalesLeadStatus; activityType: SalesActivityType; outcome: string; notes: string; nextFollowUp: string }) => {
    const result = await apiFetch<{ lead: Record<string, unknown>; activity: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recordSalesActivity', ...input }),
    })
    const savedLead = toSalesLead(result.lead)
    const savedActivity = toSalesActivity(result.activity)
    setSalesLeads(previous => previous.map(lead => lead.id === savedLead.id ? savedLead : lead))
    setSalesActivities(previous => [savedActivity, ...previous.filter(activity => activity.id !== savedActivity.id)])
    workbookLastRefreshAt.current = Date.now()
    notify('Call update saved.')
  }

  const createSalesOrder = async (input: { leadId: string; customerName: string; sku: string; productName: string; quantity: number; unitPrice: number; notes: string }) => {
    const result = await apiFetch<{ order: Record<string, unknown>; item: Record<string, unknown>; movement: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createSalesOrder', ...input }),
    })
    const order = toSalesOrder(result.order)
    const orders = [order, ...salesOrders.filter(existing => existing.id !== order.id)]
    const item = toFinishedGood(result.item)
    const movement = toStockMovement(result.movement)
    setSalesOrders(orders)
    refreshSalesTargetActuals(orders)
    setFinishedGoods(previous => [item, ...previous.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
    setProducts(previous => previous.map(product => product.sku.toLowerCase() === item.sku.toLowerCase()
      ? { ...product, stock: item.availableStock }
      : product))
    setStockMovements(previous => [movement, ...previous.filter(existing => existing.id !== movement.id)])
    if (input.leadId) {
      setSalesLeads(previous => previous.map(lead => lead.id === input.leadId
        ? { ...lead, status: 'Converted', updatedAt: order.createdAt }
        : lead))
    }
    workbookLastRefreshAt.current = Date.now()
  }

  const cancelSalesOrder = async (orderId: string) => {
    const result = await apiFetch<{ order: Record<string, unknown>; item: Record<string, unknown>; movement: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancelSalesOrder', orderId }),
    })
    const order = toSalesOrder(result.order)
    const orders = [order, ...salesOrders.filter(existing => existing.id !== order.id)]
    const item = toFinishedGood(result.item)
    const movement = toStockMovement(result.movement)
    setSalesOrders(orders)
    refreshSalesTargetActuals(orders)
    setFinishedGoods(previous => [item, ...previous.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
    setProducts(previous => previous.map(product => product.sku.toLowerCase() === item.sku.toLowerCase()
      ? { ...product, stock: item.availableStock }
      : product))
    setStockMovements(previous => [movement, ...previous.filter(existing => existing.id !== movement.id)])
    workbookLastRefreshAt.current = Date.now()
  }

  const setSalesTarget = async (salesUserId: string, period: SalesTargetPeriod, periodKey: string, targetAmount: number) => {
    const result = await apiFetch<{ target: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setSalesTarget', salesUserId, period, periodKey, targetAmount }),
    })
    const target = toSalesTarget(result.target, salesOrders)
    setSalesTargets(previous => [target, ...previous.filter(existing => existing.id !== target.id)])
    workbookLastRefreshAt.current = Date.now()
  }

  const saveRawMaterial = async (input: { sku: string; name: string; unit: string; supplierId: string; openingStock: number; reorderLevel: number; unitCost: number }) => {
    const result = await apiFetch<{ material: RawMaterial; movement: StockMovement | null }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addRawMaterial', ...input }),
    })
    setRawMaterials(prev => [result.material, ...prev.filter(item => item.sku.toLowerCase() !== result.material.sku.toLowerCase())])
    const movement = result.movement
    if (movement) {
      setStockMovements(prev => [movement, ...prev.filter(item => item.id !== movement.id)])
    }
    workbookLastRefreshAt.current = Date.now()
    notify('Raw material saved to the shared workbook')
    return result.material
  }

  const applyStockMovement = async (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; unitPrice?: number; supplierId?: string; referenceId: string; machineId: string; reason: string; salesChannel?: string; deliveryPartner?: string; linkToDispatch?: boolean }) => {
    const result = await apiFetch<{ item: Record<string, unknown>; movement: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'applyStockMovement', ...input }),
    })
    const movement = toStockMovement(result.movement)
    if (input.kind === 'finished') {
      const item = toFinishedGood(result.item)
      setFinishedGoods(prev => [item, ...prev.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
      setProducts(prev => prev.map(product => product.sku.toLowerCase() === item.sku.toLowerCase()
        ? { ...product, stock: item.availableStock }
        : product))
    } else {
      const item = toRawMaterial(result.item)
      setRawMaterials(prev => [item, ...prev.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
    }
    setStockMovements(prev => [movement, ...prev.filter(existing => existing.id !== movement.id)])
    workbookLastRefreshAt.current = Date.now()
    if (input.kind === 'finished' && input.type === 'Dispatch' && input.salesChannel === 'DIRECT') {
      await refreshAfterSalesWrite()
    }
    notify('Stock movement saved to the ledger')
  }

  const saveSupplier = async (input: Omit<Supplier, 'id' | 'status' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>) => {
    const result = await apiFetch<{ supplier: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addSupplier', ...input }),
    })
    const supplier = toSupplier(result.supplier)
    setSuppliers(previous => [supplier, ...previous.filter(item => item.id !== supplier.id)])
    workbookLastRefreshAt.current = Date.now()
    notify('Supplier saved to the shared workbook')
    return supplier
  }

  const updateSupplierActive = async (supplierId: string, active: boolean) => {
    const result = await apiFetch<{ supplier: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setSupplierActive', supplierId, active }),
    })
    const supplier = toSupplier(result.supplier)
    setSuppliers(previous => previous.map(item => item.id === supplier.id ? supplier : item))
    workbookLastRefreshAt.current = Date.now()
  }

  const saveAccountExpense = async (input: Omit<AccountExpense, 'id' | 'createdAt' | 'createdBy'>) => {
    const result = await apiFetch<{ expense: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recordAccountExpense', expense: input }),
    })
    const expense = toAccountExpense(result.expense)
    setAccountExpenses(previous => [expense, ...previous.filter(item => item.id !== expense.id)])
    workbookLastRefreshAt.current = Date.now()
    notify('Expense recorded to the shared workbook')
    return expense
  }

  const initializeZeroFinishedStock = async () => {
    if (!window.confirm('Set every active product or variant with missing, zero, or negative finished-goods stock to 10,000? Each increase will be recorded in the stock ledger. Raw materials and SKUs already above zero will not change. This is a one-time operation.')) return
    setZeroStockInitializationBusy(true)
    try {
      const result = await apiFetch<{ updated: number; unchanged: number; archived: number; targetStock: number }>('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initializeZeroFinishedStock' }),
      })
      try {
        await refreshWorkbook()
      } catch {
        notify(`${result.updated} SKUs were adjusted, but the workbook view could not refresh. Reload before continuing.`)
        return
      }
      notify(`${result.updated} SKUs set to ${result.targetStock.toLocaleString('en-IN')}; ${result.unchanged} already had stock.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Zero-stock initialization failed')
    } finally {
      setZeroStockInitializationBusy(false)
    }
  }

  const archiveStockItem = async (kind: 'raw' | 'finished', sku: string) => {
    const result = await apiFetch<{ item: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archiveStockItem', kind, sku }),
    })
    if (kind === 'finished') {
      const item = toFinishedGood(result.item)
      setFinishedGoods(prev => [item, ...prev.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
      setProducts(prev => prev.map(product => product.sku.toLowerCase() === item.sku.toLowerCase()
        ? { ...product, status: 'Draft' }
        : product))
    } else {
      const item = toRawMaterial(result.item)
      setRawMaterials(prev => [item, ...prev.filter(existing => existing.sku.toLowerCase() !== item.sku.toLowerCase())])
    }
    workbookLastRefreshAt.current = Date.now()
    notify('Item archived; its stock history was retained')
  }

  const deleteUnusedStockItem = async (kind: 'raw' | 'finished', sku: string) => {
    await apiFetch('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUnusedStockItem', kind, sku }),
    })
    if (kind === 'finished') setFinishedGoods(prev => prev.filter(item => item.sku.toLowerCase() !== sku.toLowerCase()))
    else setRawMaterials(prev => prev.filter(item => item.sku.toLowerCase() !== sku.toLowerCase()))
    workbookLastRefreshAt.current = Date.now()
    notify('Unused item deleted')
  }

  const importExcel = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Workbook must be 10 MB or smaller')
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose an .xlsx, .xls or .csv file')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      if (workbook.Sheets.Products_Import && workbook.Sheets.Marketplace_Listings_Import) {
        throw new Error('This is a combined marketplace workbook. Import it from Product Catalog → Import workbook so every platform and SKU is validated together.')
      }
      const sheetName = workbook.SheetNames.includes('Products')
        ? 'Products'
        : workbook.SheetNames.includes('SKU_Variants')
          ? 'SKU_Variants'
          : workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
      if (!rows.length) throw new Error('The selected sheet is empty')
      const variants = sheetName === 'SKU_Variants'
      const imported: Product[] = rows.slice(0, 100).map((row, index) => {
        const sku = String(variants
          ? row['Variant SKU'] || row['SKU'] || ''
          : row['Master SKU'] || row['SKU'] || row['sku'] || '')
        if (!sku) throw new Error(`Row ${index + 2} is missing a SKU`)
        return {
          id: String(row['Internal Product ID'] || row['Variant ID'] || row['ID'] || `PID-IMPORT-${index + 1}`), sku,
          masterSku: String(row['Master SKU'] || sku),
          name: String(row['Name'] || row['Product Title'] || row['Title'] || row['Master SKU'] || 'Imported Product'),
          category: String(row['Category'] || 'Uncategorized'),
          mrp: Number(row['MRP'] || 0),
          stock: Number(row['Stock'] || row['Available Stock'] || 0),
          status: 'Active',
          size: String(row['Size'] || ''),
          color: String(row['Color'] || ''),
          packQuantity: Number(row['Pack Quantity'] || 1),
          isVariant: variants,
        }
      })
      const existingSkus = new Set(products.map(p => p.sku.toLowerCase()))
      const duplicates: Product[] = []
      const unique = imported.filter(product => {
        const key = product.sku.toLowerCase()
        if (existingSkus.has(key)) {
          duplicates.push(product)
          return false
        }
        existingSkus.add(key)
        return true
      })
      notify(`Preview only: ${unique.length} new, ${duplicates.length} duplicates. Use Product Catalog to save shared records.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Workbook import failed')
    }
  }

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(products)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Product Master')
    XLSX.writeFile(workbook, 'Mahalaxmi-Enterprise-Product-Master.xlsx')
  }

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username')).trim().toLowerCase()
    const password = String(form.get('password'))
    setLoginError('')
    setLoginBusy(true)
    try {
      const result = await apiFetch<{ user: UserAccount; auditWarning?: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, scope: isAdminRoute ? 'admin' : 'team' }),
      })
      setActivityAuditWarning(result.auditWarning || '')
      setSessionUser(result.user)
      setModule(landingModuleForRole(result.user.role))
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoginBusy(false)
    }
  }

  const logout = async () => {
    let screenRecordingWarning = ''
    try {
      screenRecordingWarning = await screenRecordingRef.current?.stopAndUpload() || ''
    } catch (error) {
      screenRecordingWarning = error instanceof Error ? error.message : 'The final screen clip could not be saved.'
    }
    try {
      const result = await apiFetch<{ ok: boolean; auditWarning?: string }>('/api/auth/logout', { method: 'POST' })
      setActivityAuditWarning(result.auditWarning || '')
      setLoginError(screenRecordingWarning)
      setSessionUser(null)
      setUsers([])
      setModule('Dashboard')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not log out from the server')
    }
  }

  if (!sessionUser && authStatus === 'checking') {
    return (
      <main className="login-page">
        <section className="login-card" role="status" aria-live="polite">
          <div className="login-brand"><img className="brand-mark brand-logo" src="/mahalaxmi-enterprise-logo.jpg" alt="" /><div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div></div>
          <div className="login-heading"><p>SECURE WORKSPACE</p><h1>Restoring your session…</h1><span className="login-description">Checking your sign-in and loading your workspace.</span></div>
        </section>
      </main>
    )
  }

  if (!sessionUser) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-brand"><img className="brand-mark brand-logo" src="/mahalaxmi-enterprise-logo.jpg" alt="" /><div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div></div>
          <div className="login-heading"><p>{isAdminRoute ? 'ADMIN LOGIN' : 'TEAM LOGIN'}</p><h1>{isAdminRoute ? 'Super Admin sign in' : 'Sign in to your workspace'}</h1><span className="login-description">{isAdminRoute ? 'Use the single Super Admin ID and password to open Admin controls.' : 'Admin-created supervisors and staff use their own login ID and password here. Your assigned role opens the right workspace.'}</span></div>
          <form onSubmit={login}>
            <label>Login ID<input name="username" autoComplete="username" required placeholder="Enter your login ID" /></label>
            <label>Password<div className="password-field"><LockKeyhole size={16} /><input name="password" type="password" autoComplete="current-password" required placeholder="Enter password" /></div></label>
            {loginError && <div className="login-error">{loginError}</div>}
            {authStatus === 'unavailable' && <div className="login-error">{serverMessage}</div>}
            <button className="primary wide" type="submit" disabled={loginBusy}>{loginBusy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {activityAuditWarning && <p className="audit-warning" role="alert">{activityAuditWarning}</p>}
        </section>
      </main>
    )
  }

  if (isAdminRoute && sessionUser.role !== 'Super Admin') {
    return <main className="login-page"><section className="login-card"><div className="login-heading"><p>ADMIN AREA</p><h1>Admin login required</h1><span className="login-description">This account is assigned to {sessionUser.role}. Sign out, then use the Super Admin credentials at /admin.</span></div><button className="primary wide" onClick={() => void logout()}>Sign out</button><a className="login-route-link" href="/">Go to team workspace</a></section></main>
  }

  const todayKey = indiaDateKey(clock)
  const weekday = new Date(`${todayKey}T12:00:00Z`).getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const weekStart = shiftDateKey(todayKey, mondayOffset)
  const productionChart = Array.from({ length: 7 }, (_, index) => {
    const key = shiftDateKey(weekStart, index)
    return {
      date: key,
      qty: production.filter(row => row.date === key).reduce((sum, row) => sum + row.actual, 0),
    }
  })
  const adminModules = [...navSections.flatMap(section => section.items), ...settingsModules]
  const adminOnlyModules: Module[] = ['Camera Monitoring', 'Employees', 'Accounts', 'Reports', 'User Management', 'Audit Logs']
  const roleModules: Record<Role, Module[]> = {
    'Super Admin': adminModules.filter(item => item !== 'Daily Work Report' && item !== 'Shipping Labels'),
    'Production Supervisor': adminModules.filter(item => !adminOnlyModules.includes(item) && item !== 'Daily Work Report'),
    'Machine Operator': ['Dashboard', 'Production', 'Production Targets', 'Chat'],
    'Store Manager': ['Dashboard', 'Chat'],
    'E-commerce Executive': ['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Daily Work Report', 'Chat'],
    'E-commerce Manager': ['E-commerce Workspace', 'Daily Work Report', 'Chat'],
    'Sales Executive': ['Sales Dashboard', 'Sales Daily Report', 'Leads', 'Orders', 'Chat'],
    'Graphic Designer': ['Dashboard', 'Graphic Design', 'Daily Work Report', 'Chat'],
  }
  return (
    <div className={sidebarOpen ? 'app-shell' : 'app-shell sidebar-collapsed'}>
      <aside className={sidebarOpen ? 'sidebar' : 'sidebar collapsed'}>
        <div className="brand">
          <img className="brand-mark brand-logo" src="/mahalaxmi-enterprise-logo.jpg" alt="" />
          {sidebarOpen && <div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div>}
        </div>
        <nav id="primary-navigation" aria-label="Primary navigation" className={mobileMenuOpen ? 'mobile-nav-open' : ''}>
          {navSections.map(section => {
            const items = section.items.filter(item => roleModules[sessionUser.role].includes(item))
            if (!items.length) return null
            return (
              <div className="nav-section" key={section.label}>
                {(sidebarOpen || mobileMenuOpen) && <div className="nav-label">{section.label}</div>}
                {items.map(item => {
                  const Icon = moduleIcons[item] || Package
                  return <button key={item} className={module === item ? 'nav-item active' : 'nav-item'} aria-current={module === item ? 'page' : undefined} onClick={() => { setModule(item); setMobileMenuOpen(false) }}><Icon size={19} /><span>{item}</span></button>
                })}
              </div>
            )
          })}
        </nav>
        <button className="mobile-menu-toggle" type="button" aria-controls="primary-navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(open => !open)}>
          <Menu size={20} />
          <span>{mobileMenuOpen ? 'Close menu' : 'Menu'}</span>
          <strong>{module}</strong>
        </button>
        <div className="sidebar-user">
          <div className="avatar">{sessionUser.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</div>
          {sidebarOpen && <div className="user-copy"><strong>{sessionUser.name}</strong><span>{sessionUser.role}</span></div>}
          {sidebarOpen && <button className="row-menu" onClick={logout} title="Sign out"><LogOut size={17} /></button>}
        </div>
      </aside>
      {mobileMenuOpen && <button className="mobile-menu-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setMobileMenuOpen(false)} />}

      <main>
        <header className="topbar">
          <button className="icon-button" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="global-search-wrap">
            <div className="global-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, product, order, barcode..." /><kbd>⌘ K</kbd></div>
            {search.trim().length >= 2 && <div className="global-search-results" role="status" aria-live="polite">
              {globalSearchResults.length ? globalSearchResults.map(({ product, listings }) => (
                <div className="global-search-result" key={product.sku}>
                  <div><strong>{product.name}</strong><span>Product SKU: <code>{product.sku}</code>{product.masterSku !== product.sku ? <> · Master: <code>{product.masterSku}</code></> : null}</span></div>
                  <div className="global-search-platforms">{listings.length
                    ? listings.map(listing => <span key={listing.id}><b>{listing.platform}</b><code>{listing.platformSku}</code></span>)
                    : <span className="global-search-unlisted">No marketplace SKU linked</span>}</div>
                </div>
              )) : <div className="global-search-empty">No matching product or marketplace SKU</div>}
            </div>}
          </div>
          <div className="top-actions"><button className="icon-button" title="Notifications"><Bell size={19} /><i /></button><div className="date-chip"><span>{new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(clock)} IST</span><strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(clock)}</strong></div><button className="icon-button" onClick={logout} title="Log out"><LogOut size={18} /></button></div>
        </header>

        <div className="content">
          {activityAuditWarning && <p className="audit-warning" role="alert">{activityAuditWarning}</p>}
          {sessionUser.role !== 'Super Admin' && <ScreenRecordingControl ref={screenRecordingRef} user={{ id: sessionUser.id, name: sessionUser.name, role: sessionUser.role }} />}
          {module === 'Dashboard' ? (
            <DashboardView
              role={sessionUser.role}
              user={sessionUser}
              users={users}
              products={products}
              production={production}
              graphicDesignTasks={graphicDesignTasks}
              today={indiaDateKey(clock)}
              machines={machines}
              productionChart={productionChart}
              setModule={setModule}
              exportExcel={exportExcel}
            />
          ) : (
            <ModuleView module={module} clock={clock} products={products} marketplaceListings={marketplaceListings} production={production} productionTargets={productionTargets} rawMaterials={rawMaterials} finishedGoods={finishedGoods} stockMovements={stockMovements} suppliers={suppliers} accountExpenses={accountExpenses} workbookMeta={workbookMeta}
              search={search} setSearch={setSearch} exportExcel={exportExcel} saveProduct={saveProduct} saveVariant={saveVariant} saveMarketplaceListing={saveMarketplaceListing} importMarketplaceWorkbook={importMarketplaceWorkbook}
              resetErpData={resetErpData}
              saveProduction={saveProduction} reviewProductionQuality={reviewProductionQuality} saveProductionTarget={saveProductionTarget} saveMachine={saveMachine} saveRawMaterial={saveRawMaterial} applyStockMovement={applyStockMovement}
              saveSupplier={saveSupplier} updateSupplierActive={updateSupplierActive} saveAccountExpense={saveAccountExpense}
              graphicDesignTasks={graphicDesignTasks} submitGraphicDesignTask={submitGraphicDesignTask} updateGraphicDesignProgress={updateGraphicDesignProgress} reviewGraphicDesignTask={reviewGraphicDesignTask}
              initializeZeroFinishedStock={initializeZeroFinishedStock} zeroStockInitializationBusy={zeroStockInitializationBusy}
              archiveStockItem={archiveStockItem} deleteUnusedStockItem={deleteUnusedStockItem} fileRef={fileRef} importExcel={importExcel} notify={notify} setModule={setModule}
              machines={machines} users={users} setUsers={setUsers} sessionUser={sessionUser}
              allowedModules={roleModules[sessionUser.role]}
              salesLeads={salesLeads} salesActivities={salesActivities} salesOrders={salesOrders} salesTargets={salesTargets}
              salesUsers={salesAccounts} setSalesUsers={setSalesAccounts}
              importSalesLeads={importSalesLeads} addSalesLead={addSalesLead} assignSalesLead={assignSalesLead}
              updateSalesLead={updateSalesLead} createSalesOrder={createSalesOrder} cancelSalesOrder={cancelSalesOrder}
              setSalesTarget={setSalesTarget} />
          )}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  )
}

function ModuleView(props: {
  module: Module; clock: Date; products: Product[]; marketplaceListings: MarketplaceListing[]; production: Production[]; productionTargets: ProductionTarget[];
  rawMaterials: RawMaterial[]; finishedGoods: FinishedGood[]; stockMovements: StockMovement[]; suppliers: Supplier[]; accountExpenses: AccountExpense[]; search: string;
  workbookMeta: { loaded: boolean; name: string; sheetCount: number };
  setSearch: (v: string) => void; exportExcel: () => void;
  saveProduct: (input: { sku: string; name: string; category: string; mrp: number }) => Promise<Product>;
  saveVariant: (input: { masterSku: string; sku: string; size: string; color: string; packQuantity: number; mrp?: number; sellingPrice?: number }) => Promise<Product>;
  saveMarketplaceListing: (input: { platform: string; platformSku: string; productSku: string; mrp: number; sellingPrice: number }) => Promise<MarketplaceListing>;
  importMarketplaceWorkbook: (rows: Pick<MarketplaceImportRows, 'products' | 'variants' | 'listings' | 'finishedGoods'>) => Promise<MarketplaceImportResult>;
  resetErpData: (confirmation: string) => Promise<ErpResetResult>;
  saveProduction: (input: { date: string; machine: string; block: string; sku: string; product: string; actual: number; rejected: number }) => Promise<Production>;
  reviewProductionQuality: (input: { productionId: string; approved: number; rejected: number }) => Promise<Production>;
  graphicDesignTasks: GraphicDesignTask[];
  submitGraphicDesignTask: (input: { plannedDate: string; month: string; sku: string; platforms: string[]; contentType: 'Post' | 'Video'; brief: string; caption: string; script: string }) => Promise<GraphicDesignTask>;
  updateGraphicDesignProgress: (input: { taskId: string; shootStatus: GraphicDesignTask['shootStatus']; editStatus: GraphicDesignTask['editStatus'] }) => Promise<GraphicDesignTask>;
  reviewGraphicDesignTask: (input: { taskId: string; decision: 'Approved' | 'Rejected'; reviewNote: string }) => Promise<GraphicDesignTask>;
  saveProductionTarget: (input: { period: ProductionTargetPeriod; date: string; machineId: string; sku: string; productName: string; targetQuantity: number }) => Promise<ProductionTarget>;
  saveRawMaterial: (input: { sku: string; name: string; unit: string; supplierId: string; openingStock: number; reorderLevel: number; unitCost: number }) => Promise<RawMaterial>;
  applyStockMovement: (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; unitPrice?: number; supplierId?: string; referenceId: string; machineId: string; reason: string; salesChannel?: string; deliveryPartner?: string; linkToDispatch?: boolean }) => Promise<void>;
  saveSupplier: (input: Omit<Supplier, 'id' | 'status' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>) => Promise<Supplier>;
  updateSupplierActive: (supplierId: string, active: boolean) => Promise<void>;
  saveAccountExpense: (input: Omit<AccountExpense, 'id' | 'createdAt' | 'createdBy'>) => Promise<AccountExpense>;
  initializeZeroFinishedStock: () => Promise<void>; zeroStockInitializationBusy: boolean;
  archiveStockItem: (kind: 'raw' | 'finished', sku: string) => Promise<void>;
  deleteUnusedStockItem: (kind: 'raw' | 'finished', sku: string) => Promise<void>;
  saveMachine: (input: Omit<Machine, 'id'>) => Promise<Machine>;
  fileRef: React.RefObject<HTMLInputElement | null>; importExcel: (f: File) => void;
  notify: (v: string) => void
  setModule: (v: Module) => void
  machines: Machine[];
  users: UserAccount[]; setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>; sessionUser: UserAccount
  allowedModules: Module[]
  salesLeads: SalesLead[]; salesActivities: SalesActivity[]; salesOrders: SalesOrder[]; salesTargets: SalesTarget[]
  salesUsers: SalesAccount[]; setSalesUsers: React.Dispatch<React.SetStateAction<SalesAccount[]>>
  importSalesLeads: (rows: SalesLeadImportRow[], assignedUserId: string) => Promise<{ added: number; skipped: number }>
  addSalesLead: (lead: Omit<SalesLeadImportRow, 'assignedUserId'> & { assignedUserId: string }) => Promise<void>
  assignSalesLead: (leadId: string, assignedUserId: string) => Promise<void>
  updateSalesLead: (input: { leadId: string; status: SalesLeadStatus; activityType: SalesActivityType; outcome: string; notes: string; nextFollowUp: string }) => Promise<void>
  createSalesOrder: (input: { leadId: string; customerName: string; sku: string; productName: string; quantity: number; unitPrice: number; notes: string }) => Promise<void>
  cancelSalesOrder: (orderId: string) => Promise<void>
  setSalesTarget: (salesUserId: string, period: SalesTargetPeriod, periodKey: string, targetAmount: number) => Promise<void>
}) {
  const { module, clock, products, marketplaceListings, production, productionTargets, rawMaterials, finishedGoods, stockMovements, suppliers, accountExpenses, saveSupplier, updateSupplierActive, saveAccountExpense, graphicDesignTasks, submitGraphicDesignTask, updateGraphicDesignProgress, reviewGraphicDesignTask, workbookMeta, search, setSearch, exportExcel, saveProduct, saveVariant, saveMarketplaceListing, importMarketplaceWorkbook, resetErpData, saveProduction, reviewProductionQuality, saveProductionTarget, saveRawMaterial, applyStockMovement, initializeZeroFinishedStock, zeroStockInitializationBusy, archiveStockItem, deleteUnusedStockItem, saveMachine, fileRef, importExcel, notify, setModule, machines, users, setUsers, sessionUser, allowedModules, salesLeads, salesActivities, salesOrders, salesTargets, salesUsers, setSalesUsers, importSalesLeads, addSalesLead, assignSalesLead, updateSalesLead, createSalesOrder, cancelSalesOrder, setSalesTarget } = props
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditError, setAuditError] = useState('')
  const [auditRetentionDays, setAuditRetentionDays] = useState(90)
  const [employeeDirectoryLoading, setEmployeeDirectoryLoading] = useState(false)
  const [employeeDirectoryError, setEmployeeDirectoryError] = useState('')
  const [catalogFormOpen, setCatalogFormOpen] = useState<'product' | 'variant' | 'listing' | null>(null)
  const [selectedCatalogMasterSku, setSelectedCatalogMasterSku] = useState('')
  const [resetPanelOpen, setResetPanelOpen] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  useEffect(() => {
    if (module !== 'Audit Logs') return
    let active = true
    let loaded = false
    const refresh = async () => {
      try {
        const result = await apiFetch<{ events: AuditEvent[]; retentionDays: number }>('/api/erp?resource=audit')
        if (!active) return
        setAuditEvents(result.events)
        setAuditRetentionDays(result.retentionDays)
        setAuditError('')
      } catch (error) {
        if (!active) return
        setAuditError(auditFailureMessage(error))
      } finally {
        if (active && !loaded) {
          loaded = true
          setAuditLoading(false)
        }
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [module, sessionUser.role])
  const [stockFormOpen, setStockFormOpen] = useState(false)
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  const [stockMovementType, setStockMovementType] = useState('')
  const [supplierSaving, setSupplierSaving] = useState(false)
  const [expenseSaving, setExpenseSaving] = useState(false)
  const [reportMonth, setReportMonth] = useState(() => indiaMonthKey())
  const [newUserRole, setNewUserRole] = useState<Role>('Production Supervisor')
  const [ecommerceReports, setEcommerceReports] = useState<EcommerceDailyReport[]>([])
  const [ecommerceReportsError, setEcommerceReportsError] = useState('')
  const [ecommerceReportsLoading, setEcommerceReportsLoading] = useState(false)
  const [ecommerceTasks, setEcommerceTasks] = useState<EcommerceTask[]>([])
  const [ecommerceTasksError, setEcommerceTasksError] = useState('')
  const [ecommerceTasksLoading, setEcommerceTasksLoading] = useState(false)
  const [graphicDesignReports, setGraphicDesignReports] = useState<GraphicDesignDailyReport[]>([])
  const [graphicDesignReportsError, setGraphicDesignReportsError] = useState('')
  const [graphicDesignReportsLoading, setGraphicDesignReportsLoading] = useState(false)
  const [graphicDesignReportMessage, setGraphicDesignReportMessage] = useState('')
  const [graphicDesignReportSaving, setGraphicDesignReportSaving] = useState(false)
  const [catalogPlatformFilter, setCatalogPlatformFilter] = useState('')
  const [catalogListingFilter, setCatalogListingFilter] = useState('')
  const [catalogPlatformSearch, setCatalogPlatformSearch] = useState('')
  const [catalogPlatform, setCatalogPlatform] = useState('')
  const [deliveryChannel, setDeliveryChannel] = useState('')
  const [deliveryPartnerChoice, setDeliveryPartnerChoice] = useState('')
  const [customDeliveryPartner, setCustomDeliveryPartner] = useState('')
  const [deliverySku, setDeliverySku] = useState('')
  const [deliverySalesOrderId, setDeliverySalesOrderId] = useState('')
  const [deliveryReferenceId, setDeliveryReferenceId] = useState('')
  const [deliveryQuantity, setDeliveryQuantity] = useState('')
  const [deliveryUnitPrice, setDeliveryUnitPrice] = useState('')
  const [returnChannel, setReturnChannel] = useState('')
  const [returnDispatchId, setReturnDispatchId] = useState('')
  const [productionTargetPeriodChoice, setProductionTargetPeriodChoice] = useState<ProductionTargetPeriod>('daily')
  const [productionTargetDate, setProductionTargetDate] = useState(() => indiaDateKey(clock))
  const [productionTargetProduct, setProductionTargetProduct] = useState('')
  const [productionTargetBusy, setProductionTargetBusy] = useState(false)
  const [machineTypeChoice, setMachineTypeChoice] = useState('')
  const [stitchingReportDate, setStitchingReportDate] = useState(() => indiaDateKey(clock))
  const [qualityReportDate, setQualityReportDate] = useState(() => indiaDateKey(clock))
  const [qualityDrafts, setQualityDrafts] = useState<Record<string, { approved: string; rejected: string }>>({})
  const [qualitySavingId, setQualitySavingId] = useState('')
  const [graphicPlanMonth, setGraphicPlanMonth] = useState(() => indiaDateKey(clock).slice(0, 7))
  const [graphicPlanDate, setGraphicPlanDate] = useState(() => indiaDateKey(clock))
  const [graphicContentTypeChoice, setGraphicContentTypeChoice] = useState<'Post' | 'Video'>('Post')
  const [graphicProgressDrafts, setGraphicProgressDrafts] = useState<Record<string, { shootStatus: GraphicDesignTask['shootStatus']; editStatus: GraphicDesignTask['editStatus'] }>>({})
  const [graphicReviewDrafts, setGraphicReviewDrafts] = useState<Record<string, string>>({})

  const refreshEmployeeDirectory = useCallback(async () => {
    const result = await apiFetch<{ users: UserAccount[] }>('/api/users')
    setUsers(result.users)
  }, [setUsers])

  useEffect(() => {
    if (module !== 'Employees' || sessionUser.role !== 'Super Admin') return
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setEmployeeDirectoryLoading(true)
      setEmployeeDirectoryError('')
      return refreshEmployeeDirectory()
        .catch(error => {
          if (active) setEmployeeDirectoryError(error instanceof Error ? error.message : 'Employees could not be loaded.')
        })
        .finally(() => {
          if (active) setEmployeeDirectoryLoading(false)
        })
    })
    return () => { active = false }
  }, [module, refreshEmployeeDirectory, sessionUser.role])

  useEffect(() => {
    if (module !== 'User Management' || sessionUser.role !== 'Super Admin') return
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setEcommerceReportsLoading(true)
      return fetch('/api/ecommerce-reports', { cache: 'no-store' })
        .then(async response => {
          const result = await response.json() as { error?: string; reports?: EcommerceDailyReport[] }
          if (!response.ok) throw new Error(result.error || 'Daily reports could not be loaded.')
          if (active) {
            setEcommerceReports(result.reports || [])
            setEcommerceReportsError('')
          }
        })
        .catch(error => {
          if (active) setEcommerceReportsError(error instanceof Error ? error.message : 'Daily reports could not be loaded.')
        })
        .finally(() => {
          if (active) setEcommerceReportsLoading(false)
        })
    })
    return () => { active = false }
  }, [module, sessionUser.role])
  useEffect(() => {
    if (module !== 'User Management' || sessionUser.role !== 'Super Admin') return
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setEcommerceTasksLoading(true)
      return fetch('/api/ecommerce-tasks', { cache: 'no-store' })
        .then(async response => {
          const result = await response.json() as { error?: string; tasks?: EcommerceTask[] }
          if (!response.ok) throw new Error(result.error || 'Daily tasks could not be loaded.')
          if (active) {
            setEcommerceTasks(result.tasks || [])
            setEcommerceTasksError('')
          }
        })
        .catch(error => {
          if (active) setEcommerceTasksError(error instanceof Error ? error.message : 'Daily tasks could not be loaded.')
        })
        .finally(() => {
          if (active) setEcommerceTasksLoading(false)
        })
    })
    return () => { active = false }
  }, [module, sessionUser.role])
  useEffect(() => {
    if (module !== 'Graphic Design' && !(module === 'Daily Work Report' && sessionUser.role === 'Graphic Designer')) return
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setGraphicDesignReportsLoading(true)
      return fetch('/api/graphic-design-reports', { cache: 'no-store' })
        .then(async response => {
          const result = await response.json() as { error?: string; reports?: GraphicDesignDailyReport[] }
          if (!response.ok) throw new Error(result.error || 'Graphic Design daily reports could not be loaded.')
          if (active) {
            setGraphicDesignReports(result.reports || [])
            setGraphicDesignReportsError('')
          }
        })
        .catch(error => {
          if (active) setGraphicDesignReportsError(error instanceof Error ? error.message : 'Graphic Design daily reports could not be loaded.')
        })
        .finally(() => {
          if (active) setGraphicDesignReportsLoading(false)
        })
    })
    return () => { active = false }
  }, [module, sessionUser.role])
  const [productionDate, setProductionDate] = useState(() => indiaDateKey(clock))
  const [productionBlockChoice, setProductionBlockChoice] = useState('')
  const [marketplaceImportPreview, setMarketplaceImportPreview] = useState<MarketplaceImportRows | null>(null)
  const [marketplaceImportFileName, setMarketplaceImportFileName] = useState('')
  const [marketplaceImportError, setMarketplaceImportError] = useState('')
  const [marketplaceImportBusy, setMarketplaceImportBusy] = useState(false)
  const [marketplaceImportResult, setMarketplaceImportResult] = useState<MarketplaceImportResult | null>(null)
  const [selectedImportPlatforms, setSelectedImportPlatforms] = useState<string[]>([])
  const marketplaceImportFileRef = useRef<HTMLInputElement>(null)
  const loadMarketplaceImport = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Workbook must be 10 MB or smaller.')
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose the combined .xlsx marketplace import workbook.')
      const workbook = XLSX.read(await file.arrayBuffer())
      const readSheet = (name: string, requiredHeaders: string[]) => {
        const sheet = workbook.Sheets[name]
        if (!sheet) throw new Error(`The workbook is missing the ${name} sheet.`)
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (!rows.length) throw new Error(`The ${name} sheet is empty.`)
        const missing = requiredHeaders.filter(header => !Object.prototype.hasOwnProperty.call(rows[0], header))
        if (missing.length) throw new Error(`${name} is missing columns: ${missing.join(', ')}.`)
        return rows
      }
      const products = readSheet('Products_Import', ['Internal Product ID', 'Master SKU', 'Product Title'])
      const variants = readSheet('SKU_Variants_Import', ['Variant ID', 'Master SKU', 'Variant SKU'])
      const listings = readSheet('Marketplace_Listings_Import', ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name'])
      const inventorySheet = workbook.Sheets.Finished_Goods_Import
      const finishedGoods = inventorySheet
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(inventorySheet, { defval: '' })
        : []
      if (products.length > 5000 || variants.length > 10000 || listings.length > 10000 || finishedGoods.length > 5000) {
        throw new Error('This workbook exceeds the safe import row limits.')
      }
      if (finishedGoods.length) {
        const requiredInventoryHeaders = ['Product SKU', 'Product Name', 'Opening Stock']
        const missingInventoryHeaders = requiredInventoryHeaders.filter(header => !Object.prototype.hasOwnProperty.call(finishedGoods[0], header))
        if (missingInventoryHeaders.length) throw new Error(`Finished_Goods_Import is missing columns: ${missingInventoryHeaders.join(', ')}.`)
      }
      const issues = workbook.Sheets.Import_Issues
        ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Import_Issues, { defval: '' })
        : []
      for (const [index, row] of products.entries()) {
        if (!row['Internal Product ID'] || !row['Master SKU'] || !row['Product Title']) {
          throw new Error(`Products_Import row ${index + 2} is missing its ID, SKU, or title.`)
        }
      }
      for (const [index, row] of variants.entries()) {
        if (!row['Variant ID'] || !row['Master SKU'] || !row['Variant SKU']) {
          throw new Error(`SKU_Variants_Import row ${index + 2} is missing its ID or SKU mapping.`)
        }
      }
      for (const [index, row] of listings.entries()) {
        if (!row['Listing ID'] || !row.Platform || !row['Platform SKU'] || !row['Product SKU'] || !row['Master SKU'] || !row['Product Name']) {
          throw new Error(`Marketplace_Listings_Import row ${index + 2} is missing required listing data.`)
        }
      }
      for (const [index, row] of finishedGoods.entries()) {
        const openingStock = Number(row['Opening Stock'])
        if (!row['Product SKU'] || !row['Product Name'] || row['Opening Stock'] === '' ||
          !Number.isInteger(openingStock) || openingStock < 0 || openingStock > 10000000) {
          throw new Error(`Finished_Goods_Import row ${index + 2} must have a SKU, product name, and whole-number opening stock from 0 to 10,000,000.`)
        }
      }
      setMarketplaceImportFileName(file.name)
      setMarketplaceImportPreview({ products, variants, listings, finishedGoods, issues })
      setSelectedImportPlatforms([...new Set(listings.map(row => String(row.Platform || '').trim()).filter(Boolean))])
      setMarketplaceImportResult(null)
      setMarketplaceImportError('')
    } catch (error) {
      setMarketplaceImportPreview(null)
      setMarketplaceImportError(error instanceof Error ? error.message : 'The marketplace workbook could not be read.')
    }
  }
  const applyMarketplaceImport = async () => {
    if (!marketplaceImportPreview || marketplaceImportBusy) return
    setMarketplaceImportBusy(true)
    setMarketplaceImportError('')
    try {
      const result = await importMarketplaceWorkbook({
        products: marketplaceImportPreview.products,
        variants: marketplaceImportPreview.variants,
        listings: marketplaceImportPreview.listings.filter(row => selectedImportPlatforms.includes(String(row.Platform || '').trim())),
        finishedGoods: marketplaceImportPreview.finishedGoods,
      })
      setMarketplaceImportResult(result)
      setMarketplaceImportPreview(null)
    } catch (error) {
      setMarketplaceImportError(error instanceof Error ? error.message : 'Marketplace workbook import failed.')
    } finally {
      setMarketplaceImportBusy(false)
    }
  }
  const resetConfirmationMatches = resetConfirmation.trim().toUpperCase() === 'RESET ERP'
  const submitErpReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetConfirmationMatches) return
    setResetBusy(true)
    try {
      await resetErpData('RESET ERP')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'ERP reset failed. No success was reported.')
      setResetBusy(false)
    }
  }
  const importPlatformCounts = marketplaceImportPreview?.listings.reduce<Record<string, number>>((counts, row) => {
    const platform = String(row.Platform || 'Unknown')
    counts[platform] = (counts[platform] || 0) + 1
    return counts
  }, {})
  const selectedMarketplaceImportListings = marketplaceImportPreview?.listings.filter(row =>
    selectedImportPlatforms.includes(String(row.Platform || '').trim())
  ) || []
  if (!allowedModules.includes(module)) {
    return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Your account role cannot open this section.</span></div></section>
  }

  if (module === 'Settings') {
    const allSettingsLinks: { module: Module; description: string }[] = [
      { module: 'User Management', description: 'Create accounts, assign roles, and manage team access.' },
      { module: 'Excel Management', description: 'Review the shared workbook connection and import tools.' },
      { module: 'Audit Logs', description: 'Review sign-ins, module visits, and recorded ERP activity.' },
    ]
    const settingsLinks = allSettingsLinks.filter(item => allowedModules.includes(item.module))
    return (
      <section>
        <div className="page-heading"><div><p>ADMINISTRATION</p><h1>Settings</h1><span className="dashboard-description">Manage access, workbook tools, and system activity.</span></div></div>
        <div className="settings-hub-grid">
          {settingsLinks.map(item => {
            const Icon = moduleIcons[item.module]
            return <button className="settings-hub-card" key={item.module} type="button" onClick={() => setModule(item.module)}>
              <span className="settings-hub-icon"><Icon size={20} /></span>
              <span><strong>{item.module}</strong><small>{item.description}</small></span>
              <ArrowUpRight size={17} />
            </button>
          })}
        </div>
      </section>
    )
  }

  if (module === 'Daily Work Report' && sessionUser.role === 'Graphic Designer') {
    const reportRows = graphicDesignReports.map(report => <tr key={report.id}>
      <td>{formatIndiaDate(report.date)}</td>
      <td className="ecommerce-report-cell">{report.completed}</td>
      <td className="ecommerce-report-cell">{report.pending || '—'}</td>
      <td className="ecommerce-report-cell">{report.issues || '—'}</td>
      <td>{formatIndiaDateTime(report.updatedAt)}</td>
    </tr>)
    return <section>
      <div className="page-heading">
        <div><p>CREATIVE STUDIO</p><h1>Daily Work Report</h1><span className="dashboard-description">Submit one report each day; resubmitting updates today’s report.</span></div>
      </div>
      <section className="panel ecommerce-report-panel">
        {graphicDesignReportsLoading && <div className="empty-state" role="status">Loading daily reports…</div>}
        {graphicDesignReportsError && <p className="ecommerce-error" role="alert">{graphicDesignReportsError}</p>}
        <form className="ecommerce-form" onSubmit={submitGraphicDesignDailyReport}>
          <label>Completed work<textarea name="completed" required maxLength={3000} rows={4} placeholder="Summarize designs, posts, videos, and other work completed today." /></label>
          <label>Pending work<textarea name="pending" maxLength={3000} rows={3} placeholder="List work still in progress or waiting for feedback." /></label>
          <label>Issues / notes<textarea name="issues" maxLength={3000} rows={3} placeholder="Mention blockers or notes for the Admin." /></label>
          <button className="primary" type="submit" disabled={graphicDesignReportSaving}><CheckCircle2 size={15} /> {graphicDesignReportSaving ? 'Saving…' : 'Submit daily report'}</button>
        </form>
        <p className="ecommerce-feedback" role="status" aria-live="polite">{graphicDesignReportMessage}</p>
        {!graphicDesignReportsLoading && !graphicDesignReportsError && graphicDesignReports.length === 0 && <div className="empty-state"><ClipboardCheck size={22} /><strong>No daily reports yet</strong><span>Your submitted reports will appear here.</span></div>}
        {graphicDesignReports.length > 0 && <div className="ecommerce-table-wrap"><PaginatedTable label="My Graphic Design daily reports" resetKey={graphicDesignReports.map(report => `${report.id}-${report.updatedAt}`).join(':')} header={<thead><tr><th>Report date</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th><th>Last updated (IST)</th></tr></thead>} rows={reportRows} /></div>}
      </section>
    </section>
  }

  if (
    module === 'E-commerce Workspace' || module === 'E-commerce Stock' ||
    module === 'E-commerce Orders' || module === 'Shipping Labels' ||
    module === 'Daily Work Report'
  ) {
    return <EcommerceWorkspace user={sessionUser} module={module} setModule={setModule} />
  }
  if (module === 'Camera Monitoring') return <Suspense fallback={<div className="panel empty-state">Loading camera monitoring…</div>}><CameraMonitoringView /></Suspense>
  if (module === 'Chat') return <Suspense fallback={<div className="panel empty-state">Loading chat…</div>}><ChatView user={sessionUser} /></Suspense>

  const salesRole = sessionUser.role === 'Sales Executive' || sessionUser.role === 'Production Supervisor'
    ? sessionUser.role
    : 'Super Admin'
  if (module === 'Sales Dashboard') {
    return <SalesDashboardView
      role={salesRole}
      currentUser={{ id: sessionUser.id, name: sessionUser.name }}
      salesUsers={salesUsers}
      leads={salesLeads}
      activities={salesActivities}
      orders={salesOrders}
      targets={salesTargets}
      products={products}
      setTarget={setSalesTarget}
    />
  }
  if (module === 'Sales Daily Report') {
    return <SalesDailyReportView
      role={salesRole}
      currentUser={{ id: sessionUser.id, name: sessionUser.name }}
      leads={salesLeads}
      activities={salesActivities}
      orders={salesOrders}
    />
  }
  if (module === 'Leads') {
    return <SalesLeadsView
      role={salesRole}
      leads={salesLeads}
      activities={salesActivities}
      salesUsers={salesUsers}
      importLeads={importSalesLeads}
      addLead={addSalesLead}
      assignLead={assignSalesLead}
      updateLead={updateSalesLead}
    />
  }
  if (module === 'Orders') {
    return <SalesOrdersView
      role={salesRole}
      currentUserId={sessionUser.id}
      leads={salesLeads}
      orders={salesOrders}
      products={products}
      createOrder={createSalesOrder}
      cancelOrder={cancelSalesOrder}
    />
  }

  const submitProduction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    const form = new FormData(formElement)
    const actual = Number(form.get('actual'))
    const rejected = Number(form.get('rejected'))
    const sku = String(form.get('sku') || '')
    const product = products.find(item => item.sku === sku && item.status === 'Active')
    if (!Number.isInteger(actual) || actual <= 0 || !Number.isInteger(rejected) || rejected < 0 || rejected > actual || !product) {
      notify('Select an active SKU and enter valid whole-number quantities')
      return
    }
    try {
      await saveProduction({
        date: String(form.get('date')),
        machine: String(form.get('machine')),
        block: String(form.get('block')),
        sku,
        product: product.name,
        actual,
        rejected,
      })
      setProductionDate(indiaDateKey(clock))
      setProductionBlockChoice('')
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Production entry could not be saved')
    }
  }

  const submitProductionTarget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const skuChoice = String(form.get('sku') || '')
    const customProduct = skuChoice === '__custom__'
    const product = products.find(item => item.sku === skuChoice && item.status === 'Active')
    if (!customProduct && !product) {
      notify('Choose an active catalog product or the custom product option.')
      return
    }

    const targetQuantity = Number(form.get('targetQuantity'))
    if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 1000000) {
      notify('Enter a whole-number target from 1 to 1,000,000.')
      return
    }
    setProductionTargetBusy(true)
    try {
      await saveProductionTarget({
        period: productionTargetPeriodChoice,
        date: String(form.get('date') || ''),
        machineId: String(form.get('machineId') || ''),
        sku: product?.sku || '',
        productName: product?.name || String(form.get('customProductName') || '').trim(),
        targetQuantity,
      })
      formElement.reset()
      setProductionTargetProduct('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Production target could not be saved.')
    } finally {
      setProductionTargetBusy(false)
    }
  }

  const saveQualityReview = async (record: Production) => {
    const draft = qualityDrafts[record.id] || {
      approved: String(Math.max(0, record.actual - record.rejected)),
      rejected: String(record.rejected),
    }
    const approved = Number(draft.approved)
    const rejected = Number(draft.rejected)
    if (
      !Number.isInteger(approved) || approved < 0 ||
      !Number.isInteger(rejected) || rejected < 0 ||
      approved + rejected !== record.actual
    ) {
      notify(`QC pass and reject quantities must add up to ${record.actual}.`)
      return
    }
    setQualitySavingId(record.id)
    try {
      await reviewProductionQuality({ productionId: record.id, approved, rejected })
      setQualityDrafts(previous => {
        const next = { ...previous }
        delete next[record.id]
        return next
      })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Quality review could not be saved.')
    } finally {
      setQualitySavingId('')
    }
  }

  const submitGraphicPlanTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const plannedDate = String(form.get('plannedDate') || '')
    const month = graphicPlanMonth
    const sku = String(form.get('sku') || '')
    const contentType = String(form.get('contentType') || '') as 'Post' | 'Video'
    const platforms = form.getAll('platforms').map(String)
    if (plannedDate.slice(0, 7) !== month) {
      notify('Choose a posting date within the selected month.')
      return
    }
    if (!products.some(product => product.sku === sku && product.status === 'Active')) {
      notify('Choose an active product or variant from the catalog.')
      return
    }
    if (!platforms.length) {
      notify('Select at least one social platform.')
      return
    }
    if (contentType === 'Video' && !String(form.get('script') || '').trim()) {
      notify('Add a video script or shot-by-shot plan before submitting.')
      return
    }
    try {
      await submitGraphicDesignTask({
        plannedDate,
        month,
        sku,
        platforms,
        contentType,
        brief: String(form.get('brief') || ''),
        caption: String(form.get('caption') || ''),
        script: String(form.get('script') || ''),
      })
      setGraphicPlanDate(`${month}-01`)
      formElement.reset()
      setGraphicContentTypeChoice('Post')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Social content task could not be submitted.')
    }
  }

  async function submitGraphicDesignDailyReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const completed = String(form.get('completed') || '').trim()
    const pending = String(form.get('pending') || '').trim()
    const issues = String(form.get('issues') || '').trim()
    if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
      setGraphicDesignReportMessage('Completed work is required; each field must be 3,000 characters or fewer.')
      return
    }
    setGraphicDesignReportMessage('')
    setGraphicDesignReportsError('')
    setGraphicDesignReportSaving(true)
    try {
      const result = await apiFetch<{ report: GraphicDesignDailyReport }>('/api/graphic-design-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, pending, issues }),
      })
      setGraphicDesignReports(current => [result.report, ...current.filter(report => report.id !== result.report.id)])
      setGraphicDesignReportMessage('Daily report saved for today.')
      formElement.reset()
    } catch (error) {
      setGraphicDesignReportMessage(error instanceof Error ? error.message : 'Daily report could not be saved.')
    } finally {
      setGraphicDesignReportSaving(false)
    }
  }

  const saveGraphicProgress = async (task: GraphicDesignTask) => {
    const draft = graphicProgressDrafts[task.id] || { shootStatus: task.shootStatus, editStatus: task.editStatus }
    try {
      await updateGraphicDesignProgress({ taskId: task.id, ...draft })
      setGraphicProgressDrafts(previous => {
        const next = { ...previous }
        delete next[task.id]
        return next
      })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Creative production progress could not be saved.')
    }
  }

  const decideGraphicTask = async (task: GraphicDesignTask, decision: 'Approved' | 'Rejected') => {
    const reviewNote = graphicReviewDrafts[task.id] || ''
    if (decision === 'Rejected' && !reviewNote.trim()) {
      notify('Enter a review note so the designer knows what to revise.')
      return
    }
    try {
      await reviewGraphicDesignTask({ taskId: task.id, decision, reviewNote })
      setGraphicReviewDrafts(previous => {
        const next = { ...previous }
        delete next[task.id]
        return next
      })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Creative review could not be saved.')
    }
  }

  const submitCatalogProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const product = await saveProduct({
        sku: String(form.get('sku')),
        name: String(form.get('name')),
        category: String(form.get('category')),
        mrp: Number(form.get('mrp')),
      })
      setSelectedCatalogMasterSku(product.sku)
      formElement.reset()
      setCatalogFormOpen(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Product could not be saved')
    }
  }

  const submitSkuVariant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await saveVariant({
        masterSku: String(form.get('masterSku')),
        sku: String(form.get('sku')),
        size: String(form.get('size')),
        color: String(form.get('color')),
        packQuantity: Number(form.get('packQuantity')),
        mrp: form.get('mrp') ? Number(form.get('mrp')) : undefined,
        sellingPrice: form.get('sellingPrice') ? Number(form.get('sellingPrice')) : undefined,
      })
      formElement.reset()
      setCatalogFormOpen(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'SKU variant could not be saved')
    }
  }

  const submitMarketplaceListing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    if (!catalogPlatform) {
      notify('Select a marketplace platform')
      return
    }
    try {
      await saveMarketplaceListing({
        platform: String(form.get('platform')),
        platformSku: String(form.get('platformSku')).trim(),
        productSku: String(form.get('productSku')),
        mrp: Number(form.get('mrp') || 0),
        sellingPrice: Number(form.get('sellingPrice') || 0),
      })
      formElement.reset()
      setCatalogPlatform('')
      setCatalogPlatformSearch('')
      setCatalogFormOpen(null)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Marketplace SKU could not be saved')
    }
  }

  const canManageInventory = sessionUser.role === 'Super Admin' || sessionUser.role === 'Production Supervisor'
  const canManageStock = sessionUser.role === 'Production Supervisor'
  const canManageDelivery = sessionUser.role === 'Production Supervisor'
  const selectedMonthMovements = stockMovements.filter(movement => movement.date.slice(0, 7) === reportMonth)
  const monthlyDispatches = selectedMonthMovements.filter(movement => movement.itemType === 'Finished Goods' && movement.type === 'Dispatch')
  const monthlyReturns = selectedMonthMovements.filter(movement => movement.itemType === 'Finished Goods' && movement.type === 'Return')
  const monthlyDamages = selectedMonthMovements.filter(movement => movement.itemType === 'Finished Goods' && movement.type === 'Damage')
  const monthlyPurchases = selectedMonthMovements.filter(movement => movement.itemType === 'Raw Material' && movement.type === 'Purchase Inward')
  const monthlyMaterialIssued = selectedMonthMovements.filter(movement => movement.itemType === 'Raw Material' && movement.type === 'Material Issued')
  const monthlyMachineConsumption = selectedMonthMovements.filter(movement => movement.itemType === 'Raw Material' && movement.type === 'Machine Consumption')
  const monthlyStitchingConsumption = selectedMonthMovements.filter(movement => movement.itemType === 'Raw Material' && movement.type === 'Stitching Consumption')
  const monthlyWastage = selectedMonthMovements.filter(movement => movement.itemType === 'Raw Material' && movement.type === 'Wastage')
  const monthlyExpenses = accountExpenses.filter(expense => expense.date.slice(0, 7) === reportMonth)
  const dispatchedRevenue = monthlyDispatches.filter(movement => movement.hasRecordedPrice).reduce((sum, movement) => sum + movement.totalAmount, 0)
  const returnValue = monthlyReturns.filter(movement => movement.hasRecordedPrice).reduce((sum, movement) => sum + movement.totalAmount, 0)
  const damagedValue = monthlyDamages.filter(movement => movement.hasRecordedPrice).reduce((sum, movement) => sum + movement.totalAmount, 0)
  const purchaseSpend = monthlyPurchases.filter(movement => movement.hasRecordedCost).reduce((sum, movement) => sum + movement.totalCost, 0)
  const expenseSpend = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const trackedBalance = dispatchedRevenue - returnValue - damagedValue - purchaseSpend - expenseSpend
  const supplierPurchaseTotals = monthlyPurchases.filter(movement => movement.hasRecordedCost).reduce<Record<string, { supplier: string; amount: number; purchases: number }>>((totals, movement) => {
    const supplier = movement.supplier || 'Supplier not recorded'
    const key = movement.supplierId || supplier
    const current = totals[key] || { supplier, amount: 0, purchases: 0 }
    current.amount += movement.totalCost
    current.purchases += 1
    totals[key] = current
    return totals
  }, {})
  const monthlyProduction = production.filter(record => record.date.slice(0, 7) === reportMonth)
  const monthlyProductionUnits = monthlyProduction.reduce((sum, record) => sum + record.actual, 0)
  const monthlyApprovedUnits = monthlyProduction.reduce((sum, record) => sum + record.qcApproved, 0)
  const monthlyRejectedUnits = monthlyProduction.reduce((sum, record) => sum + record.qcRejected, 0)
  const hasItemMovement = (kind: 'raw' | 'finished', sku: string) => stockMovements.some(movement =>
    movement.sku.toLowerCase() === sku.toLowerCase() && (!movement.itemType || movement.itemType === (kind === 'raw' ? 'Raw Material' : 'Finished Goods'))
  )

  const submitRawMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await saveRawMaterial({
        sku: String(form.get('sku')),
        name: String(form.get('name')),
        unit: String(form.get('unit')),
        supplierId: String(form.get('supplierId')),
        openingStock: Number(form.get('openingStock')),
        reorderLevel: Number(form.get('reorderLevel')),
        unitCost: Number(form.get('unitCost')),
      })
      formElement.reset()
      setStockFormOpen(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Raw material could not be saved')
    }
  }

  const submitStockMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const kind = String(form.get('kind')) === 'raw' ? 'raw' : 'finished'
    try {
      await applyStockMovement({
        kind,
        sku: String(form.get('sku')),
        type: String(form.get('type')),
        quantity: Number(form.get('quantity')),
        unitCost: form.get('unitCost') ? Number(form.get('unitCost')) : undefined,
        supplierId: String(form.get('supplierId') || '') || undefined,
        unitPrice: form.get('unitPrice') ? Number(form.get('unitPrice')) : undefined,
        referenceId: String(form.get('referenceId') || ''),
        machineId: String(form.get('machineId') || ''),
        reason: String(form.get('reason') || ''),
      })
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Stock movement could not be saved')
    }
  }

  const submitSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setSupplierSaving(true)
    try {
      await saveSupplier({
        name: String(form.get('name') || '').trim(),
        contactPerson: String(form.get('contactPerson') || '').trim(),
        phone: String(form.get('phone') || '').trim(),
        email: String(form.get('email') || '').trim(),
        address: String(form.get('address') || '').trim(),
        notes: String(form.get('notes') || '').trim(),
      })
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Supplier could not be saved')
    } finally {
      setSupplierSaving(false)
    }
  }

  const submitAccountExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setExpenseSaving(true)
    try {
      await saveAccountExpense({
        date: String(form.get('date') || ''),
        category: String(form.get('category') || ''),
        description: String(form.get('description') || '').trim(),
        amount: Number(form.get('amount')),
        paymentMethod: String(form.get('paymentMethod') || ''),
        referenceId: String(form.get('referenceId') || '').trim(),
      })
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Expense could not be recorded')
    } finally {
      setExpenseSaving(false)
    }
  }

  const exportMonthlyReport = () => {
    try {
    const workbook = XLSX.utils.book_new()
    const financialRows = [
      { Metric: 'Dispatched revenue', Amount: dispatchedRevenue, Notes: 'Only dispatches with a recorded sale price are included.' },
      { Metric: 'Return value', Amount: returnValue, Notes: 'Recorded order return values; deducted from net sales.' },
      { Metric: 'Damage value', Amount: damagedValue, Notes: 'Recorded damage values; shown separately and deducted from net sales.' },
      { Metric: 'Supplier purchases', Amount: purchaseSpend, Notes: 'Only purchase movements with recorded unit cost are included.' },
      { Metric: 'Manual expenses', Amount: expenseSpend, Notes: 'Expenses entered in Accounts.' },
      { Metric: 'Net tracked balance', Amount: trackedBalance, Notes: 'Net sales less tracked supplier purchases and expenses; not accounting profit.' },
      { Metric: 'Dispatches missing sale price', Amount: monthlyDispatches.filter(movement => !movement.hasRecordedPrice).length, Notes: 'Legacy dispatches without a historical sale price are excluded from revenue.' },
      { Metric: 'Purchases missing cost', Amount: monthlyPurchases.filter(movement => !movement.hasRecordedCost).length, Notes: 'Legacy purchases without recorded cost are excluded from purchase totals.' },
    ]
    const operationalRows = [
      { Metric: 'Production records', Count: monthlyProduction.length, Units: monthlyProductionUnits },
      { Metric: 'QC-approved units', Count: monthlyProduction.filter(record => record.qcStatus === 'Reviewed').length, Units: monthlyApprovedUnits },
      { Metric: 'QC-rejected units', Count: monthlyProduction.filter(record => record.qcStatus === 'Reviewed').length, Units: monthlyRejectedUnits },
      { Metric: 'Dispatched orders / movements', Count: monthlyDispatches.length, Units: monthlyDispatches.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Returns', Count: monthlyReturns.length, Units: monthlyReturns.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Damaged units', Count: monthlyDamages.length, Units: monthlyDamages.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Raw material issued', Count: monthlyMaterialIssued.length, Units: monthlyMaterialIssued.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Machine consumption', Count: monthlyMachineConsumption.length, Units: monthlyMachineConsumption.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Stitching consumption', Count: monthlyStitchingConsumption.length, Units: monthlyStitchingConsumption.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'Raw material wastage', Count: monthlyWastage.length, Units: monthlyWastage.reduce((sum, movement) => sum + movement.quantity, 0) },
      { Metric: 'All stock movements', Count: selectedMonthMovements.length, Units: selectedMonthMovements.reduce((sum, movement) => sum + movement.quantity, 0) },
    ]
    const expensesRows = monthlyExpenses.map(expense => ({
      Date: expense.date, Category: expense.category, Description: expense.description,
      Amount: expense.amount, 'Payment Method': expense.paymentMethod, Reference: expense.referenceId,
    }))
    const purchasesRows = Object.values(supplierPurchaseTotals).map(row => ({
      Supplier: row.supplier, Purchases: row.purchases, 'Recorded Cost': row.amount,
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(financialRows), 'Financial Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(operationalRows), 'Operations')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(purchasesRows), 'Supplier Purchases')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expensesRows), 'Expenses')
    XLSX.writeFile(workbook, `ERP-Monthly-Report-${reportMonth}.xlsx`)
    } catch (error) {
      notify(error instanceof Error ? `Monthly report could not be exported: ${error.message}` : 'Monthly report could not be exported.')
    }
  }

  const submitOrderReturn = async (event: React.FormEvent<HTMLFormElement>, dispatch: StockMovement, remainingQuantity: number) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const type = String(form.get('type') || '')
    const quantity = Number(form.get('quantity'))
    if (!['Return', 'Damage'].includes(type) || !Number.isInteger(quantity) || quantity <= 0 || quantity > remainingQuantity) {
      notify('Choose Return or Damage and enter a whole quantity within the remaining shipped quantity.')
      return
    }
    try {
      await applyStockMovement({
        kind: 'finished',
        sku: dispatch.sku,
        type,
        quantity,
        referenceId: dispatch.referenceId,
        machineId: '',
        reason: String(form.get('reason') || ''),
        salesChannel: dispatch.salesChannel,
        linkToDispatch: true,
      })
      formElement.reset()
      setReturnDispatchId('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Order return or damage could not be saved')
    }
  }

  const submitDelivery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const salesChannel = String(form.get('salesChannel') || '')
    const partnerChoice = String(form.get('deliveryPartnerChoice') || '')
    const deliveryPartner = partnerChoice === 'Other'
      ? String(form.get('customDeliveryPartner') || '').trim()
      : partnerChoice
    try {
      await applyStockMovement({
        kind: 'finished',
        type: 'Dispatch',
        sku: String(form.get('sku') || ''),
        quantity: Number(form.get('quantity')),
        unitPrice: salesOrders.find(order => order.id === deliverySalesOrderId)?.unitPrice ?? Number(form.get('unitPrice') || 0),
        referenceId: String(form.get('referenceId') || ''),
        machineId: '',
        reason: String(form.get('reason') || ''),
        salesChannel,
        deliveryPartner,
      })
      formElement.reset()
      setDeliveryChannel('')
      setDeliveryPartnerChoice('')
      setCustomDeliveryPartner('')
      setDeliverySku('')
      setDeliverySalesOrderId('')
      setDeliveryReferenceId('')
      setDeliveryQuantity('')
      setDeliveryUnitPrice('')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Delivery could not be saved')
    }
  }

  const confirmArchive = async (kind: 'raw' | 'finished', sku: string) => {
    if (!window.confirm(`Archive ${sku}? Its movement history will remain in the ledger.`)) return
    try {
      await archiveStockItem(kind, sku)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Item could not be archived')
    }
  }

  const confirmDeleteUnused = async (kind: 'raw' | 'finished', sku: string) => {
    if (!window.confirm(`Permanently delete unused item ${sku}? This is only allowed when it has zero stock and no movement history.`)) return
    try {
      await deleteUnusedStockItem(kind, sku)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unused item could not be deleted')
    }
  }

  const renderMovementForm = (kind: 'raw' | 'finished', title: string, typeOptions: string[], defaultType: string) => {
    const currentMovementType = typeOptions.includes(stockMovementType) ? stockMovementType : defaultType
    const itemOptions = kind === 'raw'
      ? rawMaterials.filter(item => item.status.toLowerCase() !== 'archived').map(item => ({ sku: item.sku, name: item.name, unit: item.unit }))
      : products.filter(item => item.status === 'Active').map(item => ({ sku: item.sku, name: item.name, unit: 'units' }))
    const defaultSku = itemOptions[0]?.sku || ''
    return (
      <form className="panel form-card stock-form" onSubmit={submitStockMovement}>
        <div className="panel-heading"><div><h2>{title}</h2><p>Each saved entry records the balance change in the stock ledger.</p></div></div>
        <input type="hidden" name="kind" value={kind} />
        <div className="field-grid">
          <label>Stock item<select name="sku" required defaultValue={defaultSku} disabled={!canManageStock || itemOptions.length === 0}><option value="">Select item</option>{itemOptions.map(item => <option key={item.sku} value={item.sku}>{item.name} · {item.sku}</option>)}</select></label>
          <label>Movement type<select name="type" required value={currentMovementType} onChange={event => setStockMovementType(event.target.value)}>{typeOptions.map(type => <option key={type}>{type}</option>)}</select></label>
          <label>Quantity<input name="quantity" type="number" min="0.001" step={kind === 'raw' ? '0.001' : '1'} required /></label>
          {kind === 'raw' && currentMovementType === 'Purchase Inward' && <>
            <label>Supplier<select name="supplierId" required defaultValue=""><option value="">Select an active supplier</option>{suppliers.filter(supplier => supplier.status.toLowerCase() === 'active').map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label>Purchase unit cost<input name="unitCost" type="number" min="0" step="0.01" required /></label>
          </>}
          {kind === 'finished' && currentMovementType === 'Dispatch' && <label>Unit sale price<input name="unitPrice" type="number" min="0.01" step="0.01" required /></label>}
          <label>Reference ID<input name="referenceId" maxLength={100} placeholder={kind === 'raw' ? 'Purchase / issue reference' : 'Order / return / production reference'} /></label>
          <label>{kind === 'raw' ? 'Machine ID (optional)' : 'Machine ID (optional)'}<input name="machineId" maxLength={100} placeholder="Machine reference" /></label>
          <label className="stock-reason">Reason<input name="reason" maxLength={300} placeholder="Reason / notes" /></label>
        </div>
        <button className="primary wide" type="submit" disabled={!canManageStock || itemOptions.length === 0 || (kind === 'raw' && currentMovementType === 'Purchase Inward' && !suppliers.some(supplier => supplier.status.toLowerCase() === 'active'))}><Plus size={17} /> Post movement</button>
        {!canManageStock && <p className="local-storage-note">Read-only view. Only the Production Supervisor can post stock movements.</p>}
        {canManageStock && itemOptions.length === 0 && <p className="local-storage-note">{kind === 'raw' ? 'Add a raw material before posting a movement.' : 'Add a product or SKU before posting finished-goods stock.'}</p>}
        {kind === 'raw' && currentMovementType === 'Purchase Inward' && !suppliers.some(supplier => supplier.status.toLowerCase() === 'active') && <p className="local-storage-note">Add an active supplier before recording a purchase.</p>}
      </form>
    )
  }

  if (module === 'Raw Material') {
    const rawMaterialRows = rawMaterials.map(item => {
      const hasHistory = hasItemMovement('raw', item.sku)
      const low = item.closingStock <= item.reorderLevel
      return <tr key={item.sku}><td><code>{item.sku}</code></td><td>{item.name}</td><td>{item.unit || '—'}</td><td>{item.supplier || '—'}</td><td><b className={low ? 'stock-low' : 'stock-good'}>{item.closingStock.toLocaleString('en-IN')}</b></td><td>{item.reorderLevel.toLocaleString('en-IN')}</td><td>₹{item.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td><span className={`status ${item.status.toLowerCase() === 'active' ? 'active' : 'draft'}`}>{item.status}</span></td><td>{!canManageStock || item.status.toLowerCase() === 'archived' ? '—' : item.closingStock === 0 && !hasHistory ? <button className="text-action danger" onClick={() => void confirmDeleteUnused('raw', item.sku)}>Delete unused</button> : item.closingStock === 0 ? <button className="text-action" onClick={() => void confirmArchive('raw', item.sku)}>Archive</button> : '—'}</td></tr>
    })
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY · RAW MATERIAL</p><h1>Raw Materials</h1></div><div className="heading-actions">
          {canManageStock && <><button className="secondary" onClick={() => { setStockMovementType('Purchase Inward'); setStockFormOpen(open => !open) }}><Plus size={16} /> Stock movement</button><button className="primary" onClick={() => setMaterialFormOpen(open => !open)}><Plus size={16} /> Add material</button></>}
        </div></div>
        {!canManageStock && <p className="local-storage-note">Read-only view. The Production Supervisor manages raw-material records and stock.</p>}
        {materialFormOpen && canManageStock && <form className="panel form-card" onSubmit={submitRawMaterial}>
          <div className="panel-heading"><div><h2>Add raw material</h2><p>Opening quantity and cost are written to the workbook and ledger.</p></div></div>
          <div className="field-grid">
            <label>Material SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. FABRIC-COTTON-01" /></label>
            <label>Material name<input name="name" required maxLength={180} placeholder="Material name" /></label>
            <label>Unit<input name="unit" required maxLength={40} placeholder="kg, meter, pcs..." /></label>
            <label>Supplier<select name="supplierId" required defaultValue=""><option value="">Select an active supplier</option>{suppliers.filter(supplier => supplier.status.toLowerCase() === 'active').map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label>Opening stock<input name="openingStock" type="number" min="0" step="0.001" required defaultValue="0" /></label>
            <label>Reorder level<input name="reorderLevel" type="number" min="0" step="0.001" required defaultValue="0" /></label>
            <label>Average unit cost<input name="unitCost" type="number" min="0" step="0.01" required defaultValue="0" /></label>
          </div>
          <button className="primary wide" type="submit" disabled={!suppliers.some(supplier => supplier.status.toLowerCase() === 'active')}><Plus size={17} /> Save material</button>
          {!suppliers.some(supplier => supplier.status.toLowerCase() === 'active') && <p className="local-storage-note">Add an active supplier before creating raw materials. <button className="text-action" type="button" onClick={() => setModule('Suppliers')}>Open Suppliers</button></p>}
        </form>}
        {stockFormOpen && canManageStock && renderMovementForm('raw', 'Post raw-material movement', ['Purchase Inward', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Adjustment In', 'Adjustment Out'], 'Purchase Inward')}
        <div className="table-card entries-table inventory-table"><PaginatedTable label="Raw material inventory" resetKey="raw-materials" header={<thead><tr><th>SKU</th><th>Material</th><th>Unit</th><th>Supplier</th><th>On hand</th><th>Reorder at</th><th>Stock value</th><th>Status</th><th>Actions</th></tr></thead>} rows={rawMaterialRows} />
          {rawMaterials.length === 0 && <div className="empty-state"><Boxes size={26} /><strong>No raw materials yet</strong><span>Add an item, then record purchase inward, issue, consumption, wastage or a correction.</span></div>}
        </div>
      </section>
    )
  }

  if (module === 'Finished Goods') {
    const productRows = new Map(products.map(product => [product.sku.toLowerCase(), product]))
    finishedGoods.forEach(item => {
      if (productRows.has(item.sku.toLowerCase())) return
      productRows.set(item.sku.toLowerCase(), {
        id: item.sku,
        sku: item.sku,
        masterSku: item.sku,
        name: item.name,
        category: '',
        mrp: 0,
        stock: item.availableStock,
        status: item.status.toLowerCase() === 'archived' ? 'Draft' : 'Active',
        size: '',
        color: '',
        packQuantity: 1,
        isVariant: false,
      })
    })
    const finishedRows = [...productRows.values()].map(product => ({
      product,
      item: finishedGoods.find(item => item.sku.toLowerCase() === product.sku.toLowerCase()),
    }))
    const finishedTableRows = finishedRows.map(({ product, item }) => {
      const available = item?.availableStock || 0
      const hasHistory = hasItemMovement('finished', product.sku)
      return <tr key={product.sku}><td><code>{product.sku}</code></td><td>{product.name}</td><td>{item?.productionReceived || 0}</td><td>{item?.qualityApproved || 0}</td><td>{item?.dispatchedStock || 0}</td><td>{item?.returnedStock || 0}</td><td>{item?.damagedStock || 0}</td><td>{item?.reservedStock || 0}</td><td><b className={available < 10 ? 'stock-low' : 'stock-good'}>{available}</b></td><td><span className={`status ${item?.status.toLowerCase() === 'archived' ? 'draft' : 'active'}`}>{item?.status || 'Not initialized'}</span></td><td>{!canManageStock || !item || item.status.toLowerCase() === 'archived' ? '—' : available === 0 && !hasHistory ? <button className="text-action danger" onClick={() => void confirmDeleteUnused('finished', product.sku)}>Delete unused</button> : available === 0 ? <button className="text-action" onClick={() => void confirmArchive('finished', product.sku)}>Archive</button> : '—'}</td></tr>
    })
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY · FINISHED GOODS</p><h1>Finished Goods</h1></div><div className="heading-actions">{canManageStock && <><button className="secondary" disabled={zeroStockInitializationBusy} onClick={() => void initializeZeroFinishedStock()}>{zeroStockInitializationBusy ? 'Initializing…' : 'Initialize zero-stock SKUs to 10,000'}</button><button className="primary" onClick={() => { setStockMovementType('Opening Stock'); setStockFormOpen(open => !open) }}><Plus size={16} /> Stock movement</button></>}</div></div>
        {!canManageStock && <p className="local-storage-note">Read-only view. The Production Supervisor manages finished-goods stock.</p>}
        {stockFormOpen && canManageStock && renderMovementForm('finished', 'Post finished-goods movement', ['Opening Stock', 'Dispatch', 'Return', 'Damage', 'Adjustment In', 'Adjustment Out', 'Reserve', 'Release Reservation'], 'Opening Stock')}
        <div className="table-card entries-table inventory-table"><PaginatedTable label="Finished-goods inventory" resetKey="finished-goods" header={<thead><tr><th>SKU</th><th>Product</th><th>Produced</th><th>Approved</th><th>Dispatched</th><th>Returned</th><th>Damaged</th><th>Reserved</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead>} rows={finishedTableRows} />
          {finishedRows.length === 0 && <div className="empty-state"><Package size={26} /><strong>No active products or SKUs</strong><span>Add products and variants in Product Catalog first.</span></div>}
        </div>
      </section>
    )
  }

  if (module === 'Inventory') {
    const activeRaw = rawMaterials.filter(item => item.status.toLowerCase() !== 'archived')
    const activeFinished = finishedGoods.filter(item => item.status.toLowerCase() !== 'archived')
    const lowStock = activeRaw.filter(item => item.closingStock <= item.reorderLevel)
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY CONTROL</p><h1>Inventory</h1></div><div className="heading-actions"><button className="secondary" onClick={() => setModule('Stock Movement')}><ArrowUpRight size={16} /> Movement ledger</button></div></div>
        <div className="stats-grid inventory-stats">
          <div className="stat-card"><div className="stat-body"><span>Raw material SKUs</span><strong>{activeRaw.length}</strong><small>{lowStock.length} at or below reorder level</small></div></div>
          <div className="stat-card"><div className="stat-body"><span>Raw material on hand</span><strong>{activeRaw.reduce((sum, item) => sum + item.closingStock, 0).toLocaleString('en-IN')}</strong><small>Across active materials</small></div></div>
          <div className="stat-card"><div className="stat-body"><span>Finished goods SKUs</span><strong>{activeFinished.length}</strong><small>Production and returned stock</small></div></div>
          <div className="stat-card"><div className="stat-body"><span>Finished goods available</span><strong>{activeFinished.reduce((sum, item) => sum + item.availableStock, 0).toLocaleString('en-IN')}</strong><small>After dispatch, damage and reservations</small></div></div>
        </div>
        {lowStock.length > 0 && <div className="local-storage-note inventory-alert"><strong>Reorder check:</strong> {lowStock.map(item => `${item.name} (${item.closingStock} ${item.unit})`).join(', ')}</div>}
        <div className="inventory-shortcuts">
          <button className="panel inventory-shortcut" onClick={() => setModule('Raw Material')}><Boxes size={22} /><span><strong>Raw Materials</strong><small>Purchase, issue, consume and correct stock</small></span><ArrowUpRight size={17} /></button>
          <button className="panel inventory-shortcut" onClick={() => setModule('Finished Goods')}><Package size={22} /><span><strong>Finished Goods</strong><small>Production, dispatch, returns, damage and reservations</small></span><ArrowUpRight size={17} /></button>
          <button className="panel inventory-shortcut" onClick={() => setModule('Stock Movement')}><Archive size={22} /><span><strong>Stock Movement</strong><small>Audit trail of every posted inventory movement</small></span><ArrowUpRight size={17} /></button>
        </div>
        <div className="panel table-card inventory-recent"><div className="panel-heading"><div><h2>Recent stock activity</h2><p>Posted movements are immutable; use an adjustment to correct stock.</p></div></div>
          <MovementTable movements={stockMovements.slice(0, 8)} />
        </div>
      </section>
    )
  }

  if (module === 'Stock Movement') {
    const filteredMovements = stockMovements.filter(movement =>
      `${movement.sku} ${movement.type} ${movement.referenceId} ${movement.reason} ${movement.itemType}`.toLowerCase().includes(search.toLowerCase())
    )
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY · AUDIT LEDGER</p><h1>Stock Movement</h1></div><span className="status active">{stockMovements.length} movements</span></div>
        <div className="local-storage-note">Posted movements cannot be deleted. Correct an error with an adjustment; zero-balance items with history can only be archived.</div>
        <div className="toolbar"><div className="table-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SKU, reference or movement" /></div></div>
        <div className="table-card entries-table inventory-table"><MovementTable movements={filteredMovements} resetKey={search} /></div>
      </section>
    )
  }

  if (module === 'Shipping & Delivery' || module === 'Returns & RTO') {
    const isShipping = module === 'Shipping & Delivery'
    const relevantTypes = isShipping ? ['Dispatch'] : ['Return', 'Damage']
    const relevantMovements = stockMovements.filter(movement => movement.itemType === 'Finished Goods' && relevantTypes.includes(movement.type))
    const returnableDispatches = stockMovements
      .filter(movement =>
        movement.itemType === 'Finished Goods' &&
        movement.type === 'Dispatch' &&
        movement.referenceId.trim() &&
        deliveryChannels.includes(movement.salesChannel)
      )
      .map(dispatch => {
        const alreadyProcessed = stockMovements
          .filter(movement =>
            movement.itemType === 'Finished Goods' &&
            ['Return', 'Damage'].includes(movement.type) &&
            movement.sku.toLowerCase() === dispatch.sku.toLowerCase() &&
            movement.referenceId.trim().toLowerCase() === dispatch.referenceId.trim().toLowerCase() &&
            (!movement.salesChannel || movement.salesChannel === dispatch.salesChannel)
          )
          .reduce((total, movement) => total + movement.quantity, 0)
        return { ...dispatch, remainingQuantity: Math.max(0, dispatch.quantity - alreadyProcessed) }
      })
      .filter(dispatch => dispatch.remainingQuantity > 0)
    const platformReturnDispatches = returnableDispatches.filter(dispatch => dispatch.salesChannel === returnChannel)
    const selectedReturnDispatch = platformReturnDispatches.find(dispatch => dispatch.id === returnDispatchId)
    const channelPlatforms = deliveryMarketplacePlatforms[deliveryChannel] || []
    const channelProductSkus = new Set(marketplaceListings
      .filter(listing =>
        channelPlatforms.includes(listing.platform.trim().toUpperCase()) &&
        listing.status.toLowerCase() === 'active'
      )
      .map(listing => listing.productSku.toLowerCase()))
    const deliveryVariantMasters = new Set(products.filter(product => product.isVariant && product.status === 'Active').map(product => product.masterSku.toLowerCase()))
    const pendingSalesOrders = salesOrders.filter(order =>
      order.quantity - order.fulfilledQuantity - order.cancelledQuantity > 0
    )
    const selectedBookedOrder = pendingSalesOrders.find(order => order.id === deliverySalesOrderId)
    const deliveryProducts = products.filter(product =>
      product.status === 'Active' &&
      (deliveryChannel === 'DIRECT' || channelProductSkus.has(product.sku.toLowerCase())) &&
      (product.isVariant || !deliveryVariantMasters.has(product.sku.toLowerCase()))
    )
    const selectedDeliveryProduct = deliveryProducts.find(product => product.sku === deliverySku)
    const selectedDeliveryListing = marketplaceListings.find(listing =>
      listing.productSku.toLowerCase() === deliverySku.toLowerCase() &&
      channelPlatforms.includes(listing.platform.trim().toUpperCase()) &&
      listing.status.toLowerCase() === 'active'
    )
    const deliveryPartnerReady = Boolean(deliveryPartnerChoice && (deliveryPartnerChoice !== 'Other' || customDeliveryPartner.trim()))
    return (
      <section>
        <div className="page-heading"><div><p>FINISHED GOODS · {isShipping ? 'DISPATCH' : 'RETURNS'}</p><h1>{module}</h1></div></div>
        {!canManageDelivery ? <p className="local-storage-note">Read-only view. Only the Production Supervisor can record deliveries, returns, or damage; saved records are listed below.</p> : isShipping ? <form className="panel form-card delivery-form" onSubmit={submitDelivery}>
          <div className="panel-heading"><div><h2>Create delivery</h2><p>Dispatch booked sales orders by selecting their order ID; the dispatch consumes reserved stock. Marketplace dispatches use available stock.</p></div></div>
          <div className="field-grid">
            <label>Platform / channel<select name="salesChannel" required value={deliveryChannel} onChange={event => {
              setDeliveryChannel(event.target.value)
              setDeliveryPartnerChoice('')
              setCustomDeliveryPartner('')
              setDeliverySku('')
              setDeliverySalesOrderId('')
              setDeliveryReferenceId('')
              setDeliveryQuantity('')
              setDeliveryUnitPrice('')
            }}>
              <option value="">Select platform first</option>
              {deliveryChannels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
            </select></label>
            {deliveryChannel && <label>Delivery partner<select name="deliveryPartnerChoice" required value={deliveryPartnerChoice} onChange={event => setDeliveryPartnerChoice(event.target.value)}>
              <option value="">Select delivery partner</option>
              {(deliveryPartnersByChannel[deliveryChannel] || []).map(partner => <option key={partner} value={partner}>{partner}</option>)}
              <option value="Other">Other courier…</option>
            </select></label>}
            {deliveryPartnerChoice === 'Other' && <label>Partner name<input name="customDeliveryPartner" required maxLength={100} value={customDeliveryPartner} onChange={event => setCustomDeliveryPartner(event.target.value)} placeholder="Enter delivery partner name" /></label>}
            {deliveryPartnerReady && <>
            {deliveryChannel === 'DIRECT' && <label>Booked sales order<select value={deliverySalesOrderId} onChange={event => {
              const order = pendingSalesOrders.find(item => item.id === event.target.value)
              setDeliverySalesOrderId(order?.id || '')
              setDeliverySku(order?.sku || '')
              setDeliveryReferenceId(order?.id || '')
              setDeliveryQuantity(order ? String(order.quantity - order.fulfilledQuantity - order.cancelledQuantity) : '')
              setDeliveryUnitPrice(order ? String(order.unitPrice) : '')
            }}>
              <option value="">Select a booked sales order</option>
              {pendingSalesOrders.map(order => <option key={order.id} value={order.id}>{order.id} · {order.customerName} · {order.sku} · {order.quantity - order.fulfilledQuantity - order.cancelledQuantity} remaining</option>)}
            </select></label>}
            <label>Product SKU<select name="sku" required value={deliverySku} onChange={event => {
              const sku = event.target.value
              setDeliverySku(sku)
              setDeliverySalesOrderId('')
              const listing = marketplaceListings.find(item =>
                item.productSku.toLowerCase() === sku.toLowerCase() &&
                channelPlatforms.includes(item.platform.trim().toUpperCase()) &&
                item.status.toLowerCase() === 'active'
              )
              setDeliveryUnitPrice(listing ? String(listing.sellingPrice) : '')
            }} disabled={deliveryProducts.length === 0 || Boolean(selectedBookedOrder)}>
              <option value="">{deliveryProducts.length ? 'Select platform SKU' : 'No active SKUs for this platform'}</option>
              {deliveryProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku} · Available {product.stock}</option>)}
            </select></label>
            {selectedDeliveryProduct && <div className="delivery-stock"><span>{selectedBookedOrder ? 'Reserved for this order' : 'Available stock'}</span><strong>{selectedBookedOrder ? selectedBookedOrder.quantity - selectedBookedOrder.fulfilledQuantity - selectedBookedOrder.cancelledQuantity : selectedDeliveryProduct.stock.toLocaleString('en-IN')} units</strong></div>}
            {selectedDeliveryProduct && <label>Unit sale price<input name="unitPrice" type="number" min="0.01" step="0.01" required value={selectedBookedOrder ? String(selectedBookedOrder.unitPrice) : deliveryUnitPrice} onChange={event => setDeliveryUnitPrice(event.target.value)} disabled={Boolean(selectedBookedOrder)} />{selectedDeliveryListing && <small>Defaults to the listing price; adjust to the actual dispatch price if needed.</small>}</label>}
            <label>Quantity<input name="quantity" type="number" min="1" max={selectedBookedOrder ? selectedBookedOrder.quantity - selectedBookedOrder.fulfilledQuantity - selectedBookedOrder.cancelledQuantity : undefined} step="1" required value={deliveryQuantity} onChange={event => setDeliveryQuantity(event.target.value)} /></label>
            <label>Order / shipment reference<input name="referenceId" maxLength={100} required placeholder={deliveryChannel === 'DIRECT' ? 'Select sales order above' : 'Marketplace order number'} value={deliveryReferenceId} onChange={event => setDeliveryReferenceId(event.target.value)} /></label>
            <label className="delivery-note">Delivery notes<input name="reason" maxLength={300} placeholder="Optional delivery note" /></label>
            </>}
          </div>
          {deliveryPartnerReady && <button className="primary wide" type="submit" disabled={!canManageDelivery || deliveryProducts.length === 0}>Save delivery and dispatch stock</button>}
          {canManageDelivery && deliveryPartnerReady && deliveryProducts.length === 0 && <p className="local-storage-note">Add an active {deliveryChannel} marketplace listing in Product Catalog before recording a delivery for this platform.</p>}
        </form> : <>
          <form className="panel form-card return-order-form" onSubmit={event => {
            event.preventDefault()
            if (selectedReturnDispatch) void submitOrderReturn(event, selectedReturnDispatch, selectedReturnDispatch.remainingQuantity)
          }}>
            <div className="panel-heading"><div><h2>Record an order return or damage</h2><p>Choose the sales platform and a shipped order. Return and damaged quantities are limited to the dispatched quantity. Returns add sellable stock; damaged returns do not.</p></div></div>
            <div className="field-grid">
              <label>Platform / channel<select required value={returnChannel} onChange={event => {
                setReturnChannel(event.target.value)
                setReturnDispatchId('')
              }}>
                <option value="">Select platform first</option>
                {deliveryChannels.map(channel => <option key={channel} value={channel}>{channel}</option>)}
              </select></label>
              <label>Shipped order / SKU<select required value={returnDispatchId} disabled={!returnChannel || platformReturnDispatches.length === 0} onChange={event => setReturnDispatchId(event.target.value)}>
                <option value="">{!returnChannel ? 'Select platform first' : platformReturnDispatches.length ? 'Select order number and SKU' : 'No returnable orders for this platform'}</option>
                {platformReturnDispatches.map(dispatch => {
                  const productName = products.find(product => product.sku.toLowerCase() === dispatch.sku.toLowerCase())?.name || dispatch.sku
                  return <option key={dispatch.id} value={dispatch.id}>{dispatch.referenceId} · {productName} · {dispatch.sku} · {dispatch.remainingQuantity} remaining</option>
                })}
              </select></label>
              {selectedReturnDispatch && <div className="delivery-stock"><span>{selectedReturnDispatch.referenceId} · {selectedReturnDispatch.sku}</span><strong>{selectedReturnDispatch.remainingQuantity} of {selectedReturnDispatch.quantity} shipped units still available for return or damage</strong></div>}
              <label>Return status<select name="type" required defaultValue="Return"><option value="Return">Returned to sellable stock</option><option value="Damage">Returned damaged / not sellable</option></select></label>
              <label>Quantity<input name="quantity" type="number" min="1" step="1" max={selectedReturnDispatch?.remainingQuantity || undefined} required disabled={!selectedReturnDispatch} /></label>
              <label className="delivery-note">Notes<input name="reason" maxLength={300} placeholder="Optional reason or condition details" /></label>
            </div>
            <button className="primary wide" type="submit" disabled={!canManageDelivery || !selectedReturnDispatch}>Save order return / damage</button>
            {canManageDelivery && returnChannel && platformReturnDispatches.length === 0 && <p className="local-storage-note">No returnable shipped orders are recorded for {returnChannel}. Older deliveries without an order number can still be entered manually below.</p>}
          </form>
          <details className="panel return-manual-entry">
            <summary>Use existing manual stock-movement entry</summary>
            {renderMovementForm('finished', 'Record manual return or damage', relevantTypes, relevantTypes[0])}
          </details>
        </>}
        <div className="table-card entries-table inventory-table"><MovementTable movements={relevantMovements} showDeliveryDetails /></div>
      </section>
    )
  }

  if (module === 'Machines') {
    const machineTypeOptions = [...new Set([
      'Production Machine',
      'Stitching Machine',
      'Cutting Machine',
      ...machines.map(machine => machine.type.trim()).filter(Boolean),
    ])]
    const machineRows = machines.map(machine => <tr key={machine.id}><td><code>{machine.id}</code></td><td>{machine.name || '—'}</td><td>{machine.type || '—'}</td><td>{machine.operator || '—'}</td><td><span className="status active">{machine.status}</span></td></tr>)
    const exportMachines = () => {
      const rows = machines.map(({ id, name, type, operator, status }) => ({ id, name, type, operator, status }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Machines')
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Machines-${indiaDateKey()}.xlsx`)
      notify('Machine list downloaded as a new workbook')
    }
    const addMachine = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!canManageInventory) {
        notify('Only the Super Admin or Production Supervisor can add machines')
        return
      }
      const formElement = event.currentTarget
      const form = new FormData(formElement)
      const name = String(form.get('name')).trim()
      const selectedType = String(form.get('type') || '')
      const customType = String(form.get('customType') || '').trim()
      const type = selectedType === '__custom__' ? customType : selectedType
      if (!name) return
      if (selectedType === '__custom__' && !type) {
        notify('Enter a custom machine type.')
        return
      }
      try {
        await saveMachine({
          name,
          type,
          operator: String(form.get('operator')),
          status: String(form.get('status')),
        })
        formElement.reset()
        setMachineTypeChoice('')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Machine could not be saved')
      }
    }
    return (
      <section>
        <div className="page-heading"><div><p>FACTORY SETUP</p><h1>Machines</h1></div><div className="heading-actions"><span className="status active">{machines.length} configured</span><button className="secondary" onClick={exportMachines}><Download size={16} /> Export Excel</button></div></div>
        {canManageInventory && <form className="panel form-card machine-form" onSubmit={addMachine}>
          <div className="panel-heading"><div><h2>Add machine</h2><p>Machine roster used in production entries</p></div></div>
          <div className="field-grid">
            <label>Machine name<input name="name" required placeholder="e.g. Cutting machine" /></label>
            <label>Machine type<select name="type" value={machineTypeChoice} onChange={event => setMachineTypeChoice(event.target.value)}><option value="">Select type</option>{machineTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}<option value="__custom__">Other / custom</option></select></label>
            {machineTypeChoice === '__custom__' && <label>Custom machine type<input name="customType" maxLength={80} required placeholder="Enter machine type" /></label>}
            <label>Operator<input name="operator" placeholder="Operator name" /></label>
            <label>Status<select name="status"><option>Idle</option><option>Running</option><option>Maintenance</option></select></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Add machine</button>
        </form>}
        <div className="table-card entries-table"><PaginatedTable label="Machine roster" resetKey="machines" header={<thead><tr><th>Machine ID</th><th>Name</th><th>Type</th><th>Operator</th><th>Status</th></tr></thead>} rows={machineRows} />{machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machines configured</strong><span>The Super Admin or Production Supervisor can add machines.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Product Catalog') {
    const masterProducts = products.filter(product => !product.isVariant)
    const platformSearch = catalogPlatformSearch.trim().toLowerCase()
    const filteredPlatforms = marketplaces.filter(platform => platform.toLowerCase().includes(platformSearch))
    const selectedProduct = masterProducts.find(product => product.sku === selectedCatalogMasterSku)
    const selectedVariants = selectedProduct
      ? products.filter(product => product.isVariant && product.masterSku.toLowerCase() === selectedProduct.sku.toLowerCase())
      : []
    const selectedSkuProducts = selectedProduct ? [selectedProduct, ...selectedVariants] : []
    const selectedSkuKeys = new Set(selectedSkuProducts.map(product => product.sku.toLowerCase()))
    const platformListings = catalogPlatformFilter
      ? marketplaceListings.filter(listing => listing.platform.toLowerCase() === catalogPlatformFilter.toLowerCase())
      : []
    const visiblePlatformListings = platformListings.filter(listing =>
      `${listing.platform} ${listing.platformSku} ${listing.productName} ${listing.productSku} ${listing.masterSku}`.toLowerCase().includes(search.toLowerCase())
    )
    const platformProductRows = visiblePlatformListings.map(listing => <tr key={listing.id}>
      <td><code>{listing.platformSku}</code></td>
      <td><button type="button" className="catalog-product-link" onClick={() => {
        setSelectedCatalogMasterSku(listing.masterSku)
        setCatalogFormOpen(null)
        setCatalogListingFilter('')
      }}>{listing.productName || listing.productSku}</button></td>
      <td><code>{listing.productSku}</code></td>
      <td>₹{listing.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>₹{listing.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td><span className="status active">{listing.status}</span></td>
    </tr>)
    const selectedListings = selectedProduct
      ? marketplaceListings.filter(listing =>
        listing.masterSku.toLowerCase() === selectedProduct.sku.toLowerCase() ||
        selectedSkuKeys.has(listing.productSku.toLowerCase())
      )
      : []
    const visibleListings = selectedListings.filter(listing =>
      (!catalogListingFilter || listing.platform.toLowerCase() === catalogListingFilter.toLowerCase()) &&
      `${listing.platform} ${listing.platformSku} ${listing.productName} ${listing.productSku} ${listing.masterSku}`.toLowerCase().includes(search.toLowerCase())
    )
    const skuRows = selectedSkuProducts.map(product => (
      <tr key={product.sku}>
        <td>{product.isVariant ? 'Variant' : 'Master'}</td>
        <td>{product.name}</td>
        <td><code>{product.sku}</code></td>
        <td>{product.isVariant ? [product.size, product.color].filter(Boolean).join(' · ') || '—' : '—'}</td>
        <td>₹{product.mrp.toLocaleString('en-IN')}</td>
        <td><b className={product.stock < 50 ? 'stock-low' : 'stock-good'}>{product.stock}</b></td>
        <td>{skuListingCount(product)}</td>
        <td><span className={`status ${product.status.toLowerCase()}`}>{product.status}</span></td>
      </tr>
    ))
    const catalogListingRows = visibleListings.map(listing => <tr key={listing.id}><td><b>{listing.platform}</b></td><td><code>{listing.platformSku}</code></td><td>{listing.productName}</td><td><code>{listing.productSku}</code></td><td>₹{listing.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td>₹{listing.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td><span className="status active">{listing.status}</span></td></tr>)
    const skuListingCount = (product: Product) => selectedListings.filter(listing =>
      product.isVariant
        ? listing.productSku.toLowerCase() === product.sku.toLowerCase()
        : listing.masterSku.toLowerCase() === product.sku.toLowerCase() || listing.productSku.toLowerCase() === product.sku.toLowerCase()
    ).length
    return (
      <section className="catalog-page">
        <div className="page-heading">
          <div><p>CATALOG</p><h1>Product Catalog</h1><span className="catalog-intro">Select a platform to view its products and marketplace SKUs.</span></div>
          <div className="heading-actions">
            <button className="secondary" disabled={marketplaceImportBusy} onClick={() => marketplaceImportFileRef.current?.click()}><Upload size={17} /> Import workbook</button>
            <button className="secondary" onClick={() => {
              setCatalogPlatform('')
              setCatalogPlatformSearch('')
              setCatalogFormOpen(open => open === 'listing' ? null : 'listing')
            }}><Plus size={16} /> Add marketplace SKU</button>
            <button className="primary" onClick={() => setCatalogFormOpen(open => open === 'product' ? null : 'product')}><Plus size={17} /> Add product</button>
          </div>
        </div>
        <input
          ref={marketplaceImportFileRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void loadMarketplaceImport(file)
          }}
        />
        <div className="panel catalog-product-picker">
          <div className="panel-heading"><div><h2>1. Select platform</h2><p>Choose a marketplace to view all of its saved products below.</p></div></div>
          <div className="catalog-picker-body">
            <label>Platform<select aria-label="Select marketplace platform" value={catalogPlatformFilter} onChange={event => {
                setCatalogPlatformFilter(event.target.value)
                setSelectedCatalogMasterSku('')
                setCatalogFormOpen(null)
                setCatalogListingFilter('')
              }}>
              <option value="">Select a platform</option>
              {marketplaces.map(platform => <option key={platform} value={platform}>{platform} ({marketplaceListings.filter(listing => listing.platform.toLowerCase() === platform.toLowerCase()).length})</option>)}
            </select></label>
            {catalogPlatformFilter
              ? <div className="catalog-platform-summary">
                <strong>{new Set(platformListings.map(listing => listing.masterSku.toLowerCase())).size}</strong><span>products</span>
                <strong>{platformListings.length}</strong><span>marketplace SKUs</span>
              </div>
              : <p className="marketplace-selection-note">Select a platform to see its products and marketplace SKUs.</p>}
          </div>
        </div>
        <div className="panel catalog-section">
          <div className="panel-heading">
            <div><h2>2. Products on {catalogPlatformFilter || 'selected platform'}</h2><p>{catalogPlatformFilter ? `${platformListings.length} marketplace SKU(s) · ${new Set(platformListings.map(listing => listing.masterSku.toLowerCase())).size} product(s)` : 'Choose a platform above to load its products.'}</p></div>
          </div>
          <div className="table-card">
            <PaginatedTable label={`${catalogPlatformFilter || 'Marketplace'} products`} resetKey={`${catalogPlatformFilter}:${search}`} header={<thead><tr><th>Marketplace SKU</th><th>Product</th><th>Internal SKU</th><th>MRP</th><th>Selling price</th><th>Status</th></tr></thead>} rows={platformProductRows} />
            {!catalogPlatformFilter
              ? <div className="empty-state"><Boxes size={24} /><strong>Select a platform</strong><span>Choose a marketplace above to view all products assigned to it.</span></div>
              : platformListings.length === 0
                ? <div className="empty-state"><Boxes size={24} /><strong>No marketplace listings</strong><span>No products are assigned to {catalogPlatformFilter} yet.</span></div>
                : visiblePlatformListings.length === 0
                  ? <div className="empty-state"><Search size={24} /><strong>No matching products</strong><span>Try a different product name or SKU.</span></div>
                  : null}
          </div>
        </div>
        {catalogFormOpen === 'product' && <form className="panel form-card" onSubmit={submitCatalogProduct}>
          <div className="panel-heading"><div><h2>Add product</h2><p>Save a master product to the shared Excel workbook.</p></div></div>
          <div className="field-grid">
            <label>Master SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. COTTON-SHIRT-01" /></label>
            <label>Product name<input name="name" required maxLength={180} placeholder="Product title" /></label>
            <label>Category<input name="category" maxLength={100} placeholder="e.g. Shirts" /></label>
            <label>MRP<input name="mrp" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Save product to Excel</button>
        </form>}
        {catalogFormOpen === 'variant' && selectedProduct && <form className="panel form-card" onSubmit={submitSkuVariant}>
          <div className="panel-heading"><div><h2>Add SKU variant</h2><p>Link this size/color SKU to {selectedProduct.name}.</p></div></div>
          <div className="field-grid">
            <input type="hidden" name="masterSku" value={selectedProduct.sku} />
            <label>Master product<input value={`${selectedProduct.name} · ${selectedProduct.sku}`} readOnly /></label>
            <label>Variant SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. COTTON-SHIRT-01-BLK-M" /></label>
            <label>Size<input name="size" maxLength={60} placeholder="e.g. M" /></label>
            <label>Color<input name="color" maxLength={60} placeholder="e.g. Black" /></label>
            <label>Pack quantity<input name="packQuantity" type="number" min="1" step="1" required defaultValue="1" /></label>
            <label>MRP<input name="mrp" type="number" min="0" step="0.01" placeholder="Uses master product MRP" /></label>
            <label>Selling price<input name="sellingPrice" type="number" min="0" step="0.01" placeholder="Uses variant MRP" /></label>
          </div>
          <button className="primary wide" type="submit" disabled={selectedProduct.status !== 'Active'}><Plus size={17} /> Save SKU to Excel</button>
        </form>}
        {catalogFormOpen === 'listing' && <form className="panel form-card" onSubmit={submitMarketplaceListing}>
          <div className="panel-heading"><div><h2>Add marketplace SKU</h2><p>{selectedProduct ? `Link a marketplace SKU to ${selectedProduct.name} or one of its variants.` : 'Choose a saved product or variant and link its marketplace SKU.'}</p></div></div>
          <div className="field-grid">
            <div className="catalog-platform-picker">
              <label>Search platform
                <div className="catalog-platform-search">
                  <Search size={15} />
                  <input
                    value={catalogPlatformSearch}
                    onChange={event => setCatalogPlatformSearch(event.target.value)}
                    placeholder="Search platform"
                  />
                  {catalogPlatformSearch && <button type="button" aria-label="Clear platform search" onClick={() => setCatalogPlatformSearch('')}>×</button>}
                </div>
              </label>
              <input type="hidden" name="platform" value={catalogPlatform} />
              <div className="catalog-platform-options" role="radiogroup" aria-label="Select marketplace platform">
                {filteredPlatforms.map(platform => (
                  <button
                    key={platform}
                    type="button"
                    role="radio"
                    aria-checked={catalogPlatform === platform}
                    className={catalogPlatform === platform ? 'catalog-platform-option active' : 'catalog-platform-option'}
                    onClick={() => setCatalogPlatform(platform)}
                  >{platform}</button>
                ))}
              </div>
              {!filteredPlatforms.length && <span className="catalog-search-count">No matching platforms</span>}
            </div>
            <label>Product SKU<select name="productSku" required defaultValue={selectedProduct?.sku || ''}><option value="" disabled>Select internal SKU</option>{products.filter(product => product.status === 'Active').map(product => <option key={product.sku} value={product.sku}>{product.isVariant ? 'Variant' : 'Master'} · {product.name} · {product.sku}</option>)}</select></label>
            <label>Marketplace SKU<input name="platformSku" required maxLength={100} autoComplete="off" placeholder="Enter SKU used on this marketplace" /></label>
            <label>MRP<input name="mrp" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
            <label>Selling price<input name="sellingPrice" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
          </div>
          <button className="primary wide" type="submit" disabled={!catalogPlatform || !products.some(product => product.status === 'Active')}><Plus size={17} /> Save marketplace SKU</button>
        </form>}
        {marketplaceImportError && <p className="marketplace-import-error" role="alert">{marketplaceImportError}</p>}
        {marketplaceImportPreview && <div className="panel marketplace-import-panel">
          <div className="panel-heading">
            <div><h2>Review marketplace workbook</h2><p>{marketplaceImportFileName}</p></div>
            <button className="text-button" type="button" disabled={marketplaceImportBusy} onClick={() => { setMarketplaceImportPreview(null); setMarketplaceImportError('') }}>Cancel</button>
          </div>
          <div className="marketplace-import-summary">
            <div><strong>{marketplaceImportPreview.products.length}</strong><span>Product masters</span></div>
            <div><strong>{marketplaceImportPreview.variants.length}</strong><span>SKU variants</span></div>
            <div><strong>{selectedMarketplaceImportListings.length}</strong><span>Selected listings</span></div>
            <div><strong>{marketplaceImportPreview.finishedGoods.length}</strong><span>ERP opening-stock rows</span></div>
          </div>
          <p className="marketplace-selection-note">
            Workbook platforms: {Object.entries(importPlatformCounts || {}).map(([platform, count]) => `${platform} ${count}`).join(' · ')}.
            {' '}Workbook issues flagged: {marketplaceImportPreview.issues.length}.
          </p>
          <fieldset className="marketplace-import-platforms" disabled={marketplaceImportBusy}>
            <legend>Select platform listings to import</legend>
            <div className="marketplace-import-platform-actions">
              <button type="button" className="text-button" onClick={() => setSelectedImportPlatforms(Object.keys(importPlatformCounts || {}))}>Select all</button>
              <button type="button" className="text-button" onClick={() => setSelectedImportPlatforms([])}>Clear selection</button>
            </div>
            <div className="marketplace-import-platform-options">
              {Object.entries(importPlatformCounts || {}).map(([platform, count]) => (
                <label key={platform}>
                  <input
                    type="checkbox"
                    checked={selectedImportPlatforms.includes(platform)}
                    onChange={event => setSelectedImportPlatforms(current =>
                      event.target.checked
                        ? [...current, platform]
                        : current.filter(item => item !== platform)
                    )}
                  />
                  <span>{platform}</span>
                  <small>{count} listings</small>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="local-storage-note">Only checked-platform listings are imported now. Product masters, variants, and shared opening-stock rows stay in the batch so imports can be done in stages without breaking shared SKU links or stock. You can import the remaining platforms later from this same workbook.</p>
          <p className="local-storage-note">Matching products, variants, and listings are updated only when imported values differ; blank cells never erase saved values. Optional opening-stock rows are added only for SKUs without an existing stock record or ledger history, and create an opening movement. A product SKU change matches by product ID, then by a unique exact title, and updates linked current records while leaving historical stock and production logs unchanged. Unchanged rows are preserved, and nothing is deleted. A Drive backup is created before changes.</p>
          {marketplaceImportPreview.issues.length > 0 && <details className="marketplace-import-issues">
            <summary>Review {marketplaceImportPreview.issues.length} source issues</summary>
            <ul>{marketplaceImportPreview.issues.slice(0, 20).map((issue, index) => (
              <li key={`${String(issue.Source || 'source')}-${String(issue['Source Row'] || index)}-${index}`}>
                {String(issue.Source || 'Source')} row {String(issue['Source Row'] || '—')}: {String(issue.Issue || 'Needs review')}
              </li>
            ))}</ul>
            {marketplaceImportPreview.issues.length > 20 && <span>Only the first 20 issues are shown.</span>}
          </details>}
          <button className="primary wide" type="button" disabled={marketplaceImportBusy || selectedMarketplaceImportListings.length === 0} onClick={() => void applyMarketplaceImport()}>
            {marketplaceImportBusy ? 'Importing…' : selectedMarketplaceImportListings.length
              ? `Back up and import ${selectedMarketplaceImportListings.length} selected listings and ${marketplaceImportPreview.finishedGoods.length} opening-stock rows`
              : 'Select at least one platform to import'}
          </button>
        </div>}
        {marketplaceImportResult && <div className="panel marketplace-import-panel">
          <div className="panel-heading"><div><h2>Import complete</h2><p>Rows were saved to the connected Google Sheet. Catalog refresh runs in the background; do not repeat the import or reload while it syncs.</p></div></div>
          <p className="marketplace-selection-note">
            Added: {marketplaceImportResult.added.products} products, {marketplaceImportResult.added.variants} variants, {marketplaceImportResult.added.listings} listings.
            {marketplaceImportResult.openingStock && <> Added {marketplaceImportResult.openingStock.added} ERP opening-stock rows; {marketplaceImportResult.openingStock.skipped} already imported.</>}
            {marketplaceImportResult.updated
              ? <> Updated: {marketplaceImportResult.updated.products} products, {marketplaceImportResult.updated.variants} variants, {marketplaceImportResult.updated.listings} listings.</>
              : <> Latest Apps Script must be deployed to show how many existing rows were updated.</>}
            {marketplaceImportResult.renamedProducts !== undefined && <> Product SKU renames: {marketplaceImportResult.renamedProducts}.</>}
            {' '}Skipped: {marketplaceImportResult.skipped.products} products, {marketplaceImportResult.skipped.variants} variants, {marketplaceImportResult.skipped.listings} listings.
          </p>
          {marketplaceImportResult.backupName && <p className="marketplace-selection-note">Backup created in Drive: <code>{marketplaceImportResult.backupName}</code></p>}
        </div>}
        {selectedProduct && <>
        <div className="panel catalog-section">
          <div className="panel-heading">
            <div><h2>Product details: {selectedProduct.name}</h2><p>Master SKU and all variants for this product.</p></div>
            <div className="heading-actions catalog-actions">
              <button className="secondary" onClick={() => setCatalogFormOpen(open => open === 'variant' ? null : 'variant')} disabled={selectedProduct.status !== 'Active'}><Plus size={16} /> Add SKU variant</button>
              <button className="primary" onClick={() => {
                setCatalogPlatform('')
                setCatalogPlatformSearch('')
                setCatalogFormOpen(open => open === 'listing' ? null : 'listing')
              }} disabled={selectedProduct.status !== 'Active'}><Plus size={16} /> Add marketplace SKU</button>
            </div>
          </div>
          <div className="table-card">
            <PaginatedTable label="Product SKUs" resetKey={selectedProduct.sku} header={<thead><tr><th>SKU type</th><th>Product / variant</th><th>Internal SKU</th><th>Size / color</th><th>MRP</th><th>Stock</th><th>Marketplace SKUs</th><th>Status</th></tr></thead>} rows={skuRows} />
            {selectedSkuProducts.length === 0 && <div className="empty-state"><Package size={28} /><strong>No SKUs for this product</strong><span>Add a variant to make it selectable in production.</span></div>}
          </div>
        </div>
        <div className="panel catalog-section">
          <div className="panel-heading">
            <div><h2>Marketplace listings for this product</h2><p>{selectedListings.length} marketplace SKU(s) linked to this product.</p></div>
            <label className="marketplace-filter">Platform
              <select aria-label="Filter marketplace listings by platform" value={catalogListingFilter} onChange={event => setCatalogListingFilter(event.target.value)}>
              <option value="">All platforms ({selectedListings.length})</option>
              {marketplaces.map(platform => <option key={platform} value={platform}>{platform} ({selectedListings.filter(listing => listing.platform.toLowerCase() === platform.toLowerCase()).length})</option>)}
              </select>
            </label>
          </div>
          <div className="table-card">
            <PaginatedTable label="Marketplace listings" resetKey={`${selectedProduct.sku}:${catalogListingFilter}:${search}`} header={<thead><tr><th>Platform</th><th>Marketplace SKU</th><th>Product</th><th>Internal SKU</th><th>MRP</th><th>Selling price</th><th>Status</th></tr></thead>} rows={catalogListingRows} />
            {visibleListings.length === 0 && <div className="empty-state"><ShoppingCart size={28} /><strong>{selectedListings.length ? 'No matching listings' : 'No marketplace SKUs yet'}</strong><span>{selectedListings.length ? 'Try another platform or search term.' : 'Add a marketplace SKU to link this product to a sales channel.'}</span></div>}
          </div>
        </div>
        </>}
        <div className="toolbar catalog-export-toolbar">
          <div className="table-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search catalog" /></div>
          <button className="secondary" onClick={exportExcel}><Download size={16} /> Export</button>
        </div>
      </section>
    )
  }

  if (module === 'Production Targets') {
    const periodRange = productionTargetPeriodRange(productionTargetPeriodChoice, productionTargetDate)
    const periodTargets = productionTargets
      .filter(target => target.period === productionTargetPeriodChoice && target.startDate === periodRange.startDate)
      .sort((left, right) => left.machineId.localeCompare(right.machineId) || left.productName.localeCompare(right.productName))
    const targetableProducts = products.filter(product => {
      if (product.status !== 'Active') return false
      return product.isVariant || !products.some(item => item.isVariant && item.status === 'Active' && item.masterSku.toLowerCase() === product.sku.toLowerCase())
    })
    const targetableMachines = machines.filter(machine => machine.status.toLowerCase() !== 'maintenance')
    const dateLabel = productionTargetPeriodChoice === 'daily'
      ? 'Target date'
      : productionTargetPeriodChoice === 'weekly'
        ? 'Date within target week'
        : 'Date within target month'
    return (
      <section>
        <div className="page-heading"><div><p>FACTORY PLANNING</p><h1>Production Targets</h1><span className="dashboard-description">Set how many units each machine should produce and track actual output for the selected period.</span></div></div>
        <div className="panel production-target-filter">
          <div className="panel-heading"><div><h2>Choose target period</h2><p>{productionTargetPeriodChoice === 'weekly' ? 'Weeks run Monday to Sunday.' : productionTargetPeriodChoice === 'monthly' ? 'The target covers the full calendar month.' : 'The target covers one production date.'}</p></div></div>
          <div className="field-grid">
            <label>Period<select value={productionTargetPeriodChoice} onChange={event => setProductionTargetPeriodChoice(event.target.value as ProductionTargetPeriod)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
            <label>{dateLabel}<input type="date" value={productionTargetDate} onChange={event => setProductionTargetDate(event.target.value || indiaDateKey(clock))} required /></label>
          </div>
          <p className="local-storage-note">Showing {formatIndiaDate(periodRange.startDate)}{periodRange.endDate === periodRange.startDate ? '' : ` – ${formatIndiaDate(periodRange.endDate)}`} targets.</p>
        </div>
        {sessionUser.role === 'Super Admin' && <form className="panel form-card" onSubmit={submitProductionTarget}>
          <div className="panel-heading"><div><h2>Assign machine target</h2><p>Save a quantity for one machine and one product. Saving the same combination edits its target instead of adding a duplicate.</p></div></div>
          <input type="hidden" name="date" value={productionTargetDate} />
          <div className="field-grid">
            <label>Machine<select name="machineId" required disabled={targetableMachines.length === 0}><option value="">Select machine</option>{targetableMachines.map(machine => <option key={machine.id} value={machine.id}>{machine.id}{machine.name ? ` — ${machine.name}` : ''}</option>)}</select></label>
            <label>Product<select name="sku" required value={productionTargetProduct} onChange={event => setProductionTargetProduct(event.target.value)}><option value="">Select product</option><option value="__custom__">Product not in catalog (custom target)</option>{targetableProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}{product.size || product.color ? ` · ${[product.size, product.color].filter(Boolean).join(' / ')}` : ''}</option>)}</select></label>
            {productionTargetProduct === '__custom__' && <label>Custom product name<input name="customProductName" required maxLength={180} placeholder="Enter product for this target only" /><small className="field-hint">This will not create a catalog item.</small></label>}
            <label>Target quantity<input name="targetQuantity" type="number" min="1" max="1000000" step="1" required /></label>
          </div>
          {targetableMachines.length === 0 && <p className="local-storage-note">No configured machine is available. Set a machine to Idle or Running before assigning a target.</p>}
          {productionTargetProduct === '__custom__' && <p className="local-storage-note">Custom targets are planning-only. Add the product to the catalog before recording production against a SKU.</p>}
          <button className="primary wide" type="submit" disabled={productionTargetBusy || targetableMachines.length === 0}>{productionTargetBusy ? 'Saving target…' : 'Save production target'}</button>
        </form>}
        {sessionUser.role !== 'Super Admin' && <p className="local-storage-note">{sessionUser.role === 'Machine Operator' ? 'Only targets for machines assigned to you are shown here.' : 'Targets are assigned by the Super Admin. Contact them to change a machine or product target.'}</p>}
        <div className="table-card entries-table">
          <PaginatedTable
            label={`${productionTargetPeriodChoice} production targets`}
            resetKey={`${productionTargetPeriodChoice}:${periodRange.startDate}`}
            header={<thead><tr><th>Machine</th><th>Product / SKU</th><th>Target</th><th>Actual</th><th>Remaining</th><th>Progress</th></tr></thead>}
            rows={periodTargets.map(target => {
              const remaining = Math.max(0, target.targetQuantity - target.actual)
              const percent = Math.round(target.actual / target.targetQuantity * 100)
              return <tr key={target.id}><td><strong>{target.machineId}</strong><br /><span>{target.machineName}</span></td><td><strong>{target.productName}</strong><br /><code>{target.sku || 'Custom target · no catalog SKU'}</code></td><td>{target.targetQuantity.toLocaleString('en-IN')}</td><td>{target.actual.toLocaleString('en-IN')}</td><td>{remaining.toLocaleString('en-IN')}</td><td><progress value={Math.min(target.actual, target.targetQuantity)} max={target.targetQuantity} aria-label={`${target.productName}: ${percent}% of target`} />{percent}%</td></tr>
            })}
          />
          {periodTargets.length === 0 && <div className="empty-state"><Target size={24} /><strong>No targets for this period</strong><span>{sessionUser.role === 'Super Admin' ? 'Assign a machine and product target above.' : 'The Super Admin has not assigned targets for this period.'}</span></div>}
        </div>
      </section>
    )
  }

  if (module === 'Production') {
    const today = indiaDateKey(clock)
    const month = today.slice(0, 7)
    const autoProductionBlock = productionDate === today ? currentProductionBlock(clock) : undefined
    const selectedProductionBlock = autoProductionBlock?.name || productionBlockChoice
    const variantMasters = new Set(products.filter(product => product.isVariant && product.status === 'Active').map(product => product.masterSku.toLowerCase()))
    const activeProducts = products.filter(product =>
      product.status === 'Active' && (product.isVariant || !variantMasters.has(product.sku.toLowerCase()))
    )
    const availableMachines = machines.filter(machine => machine.status.toLowerCase() !== 'maintenance')
    const visibleProduction = production.filter(row => row.date === today)
    const productionRows = visibleProduction.map(row => <tr key={row.id}><td>{formatIndiaDate(row.date)}</td><td>{row.block || '—'}</td><td>{row.machine}</td><td>{row.product}</td><td><code>{row.sku}</code></td><td>{row.actual}</td><td>{row.rejected}</td><td><span className={`status ${row.qcStatus === 'Reviewed' ? 'active' : 'pending'}`}>{row.qcStatus}</span></td><td>{row.qcApproved}</td><td>{row.qcRejected}</td><td>{row.createdBy || '—'}</td></tr>)
    const exportDailyReport = () => {
      const sheet = XLSX.utils.json_to_sheet(visibleProduction)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Daily Production')
      const dailyArchive = readStored<Production[]>('erp-daily-production', [])
      const archivedIds = new Set(dailyArchive.map(row => row.id))
      localStorage.setItem('erp-daily-production', JSON.stringify([...dailyArchive, ...visibleProduction.filter(row => !archivedIds.has(row.id))]))
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Daily-Production-${today}.xlsx`)
      notify('Daily production report exported')
    }
    const exportMonthlyReport = () => {
      const monthlyRows = production.filter(row => row.date.startsWith(month))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly Production')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
        Month: month,
        Records: monthlyRows.length,
        Total: monthlyRows.reduce((sum, row) => sum + row.actual, 0),
        QCApproved: monthlyRows.reduce((sum, row) => sum + row.qcApproved, 0),
        QCRejected: monthlyRows.reduce((sum, row) => sum + row.qcRejected, 0),
        PendingQC: monthlyRows.reduce((sum, row) => sum + Math.max(0, row.actual - row.qcApproved - row.qcRejected), 0),
        PreparedFor: sessionUser.role === 'Super Admin' || sessionUser.role === 'Production Supervisor' ? 'All users' : sessionUser.name,
      }]), 'Summary')
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Production-${month}.xlsx`)
      notify(`New monthly workbook downloaded: ${month}`)
    }
    return (
      <section>
        <div className="page-heading"><div><p>FACTORY · {formatIndiaDate(today)}</p><h1>Production</h1></div><div className="heading-actions"><button className="secondary" onClick={exportDailyReport}><Download size={17} /> Daily Excel</button><button className="primary" onClick={exportMonthlyReport}><FileSpreadsheet size={17} /> Monthly Excel</button></div></div>
        {sessionUser.role === 'Production Supervisor' ? (
          <div className="form-grid">
            <form className="panel form-card" onSubmit={submitProduction}>
              <div className="panel-heading"><div><h2>Quick production entry</h2><p>Record actual quantities by machine</p></div></div>
              <div className="field-grid">
                <label>Date<input name="date" type="date" required value={productionDate} onChange={event => {
                  setProductionDate(event.target.value)
                  setProductionBlockChoice('')
                }} /><small className="field-hint">India date: {formatIndiaDate(productionDate)}</small></label>
                <label>Machine<select name="machine" required disabled={availableMachines.length === 0}><option value="">Select machine</option>{availableMachines.map(machine => <option key={machine.id} value={machine.id}>{machine.id}{machine.name ? ` — ${machine.name}` : ''}</option>)}</select></label>
                <label>Production block<select name={autoProductionBlock ? undefined : 'block'} required value={selectedProductionBlock} disabled={Boolean(autoProductionBlock)} onChange={event => setProductionBlockChoice(event.target.value)}><option value="">Select time block</option>{productionBlocks.map(block => <option key={block.name} value={block.name}>{block.name} · {block.time}</option>)}</select>{autoProductionBlock && <input type="hidden" name="block" value={autoProductionBlock.name} />}</label>
                <label>Product + SKU<select name="sku" required disabled={activeProducts.length === 0}><option value="">Select product and SKU</option>{activeProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}{[product.size, product.color].filter(Boolean).length ? ` · ${[product.size, product.color].filter(Boolean).join(' / ')}` : ''}</option>)}</select></label>
                <label>Actual quantity<input name="actual" type="number" min="1" step="1" required /></label>
                <label>Initial reject estimate<input name="rejected" type="number" min="0" step="1" defaultValue="0" required /><small className="field-hint">Quality Control confirms the final pass/reject quantities.</small></label>
              </div>
              {autoProductionBlock
                ? <p className="local-storage-note">Automatically selected from current India time: {autoProductionBlock.name} ({autoProductionBlock.time}).</p>
                : productionDate === today
                  ? <p className="local-storage-note">Current India time is outside a production block or during a break. Select the block manually for this entry.</p>
                  : <p className="local-storage-note">For a different production date, select the block manually.</p>}
              {(activeProducts.length === 0 || availableMachines.length === 0) && <p className="local-storage-note">{activeProducts.length === 0 ? 'No active SKUs yet. Ask the Super Admin or Production Supervisor to add products and variants.' : ''}{activeProducts.length === 0 && availableMachines.length === 0 ? ' ' : ''}{availableMachines.length === 0 ? 'No working machines configured. Ask the Super Admin or Production Supervisor to add a machine.' : ''}</p>}
              <button className="primary wide" type="submit" disabled={activeProducts.length === 0 || availableMachines.length === 0}><Plus size={17} /> Save production record</button>
            </form>
            <div className="panel time-card">
              <div className="panel-heading"><div><h2>Production blocks</h2><p>Break periods are excluded</p></div></div>
              {productionBlocks.map(block => <div className="time-row" key={block.name}><span>{block.name}</span><strong>{block.time}</strong></div>)}
              <div className="break-note"><AlertTriangle size={16} /> Break time is not counted as production time.</div>
            </div>
          </div>
        ) : <p className="local-storage-note">Only the Production Supervisor can add production entries. Existing records are available here for inspection.</p>}
        <div className="table-card entries-table"><PaginatedTable label="Today's production entries" resetKey={today} header={<thead><tr><th>Date</th><th>Block</th><th>Machine</th><th>Product</th><th>SKU</th><th>Actual</th><th>Initial reject estimate</th><th>QC status</th><th>QC pass</th><th>QC reject</th><th>Entered by</th></tr></thead>} rows={productionRows} />{visibleProduction.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No production entries today</strong><span>Records will appear after saving.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Stitching') {
    const stitchingMachines = machines.filter(machine => /stitch/i.test(machine.type))
    const stitchingMachineIds = new Set(stitchingMachines.map(machine => machine.id.toLowerCase()))
    const reportRows = production.filter(row => row.date === stitchingReportDate && stitchingMachineIds.has(row.machine.toLowerCase()))
    const targetRows = productionTargets
      .filter(target => target.startDate <= stitchingReportDate && target.endDate >= stitchingReportDate && stitchingMachineIds.has(target.machineId.toLowerCase()))
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.machineName.localeCompare(right.machineName))
    const produced = reportRows.reduce((total, row) => total + row.actual, 0)
    const approved = reportRows.reduce((total, row) => total + row.qcApproved, 0)
    const rejected = reportRows.reduce((total, row) => total + row.qcRejected, 0)
    const pending = reportRows.reduce((total, row) => total + Math.max(0, row.actual - row.qcApproved - row.qcRejected), 0)
    const reportStock = [...new Set(reportRows.map(row => row.sku.toLowerCase()))]
      .reduce((total, sku) => total + (finishedGoods.find(item => item.sku.toLowerCase() === sku)?.availableStock || 0), 0)
    const exportStitchingReport = () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reportRows.map(row => {
        const machine = stitchingMachines.find(item => item.id.toLowerCase() === row.machine.toLowerCase())
        const stock = finishedGoods.find(item => item.sku.toLowerCase() === row.sku.toLowerCase())
        return {
          Date: row.date,
          Block: row.block,
          Machine: machine?.name || row.machine,
          'Machine Type': machine?.type || '',
          Operator: row.createdBy || '',
          'Batch ID': row.id,
          Product: row.product,
          SKU: row.sku,
          Produced: row.actual,
          'QC Status': row.qcStatus,
          'QC Pass': row.qcApproved,
          'QC Reject': row.qcRejected,
          'Finished Stock Available': stock?.availableStock || 0,
        }
      })), 'Stitching Output')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(targetRows.map(target => ({
        Period: target.period,
        'Period Start': target.startDate,
        'Period End': target.endDate,
        Machine: target.machineName,
        Product: target.productName,
        SKU: target.sku,
        Target: target.targetQuantity,
        Actual: target.actual,
        Shortfall: Math.max(0, target.targetQuantity - target.actual),
      }))), 'Machine Targets')
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Stitching-${stitchingReportDate}.xlsx`)
    }
    return (
      <section>
        <div className="page-heading">
          <div><p>FACTORY OPERATIONS</p><h1>Stitching</h1><span className="dashboard-description">Machine-wise output, QC results, target progress, and finished stock.</span></div>
          <div className="heading-actions"><label>Report date<input type="date" value={stitchingReportDate} onChange={event => setStitchingReportDate(event.target.value || indiaDateKey(clock))} /></label><button className="primary" type="button" onClick={exportStitchingReport}><FileSpreadsheet size={16} /> Export report</button></div>
        </div>
        <p className="local-storage-note">Daily, weekly, and monthly targets are shown as separate target rows; their totals are not combined. Only machines whose type includes “Stitching” appear here.</p>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><Factory size={20} /></div><div className="stat-body"><span>Produced</span><strong>{produced.toLocaleString('en-IN')}</strong><small>{formatIndiaDate(stitchingReportDate)}</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><ClipboardCheck size={20} /></div><div className="stat-body"><span>QC approved</span><strong>{approved.toLocaleString('en-IN')}</strong><small>Added to finished-goods stock</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><AlertTriangle size={20} /></div><div className="stat-body"><span>QC rejected</span><strong>{rejected.toLocaleString('en-IN')}</strong><small>Quality-confirmed quantity</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Boxes size={20} /></div><div className="stat-body"><span>Pending QC</span><strong>{pending.toLocaleString('en-IN')}</strong><small>Available stock for listed SKUs: {reportStock.toLocaleString('en-IN')}</small></div></div>
        </div>
        <section className="panel">
          <div className="panel-heading"><div><h2>Machine targets</h2><p>Actual output is measured across each target’s full period.</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Stitching machine targets" resetKey={stitchingReportDate} header={<thead><tr><th>Period</th><th>Machine</th><th>Product / SKU</th><th>Target</th><th>Actual</th><th>Shortfall</th><th>Progress</th></tr></thead>} rows={targetRows.map(target => {
            const percent = Math.round(target.actual / target.targetQuantity * 100)
            return <tr key={target.id}><td>{target.period}<br /><small>{formatIndiaDate(target.startDate)} – {formatIndiaDate(target.endDate)}</small></td><td><strong>{target.machineName}</strong></td><td>{target.productName}<br /><code>{target.sku || 'Custom target'}</code></td><td>{target.targetQuantity.toLocaleString('en-IN')}</td><td>{target.actual.toLocaleString('en-IN')}</td><td>{Math.max(0, target.targetQuantity - target.actual).toLocaleString('en-IN')}</td><td><progress value={Math.min(target.actual, target.targetQuantity)} max={target.targetQuantity} aria-label={`${target.productName}: ${percent}% of target`} />{percent}%</td></tr>
          })} />{targetRows.length === 0 && <div className="empty-state"><Target size={24} /><strong>No stitching targets for this date</strong><span>Set a target for a Stitching machine in Production Targets.</span></div>}</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Stitching production report</h2><p>{reportRows.length} batches on {formatIndiaDate(stitchingReportDate)}</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Stitching production report" resetKey={`${stitchingReportDate}:${reportRows.length}`} header={<thead><tr><th>Date / block</th><th>Machine / operator</th><th>Batch</th><th>Product / SKU</th><th>Produced</th><th>QC status</th><th>Pass</th><th>Reject</th><th>Available stock</th></tr></thead>} rows={reportRows.map(row => {
            const machine = stitchingMachines.find(item => item.id.toLowerCase() === row.machine.toLowerCase())
            const stock = finishedGoods.find(item => item.sku.toLowerCase() === row.sku.toLowerCase())
            return <tr key={row.id}><td>{formatIndiaDate(row.date)}<br /><small>{row.block || '—'}</small></td><td>{machine?.name || row.machine}<br /><small>{row.createdBy || '—'}</small></td><td><code>{row.id}</code></td><td>{row.product}<br /><code>{row.sku}</code></td><td>{row.actual.toLocaleString('en-IN')}</td><td><span className={`status ${row.qcStatus === 'Reviewed' ? 'active' : 'pending'}`}>{row.qcStatus}</span></td><td>{row.qcApproved.toLocaleString('en-IN')}</td><td>{row.qcRejected.toLocaleString('en-IN')}</td><td>{(stock?.availableStock || 0).toLocaleString('en-IN')}</td></tr>
          })} />{reportRows.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>{stitchingMachines.length ? 'No stitching production for this date' : 'No Stitching Machine configured'}</strong><span>{stitchingMachines.length ? 'Production entries from Stitching machines will appear here.' : 'Add a machine and choose “Stitching Machine” as its type.'}</span></div>}</div>
        </section>
      </section>
    )
  }

  if (module === 'Quality Control') {
    const canReview = sessionUser.role === 'Production Supervisor'
    const pendingQuality = production.filter(row => row.qcStatus === 'Pending').sort((left, right) => left.date.localeCompare(right.date))
    const reviewedQuality = production.filter(row => row.qcStatus === 'Reviewed' && row.date === qualityReportDate)
    const targetRows = productionTargets
      .filter(target => target.startDate <= qualityReportDate && target.endDate >= qualityReportDate)
      .sort((left, right) => left.startDate.localeCompare(right.startDate) || left.machineName.localeCompare(right.machineName))
    const pendingUnits = pendingQuality.reduce((total, row) => total + Math.max(0, row.actual - row.qcApproved - row.qcRejected), 0)
    const reviewedApproved = reviewedQuality.reduce((total, row) => total + row.qcApproved, 0)
    const reviewedRejected = reviewedQuality.reduce((total, row) => total + row.qcRejected, 0)
    const totalAvailableStock = finishedGoods.reduce((total, item) => total + item.availableStock, 0)
    const qualityDraft = (record: Production) => qualityDrafts[record.id] || {
      approved: String(Math.max(0, record.actual - record.rejected)),
      rejected: String(record.rejected),
    }
    const updateQualityDraft = (record: Production, field: 'approved' | 'rejected', value: string) => {
      setQualityDrafts(previous => {
        const existing = previous[record.id] || {
          approved: String(Math.max(0, record.actual - record.rejected)),
          rejected: String(record.rejected),
        }
        return { ...previous, [record.id]: { ...existing, [field]: value } }
      })
    }
    const reviewedRows = reviewedQuality.map(record => {
      const stock = finishedGoods.find(item => item.sku.toLowerCase() === record.sku.toLowerCase())
      return <tr key={record.id}><td>{formatIndiaDate(record.date)}<br /><small>{record.block || '—'}</small></td><td>{record.machine}</td><td><code>{record.id}</code></td><td>{record.product}<br /><code>{record.sku}</code></td><td>{record.actual}</td><td>{record.qcApproved}</td><td>{record.qcRejected}</td><td>{record.qcReviewedBy || '—'}</td><td>{stock?.availableStock || 0}</td></tr>
    })
    const targetReportRows = targetRows.map(target => <tr key={target.id}><td>{target.period}<br /><small>{formatIndiaDate(target.startDate)} – {formatIndiaDate(target.endDate)}</small></td><td>{target.machineName}</td><td>{target.productName}<br /><code>{target.sku || 'Custom target'}</code></td><td>{target.targetQuantity}</td><td>{target.actual}</td><td>{Math.max(0, target.targetQuantity - target.actual)}</td></tr>)
    return (
      <section>
        <div className="page-heading">
          <div><p>FACTORY OPERATIONS</p><h1>Quality Control</h1><span className="dashboard-description">Pass/reject production batches; only QC-approved quantities increase finished-goods stock.</span></div>
          <div className="heading-actions"><label>Report date<input type="date" value={qualityReportDate} onChange={event => setQualityReportDate(event.target.value || indiaDateKey(clock))} /></label></div>
        </div>
        {!canReview && <p className="local-storage-note">Only the Production Supervisor can submit QC decisions. Existing results are available here for inspection.</p>}
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon orange"><AlertTriangle size={20} /></div><div className="stat-body"><span>Pending batches</span><strong>{pendingQuality.length}</strong><small>Awaiting review</small></div></div>
          <div className="stat-card"><div className="stat-icon blue"><Factory size={20} /></div><div className="stat-body"><span>Units awaiting QC</span><strong>{pendingUnits.toLocaleString('en-IN')}</strong><small>Not available as stock</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><ClipboardCheck size={20} /></div><div className="stat-body"><span>Approved on report date</span><strong>{reviewedApproved.toLocaleString('en-IN')}</strong><small>{formatIndiaDate(qualityReportDate)}</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Boxes size={20} /></div><div className="stat-body"><span>Rejected / available stock</span><strong>{reviewedRejected.toLocaleString('en-IN')} / {totalAvailableStock.toLocaleString('en-IN')}</strong><small>QC-rejected / all finished SKUs</small></div></div>
        </div>
        <section className="panel">
          <div className="panel-heading"><div><h2>Pending quality inspection</h2><p>Enter pass and reject quantities; both must add up to produced quantity.</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Pending quality inspection" resetKey={pendingQuality.map(record => record.id).join(':')} header={<thead><tr><th>Date / block</th><th>Machine</th><th>Batch</th><th>Product / SKU</th><th>Produced</th><th>Initial reject estimate</th><th>QC decision</th></tr></thead>} rows={pendingQuality.map(record => {
            const draft = qualityDraft(record)
            return <tr key={record.id}><td>{formatIndiaDate(record.date)}<br /><small>{record.block || '—'}</small></td><td>{record.machine}</td><td><code>{record.id}</code></td><td>{record.product}<br /><code>{record.sku}</code></td><td>{record.actual}</td><td>{record.rejected}</td><td><form className="inline-listing-form" onSubmit={event => { event.preventDefault(); void saveQualityReview(record) }}><label>Pass<input aria-label={`QC pass quantity for batch ${record.id}`} type="number" min="0" max={record.actual} step="1" required disabled={!canReview || qualitySavingId !== ''} value={draft.approved} onChange={event => updateQualityDraft(record, 'approved', event.target.value)} /></label><label>Reject<input aria-label={`QC reject quantity for batch ${record.id}`} type="number" min="0" max={record.actual} step="1" required disabled={!canReview || qualitySavingId !== ''} value={draft.rejected} onChange={event => updateQualityDraft(record, 'rejected', event.target.value)} /></label><button className="primary" type="submit" disabled={!canReview || qualitySavingId !== ''}>{qualitySavingId === record.id ? 'Saving…' : 'Approve QC'}</button></form></td></tr>
          })} />{pendingQuality.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No batches awaiting QC</strong><span>New production entries will appear here until inspected.</span></div>}</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Production target report</h2><p>Period targets remain separate; target actual is total output across each target period.</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Quality control production targets" resetKey={qualityReportDate} header={<thead><tr><th>Period</th><th>Machine</th><th>Product / SKU</th><th>Target</th><th>Actual</th><th>Shortfall</th></tr></thead>} rows={targetReportRows} />{targetRows.length === 0 && <div className="empty-state"><Target size={24} /><strong>No production targets for this date</strong></div>}</div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Completed QC report</h2><p>{reviewedQuality.length} batches for {formatIndiaDate(qualityReportDate)}</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Completed quality control report" resetKey={`${qualityReportDate}:${reviewedQuality.length}`} header={<thead><tr><th>Date / block</th><th>Machine</th><th>Batch</th><th>Product / SKU</th><th>Produced</th><th>Pass</th><th>Reject</th><th>Reviewed by</th><th>Available stock</th></tr></thead>} rows={reviewedRows} />{reviewedQuality.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No completed QC records for this date</strong><span>Choose another production date to review its QC report.</span></div>}</div>
        </section>
      </section>
    )
  }

  if (module === 'Graphic Design') {
    const isAdmin = sessionUser.role === 'Super Admin'
    const monthTasks = graphicDesignTasks
      .filter(task => task.month === graphicPlanMonth)
      .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate) || left.createdAt.localeCompare(right.createdAt))
    const pendingCount = monthTasks.filter(task => task.reviewStatus === 'Pending').length
    const approvedCount = monthTasks.filter(task => task.reviewStatus === 'Approved').length
    const rejectedCount = monthTasks.filter(task => task.reviewStatus === 'Rejected').length
    const videos = monthTasks.filter(task => task.contentType === 'Video')
    const shootsCompleted = videos.filter(task => task.shootStatus === 'Completed').length
    const editsCompleted = monthTasks.filter(task => task.editStatus === 'Completed').length
    const platformCounts = socialPlatforms.map(platform => ({
      platform,
      planned: monthTasks.filter(task => task.platforms.includes(platform)).length,
      approved: monthTasks.filter(task => task.platforms.includes(platform) && task.reviewStatus === 'Approved').length,
      rejected: monthTasks.filter(task => task.platforms.includes(platform) && task.reviewStatus === 'Rejected').length,
    })).filter(item => item.planned > 0)
    const creativeRows = monthTasks.map(task => {
      const progress = graphicProgressDrafts[task.id] || { shootStatus: task.shootStatus, editStatus: task.editStatus }
      return <tr key={task.id}>
        <td>{formatIndiaDate(task.plannedDate)}<br /><small>{task.contentType}</small></td>
        <td>{task.product}<br /><code>{task.sku}</code></td>
        <td>{task.platforms.join(', ')}</td>
        <td><strong>{task.brief}</strong><br /><span className="ecommerce-report-cell">{task.caption || 'No caption added'}</span>{task.script && <details><summary>View video script / shot plan</summary><p className="ecommerce-report-cell">{task.script}</p></details>}</td>
        <td><span className={`status ${task.reviewStatus === 'Approved' ? 'active' : task.reviewStatus === 'Rejected' ? 'draft' : 'pending'}`}>{task.reviewStatus}</span>{task.reviewNote && <p className="ecommerce-report-cell">{task.reviewNote}</p>}{isAdmin && task.reviewStatus === 'Pending' && <label>Review note<textarea maxLength={1000} value={graphicReviewDrafts[task.id] ?? task.reviewNote} onChange={event => setGraphicReviewDrafts(previous => ({ ...previous, [task.id]: event.target.value }))} placeholder="Required when rejecting" /></label>}</td>
        <td>{task.contentType === 'Video' ? task.shootStatus : 'Not required'}<br />Edit: {task.editStatus}{!isAdmin && task.reviewStatus !== 'Rejected' && <div className="field-grid"><label>Shoot<select disabled={task.contentType !== 'Video'} value={progress.shootStatus} onChange={event => setGraphicProgressDrafts(previous => ({ ...previous, [task.id]: { ...progress, shootStatus: event.target.value as GraphicDesignTask['shootStatus'] } }))}><option>Not required</option><option>Not started</option><option>In progress</option><option>Completed</option></select></label><label>Edit<select value={progress.editStatus} onChange={event => setGraphicProgressDrafts(previous => ({ ...previous, [task.id]: { ...progress, editStatus: event.target.value as GraphicDesignTask['editStatus'] } }))}><option>Not started</option><option>In progress</option><option>Completed</option></select></label><button className="secondary" type="button" onClick={() => void saveGraphicProgress(task)}>Save progress</button></div>}</td>
        {isAdmin && <td><div className="heading-actions"><button className="primary" type="button" disabled={task.reviewStatus !== 'Pending'} onClick={() => void decideGraphicTask(task, 'Approved')}>Approve</button><button className="secondary" type="button" disabled={task.reviewStatus !== 'Pending'} onClick={() => void decideGraphicTask(task, 'Rejected')}>Reject</button></div><small>By {task.createdBy}</small></td>}
      </tr>
    })
    const graphicDesignReportRows = graphicDesignReports.map(report => <tr key={report.id}>
      <td>{formatIndiaDate(report.date)}</td>{isAdmin && <td>{report.userName}</td>}
      <td className="ecommerce-report-cell">{report.completed}</td>
      <td className="ecommerce-report-cell">{report.pending || '—'}</td>
      <td className="ecommerce-report-cell">{report.issues || '—'}</td>
      <td>{formatIndiaDateTime(report.updatedAt)}</td>
    </tr>)
    const exportCreativePlan = () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthTasks.map(task => ({
        Date: task.plannedDate,
        Product: task.product,
        SKU: task.sku,
        Platforms: task.platforms.join(', '),
        Type: task.contentType,
        Brief: task.brief,
        Caption: task.caption,
        Script: task.script,
        Shoot: task.shootStatus,
        Edit: task.editStatus,
        Review: task.reviewStatus,
        'Review note': task.reviewNote,
        'Created by': task.createdBy,
      }))), 'Monthly Content Plan')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(platformCounts), 'Platform Summary')
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Social-Plan-${graphicPlanMonth}.xlsx`)
    }
    return (
      <section>
        <div className="page-heading">
          <div><p>{isAdmin ? 'ADMIN REVIEW' : 'CREATIVE STUDIO'}</p><h1>Graphic Design & Social Plan</h1><span className="dashboard-description">{isAdmin ? 'Review planned social content, scripts, shoot/edit progress, and designer submissions.' : 'Build this month’s product-linked social plan and track each shoot, edit, and review.'}</span></div>
          <div className="heading-actions"><label>Plan month<input type="month" value={graphicPlanMonth} onChange={event => {
            const value = event.target.value
            if (!value) return
            setGraphicPlanMonth(value)
            setGraphicPlanDate(`${value}-01`)
          }} /></label><button className="secondary" type="button" onClick={exportCreativePlan}><FileSpreadsheet size={16} /> Export month</button></div>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><FileSpreadsheet size={20} /></div><div className="stat-body"><span>Planned content</span><strong>{monthTasks.length}</strong><small>{videos.length} videos · {monthTasks.length - videos.length} posts</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={20} /></div><div className="stat-body"><span>Admin approved</span><strong>{approvedCount}</strong><small>Ready for scheduled publishing</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><AlertTriangle size={20} /></div><div className="stat-body"><span>Pending / rejected</span><strong>{pendingCount} / {rejectedCount}</strong><small>Pending review / needs revision</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Video size={20} /></div><div className="stat-body"><span>Video shoots / edits complete</span><strong>{shootsCompleted} / {editsCompleted}</strong><small>Of {videos.length} planned videos</small></div></div>
        </div>
        {isAdmin && <section className="panel ecommerce-report-panel" id="graphic-design-daily-report">
          <div className="panel-heading"><div><h2>Graphic Designer daily reports</h2><p>Private reports submitted by Graphic Designers</p></div></div>
          {graphicDesignReportsLoading && <div className="empty-state" role="status">Loading daily reports…</div>}
          {graphicDesignReportsError && <p className="ecommerce-error" role="alert">{graphicDesignReportsError}</p>}
          {!graphicDesignReportsLoading && !graphicDesignReportsError && graphicDesignReports.length === 0 && <div className="empty-state"><ClipboardCheck size={22} /><strong>No Graphic Design daily reports yet</strong><span>Submitted reports will appear here.</span></div>}
          {graphicDesignReports.length > 0 && <div className="ecommerce-table-wrap"><PaginatedTable label="Graphic Designer daily reports" resetKey={graphicDesignReports.map(report => `${report.id}-${report.updatedAt}`).join(':')} header={<thead><tr><th>Report date</th><th>Designer</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th><th>Last updated (IST)</th></tr></thead>} rows={graphicDesignReportRows} /></div>}
        </section>}
        <section className="panel">
          <div className="panel-heading"><div><h2>Social platform plan</h2><p>Planned, approved, and rejected items for {graphicPlanMonth}</p></div></div>
          {platformCounts.length
            ? <div className="table-card entries-table"><table><thead><tr><th>Platform</th><th>Planned</th><th>Approved</th><th>Rejected</th><th>Awaiting review</th></tr></thead><tbody>{platformCounts.map(item => <tr key={item.platform}><td>{item.platform}</td><td>{item.planned}</td><td>{item.approved}</td><td>{item.rejected}</td><td>{item.planned - item.approved - item.rejected}</td></tr>)}</tbody></table></div>
            : <div className="empty-state"><FileSpreadsheet size={22} /><strong>No content planned this month</strong><span>Add tasks below to build the posting calendar.</span></div>}
        </section>
        {!isAdmin && <section className="panel form-card">
          <div className="panel-heading"><div><h2>Plan a social post or video</h2><p>Each submission is one content item and goes to the Super Admin for review.</p></div></div>
          <form onSubmit={submitGraphicPlanTask}>
            <div className="field-grid">
              <label>Posting date<input type="date" name="plannedDate" required min={`${graphicPlanMonth}-01`} max={`${graphicPlanMonth}-${new Date(Number(graphicPlanMonth.slice(0, 4)), Number(graphicPlanMonth.slice(5, 7)), 0).getDate()}`} value={graphicPlanDate} onChange={event => setGraphicPlanDate(event.target.value)} /></label>
              <label>Product / catalog listing<select name="sku" required defaultValue=""><option value="">Select product or SKU</option>{products.filter(product => product.status === 'Active').map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}{product.isVariant ? ` · ${[product.size, product.color].filter(Boolean).join(' / ')}` : ''}</option>)}</select></label>
              <label>Content format<select name="contentType" value={graphicContentTypeChoice} onChange={event => setGraphicContentTypeChoice(event.target.value as 'Post' | 'Video')}><option>Post</option><option>Video</option></select></label>
              <fieldset className="platform-assignment"><legend>Social platforms</legend>{socialPlatforms.map(platform => <label key={platform}><input type="checkbox" name="platforms" value={platform} /> {platform}</label>)}</fieldset>
              <label>Creative brief / concept<textarea name="brief" required maxLength={2000} placeholder="Describe the product angle, audience, and creative direction." /></label>
              <label>Caption / post copy<textarea name="caption" maxLength={2000} placeholder="Draft the social caption or post copy." /></label>
              {graphicContentTypeChoice === 'Video' && <label>Video script / shot-by-shot description<textarea name="script" required maxLength={5000} placeholder="Hook, product shots, voice-over, on-screen text, and call to action." /></label>}
            </div>
            <button className="primary wide" type="submit"><Plus size={16} /> Submit content for Admin review</button>
          </form>
        </section>}
        <section className="panel">
          <div className="panel-heading"><div><h2>{isAdmin ? 'Designer submissions and review' : 'Monthly content calendar'}</h2><p>{monthTasks.length} planned items · review, shooting, editing, scripts and captions</p></div></div>
          <div className="table-card entries-table"><PaginatedTable label="Graphic design social content plan" resetKey={`${graphicPlanMonth}:${monthTasks.map(task => `${task.id}-${task.reviewStatus}-${task.shootStatus}-${task.editStatus}`).join(':')}`} header={<thead><tr><th>Post date / type</th><th>Product / SKU</th><th>Platforms</th><th>Brief / caption / script</th><th>Admin review</th><th>Shoot / edit</th>{isAdmin && <th>Decision</th>}</tr></thead>} rows={creativeRows} />{monthTasks.length === 0 && <div className="empty-state"><FileSpreadsheet size={22} /><strong>No tasks for {graphicPlanMonth}</strong><span>{isAdmin ? 'Designer submissions will appear here for review.' : 'Use the form above to add posts and videos to your monthly plan.'}</span></div>}</div>
        </section>
      </section>
    )
  }

  if (module === 'Excel Management') {
    return (
      <section>
        <div className="page-heading"><div><p>DATA CONTROL</p><h1>Excel Management</h1></div><div className="heading-actions"><button className="secondary" onClick={() => setModule('Settings')}><Settings size={16} /> Settings</button><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17} /> Preview Excel</button></div></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} />
        <div className="excel-status-grid">
          <div className="panel provider-card"><div className="provider-icon"><FileSpreadsheet size={24} /></div><div><span>Master workbook</span><strong>{workbookMeta.name}</strong></div><b className={workbookMeta.loaded ? 'status active' : 'status pending'}>{workbookMeta.loaded ? 'Connected' : 'Not loaded'}</b></div>
          <div className="panel sync-card"><span>Workbook structure</span><strong>{workbookMeta.sheetCount || 17} sheets detected</strong><small>{workbookMeta.loaded ? 'Shared Google Sheet is active.' : 'Sign in after deploying Apps Script and configuring Vercel.'}</small></div>
        </div>
        <div className="panel setup-card">
          <div className="panel-heading"><div><h2>Shared workbook</h2><p>Catalog, machine, and production changes are backed up and saved to Google Sheets.</p></div></div>
          <p className="local-storage-note">Excel uploads here are preview-only. To import the prepared combined marketplace workbook into the existing Google Sheet, open Product Catalog → Import workbook.</p>
        </div>
        {sessionUser.role === 'Super Admin' && <div className="panel erp-reset-panel">
          <div className="panel-heading">
            <div><h2>Reset ERP data</h2><p>Prepare the workbook and private business records for a fresh start.</p></div>
            {!resetPanelOpen && <button className="secondary" type="button" onClick={() => setResetPanelOpen(true)}>Review reset</button>}
          </div>
          {resetPanelOpen && <div className="erp-reset-content">
            <div className="erp-reset-warning" role="alert">
              <strong>This will clear all business records from every master-workbook tab.</strong>
              <ul>
                <li>Products, variants, marketplace listings, machines, users other than you, inventory, production, sales, tasks, and targets will be cleared. The current Super Admin account and sheet headers will remain.</li>
                <li>Private chat records will be cleared. Existing report, label, recording, and chat-attachment folders will be moved into a private Drive reset archive and replaced with empty folders.</li>
                <li>A private backup of the master workbook and chat workbook is created first. Existing audit history and app/deployment settings are intentionally retained.</li>
              </ul>
            </div>
            <form className="erp-reset-form" onSubmit={submitErpReset}>
              <label htmlFor="erp-reset-confirmation">Type <code>RESET ERP</code> to confirm</label>
              <input
                id="erp-reset-confirmation"
                value={resetConfirmation}
                onChange={event => setResetConfirmation(event.target.value)}
                placeholder="RESET ERP"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="erp-reset-hint"
              />
              <span id="erp-reset-hint" aria-live="polite">
                {!workbookMeta.loaded
                  ? 'The master workbook is not connected yet, so reset is disabled. '
                  : resetConfirmationMatches
                    ? 'Confirmation accepted. '
                    : 'Type RESET ERP (any letter case) to enable reset. '}
                This action cannot be undone from the ERP. The backup will be stored in a private Drive folder.
              </span>
              <div className="erp-reset-actions">
                <button className="secondary" type="button" onClick={() => { setResetPanelOpen(false); setResetConfirmation('') }} disabled={resetBusy}>Cancel</button>
                <button className="erp-reset-submit" type="submit" disabled={!workbookMeta.loaded || resetBusy || !resetConfirmationMatches}>
                  {resetBusy ? 'Backing up and resetting…' : 'Back up and reset ERP'}
                </button>
              </div>
            </form>
          </div>}
        </div>}
        <div className="panel table-card excel-table"><div className="panel-heading"><div><h2>Import help</h2><p>Marketplace workbook workflow</p></div></div><div className="empty-state"><FileSpreadsheet size={28} /><strong>Import from Product Catalog</strong><span>Use Product Catalog → Import workbook to preview and add missing catalog rows to the connected Sheet.</span></div></div>
      </section>
    )
  }

  if (module === 'Employees') {
    if (sessionUser.role !== 'Super Admin') return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Only the Super Admin can inspect the employee directory.</span></div></section>
    const reloadEmployees = async () => {
      setEmployeeDirectoryLoading(true)
      setEmployeeDirectoryError('')
      try {
        await refreshEmployeeDirectory()
      } catch (error) {
        setEmployeeDirectoryError(error instanceof Error ? error.message : 'Employees could not be loaded.')
      } finally {
        setEmployeeDirectoryLoading(false)
      }
    }
    const employeeAccounts = users.filter(user => user.role !== 'Super Admin')
    const activeEmployees = employeeAccounts.filter(user => user.active).length
    const employeeRows = employeeAccounts.map(user => (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td><code>{user.username}</code></td>
        <td>{user.role}</td>
        <td><span className={`status ${user.active ? 'active' : 'draft'}`}>{user.active ? 'Active' : 'Inactive'}</span></td>
      </tr>
    ))
    return (
      <section>
        <div className="page-heading">
          <div><p>MANAGEMENT</p><h1>Employees</h1></div>
          <div className="heading-actions">
            <span className="status active">{activeEmployees} active · {employeeAccounts.length} total</span>
            <button className="secondary" onClick={() => void reloadEmployees()} disabled={employeeDirectoryLoading}>
              <RotateCcw size={16} /> {employeeDirectoryLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        <p className="local-storage-note">Employee records are linked to user accounts. Newly created accounts appear here automatically.</p>
        {employeeDirectoryError && <p className="ecommerce-error" role="alert">{employeeDirectoryError}</p>}
        {employeeDirectoryLoading && employeeAccounts.length === 0 && <div className="empty-state" role="status">Loading employees…</div>}
        {!employeeDirectoryLoading && !employeeDirectoryError && employeeAccounts.length === 0 && <div className="empty-state"><Users size={24} /><strong>No employees yet</strong><span>Create a team account in User Management to add an employee here.</span></div>}
        {employeeAccounts.length > 0 && <div className="table-card entries-table"><PaginatedTable label="Employees" resetKey={employeeAccounts.map(user => `${user.id}:${user.active}`).join('|')} header={<thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th></tr></thead>} rows={employeeRows} /></div>}
      </section>
    )
  }

  if (module === 'User Management') {
    if (sessionUser.role !== 'Super Admin') return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Only the Super Admin can manage users.</span></div></section>
    const refreshUsers = async () => {
      try {
        const result = await apiFetch<{ users: UserAccount[] }>('/api/users')
        setUsers(result.users)
        notify(`${result.users.length} user accounts loaded`)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'User accounts could not be refreshed')
      }
    }
    const exportUsers = () => {
      const safeRows = users.map(({ id, name, username, role, active, platforms, managerId }) => ({
        ID: id, Name: name, Username: username, Role: role, Manager: users.find(account => account.id === managerId)?.name || '',
        Platforms: platforms.join(', '), Status: active ? 'Active' : 'Inactive',
      }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeRows), 'User Accounts')
      XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Users-${indiaDateKey()}.xlsx`)
      notify('User list exported without password data')
    }
    const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formElement = event.currentTarget
      const form = new FormData(formElement)
      const username = String(form.get('username')).trim().toLowerCase()
      const password = String(form.get('password'))
      const requestedRole = String(form.get('role'))
      const requestedPlatforms = form.getAll('platforms').map(String)
      const requestedManagerId = String(form.get('managerId') || '')
      if (password.length < 10) {
        notify('Password must be at least 10 characters')
        return
      }
      if (!['Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer'].includes(requestedRole)) {
        notify('Only one Super Admin is allowed')
        return
      }
      if (requestedRole === 'E-commerce Executive' && requestedPlatforms.length === 0) {
        notify('Assign at least one marketplace platform')
        return
      }
      if (!username) return
      try {
        const result = await apiFetch<{ user: UserAccount }>('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: String(form.get('name')), username, password, role: requestedRole, platforms: requestedPlatforms, managerId: requestedManagerId }),
        })
        setUsers(prev => [...prev, result.user])
        if (result.user.role === 'Sales Executive') {
          setSalesUsers(prev => [...prev.filter(account => account.id !== result.user.id), {
            id: result.user.id,
            name: result.user.name,
            username: result.user.username,
            role: 'Sales Executive',
            active: true,
          }])
        }
        notify('Account saved to the master workbook')
        formElement.reset()
        setNewUserRole('Production Supervisor')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Account could not be created')
      }
    }

    const setAccountActive = async (user: UserAccount) => {
      try {
        await apiFetch<{ ok: boolean }>('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, active: !user.active }),
        })
        setUsers(prev => prev.map(item => item.id === user.id ? { ...item, active: !item.active } : item))
        if (user.role === 'Sales Executive') {
          setSalesUsers(prev => user.active
            ? prev.filter(account => account.id !== user.id)
            : [...prev.filter(account => account.id !== user.id), { id: user.id, name: user.name, username: user.username, role: 'Sales Executive', active: true }])
        }
        notify(`Account ${user.active ? 'deactivated' : 'activated'}`)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Account status could not be changed')
      }
    }
    const assignExecutiveManager = async (executive: UserAccount, managerId: string) => {
      try {
        await apiFetch<{ ok: boolean; managerId: string }>('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: executive.id, managerId }),
        })
        setUsers(prev => prev.map(account => account.id === executive.id ? { ...account, managerId } : account))
        notify(managerId ? 'E-commerce Manager assigned' : 'Executive is now unassigned')
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Manager assignment could not be saved')
      }
    }
    const reportRows = ecommerceReports.map(report => <tr key={report.id}><td>{formatIndiaDate(report.date)}</td><td>{formatIndiaDateTime(report.updatedAt)}</td><td>{report.userName}</td><td>{report.platform === 'TEAM' ? 'Team' : report.platform}</td><td className="ecommerce-report-cell">{report.completed}</td><td className="ecommerce-report-cell">{report.pending || '—'}</td><td className="ecommerce-report-cell">{report.issues || '—'}</td></tr>)
    const ecommerceTaskRows = ecommerceTasks.map(task => <tr key={task.id}>
      <td>{formatIndiaDate(task.taskDate)}</td><td>{task.managerName}</td><td>{task.executiveName}</td>
      <td><strong>{task.title}</strong>{task.description && <p className="ecommerce-task-detail">{task.description}</p>}</td>
      <td><span className={`status ${task.status === 'Approved' ? 'active' : task.status === 'Needs Changes' ? 'draft' : 'pending'}`}>{task.status === 'Submitted' ? 'Awaiting review' : task.status}</span></td>
      <td className="ecommerce-report-cell">{task.reviewNote || '—'}</td><td>{formatIndiaDateTime(task.updatedAt)}</td>
    </tr>)
    const managerAccounts = users.filter(account => account.role === 'E-commerce Manager' && account.active)
    const userRows = users.map(user => <tr key={user.id}>
      <td>{user.name}</td><td><code>{user.username}</code></td><td>{user.role}</td>
      <td>{user.role === 'E-commerce Executive' ? <select aria-label={`Manager for ${user.name}`} value={user.managerId || ''} onChange={event => void assignExecutiveManager(user, event.target.value)}>
        <option value="">Unassigned</option>{managerAccounts.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
      </select> : user.managerId ? users.find(manager => manager.id === user.managerId)?.name || 'Unknown manager' : '—'}</td>
      <td>{user.platforms.join(', ') || '—'}</td>
      <td><span className={`status ${user.active ? 'active' : 'draft'}`}>{user.active ? 'Active' : 'Inactive'}</span></td>
      <td><button className="secondary" disabled={user.id === sessionUser.id} onClick={() => setAccountActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</button></td>
    </tr>)
    return (
      <section>
        <div className="page-heading"><div><p>ADMINISTRATION</p><h1>User Management</h1></div><div className="heading-actions"><button className="secondary" onClick={() => setModule('Settings')}><Settings size={16} /> Settings</button><button className="secondary" onClick={() => void refreshUsers()}><RotateCcw size={16} /> Refresh users</button><button className="secondary" onClick={exportUsers}><Download size={16} /> Export users</button></div></div>
        <div className="form-grid">
          <form className="panel form-card" onSubmit={createUser}>
            <div className="panel-heading"><div><h2>Create account</h2><p>Assign a role and secure login</p></div></div>
            <div className="field-grid">
              <label>Full name<input name="name" required placeholder="Employee name" /></label>
              <label>Username<input name="username" required autoComplete="off" placeholder="login name" /></label>
              <label>Password<input name="password" type="password" required minLength={10} placeholder="Minimum 10 characters" /></label>
              <label>Role<select name="role" required value={newUserRole} onChange={event => setNewUserRole(event.target.value as Role)}><option>Production Supervisor</option><option>Machine Operator</option><option>Store Manager</option><option>E-commerce Manager</option><option>E-commerce Executive</option><option>Sales Executive</option><option>Graphic Designer</option></select></label>
              {newUserRole === 'E-commerce Executive' && <label>Reporting manager<select name="managerId" defaultValue=""><option value="">Leave unassigned (assign later)</option>{managerAccounts.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></label>}
              {newUserRole === 'E-commerce Executive' && <fieldset className="platform-assignment"><legend>Assigned platform access</legend>{ecommercePlatforms.map(platform => <label key={platform}><input type="checkbox" name="platforms" value={platform} /> {platform}</label>)}</fieldset>}
            </div>
            <button className="primary wide" type="submit"><Plus size={17} /> Create account</button>
          </form>
        </div>
        <p className="local-storage-note">User accounts and password hashes are stored in the connected workbook. Users can sign in from any device on the deployed site.</p>
        <section className="panel ecommerce-report-panel">
          <div className="panel-heading"><div><h2>Executive daily reports</h2><p>Visible only to the Super Admin</p></div></div>
          {ecommerceReportsLoading && <div className="empty-state">Loading reports…</div>}
          {ecommerceReportsError && <p className="ecommerce-error" role="alert">{ecommerceReportsError}</p>}
          {!ecommerceReportsLoading && !ecommerceReportsError && ecommerceReports.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No daily reports yet</strong><span>Submitted reports will appear here.</span></div>}
          {ecommerceReports.length > 0 && <div className="ecommerce-table-wrap"><PaginatedTable label="Executive daily reports" header={<thead><tr><th>Report date</th><th>Last updated (IST)</th><th>Executive</th><th>Platform</th><th>Completed</th><th>Pending</th><th>Issues / notes</th></tr></thead>} rows={reportRows} /></div>}
        </section>
        <section className="panel ecommerce-report-panel">
          <div className="panel-heading"><div><h2>E-commerce daily tasks</h2><p>Read-only view of manager-assigned tasks and Executive completion reviews</p></div></div>
          {ecommerceTasksLoading && <div className="empty-state" role="status">Loading daily tasks…</div>}
          {ecommerceTasksError && <p className="ecommerce-error" role="alert">{ecommerceTasksError}</p>}
          {!ecommerceTasksLoading && !ecommerceTasksError && ecommerceTasks.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No daily tasks yet</strong><span>Tasks assigned by E-commerce Managers will appear here.</span></div>}
          {ecommerceTasks.length > 0 && <div className="ecommerce-table-wrap"><PaginatedTable label="All E-commerce daily tasks" resetKey={ecommerceTasks.map(task => `${task.id}-${task.status}`).join(':')} header={<thead><tr><th>Task date</th><th>Manager</th><th>Executive</th><th>Task</th><th>Status</th><th>Review note</th><th>Updated (IST)</th></tr></thead>} rows={ecommerceTaskRows} /></div>}
        </section>
        <div className="table-card entries-table"><PaginatedTable label="User accounts" header={<thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Reporting manager</th><th>Platforms</th><th>Status</th><th /></tr></thead>} rows={userRows} /></div>
      </section>
    )
  }

  if (module === 'Audit Logs') {
    return (
      <section><div className="page-heading"><div><p>SECURITY</p><h1>Audit Logs</h1></div><button className="secondary" onClick={() => setModule('Settings')}><Settings size={16} /> Settings</button></div>
        <div className="panel audit-card">
          <div className="panel-heading"><div><h2>ERP activity</h2><p>Auto-refreshes every 30 seconds · events retained for {auditRetentionDays} days</p></div></div>
          <p className="audit-scope-note">This log records sign-ins/sign-outs, ERP module visits, business-record actions, and screen-recording start/stop events. Screen video is optional and user-started; the browser shows a sharing prompt. The selected display may include other visible tabs or apps. No audio, keystrokes, or browser history is collected.</p>
          {auditError && <p className="audit-warning" role="alert">{auditError}</p>}
          {auditLoading && <div className="empty-state" role="status">Loading audit events…</div>}
          {!auditLoading && !auditError && auditEvents.length === 0 && <div className="empty-state"><Archive size={24} /><strong>No activity recorded yet</strong><span>ERP events will appear here as users sign in and work.</span></div>}
          {!auditLoading && auditEvents.length > 0 && <div className="table-card entries-table"><table aria-label="ERP audit events"><thead><tr><th>Time (IST)</th><th>User</th><th>Role</th><th>Activity</th><th>Result</th></tr></thead><tbody>
            {auditEvents.map(event => <tr key={event.id}><td>{formatIndiaDateTime(event.timestamp)}</td><td>{event.userName}</td><td>{event.role}</td><td><strong>{event.action}</strong>{event.target && <span className="audit-target">{event.target}</span>}</td><td><span className={`audit-outcome ${event.outcome.toLowerCase()}`}>{event.outcome}</span></td></tr>)}
          </tbody></table></div>}
        </div>
      </section>
    )
  }

  if (module === 'Suppliers') {
    const canAddSuppliers = sessionUser.role === 'Super Admin' || sessionUser.role === 'Production Supervisor'
    const canManageSuppliers = sessionUser.role === 'Production Supervisor'
    const supplierRows = suppliers.map(supplier => <tr key={supplier.id}>
      <td><strong>{supplier.name}</strong><small>{supplier.contactPerson || 'No contact person'}</small></td>
      <td>{supplier.phone || '—'}</td>
      <td>{supplier.email || '—'}</td>
      <td>{supplier.address || '—'}</td>
      <td><span className={`status ${supplier.status.toLowerCase() === 'active' ? 'active' : 'draft'}`}>{supplier.status}</span></td>
      <td>{canManageSuppliers ? <button className="text-action" type="button" onClick={() => void updateSupplierActive(supplier.id, supplier.status.toLowerCase() !== 'active').catch(error => notify(error instanceof Error ? error.message : 'Supplier status could not be updated'))}>{supplier.status.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}</button> : '—'}</td>
    </tr>)
    return <section>
      <div className="page-heading"><div><p>PROCUREMENT · DIRECTORY</p><h1>Suppliers</h1></div><span className="status active">{suppliers.filter(supplier => supplier.status.toLowerCase() === 'active').length} active · {suppliers.length} total</span></div>
      {sessionUser.role === 'Super Admin' && <p className="local-storage-note">You can add suppliers. The Production Supervisor manages supplier status.</p>}
      {!canAddSuppliers && <p className="local-storage-note">Read-only supplier directory. The Production Supervisor manages supplier records.</p>}
      {canAddSuppliers && <form className="panel form-card" onSubmit={event => void submitSupplier(event)}>
        <div className="panel-heading"><div><h2>Add supplier</h2><p>Active suppliers are available when creating raw materials and recording purchases.</p></div></div>
        <div className="field-grid">
          <label>Supplier name<input name="name" required maxLength={180} placeholder="Registered supplier name" /></label>
          <label>Contact person<input name="contactPerson" maxLength={120} /></label>
          <label>Phone<input name="phone" type="tel" maxLength={40} /></label>
          <label>Email<input name="email" type="email" maxLength={180} /></label>
          <label>Address<input name="address" maxLength={300} /></label>
          <label>Notes<input name="notes" maxLength={500} /></label>
        </div>
        <button className="primary wide" type="submit" disabled={supplierSaving}><Plus size={17} /> {supplierSaving ? 'Saving…' : 'Save supplier'}</button>
      </form>}
      <div className="table-card entries-table inventory-table">
        <PaginatedTable label="Supplier directory" resetKey={suppliers.map(supplier => `${supplier.id}:${supplier.status}`).join('|')} header={<thead><tr><th>Supplier</th><th>Phone</th><th>Email</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead>} rows={supplierRows} />
        {suppliers.length === 0 && <div className="empty-state"><Building2 size={24} /><strong>No suppliers yet</strong><span>Add a supplier before entering raw materials or purchases.</span></div>}
      </div>
    </section>
  }

  if (module === 'Accounts') {
    const expenseRows = [...monthlyExpenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map(expense => <tr key={expense.id}>
      <td>{formatIndiaDate(expense.date)}</td><td>{expense.category}</td><td>{expense.description}</td><td>₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{expense.paymentMethod}</td><td>{expense.referenceId || '—'}</td><td>{expense.createdBy || '—'}</td>
    </tr>)
    return <section>
      <div className="page-heading"><div><p>FINANCE · EXPENSE LEDGER</p><h1>Accounts</h1></div><label className="month-selector">Month<input type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)} /></label></div>
      <div className="stats-grid inventory-stats">
        <div className="stat-card"><div className="stat-body"><span>Dispatched revenue</span><strong>₹{dispatchedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>Fulfilled dispatches in {reportMonth}</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Recorded purchases</span><strong>₹{purchaseSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyPurchases.filter(movement => movement.hasRecordedCost).length} costed purchases</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Manual expenses</span><strong>₹{expenseSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyExpenses.length} expense records</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Net tracked balance</span><strong>₹{trackedBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>Net sales less recorded purchases and expenses; not accounting profit</small></div></div>
      </div>
      {(monthlyDispatches.some(movement => !movement.hasRecordedPrice) || monthlyPurchases.some(movement => !movement.hasRecordedCost)) && <p className="local-storage-note">Some older dispatches or purchases have no historical price/cost. They are excluded from these totals rather than estimated.</p>}
      <form className="panel form-card" onSubmit={event => void submitAccountExpense(event)}>
        <div className="panel-heading"><div><h2>Record an expense</h2><p>Manual operating expenses are saved to the shared financial ledger.</p></div></div>
        <div className="field-grid">
          <label>Date<input name="date" type="date" required defaultValue={indiaDateKey(clock)} /></label>
          <label>Category<select name="category" required defaultValue=""><option value="" disabled>Choose category</option>{['Utilities', 'Rent', 'Salaries', 'Transport', 'Repairs', 'Office Supplies', 'Other'].map(category => <option key={category}>{category}</option>)}</select></label>
          <label>Description<input name="description" required maxLength={300} placeholder="What was this expense for?" /></label>
          <label>Amount<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
          <label>Payment method<select name="paymentMethod" required defaultValue=""><option value="" disabled>Choose method</option>{['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'].map(method => <option key={method}>{method}</option>)}</select></label>
          <label>Reference ID<input name="referenceId" maxLength={100} placeholder="Optional invoice / transaction number" /></label>
        </div>
        <button className="primary wide" type="submit" disabled={expenseSaving}><Plus size={17} /> {expenseSaving ? 'Saving…' : 'Record expense'}</button>
      </form>
      <section className="panel">
        <div className="panel-heading"><div><h2>Expenses · {reportMonth}</h2><p>{monthlyExpenses.length} recorded expenses</p></div></div>
        {monthlyExpenses.length === 0 ? <div className="empty-state"><CircleDollarSign size={24} /><strong>No expenses recorded for this month</strong></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${reportMonth} expense ledger`} resetKey={reportMonth} header={<thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment method</th><th>Reference</th><th>Entered by</th></tr></thead>} rows={expenseRows} /></div>}
      </section>
    </section>
  }

  if (module === 'Reports') {
    const operationalRows = [
      { label: 'Production records', count: monthlyProduction.length, quantity: monthlyProductionUnits },
      { label: 'QC-approved units', count: monthlyProduction.filter(record => record.qcStatus === 'Reviewed').length, quantity: monthlyApprovedUnits },
      { label: 'QC-rejected units', count: monthlyProduction.filter(record => record.qcStatus === 'Reviewed').length, quantity: monthlyRejectedUnits },
      { label: 'Dispatched orders / movements', count: monthlyDispatches.length, quantity: monthlyDispatches.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Returns', count: monthlyReturns.length, quantity: monthlyReturns.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Damaged units', count: monthlyDamages.length, quantity: monthlyDamages.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Raw material issued', count: monthlyMaterialIssued.length, quantity: monthlyMaterialIssued.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Machine consumption', count: monthlyMachineConsumption.length, quantity: monthlyMachineConsumption.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Stitching consumption', count: monthlyStitchingConsumption.length, quantity: monthlyStitchingConsumption.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'Raw material wastage', count: monthlyWastage.length, quantity: monthlyWastage.reduce((sum, movement) => sum + movement.quantity, 0) },
      { label: 'All stock movements', count: selectedMonthMovements.length, quantity: selectedMonthMovements.reduce((sum, movement) => sum + movement.quantity, 0) },
    ]
    const supplierRows = Object.entries(supplierPurchaseTotals).map(([id, summary]) => <tr key={id}><td>{summary.supplier}</td><td>{summary.purchases}</td><td>₹{summary.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>)
    const reportExpenseRows = monthlyExpenses.map(expense => <tr key={expense.id}>
      <td>{formatIndiaDate(expense.date)}</td><td>{expense.category}</td><td>{expense.description}</td>
      <td>₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{expense.paymentMethod}</td><td>{expense.referenceId || '—'}</td>
    </tr>)
    return <section>
      <div className="page-heading"><div><p>MANAGEMENT · MONTHLY PERFORMANCE</p><h1>Reports</h1></div><div className="heading-actions"><label className="month-selector">Month<input type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)} /></label><button className="primary" type="button" onClick={exportMonthlyReport}><Download size={16} /> Export Excel</button></div></div>
      <div className="stats-grid inventory-stats">
        <div className="stat-card"><div className="stat-body"><span>Dispatched revenue</span><strong>₹{dispatchedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyDispatches.reduce((sum, movement) => sum + movement.quantity, 0)} units dispatched</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Return value</span><strong>₹{returnValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyReturns.reduce((sum, movement) => sum + movement.quantity, 0)} units returned</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Damaged value</span><strong>₹{damagedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyDamages.reduce((sum, movement) => sum + movement.quantity, 0)} units damaged</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Supplier purchases</span><strong>₹{purchaseSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyPurchases.length} purchase movements</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Manual expenses</span><strong>₹{expenseSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>{monthlyExpenses.length} entries</small></div></div>
        <div className="stat-card"><div className="stat-body"><span>Net tracked balance</span><strong>₹{trackedBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><small>Net sales less tracked purchases and expenses; not accounting profit</small></div></div>
      </div>
      <p className="local-storage-note">Revenue is recognized when finished goods are dispatched. Historical transactions without a saved unit price or purchase cost are excluded, not estimated. Net tracked balance is an operational summary, not a complete accounting profit calculation.</p>
      <div className="management-report-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Operations · {reportMonth}</h2><p>Production, quality, dispatch, returns, damage, and inventory activity</p></div></div>
          <div className="ecommerce-table-wrap"><table><thead><tr><th>Measure</th><th>Records</th><th>Units / quantity</th></tr></thead><tbody>{operationalRows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td><td>{row.quantity.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Purchases by supplier · {reportMonth}</h2><p>Purchase Inward entries with a recorded unit cost</p></div></div>
          {supplierRows.length === 0 ? <div className="empty-state"><Building2 size={22} /><strong>No costed supplier purchases this month</strong></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${reportMonth} supplier purchases`} resetKey={reportMonth} header={<thead><tr><th>Supplier</th><th>Purchases</th><th>Recorded cost</th></tr></thead>} rows={supplierRows} /></div>}
          {monthlyPurchases.some(movement => !movement.hasRecordedCost) && <p className="local-storage-note">{monthlyPurchases.filter(movement => !movement.hasRecordedCost).length} older purchase movements have no recorded cost and are omitted.</p>}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading"><div><h2>Recorded expenses · {reportMonth}</h2><p>Manually entered finance ledger entries</p></div><button className="text-button" type="button" onClick={() => setModule('Accounts')}>Open Accounts</button></div>
        {monthlyExpenses.length === 0 ? <div className="empty-state"><CircleDollarSign size={22} /><strong>No expenses recorded this month</strong></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${reportMonth} report expenses`} resetKey={reportMonth} header={<thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment</th><th>Reference</th></tr></thead>} rows={reportExpenseRows} /></div>}
      </section>
    </section>
  }

  const Icon = moduleIcons[module] || Package
  return (
    <section>
      <div className="page-heading"><div><p>MAHALAXMI ENTERPRISE ERP</p><h1>{module}</h1></div></div>
      <div className="panel placeholder">
        <div className="placeholder-icon"><Icon size={28} /></div>
        <h2>{module} workspace</h2>
        <p>This module is connected to the shared ERP data model and ready for server-backed workbook operations.</p>
        <button className="primary" onClick={() => notify(`${module} setup saved`)}><CheckCircle2 size={17} /> Mark configuration ready</button>
      </div>
    </section>
  )
}

function EcommerceMonthlyDashboard() {
  const [data, setData] = useState<EcommerceWorkspaceData | null>(null)
  const [reports, setReports] = useState<EcommerceDailyReport[]>([])
  const [targetDrafts, setTargetDrafts] = useState<Record<string, { daily: string; monthly: string }>>({})
  const [selectedMonth, setSelectedMonth] = useState(() => indiaMonthKey())
  const [savingTarget, setSavingTarget] = useState<string | null>(null)
  const [targetMessage, setTargetMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void Promise.all([
      apiFetch<EcommerceWorkspaceData>('/api/ecommerce'),
      apiFetch<{ reports: EcommerceDailyReport[] }>('/api/ecommerce-reports'),
    ]).then(([workspace, reportResult]) => {
      if (!active) return
      setData(workspace)
      setTargetDrafts(Object.fromEntries([
        ...(workspace.targets.executives || []).map(account => [account.executiveId, account] as const),
        ...(workspace.targets.managers || []).map(account => [account.managerId, account] as const),
      ].map(([id, account]) => [id, {
        daily: String(account.dailyTarget),
        monthly: String(account.monthlyTarget),
      }])))
      setReports(reportResult.reports)
      setError('')
    }).catch(requestError => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Monthly e-commerce analysis could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const summaries = ecommercePlatforms.map(platform =>
    summarizeEcommercePlatform(platform, data?.movements || [], reports, selectedMonth),
  )
  const executiveSummaries = (data?.targets.executives || []).map(executive => {
    const ordersToday = countAssignedDispatchedOrders(data?.movements || [], executive.platforms, item => dateForTimestamp(item.date) === indiaDateKey())
    const ordersThisMonth = countAssignedDispatchedOrders(data?.movements || [], executive.platforms, item => monthForTimestamp(item.date) === selectedMonth)
    return {
      ...executive,
      ordersToday,
      ordersThisMonth,
      dailyAchievement: achievementPercent(ordersToday, executive.dailyTarget),
      monthlyAchievement: achievementPercent(ordersThisMonth, executive.monthlyTarget),
    }
  })
  const managerSummaries = (data?.targets.managers || []).map(manager => {
    const ordersToday = countAssignedDispatchedOrders(data?.movements || [], manager.platforms, item => dateForTimestamp(item.date) === indiaDateKey())
    const ordersThisMonth = countAssignedDispatchedOrders(data?.movements || [], manager.platforms, item => monthForTimestamp(item.date) === selectedMonth)
    return {
      ...manager,
      ordersToday,
      ordersThisMonth,
      dailyAchievement: achievementPercent(ordersToday, manager.dailyTarget),
      monthlyAchievement: achievementPercent(ordersThisMonth, manager.monthlyTarget),
    }
  })
  const monthlyReports = reports.filter(report => report.date.slice(0, 7) === selectedMonth)
  const orderCount = summaries.reduce((total, item) => total + item.dispatchedOrders, 0)
  const dispatchedUnits = summaries.reduce((total, item) => total + item.dispatchedUnits, 0)
  const returnedOrders = summaries.reduce((total, item) => total + item.returnedOrders, 0)
  const grossSales = summaries.reduce((total, item) => total + item.dispatchedRevenue, 0)
  const netSales = grossSales - summaries.reduce((total, item) => total + item.returnValue + item.damagedValue, 0)
  const executiveRows = executiveSummaries.map(executive => <tr key={executive.executiveId}><td><strong>{executive.executiveName}</strong></td><td>{executive.platforms.join(', ') || '—'}</td><td>{executive.dailyTarget}</td><td>{executive.ordersToday}</td><td>{executive.dailyAchievement === null ? '—' : `${executive.dailyAchievement}%`}</td><td>{executive.monthlyTarget}</td><td>{executive.ordersThisMonth}</td><td>{executive.monthlyAchievement === null ? '—' : `${executive.monthlyAchievement}%`}</td></tr>)
  const monthlyReportRows = monthlyReports.map(report => <tr key={report.id}><td>{formatIndiaDate(report.date)}</td><td>{formatIndiaDateTime(report.updatedAt)}</td><td>{report.userName}</td><td>{report.platform}</td><td className="ecommerce-report-cell">{report.completed}</td><td className="ecommerce-report-cell">{report.pending || '—'}</td><td className="ecommerce-report-cell">{report.issues || '—'}</td></tr>)

  const saveTarget = async (targetType: 'manager' | 'executive', targetId: string, accountName: string) => {
    const draft = targetDrafts[targetId]
    const dailyTarget = Number(draft?.daily ?? '')
    const monthlyTarget = Number(draft?.monthly ?? '')
    if (!draft?.daily.trim() || !draft.monthly.trim() ||
        !Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
        !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
      setTargetMessage('Enter whole-number daily and monthly targets from 0 to 100,000.')
      return
    }
    setSavingTarget(targetId)
    setTargetMessage('')
    try {
      const result = await apiFetch<{ targetType: 'manager' | 'executive'; targetId: string; dailyTarget: number; monthlyTarget: number }>('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTarget', targetType, targetId, dailyTarget, monthlyTarget }),
      })
      setData(current => current ? {
        ...current,
        targets: {
          ...current.targets,
          executives: current.targets.executives?.map(item => result.targetType === 'executive' && item.executiveId === result.targetId
            ? { ...item, dailyTarget: result.dailyTarget, monthlyTarget: result.monthlyTarget } : item),
          managers: current.targets.managers?.map(item => result.targetType === 'manager' && item.managerId === result.targetId
            ? { ...item, dailyTarget: result.dailyTarget, monthlyTarget: result.monthlyTarget } : item),
        },
      } : current)
      setTargetMessage(`${accountName} daily and monthly targets saved.`)
    } catch (requestError) {
      setTargetMessage(requestError instanceof Error ? requestError.message : 'Executive targets could not be saved.')
    } finally {
      setSavingTarget(null)
    }
  }

  const exportMonthlyReport = () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaries.map(item => ({
      Platform: item.platform,
      'Orders Dispatched': item.dispatchedOrders,
      'Units Dispatched': item.dispatchedUnits,
      'Gross Sales (INR)': item.dispatchedRevenue,
      'Return Value (INR)': item.returnValue,
      'Damage Value (INR)': item.damagedValue,
      'Return Orders': item.returnedOrders,
      'Return Units': item.returnedUnits,
      'Damage Orders': item.damagedOrders,
      'Damaged Units': item.damagedUnits,
      'Daily Reports': item.dailyReports,
    }))), 'Platform Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(executiveSummaries.map(item => ({
      Executive: item.executiveName,
      Platforms: item.platforms.join(', '),
      'Daily Target': item.dailyTarget,
      'Orders Today': item.ordersToday,
      'Daily Achievement (%)': item.dailyAchievement ?? '',
      'Monthly Target': item.monthlyTarget,
      'Orders This Month': item.ordersThisMonth,
      'Monthly Achievement (%)': item.monthlyAchievement ?? '',
    }))), 'Executive Targets')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(managerSummaries.map(item => ({
      Manager: item.managerName,
      'Team Platforms': item.platforms.join(', '),
      'Daily Target': item.dailyTarget,
      'Orders Today': item.ordersToday,
      'Daily Achievement (%)': item.dailyAchievement ?? '',
      'Monthly Target': item.monthlyTarget,
      'Orders This Month': item.ordersThisMonth,
      'Monthly Achievement (%)': item.monthlyAchievement ?? '',
    }))), 'Manager Targets')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyReports.map(report => ({
      Date: report.date,
      Executive: report.userName,
      Platform: report.platform,
      'Completed Work': report.completed,
      'Pending Work': report.pending,
      'Issues / Notes': report.issues,
      'Last Updated (IST)': formatIndiaDateTime(report.updatedAt),
    }))), 'Daily Reports')
    XLSX.writeFile(workbook, `Ecommerce-Monthly-${selectedMonth}.xlsx`)
  }

  return (
    <section className="panel ecommerce-admin-dashboard">
      <div className="panel-heading ecommerce-month-heading">
        <div><h2>E-commerce monthly analysis</h2><p>All marketplace activity and executive reports for the selected month</p></div>
        <div className="ecommerce-month-actions"><label className="ecommerce-month-filter">Month<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label><button className="secondary" type="button" onClick={exportMonthlyReport} disabled={!data}><Download size={15} /> Export monthly report</button></div>
      </div>
      {error && <p className="ecommerce-error" role="alert">{error}</p>}
      {loading && !data && <div className="empty-state">Loading platform analysis…</div>}
      {data && <>
        <div className="ecommerce-platform-tags">{ecommercePlatforms.map(platform => <span className="ecommerce-platform-tag" key={platform}>{platform}</span>)}</div>
        <p className="ecommerce-metric-note">A dispatched order is counted once per unique marketplace order number. Delivery confirmation is not recorded in the current stock ledger.</p>
        <div className="stats-grid ecommerce-stock-summary">
          <div className="stat-card"><div className="stat-icon blue"><ShoppingCart size={20} /></div><div className="stat-body"><span>Orders dispatched</span><strong>{orderCount}</strong><small>{selectedMonth} · all platforms</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><Truck size={20} /></div><div className="stat-body"><span>Units dispatched</span><strong>{dispatchedUnits.toLocaleString('en-IN')}</strong><small>{selectedMonth}</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><RotateCcw size={20} /></div><div className="stat-body"><span>Returned orders</span><strong>{returnedOrders}</strong><small>{selectedMonth}</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><ClipboardCheck size={20} /></div><div className="stat-body"><span>Gross sales / net after returns & damage</span><strong>₹{grossSales.toLocaleString('en-IN')} / ₹{netSales.toLocaleString('en-IN')}</strong><small>{selectedMonth} · platform selling prices</small></div></div>
        </div>
        <section className="ecommerce-target-settings" aria-label="E-commerce targets">
          <div className="ecommerce-admin-reports-heading"><strong>E-commerce Manager targets</strong><span>Set manager targets; team actuals count each order once across the team's assigned platforms.</span></div>
          {managerSummaries.length === 0 ? <div className="empty-state"><Users size={22} /><strong>No active E-commerce Manager accounts</strong><span>Create a manager account before assigning manager targets.</span></div> : <>
            <div className="ecommerce-target-grid">{managerSummaries.map(manager => {
              const draft = targetDrafts[manager.managerId] || { daily: String(manager.dailyTarget), monthly: String(manager.monthlyTarget) }
              return <form key={manager.managerId} className="ecommerce-target-form" onSubmit={event => { event.preventDefault(); void saveTarget('manager', manager.managerId, manager.managerName) }}>
                <strong>{manager.managerName}</strong>
                <span className="ecommerce-target-platforms">{manager.platforms.length ? manager.platforms.join(' · ') : 'No active executive platforms'}</span>
                <label>Orders per day<input type="number" min="0" max="100000" step="1" value={draft.daily} onChange={event => setTargetDrafts(current => ({ ...current, [manager.managerId]: { ...(current[manager.managerId] || draft), daily: event.target.value } }))} /></label>
                <label>Orders per month<input type="number" min="0" max="100000" step="1" value={draft.monthly} onChange={event => setTargetDrafts(current => ({ ...current, [manager.managerId]: { ...(current[manager.managerId] || draft), monthly: event.target.value } }))} /></label>
                <button className="secondary" type="submit" disabled={savingTarget !== null}>{savingTarget === manager.managerId ? 'Saving…' : 'Save manager targets'}</button>
              </form>
            })}</div>
            <div className="ecommerce-table-wrap"><PaginatedTable label="Manager order targets and achievement" header={<thead><tr><th>Manager</th><th>Team platforms</th><th>Daily target</th><th>Orders today</th><th>Daily achievement</th><th>Monthly target</th><th>Orders this month</th><th>Monthly achievement</th></tr></thead>} rows={managerSummaries.map(manager => <tr key={manager.managerId}><td>{manager.managerName}</td><td>{manager.platforms.join(', ') || '—'}</td><td>{manager.dailyTarget}</td><td>{manager.ordersToday}</td><td>{manager.dailyAchievement === null ? '—' : `${manager.dailyAchievement}%`}</td><td>{manager.monthlyTarget}</td><td>{manager.ordersThisMonth}</td><td>{manager.monthlyAchievement === null ? '—' : `${manager.monthlyAchievement}%`}</td></tr>)} /></div>
          </>}
          <div className="ecommerce-admin-reports-heading"><strong>Executive order targets</strong><span>Set daily and monthly targets per active account.</span></div>
          <p className="ecommerce-metric-note">Actuals count unique dispatched order numbers from the ERP ledger across each executive’s assigned platforms. No marketplace API is used.</p>
          {executiveSummaries.length === 0 ? <div className="empty-state"><Users size={22} /><strong>No active E-commerce Executive accounts</strong><span>Create an executive account and assign platforms to set targets.</span></div> : <>
            <div className="ecommerce-target-grid">{executiveSummaries.map(executive => {
              const draft = targetDrafts[executive.executiveId] || { daily: String(executive.dailyTarget), monthly: String(executive.monthlyTarget) }
              return <form key={executive.executiveId} className="ecommerce-target-form" onSubmit={event => { event.preventDefault(); void saveTarget('executive', executive.executiveId, executive.executiveName) }}>
                <strong>{executive.executiveName}</strong>
                <span className="ecommerce-target-platforms">{executive.platforms.length ? executive.platforms.join(' · ') : 'No platforms assigned'}</span>
                <label>Orders per day<input type="number" min="0" max="100000" step="1" value={draft.daily} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), daily: event.target.value } }))} /></label>
                <label>Orders per month<input type="number" min="0" max="100000" step="1" value={draft.monthly} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), monthly: event.target.value } }))} /></label>
                <button className="secondary" type="submit" disabled={savingTarget !== null}>{savingTarget === executive.executiveId ? 'Saving…' : 'Save targets'}</button>
              </form>
            })}</div>
            <div className="ecommerce-table-wrap"><PaginatedTable label="Executive order targets and achievement" header={<thead><tr><th>Executive</th><th>Assigned platforms</th><th>Daily target</th><th>Orders today</th><th>Daily achievement</th><th>Monthly target</th><th>Orders this month</th><th>Monthly achievement</th></tr></thead>} rows={executiveRows} /></div>
          </>}
          <p className="ecommerce-feedback" role="status" aria-live="polite">{targetMessage}</p>
        </section>
        <div className="ecommerce-table-wrap"><table><thead><tr><th>Platform</th><th>Orders dispatched</th><th>Units</th><th>Gross sales</th><th>Return value</th><th>Damage value</th><th>Net sales</th><th>Daily reports</th></tr></thead><tbody>{summaries.map(summary => <tr key={summary.platform}><td><strong>{summary.platform}</strong></td><td>{summary.dispatchedOrders}</td><td>{summary.dispatchedUnits.toLocaleString('en-IN')}</td><td>₹{summary.dispatchedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{summary.returnValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{summary.damagedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{(summary.dispatchedRevenue - summary.returnValue - summary.damagedValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>{summary.dailyReports}</td></tr>)}</tbody></table></div>
        <div className="ecommerce-admin-reports">
          <div className="ecommerce-admin-reports-heading"><strong>{selectedMonth} executive daily reports</strong><span>{monthlyReports.length} submissions</span></div>
          {monthlyReports.length === 0 ? <div className="empty-state"><ClipboardCheck size={22} /><strong>No reports submitted this month</strong></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${selectedMonth} executive daily reports`} resetKey={selectedMonth} header={<thead><tr><th>Report date</th><th>Last updated (IST)</th><th>Executive</th><th>Platform</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th></tr></thead>} rows={monthlyReportRows} /></div>}
        </div>
      </>}
    </section>
  )
}

function EcommerceWorkspace({
  user,
  module,
  setModule,
}: {
  user: UserAccount
  module: Module
  setModule: (module: Module) => void
}) {
  const [data, setData] = useState<EcommerceWorkspaceData | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<EcommercePlatform>(user.platforms[0] || 'AMAZON')
  const [selectedMonth, setSelectedMonth] = useState(() => indiaMonthKey())
  const [listingSearch, setListingSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportHistoryError, setReportHistoryError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [ownReports, setOwnReports] = useState<EcommerceDailyReport[]>([])
  const [tasks, setTasks] = useState<EcommerceTask[]>([])
  const [taskError, setTaskError] = useState('')
  const [taskMessage, setTaskMessage] = useState('')
  const [taskReviewDrafts, setTaskReviewDrafts] = useState<Record<string, string>>({})
  const [taskBusyId, setTaskBusyId] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const [targetDrafts, setTargetDrafts] = useState<Record<string, { daily: string; monthly: string }>>({})
  const [savingTarget, setSavingTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingListingId, setEditingListingId] = useState('')
  const [platformSkuDraft, setPlatformSkuDraft] = useState('')
  const [mrpDraft, setMrpDraft] = useState('')
  const [sellingPriceDraft, setSellingPriceDraft] = useState('')

  const reload = useCallback(async () => {
    try {
      const result = await apiFetch<EcommerceWorkspaceData>('/api/ecommerce')
      setData(result)
      setError('')
      setSelectedPlatform(current => result.platforms.includes(current) ? current : result.platforms[0] || 'AMAZON')
      setTargetDrafts(Object.fromEntries((result.targets.executives || []).map(executive => [
        executive.executiveId,
        { daily: String(executive.dailyTarget), monthly: String(executive.monthlyTarget) },
      ])))
      if (user.role === 'E-commerce Executive' || user.role === 'E-commerce Manager') {
        try {
          const reportResult = await apiFetch<{ reports: EcommerceDailyReport[] }>('/api/ecommerce-reports')
          setOwnReports(reportResult.reports)
          setReportHistoryError('')
        } catch (requestError) {
          setReportHistoryError(requestError instanceof Error ? requestError.message : 'Saved reports could not be loaded.')
        }
        try {
          const taskResult = await apiFetch<{ tasks: EcommerceTask[] }>('/api/ecommerce-tasks')
          setTasks(taskResult.tasks)
          setTaskError('')
        } catch (requestError) {
          setTaskError(requestError instanceof Error ? requestError.message : 'Daily tasks could not be loaded.')
        }
      } else {
        setOwnReports([])
        setReportHistoryError('')
        setTasks([])
        setTaskError('')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'E-commerce workspace could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [user.role])

  useEffect(() => { void reload() }, [reload])

  const listings = data?.listings.filter(listing => listing.platform === selectedPlatform) || []
  const visibleListings = listings.filter(listing => {
    const query = listingSearch.trim().toLowerCase()
    return !query || [listing.productName, listing.productSku, listing.platformSku].some(value => value.toLowerCase().includes(query))
  })
  const movements = data?.movements.filter(movement => movement.platform === selectedPlatform) || []
  const canEditListings = user.role === 'E-commerce Executive' || user.role === 'Super Admin'
  const listingRows = visibleListings.map(listing => editingListingId === listing.id
    ? <tr key={listing.id}><td>{listing.productName}</td><td><code>{listing.productSku}</code></td><td colSpan={6}><form className="inline-listing-form" onSubmit={event => void saveListing(event, listing)}>
      <label>Platform SKU<input aria-label={`Platform SKU for ${listing.productName}`} value={platformSkuDraft} onChange={event => setPlatformSkuDraft(event.target.value)} maxLength={120} required /></label>
      <label>MRP<input aria-label={`MRP for ${listing.productName}`} type="number" min="0" step="0.01" value={mrpDraft} onChange={event => setMrpDraft(event.target.value)} required /></label>
      <label>Selling price<input aria-label={`Selling price for ${listing.productName}`} type="number" min="0" step="0.01" value={sellingPriceDraft} onChange={event => setSellingPriceDraft(event.target.value)} required /></label>
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save listing'}</button>
      <button className="secondary" type="button" onClick={() => setEditingListingId('')} disabled={busy}>Cancel</button>
    </form></td></tr>
    : <tr key={listing.id}>
      <td>{listing.productName}</td>
      <td><code>{listing.productSku}</code></td>
      <td><code>{listing.platformSku || '—'}</code></td>
      <td>₹{listing.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>₹{listing.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>{listing.availableStock.toLocaleString('en-IN')}</td>
      <td>{listing.stockStatus}</td>
      {canEditListings && <td><button className="secondary" type="button" onClick={() => {
        setEditingListingId(listing.id)
        setPlatformSkuDraft(listing.platformSku)
        setMrpDraft(String(listing.mrp))
        setSellingPriceDraft(String(listing.sellingPrice))
      }}>Edit listing</button></td>}
    </tr>)
  const orderRows = movements.map(item => <tr key={item.id}><td>{formatIndiaDateTime(item.date)}</td><td><code>{item.orderNumber}</code></td><td>{item.type}</td><td><code>{item.sku}</code></td><td>{item.quantity}</td><td>{item.reason || '—'}</td></tr>)
  const labels = data?.labels.filter(label => label.platform === selectedPlatform) || []
  const labelRows = labels.map(label => <div className="ecommerce-label-row" key={label.id}><div><strong>{label.orderNumber}</strong><span>{label.fileName} · {formatIndiaDateTime(label.uploadedAt)}</span></div><button className="secondary" type="button" disabled={busy} onClick={() => void downloadLabel(label)}><Download size={15} /> Download</button></div>)
  const latestOwnReport = ownReports.find(report => report.platform === (user.role === 'E-commerce Manager' ? 'TEAM' : selectedPlatform))
  const uniqueStock = new Map(listings.map(listing => [listing.productSku.toLowerCase(), listing.availableStock]))
  const monthlySummaries = (data?.platforms || []).map(platform =>
    summarizeEcommercePlatform(platform, data?.movements || [], [], selectedMonth),
  )
  const selectedSummary = monthlySummaries.find(summary => summary.platform === selectedPlatform)
  const todayKey = indiaDateKey()
  const dailyTarget = data?.targets.dailyTarget ?? 0
  const monthlyTarget = data?.targets.monthlyTarget ?? 0
  const ordersToday = countAssignedDispatchedOrders(data?.movements || [], data?.platforms || [], item => dateForTimestamp(item.date) === todayKey)
  const ordersThisMonth = countAssignedDispatchedOrders(data?.movements || [], data?.platforms || [], item => monthForTimestamp(item.date) === selectedMonth)
  const dailyAchievement = achievementPercent(ordersToday, dailyTarget)
  const monthlyAchievement = achievementPercent(ordersThisMonth, monthlyTarget)
  const page = module === 'E-commerce Workspace'
    ? user.role === 'E-commerce Executive' ? 'overview' : 'all'
    : module === 'E-commerce Stock' ? 'stock'
      : module === 'E-commerce Orders' ? 'orders'
        : module === 'Shipping Labels' ? 'labels'
          : module === 'Daily Work Report' ? 'report'
            : 'overview'
  const pageTitle = page === 'stock' ? 'Stock and SKUs'
    : page === 'orders' ? 'Dispatches and returns'
      : page === 'labels' ? 'Shipping labels'
        : page === 'report' ? 'Daily work report'
          : user.role === 'E-commerce Manager' ? 'E-commerce Manager Dashboard' : 'E-commerce Workspace'
  const showAll = page === 'all'
  const showOverview = showAll || page === 'overview'
  const showStock = showAll || page === 'stock'
  const showOrders = showAll || page === 'orders'
  const showLabels = user.role !== 'Super Admin' && (showAll || page === 'labels')
  const showReport = user.role === 'E-commerce Executive'
    ? showAll || page === 'report'
    : user.role === 'E-commerce Manager' && page === 'report'
  const managerMonthlyReports = ownReports.filter(report => report.platform !== 'TEAM' && report.date.slice(0, 7) === selectedMonth)
  const targetRows = (data?.targets.executives || []).map(executive => {
    const dailyOrders = countAssignedDispatchedOrders(data?.movements || [], executive.platforms, item => dateForTimestamp(item.date) === todayKey)
    const monthlyOrders = countAssignedDispatchedOrders(data?.movements || [], executive.platforms, item => monthForTimestamp(item.date) === selectedMonth)
    const achievement = achievementPercent(dailyOrders, executive.dailyTarget)
    return <tr key={executive.executiveId}>
      <td><strong>{executive.executiveName}</strong></td><td>{executive.platforms.join(', ') || '—'}</td>
      <td>{executive.dailyTarget}</td><td>{dailyOrders}</td><td>{achievement === null ? '—' : `${achievement}%`}</td>
      <td>{executive.monthlyTarget}</td><td>{monthlyOrders}</td>
    </tr>
  })
  const managerReportRows = managerMonthlyReports.map(report => <tr key={report.id}>
    <td>{formatIndiaDate(report.date)}</td><td>{formatIndiaDateTime(report.updatedAt)}</td><td>{report.userName}</td><td>{report.platform}</td>
    <td className="ecommerce-report-cell">{report.completed}</td><td className="ecommerce-report-cell">{report.pending || '—'}</td><td className="ecommerce-report-cell">{report.issues || '—'}</td>
  </tr>)
  const managerTaskRows = tasks.map(task => <tr key={task.id}>
    <td>{formatIndiaDate(task.taskDate)}</td>
    <td>{task.executiveName}</td>
    <td><strong>{task.title}</strong>{task.description && <p className="ecommerce-task-detail">{task.description}</p>}</td>
    <td><span className={`status ${task.status === 'Approved' ? 'active' : task.status === 'Needs Changes' ? 'draft' : 'pending'}`}>{task.status === 'Submitted' ? 'Awaiting review' : task.status}</span>{task.reviewNote && <p className="ecommerce-task-detail">{task.reviewNote}</p>}</td>
    <td>{task.status === 'Submitted' ? <div className="ecommerce-task-review">
      <label>Review note<textarea maxLength={1000} value={taskReviewDrafts[task.id] || ''} onChange={event => setTaskReviewDrafts(current => ({ ...current, [task.id]: event.target.value }))} placeholder="Required when requesting changes" /></label>
      <div className="ecommerce-task-actions"><button className="primary" type="button" disabled={taskBusyId !== ''} onClick={() => void reviewManagerTask(task, 'Approved')}>{taskBusyId === task.id ? 'Saving…' : 'Approve'}</button><button className="secondary" type="button" disabled={taskBusyId !== ''} onClick={() => void reviewManagerTask(task, 'Needs Changes')}>Request changes</button></div>
    </div> : task.reviewedBy ? `Reviewed by ${task.reviewedBy}` : '—'}</td>
  </tr>)
  const executiveTaskRows = tasks.map(task => <tr key={task.id}>
    <td>{formatIndiaDate(task.taskDate)}</td>
    <td>{task.managerName}</td>
    <td><strong>{task.title}</strong>{task.description && <p className="ecommerce-task-detail">{task.description}</p>}</td>
    <td><span className={`status ${task.status === 'Approved' ? 'active' : task.status === 'Needs Changes' ? 'draft' : 'pending'}`}>{task.status === 'Submitted' ? 'Awaiting manager review' : task.status}</span>{task.reviewNote && <p className="ecommerce-task-detail">{task.reviewNote}</p>}</td>
    <td><div className="ecommerce-task-actions">{['Assigned', 'Needs Changes'].includes(task.status) && <button className="secondary" type="button" disabled={taskBusyId !== ''} onClick={() => void updateAssignedTask(task, 'In Progress')}>Start task</button>}{['Assigned', 'In Progress', 'Needs Changes'].includes(task.status) && <button className="primary" type="button" disabled={taskBusyId !== ''} onClick={() => void updateAssignedTask(task, 'Submitted')}>{taskBusyId === task.id ? 'Saving…' : 'Submit completed'}</button>}</div>{task.status === 'Submitted' && <small>Waiting for manager review</small>}</td>
  </tr>)

  const saveTeamExecutiveTarget = async (executive: EcommerceExecutiveTarget) => {
    const draft = targetDrafts[executive.executiveId]
    const daily = Number(draft?.daily ?? '')
    const monthly = Number(draft?.monthly ?? '')
    if (!draft?.daily.trim() || !draft.monthly.trim() || !Number.isInteger(daily) || daily < 0 || daily > 100000 ||
        !Number.isInteger(monthly) || monthly < 0 || monthly > 100000) {
      setActionMessage('Enter whole-number daily and monthly targets from 0 to 100,000.')
      return
    }
    setSavingTarget(executive.executiveId)
    setActionMessage('')
    try {
      const saved = await apiFetch<{ targetId: string; dailyTarget: number; monthlyTarget: number }>('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTarget', targetType: 'executive', targetId: executive.executiveId, dailyTarget: daily, monthlyTarget: monthly }),
      })
      setData(current => current ? {
        ...current,
        targets: { ...current.targets, executives: current.targets.executives?.map(item => item.executiveId === saved.targetId
          ? { ...item, dailyTarget: saved.dailyTarget, monthlyTarget: saved.monthlyTarget }
          : item) },
      } : current)
      setActionMessage(`${executive.executiveName} targets saved.`)
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Executive targets could not be saved.')
    } finally {
      setSavingTarget('')
    }
  }

  const createManagerTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const executiveId = String(form.get('executiveId') || '')
    const taskDate = String(form.get('taskDate') || '')
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    if (!executiveId || !taskDate || !title || title.length > 200 || description.length > 2000) {
      setTaskMessage('Choose an executive and date, enter a title, and keep details within 2,000 characters.')
      return
    }
    setCreatingTask(true)
    setTaskMessage('')
    try {
      const result = await apiFetch<{ task: EcommerceTask }>('/api/ecommerce-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', executiveId, taskDate, title, description }),
      })
      setTasks(current => [result.task, ...current.filter(task => task.id !== result.task.id)])
      setTaskMessage(`Daily task assigned to ${result.task.executiveName}.`)
      formElement.reset()
    } catch (requestError) {
      setTaskMessage(requestError instanceof Error ? requestError.message : 'Daily task could not be assigned.')
    } finally {
      setCreatingTask(false)
    }
  }

  const updateAssignedTask = async (task: EcommerceTask, status: 'In Progress' | 'Submitted') => {
    setTaskBusyId(task.id)
    setTaskMessage('')
    try {
      const result = await apiFetch<{ task: EcommerceTask }>('/api/ecommerce-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', taskId: task.id, status }),
      })
      setTasks(current => current.map(item => item.id === task.id ? result.task : item))
      setTaskMessage(status === 'Submitted' ? 'Task submitted to your Manager for review.' : 'Task marked in progress.')
    } catch (requestError) {
      setTaskMessage(requestError instanceof Error ? requestError.message : 'Task progress could not be updated.')
    } finally {
      setTaskBusyId('')
    }
  }

  const reviewManagerTask = async (task: EcommerceTask, decision: 'Approved' | 'Needs Changes') => {
    const reviewNote = (taskReviewDrafts[task.id] || '').trim()
    if (decision === 'Needs Changes' && !reviewNote) {
      setTaskMessage('Add a note explaining the requested changes.')
      return
    }
    setTaskBusyId(task.id)
    setTaskMessage('')
    try {
      const result = await apiFetch<{ task: EcommerceTask }>('/api/ecommerce-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', taskId: task.id, decision, reviewNote }),
      })
      setTasks(current => current.map(item => item.id === task.id ? result.task : item))
      setTaskReviewDrafts(current => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
      setTaskMessage(decision === 'Approved' ? 'Task completion approved.' : 'Task returned to the Executive with changes requested.')
    } catch (requestError) {
      setTaskMessage(requestError instanceof Error ? requestError.message : 'Task review could not be saved.')
    } finally {
      setTaskBusyId('')
    }
  }

  const createTeamExecutive = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const platforms = form.getAll('platforms').map(String)
    if (!platforms.length) {
      setActionMessage('Assign at least one marketplace platform.')
      return
    }
    setBusy(true)
    setActionMessage('')
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          username: form.get('username'),
          password: form.get('password'),
          role: 'E-commerce Executive',
          platforms,
        }),
      })
      formElement.reset()
      setActionMessage('Executive account created under your manager account.')
      await reload()
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Executive account could not be created.')
    } finally {
      setBusy(false)
    }
  }

  const changeTeamExecutiveStatus = async (executive: UserAccount) => {
    setBusy(true)
    setActionMessage('')
    try {
      await apiFetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: executive.id, active: !executive.active }),
      })
      setActionMessage(`${executive.name} account ${executive.active ? 'deactivated' : 'activated'}.`)
      await reload()
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Executive account status could not be changed.')
    } finally {
      setBusy(false)
    }
  }

  const saveListing = async (event: React.FormEvent<HTMLFormElement>, listing: EcommerceListing) => {
    event.preventDefault()
    setBusy(true)
    setActionMessage('')
    try {
      await apiFetch('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateListing',
          platform: selectedPlatform,
          listingId: listing.id,
          platformSku: platformSkuDraft,
          mrp: Number(mrpDraft),
          sellingPrice: Number(sellingPriceDraft),
        }),
      })
      setActionMessage('Marketplace SKU and prices updated. Reports now use the updated selling price.')
      setEditingListingId('')
      await reload()
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Marketplace SKU could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  const uploadLabel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const file = form.get('label')
    if (!(file instanceof File) || file.size === 0) {
      setActionMessage('Choose a PDF shipping label.')
      return
    }
    if (file.size > 3 * 1024 * 1024 || !/\.pdf$/i.test(file.name)) {
      setActionMessage('Choose a PDF file of 3 MB or smaller.')
      return
    }
    setBusy(true)
    setActionMessage('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)))
      }
      await apiFetch('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uploadLabel',
          platform: selectedPlatform,
          orderNumber: form.get('orderNumber'),
          fileName: file.name,
          base64: window.btoa(binary),
        }),
      })
      formElement.reset()
      setActionMessage('Label uploaded to private storage.')
      await reload()
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Shipping label could not be uploaded.')
    } finally {
      setBusy(false)
    }
  }

  const submitDailyReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true)
    setActionMessage('')
    try {
      const result = await apiFetch<{ report: EcommerceDailyReport }>('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitReport',
          platform: user.role === 'E-commerce Manager' ? 'TEAM' : selectedPlatform,
          completed: form.get('completed'),
          pending: form.get('pending'),
          issues: form.get('issues'),
        }),
      })
      setOwnReports(current => [result.report, ...current.filter(report => report.id !== result.report.id)])
      setReportHistoryError('')
      formElement.reset()
      setActionMessage('Daily report saved.')
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Daily report could not be submitted.')
    } finally {
      setBusy(false)
    }
  }

  const downloadLabel = async (label: EcommerceLabel) => {
    setBusy(true)
    setActionMessage('')
    try {
      const response = await fetch(`/api/ecommerce-label?id=${encodeURIComponent(label.id)}`, { cache: 'no-store' })
      if (!response.ok) {
        let message = 'Shipping label could not be downloaded.'
        try {
          const result = await response.json() as { error?: string }
          message = result.error || message
        } catch { /* The download endpoint may return a non-JSON server error. */ }
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = label.fileName
      anchor.click()
      window.URL.revokeObjectURL(url)
      setActionMessage('Shipping label downloaded.')
    } catch (requestError) {
      setActionMessage(requestError instanceof Error ? requestError.message : 'Shipping label could not be downloaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ecommerce-workspace">
      <div className="page-heading"><div><p>PLATFORM OPERATIONS</p><h1>{pageTitle}</h1><span className="catalog-intro">{user.role === 'Super Admin' ? 'Platform access is verified on the server for stock, orders, SKU updates, and reports.' : 'Platform access is verified on the server for stock, orders, SKU updates, labels, and reports.'}</span></div><button className="secondary" onClick={() => { setLoading(true); void reload() }} disabled={loading}><RotateCcw size={16} /> Refresh</button></div>
      {(showOverview || showAll) && user.role !== 'E-commerce Manager' && <nav className="ecommerce-quick-links" aria-label="E-commerce workspace shortcuts">
        <button className="secondary" type="button" onClick={() => setModule('E-commerce Stock')}><Boxes size={16} /> Stock & SKUs</button>
        <button className="secondary" type="button" onClick={() => setModule('E-commerce Orders')}><Truck size={16} /> Dispatches & Returns</button>
        {user.role !== 'Super Admin' && <button className="secondary" type="button" onClick={() => setModule('Shipping Labels')}><FileSpreadsheet size={16} /> Shipping Labels</button>}
        {user.role === 'E-commerce Executive' && <button className="secondary" type="button" onClick={() => setModule('Daily Work Report')}><ClipboardCheck size={16} /> Daily Report</button>}
      </nav>}
      {error && <div className="ecommerce-error" role="alert">{error}</div>}
      {loading && !data && <div className="panel empty-state">Loading assigned platform data…</div>}
      {data && <>
        {(showOverview || showAll) && <section className="panel ecommerce-section">
          <div className="panel-heading ecommerce-month-heading">
            <div><h2>{user.role === 'E-commerce Manager' ? 'Executive team platforms' : 'Assigned platforms'}</h2><p>{user.role === 'E-commerce Manager' ? 'Read-only platform data is limited to your active executives’ independently assigned platforms.' : 'Your account can access only the tagged platforms below.'}</p></div>
            <label className="ecommerce-month-filter">Monthly analysis<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
          </div>
          <div className="ecommerce-platform-tags">{data.platforms.map(platform => <span className="ecommerce-platform-tag" key={platform}>{platform}</span>)}</div>
          <p className="ecommerce-metric-note">Dispatched orders are counted by unique order number; the ledger does not track delivery confirmation.</p>
          <div className="ecommerce-table-wrap"><table><thead><tr><th>Platform</th><th>Orders dispatched</th><th>Units dispatched</th><th>Gross sales</th><th>Return value</th><th>Damage value</th><th>Net sales</th></tr></thead><tbody>{monthlySummaries.map(summary => <tr key={summary.platform}><td><strong>{summary.platform}</strong></td><td>{summary.dispatchedOrders}</td><td>{summary.dispatchedUnits.toLocaleString('en-IN')}</td><td>₹{summary.dispatchedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{summary.returnValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{summary.damagedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td>₹{(summary.dispatchedRevenue - summary.returnValue - summary.damagedValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td></tr>)}</tbody></table></div>
        </section>}
        {showOverview && user.role === 'E-commerce Manager' && <section className="panel ecommerce-section">
          <div className="panel-heading ecommerce-month-heading">
            <div><h2>Manager target and team progress</h2><p>Team actuals count each unique dispatched order once across your active executives’ platforms.</p></div>
            <label className="ecommerce-month-filter">Month<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
          </div>
          <div className="stats-grid ecommerce-target-progress">
            <div className="stat-card"><div className="stat-icon blue"><Target size={20} /></div><div className="stat-body"><span>Today · team orders / manager target</span><strong>{ordersToday} / {dailyTarget || '—'}</strong><small>{dailyAchievement === null ? 'Admin has not set a daily manager target' : `${dailyAchievement}% of target`}</small></div></div>
            <div className="stat-card"><div className="stat-icon green"><BarChart3 size={20} /></div><div className="stat-body"><span>{selectedMonth} · team orders / manager target</span><strong>{ordersThisMonth} / {monthlyTarget || '—'}</strong><small>{monthlyAchievement === null ? 'Admin has not set a monthly manager target' : `${monthlyAchievement}% of target`}</small></div></div>
            <div className="stat-card"><div className="stat-icon purple"><Users size={20} /></div><div className="stat-body"><span>Executive accounts</span><strong>{data.team?.filter(account => account.active).length || 0}</strong><small>Active direct reports</small></div></div>
            <div className="stat-card"><div className="stat-icon orange"><ClipboardCheck size={20} /></div><div className="stat-body"><span>Team reports</span><strong>{managerMonthlyReports.length}</strong><small>{selectedMonth} submitted reports</small></div></div>
          </div>
          <div className="ecommerce-admin-reports-heading"><strong>Executive daily and monthly targets</strong><span>Set targets for your active direct reports.</span></div>
          {(data.targets.executives || []).length === 0 ? <div className="empty-state"><Users size={22} /><strong>No active executives assigned</strong><span>Create an executive account below or ask Admin to assign one to you.</span></div> : <>
            <div className="ecommerce-target-grid">{data.targets.executives?.map(executive => {
              const draft = targetDrafts[executive.executiveId] || { daily: String(executive.dailyTarget), monthly: String(executive.monthlyTarget) }
              return <form key={executive.executiveId} className="ecommerce-target-form" onSubmit={event => { event.preventDefault(); void saveTeamExecutiveTarget(executive) }}>
                <strong>{executive.executiveName}</strong><span className="ecommerce-target-platforms">{executive.platforms.join(' · ') || 'No platforms assigned'}</span>
                <label>Orders per day<input type="number" min="0" max="100000" step="1" value={draft.daily} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), daily: event.target.value } }))} /></label>
                <label>Orders per month<input type="number" min="0" max="100000" step="1" value={draft.monthly} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), monthly: event.target.value } }))} /></label>
                <button className="secondary" type="submit" disabled={savingTarget !== ''}>{savingTarget === executive.executiveId ? 'Saving…' : 'Save targets'}</button>
              </form>
            })}</div>
            <div className="ecommerce-table-wrap"><PaginatedTable label="Team executive target progress" header={<thead><tr><th>Executive</th><th>Platforms</th><th>Daily target</th><th>Orders today</th><th>Daily achievement</th><th>Monthly target</th><th>Orders this month</th></tr></thead>} rows={targetRows} /></div>
          </>}
          <p className="ecommerce-feedback" role="status" aria-live="polite">{actionMessage}</p>
        </section>}
        {showOverview && user.role === 'E-commerce Manager' && <section className="panel ecommerce-section form-card">
          <div className="panel-heading"><div><h2>Create an E-commerce Executive</h2><p>New executives are automatically assigned to your manager account; platform access remains independently selected.</p></div></div>
          <form className="ecommerce-form" onSubmit={event => void createTeamExecutive(event)}>
            <div className="field-grid">
              <label>Full name<input name="name" required minLength={2} /></label>
              <label>Username<input name="username" required minLength={3} autoComplete="off" /></label>
              <label>Password<input name="password" type="password" required minLength={10} autoComplete="new-password" /></label>
              <fieldset className="platform-assignment"><legend>Assigned platform access</legend>{ecommercePlatforms.map(platform => <label key={platform}><input type="checkbox" name="platforms" value={platform} /> {platform}</label>)}</fieldset>
            </div>
            <button className="primary" type="submit" disabled={busy}><Plus size={15} /> Create team executive</button>
          </form>
          <div className="ecommerce-table-wrap"><PaginatedTable label="E-commerce manager team accounts" header={<thead><tr><th>Executive</th><th>Username</th><th>Platforms</th><th>Status</th><th /></tr></thead>} rows={(data.team || []).map(executive => <tr key={executive.id}>
            <td>{executive.name}</td><td><code>{executive.username}</code></td><td>{executive.platforms.join(', ') || '—'}</td>
            <td>{executive.active ? 'Active' : 'Inactive'}</td><td><button className="secondary" type="button" disabled={busy} onClick={() => void changeTeamExecutiveStatus(executive)}>{executive.active ? 'Deactivate' : 'Activate'}</button></td>
          </tr>)} /></div>
        </section>}
        {showOverview && user.role === 'E-commerce Manager' && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>Executive daily reports · {selectedMonth}</h2><p>Reports submitted by your direct reports</p></div></div>
          {reportHistoryError && <p className="ecommerce-error" role="alert">{reportHistoryError}</p>}
          {managerMonthlyReports.length === 0 ? <div className="empty-state"><ClipboardCheck size={22} /><strong>No executive reports this month</strong></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${selectedMonth} manager team daily reports`} resetKey={selectedMonth} header={<thead><tr><th>Date</th><th>Updated (IST)</th><th>Executive</th><th>Platform</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th></tr></thead>} rows={managerReportRows} /></div>}
        </section>}
        {showOverview && user.role === 'E-commerce Manager' && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>Assign and review daily tasks</h2><p>Tasks are private to your team. Executives submit completion for your review.</p></div></div>
          {taskError && <p className="ecommerce-error" role="alert">{taskError}</p>}
          <form className="ecommerce-form" onSubmit={createManagerTask}>
            <label>Executive<select name="executiveId" required defaultValue=""><option value="">Choose an active Executive</option>{(data.team || []).filter(account => account.active).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <label>Task date<input name="taskDate" type="date" required defaultValue={indiaDateKey()} /></label>
            <label>Task title<input name="title" required maxLength={200} placeholder="For example, prepare the marketplace listing images" /></label>
            <label>Task details<textarea name="description" rows={3} maxLength={2000} placeholder="Add the expected outcome or instructions." /></label>
            <button className="primary" type="submit" disabled={creatingTask || !(data.team || []).some(account => account.active)}><Plus size={15} /> {creatingTask ? 'Assigning…' : 'Assign daily task'}</button>
          </form>
          <p className="ecommerce-feedback" role="status" aria-live="polite">{taskMessage}</p>
          {tasks.length === 0 ? <div className="empty-state"><ClipboardCheck size={22} /><strong>No team tasks yet</strong><span>Assign a dated task to an active Executive.</span></div> : <div className="ecommerce-table-wrap"><PaginatedTable label="Manager daily tasks" resetKey={tasks.map(task => `${task.id}-${task.status}`).join(':')} header={<thead><tr><th>Task date</th><th>Executive</th><th>Task</th><th>Status / review note</th><th>Manager review</th></tr></thead>} rows={managerTaskRows} /></div>}
        </section>}
        {showOverview && user.role === 'E-commerce Executive' && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>My daily tasks</h2><p>Update progress and submit completed work to your Manager for review.</p></div></div>
          {taskError && <p className="ecommerce-error" role="alert">{taskError}</p>}
          <p className="ecommerce-feedback" role="status" aria-live="polite">{taskMessage}</p>
          {tasks.length === 0 ? <div className="empty-state"><ClipboardCheck size={22} /><strong>No daily tasks assigned</strong><span>Your Manager’s tasks will appear here.</span></div> : <div className="ecommerce-table-wrap"><PaginatedTable label="My assigned daily tasks" resetKey={tasks.map(task => `${task.id}-${task.status}`).join(':')} header={<thead><tr><th>Task date</th><th>Manager</th><th>Task</th><th>Status / review note</th><th>Progress</th></tr></thead>} rows={executiveTaskRows} /></div>}
        </section>}
        {showOverview && user.role === 'E-commerce Executive' && <div className="stats-grid ecommerce-target-progress">
          <div className="stat-card"><div className="stat-icon blue"><Target size={20} /></div><div className="stat-body"><span>Today · dispatched orders / daily target</span><strong>{ordersToday} / {dailyTarget || '—'}</strong><small>{dailyAchievement === null ? 'Daily target not set' : `${dailyAchievement}% of daily target`}</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><BarChart3 size={20} /></div><div className="stat-body"><span>{selectedMonth} · orders / monthly target</span><strong>{ordersThisMonth} / {monthlyTarget || '—'}</strong><small>{monthlyAchievement === null ? 'Monthly target not set' : `${monthlyAchievement}% of monthly target`}</small></div></div>
        </div>}
        {showStock && <div className="ecommerce-platform-tabs" role="tablist" aria-label="Assigned marketplace platforms">
          {data.platforms.map(platform => <button key={platform} type="button" role="tab" aria-selected={selectedPlatform === platform} className={selectedPlatform === platform ? 'active' : ''} onClick={() => { setSelectedPlatform(platform); setListingSearch(''); setActionMessage('') }}>{platform}</button>)}
        </div>}
        {showStock && <div className="stats-grid ecommerce-stock-summary">
          <div className="stat-card"><div className="stat-icon blue"><Boxes size={20} /></div><div className="stat-body"><span>Available stock</span><strong>{Array.from(uniqueStock.values()).reduce((total, stock) => total + stock, 0).toLocaleString('en-IN')}</strong><small>Across {listings.length} assigned listings</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><Truck size={20} /></div><div className="stat-body"><span>Orders dispatched this month</span><strong>{selectedSummary?.dispatchedOrders || 0}</strong><small>{selectedSummary?.dispatchedUnits || 0} units · {selectedMonth}</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><RotateCcw size={20} /></div><div className="stat-body"><span>Returns / damage this month</span><strong>{(selectedSummary?.returnedOrders || 0) + (selectedSummary?.damagedOrders || 0)}</strong><small>Order events · {selectedMonth}</small></div></div>
          {user.role !== 'Super Admin' && <div className="stat-card"><div className="stat-icon blue"><FileSpreadsheet size={20} /></div><div className="stat-body"><span>Shipping labels</span><strong>{labels.length}</strong><small>Permanently deleted after 7 days</small></div></div>}
        </div>}
        {showStock && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>{selectedPlatform} stock and SKUs</h2><p>Edit this platform's SKU, MRP, or selling price here. Sales reports use the current selling price; the shared Product SKU stays unchanged.</p></div></div>
          <div className="ecommerce-listing-toolbar"><label><Search size={16} /><input type="search" aria-label="Search product name, product SKU, or platform SKU" placeholder="Search product name or SKU" value={listingSearch} onChange={event => setListingSearch(event.target.value)} /></label><span>{visibleListings.length} of {listings.length} listings</span></div>
          {listings.length === 0 ? <div className="empty-state"><Boxes size={24} /><strong>No marketplace listings</strong><span>Assigned platform products will appear here.</span></div> : visibleListings.length === 0 ? <div className="empty-state"><Search size={24} /><strong>No matching products</strong><span>Try a different product name or SKU.</span></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${selectedPlatform} stock and SKUs`} resetKey={`${selectedPlatform}:${listingSearch}`} header={<thead><tr><th>Product</th><th>Product SKU</th><th>Platform SKU</th><th>MRP</th><th>Selling price</th><th>Available stock</th><th>Status</th>{canEditListings && <th />}</tr></thead>} rows={listingRows} /></div>}
        </section>}
        {showOrders && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>Dispatches and returns</h2><p>Dispatch, return, and damage records tied to order numbers.</p></div></div>
          {movements.length === 0 ? <div className="empty-state"><Truck size={24} /><strong>No platform orders yet</strong><span>Platform dispatches and linked returns will appear here.</span></div> : <div className="ecommerce-table-wrap"><PaginatedTable label={`${selectedPlatform} dispatches and returns`} resetKey={selectedPlatform} header={<thead><tr><th>Date</th><th>Order number</th><th>Type</th><th>Product SKU</th><th>Quantity</th><th>Notes</th></tr></thead>} rows={orderRows} /></div>}
        </section>}
        {(showLabels || showReport) && <div className={`ecommerce-panels${showLabels !== showReport ? ' ecommerce-single-panel' : ''}`}>
          {showLabels && <section className="panel ecommerce-section" id="ecommerce-shipping-labels">
            <div className="panel-heading"><div><h2>Shipping labels</h2><p>PDFs are stored privately and permanently deleted after 7 days.</p></div></div>
            {user.role === 'E-commerce Executive' && <form className="ecommerce-form" onSubmit={event => void uploadLabel(event)}><label>Marketplace order number<input name="orderNumber" required maxLength={120} /></label><label>Label PDF<input name="label" type="file" accept="application/pdf,.pdf" required /></label><small>PDF only · maximum 3 MB</small><button className="primary" type="submit" disabled={busy}><Upload size={15} /> Upload label</button></form>}
            {labels.length === 0 ? <div className="empty-state"><FileSpreadsheet size={24} /><strong>No labels for {selectedPlatform}</strong><span>Uploaded shipping labels will be listed here.</span></div> : <PaginatedList label={`${selectedPlatform} shipping labels`} resetKey={selectedPlatform} items={labelRows} className="ecommerce-label-list" />}
          </section>}
          {showReport && <section className="panel ecommerce-section">
            <div className="panel-heading"><div><h2>Daily work report</h2><p>{user.role === 'E-commerce Manager' ? 'Submit one team report each day; resubmitting updates today’s report.' : 'One report per platform each day; new submissions update today’s report.'}</p></div></div>
            {reportHistoryError && <p className="ecommerce-error" role="alert">{reportHistoryError}</p>}
            <form className="ecommerce-form" onSubmit={event => void submitDailyReport(event)}><label>Completed work<textarea name="completed" required maxLength={3000} rows={4} /></label><label>Pending work<textarea name="pending" maxLength={3000} rows={3} /></label><label>Issues / notes<textarea name="issues" maxLength={3000} rows={3} /></label><button className="primary" type="submit" disabled={busy}><CheckCircle2 size={15} /> Submit daily report</button></form>
            <section className="ecommerce-report-saved" aria-label="Daily report status">
              <p>Report date today: {formatIndiaDate(indiaDateKey())}</p>
              {latestOwnReport ? <>
                <strong>Latest saved: {formatIndiaDate(latestOwnReport.date)} · Last submitted/updated: {formatIndiaDateTime(latestOwnReport.updatedAt)}</strong>
                <p><b>Completed:</b> {latestOwnReport.completed}</p>
                <p><b>Pending:</b> {latestOwnReport.pending || '—'}</p>
                <p><b>Issues / notes:</b> {latestOwnReport.issues || '—'}</p>
              </> : <p>No report has been saved for {user.role === 'E-commerce Manager' ? 'your team' : selectedPlatform} yet.</p>}
            </section>
          </section>}
        </div>}
        <p className="ecommerce-feedback" role="status" aria-live="polite">{actionMessage}</p>
      </>}
    </section>
  )
}

function MovementTable({ movements, showDeliveryDetails = false, resetKey = '' }: { movements: StockMovement[]; showDeliveryDetails?: boolean; resetKey?: string }) {
  const headers = <thead><tr><th>Date / time</th><th>Item</th><th>SKU</th><th>Movement</th><th>Quantity</th><th>Balance</th><th>Supplier</th><th>Unit cost / price</th><th>Transaction value</th>{showDeliveryDetails && <><th>Channel</th><th>Delivery partner</th></>}<th>Reference</th><th>Reason</th><th>Entered by</th></tr></thead>
  const rows = movements.map(movement => <tr key={movement.id}>
    <td>{formatIndiaDateTime(movement.date)}</td>
    <td>{movement.itemType || '—'}</td>
    <td><code>{movement.sku}</code></td>
    <td>{movement.type}</td>
    <td>{movement.quantity.toLocaleString('en-IN')}</td>
    <td>{movement.openingStock.toLocaleString('en-IN')} → {movement.closingStock.toLocaleString('en-IN')}</td>
    <td>{movement.supplier || '—'}</td>
    <td>{movement.hasRecordedCost ? `₹${movement.unitCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : movement.hasRecordedPrice ? `₹${movement.unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</td>
    <td>{movement.hasRecordedCost ? `₹${movement.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : movement.hasRecordedPrice ? `₹${movement.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}</td>
    {showDeliveryDetails && <><td>{movement.salesChannel || '—'}</td><td>{movement.deliveryPartner || '—'}</td></>}
    <td>{movement.referenceId || '—'}</td>
    <td>{movement.reason || '—'}</td>
    <td>{movement.createdBy || '—'}</td>
  </tr>)
  return (
    <>
      <PaginatedTable label="Stock movement history" resetKey={`${resetKey}:${showDeliveryDetails}`} header={headers} rows={rows} />
      {movements.length === 0 && <div className="empty-state"><Archive size={24} /><strong>No stock movements yet</strong><span>Saved stock changes will appear here and cannot be deleted.</span></div>}
    </>
  )
}

function PaginatedTable({
  label,
  header,
  rows,
  resetKey = '',
}: {
  label: string
  header: React.ReactNode
  rows: React.ReactNode[]
  resetKey?: string
}) {
  const [pagination, setPagination] = useState({ key: '', page: 1, pageSize: 10 })
  const key = `${resetKey}:${rows.length}`
  const pageSize = pagination.key === key ? pagination.pageSize : 10
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(pagination.key === key ? pagination.page : 1, totalPages)
  const start = (page - 1) * pageSize
  const visibleRows = rows.slice(start, start + pageSize)
  const updatePagination = (nextPage: number, nextPageSize = pageSize) => {
    setPagination({ key, page: nextPage, pageSize: nextPageSize })
  }

  return (
    <div className="paginated-table">
      <table aria-label={label}>{header}<tbody>{visibleRows}</tbody></table>
      {rows.length > pageSize && <nav className="pagination-controls" aria-label={`${label} pagination`}>
        <span className="pagination-summary" aria-live="polite">Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}</span>
        <label className="pagination-page-size">Rows
          <select aria-label={`Rows per page for ${label}`} value={pageSize} onChange={event => updatePagination(1, Number(event.target.value))}>
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </label>
        <div className="pagination-actions">
          <button type="button" className="secondary" disabled={page <= 1} onClick={() => updatePagination(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" className="secondary" disabled={page >= totalPages} onClick={() => updatePagination(page + 1)}>Next</button>
        </div>
      </nav>}
    </div>
  )
}

function PaginatedList({
  label,
  items,
  resetKey = '',
  className = '',
}: {
  label: string
  items: React.ReactNode[]
  resetKey?: string
  className?: string
}) {
  const [pagination, setPagination] = useState({ key: '', page: 1, pageSize: 10 })
  const key = `${resetKey}:${items.length}`
  const pageSize = pagination.key === key ? pagination.pageSize : 10
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(pagination.key === key ? pagination.page : 1, totalPages)
  const start = (page - 1) * pageSize
  const updatePagination = (nextPage: number, nextPageSize = pageSize) => setPagination({ key, page: nextPage, pageSize: nextPageSize })

  return (
    <div className={`paginated-list ${className}`}>
      {items.slice(start, start + pageSize)}
      {items.length > pageSize && <nav className="pagination-controls" aria-label={`${label} pagination`}>
        <span className="pagination-summary" aria-live="polite">Showing {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}</span>
        <label className="pagination-page-size">Rows
          <select aria-label={`Rows per page for ${label}`} value={pageSize} onChange={event => updatePagination(1, Number(event.target.value))}>
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
        </label>
        <div className="pagination-actions">
          <button type="button" className="secondary" disabled={page <= 1} onClick={() => updatePagination(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" className="secondary" disabled={page >= totalPages} onClick={() => updatePagination(page + 1)}>Next</button>
        </div>
      </nav>}
    </div>
  )
}

type DashboardViewProps = {
  role: Role
  user: UserAccount
  users: UserAccount[]
  products: Product[]
  production: Production[]
  graphicDesignTasks: GraphicDesignTask[]
  today: string
  machines: Machine[]
  productionChart: { date: string; qty: number }[]
  setModule: (module: Module) => void
  exportExcel: () => void
}

function DashboardView({
  role, user, users, products, production, graphicDesignTasks, today, machines, productionChart, setModule, exportExcel,
}: DashboardViewProps) {
  if (role === 'Store Manager') {
    return (
      <section>
        <div className="page-heading"><div><p>STORE MANAGER</p><h1>Workspace restricted</h1></div></div>
        <div className="panel placeholder"><div className="placeholder-icon"><LockKeyhole size={28} /></div><h2>Assigned workspace</h2><p>Inventory, factory operations, and catalog access are assigned to the Super Admin and Production Supervisor roles.</p></div>
      </section>
    )
  }
  const todayProduction = production.filter(row => row.date === today)
  const todayUnits = todayProduction.reduce((sum, row) => sum + row.actual, 0)
  const todayRejected = todayProduction.reduce((sum, row) => sum + row.rejected, 0)
  const variantMasters = new Set(products.filter(product => product.isVariant && product.status === 'Active').map(product => product.masterSku.toLowerCase()))
  const activeProducts = products.filter(product =>
    product.status === 'Active' && (product.isVariant || !variantMasters.has(product.sku.toLowerCase()))
  )
  const zeroStockCount = activeProducts.filter(product => product.stock <= 0).length
  const availableStock = activeProducts.reduce((sum, product) => sum + product.stock, 0)
  const activeUsers = users.filter(account => account.active)
  const roleCounts = (['Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer'] as Role[])
    .map(accountRole => ({
      role: accountRole,
      count: users.filter(account => account.role === accountRole).length,
      active: users.filter(account => account.role === accountRole && account.active).length,
    }))
  const machineStatusCount = (status: string) => machines.filter(machine => machine.status.toLowerCase() === status).length

  const descriptions: Record<Role, string> = {
    'Super Admin': 'Manage the full ERP, inventory, factory operations, and team access.',
    'Production Supervisor': 'Manage production, inventory, catalog, machines, and sales. Management, User Management, Settings, and Audit Logs are Admin-only.',
    'Machine Operator': 'Review production entries and assigned machine targets.',
    'Store Manager': 'This account has dashboard-only access. Contact the Super Admin if your assigned workspace needs to change.',
    'E-commerce Manager': 'Manage your assigned E-commerce Executives, set team targets, and review their daily reports.',
    'E-commerce Executive': 'Review assigned-platform stock and dispatches, upload labels, update marketplace SKUs, and submit your daily report.',
    'Sales Executive': 'Manage assigned leads, record call updates, view available stock, book orders, and track your monthly and yearly targets.',
    'Graphic Designer': 'Plan social posts and videos, write captions and scripts, track shoot/edit progress, and submit work for Admin review.',
  }
  const statsByRole: Record<Role, { label: string; value: string; detail: string; icon: typeof Package; tone: string }[]> = {
    'Super Admin': [
      { label: 'Today’s production', value: String(todayUnits), detail: `${todayProduction.length} team entries`, icon: Factory, tone: 'purple' },
      { label: 'Today’s rejects', value: String(todayRejected), detail: 'Units recorded', icon: ClipboardCheck, tone: 'orange' },
      { label: 'Active SKUs', value: String(activeProducts.length), detail: 'Available to select', icon: Package, tone: 'green' },
      { label: 'Available machines', value: String(machines.length - machineStatusCount('maintenance')), detail: 'Not in maintenance', icon: Gauge, tone: 'blue' },
    ],
    'Production Supervisor': [
      { label: 'Master products', value: String(products.filter(product => !product.isVariant).length), detail: 'Shared product catalog', icon: Archive, tone: 'blue' },
      { label: 'Active SKUs', value: String(activeProducts.length), detail: 'Available for production', icon: Package, tone: 'green' },
      { label: 'Machines', value: String(machines.length), detail: `${machineStatusCount('running')} running`, icon: Gauge, tone: 'orange' },
      { label: 'Today’s production', value: String(todayUnits), detail: `${todayProduction.length} records`, icon: Factory, tone: 'purple' },
    ],
    'Machine Operator': [
      { label: 'My output today', value: String(todayUnits), detail: `${todayProduction.length} entries`, icon: Factory, tone: 'purple' },
      { label: 'My rejects today', value: String(todayRejected), detail: 'Units recorded', icon: ClipboardCheck, tone: 'orange' },
      { label: 'Active SKUs', value: String(activeProducts.length), detail: 'Available to select', icon: Package, tone: 'green' },
      { label: 'Available machines', value: String(machines.length - machineStatusCount('maintenance')), detail: 'Not in maintenance', icon: Gauge, tone: 'blue' },
    ],
    'Store Manager': [
      { label: 'Available stock', value: String(availableStock), detail: 'Across active SKUs', icon: Boxes, tone: 'blue' },
      { label: 'Active SKUs', value: String(activeProducts.length), detail: 'Finished-goods catalog', icon: Package, tone: 'green' },
      { label: 'Out of stock', value: String(zeroStockCount), detail: 'Active SKUs at zero', icon: AlertTriangle, tone: 'orange' },
      { label: 'Stocked SKUs', value: String(activeProducts.filter(product => product.stock > 0).length), detail: 'Active SKUs with stock', icon: CheckCircle2, tone: 'purple' },
    ],
    'E-commerce Manager': [
      { label: 'Team workspace', value: 'Open dashboard', detail: 'Executive targets, reports, and platform activity', icon: Users, tone: 'blue' },
    ],
    'E-commerce Executive': [
      { label: 'Assigned platforms', value: '—', detail: 'Open your e-commerce workspace', icon: ShoppingCart, tone: 'blue' },
    ],
    'Sales Executive': [
      { label: 'Sales workspace', value: 'Ready', detail: 'Open assigned leads and targets', icon: BarChart3, tone: 'blue' },
    ],
    'Graphic Designer': [
      { label: 'Monthly social plan', value: 'Open plan', detail: 'Posts, videos, and review status', icon: FileSpreadsheet, tone: 'purple' },
    ],
  }
  const shortcuts: Record<Role, { module: Module; detail: string }[]> = {
    'Super Admin': [
      { module: 'Camera Monitoring', detail: 'View approved live screen shares and saved clips' },
      { module: 'Graphic Design', detail: 'Review social content plans, scripts, and production progress' },
      { module: 'User Management', detail: 'Create accounts and assign team roles' },
      { module: 'Inventory', detail: 'Review raw materials and finished goods' },
      { module: 'Product Catalog', detail: 'Create products, SKUs, and marketplace listings' },
      { module: 'Machines', detail: 'Configure machines and availability' },
      { module: 'Production Targets', detail: 'Assign daily, weekly, and monthly machine targets' },
      { module: 'Sales Dashboard', detail: 'Set monthly and yearly targets; review booked sales' },
      { module: 'Leads', detail: 'Import leads and review call follow-ups' },
      { module: 'Orders', detail: 'Review all booked orders and fulfillment' },
      { module: 'Stock Movement', detail: 'Audit the complete stock ledger' },
    ],
    'Production Supervisor': [
      { module: 'Inventory', detail: 'Manage raw materials and finished goods' },
      { module: 'Production', detail: 'Enter output and export production reports' },
      { module: 'Production Targets', detail: 'View machine targets and actual output' },
      { module: 'Product Catalog', detail: 'Manage products, SKUs, and marketplace listings' },
      { module: 'Stitching', detail: 'Review stitching work' },
      { module: 'Quality Control', detail: 'Review quality checks' },
      { module: 'Sales Dashboard', detail: 'Review sales target progress and orders' },
      { module: 'Orders', detail: 'View sales bookings and fulfillment status' },
    ],
    'Machine Operator': [
      { module: 'Production', detail: 'Inspect production entries and your machine targets' },
      { module: 'Production Targets', detail: 'See the target assigned to your machine' },
    ],
    'Store Manager': [],
    'E-commerce Manager': [
      { module: 'E-commerce Workspace', detail: 'Manage executive accounts, targets, reports, and team platforms' },
    ],
    'E-commerce Executive': [
      { module: 'E-commerce Workspace', detail: 'View assigned platforms, shipping labels, and daily tasks' },
    ],
    'Sales Executive': [
      { module: 'Sales Dashboard', detail: 'View your monthly and yearly booked sales targets' },
      { module: 'Leads', detail: 'Update call outcomes and follow-up dates' },
      { module: 'Orders', detail: 'Book orders and see stock reserved' },
    ],
    'Graphic Designer': [
      { module: 'Graphic Design', detail: 'Plan social posts and videos, track shoots and edits, and submit work for review' },
    ],
  }
  const recentProduction = [...production].reverse().slice(0, 5)

  return (
    <>
      <div className="page-heading">
        <div><p>{role.toUpperCase()} WORKSPACE</p><h1>Welcome, {user.name}</h1><span className="dashboard-description">{descriptions[role]}</span></div>
        <div className="heading-actions">
          {role === 'Super Admin' && <button className="secondary" onClick={() => setModule('User Management')}><Users size={17} /> Create team login</button>}
        <button className="primary" onClick={exportExcel}><Download size={17} /> Export report</button>
        </div>
      </div>

      <div className="stats-grid">
        {statsByRole[role].map(card => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-icon ${card.tone}`}><card.icon size={21} /></div>
            <div className="stat-body"><span>{card.label}</span><strong>{card.value}</strong><small>{card.detail}</small></div>
          </div>
        ))}
      </div>

      {role === 'Super Admin' && <>
        <EcommerceMonthlyDashboard />
        <section className="panel ecommerce-report-panel">
          <div className="panel-heading"><div><h2>Social content plan · {today.slice(0, 7)}</h2><p>Graphic Designer submissions and approval status for this month</p></div><button className="text-button" type="button" onClick={() => setModule('Graphic Design')}>Review content</button></div>
          <div className="stats-grid">
            {([
              ['Planned', graphicDesignTasks.filter(task => task.month === today.slice(0, 7)).length],
              ['Awaiting review', graphicDesignTasks.filter(task => task.month === today.slice(0, 7) && task.reviewStatus === 'Pending').length],
              ['Approved', graphicDesignTasks.filter(task => task.month === today.slice(0, 7) && task.reviewStatus === 'Approved').length],
              ['Rejected', graphicDesignTasks.filter(task => task.month === today.slice(0, 7) && task.reviewStatus === 'Rejected').length],
            ] as const).map(([label, count]) => <div className="stat-card" key={label}><div className="stat-icon purple"><FileSpreadsheet size={18} /></div><div className="stat-body"><span>{label}</span><strong>{count}</strong><small>Social posts and videos</small></div></div>)}
          </div>
        </section>
      </>}

      <div className="dashboard-grid">
        <section className="panel production-panel">
          <div className="panel-heading"><div><h2>{role === 'Production Supervisor' ? 'Factory production' : role === 'Super Admin' ? 'Factory production' : 'My production overview'}</h2><p>Actual output, Monday through Sunday</p></div><button className="text-button" onClick={() => setModule('Production')}>Open production</button></div>
          <div className="chart-stat"><strong>{productionChart.reduce((sum, day) => sum + day.qty, 0)}</strong><span><ArrowUpRight size={14} /> This week</span></div>
          <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={productionChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" interval={0} tickFormatter={value => formatIndiaWeekday(String(value))} axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip labelFormatter={label => `${formatIndiaWeekday(String(label))}, ${formatIndiaDate(String(label))}`} /><Bar dataKey="qty" fill="#4f46e5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </section>

        {role === 'Super Admin' ? (
          <section className="panel">
            <div className="panel-heading"><div><h2>Team access</h2><p>{activeUsers.length} active of {users.length} accounts</p></div><button className="text-button" onClick={() => setModule('User Management')}>Manage users</button></div>
            <div className="dashboard-summary">
              {roleCounts.map(item => <div className="dashboard-summary-row" key={item.role}><div><strong>{item.role}</strong><span>{item.active} active · {item.count} total</span></div><Users size={16} /></div>)}
              {users.length === 0 && <div className="empty-state"><Users size={24} /><strong>No team accounts yet</strong><span>Create role-based logins for your team.</span></div>}
            </div>
          </section>
        ) : role === 'Production Supervisor' ? (
          <section className="panel">
            <div className="panel-heading"><div><h2>Machine status</h2><p>{machines.length} configured in the workbook</p></div></div>
            <div className="machine-summary"><div><strong>{machineStatusCount('running')}</strong><span>Running</span></div><div><strong>{machineStatusCount('idle')}</strong><span>Idle</span></div><div><strong>{machineStatusCount('maintenance')}</strong><span>Maintenance</span></div></div>
            <div className="machine-list">{machines.slice(0, 4).map(machine => <div className="machine-row" key={machine.id}><div className="machine-icon"><Gauge size={17} /></div><div><strong>{machine.id}</strong><span>{machine.name || 'Machine'}</span></div><b className={machine.status.toLowerCase() === 'maintenance' ? 'warning' : ''}>{machine.status}</b></div>)}</div>
            {machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machine records</strong><span>Ask the Super Admin or Production Supervisor to configure machines.</span></div>}
          </section>
        ) : role === 'Machine Operator' ? (
          <section className="panel">
            <div className="panel-heading"><div><h2>Getting started</h2><p>Quick access to your daily work</p></div></div>
            <div className="dashboard-action-list"><button className="dashboard-action" onClick={() => setModule('Production')}><div><strong>Enter production</strong><span>Choose an available machine and active SKU</span></div><ArrowUpRight size={17} /></button></div>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-heading"><div><h2>Your workspace</h2><p>Quick access to your assigned production work</p></div></div>
            <div className="dashboard-action-list"><button className="dashboard-action" onClick={() => setModule('Production')}><div><strong>Enter production</strong><span>Choose an available machine and active SKU</span></div><ArrowUpRight size={17} /></button></div>
          </section>
        )}
      </div>

      <div className="bottom-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>{role === 'Production Supervisor' || role === 'Super Admin' ? 'Recent factory production' : 'My recent production'}</h2><p>{role === 'Production Supervisor' || role === 'Super Admin' ? 'Latest entries across the team' : 'Your latest saved entries'}</p></div></div>
          {recentProduction.length ? (
            <div className="dashboard-table"><table><thead><tr><th>Date</th><th>SKU</th><th>Actual</th><th>Rejected</th><th>Entered by</th></tr></thead><tbody>{recentProduction.map(row => <tr key={row.id}><td>{formatIndiaDate(row.date)}</td><td><code>{row.sku}</code></td><td>{row.actual}</td><td>{row.rejected}</td><td>{role === 'Production Supervisor' || role === 'Super Admin' ? row.createdBy || '—' : user.name}</td></tr>)}</tbody></table></div>
          ) : <div className="empty-state"><Factory size={24} /><strong>No production entries yet</strong><span>Saved entries will appear here.</span></div>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>{role === 'Super Admin' ? 'Admin controls' : role === 'Production Supervisor' ? 'Factory operations' : 'Your workspace'}</h2><p>{role === 'Super Admin' ? 'Full ERP access and user management' : role === 'Production Supervisor' ? 'Production, stitching, and quality work' : 'Tools available for your assigned role'}</p></div></div>
          <div className="dashboard-action-list">{shortcuts[role].map(item => {
            const Icon = moduleIcons[item.module]
            return <button className="dashboard-action" key={item.module} onClick={() => setModule(item.module)}><div className="dashboard-action-icon"><Icon size={17} /></div><div><strong>{item.module}</strong><span>{item.detail}</span></div><ArrowUpRight size={16} /></button>
          })}</div>
        </section>
      </div>
    </>
  )
}
