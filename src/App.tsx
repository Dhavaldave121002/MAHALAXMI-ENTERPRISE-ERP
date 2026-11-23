import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, ArrowUpRight, BarChart3,
  Boxes, Building2, CircleDollarSign, ClipboardCheck,
  Factory, FileSpreadsheet, Gauge, LayoutDashboard, Menu, Package,
  RotateCcw, Search, Settings, ShoppingCart, Target, Truck, UserCog, Users,
  Plus, Download, Upload, Bell, CheckCircle2, LogOut, LockKeyhole,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as XLSX from 'xlsx'
import './App.css'

type Module = 'Dashboard' | 'Factory' | 'Production' | 'Stitching' | 'Raw Material' | 'Finished Goods' |
  'Product Catalog' | 'Orders' | 'Inventory' |
  'Stock Movement' | 'Shipping & Delivery' | 'Returns & RTO' | 'E-commerce Workspace' | 'E-commerce Stock' |
  'E-commerce Orders' | 'Shipping Labels' | 'Daily Work Report' | 'Machines' | 'Quality Control' | 'Employees' |
  'Suppliers' | 'Accounts' | 'Reports' | 'Excel Management' | 'User Management' | 'Settings' | 'Audit Logs'

type Product = {
  id: string; sku: string; masterSku: string; name: string; category: string; mrp: number; stock: number;
  status: 'Active' | 'Draft'; size: string; color: string; packQuantity: number; isVariant: boolean
}

type MarketplaceListing = {
  id: string; platform: string; platformSku: string; productSku: string; masterSku: string;
  productName: string; status: string; createdBy?: string; createdAt?: string
}
type MarketplaceImportRows = {
  products: Record<string, unknown>[]
  variants: Record<string, unknown>[]
  listings: Record<string, unknown>[]
  issues: Record<string, unknown>[]
}
type MarketplaceImportResult = {
  added: { products: number; variants: number; listings: number }
  skipped: { products: number; variants: number; listings: number }
  backupName: string
}
type Production = { id: string; date: string; machine: string; block: string; sku: string; product: string; actual: number; rejected: number; createdBy?: string }
type Role = 'Super Admin' | 'Production Supervisor' | 'Store Manager' | 'Machine Operator' | 'E-commerce Executive'
type EcommercePlatform = 'AMAZON' | 'FLIPKART' | 'MEESHO' | 'SHOPIFY' | 'MYNTRA'
type UserAccount = { id: string; name: string; username: string; role: Role; active: boolean; platforms: EcommercePlatform[] }
type EcommerceListing = { id: string; platform: EcommercePlatform; platformSku: string; productSku: string; productName: string; availableStock: number; stockStatus: string; status: string }
type EcommerceMovement = { id: string; date: string; platform: EcommercePlatform; orderNumber: string; type: string; sku: string; quantity: number; reason: string }
type EcommerceLabel = { id: string; platform: EcommercePlatform; orderNumber: string; fileName: string; uploadedAt: string; uploadedBy: string }
type EcommerceExecutiveTarget = { executiveId: string; executiveName: string; platforms: EcommercePlatform[]; dailyTarget: number; monthlyTarget: number }
type EcommerceTargetData = { dailyTarget?: number; monthlyTarget?: number; executives?: EcommerceExecutiveTarget[] }
type EcommerceWorkspaceData = { platforms: EcommercePlatform[]; listings: EcommerceListing[]; movements: EcommerceMovement[]; labels: EcommerceLabel[]; targets: EcommerceTargetData }
type EcommerceDailyReport = { id: string; date: string; platform: EcommercePlatform; userName: string; completed: string; pending: string; issues: string; updatedAt: string }
type EcommercePlatformSummary = { platform: EcommercePlatform; dispatchedOrders: number; dispatchedUnits: number; returnedOrders: number; returnedUnits: number; damagedOrders: number; damagedUnits: number; dailyReports: number }
type Machine = { id: string; name: string; type: string; operator: string; status: string }
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
type WorkbookSnapshot = {
  products: Product[]
  marketplaceListings: MarketplaceListing[]
  machines: Machine[]
  production: Production[]
  rawMaterials: RawMaterial[]
  finishedGoods: FinishedGood[]
  stockMovements: StockMovement[]
  workbookMeta: { loaded: boolean; name: string; sheetCount: number }
}
type AuthStatus = 'checking' | 'ready' | 'unavailable'

const navSections: { label: string; items: Module[] }[] = [
  { label: 'MAIN', items: ['Dashboard', 'Factory', 'Production', 'Stitching', 'Quality Control'] as Module[] },
  { label: 'INVENTORY', items: ['Raw Material', 'Finished Goods', 'Inventory', 'Stock Movement', 'Machines'] },
  { label: 'CATALOG', items: ['Product Catalog'] },
  { label: 'SALES', items: ['Orders', 'Shipping & Delivery', 'Returns & RTO'] },
  { label: 'E-COMMERCE', items: ['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Daily Work Report'] },
  { label: 'MANAGEMENT', items: ['Employees', 'Suppliers', 'Accounts', 'Reports'] },
  { label: 'ADMIN', items: ['Excel Management', 'User Management', 'Settings', 'Audit Logs'] },
]
const marketplaces = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
const deliveryChannels = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
const ecommercePlatforms: EcommercePlatform[] = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
const deliveryPartnersByChannel: Record<string, string[]> = {
  AMAZON: ['AMAZON', 'AMAZON FLEX', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  FLIPKART: ['FLIPKART', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  MEESHO: ['MEESHO', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  SHOPIFY: ['SHOPIFY DELIVERY', 'SHREE ANJI COURIER', 'DELIVERY APP'],
  MYNTRA: ['MYNTRA DELIVERY', 'SHREE ANJI COURIER', 'DELIVERY APP'],
}
const deliveryMarketplacePlatforms: Record<string, string[]> = {
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
  Dashboard: LayoutDashboard, Production: Factory, Stitching: ClipboardCheck, 'Raw Material': Boxes,
  'Finished Goods': Package, 'Product Catalog': Archive, Orders: ShoppingCart, Inventory: Boxes,
  'Stock Movement': ArrowUpRight,
  'Shipping & Delivery': Truck, 'Returns & RTO': RotateCcw, Machines: Gauge,
  'Quality Control': ClipboardCheck, Employees: Users, Suppliers: Building2,
  Accounts: CircleDollarSign, Reports: BarChart3, 'Excel Management': FileSpreadsheet,
  'User Management': UserCog, Settings, 'Audit Logs': Archive, 'E-commerce Workspace': ShoppingCart,
  'E-commerce Stock': Boxes, 'E-commerce Orders': Truck, 'Shipping Labels': FileSpreadsheet,
  'Daily Work Report': ClipboardCheck,
  Factory: Factory,
} as Record<Module, typeof LayoutDashboard>

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function landingModuleForRole(role: Role): Module {
  return role === 'E-commerce Executive' ? 'E-commerce Workspace' : 'Dashboard'
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
    returnedOrders: uniqueOrders(returned),
    returnedUnits: returned.reduce((total, item) => total + item.quantity, 0),
    damagedOrders: uniqueOrders(damaged),
    damagedUnits: damaged.reduce((total, item) => total + item.quantity, 0),
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
    throw new Error('Secure login server is unavailable. Deploy the app with its Vercel API routes.')
  }
  let result: { error?: string } & Record<string, unknown>
  try {
    result = await response.json() as { error?: string } & Record<string, unknown>
  } catch {
    throw new Error('Secure login API is unavailable. Configure the Vercel server environment.')
  }
  if (!response.ok) throw new Error(result.error || 'The server request failed.')
  return result as T
}

function recordText(record: Record<string, unknown>, key: string) {
  return String(record[key] ?? '')
}

function recordNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key] ?? 0)
  return Number.isFinite(value) ? value : 0
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
    openingStock: recordNumber(record, 'Opening Stock'),
    closingStock: recordNumber(record, 'Closing Stock'),
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
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false)
  const [serverMessage, setServerMessage] = useState('')
  const [loginError, setLoginError] = useState('')
  const [setupMode, setSetupMode] = useState(false)
  const [users, setUsers] = useState<UserAccount[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([])
  const [production, setProduction] = useState<Production[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [audit, setAudit] = useState<string[]>(() => readStored('erp-audit', ['Workbook connection pending', 'System initialized']))
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [zeroStockInitializationBusy, setZeroStockInitializationBusy] = useState(false)
  const workbookRefreshInFlight = useRef<Promise<void> | null>(null)
  const workbookLastRefreshAt = useRef(0)
  const [workbookMeta, setWorkbookMeta] = useState({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })

  const applyWorkbookSnapshot = useCallback((data: WorkbookSnapshot) => {
    setProducts(data.products)
    setMarketplaceListings(data.marketplaceListings)
    setMachines(data.machines)
    setProduction(data.production)
    setRawMaterials(data.rawMaterials)
    setFinishedGoods(data.finishedGoods)
    setStockMovements(data.stockMovements)
    setWorkbookMeta(data.workbookMeta)
    workbookLastRefreshAt.current = Date.now()
  }, [])

  const refreshWorkbook = useCallback(async () => {
    if (workbookRefreshInFlight.current) return workbookRefreshInFlight.current
    const request = (async () => {
      const data = await apiFetch<WorkbookSnapshot>('/api/erp')
      applyWorkbookSnapshot(data)
    })()
    workbookRefreshInFlight.current = request
    try {
      await request
    } finally {
      if (workbookRefreshInFlight.current === request) workbookRefreshInFlight.current = null
    }
  }, [applyWorkbookSnapshot])

  useEffect(() => localStorage.setItem('erp-audit', JSON.stringify(audit)), [audit])
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
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
          needsAdminSetup?: boolean
          user?: UserAccount | null
          workbook?: WorkbookSnapshot
        }
        if (!statusResponse.ok || !statusData.configured) throw new Error(statusData.error || 'Google Sheets Apps Script is not configured.')
        if (!active) return
        setNeedsAdminSetup(Boolean(statusData.needsAdminSetup))
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
      setWorkbookMeta({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })
      return () => { active = false }
    }
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - workbookLastRefreshAt.current < 30_000) return
      void refreshWorkbook()
        .catch(error => {
          if (active) setToast(error instanceof Error ? error.message : 'Could not load the shared workbook')
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
  const log = (message: string) => setAudit(prev => [`${formatIndiaDateTime(new Date().toISOString())} — ${message}`, ...prev])

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
    log(`Added product ${result.product.sku}`)
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
    log(`Added SKU ${result.product.sku} to ${result.product.masterSku}`)
    notify('SKU saved to the shared workbook')
    return result.product
  }

  const saveMarketplaceListing = async (input: { platform: string; platformSku: string; productSku: string }) => {
    const result = await apiFetch<{ listing: MarketplaceListing }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addMarketplaceListing', ...input }),
    })
    setMarketplaceListings(prev => [result.listing, ...prev.filter(item => item.id !== result.listing.id)])
    workbookLastRefreshAt.current = Date.now()
    log(`Added ${result.listing.platform} listing SKU ${result.listing.platformSku}`)
    notify('Marketplace SKU saved to the shared workbook')
    return result.listing
  }

  const importMarketplaceWorkbook = async (rows: Pick<MarketplaceImportRows, 'products' | 'variants' | 'listings'>) => {
    const response = await apiFetch<{ result: MarketplaceImportResult }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'importMarketplaceWorkbook', ...rows }),
    })
    log(`Imported marketplace workbook: ${response.result.added.listings} listings added`)
    try {
      await refreshWorkbook()
    } catch {
      notify('Import saved, but the live workbook could not be refreshed. Reload the page before retrying.')
      throw new Error('Import succeeded, but the live workbook could not be refreshed. Reload the page before retrying.')
    }
    notify(`Import complete: ${response.result.added.listings} listings added; existing rows skipped.`)
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
    log(`Added ${result.machine.id}: ${result.machine.name}`)
    notify(`${result.machine.id} saved to the shared workbook`)
    return result.machine
  }

  const saveProduction = async (input: Omit<Production, 'id' | 'createdBy' | 'product'> & { product: string }) => {
    const result = await apiFetch<{ record: Production & { finishedGood?: FinishedGood; stockMovement?: StockMovement | null } }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProduction', ...input }),
    })
    setProduction(prev => [result.record, ...prev.filter(item => item.id !== result.record.id)])
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
    log(`Recorded production ${result.record.actual} units for ${result.record.sku}`)
    notify('Production entry saved to the shared workbook')
    return result.record
  }

  const saveRawMaterial = async (input: { sku: string; name: string; unit: string; supplier: string; openingStock: number; reorderLevel: number; unitCost: number }) => {
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
    log(`Added raw material ${result.material.sku}`)
    notify('Raw material saved to the shared workbook')
    return result.material
  }

  const applyStockMovement = async (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; referenceId: string; machineId: string; reason: string; salesChannel?: string; deliveryPartner?: string; linkToDispatch?: boolean }) => {
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
    log(`${input.type} · ${input.sku} · ${input.quantity}`)
    notify('Stock movement saved to the ledger')
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
      log(`Initialized ${result.updated} zero-stock SKUs to ${result.targetStock}`)
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
    log(`Archived ${sku}`)
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
    log(`Deleted unused item ${sku}`)
    notify('Unused item deleted')
  }

  const importExcel = async (file: File) => {
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Workbook must be 10 MB or smaller')
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose an .xlsx, .xls or .csv file')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
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
      log(`Validated ${unique.length} new catalog rows; ${duplicates.length} existing SKUs found`)
      notify(`Preview only: ${unique.length} new, ${duplicates.length} duplicates. Use Product Catalog to save shared records.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Workbook import failed')
    }
  }

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(products)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Product Master')
    XLSX.writeFile(workbook, 'Mahalaxmi-Product-Master.xlsx')
    log('Exported Product Master workbook')
  }

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username')).trim().toLowerCase()
    const password = String(form.get('password'))
    setLoginError('')
    try {
      const result = await apiFetch<{ user: UserAccount }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, scope: isAdminRoute ? 'admin' : 'team' }),
      })
      setSessionUser(result.user)
      setModule(landingModuleForRole(result.user.role))
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
      setSessionUser(null)
      setUsers([])
      setModule('Dashboard')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not log out from the server')
    }
  }

  if (!sessionUser) {
    const createOwner = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const name = String(form.get('name')).trim()
      const username = String(form.get('username')).trim().toLowerCase()
      const password = String(form.get('password'))
      const confirmPassword = String(form.get('confirmPassword'))
      if (password.length < 10) {
        setLoginError('Password must be at least 10 characters')
        return
      }
      if (password !== confirmPassword) {
        setLoginError('Passwords do not match')
        return
      }
      if (!name || !username) {
        setLoginError('Name and username are required')
        return
      }
      setLoginError('')
      try {
        const result = await apiFetch<{ user: UserAccount }>('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, password }),
        })
        setSessionUser(result.user)
        setNeedsAdminSetup(false)
        setSetupMode(false)
        setModule('Dashboard')
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : 'Admin account could not be created')
      }
    }

    if (authStatus === 'checking') {
      return <main className="login-page"><section className="login-card"><div className="login-brand"><div className="brand-mark">M</div><div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div></div><div className="login-heading"><p>SECURE LOGIN</p><h1>Checking account setup…</h1></div></section></main>
    }

    if (authStatus === 'ready' && needsAdminSetup && setupMode) {
      return (
        <main className="login-page">
          <section className="login-card">
            <div className="login-brand"><div className="brand-mark">M</div><div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div></div>
            <div className="login-heading"><p>FIRST-TIME SETUP</p><h1>Create Admin ID &amp; Password</h1><span className="login-description">This creates the single Super Admin account in the connected workbook.</span></div>
            <form onSubmit={createOwner}>
              <label>Full name<input name="name" required placeholder="Owner name" /></label>
              <label>Admin login ID<input name="username" required autoComplete="username" placeholder="Choose your login ID" /></label>
              <label>Set password<input name="password" type="password" required minLength={10} autoComplete="new-password" placeholder="Minimum 10 characters" /></label>
              <label>Confirm password<input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" placeholder="Enter password again" /></label>
              {loginError && <div className="login-error">{loginError}</div>}
              <button className="primary wide" type="submit">Create Admin Login</button>
            </form>
            <button className="setup-back" type="button" onClick={() => { setSetupMode(false); setLoginError('') }}>Back to login</button>
          </section>
        </main>
      )
    }

    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-brand"><div className="brand-mark">M</div><div><strong>Mahalaxmi Enterprise</strong><span>ENTERPRISE ERP</span></div></div>
          <div className="login-heading"><p>{isAdminRoute ? 'ADMIN LOGIN' : 'TEAM LOGIN'}</p><h1>{isAdminRoute ? 'Super Admin sign in' : 'Sign in to your workspace'}</h1><span className="login-description">{isAdminRoute ? 'Use the single Super Admin ID and password to open Admin controls.' : 'Admin-created supervisors and staff use their own login ID and password here. Your assigned role opens the right workspace.'}</span></div>
          <form onSubmit={login}>
            <label>Login ID<input name="username" autoComplete="username" required placeholder="Enter your login ID" /></label>
            <label>Password<div className="password-field"><LockKeyhole size={16} /><input name="password" type="password" autoComplete="current-password" required placeholder="Enter password" /></div></label>
            {loginError && <div className="login-error">{loginError}</div>}
            {authStatus === 'unavailable' && <div className="login-error">{serverMessage}</div>}
            <button className="primary wide" type="submit" disabled={authStatus !== 'ready'}>Sign in</button>
          </form>
          {authStatus === 'ready' && needsAdminSetup && <div className="first-admin-setup"><span>First time here? Create the one-time Admin account to begin.</span><button type="button" onClick={() => { setSetupMode(true); setLoginError('') }}>Create first Admin</button></div>}
          {authStatus === 'ready' && <a className="login-route-link" href={isAdminRoute ? '/' : '/admin'}>{isAdminRoute ? 'Team login' : 'Admin login'}</a>}
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
  const adminModules = navSections.flatMap(section => section.items)
  const adminOnlyModules: Module[] = ['Employees', 'Suppliers', 'Accounts', 'Reports', 'User Management', 'Settings', 'Audit Logs']
  const roleModules: Record<Role, Module[]> = {
    'Super Admin': adminModules.filter(item => item !== 'Daily Work Report'),
    'Production Supervisor': adminModules.filter(item => !adminOnlyModules.includes(item) && item !== 'Daily Work Report'),
    'Machine Operator': ['Dashboard', 'Production'],
    'Store Manager': ['Dashboard'],
    'E-commerce Executive': ['E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Daily Work Report'],
  }
  return (
    <div className={sidebarOpen ? 'app-shell' : 'app-shell sidebar-collapsed'}>
      <aside className={sidebarOpen ? 'sidebar' : 'sidebar collapsed'}>
        <div className="brand">
          <div className="brand-mark">M</div>
          {sidebarOpen && <div><strong>Mahalaxmi</strong><span>ENTERPRISE ERP</span></div>}
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
          {module === 'Dashboard' ? (
            <DashboardView
              role={sessionUser.role}
              user={sessionUser}
              users={users}
              products={products}
              production={production}
              today={indiaDateKey(clock)}
              machines={machines}
              productionChart={productionChart}
              setModule={setModule}
              exportExcel={exportExcel}
            />
          ) : (
            <ModuleView module={module} clock={clock} products={products} marketplaceListings={marketplaceListings} production={production} rawMaterials={rawMaterials} finishedGoods={finishedGoods} stockMovements={stockMovements} audit={audit} workbookMeta={workbookMeta}
              search={search} setSearch={setSearch} exportExcel={exportExcel} saveProduct={saveProduct} saveVariant={saveVariant} saveMarketplaceListing={saveMarketplaceListing} importMarketplaceWorkbook={importMarketplaceWorkbook}
              saveProduction={saveProduction} saveMachine={saveMachine} saveRawMaterial={saveRawMaterial} applyStockMovement={applyStockMovement}
              initializeZeroFinishedStock={initializeZeroFinishedStock} zeroStockInitializationBusy={zeroStockInitializationBusy}
              archiveStockItem={archiveStockItem} deleteUnusedStockItem={deleteUnusedStockItem} fileRef={fileRef} importExcel={importExcel} notify={notify} log={log} setModule={setModule}
              machines={machines} users={users} setUsers={setUsers} sessionUser={sessionUser}
              allowedModules={roleModules[sessionUser.role]} />
          )}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  )
}

function ModuleView(props: {
  module: Module; clock: Date; products: Product[]; marketplaceListings: MarketplaceListing[]; production: Production[];
  rawMaterials: RawMaterial[]; finishedGoods: FinishedGood[]; stockMovements: StockMovement[]; audit: string[]; search: string;
  workbookMeta: { loaded: boolean; name: string; sheetCount: number };
  setSearch: (v: string) => void; exportExcel: () => void;
  saveProduct: (input: { sku: string; name: string; category: string; mrp: number }) => Promise<Product>;
  saveVariant: (input: { masterSku: string; sku: string; size: string; color: string; packQuantity: number; mrp?: number; sellingPrice?: number }) => Promise<Product>;
  saveMarketplaceListing: (input: { platform: string; platformSku: string; productSku: string }) => Promise<MarketplaceListing>;
  importMarketplaceWorkbook: (rows: Pick<MarketplaceImportRows, 'products' | 'variants' | 'listings'>) => Promise<MarketplaceImportResult>;
  saveProduction: (input: { date: string; machine: string; block: string; sku: string; product: string; actual: number; rejected: number }) => Promise<Production>;
  saveRawMaterial: (input: { sku: string; name: string; unit: string; supplier: string; openingStock: number; reorderLevel: number; unitCost: number }) => Promise<RawMaterial>;
  applyStockMovement: (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; referenceId: string; machineId: string; reason: string; salesChannel?: string; deliveryPartner?: string; linkToDispatch?: boolean }) => Promise<void>;
  initializeZeroFinishedStock: () => Promise<void>; zeroStockInitializationBusy: boolean;
  archiveStockItem: (kind: 'raw' | 'finished', sku: string) => Promise<void>;
  deleteUnusedStockItem: (kind: 'raw' | 'finished', sku: string) => Promise<void>;
  saveMachine: (input: Omit<Machine, 'id'>) => Promise<Machine>;
  fileRef: React.RefObject<HTMLInputElement | null>; importExcel: (f: File) => void;
  notify: (v: string) => void; log: (v: string) => void
  setModule: (v: Module) => void
  machines: Machine[];
  users: UserAccount[]; setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>; sessionUser: UserAccount
  allowedModules: Module[]
}) {
  const { module, clock, products, marketplaceListings, production, rawMaterials, finishedGoods, stockMovements, audit, workbookMeta, search, setSearch, exportExcel, saveProduct, saveVariant, saveMarketplaceListing, importMarketplaceWorkbook, saveProduction, saveRawMaterial, applyStockMovement, initializeZeroFinishedStock, zeroStockInitializationBusy, archiveStockItem, deleteUnusedStockItem, saveMachine, fileRef, importExcel, notify, log, setModule, machines, users, setUsers, sessionUser, allowedModules } = props
  const [catalogFormOpen, setCatalogFormOpen] = useState<'product' | 'variant' | 'listing' | null>(null)
  const [selectedCatalogMasterSku, setSelectedCatalogMasterSku] = useState('')
  const [stockFormOpen, setStockFormOpen] = useState(false)
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  const [newUserRole, setNewUserRole] = useState<Role>('Production Supervisor')
  const [ecommerceReports, setEcommerceReports] = useState<EcommerceDailyReport[]>([])
  const [ecommerceReportsError, setEcommerceReportsError] = useState('')
  const [ecommerceReportsLoading, setEcommerceReportsLoading] = useState(false)
  const [catalogListingFilter, setCatalogListingFilter] = useState('')
  const [catalogProductSearch, setCatalogProductSearch] = useState('')
  const [catalogPlatformSearch, setCatalogPlatformSearch] = useState('')
  const [catalogPlatform, setCatalogPlatform] = useState('')
  const [deliveryChannel, setDeliveryChannel] = useState('')
  const [deliveryPartnerChoice, setDeliveryPartnerChoice] = useState('')
  const [customDeliveryPartner, setCustomDeliveryPartner] = useState('')
  const [deliverySku, setDeliverySku] = useState('')
  const [returnChannel, setReturnChannel] = useState('')
  const [returnDispatchId, setReturnDispatchId] = useState('')

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
  const [productionDate, setProductionDate] = useState(() => indiaDateKey(clock))
  const [productionBlockChoice, setProductionBlockChoice] = useState('')
  const [marketplaceImportPreview, setMarketplaceImportPreview] = useState<MarketplaceImportRows | null>(null)
  const [marketplaceImportFileName, setMarketplaceImportFileName] = useState('')
  const [marketplaceImportError, setMarketplaceImportError] = useState('')
  const [marketplaceImportBusy, setMarketplaceImportBusy] = useState(false)
  const [marketplaceImportResult, setMarketplaceImportResult] = useState<MarketplaceImportResult | null>(null)
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
      if (products.length > 5000 || variants.length > 10000 || listings.length > 10000) {
        throw new Error('This workbook exceeds the safe import row limits.')
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
      setMarketplaceImportFileName(file.name)
      setMarketplaceImportPreview({ products, variants, listings, issues })
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
        listings: marketplaceImportPreview.listings,
      })
      setMarketplaceImportResult(result)
      setMarketplaceImportPreview(null)
    } catch (error) {
      setMarketplaceImportError(error instanceof Error ? error.message : 'Marketplace workbook import failed.')
    } finally {
      setMarketplaceImportBusy(false)
    }
  }
  const importPlatformCounts = marketplaceImportPreview?.listings.reduce<Record<string, number>>((counts, row) => {
    const platform = String(row.Platform || 'Unknown')
    counts[platform] = (counts[platform] || 0) + 1
    return counts
  }, {})
  if (!allowedModules.includes(module)) {
    return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Your account role cannot open this section.</span></div></section>
  }

  if (
    module === 'E-commerce Workspace' || module === 'E-commerce Stock' ||
    module === 'E-commerce Orders' || module === 'Shipping Labels' ||
    module === 'Daily Work Report'
  ) {
    return <EcommerceWorkspace user={sessionUser} module={module} setModule={setModule} />
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
        supplier: String(form.get('supplier')),
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
        referenceId: String(form.get('referenceId') || ''),
        machineId: String(form.get('machineId') || ''),
        reason: String(form.get('reason') || ''),
      })
      formElement.reset()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Stock movement could not be saved')
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
    const itemOptions = kind === 'raw'
      ? rawMaterials.filter(item => item.status.toLowerCase() !== 'archived').map(item => ({ sku: item.sku, name: item.name, unit: item.unit }))
      : products.filter(item => item.status === 'Active').map(item => ({ sku: item.sku, name: item.name, unit: 'units' }))
    const defaultSku = itemOptions[0]?.sku || ''
    return (
      <form className="panel form-card stock-form" onSubmit={submitStockMovement}>
        <div className="panel-heading"><div><h2>{title}</h2><p>Each saved entry records the balance change in the stock ledger.</p></div></div>
        <input type="hidden" name="kind" value={kind} />
        <div className="field-grid">
          <label>Stock item<select name="sku" required defaultValue={defaultSku} disabled={!canManageInventory || itemOptions.length === 0}><option value="">Select item</option>{itemOptions.map(item => <option key={item.sku} value={item.sku}>{item.name} · {item.sku}</option>)}</select></label>
          <label>Movement type<select name="type" required defaultValue={defaultType}>{typeOptions.map(type => <option key={type}>{type}</option>)}</select></label>
          <label>Quantity<input name="quantity" type="number" min="0.001" step={kind === 'raw' ? '0.001' : '1'} required /></label>
          {kind === 'raw' && <label>Unit cost (purchase inward only)<input name="unitCost" type="number" min="0" step="0.01" placeholder="Leave blank to keep average cost" /></label>}
          <label>Reference ID<input name="referenceId" maxLength={100} placeholder={kind === 'raw' ? 'Purchase / issue reference' : 'Order / return / production reference'} /></label>
          <label>{kind === 'raw' ? 'Machine ID (optional)' : 'Machine ID (optional)'}<input name="machineId" maxLength={100} placeholder="Machine reference" /></label>
          <label className="stock-reason">Reason<input name="reason" maxLength={300} placeholder="Reason / notes" /></label>
        </div>
        <button className="primary wide" type="submit" disabled={!canManageInventory || itemOptions.length === 0}><Plus size={17} /> Post movement</button>
        {!canManageInventory && <p className="local-storage-note">This role can view stock but cannot post movements.</p>}
        {canManageInventory && itemOptions.length === 0 && <p className="local-storage-note">{kind === 'raw' ? 'Add a raw material before posting a movement.' : 'Add a product or SKU before posting finished-goods stock.'}</p>}
      </form>
    )
  }

  if (module === 'Raw Material') {
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY · RAW MATERIAL</p><h1>Raw Materials</h1></div><div className="heading-actions">
          {canManageInventory && <><button className="secondary" onClick={() => setStockFormOpen(open => !open)}><Plus size={16} /> Stock movement</button><button className="primary" onClick={() => setMaterialFormOpen(open => !open)}><Plus size={16} /> Add material</button></>}
        </div></div>
        {materialFormOpen && canManageInventory && <form className="panel form-card" onSubmit={submitRawMaterial}>
          <div className="panel-heading"><div><h2>Add raw material</h2><p>Opening quantity and cost are written to the workbook and ledger.</p></div></div>
          <div className="field-grid">
            <label>Material SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. FABRIC-COTTON-01" /></label>
            <label>Material name<input name="name" required maxLength={180} placeholder="Material name" /></label>
            <label>Unit<input name="unit" required maxLength={40} placeholder="kg, meter, pcs..." /></label>
            <label>Supplier<input name="supplier" maxLength={180} placeholder="Supplier name" /></label>
            <label>Opening stock<input name="openingStock" type="number" min="0" step="0.001" required defaultValue="0" /></label>
            <label>Reorder level<input name="reorderLevel" type="number" min="0" step="0.001" required defaultValue="0" /></label>
            <label>Average unit cost<input name="unitCost" type="number" min="0" step="0.01" required defaultValue="0" /></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Save material</button>
        </form>}
        {stockFormOpen && canManageInventory && renderMovementForm('raw', 'Post raw-material movement', ['Purchase Inward', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Adjustment In', 'Adjustment Out'], 'Purchase Inward')}
        <div className="table-card entries-table inventory-table"><table><thead><tr><th>SKU</th><th>Material</th><th>Unit</th><th>Supplier</th><th>On hand</th><th>Reorder at</th><th>Stock value</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {rawMaterials.map(item => {
            const hasHistory = hasItemMovement('raw', item.sku)
            const low = item.closingStock <= item.reorderLevel
            return <tr key={item.sku}><td><code>{item.sku}</code></td><td>{item.name}</td><td>{item.unit || '—'}</td><td>{item.supplier || '—'}</td><td><b className={low ? 'stock-low' : 'stock-good'}>{item.closingStock.toLocaleString('en-IN')}</b></td><td>{item.reorderLevel.toLocaleString('en-IN')}</td><td>₹{item.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td><td><span className={`status ${item.status.toLowerCase() === 'active' ? 'active' : 'draft'}`}>{item.status}</span></td><td>{item.status.toLowerCase() === 'archived' ? '—' : item.closingStock === 0 && !hasHistory ? <button className="text-action danger" onClick={() => void confirmDeleteUnused('raw', item.sku)}>Delete unused</button> : item.closingStock === 0 ? <button className="text-action" onClick={() => void confirmArchive('raw', item.sku)}>Archive</button> : '—'}</td></tr>
          })}
        </tbody></table>
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
    return (
      <section>
        <div className="page-heading"><div><p>INVENTORY · FINISHED GOODS</p><h1>Finished Goods</h1></div><div className="heading-actions">{canManageInventory && <><button className="secondary" disabled={zeroStockInitializationBusy} onClick={() => void initializeZeroFinishedStock()}>{zeroStockInitializationBusy ? 'Initializing…' : 'Initialize zero-stock SKUs to 10,000'}</button><button className="primary" onClick={() => setStockFormOpen(open => !open)}><Plus size={16} /> Stock movement</button></>}</div></div>
        {stockFormOpen && canManageInventory && renderMovementForm('finished', 'Post finished-goods movement', ['Opening Stock', 'Dispatch', 'Return', 'Damage', 'Adjustment In', 'Adjustment Out', 'Reserve', 'Release Reservation'], 'Opening Stock')}
        <div className="table-card entries-table inventory-table"><table><thead><tr><th>SKU</th><th>Product</th><th>Produced</th><th>Approved</th><th>Dispatched</th><th>Returned</th><th>Damaged</th><th>Reserved</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {finishedRows.map(({ product, item }) => {
            const available = item?.availableStock || 0
            const hasHistory = hasItemMovement('finished', product.sku)
            return <tr key={product.sku}><td><code>{product.sku}</code></td><td>{product.name}</td><td>{item?.productionReceived || 0}</td><td>{item?.qualityApproved || 0}</td><td>{item?.dispatchedStock || 0}</td><td>{item?.returnedStock || 0}</td><td>{item?.damagedStock || 0}</td><td>{item?.reservedStock || 0}</td><td><b className={available < 10 ? 'stock-low' : 'stock-good'}>{available}</b></td><td><span className={`status ${item?.status.toLowerCase() === 'archived' ? 'draft' : 'active'}`}>{item?.status || 'Not initialized'}</span></td><td>{!item || item.status.toLowerCase() === 'archived' ? '—' : available === 0 && !hasHistory ? <button className="text-action danger" onClick={() => void confirmDeleteUnused('finished', product.sku)}>Delete unused</button> : available === 0 ? <button className="text-action" onClick={() => void confirmArchive('finished', product.sku)}>Archive</button> : '—'}</td></tr>
          })}
        </tbody></table>
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
        <div className="table-card entries-table inventory-table"><MovementTable movements={filteredMovements} /></div>
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
    const deliveryProducts = products.filter(product =>
      product.status === 'Active' &&
      channelProductSkus.has(product.sku.toLowerCase()) &&
      (product.isVariant || !deliveryVariantMasters.has(product.sku.toLowerCase()))
    )
    const selectedDeliveryProduct = deliveryProducts.find(product => product.sku === deliverySku)
    const deliveryPartnerReady = Boolean(deliveryPartnerChoice && (deliveryPartnerChoice !== 'Other' || customDeliveryPartner.trim()))
    return (
      <section>
        <div className="page-heading"><div><p>FINISHED GOODS · {isShipping ? 'DISPATCH' : 'RETURNS'}</p><h1>{module}</h1></div></div>
        {isShipping ? <form className="panel form-card delivery-form" onSubmit={submitDelivery}>
          <div className="panel-heading"><div><h2>Create delivery</h2><p>Select the sales channel, courier, and SKU. Dispatches require available stock; initialize eligible zero-stock SKUs from Finished Goods before shipping.</p></div></div>
          <div className="field-grid">
            <label>Platform / channel<select name="salesChannel" required value={deliveryChannel} onChange={event => {
              setDeliveryChannel(event.target.value)
              setDeliveryPartnerChoice('')
              setCustomDeliveryPartner('')
              setDeliverySku('')
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
            <label>Product SKU<select name="sku" required value={deliverySku} onChange={event => setDeliverySku(event.target.value)} disabled={deliveryProducts.length === 0}>
              <option value="">{deliveryProducts.length ? 'Select platform SKU' : 'No active SKUs for this platform'}</option>
              {deliveryProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku} · Available {product.stock}</option>)}
            </select></label>
            {selectedDeliveryProduct && <div className="delivery-stock"><span>Available stock</span><strong>{selectedDeliveryProduct.stock.toLocaleString('en-IN')} units</strong></div>}
            <label>Quantity<input name="quantity" type="number" min="1" step="1" required /></label>
            <label>Order / shipment reference<input name="referenceId" maxLength={100} required placeholder="Marketplace order number (required for returns)" /></label>
            <label className="delivery-note">Delivery notes<input name="reason" maxLength={300} placeholder="Optional delivery note" /></label>
            </>}
          </div>
          {deliveryPartnerReady && <button className="primary wide" type="submit" disabled={!canManageInventory || deliveryProducts.length === 0}>Save delivery and dispatch stock</button>}
          {!canManageInventory && <p className="local-storage-note">Only the Super Admin or Production Supervisor can record deliveries.</p>}
          {canManageInventory && deliveryPartnerReady && deliveryProducts.length === 0 && <p className="local-storage-note">Add an active {deliveryChannel} marketplace listing in Product Catalog before recording a delivery for this platform.</p>}
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
            <button className="primary wide" type="submit" disabled={!canManageInventory || !selectedReturnDispatch}>Save order return / damage</button>
            {!canManageInventory && <p className="local-storage-note">Only the Super Admin or Production Supervisor can record returns or damage.</p>}
            {canManageInventory && returnChannel && platformReturnDispatches.length === 0 && <p className="local-storage-note">No returnable shipped orders are recorded for {returnChannel}. Older deliveries without an order number can still be entered manually below.</p>}
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
    const exportMachines = () => {
      const rows = machines.map(({ id, name, type, operator, status }) => ({ id, name, type, operator, status }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Machines')
      XLSX.writeFile(workbook, `Mahalaxmi-Machines-${indiaDateKey()}.xlsx`)
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
      if (!name) return
      try {
        await saveMachine({
          name,
          type: String(form.get('type')),
          operator: String(form.get('operator')),
          status: String(form.get('status')),
        })
        formElement.reset()
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
            <label>Machine type<input name="type" placeholder="Type" /></label>
            <label>Operator<input name="operator" placeholder="Operator name" /></label>
            <label>Status<select name="status"><option>Idle</option><option>Running</option><option>Maintenance</option></select></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Add machine</button>
        </form>}
        <div className="table-card entries-table"><table><thead><tr><th>Machine ID</th><th>Name</th><th>Type</th><th>Operator</th><th>Status</th></tr></thead><tbody>{machines.map(machine => <tr key={machine.id}><td><code>{machine.id}</code></td><td>{machine.name || '—'}</td><td>{machine.type || '—'}</td><td>{machine.operator || '—'}</td><td><span className="status active">{machine.status}</span></td></tr>)}</tbody></table>{machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machines configured</strong><span>The Super Admin or Production Supervisor can add machines.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Product Catalog') {
    const masterProducts = products.filter(product => !product.isVariant)
    const catalogSearch = catalogProductSearch.trim().toLowerCase()
    const filteredCatalogProducts = catalogSearch
      ? masterProducts.filter(product =>
        `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(catalogSearch)
      )
      : masterProducts
    const platformSearch = catalogPlatformSearch.trim().toLowerCase()
    const filteredPlatforms = marketplaces.filter(platform => platform.toLowerCase().includes(platformSearch))
    const selectedProduct = masterProducts.find(product => product.sku === selectedCatalogMasterSku)
    const selectedVariants = selectedProduct
      ? products.filter(product => product.isVariant && product.masterSku.toLowerCase() === selectedProduct.sku.toLowerCase())
      : []
    const selectedSkuProducts = selectedProduct ? [selectedProduct, ...selectedVariants] : []
    const selectedSkuKeys = new Set(selectedSkuProducts.map(product => product.sku.toLowerCase()))
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
    const skuListingCount = (product: Product) => selectedListings.filter(listing =>
      product.isVariant
        ? listing.productSku.toLowerCase() === product.sku.toLowerCase()
        : listing.masterSku.toLowerCase() === product.sku.toLowerCase() || listing.productSku.toLowerCase() === product.sku.toLowerCase()
    ).length
    return (
      <section className="catalog-page">
        <div className="page-heading">
          <div><p>CATALOG</p><h1>Product Catalog</h1><span className="catalog-intro">Select a product to see its master SKU, variants, and marketplace SKUs together.</span></div>
          <div className="heading-actions">
            <button className="secondary" disabled={marketplaceImportBusy} onClick={() => marketplaceImportFileRef.current?.click()}><Upload size={17} /> Import workbook</button>
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
          <div className="panel-heading"><div><h2>1. Select product</h2><p>Its saved SKUs and marketplace listings will appear below.</p></div></div>
          <div className="catalog-picker-body">
            <div className="catalog-product-controls">
              <label>Search product
                <div className="catalog-product-search">
                  <Search size={15} />
                  <input
                    value={catalogProductSearch}
                    onChange={event => setCatalogProductSearch(event.target.value)}
                    placeholder="Search product name or SKU"
                    disabled={masterProducts.length === 0}
                  />
                  {catalogProductSearch && <button type="button" aria-label="Clear product search" onClick={() => setCatalogProductSearch('')}>×</button>}
                </div>
              </label>
              <label>Product<select aria-label="Select catalog product" value={selectedCatalogMasterSku} onChange={event => {
                setSelectedCatalogMasterSku(event.target.value)
                setCatalogFormOpen(null)
                setCatalogListingFilter('')
              }} disabled={filteredCatalogProducts.length === 0}>
                <option value="">{masterProducts.length ? (filteredCatalogProducts.length ? 'Select a product' : 'No matching products') : 'No products yet'}</option>
                {filteredCatalogProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}{product.status === 'Draft' ? ' · Draft' : ''}</option>)}
              </select></label>
              {catalogSearch && <span className="catalog-search-count">{filteredCatalogProducts.length} matching product{filteredCatalogProducts.length === 1 ? '' : 's'}</span>}
            </div>
            {selectedProduct
              ? <div className="catalog-product-summary">
                <div><span>Master SKU</span><strong><code>{selectedProduct.sku}</code></strong></div>
                <div><span>Category</span><strong>{selectedProduct.category || '—'}</strong></div>
                <div><span>Variants</span><strong>{selectedVariants.length}</strong></div>
                <div><span>Marketplace SKUs</span><strong>{selectedListings.length}</strong></div>
              </div>
              : <p className="marketplace-selection-note">{masterProducts.length ? 'Choose a product to view its SKUs.' : 'Add a product to start; the saved product will be selected automatically.'}</p>}
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
        {catalogFormOpen === 'listing' && selectedProduct && <form className="panel form-card" onSubmit={submitMarketplaceListing}>
          <div className="panel-heading"><div><h2>Add marketplace SKU</h2><p>Link a marketplace SKU to this product or one of its variants.</p></div></div>
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
            <label>Product SKU<select name="productSku" required defaultValue=""><option value="" disabled>Select internal SKU</option>{selectedSkuProducts.map(product => <option key={product.sku} value={product.sku}>{product.isVariant ? 'Variant' : 'Master'} · {product.name} · {product.sku}</option>)}</select></label>
            <label>Marketplace SKU<input name="platformSku" required maxLength={100} autoComplete="off" placeholder="Enter SKU used on this marketplace" /></label>
          </div>
          <button className="primary wide" type="submit" disabled={selectedProduct.status !== 'Active'}><Plus size={17} /> Save marketplace SKU</button>
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
            <div><strong>{marketplaceImportPreview.listings.length}</strong><span>Marketplace listings</span></div>
          </div>
          <p className="marketplace-selection-note">
            Platforms: {Object.entries(importPlatformCounts || {}).map(([platform, count]) => `${platform} ${count}`).join(' · ')}.
            {' '}Workbook issues flagged: {marketplaceImportPreview.issues.length}.
          </p>
          <p className="local-storage-note">This imports missing rows into the existing connected Google Sheet. Existing SKUs/listings are skipped; nothing is deleted. Stock, machines, and user accounts are not imported. If rows need adding, a Drive backup is created before changes.</p>
          {marketplaceImportPreview.issues.length > 0 && <details className="marketplace-import-issues">
            <summary>Review {marketplaceImportPreview.issues.length} source issues</summary>
            <ul>{marketplaceImportPreview.issues.slice(0, 20).map((issue, index) => (
              <li key={`${String(issue.Source || 'source')}-${String(issue['Source Row'] || index)}-${index}`}>
                {String(issue.Source || 'Source')} row {String(issue['Source Row'] || '—')}: {String(issue.Issue || 'Needs review')}
              </li>
            ))}</ul>
            {marketplaceImportPreview.issues.length > 20 && <span>Only the first 20 issues are shown.</span>}
          </details>}
          <button className="primary wide" type="button" disabled={marketplaceImportBusy} onClick={() => void applyMarketplaceImport()}>
            {marketplaceImportBusy ? 'Importing…' : `Back up and import ${marketplaceImportPreview.listings.length} listings to the existing Google Sheet`}
          </button>
        </div>}
        {marketplaceImportResult && <div className="panel marketplace-import-panel">
          <div className="panel-heading"><div><h2>Import complete</h2><p>Rows were merged into the existing connected Google Sheet.</p></div></div>
          <p className="marketplace-selection-note">
            Added: {marketplaceImportResult.added.products} products, {marketplaceImportResult.added.variants} variants, {marketplaceImportResult.added.listings} listings.
            {' '}Skipped as already present: {marketplaceImportResult.skipped.products} products, {marketplaceImportResult.skipped.variants} variants, {marketplaceImportResult.skipped.listings} listings.
          </p>
          {marketplaceImportResult.backupName && <p className="marketplace-selection-note">Backup created in Drive: <code>{marketplaceImportResult.backupName}</code></p>}
        </div>}
        {selectedProduct ? <>
        <div className="panel catalog-section">
          <div className="panel-heading">
            <div><h2>2. Product SKUs</h2><p>Master SKU and all variants for {selectedProduct.name}.</p></div>
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
            <table><thead><tr><th>SKU type</th><th>Product / variant</th><th>Internal SKU</th><th>Size / color</th><th>MRP</th><th>Stock</th><th>Marketplace SKUs</th><th>Status</th></tr></thead><tbody>
              {selectedSkuProducts.map(product => (
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
              ))}
            </tbody></table>
            {selectedSkuProducts.length === 0 && <div className="empty-state"><Package size={28} /><strong>No SKUs for this product</strong><span>Add a variant to make it selectable in production.</span></div>}
          </div>
        </div>
        <div className="panel catalog-section">
          <div className="panel-heading">
            <div><h2>3. Marketplace listings</h2><p>{selectedListings.length} marketplace SKU(s) linked to this product.</p></div>
            <label className="marketplace-filter">Platform
              <select aria-label="Filter marketplace listings by platform" value={catalogListingFilter} onChange={event => setCatalogListingFilter(event.target.value)}>
              <option value="">All platforms ({selectedListings.length})</option>
              {marketplaces.map(platform => <option key={platform} value={platform}>{platform} ({selectedListings.filter(listing => listing.platform.toLowerCase() === platform.toLowerCase()).length})</option>)}
              </select>
            </label>
          </div>
          <div className="table-card">
            <table><thead><tr><th>Platform</th><th>Marketplace SKU</th><th>Product</th><th>Internal SKU</th><th>Status</th></tr></thead><tbody>
              {visibleListings.map(listing => <tr key={listing.id}><td><b>{listing.platform}</b></td><td><code>{listing.platformSku}</code></td><td>{listing.productName}</td><td><code>{listing.productSku}</code></td><td><span className="status active">{listing.status}</span></td></tr>)}
            </tbody></table>
            {visibleListings.length === 0 && <div className="empty-state"><ShoppingCart size={28} /><strong>{selectedListings.length ? 'No matching listings' : 'No marketplace SKUs yet'}</strong><span>{selectedListings.length ? 'Try another platform or search term.' : 'Add a marketplace SKU to link this product to a sales channel.'}</span></div>}
          </div>
        </div>
        </> : <div className="panel catalog-empty-state"><Package size={28} /><strong>Select a product to continue</strong><span>Choose an existing master product above, or add one to create its SKUs and marketplace listings.</span></div>}
        <div className="toolbar catalog-export-toolbar">
          <div className="table-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search catalog" /></div>
          <button className="secondary" onClick={exportExcel}><Download size={16} /> Export</button>
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
    const exportDailyReport = () => {
      const sheet = XLSX.utils.json_to_sheet(visibleProduction)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Daily Production')
      const dailyArchive = readStored<Production[]>('erp-daily-production', [])
      const archivedIds = new Set(dailyArchive.map(row => row.id))
      localStorage.setItem('erp-daily-production', JSON.stringify([...dailyArchive, ...visibleProduction.filter(row => !archivedIds.has(row.id))]))
      log(`Exported daily production report for ${today}: ${visibleProduction.length} records`)
      XLSX.writeFile(workbook, `Mahalaxmi-Daily-Production-${today}.xlsx`)
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
        Rejected: monthlyRows.reduce((sum, row) => sum + row.rejected, 0),
        PreparedFor: sessionUser.role === 'Super Admin' || sessionUser.role === 'Production Supervisor' ? 'All users' : sessionUser.name,
      }]), 'Summary')
      log(`Generated monthly production workbook for ${month}`)
      XLSX.writeFile(workbook, `Mahalaxmi-Production-${month}.xlsx`)
      notify(`New monthly workbook downloaded: ${month}`)
    }
    return (
      <section>
        <div className="page-heading"><div><p>FACTORY · {formatIndiaDate(today)}</p><h1>Production</h1></div><div className="heading-actions"><button className="secondary" onClick={exportDailyReport}><Download size={17} /> Daily Excel</button><button className="primary" onClick={exportMonthlyReport}><FileSpreadsheet size={17} /> Monthly Excel</button></div></div>
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
              <label>Rejected quantity<input name="rejected" type="number" min="0" step="1" defaultValue="0" required /></label>
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
        <div className="table-card entries-table"><table><thead><tr><th>Date</th><th>Block</th><th>Machine</th><th>Product</th><th>SKU</th><th>Actual</th><th>Rejected</th><th>Entered by</th></tr></thead><tbody>{visibleProduction.map(row => <tr key={row.id}><td>{formatIndiaDate(row.date)}</td><td>{row.block || '—'}</td><td>{row.machine}</td><td>{row.product}</td><td><code>{row.sku}</code></td><td>{row.actual}</td><td>{row.rejected}</td><td>{row.createdBy || '—'}</td></tr>)}</tbody></table>{visibleProduction.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No production entries today</strong><span>Records will appear after saving.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Excel Management') {
    return (
      <section>
        <div className="page-heading"><div><p>DATA CONTROL</p><h1>Excel Management</h1></div><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17} /> Preview Excel</button></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} />
        <div className="excel-status-grid">
          <div className="panel provider-card"><div className="provider-icon"><FileSpreadsheet size={24} /></div><div><span>Master workbook</span><strong>{workbookMeta.name}</strong></div><b className={workbookMeta.loaded ? 'status active' : 'status pending'}>{workbookMeta.loaded ? 'Connected' : 'Not loaded'}</b></div>
          <div className="panel sync-card"><span>Workbook structure</span><strong>{workbookMeta.sheetCount || 17} sheets detected</strong><small>{workbookMeta.loaded ? 'Shared Google Sheet is active.' : 'Sign in after deploying Apps Script and configuring Vercel.'}</small></div>
        </div>
        <div className="panel setup-card">
          <div className="panel-heading"><div><h2>Shared workbook</h2><p>Catalog, machine, and production changes are backed up and saved to Google Sheets.</p></div></div>
          <p className="local-storage-note">Excel uploads here are preview-only. To import the prepared combined marketplace workbook into the existing Google Sheet, open Product Catalog → Import workbook.</p>
        </div>
        <div className="panel table-card excel-table"><div className="panel-heading"><div><h2>Import help</h2><p>Marketplace workbook workflow</p></div></div><div className="empty-state"><FileSpreadsheet size={28} /><strong>Import from Product Catalog</strong><span>Use Product Catalog → Import workbook to preview and add missing catalog rows to the connected Sheet.</span></div></div>
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
      const safeRows = users.map(({ id, name, username, role, active, platforms }) => ({ ID: id, Name: name, Username: username, Role: role, Platforms: platforms.join(', '), Status: active ? 'Active' : 'Inactive' }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeRows), 'User Accounts')
      XLSX.writeFile(workbook, `Mahalaxmi-Users-${indiaDateKey()}.xlsx`)
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
      if (password.length < 10) {
        notify('Password must be at least 10 characters')
        return
      }
      if (!['Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Executive'].includes(requestedRole)) {
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
          body: JSON.stringify({ name: String(form.get('name')), username, password, role: requestedRole, platforms: requestedPlatforms }),
        })
        setUsers(prev => [...prev, result.user])
        log(`Created ${result.user.role} account ${result.user.username}`)
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
        notify(`Account ${user.active ? 'deactivated' : 'activated'}`)
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Account status could not be changed')
      }
    }
    return (
      <section>
        <div className="page-heading"><div><p>ADMINISTRATION</p><h1>User Management</h1></div><div className="heading-actions"><button className="secondary" onClick={() => void refreshUsers()}><RotateCcw size={16} /> Refresh users</button><button className="secondary" onClick={exportUsers}><Download size={16} /> Export users</button></div></div>
        <div className="form-grid">
          <form className="panel form-card" onSubmit={createUser}>
            <div className="panel-heading"><div><h2>Create account</h2><p>Assign a role and secure login</p></div></div>
            <div className="field-grid">
              <label>Full name<input name="name" required placeholder="Employee name" /></label>
              <label>Username<input name="username" required autoComplete="off" placeholder="login name" /></label>
              <label>Password<input name="password" type="password" required minLength={10} placeholder="Minimum 10 characters" /></label>
              <label>Role<select name="role" required value={newUserRole} onChange={event => setNewUserRole(event.target.value as Role)}><option>Production Supervisor</option><option>Machine Operator</option><option>Store Manager</option><option>E-commerce Executive</option></select></label>
              {newUserRole === 'E-commerce Executive' && <fieldset className="platform-assignment"><legend>Assigned platform access</legend>{deliveryChannels.map(platform => <label key={platform}><input type="checkbox" name="platforms" value={platform} /> {platform}</label>)}</fieldset>}
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
          {ecommerceReports.length > 0 && <div className="ecommerce-table-wrap"><table><thead><tr><th>Report date</th><th>Last updated (IST)</th><th>Executive</th><th>Platform</th><th>Completed</th><th>Pending</th><th>Issues / notes</th></tr></thead><tbody>{ecommerceReports.map(report => <tr key={report.id}><td>{formatIndiaDate(report.date)}</td><td>{formatIndiaDateTime(report.updatedAt)}</td><td>{report.userName}</td><td>{report.platform}</td><td className="ecommerce-report-cell">{report.completed}</td><td className="ecommerce-report-cell">{report.pending || '—'}</td><td className="ecommerce-report-cell">{report.issues || '—'}</td></tr>)}</tbody></table></div>}
        </section>
        <div className="table-card entries-table"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Platforms</th><th>Status</th><th /></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.name}</td><td><code>{user.username}</code></td><td>{user.role}</td><td>{user.platforms.join(', ') || '—'}</td><td><span className={`status ${user.active ? 'active' : 'draft'}`}>{user.active ? 'Active' : 'Inactive'}</span></td><td><button className="secondary" disabled={user.id === sessionUser.id} onClick={() => setAccountActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
      </section>
    )
  }

  if (module === 'Audit Logs') {
    return (
      <section><div className="page-heading"><div><p>SECURITY</p><h1>Audit Logs</h1></div></div>
        <div className="panel audit-card"><div className="panel-heading"><div><h2>Recent activity</h2><p>Changes made in this browser session</p></div></div>{audit.map((entry, i) => <div className="audit-row" key={i}><div className="audit-dot" /><div><strong>{entry}</strong><span>{sessionUser.name}</span></div></div>)}</div>
      </section>
    )
  }

  const Icon = moduleIcons[module] || Package
  return (
    <section>
      <div className="page-heading"><div><p>MAHALAXMI ERP</p><h1>{module}</h1></div></div>
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
      setTargetDrafts(Object.fromEntries((workspace.targets.executives || []).map(executive => [
        executive.executiveId,
        { daily: String(executive.dailyTarget), monthly: String(executive.monthlyTarget) },
      ])))
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
  const monthlyReports = reports.filter(report => report.date.slice(0, 7) === selectedMonth)
  const orderCount = summaries.reduce((total, item) => total + item.dispatchedOrders, 0)
  const dispatchedUnits = summaries.reduce((total, item) => total + item.dispatchedUnits, 0)
  const returnedOrders = summaries.reduce((total, item) => total + item.returnedOrders, 0)
  const damagedUnits = summaries.reduce((total, item) => total + item.damagedUnits, 0)

  const saveExecutiveTarget = async (executive: EcommerceExecutiveTarget) => {
    const draft = targetDrafts[executive.executiveId]
    const dailyTarget = Number(draft?.daily ?? '')
    const monthlyTarget = Number(draft?.monthly ?? '')
    if (!draft?.daily.trim() || !draft.monthly.trim() ||
        !Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
        !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
      setTargetMessage('Enter whole-number daily and monthly targets from 0 to 100,000.')
      return
    }
    setSavingTarget(executive.executiveId)
    setTargetMessage('')
    try {
      const result = await apiFetch<{ executiveId: string; dailyTarget: number; monthlyTarget: number }>('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTarget', executiveId: executive.executiveId, dailyTarget, monthlyTarget }),
      })
      setData(current => current ? {
        ...current,
        targets: {
          ...current.targets,
          executives: current.targets.executives?.map(item => item.executiveId === result.executiveId
            ? { ...item, dailyTarget: result.dailyTarget, monthlyTarget: result.monthlyTarget }
            : item),
        },
      } : current)
      setTargetMessage(`${executive.executiveName} daily and monthly targets saved.`)
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
          <div className="stat-card"><div className="stat-icon purple"><ClipboardCheck size={20} /></div><div className="stat-body"><span>Executive reports / damaged units</span><strong>{monthlyReports.length} / {damagedUnits.toLocaleString('en-IN')}</strong><small>{selectedMonth}</small></div></div>
        </div>
        <section className="ecommerce-target-settings" aria-label="E-commerce Executive targets">
          <div className="ecommerce-admin-reports-heading"><strong>Executive order targets</strong><span>Set daily and monthly targets per active account.</span></div>
          <p className="ecommerce-metric-note">Actuals count unique dispatched order numbers from the ERP ledger across each executive’s assigned platforms. No marketplace API is used.</p>
          {executiveSummaries.length === 0 ? <div className="empty-state"><Users size={22} /><strong>No active E-commerce Executive accounts</strong><span>Create an executive account and assign platforms to set targets.</span></div> : <>
            <div className="ecommerce-target-grid">{executiveSummaries.map(executive => {
              const draft = targetDrafts[executive.executiveId] || { daily: String(executive.dailyTarget), monthly: String(executive.monthlyTarget) }
              return <form key={executive.executiveId} className="ecommerce-target-form" onSubmit={event => { event.preventDefault(); void saveExecutiveTarget(executive) }}>
                <strong>{executive.executiveName}</strong>
                <span className="ecommerce-target-platforms">{executive.platforms.length ? executive.platforms.join(' · ') : 'No platforms assigned'}</span>
                <label>Orders per day<input type="number" min="0" max="100000" step="1" value={draft.daily} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), daily: event.target.value } }))} /></label>
                <label>Orders per month<input type="number" min="0" max="100000" step="1" value={draft.monthly} onChange={event => setTargetDrafts(current => ({ ...current, [executive.executiveId]: { ...(current[executive.executiveId] || draft), monthly: event.target.value } }))} /></label>
                <button className="secondary" type="submit" disabled={savingTarget !== null}>{savingTarget === executive.executiveId ? 'Saving…' : 'Save targets'}</button>
              </form>
            })}</div>
            <div className="ecommerce-table-wrap"><table><thead><tr><th>Executive</th><th>Assigned platforms</th><th>Daily target</th><th>Orders today</th><th>Daily achievement</th><th>Monthly target</th><th>Orders this month</th><th>Monthly achievement</th></tr></thead><tbody>{executiveSummaries.map(executive => <tr key={executive.executiveId}><td><strong>{executive.executiveName}</strong></td><td>{executive.platforms.join(', ') || '—'}</td><td>{executive.dailyTarget}</td><td>{executive.ordersToday}</td><td>{executive.dailyAchievement === null ? '—' : `${executive.dailyAchievement}%`}</td><td>{executive.monthlyTarget}</td><td>{executive.ordersThisMonth}</td><td>{executive.monthlyAchievement === null ? '—' : `${executive.monthlyAchievement}%`}</td></tr>)}</tbody></table></div>
          </>}
          <p className="ecommerce-feedback" role="status" aria-live="polite">{targetMessage}</p>
        </section>
        <div className="ecommerce-table-wrap"><table><thead><tr><th>Platform</th><th>Orders dispatched</th><th>Units</th><th>Return orders</th><th>Return units</th><th>Damage orders</th><th>Damaged units</th><th>Daily reports</th></tr></thead><tbody>{summaries.map(summary => <tr key={summary.platform}><td><strong>{summary.platform}</strong></td><td>{summary.dispatchedOrders}</td><td>{summary.dispatchedUnits.toLocaleString('en-IN')}</td><td>{summary.returnedOrders}</td><td>{summary.returnedUnits.toLocaleString('en-IN')}</td><td>{summary.damagedOrders}</td><td>{summary.damagedUnits.toLocaleString('en-IN')}</td><td>{summary.dailyReports}</td></tr>)}</tbody></table></div>
        <div className="ecommerce-admin-reports">
          <div className="ecommerce-admin-reports-heading"><strong>{selectedMonth} executive daily reports</strong><span>{monthlyReports.length} submissions</span></div>
          {monthlyReports.length === 0 ? <div className="empty-state"><ClipboardCheck size={22} /><strong>No reports submitted this month</strong></div> : <div className="ecommerce-table-wrap"><table><thead><tr><th>Report date</th><th>Last updated (IST)</th><th>Executive</th><th>Platform</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th></tr></thead><tbody>{monthlyReports.map(report => <tr key={report.id}><td>{formatIndiaDate(report.date)}</td><td>{formatIndiaDateTime(report.updatedAt)}</td><td>{report.userName}</td><td>{report.platform}</td><td className="ecommerce-report-cell">{report.completed}</td><td className="ecommerce-report-cell">{report.pending || '—'}</td><td className="ecommerce-report-cell">{report.issues || '—'}</td></tr>)}</tbody></table></div>}
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
  const [actionMessage, setActionMessage] = useState('')
  const [reportSavedAt, setReportSavedAt] = useState<{ date: string; updatedAt: string; platform: EcommercePlatform } | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingListingId, setEditingListingId] = useState('')
  const [platformSkuDraft, setPlatformSkuDraft] = useState('')

  const reload = useCallback(async () => {
    try {
      const result = await apiFetch<EcommerceWorkspaceData>('/api/ecommerce')
      setData(result)
      setError('')
      setSelectedPlatform(current => result.platforms.includes(current) ? current : result.platforms[0] || 'AMAZON')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'E-commerce workspace could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const listings = data?.listings.filter(listing => listing.platform === selectedPlatform) || []
  const visibleListings = listings.filter(listing => {
    const query = listingSearch.trim().toLowerCase()
    return !query || [listing.productName, listing.productSku, listing.platformSku].some(value => value.toLowerCase().includes(query))
  })
  const movements = data?.movements.filter(movement => movement.platform === selectedPlatform) || []
  const labels = data?.labels.filter(label => label.platform === selectedPlatform) || []
  const uniqueStock = new Map(listings.map(listing => [listing.productSku.toLowerCase(), listing.availableStock]))
  const canEdit = user.role === 'E-commerce Executive' || user.role === 'Super Admin'
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
          : 'E-commerce Workspace'
  const showAll = page === 'all'
  const showOverview = showAll || page === 'overview'
  const showStock = showAll || page === 'stock'
  const showOrders = showAll || page === 'orders'
  const showLabels = showAll || page === 'labels'
  const showReport = user.role === 'E-commerce Executive' && (showAll || page === 'report')

  const saveSku = async (event: React.FormEvent<HTMLFormElement>, listing: EcommerceListing) => {
    event.preventDefault()
    setBusy(true)
    setActionMessage('')
    try {
      await apiFetch('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateSku', platform: selectedPlatform, listingId: listing.id, platformSku: platformSkuDraft }),
      })
      setActionMessage('Marketplace SKU updated.')
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
      const result = await apiFetch<{ report: { date: string; updatedAt: string; platform: EcommercePlatform } }>('/api/ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitReport',
          platform: selectedPlatform,
          completed: form.get('completed'),
          pending: form.get('pending'),
          issues: form.get('issues'),
        }),
      })
      setReportSavedAt(result.report)
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
      <div className="page-heading"><div><p>PLATFORM OPERATIONS</p><h1>{pageTitle}</h1><span className="catalog-intro">Platform access is verified on the server for stock, orders, SKU updates, labels, and reports.</span></div><button className="secondary" onClick={() => { setLoading(true); void reload() }} disabled={loading}><RotateCcw size={16} /> Refresh</button></div>
      {(showOverview || showAll) && <nav className="ecommerce-quick-links" aria-label="E-commerce workspace shortcuts">
        <button className="secondary" type="button" onClick={() => setModule('E-commerce Stock')}><Boxes size={16} /> Stock & SKUs</button>
        <button className="secondary" type="button" onClick={() => setModule('E-commerce Orders')}><Truck size={16} /> Dispatches & Returns</button>
        <button className="secondary" type="button" onClick={() => setModule('Shipping Labels')}><FileSpreadsheet size={16} /> Shipping Labels</button>
        {user.role === 'E-commerce Executive' && <button className="secondary" type="button" onClick={() => setModule('Daily Work Report')}><ClipboardCheck size={16} /> Daily Report</button>}
      </nav>}
      {error && <div className="ecommerce-error" role="alert">{error}</div>}
      {loading && !data && <div className="panel empty-state">Loading assigned platform data…</div>}
      {data && <>
        {(showOverview || showAll) && <section className="panel ecommerce-section">
          <div className="panel-heading ecommerce-month-heading">
            <div><h2>Assigned platforms</h2><p>Your account can access only the tagged platforms below.</p></div>
            <label className="ecommerce-month-filter">Monthly analysis<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
          </div>
          <div className="ecommerce-platform-tags">{data.platforms.map(platform => <span className="ecommerce-platform-tag" key={platform}>{platform}</span>)}</div>
          <p className="ecommerce-metric-note">Dispatched orders are counted by unique order number; the ledger does not track delivery confirmation.</p>
          <div className="ecommerce-table-wrap"><table><thead><tr><th>Platform</th><th>Orders dispatched</th><th>Units dispatched</th><th>Return orders</th><th>Return units</th><th>Damage orders</th><th>Damaged units</th></tr></thead><tbody>{monthlySummaries.map(summary => <tr key={summary.platform}><td><strong>{summary.platform}</strong></td><td>{summary.dispatchedOrders}</td><td>{summary.dispatchedUnits.toLocaleString('en-IN')}</td><td>{summary.returnedOrders}</td><td>{summary.returnedUnits.toLocaleString('en-IN')}</td><td>{summary.damagedOrders}</td><td>{summary.damagedUnits.toLocaleString('en-IN')}</td></tr>)}</tbody></table></div>
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
          <div className="stat-card"><div className="stat-icon blue"><FileSpreadsheet size={20} /></div><div className="stat-body"><span>Shipping labels</span><strong>{labels.length}</strong><small>Stored privately</small></div></div>
        </div>}
        {showStock && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>{selectedPlatform} stock and SKUs</h2><p>Only listings linked to this platform are shown.</p></div></div>
          <div className="ecommerce-listing-toolbar"><label><Search size={16} /><input type="search" aria-label="Search product name, product SKU, or platform SKU" placeholder="Search product name or SKU" value={listingSearch} onChange={event => setListingSearch(event.target.value)} /></label><span>{visibleListings.length} of {listings.length} listings</span></div>
          {listings.length === 0 ? <div className="empty-state"><Boxes size={24} /><strong>No marketplace listings</strong><span>Assigned platform products will appear here.</span></div> : visibleListings.length === 0 ? <div className="empty-state"><Search size={24} /><strong>No matching products</strong><span>Try a different product name or SKU.</span></div> : <div className="ecommerce-table-wrap"><table><thead><tr><th>Product</th><th>Product SKU</th><th>Platform SKU</th><th>Available stock</th><th>Status</th>{canEdit && <th />}</tr></thead><tbody>{visibleListings.map(listing => <tr key={listing.id}><td>{listing.productName}</td><td><code>{listing.productSku}</code></td><td>{editingListingId === listing.id ? <form className="inline-sku-form" onSubmit={event => void saveSku(event, listing)}><input aria-label={`Platform SKU for ${listing.productName}`} value={platformSkuDraft} onChange={event => setPlatformSkuDraft(event.target.value)} maxLength={120} required /><button className="primary" type="submit" disabled={busy}>Save</button><button className="secondary" type="button" onClick={() => setEditingListingId('')}>Cancel</button></form> : <code>{listing.platformSku || '—'}</code>}</td><td>{listing.availableStock.toLocaleString('en-IN')}</td><td>{listing.stockStatus}</td>{canEdit && <td>{editingListingId !== listing.id && <button className="secondary" type="button" onClick={() => { setEditingListingId(listing.id); setPlatformSkuDraft(listing.platformSku) }}>Update SKU</button>}</td>}</tr>)}</tbody></table></div>}
        </section>}
        {showOrders && <section className="panel ecommerce-section">
          <div className="panel-heading"><div><h2>Dispatches and returns</h2><p>Dispatch, return, and damage records tied to order numbers.</p></div></div>
          {movements.length === 0 ? <div className="empty-state"><Truck size={24} /><strong>No platform orders yet</strong><span>Platform dispatches and linked returns will appear here.</span></div> : <div className="ecommerce-table-wrap"><table><thead><tr><th>Date</th><th>Order number</th><th>Type</th><th>Product SKU</th><th>Quantity</th><th>Notes</th></tr></thead><tbody>{movements.map(item => <tr key={item.id}><td>{formatIndiaDateTime(item.date)}</td><td><code>{item.orderNumber}</code></td><td>{item.type}</td><td><code>{item.sku}</code></td><td>{item.quantity}</td><td>{item.reason || '—'}</td></tr>)}</tbody></table></div>}
        </section>}
        {(showLabels || showReport) && <div className={`ecommerce-panels${showLabels !== showReport ? ' ecommerce-single-panel' : ''}`}>
          {showLabels && <section className="panel ecommerce-section" id="ecommerce-shipping-labels">
            <div className="panel-heading"><div><h2>Shipping labels</h2><p>PDFs are stored in private Drive and downloaded through this signed-in account.</p></div></div>
            {canEdit && <form className="ecommerce-form" onSubmit={event => void uploadLabel(event)}><label>Marketplace order number<input name="orderNumber" required maxLength={120} /></label><label>Label PDF<input name="label" type="file" accept="application/pdf,.pdf" required /></label><small>PDF only · maximum 3 MB</small><button className="primary" type="submit" disabled={busy}><Upload size={15} /> Upload label</button></form>}
            {labels.length === 0 ? <div className="empty-state"><FileSpreadsheet size={24} /><strong>No labels for {selectedPlatform}</strong><span>Uploaded shipping labels will be listed here.</span></div> : <div className="ecommerce-label-list">{labels.map(label => <div className="ecommerce-label-row" key={label.id}><div><strong>{label.orderNumber}</strong><span>{label.fileName} · {formatIndiaDateTime(label.uploadedAt)}</span></div><button className="secondary" type="button" disabled={busy} onClick={() => void downloadLabel(label)}><Download size={15} /> Download</button></div>)}</div>}
          </section>}
          {showReport && <section className="panel ecommerce-section">
            <div className="panel-heading"><div><h2>Daily work report</h2><p>One report per platform each day; new submissions update today’s report.</p></div></div>
            <form className="ecommerce-form" onSubmit={event => void submitDailyReport(event)}><label>Completed work<textarea name="completed" required maxLength={3000} rows={4} /></label><label>Pending work<textarea name="pending" maxLength={3000} rows={3} /></label><label>Issues / notes<textarea name="issues" maxLength={3000} rows={3} /></label><button className="primary" type="submit" disabled={busy}><CheckCircle2 size={15} /> Submit daily report</button></form>
            {reportSavedAt?.platform === selectedPlatform && <p className="ecommerce-report-saved" role="status">Report date: {formatIndiaDate(reportSavedAt.date)} · Last submitted/updated: {formatIndiaDateTime(reportSavedAt.updatedAt)}</p>}
          </section>}
        </div>}
        <p className="ecommerce-feedback" role="status" aria-live="polite">{actionMessage}</p>
      </>}
    </section>
  )
}

function MovementTable({ movements, showDeliveryDetails = false }: { movements: StockMovement[]; showDeliveryDetails?: boolean }) {
  return (
    <>
      <table aria-label="Stock movement history"><thead><tr><th>Date / time</th><th>Item</th><th>SKU</th><th>Movement</th><th>Quantity</th><th>Balance</th>{showDeliveryDetails && <><th>Channel</th><th>Delivery partner</th></>}<th>Reference</th><th>Reason</th><th>Entered by</th></tr></thead><tbody>
        {movements.map(movement => <tr key={movement.id}>
          <td>{formatIndiaDateTime(movement.date)}</td>
          <td>{movement.itemType || '—'}</td>
          <td><code>{movement.sku}</code></td>
          <td>{movement.type}</td>
          <td>{movement.quantity.toLocaleString('en-IN')}</td>
          <td>{movement.openingStock.toLocaleString('en-IN')} → {movement.closingStock.toLocaleString('en-IN')}</td>
          {showDeliveryDetails && <><td>{movement.salesChannel || '—'}</td><td>{movement.deliveryPartner || '—'}</td></>}
          <td>{movement.referenceId || '—'}</td>
          <td>{movement.reason || '—'}</td>
          <td>{movement.createdBy || '—'}</td>
        </tr>)}
      </tbody></table>
      {movements.length === 0 && <div className="empty-state"><Archive size={24} /><strong>No stock movements yet</strong><span>Saved stock changes will appear here and cannot be deleted.</span></div>}
    </>
  )
}

type DashboardViewProps = {
  role: Role
  user: UserAccount
  users: UserAccount[]
  products: Product[]
  production: Production[]
  today: string
  machines: Machine[]
  productionChart: { date: string; qty: number }[]
  setModule: (module: Module) => void
  exportExcel: () => void
}

function DashboardView({
  role, user, users, products, production, today, machines, productionChart, setModule, exportExcel,
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
  const roleCounts = (['Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Executive'] as Role[])
    .map(accountRole => ({
      role: accountRole,
      count: users.filter(account => account.role === accountRole).length,
      active: users.filter(account => account.role === accountRole && account.active).length,
    }))
  const machineStatusCount = (status: string) => machines.filter(machine => machine.status.toLowerCase() === status).length

  const descriptions: Record<Role, string> = {
    'Super Admin': 'Manage the full ERP, inventory, factory operations, and team access.',
    'Production Supervisor': 'Manage production, inventory, catalog, machines, and sales. Management, User Management, Settings, and Audit Logs are Admin-only.',
    'Machine Operator': 'Record your daily output and review your own production entries.',
    'Store Manager': 'This account has dashboard-only access. Contact the Super Admin if your assigned workspace needs to change.',
    'E-commerce Executive': 'Review assigned-platform stock and dispatches, upload labels, update marketplace SKUs, and submit your daily report.',
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
    'E-commerce Executive': [
      { label: 'Assigned platforms', value: '—', detail: 'Open your e-commerce workspace', icon: ShoppingCart, tone: 'blue' },
    ],
  }
  const shortcuts: Record<Role, { module: Module; detail: string }[]> = {
    'Super Admin': [
      { module: 'User Management', detail: 'Create accounts and assign team roles' },
      { module: 'Inventory', detail: 'Review raw materials and finished goods' },
      { module: 'Product Catalog', detail: 'Create products, SKUs, and marketplace listings' },
      { module: 'Machines', detail: 'Configure machines and availability' },
      { module: 'Stock Movement', detail: 'Audit the complete stock ledger' },
    ],
    'Production Supervisor': [
      { module: 'Inventory', detail: 'Manage raw materials and finished goods' },
      { module: 'Production', detail: 'Enter output and export production reports' },
      { module: 'Product Catalog', detail: 'Manage products, SKUs, and marketplace listings' },
      { module: 'Stitching', detail: 'Review stitching work' },
      { module: 'Quality Control', detail: 'Review quality checks' },
    ],
    'Machine Operator': [
      { module: 'Production', detail: 'Record output by machine and SKU' },
    ],
    'Store Manager': [],
    'E-commerce Executive': [
      { module: 'E-commerce Workspace', detail: 'View assigned platforms, shipping labels, and daily tasks' },
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

      {role === 'Super Admin' && <EcommerceMonthlyDashboard />}

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
