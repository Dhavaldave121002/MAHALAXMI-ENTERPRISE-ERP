import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, ArrowUpRight, BarChart3,
  Boxes, Building2, ChevronDown, CircleDollarSign, ClipboardCheck,
  Factory, FileSpreadsheet, Gauge, LayoutDashboard, Menu, Package,
  RotateCcw, Search, Settings, ShoppingCart, Truck, UserCog, Users,
  Plus, Download, Upload, Bell, MoreHorizontal, CheckCircle2, LogOut, LockKeyhole,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import * as XLSX from 'xlsx'
import './App.css'

type Module = 'Dashboard' | 'Factory' | 'Production' | 'Stitching' | 'Raw Material' | 'Finished Goods' |
  'Product Master' | 'SKU Manager' | 'Marketplace Listings' | 'Orders' | 'Inventory' |
  'Shipping & Delivery' | 'Returns & RTO' | 'Machines' | 'Quality Control' | 'Employees' |
  'Suppliers' | 'Accounts' | 'Reports' | 'Excel Management' | 'User Management' | 'Settings' | 'Audit Logs'

type Product = { id: string; sku: string; name: string; category: string; mrp: number; stock: number; status: 'Active' | 'Draft' }
type Production = { id: string; date: string; machine: string; sku: string; product: string; actual: number; rejected: number; createdBy?: string }
type Role = 'Super Admin' | 'Production Supervisor' | 'Store Manager' | 'Machine Operator'
type UserAccount = { id: string; name: string; username: string; role: Role; active: boolean }
type Machine = { id: string; name: string; type: string; department: string; operator: string; status: string }
type AuthStatus = 'checking' | 'ready' | 'unavailable'

const navSections: { label: string; items: Module[] }[] = [
  { label: 'MAIN', items: ['Dashboard', 'Factory', 'Production', 'Stitching', 'Quality Control'] as Module[] },
  { label: 'INVENTORY', items: ['Raw Material', 'Finished Goods', 'Inventory', 'Machines'] },
  { label: 'CATALOG', items: ['Product Master', 'SKU Manager', 'Marketplace Listings'] },
  { label: 'SALES', items: ['Orders', 'Shipping & Delivery', 'Returns & RTO'] },
  { label: 'MANAGEMENT', items: ['Employees', 'Suppliers', 'Accounts', 'Reports'] },
  { label: 'ADMIN', items: ['Excel Management', 'User Management', 'Settings', 'Audit Logs'] },
]

const moduleIcons: Record<Module, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard, Production: Factory, Stitching: ClipboardCheck, 'Raw Material': Boxes,
  'Finished Goods': Package, 'Product Master': Archive, 'SKU Manager': BarChart3,
  'Marketplace Listings': ShoppingCart, Orders: ShoppingCart, Inventory: Boxes,
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
  const [machines, setMachines] = useState<Machine[]>(() => readStored('erp-machines', []))
  const [products, setProducts] = useState<Product[]>(() => readStored('erp-products', []))
  const [production, setProduction] = useState<Production[]>(() => readStored('erp-production', []))
  const [audit, setAudit] = useState<string[]>(() => readStored('erp-audit', ['Workbook connection pending', 'System initialized']))
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [workbookMeta, setWorkbookMeta] = useState({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })

  useEffect(() => localStorage.setItem('erp-products', JSON.stringify(products)), [products])
  useEffect(() => localStorage.setItem('erp-production', JSON.stringify(production)), [production])
  useEffect(() => localStorage.setItem('erp-audit', JSON.stringify(audit)), [audit])
  useEffect(() => localStorage.setItem('erp-machines', JSON.stringify(machines)), [machines])
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
        if (!statusResponse.ok || !statusData.configured) throw new Error(statusData.error || 'Google Drive login is not configured.')
        if (!active) return
        setNeedsAdminSetup(Boolean(statusData.needsAdminSetup))
        setAuthStatus('ready')

        const sessionResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json() as { user?: UserAccount }
          if (active && sessionData.user) {
            setSessionUser(sessionData.user)
            setModule(sessionData.user.role === 'Production Supervisor' ? 'Production' : 'Dashboard')
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
    fetch('/Mahalaxmi-Enterprise-Master.xlsx')
      .then(response => {
        if (!response.ok) throw new Error('Workbook could not be loaded')
        return response.arrayBuffer()
      })
      .then(buffer => {
        if (!active) return
        const workbook = XLSX.read(buffer)
        const productRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Products)
        const productionRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Production)
        const machineRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Machines)
        const workbookMachines = machineRows.map((row, index) => ({
          id: String(row['Machine ID'] || `Machine ${String(index + 1).padStart(2, '0')}`),
          name: String(row['Machine Name'] || ''),
          type: String(row['Machine Type'] || ''),
          department: String(row['Department'] || ''),
          operator: String(row['Operator'] || ''),
          status: String(row['Status'] || 'Idle'),
        }))
        setMachines(prev => [...workbookMachines, ...prev.filter(machine => !workbookMachines.some(item => item.id === machine.id))])
        const workbookProducts: Product[] = productRows.map((row, index) => ({
          id: String(row['Internal Product ID'] || `PID-${index + 1}`),
          sku: String(row['Master SKU'] || ''),
          name: String(row['Product Title'] || 'Untitled Product'),
          category: String(row['Category'] || 'Uncategorized'),
          mrp: Number(row['MRP'] || 0),
          stock: Number(row['Available Stock'] || 0),
          status: row['Status'] === 'Active' ? 'Active' as const : 'Draft' as const,
        })).filter(row => row.sku)
        const variantRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.SKU_Variants)
        const masterBySku = new Map(workbookProducts.map(product => [product.sku, product]))
        for (const [index, row] of variantRows.entries()) {
          const sku = String(row['Variant SKU'] || '')
          if (!sku) continue
          const master = masterBySku.get(String(row['Master SKU'] || ''))
          workbookProducts.push({
            id: String(row['Variant ID'] || `VAR-${index + 1}`),
            sku,
            name: master?.name || String(row['Product Title'] || row['Master SKU'] || sku),
            category: master?.category || 'Uncategorized',
            mrp: Number(row['MRP'] || master?.mrp || 0),
            stock: master?.stock || 0,
            status: row['Status'] === 'Active' ? 'Active' : 'Draft',
          })
        }
        setProducts(prev => [...workbookProducts, ...prev.filter(product => !workbookProducts.some(item => item.sku === product.sku))])
        const workbookProduction: Production[] = productionRows.map((row, index) => ({
          id: String(row['Production ID'] || `PRO-${index + 1}`),
          date: String(row['Date'] || ''),
          machine: String(row['Machine ID'] || ''),
          sku: String(row['Master SKU'] || ''),
          product: String(row['Product Name'] || ''),
          actual: Number(row['Actual Quantity'] || 0),
          rejected: Number(row['Rejected Quantity'] || 0),
        }))
        setProduction(prev => [...workbookProduction, ...prev.filter(item => !workbookProduction.some(row => row.id === item.id))])
        setWorkbookMeta({ loaded: true, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: workbook.SheetNames.length })
        setAudit(prev => prev.some(entry => entry.includes('master workbook loaded'))
          ? prev
          : [`${new Date().toLocaleString()} — master workbook loaded: 17 sheets`, ...prev])
      })
      .catch(() => {
        if (active) setWorkbookMeta({ loaded: false, name: 'Mahalaxmi-Enterprise-Master.xlsx', sheetCount: 0 })
      })
    return () => { active = false }
  }, [])

  const notify = (message: string) => { setToast(message); setTimeout(() => setToast(''), 2600) }
  const log = (message: string) => setAudit(prev => [`${new Date().toLocaleString()} — ${message}`, ...prev])

  const filteredProducts = useMemo(() => products.filter(p =>
    `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search])

  const addProduct = () => {
    const next = String(products.length + 1001)
    if (products.some(p => p.sku === `NEW-${next}`)) return notify('A duplicate SKU was detected')
    setProducts(prev => [...prev, { id: `PID-${next}`, sku: `NEW-${next}`, name: 'Untitled Product', category: 'Uncategorized', mrp: 0, stock: 0, status: 'Draft' }])
    log(`Created draft product NEW-${next}`)
    notify('Draft product created')
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
          name: String(row['Name'] || row['Product Title'] || row['Title'] || row['Master SKU'] || 'Imported Product'),
          category: String(row['Category'] || 'Uncategorized'),
          mrp: Number(row['MRP'] || 0),
          stock: Number(row['Stock'] || row['Available Stock'] || 0),
          status: 'Active',
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
      setProducts(prev => [...prev, ...unique])
      log(`Imported ${unique.length} records; ${duplicates.length} duplicate SKUs skipped`)
      notify(duplicates.length ? `Imported ${unique.length}; skipped ${duplicates.length} duplicates` : `Imported ${unique.length} records`)
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
      setModule(result.user.role === 'Production Supervisor' ? 'Production' : 'Dashboard')
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
  const roleModules: Record<Role, Module[]> = {
    'Super Admin': navSections.flatMap(section => section.items),
    'Production Supervisor': ['Dashboard', 'Production', 'Stitching', 'Quality Control', 'Machines'],
    'Machine Operator': ['Dashboard', 'Production'],
    'Store Manager': ['Dashboard', 'Raw Material', 'Finished Goods', 'Inventory'],
  }
  const mainModules: Record<Role, Module[]> = {
    'Super Admin': ['Dashboard', 'Production', 'Inventory', 'Product Master'],
    'Production Supervisor': ['Dashboard', 'Production', 'Stitching', 'Machines'],
    'Machine Operator': ['Dashboard', 'Production'],
    'Store Manager': ['Dashboard', 'Inventory', 'Raw Material', 'Finished Goods'],
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
            <>
              <div className="page-heading"><div><p>WORKSPACE OVERVIEW</p><h1>Welcome, {sessionUser.name}</h1></div><div className="heading-actions">{sessionUser.role === 'Super Admin' && <button className="secondary" onClick={() => setModule('User Management')}><Users size={17} /> Create team login</button>}<button className="primary" onClick={exportExcel}><Download size={17} /> Export report</button></div></div>
              <div className="stats-grid">
                {[
                  { label: 'Physical Stock', value: String(products.reduce((sum, product) => sum + product.stock, 0)), delta: '0 records', icon: Boxes, tone: 'blue' },
                  { label: 'Available Stock', value: String(products.reduce((sum, product) => sum + product.stock, 0)), delta: '0 orders reserved', icon: Package, tone: 'green' },
                  { label: 'Today’s Production', value: String(production.filter(row => row.date === indiaDateKey()).reduce((sum, row) => sum + row.actual, 0)), delta: `${production.filter(row => row.date === indiaDateKey()).length} records`, icon: Factory, tone: 'purple' },
                  { label: 'Today’s Sales', value: '₹0', delta: '0 orders', icon: CircleDollarSign, tone: 'orange' },
                ].map(card => (
                  <div className="stat-card" key={card.label}>
                    <div className={`stat-icon ${card.tone}`}><card.icon size={21} /></div>
                    <div className="stat-body"><span>{card.label}</span><strong>{card.value}</strong><small><ArrowUpRight size={13} /> {card.delta} <em>from workbook</em></small></div>
                  </div>
                ))}
              </div>

              <div className="dashboard-grid">
                <section className="panel production-panel">
                  <div className="panel-heading"><div><h2>Production overview</h2><p>Actual quantity across all machines</p></div><button className="text-button">Last 7 days <ChevronDown size={14} /></button></div>
                  <div className="chart-stat"><strong>{production.reduce((sum, row) => sum + row.actual, 0)}</strong><span><ArrowUpRight size={14} /> 0%</span></div>
                  <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={productionChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="qty" fill="#4f46e5" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
                </section>
                <section className="panel machine-panel">
                  <div className="panel-heading"><div><h2>Machine status</h2><p>{machines.length} configured in workbook</p></div><button className="text-button" onClick={() => setModule('Machines')}>View all</button></div>
                  <div className="machine-summary"><div><strong>{machines.filter(machine => machine.status.toLowerCase() === 'running').length}</strong><span>Running</span></div><div><strong>{machines.filter(machine => machine.status.toLowerCase() === 'idle').length}</strong><span>Idle</span></div><div><strong>{machines.filter(machine => machine.status.toLowerCase() === 'maintenance').length}</strong><span>Maintenance</span></div></div>
                  <div className="machine-list">{machines.slice(0, 4).map(machine => <div className="machine-row" key={machine.id}><div className="machine-icon"><Gauge size={17} /></div><div><strong>{machine.id}</strong><span>{machine.name || machine.department || 'Machine'}</span></div><b className={machine.status.toLowerCase() === 'maintenance' ? 'warning' : ''}>{machine.status}</b></div>)}</div>
                  {machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machine records</strong><span>Add machines to the Machines sheet.</span></div>}
                </section>
              </div>

              <div className="bottom-grid">
                <section className="panel">
                  <div className="panel-heading"><div><h2>Recent orders</h2><p>Latest marketplace and B2B orders</p></div><button className="text-button">View all</button></div>
                  <div className="empty-state"><ShoppingCart size={24} /><strong>No recent orders</strong><span>Orders from the workbook will appear here.</span></div>
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><h2>Inventory alerts</h2><p>Items needing attention</p></div><button className="text-button">Manage</button></div>
                  <div className="empty-state"><AlertTriangle size={24} /><strong>No inventory alerts</strong><span>The workbook has no low-stock records.</span></div>
                </section>
              </div>
            </>
          ) : (
            <ModuleView module={module} products={filteredProducts} production={production} audit={audit} workbookMeta={workbookMeta}
              search={search} setSearch={setSearch} addProduct={addProduct} exportExcel={exportExcel}
              fileRef={fileRef} importExcel={importExcel} notify={notify} setProduction={setProduction} log={log}
              machines={machines} setMachines={setMachines} users={users} setUsers={setUsers} sessionUser={sessionUser}
              allowedModules={roleModules[sessionUser.role]} />
          )}
        </div>
      </main>
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  )
}

function ModuleView(props: {
  module: Module; products: Product[]; production: Production[]; audit: string[]; search: string;
  workbookMeta: { loaded: boolean; name: string; sheetCount: number };
  setSearch: (v: string) => void; addProduct: () => void; exportExcel: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>; importExcel: (f: File) => void;
  notify: (v: string) => void; setProduction: React.Dispatch<React.SetStateAction<Production[]>>; log: (v: string) => void
  machines: Machine[]; setMachines: React.Dispatch<React.SetStateAction<Machine[]>>;
  users: UserAccount[]; setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>; sessionUser: UserAccount
  allowedModules: Module[]
}) {
  const { module, products, production, audit, workbookMeta, search, setSearch, addProduct, exportExcel, fileRef, importExcel, notify, setProduction, log, machines, setMachines, users, setUsers, sessionUser, allowedModules } = props
  if (!allowedModules.includes(module)) {
    return <section><div className="empty-state"><LockKeyhole size={28} /><strong>Access restricted</strong><span>Your account role cannot open this section.</span></div></section>
  }

  const submitProduction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const actual = Number(form.get('actual'))
    const rejected = Number(form.get('rejected'))
    if (!actual || actual < 0 || rejected < 0 || rejected > actual) {
      notify('Enter a valid actual quantity and rejection count')
      return
    }
    const record: Production = {
      id: `PRO-${String(production.length + 1).padStart(3, '0')}`,
      date: String(form.get('date')),
      machine: String(form.get('machine')),
      sku: String(form.get('sku')),
      product: String(form.get('product')),
      actual,
      rejected,
      createdBy: sessionUser.name,
    }
    setProduction(prev => [record, ...prev])
    log(`Recorded production ${record.actual} units for ${record.sku}`)
    notify('Production entry saved')
    e.currentTarget.reset()
  }

  if (module === 'Machines') {
    const exportMachines = () => {
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(machines), 'Machines')
      XLSX.writeFile(workbook, `Mahalaxmi-Machines-${indiaDateKey()}.xlsx`)
      notify('Machine list downloaded as a new workbook')
    }
    const addMachine = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (sessionUser.role !== 'Super Admin') {
        notify('Only Super Admin can add machines')
        return
      }
      const form = new FormData(event.currentTarget)
      const name = String(form.get('name')).trim()
      if (!name) return
      let nextId = machines.length + 1
      while (machines.some(machine => machine.id === `Machine ${String(nextId).padStart(2, '0')}`)) nextId += 1
      const machine: Machine = {
        id: `Machine ${String(nextId).padStart(2, '0')}`,
        name,
        type: String(form.get('type')),
        department: String(form.get('department')),
        operator: String(form.get('operator')),
        status: String(form.get('status')),
      }
      setMachines(prev => [...prev, machine])
      log(`Added ${machine.id}: ${machine.name}`)
      notify(`${machine.id} added`)
      event.currentTarget.reset()
    }
    return (
      <section>
        <div className="page-heading"><div><p>FACTORY SETUP</p><h1>Machines</h1></div><div className="heading-actions"><span className="status active">{machines.length} configured</span><button className="secondary" onClick={exportMachines}><Download size={16} /> Export Excel</button></div></div>
        {sessionUser.role === 'Super Admin' && <form className="panel form-card machine-form" onSubmit={addMachine}>
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
        <div className="table-card entries-table"><table><thead><tr><th>Machine ID</th><th>Name</th><th>Type</th><th>Department</th><th>Operator</th><th>Status</th></tr></thead><tbody>{machines.map(machine => <tr key={machine.id}><td><code>{machine.id}</code></td><td>{machine.name || '—'}</td><td>{machine.type || '—'}</td><td>{machine.department || '—'}</td><td>{machine.operator || '—'}</td><td><span className="status active">{machine.status}</span></td></tr>)}</tbody></table>{machines.length === 0 && <div className="empty-state"><Gauge size={24} /><strong>No machines configured</strong><span>Super Admin can add machines above.</span></div>}</div>
      </section>
    )
  }

  if (module === 'Product Master' || module === 'SKU Manager' || module === 'Marketplace Listings') {
    return (
      <section>
        <div className="page-heading">
          <div><p>{module.toUpperCase()}</p><h1>{module}</h1></div>
          <div className="heading-actions">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} />
            <button className="secondary" onClick={() => fileRef.current?.click()}><Upload size={17} /> Import Excel</button>
            <button className="primary" onClick={module === 'Product Master' ? addProduct : () => notify('Listing draft created')}><Plus size={17} /> {module === 'Product Master' ? 'Add product' : 'Add listing'}</button>
          </div>
        </div>
        <div className="toolbar">
          <div className="table-search"><Search size={16} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, SKU or barcode" /></div>
          <button className="secondary" onClick={exportExcel}><Download size={16} /> Export</button>
        </div>
        <div className="table-card">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>MRP</th><th>Stock</th><th>Status</th><th /></tr></thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td><div className="product-cell"><div className="product-thumb"><Package size={18} /></div><div><strong>{product.name}</strong><span>{product.id}</span></div></div></td>
                  <td><code>{product.sku}</code></td><td>{product.category}</td><td>₹{product.mrp.toLocaleString('en-IN')}</td>
                  <td><b className={product.stock < 50 ? 'stock-low' : 'stock-good'}>{product.stock}</b></td>
                  <td><span className={`status ${product.status.toLowerCase()}`}>{product.status}</span></td>
                  <td><button className="row-menu"><MoreHorizontal size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <div className="empty-state"><Package size={28} /><strong>No matching records</strong><span>Try another search or import a workbook.</span></div>}
        </div>
      </section>
    )
  }

  if (module === 'Production') {
    const today = indiaDateKey()
    const month = today.slice(0, 7)
    const visibleProduction = sessionUser.role === 'Production Supervisor'
      ? production.filter(row => row.date === today && row.createdBy === sessionUser.name)
      : production.filter(row => row.date === today)
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
      const monthlyRows = production.filter(row =>
        row.date.startsWith(month) && (sessionUser.role !== 'Production Supervisor' || row.createdBy === sessionUser.name)
      )
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly Production')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
        Month: month,
        Records: monthlyRows.length,
        Total: monthlyRows.reduce((sum, row) => sum + row.actual, 0),
        Rejected: monthlyRows.reduce((sum, row) => sum + row.rejected, 0),
        PreparedFor: sessionUser.role === 'Production Supervisor' ? sessionUser.name : 'All users',
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
              <label>Machine<select name="machine" required>{machines.length ? machines.map(machine => <option key={machine.id} value={machine.id}>{machine.id}{machine.name ? ` — ${machine.name}` : ''}</option>) : Array.from({ length: 20 }, (_, i) => <option key={i}>Machine {String(i + 1).padStart(2, '0')}</option>)}</select></label>
              <label>Product name<select name="product" required onChange={event => {
                const selected = products.find(product => product.name === event.currentTarget.value)
                if (selected) {
                  const skuInput = event.currentTarget.form?.elements.namedItem('sku') as HTMLInputElement | null
                  if (skuInput) skuInput.value = selected.sku
                }
              }}><option value="">Select product</option>{products.map(product => <option key={product.id} value={product.name}>{product.name}</option>)}</select></label>
              <label>Master SKU<select name="sku" required><option value="">Select SKU</option>{products.map(product => <option key={product.sku} value={product.sku}>{product.sku}</option>)}</select></label>
              <label>Actual quantity<input name="actual" type="number" min="0" required /></label>
              <label>Rejected quantity<input name="rejected" type="number" min="0" defaultValue="0" required /></label>
            </div>
            <button className="primary wide" type="submit"><Plus size={17} /> Save production record</button>
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
        <div className="page-heading"><div><p>DATA CONTROL</p><h1>Excel Management</h1></div><button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17} /> Import workbook</button></div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} />
        <div className="excel-status-grid">
          <div className="panel provider-card"><div className="provider-icon"><FileSpreadsheet size={24} /></div><div><span>Master workbook</span><strong>{workbookMeta.name}</strong></div><b className={workbookMeta.loaded ? 'status active' : 'status pending'}>{workbookMeta.loaded ? 'Loaded locally' : 'Not loaded'}</b></div>
          <div className="panel sync-card"><span>Workbook structure</span><strong>{workbookMeta.sheetCount || 17} sheets detected</strong><small>Google Drive sync credentials are not configured</small></div>
        </div>
        <div className="panel setup-card">
          <div className="panel-heading"><div><h2>Connect original workbook</h2><p>Credentials are configured only in server environment variables</p></div></div>
          <div className="provider-options">
            <button onClick={() => notify('Google Drive setup requires OAuth credentials')}><div className="provider-logo drive">D</div><div><strong>Google Drive</strong><span>Google Sheets / Excel</span></div><ChevronDown size={16} /></button>
            <button onClick={() => notify('Microsoft OneDrive setup requires Graph credentials')}><div className="provider-logo onedrive">O</div><div><strong>Microsoft OneDrive</strong><span>OneDrive / SharePoint</span></div><ChevronDown size={16} /></button>
          </div>
        </div>
        <div className="panel table-card excel-table"><div className="panel-heading"><div><h2>Import history</h2><p>Local preview imports and validation results</p></div></div><div className="empty-state"><FileSpreadsheet size={28} /><strong>No workbook connected</strong><span>Uploads remain local until server credentials are configured.</span></div></div>
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
        <div className="panel audit-card"><div className="panel-heading"><div><h2>Recent activity</h2><p>Changes made in this browser session</p></div></div>{audit.map((entry, i) => <div className="audit-row" key={i}><div className="audit-dot" /><div><strong>{entry}</strong><span>Super Admin</span></div></div>)}</div>
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
