import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, ArrowUpRight, BarChart3,
  Boxes, Building2, CircleDollarSign, ClipboardCheck,
  Factory, FileSpreadsheet, Gauge, LayoutDashboard, Menu, Package,
  RotateCcw, Search, Settings, ShoppingCart, Truck, UserCog, Users,
  Plus, Download, Upload, Bell, MoreHorizontal, CheckCircle2, LogOut, LockKeyhole,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as XLSX from 'xlsx'
import './App.css'

type Module = 'Dashboard' | 'Factory' | 'Production' | 'Stitching' | 'Raw Material' | 'Finished Goods' |
  'Product Master' | 'SKU Manager' | 'Marketplace Listings' | 'Orders' | 'Inventory' |
  'Stock Movement' | 'Shipping & Delivery' | 'Returns & RTO' | 'Machines' | 'Quality Control' | 'Employees' |
  'Suppliers' | 'Accounts' | 'Reports' | 'Excel Management' | 'User Management' | 'Settings' | 'Audit Logs'

type Product = {
  id: string; sku: string; masterSku: string; name: string; category: string; mrp: number; stock: number;
  status: 'Active' | 'Draft'; size: string; color: string; packQuantity: number; isVariant: boolean
}
type Production = { id: string; date: string; machine: string; sku: string; product: string; actual: number; rejected: number; createdBy?: string }
type Role = 'Super Admin' | 'Production Supervisor' | 'Store Manager' | 'Machine Operator'
type UserAccount = { id: string; name: string; username: string; role: Role; active: boolean }
type Machine = { id: string; name: string; type: string; department: string; operator: string; status: string }
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
  referenceId: string; machineId: string; reason: string; openingStock: number; closingStock: number; createdBy: string
}
type AuthStatus = 'checking' | 'ready' | 'unavailable'

const navSections: { label: string; items: Module[] }[] = [
  { label: 'MAIN', items: ['Dashboard', 'Factory', 'Production', 'Stitching', 'Quality Control'] as Module[] },
  { label: 'INVENTORY', items: ['Raw Material', 'Finished Goods', 'Inventory', 'Stock Movement', 'Machines'] },
  { label: 'CATALOG', items: ['Product Master', 'SKU Manager', 'Marketplace Listings'] },
  { label: 'SALES', items: ['Orders', 'Shipping & Delivery', 'Returns & RTO'] },
  { label: 'MANAGEMENT', items: ['Employees', 'Suppliers', 'Accounts', 'Reports'] },
  { label: 'ADMIN', items: ['Excel Management', 'User Management', 'Settings', 'Audit Logs'] },
]

const moduleIcons: Record<Module, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard, Production: Factory, Stitching: ClipboardCheck, 'Raw Material': Boxes,
  'Finished Goods': Package, 'Product Master': Archive, 'SKU Manager': BarChart3,
  'Marketplace Listings': ShoppingCart, Orders: ShoppingCart, Inventory: Boxes,
  'Stock Movement': ArrowUpRight,
  'Shipping & Delivery': Truck, 'Returns & RTO': RotateCcw, Machines: Gauge,
  'Quality Control': ClipboardCheck, Employees: Users, Suppliers: Building2,
  Accounts: CircleDollarSign, Reports: BarChart3, 'Excel Management': FileSpreadsheet,
  'User Management': UserCog, Settings, 'Audit Logs': Archive,
  Factory: Factory,
} as Record<Module, typeof LayoutDashboard>

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback } catch { return fallback }
}

function indiaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
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

export default function App() {
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
  const [module, setModule] = useState<Module>('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
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
  const [production, setProduction] = useState<Production[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [audit, setAudit] = useState<string[]>(() => readStored('erp-audit', ['Workbook connection pending', 'System initialized']))
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [workbookMeta, setWorkbookMeta] = useState({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })

  const refreshWorkbook = useCallback(async () => {
    const data = await apiFetch<{
      products: Product[]
      machines: Machine[]
      production: Production[]
      rawMaterials: RawMaterial[]
      finishedGoods: FinishedGood[]
      stockMovements: StockMovement[]
      workbookMeta: { loaded: boolean; name: string; sheetCount: number }
    }>('/api/erp')
    setProducts(data.products)
    setMachines(data.machines)
    setProduction(data.production)
    setRawMaterials(data.rawMaterials)
    setFinishedGoods(data.finishedGoods)
    setStockMovements(data.stockMovements)
    setWorkbookMeta(data.workbookMeta)
  }, [])

  useEffect(() => localStorage.setItem('erp-audit', JSON.stringify(audit)), [audit])
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    let active = true
    const initializeAuthentication = async () => {
      try {
        const statusResponse = await fetch('/api/auth/status', { cache: 'no-store' })
        const statusData = await statusResponse.json() as { error?: string; configured?: boolean; needsAdminSetup?: boolean }
        if (!statusResponse.ok || !statusData.configured) throw new Error(statusData.error || 'Google Sheets Apps Script is not configured.')
        if (!active) return
        setNeedsAdminSetup(Boolean(statusData.needsAdminSetup))
        setAuthStatus('ready')

        const sessionResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json() as { user?: UserAccount }
          if (active && sessionData.user) {
            setSessionUser(sessionData.user)
            setModule('Dashboard')
          }
        }
      } catch (error) {
        if (!active) return
        setAuthStatus('unavailable')
        setServerMessage(error instanceof Error ? error.message : 'Secure server login is unavailable.')
      }
    }
    void initializeAuthentication()
    return () => { active = false }
  }, [])
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
      setMachines([])
      setProduction([])
      setRawMaterials([])
      setFinishedGoods([])
      setStockMovements([])
      setWorkbookMeta({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })
      return () => { active = false }
    }
    const refresh = () => {
      void refreshWorkbook()
        .catch(error => {
          if (active) setToast(error instanceof Error ? error.message : 'Could not load the shared workbook')
        })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [sessionUser, refreshWorkbook])

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2600) }
  const log = (message: string) => setAudit(prev => [`${new Date().toLocaleString()} — ${message}`, ...prev])

  const filteredProducts = useMemo(() => products.filter(p =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search])

  const saveProduct = async (input: { sku: string; name: string; category: string; mrp: number }) => {
    const result = await apiFetch<{ product: Product }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProduct', ...input }),
    })
    setProducts(prev => [...prev.filter(item => item.sku.toLowerCase() !== result.product.sku.toLowerCase()), result.product])
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
    log(`Added SKU ${result.product.sku} to ${result.product.masterSku}`)
    notify('SKU saved to the shared workbook')
    return result.product
  }

  const saveMachine = async (input: Omit<Machine, 'id'>) => {
    const result = await apiFetch<{ machine: Machine }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addMachine', ...input }),
    })
    setMachines(prev => [...prev, result.machine])
    log(`Added ${result.machine.id}: ${result.machine.name}`)
    notify(`${result.machine.id} saved to the shared workbook`)
    return result.machine
  }

  const saveProduction = async (input: Omit<Production, 'id' | 'createdBy' | 'product'> & { product: string }) => {
    const result = await apiFetch<{ record: Production & { finishedGood?: FinishedGood } }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addProduction', ...input }),
    })
    setProduction(prev => [result.record, ...prev.filter(item => item.id !== result.record.id)])
    await refreshWorkbook()
    log(`Recorded production ${result.record.actual} units for ${result.record.sku}`)
    notify('Production entry saved to the shared workbook')
    return result.record
  }

  const saveRawMaterial = async (input: { sku: string; name: string; unit: string; supplier: string; openingStock: number; reorderLevel: number; unitCost: number }) => {
    const result = await apiFetch<{ material: RawMaterial }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addRawMaterial', ...input }),
    })
    await refreshWorkbook()
    log(`Added raw material ${result.material.sku}`)
    notify('Raw material saved to the shared workbook')
    return result.material
  }

  const applyStockMovement = async (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; referenceId: string; machineId: string; reason: string }) => {
    await apiFetch<{ item: Record<string, unknown>; movement: Record<string, unknown> }>('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'applyStockMovement', ...input }),
    })
    await refreshWorkbook()
    log(`${input.type} · ${input.sku} · ${input.quantity}`)
    notify('Stock movement saved to the ledger')
  }

  const archiveStockItem = async (kind: 'raw' | 'finished', sku: string) => {
    await apiFetch('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archiveStockItem', kind, sku }),
    })
    await refreshWorkbook()
    log(`Archived ${sku}`)
    notify('Item archived; its stock history was retained')
  }

  const deleteUnusedStockItem = async (kind: 'raw' | 'finished', sku: string) => {
    await apiFetch('/api/erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteUnusedStockItem', kind, sku }),
    })
    await refreshWorkbook()
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
      notify(`Preview only: ${unique.length} new, ${duplicates.length} duplicates. Use Product Master / SKU Manager to save shared records.`)
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
      setModule('Dashboard')
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

  const productionChart = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = indiaDateKey(date)
    return {
      name: new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }).format(date),
      qty: production.filter(row => row.date === key).reduce((sum, row) => sum + row.actual, 0),
    }
  })
  const adminModules = navSections.flatMap(section => section.items)
  const roleModules: Record<Role, Module[]> = {
    'Super Admin': adminModules,
    'Production Supervisor': ['Dashboard', 'Factory', 'Production', 'Stitching', 'Quality Control'],
    'Machine Operator': ['Dashboard', 'Production'],
    'Store Manager': ['Dashboard'],
  }
  const mainModules: Record<Role, Module[]> = {
    'Super Admin': ['Dashboard', 'Inventory', 'Production', 'Product Master'],
    'Production Supervisor': ['Dashboard', 'Production'],
    'Machine Operator': ['Dashboard', 'Production'],
    'Store Manager': ['Dashboard'],
  }
  const primaryModules = mainModules[sessionUser.role].filter(item => roleModules[sessionUser.role].includes(item))
  const otherModules = roleModules[sessionUser.role].filter(item => !primaryModules.includes(item))

  return (
    <div className={sidebarOpen ? 'app-shell' : 'app-shell sidebar-collapsed'}>
      <aside className={sidebarOpen ? 'sidebar' : 'sidebar collapsed'}>
        <div className="brand">
          <div className="brand-mark">M</div>
          {sidebarOpen && <div><strong>Mahalaxmi</strong><span>ENTERPRISE ERP</span></div>}
        </div>
        <nav>
          <div className="nav-section">
            {sidebarOpen && <div className="nav-label">MAIN</div>}
            {primaryModules.map(item => {
              const Icon = moduleIcons[item] || Package
              return <button key={item} className={module === item ? 'nav-item active' : 'nav-item'} onClick={() => { setModule(item); setMoreOpen(false) }}><Icon size={19} /><span>{item}</span></button>
            })}
            {otherModules.length > 0 && <button className={moreOpen ? 'nav-item more-toggle active' : 'nav-item more-toggle'} aria-expanded={moreOpen} onClick={() => setMoreOpen(value => !value)}><MoreHorizontal size={19} /><span>More</span></button>}
          </div>
        </nav>
        {moreOpen && otherModules.length > 0 && <div className="more-menu">
          <div className="more-menu-heading">ALL MODULES<button onClick={() => setMoreOpen(false)} aria-label="Close menu">×</button></div>
          {navSections.map(section => {
            const items = section.items.filter(item => otherModules.includes(item))
            if (!items.length) return null
            return <div className="more-group" key={section.label}><span>{section.label}</span>{items.map(item => {
              const Icon = moduleIcons[item] || Package
              return <button key={item} className={module === item ? 'more-item active' : 'more-item'} onClick={() => { setModule(item); setMoreOpen(false) }}><Icon size={16} /><span>{item}</span></button>
            })}</div>
          })}
        </div>}
        <div className="sidebar-user">
          <div className="avatar">{sessionUser.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</div>
          {sidebarOpen && <div className="user-copy"><strong>{sessionUser.name}</strong><span>{sessionUser.role}</span></div>}
          {sidebarOpen && <button className="row-menu" onClick={logout} title="Sign out"><LogOut size={17} /></button>}
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button" onClick={() => setSidebarOpen(v => !v)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="global-search"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, product, order, barcode..." /><kbd>⌘ K</kbd></div>
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
              machines={machines}
              productionChart={productionChart}
              setModule={setModule}
              exportExcel={exportExcel}
            />
          ) : (
            <ModuleView module={module} products={products} filteredProducts={filteredProducts} production={production} rawMaterials={rawMaterials} finishedGoods={finishedGoods} stockMovements={stockMovements} audit={audit} workbookMeta={workbookMeta}
              search={search} setSearch={setSearch} exportExcel={exportExcel} saveProduct={saveProduct} saveVariant={saveVariant}
              saveProduction={saveProduction} saveMachine={saveMachine} saveRawMaterial={saveRawMaterial} applyStockMovement={applyStockMovement}
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
  module: Module; products: Product[]; filteredProducts: Product[]; production: Production[];
  rawMaterials: RawMaterial[]; finishedGoods: FinishedGood[]; stockMovements: StockMovement[]; audit: string[]; search: string;
  workbookMeta: { loaded: boolean; name: string; sheetCount: number };
  setSearch: (v: string) => void; exportExcel: () => void;
  saveProduct: (input: { sku: string; name: string; category: string; mrp: number }) => Promise<Product>;
  saveVariant: (input: { masterSku: string; sku: string; size: string; color: string; packQuantity: number; mrp?: number; sellingPrice?: number }) => Promise<Product>;
  saveProduction: (input: { date: string; machine: string; sku: string; product: string; actual: number; rejected: number }) => Promise<Production>;
  saveRawMaterial: (input: { sku: string; name: string; unit: string; supplier: string; openingStock: number; reorderLevel: number; unitCost: number }) => Promise<RawMaterial>;
  applyStockMovement: (input: { kind: 'raw' | 'finished'; sku: string; type: string; quantity: number; unitCost?: number; referenceId: string; machineId: string; reason: string }) => Promise<void>;
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
  const { module, products, filteredProducts, production, rawMaterials, finishedGoods, stockMovements, audit, workbookMeta, search, setSearch, exportExcel, saveProduct, saveVariant, saveProduction, saveRawMaterial, applyStockMovement, archiveStockItem, deleteUnusedStockItem, saveMachine, fileRef, importExcel, notify, log, setModule, machines, users, setUsers, sessionUser, allowedModules } = props
  const [catalogFormOpen, setCatalogFormOpen] = useState(false)
  const [stockFormOpen, setStockFormOpen] = useState(false)
  const [materialFormOpen, setMaterialFormOpen] = useState(false)
  if (!allowedModules.includes(module)) {
    return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Your account role cannot open this section.</span></div></section>
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
        sku,
        product: product.name,
        actual,
        rejected,
      })
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
      await saveProduct({
        sku: String(form.get('sku')),
        name: String(form.get('name')),
        category: String(form.get('category')),
        mrp: Number(form.get('mrp')),
      })
      formElement.reset()
      setCatalogFormOpen(false)
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
      setCatalogFormOpen(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'SKU variant could not be saved')
    }
  }

  const canManageInventory = sessionUser.role === 'Super Admin'
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
        <div className="page-heading"><div><p>INVENTORY · FINISHED GOODS</p><h1>Finished Goods</h1></div><div className="heading-actions">{canManageInventory && <button className="primary" onClick={() => setStockFormOpen(open => !open)}><Plus size={16} /> Stock movement</button>}</div></div>
        {stockFormOpen && canManageInventory && renderMovementForm('finished', 'Post finished-goods movement', ['Opening Stock', 'Dispatch', 'Return', 'Damage', 'Adjustment In', 'Adjustment Out', 'Reserve', 'Release Reservation'], 'Opening Stock')}
        <div className="table-card entries-table inventory-table"><table><thead><tr><th>SKU</th><th>Product</th><th>Produced</th><th>Approved</th><th>Dispatched</th><th>Returned</th><th>Damaged</th><th>Reserved</th><th>Available</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {finishedRows.map(({ product, item }) => {
            const available = item?.availableStock || 0
            const hasHistory = hasItemMovement('finished', product.sku)
            return <tr key={product.sku}><td><code>{product.sku}</code></td><td>{product.name}</td><td>{item?.productionReceived || 0}</td><td>{item?.qualityApproved || 0}</td><td>{item?.dispatchedStock || 0}</td><td>{item?.returnedStock || 0}</td><td>{item?.damagedStock || 0}</td><td>{item?.reservedStock || 0}</td><td><b className={available < 10 ? 'stock-low' : 'stock-good'}>{available}</b></td><td><span className={`status ${item?.status.toLowerCase() === 'archived' ? 'draft' : 'active'}`}>{item?.status || 'Not initialized'}</span></td><td>{!item || item.status.toLowerCase() === 'archived' ? '—' : available === 0 && !hasHistory ? <button className="text-action danger" onClick={() => void confirmDeleteUnused('finished', product.sku)}>Delete unused</button> : available === 0 ? <button className="text-action" onClick={() => void confirmArchive('finished', product.sku)}>Archive</button> : '—'}</td></tr>
          })}
        </tbody></table>
          {finishedRows.length === 0 && <div className="empty-state"><Package size={26} /><strong>No active products or SKUs</strong><span>Add products in Product Master or SKU Manager first.</span></div>}
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
          <div className="stat-card"><span>Raw material SKUs</span><strong>{activeRaw.length}</strong><small>{lowStock.length} at or below reorder level</small></div>
          <div className="stat-card"><span>Raw material on hand</span><strong>{activeRaw.reduce((sum, item) => sum + item.closingStock, 0).toLocaleString('en-IN')}</strong><small>Across active materials</small></div>
          <div className="stat-card"><span>Finished goods SKUs</span><strong>{activeFinished.length}</strong><small>Production and returned stock</small></div>
          <div className="stat-card"><span>Finished goods available</span><strong>{activeFinished.reduce((sum, item) => sum + item.availableStock, 0).toLocaleString('en-IN')}</strong><small>After dispatch, damage and reservations</small></div>
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
    return (
      <section>
        <div className="page-heading"><div><p>FINISHED GOODS · {isShipping ? 'DISPATCH' : 'RETURNS'}</p><h1>{module}</h1></div></div>
        {renderMovementForm('finished', isShipping ? 'Record dispatch' : 'Record return or damage', relevantTypes, relevantTypes[0])}
        <div className="table-card entries-table inventory-table"><MovementTable movements={relevantMovements} /></div>
      </section>
    )
  }

  if (module === 'Machines') {
    const exportMachines = () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(machines), 'Machines')
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
          department: String(form.get('department')),
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
            <label>Department<input name="department" placeholder="Department" /></label>
            <label>Operator<input name="operator" placeholder="Operator name" /></label>
            <label>Status<select name="status"><option>Idle</option><option>Running</option><option>Maintenance</option></select></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Add machine</button>
        </form>}
        <div className="table-card entries-table"><table><thead><tr><th>Machine ID</th><th>Name</th><th>Type</th><th>Department</th><th>Operator</th><th>Status</th></tr></thead><tbody>{machines.map(machine => <tr key={machine.id}><td><code>{machine.id}</code></td><td>{machine.name || '—'}</td><td>{machine.type || '—'}</td><td>{machine.department || '—'}</td><td>{machine.operator || '—'}</td><td><span className="status active">{machine.status}</span></td></tr>)}</tbody></table>{machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machines configured</strong><span>The Super Admin can add machines.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Product Master' || module === 'SKU Manager' || module === 'Marketplace Listings') {
    const tableProducts = module === 'Product Master'
      ? filteredProducts.filter(product => !product.isVariant)
      : module === 'SKU Manager'
        ? filteredProducts.filter(product => product.isVariant)
        : filteredProducts
    const masterProducts = products.filter(product => !product.isVariant && product.status === 'Active')
    return (
      <section>
        <div className="page-heading">
          <div><p>{module.toUpperCase()}</p><h1>{module}</h1></div>
          <div className="heading-actions">
            {module !== 'Marketplace Listings' && <button className="primary" onClick={() => setCatalogFormOpen(open => !open)}><Plus size={17} /> {module === 'Product Master' ? 'Add product' : 'Add SKU variant'}</button>}
            {module === 'Marketplace Listings' && <button className="primary" onClick={() => notify('Marketplace listing setup is not connected yet')}><Plus size={17} /> Add listing</button>}
          </div>
        </div>
        {catalogFormOpen && module === 'Product Master' && <form className="panel form-card" onSubmit={submitCatalogProduct}>
          <div className="panel-heading"><div><h2>Add product</h2><p>Save a master product to the shared Excel workbook.</p></div></div>
          <div className="field-grid">
            <label>Master SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. COTTON-SHIRT-01" /></label>
            <label>Product name<input name="name" required maxLength={180} placeholder="Product title" /></label>
            <label>Category<input name="category" maxLength={100} placeholder="e.g. Shirts" /></label>
            <label>MRP<input name="mrp" type="number" min="0" step="0.01" required placeholder="0.00" /></label>
          </div>
          <button className="primary wide" type="submit"><Plus size={17} /> Save product to Excel</button>
        </form>}
        {catalogFormOpen && module === 'SKU Manager' && <form className="panel form-card" onSubmit={submitSkuVariant}>
          <div className="panel-heading"><div><h2>Add SKU variant</h2><p>Link a size/color SKU to its master product.</p></div></div>
          {masterProducts.length === 0 && <p className="local-storage-note">Add a master product in Product Master first.</p>}
          <div className="field-grid">
            <label>Master product<select name="masterSku" required disabled={masterProducts.length === 0}><option value="">Select product</option>{masterProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}</option>)}</select></label>
            <label>Variant SKU<input name="sku" required maxLength={100} autoComplete="off" placeholder="e.g. COTTON-SHIRT-01-BLK-M" /></label>
            <label>Size<input name="size" maxLength={60} placeholder="e.g. M" /></label>
            <label>Color<input name="color" maxLength={60} placeholder="e.g. Black" /></label>
            <label>Pack quantity<input name="packQuantity" type="number" min="1" step="1" required defaultValue="1" /></label>
            <label>MRP<input name="mrp" type="number" min="0" step="0.01" placeholder="Uses master product MRP" /></label>
            <label>Selling price<input name="sellingPrice" type="number" min="0" step="0.01" placeholder="Uses variant MRP" /></label>
          </div>
          <button className="primary wide" type="submit" disabled={masterProducts.length === 0}><Plus size={17} /> Save SKU to Excel</button>
        </form>}
        <div className="toolbar">
          <div className="table-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, SKU or barcode" /></div>
          <button className="secondary" onClick={exportExcel}><Download size={16} /> Export</button>
        </div>
        <div className="table-card">
          <table>
            <thead><tr><th>Product</th><th>{module === 'SKU Manager' ? 'Variant SKU' : 'SKU'}</th>{module === 'SKU Manager' && <th>Master SKU</th>}<th>{module === 'SKU Manager' ? 'Size / color' : 'Category'}</th><th>MRP</th><th>Stock</th><th>Status</th></tr></thead>
            <tbody>
              {tableProducts.map(product => (
                <tr key={product.id}>
                  <td><div className="product-cell"><div className="product-thumb"><Package size={18} /></div><div><strong>{product.name}</strong><span>{product.id}</span></div></div></td>
                  <td><code>{product.sku}</code></td>
                  {module === 'SKU Manager' && <td><code>{product.masterSku}</code></td>}
                  <td>{module === 'SKU Manager' ? [product.size, product.color].filter(Boolean).join(' · ') || '—' : product.category}</td>
                  <td>₹{product.mrp.toLocaleString('en-IN')}</td>
                  <td><b className={product.stock < 50 ? 'stock-low' : 'stock-good'}>{product.stock}</b></td>
                  <td><span className={`status ${product.status.toLowerCase()}`}>{product.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {tableProducts.length === 0 && <div className="empty-state"><Package size={28} /><strong>No matching records</strong><span>{module === 'Product Master' ? 'Add a master product to start the catalog.' : module === 'SKU Manager' ? 'Add a product variant to make it selectable for production.' : 'No listings are connected yet.'}</span></div>}
        </div>
      </section>
    )
  }

  if (module === 'Production') {
    const today = indiaDateKey()
    const month = today.slice(0, 7)
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
        <div className="page-heading"><div><p>FACTORY · {today}</p><h1>Production</h1></div><div className="heading-actions"><button className="secondary" onClick={exportDailyReport}><Download size={17} /> Daily Excel</button><button className="primary" onClick={exportMonthlyReport}><FileSpreadsheet size={17} /> Monthly Excel</button></div></div>
        <div className="form-grid">
          <form className="panel form-card" onSubmit={submitProduction}>
            <div className="panel-heading"><div><h2>Quick production entry</h2><p>Record actual quantities by machine</p></div></div>
            <div className="field-grid">
              <label>Date<input name="date" type="date" required defaultValue={today} /></label>
              <label>Machine<select name="machine" required disabled={availableMachines.length === 0}><option value="">Select machine</option>{availableMachines.map(machine => <option key={machine.id} value={machine.id}>{machine.id}{machine.name ? ` — ${machine.name}` : ''}</option>)}</select></label>
              <label>Product + SKU<select name="sku" required disabled={activeProducts.length === 0}><option value="">Select product and SKU</option>{activeProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}{[product.size, product.color].filter(Boolean).length ? ` · ${[product.size, product.color].filter(Boolean).join(' / ')}` : ''}</option>)}</select></label>
              <label>Actual quantity<input name="actual" type="number" min="1" step="1" required /></label>
              <label>Rejected quantity<input name="rejected" type="number" min="0" step="1" defaultValue="0" required /></label>
            </div>
            {(activeProducts.length === 0 || availableMachines.length === 0) && <p className="local-storage-note">{activeProducts.length === 0 ? 'No active SKUs yet. Ask the Super Admin to add products and variants.' : ''}{activeProducts.length === 0 && availableMachines.length === 0 ? ' ' : ''}{availableMachines.length === 0 ? 'No working machines configured. Ask the Super Admin to add a machine.' : ''}</p>}
            <button className="primary wide" type="submit" disabled={activeProducts.length === 0 || availableMachines.length === 0}><Plus size={17} /> Save production record</button>
          </form>
          <div className="panel time-card">
            <div className="panel-heading"><div><h2>Production blocks</h2><p>Break periods are excluded</p></div></div>
            {['09:30 AM – 12:30 PM', '01:00 PM – 04:00 PM', '04:20 PM – 07:00 PM'].map((time, i) => <div className="time-row" key={time}><span>Block {i + 1}</span><strong>{time}</strong></div>)}
            <div className="break-note"><AlertTriangle size={16} /> Break time is not counted as production time.</div>
          </div>
        </div>
        <div className="table-card entries-table"><table><thead><tr><th>Date</th><th>Machine</th><th>Product</th><th>SKU</th><th>Actual</th><th>Rejected</th><th>Entered by</th></tr></thead><tbody>{visibleProduction.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.machine}</td><td>{row.product}</td><td><code>{row.sku}</code></td><td>{row.actual}</td><td>{row.rejected}</td><td>{row.createdBy || '—'}</td></tr>)}</tbody></table>{visibleProduction.length === 0 && <div className="empty-state"><ClipboardCheck size={24} /><strong>No production entries today</strong><span>Records will appear after saving.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Excel Management') {
    return (
      <section>
        <div className="page-heading"><div><p>DATA CONTROL</p><h1>Excel Management</h1></div><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17} /> Validate Excel</button></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} />
        <div className="excel-status-grid">
          <div className="panel provider-card"><div className="provider-icon"><FileSpreadsheet size={24} /></div><div><span>Master workbook</span><strong>{workbookMeta.name}</strong></div><b className={workbookMeta.loaded ? 'status active' : 'status pending'}>{workbookMeta.loaded ? 'Connected' : 'Not loaded'}</b></div>
          <div className="panel sync-card"><span>Workbook structure</span><strong>{workbookMeta.sheetCount || 17} sheets detected</strong><small>{workbookMeta.loaded ? 'Shared Google Sheet is active.' : 'Sign in after deploying Apps Script and configuring Vercel.'}</small></div>
        </div>
        <div className="panel setup-card">
          <div className="panel-heading"><div><h2>Shared workbook</h2><p>Catalog, machine, and production changes are backed up and saved to Google Sheets.</p></div></div>
          <p className="local-storage-note">Excel file uploads are preview-only. To make shared changes, use Product Master, SKU Manager, and Machines.</p>
        </div>
        <div className="panel table-card excel-table"><div className="panel-heading"><div><h2>Import history</h2><p>Local preview imports and validation results</p></div></div><div className="empty-state"><FileSpreadsheet size={28} /><strong>Uploads are not saved to Drive</strong><span>Validate a spreadsheet here, then use Product Master or SKU Manager to save shared catalog entries.</span></div></div>
      </section>
    )
  }

  if (module === 'User Management') {
    if (sessionUser.role !== 'Super Admin') return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Only the Super Admin can manage users.</span></div></section>
    const exportUsers = () => {
      const safeRows = users.map(({ id, name, username, role, active }) => ({ ID: id, Name: name, Username: username, Role: role, Status: active ? 'Active' : 'Inactive' }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeRows), 'User Accounts')
      XLSX.writeFile(workbook, `Mahalaxmi-Users-${indiaDateKey()}.xlsx`)
      notify('User list exported without password data')
    }
    const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const username = String(form.get('username')).trim().toLowerCase()
      const password = String(form.get('password'))
      const requestedRole = String(form.get('role'))
      if (password.length < 10) {
        notify('Password must be at least 10 characters')
        return
      }
      if (!['Production Supervisor', 'Machine Operator', 'Store Manager'].includes(requestedRole)) {
        notify('Only one Super Admin is allowed')
        return
      }
      if (!username) return
      try {
        const result = await apiFetch<{ user: UserAccount }>('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: String(form.get('name')), username, password, role: requestedRole }),
        })
        setUsers(prev => [...prev, result.user])
        log(`Created ${result.user.role} account ${result.user.username}`)
        notify('Account saved to the master workbook')
        event.currentTarget.reset()
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
        <div className="page-heading"><div><p>ADMINISTRATION</p><h1>User Management</h1></div><button className="secondary" onClick={exportUsers}><Download size={16} /> Export users</button></div>
        <div className="form-grid">
          <form className="panel form-card" onSubmit={createUser}>
            <div className="panel-heading"><div><h2>Create account</h2><p>Assign a role and secure login</p></div></div>
            <div className="field-grid">
              <label>Full name<input name="name" required placeholder="Employee name" /></label>
              <label>Username<input name="username" required autoComplete="off" placeholder="login name" /></label>
              <label>Password<input name="password" type="password" required minLength={10} placeholder="Minimum 10 characters" /></label>
              <label>Role<select name="role" required><option>Production Supervisor</option><option>Machine Operator</option><option>Store Manager</option></select></label>
            </div>
            <button className="primary wide" type="submit"><Plus size={17} /> Create account</button>
          </form>
        </div>
        <p className="local-storage-note">User accounts and password hashes are stored in the connected workbook. Users can sign in from any device on the deployed site.</p>
        <div className="table-card entries-table"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>{users.map(user => <tr key={user.id}><td>{user.name}</td><td><code>{user.username}</code></td><td>{user.role}</td><td><span className={`status ${user.active ? 'active' : 'draft'}`}>{user.active ? 'Active' : 'Inactive'}</span></td><td><button className="secondary" disabled={user.id === sessionUser.id} onClick={() => setAccountActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
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

function MovementTable({ movements }: { movements: StockMovement[] }) {
  return (
    <>
      <table aria-label="Stock movement history"><thead><tr><th>Date / time</th><th>Item</th><th>SKU</th><th>Movement</th><th>Quantity</th><th>Balance</th><th>Reference</th><th>Reason</th><th>Entered by</th></tr></thead><tbody>
        {movements.map(movement => <tr key={movement.id}>
          <td>{movement.date ? movement.date.replace('T', ' ').slice(0, 19) : '—'}</td>
          <td>{movement.itemType || '—'}</td>
          <td><code>{movement.sku}</code></td>
          <td>{movement.type}</td>
          <td>{movement.quantity.toLocaleString('en-IN')}</td>
          <td>{movement.openingStock.toLocaleString('en-IN')} → {movement.closingStock.toLocaleString('en-IN')}</td>
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
  machines: Machine[]
  productionChart: { name: string; qty: number }[]
  setModule: (module: Module) => void
  exportExcel: () => void
}

function DashboardView({
  role, user, users, products, production, machines, productionChart, setModule, exportExcel,
}: DashboardViewProps) {
  if (role === 'Store Manager') {
    return (
      <section>
        <div className="page-heading"><div><p>STORE MANAGER</p><h1>Workspace restricted</h1></div></div>
        <div className="panel placeholder"><div className="placeholder-icon"><LockKeyhole size={28} /></div><h2>Admin-only modules</h2><p>Inventory, stock movements, and management modules are available only from the Super Admin workspace.</p></div>
      </section>
    )
  }
  const today = indiaDateKey()
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
  const roleCounts = (['Production Supervisor', 'Machine Operator', 'Store Manager'] as Role[])
    .map(accountRole => ({
      role: accountRole,
      count: users.filter(account => account.role === accountRole).length,
      active: users.filter(account => account.role === accountRole && account.active).length,
    }))
  const machineStatusCount = (status: string) => machines.filter(machine => machine.status.toLowerCase() === status).length

  const descriptions: Record<Role, string> = {
    'Super Admin': 'Manage the full ERP, inventory, factory operations, and team access.',
    'Production Supervisor': 'Record production and review assigned factory operations. Inventory and management are Admin-only.',
    'Machine Operator': 'Record your daily output and review your own production entries.',
    'Store Manager': 'Inventory and management workspaces are available only to the Super Admin.',
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
  }
  const shortcuts: Record<Role, { module: Module; detail: string }[]> = {
    'Super Admin': [
      { module: 'User Management', detail: 'Create accounts and assign team roles' },
      { module: 'Inventory', detail: 'Review raw materials and finished goods' },
      { module: 'Product Master', detail: 'Create products and master SKUs' },
      { module: 'Machines', detail: 'Configure machines and availability' },
      { module: 'Stock Movement', detail: 'Audit the complete stock ledger' },
    ],
    'Production Supervisor': [
      { module: 'Production', detail: 'Enter output and export production reports' },
      { module: 'Stitching', detail: 'Review stitching work' },
      { module: 'Quality Control', detail: 'Review quality checks' },
    ],
    'Machine Operator': [
      { module: 'Production', detail: 'Record output by machine and SKU' },
    ],
    'Store Manager': [],
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

      <div className="dashboard-grid">
        <section className="panel production-panel">
          <div className="panel-heading"><div><h2>{role === 'Production Supervisor' ? 'Factory production' : role === 'Super Admin' ? 'Factory production' : 'My production overview'}</h2><p>Actual output over the last 7 days</p></div><button className="text-button" onClick={() => setModule('Production')}>Open production</button></div>
          <div className="chart-stat"><strong>{production.reduce((sum, row) => sum + row.actual, 0)}</strong><span><ArrowUpRight size={14} /> 7 days</span></div>
          <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={productionChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="qty" fill="#4f46e5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
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
            <div className="machine-list">{machines.slice(0, 4).map(machine => <div className="machine-row" key={machine.id}><div className="machine-icon"><Gauge size={17} /></div><div><strong>{machine.id}</strong><span>{machine.name || machine.department || 'Machine'}</span></div><b className={machine.status.toLowerCase() === 'maintenance' ? 'warning' : ''}>{machine.status}</b></div>)}</div>
            {machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machine records</strong><span>Ask the Super Admin to configure machines.</span></div>}
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
            <div className="dashboard-table"><table><thead><tr><th>Date</th><th>SKU</th><th>Actual</th><th>Rejected</th><th>Entered by</th></tr></thead><tbody>{recentProduction.map(row => <tr key={row.id}><td>{row.date}</td><td><code>{row.sku}</code></td><td>{row.actual}</td><td>{row.rejected}</td><td>{role === 'Production Supervisor' || role === 'Super Admin' ? row.createdBy || '—' : user.name}</td></tr>)}</tbody></table></div>
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
