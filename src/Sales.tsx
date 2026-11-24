import { useMemo, useState } from 'react'
import { BarChart3, Download, FileSpreadsheet, Phone, Plus, Search, Target, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import type {
  SalesAccount, SalesActivity, SalesActivityType, SalesLead, SalesLeadImportRow, SalesLeadStatus,
  SalesOrder, SalesTarget, SalesTargetPeriod,
} from './salesTypes'

type SalesRole = 'Super Admin' | 'Production Supervisor' | 'Sales Executive'
type SalesProduct = { sku: string; name: string; mrp: number; stock: number; status: string; masterSku?: string; isVariant?: boolean }

function sellableProducts(products: SalesProduct[]) {
  const variantMasters = new Set(products
    .filter(product => product.isVariant && product.status === 'Active')
    .map(product => (product.masterSku || '').toLowerCase()))
  return products.filter(product => product.status === 'Active' &&
    (product.isVariant || !variantMasters.has(product.sku.toLowerCase())))
}

function currentIndiaDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function dateForSales(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function money(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function activeOrderAmount(order: SalesOrder) {
  return Math.round(Math.max(0, order.amount - order.unitPrice * order.cancelledQuantity) * 100) / 100
}

function achievement(actual: number, target: number) {
  return target > 0 ? `${Math.min(999, Math.round(actual / target * 100))}%` : '—'
}

function leadRowFromImport(row: Record<string, unknown>, rowIndex: number, salesUsers: SalesAccount[], defaultUserId: string): SalesLeadImportRow {
  const values = new Map(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), String(value ?? '').trim()]))
  const get = (...keys: string[]) => keys.map(key => values.get(key)).find(value => value) || ''
  const name = get('contactname', 'leadname', 'customername', 'name')
  const phone = get('phone', 'mobile', 'mobilenumber', 'contactnumber', 'phonenumber')
  if (!name || !phone) throw new Error(`Row ${rowIndex} needs Contact Name and Phone.`)
  const referenceUrl = get('referenceurl', 'pdflink', 'documentlink', 'formurl', 'link')
  if (referenceUrl && (!/^https:\/\/\S+$/i.test(referenceUrl) || referenceUrl.length > 2000)) {
    throw new Error(`Row ${rowIndex} has an invalid PDF/form URL. Use an HTTPS link.`)
  }
  const assignedValue = get('assignedto', 'salesperson', 'salesexecutive', 'assignedusername')
  const assignedUser = assignedValue
    ? salesUsers.find(user => user.username.toLowerCase() === assignedValue.toLowerCase() || user.name.toLowerCase() === assignedValue.toLowerCase())
    : undefined
  if (assignedValue && !assignedUser) throw new Error(`Row ${rowIndex} has an unknown Sales Executive: ${assignedValue}.`)
  return {
    name,
    company: get('company', 'companyname', 'business'),
    phone,
    email: get('email', 'emailaddress'),
    productInterest: get('productinterest', 'interest', 'product', 'requirement'),
    notes: get('notes', 'remarks', 'comment'),
    referenceUrl,
    assignedUserId: assignedUser?.id || defaultUserId,
  }
}

export function SalesDashboardView(props: {
  role: SalesRole
  currentUser: { id: string; name: string }
  salesUsers: SalesAccount[]
  leads: SalesLead[]
  activities: SalesActivity[]
  orders: SalesOrder[]
  targets: SalesTarget[]
  products: SalesProduct[]
  setTarget: (salesUserId: string, period: SalesTargetPeriod, periodKey: string, targetAmount: number) => Promise<void>
}) {
  const { role, currentUser, salesUsers, leads, activities, orders, targets, products, setTarget } = props
  const [selectedMonth, setSelectedMonth] = useState(() => currentIndiaDate().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(() => currentIndiaDate().slice(0, 4))
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({})
  const [savingTarget, setSavingTarget] = useState('')
  const [message, setMessage] = useState('')
  const monthActual = orders.filter(order => dateForSales(order.createdAt).slice(0, 7) === selectedMonth)
    .reduce((sum, order) => sum + activeOrderAmount(order), 0)
  const yearActual = orders.filter(order => dateForSales(order.createdAt).slice(0, 4) === selectedYear)
    .reduce((sum, order) => sum + activeOrderAmount(order), 0)
  const today = currentIndiaDate()
  const todayOrders = orders.filter(order => dateForSales(order.createdAt) === today)
  const todayActual = todayOrders.reduce((sum, order) => sum + activeOrderAmount(order), 0)
  const monthTarget = targets.find(target => target.salesUserId === currentUser.id && target.period === 'monthly' && target.periodKey === selectedMonth)?.targetAmount || 0
  const yearTarget = targets.find(target => target.salesUserId === currentUser.id && target.period === 'yearly' && target.periodKey === selectedYear)?.targetAmount || 0
  const availableProducts = sellableProducts(products)
  const stockUnits = availableProducts.reduce((total, product) => total + Math.max(0, product.stock), 0)
  const dueLeads = leads.filter(lead => lead.nextFollowUp && lead.nextFollowUp <= today && !['Converted', 'Lost'].includes(lead.status))
  const reportOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const targetRows = salesUsers.map(account => {
    const monthly = targets.find(target => target.salesUserId === account.id && target.period === 'monthly' && target.periodKey === selectedMonth)
    const yearly = targets.find(target => target.salesUserId === account.id && target.period === 'yearly' && target.periodKey === selectedYear)
    const accountOrders = orders.filter(order => order.salesUserId === account.id)
    const monthlyActual = accountOrders.filter(order => dateForSales(order.createdAt).slice(0, 7) === selectedMonth).reduce((sum, order) => sum + activeOrderAmount(order), 0)
    const yearlyActual = accountOrders.filter(order => dateForSales(order.createdAt).slice(0, 4) === selectedYear).reduce((sum, order) => sum + activeOrderAmount(order), 0)
    return { account, monthly, yearly, monthlyActual, yearlyActual }
  })

  const saveTarget = async (salesUserId: string, period: SalesTargetPeriod, periodKey: string, currentTarget: number) => {
    const key = `${salesUserId}:${period}:${periodKey}`
    const raw = targetDrafts[key] ?? String(currentTarget)
    const amount = Number(raw)
    if (!raw.trim() || !Number.isFinite(amount) || amount < 0 || amount > 100000000000) {
      setMessage('Enter a non-negative target amount.')
      return
    }
    setSavingTarget(key)
    setMessage('')
    try {
      await setTarget(salesUserId, period, periodKey, amount)
      setTargetDrafts(current => ({ ...current, [key]: String(amount) }))
      setMessage('Sales target saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sales target could not be saved.')
    } finally {
      setSavingTarget('')
    }
  }

  const exportReport = () => {
    const workbook = XLSX.utils.book_new()
    const summary = role === 'Sales Executive'
      ? [{
          Salesperson: currentUser.name,
          Month: selectedMonth,
          'Monthly Target': monthTarget,
          'Monthly Booked Amount': monthActual,
          'Monthly Achievement': achievement(monthActual, monthTarget),
          Year: selectedYear,
          'Yearly Target': yearTarget,
          'Yearly Booked Amount': yearActual,
          'Yearly Achievement': achievement(yearActual, yearTarget),
        }]
      : targetRows.map(row => ({
          Salesperson: row.account.name,
          Month: selectedMonth,
          'Monthly Target': row.monthly?.targetAmount || 0,
          'Monthly Booked Amount': row.monthlyActual,
          'Monthly Achievement': achievement(row.monthlyActual, row.monthly?.targetAmount || 0),
          Year: selectedYear,
          'Yearly Target': row.yearly?.targetAmount || 0,
          'Yearly Booked Amount': row.yearlyActual,
          'Yearly Achievement': achievement(row.yearlyActual, row.yearly?.targetAmount || 0),
        }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Target Summary')
    const monthlyOrders = reportOrders.filter(order => dateForSales(order.createdAt).slice(0, 7) === selectedMonth)
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyOrders.map(order => ({
      'Order ID': order.id,
      Date: dateForSales(order.createdAt),
      Salesperson: order.salesUserName,
      Customer: order.customerName,
      SKU: order.sku,
      Product: order.productName,
      Quantity: order.quantity,
      'Unit Price': order.unitPrice,
      'Booked Amount': order.amount,
      'Cancelled Amount': order.unitPrice * order.cancelledQuantity,
      Status: order.status,
    }))), 'Orders')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(leads.map(lead => ({
      Lead: lead.name,
      Company: lead.company,
      Phone: lead.phone,
      Email: lead.email,
      'Product Interest': lead.productInterest,
      'Assigned To': lead.assignedUserName,
      Status: lead.status,
      'Next Follow-Up': lead.nextFollowUp,
    }))), 'Leads')
    const leadNames = new Map(leads.map(lead => [lead.id, lead.name]))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(activities
      .filter(activity => dateForSales(activity.createdAt).slice(0, 7) === selectedMonth)
      .map(activity => ({
        Date: dateForSales(activity.createdAt),
        Salesperson: activity.createdByName,
        Lead: leadNames.get(activity.leadId) || activity.leadId,
        Type: activity.type,
        Outcome: activity.outcome,
        Notes: activity.notes,
        'Next Follow-Up': activity.nextFollowUp,
      }))), 'Daily Activities')
    XLSX.writeFile(workbook, `Mahalaxmi-Sales-Report-${selectedMonth}.xlsx`)
  }

  return (
    <section>
      <div className="page-heading">
        <div><p>SALES WORKSPACE</p><h1>{role === 'Sales Executive' ? `Welcome, ${currentUser.name}` : 'Sales Dashboard'}</h1><span className="dashboard-description">Booked order value updates monthly and yearly target progress automatically. New bookings reserve available stock.</span></div>
        <div className="heading-actions"><button className="secondary" onClick={exportReport}><Download size={16} /> Export sales report</button></div>
      </div>
      <div className="sales-period-filters">
        <label>Report month<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
        <label>Report year<input type="number" min="2000" max="2100" value={selectedYear} onChange={event => setSelectedYear(event.target.value)} /></label>
      </div>
      <div className="stats-grid sales-stats">
        <article className="stat-card"><div className="stat-icon blue"><BarChart3 size={20} /></div><div className="stat-body"><span>Booked today</span><strong>{money(todayActual)}</strong><small>{todayOrders.length} orders · {today}</small></div></article>
        <article className="stat-card"><div className="stat-icon green"><Target size={20} /></div><div className="stat-body"><span>Monthly booked / target</span><strong>{money(monthActual)} / {money(role === 'Sales Executive' ? monthTarget : targetRows.reduce((sum, row) => sum + (row.monthly?.targetAmount || 0), 0))}</strong><small>{selectedMonth} · active orders only</small></div></article>
        <article className="stat-card"><div className="stat-icon purple"><Target size={20} /></div><div className="stat-body"><span>Yearly booked / target</span><strong>{money(yearActual)} / {money(role === 'Sales Executive' ? yearTarget : targetRows.reduce((sum, row) => sum + (row.yearly?.targetAmount || 0), 0))}</strong><small>{selectedYear}</small></div></article>
        <article className="stat-card"><div className="stat-icon orange"><Phone size={20} /></div><div className="stat-body"><span>Available finished stock</span><strong>{stockUnits.toLocaleString('en-IN')}</strong><small>{availableProducts.filter(product => product.stock > 0).length} stocked SKUs · {dueLeads.length} follow-ups due</small></div></article>
      </div>
      {role !== 'Sales Executive' && <section className="panel sales-target-panel">
        <div className="panel-heading"><div><h2>Salesperson targets and progress</h2><p>Set targets per active Sales Executive; booked amounts update automatically.</p></div></div>
        {targetRows.length ? <div className="table-card entries-table"><table><thead><tr><th>Sales Executive</th><th>Monthly target / actual</th><th>Monthly progress</th><th>Yearly target / actual</th><th>Yearly progress</th><th /></tr></thead><tbody>
          {targetRows.map(({ account, monthly, yearly, monthlyActual, yearlyActual }) => {
            const monthlyKey = `${account.id}:monthly:${selectedMonth}`
            const yearlyKey = `${account.id}:yearly:${selectedYear}`
            return <tr key={account.id}>
              <td><strong>{account.name}</strong><small>{account.username}</small></td>
              <td>{role === 'Super Admin'
                ? <label className="sales-target-input"><span>{money(monthlyActual)} actual</span><input aria-label={`${account.name} monthly sales target`} type="number" min="0" step="0.01" value={targetDrafts[monthlyKey] ?? String(monthly?.targetAmount || 0)} onChange={event => setTargetDrafts(current => ({ ...current, [monthlyKey]: event.target.value }))} /></label>
                : <><strong>{money(monthly?.targetAmount || 0)}</strong><small>{money(monthlyActual)} actual</small></>}</td>
              <td>{achievement(monthlyActual, monthly?.targetAmount || 0)}</td>
              <td>{role === 'Super Admin'
                ? <label className="sales-target-input"><span>{money(yearlyActual)} actual</span><input aria-label={`${account.name} yearly sales target`} type="number" min="0" step="0.01" value={targetDrafts[yearlyKey] ?? String(yearly?.targetAmount || 0)} onChange={event => setTargetDrafts(current => ({ ...current, [yearlyKey]: event.target.value }))} /></label>
                : <><strong>{money(yearly?.targetAmount || 0)}</strong><small>{money(yearlyActual)} actual</small></>}</td>
              <td>{achievement(yearlyActual, yearly?.targetAmount || 0)}</td>
              <td>{role === 'Super Admin' && <div className="sales-target-actions"><button className="secondary" disabled={savingTarget === monthlyKey} onClick={() => void saveTarget(account.id, 'monthly', selectedMonth, monthly?.targetAmount || 0)}>Save month</button><button className="secondary" disabled={savingTarget === yearlyKey} onClick={() => void saveTarget(account.id, 'yearly', selectedYear, yearly?.targetAmount || 0)}>Save year</button></div>}</td>
            </tr>
          })}
        </tbody></table></div> : <div className="empty-state"><Target size={22} /><strong>No active Sales Executive accounts</strong><span>Create one in User Management to assign leads and targets.</span></div>}
        {message && <p className="sales-message" role="status">{message}</p>}
      </section>}
      {role === 'Sales Executive' && <div className="sales-target-progress">
        <div className="panel"><div className="panel-heading"><div><h2>Monthly target</h2><p>{selectedMonth}</p></div><strong>{achievement(monthActual, monthTarget)}</strong></div><div className="sales-progress"><span style={{ width: `${monthTarget ? Math.min(100, monthActual / monthTarget * 100) : 0}%` }} /></div><p className="sales-progress-copy">{money(monthActual)} booked of {money(monthTarget)}</p></div>
        <div className="panel"><div className="panel-heading"><div><h2>Yearly target</h2><p>{selectedYear}</p></div><strong>{achievement(yearActual, yearTarget)}</strong></div><div className="sales-progress"><span style={{ width: `${yearTarget ? Math.min(100, yearActual / yearTarget * 100) : 0}%` }} /></div><p className="sales-progress-copy">{money(yearActual)} booked of {money(yearTarget)}</p></div>
      </div>}
      <section className="panel sales-dashboard-orders">
        <div className="panel-heading"><div><h2>Recent sales orders</h2><p>{reportOrders.length} bookings · {role === 'Sales Executive' ? 'your orders' : 'all sales accounts'}</p></div></div>
        {reportOrders.length ? <div className="table-card entries-table"><table><thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>SKU / product</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {reportOrders.slice(0, 8).map(order => <tr key={order.id}><td>{dateForSales(order.createdAt)}</td><td><code>{order.id}</code></td><td>{order.customerName}<small>{order.salesUserName}</small></td><td><code>{order.sku}</code><small>{order.productName}</small></td><td>{order.quantity}</td><td>{money(activeOrderAmount(order))}</td><td><span className={`status ${order.status === 'Booked' ? 'pending' : 'active'}`}>{order.status}</span></td></tr>)}
        </tbody></table></div> : <div className="empty-state"><BarChart3 size={22} /><strong>No sales bookings yet</strong><span>Booked order values will appear here and update target progress.</span></div>}
      </section>
    </section>
  )
}

export function SalesLeadsView(props: {
  role: SalesRole
  leads: SalesLead[]
  activities: SalesActivity[]
  salesUsers: SalesAccount[]
  importLeads: (rows: SalesLeadImportRow[], assignedUserId: string) => Promise<{ added: number; skipped: number }>
  addLead: (lead: Omit<SalesLeadImportRow, 'assignedUserId'> & { assignedUserId: string }) => Promise<void>
  assignLead: (leadId: string, assignedUserId: string) => Promise<void>
  updateLead: (input: { leadId: string; status: SalesLeadStatus; activityType: SalesActivityType; outcome: string; notes: string; nextFollowUp: string }) => Promise<void>
}) {
  const { role, leads, activities, salesUsers, importLeads, addLead, assignLead, updateLead } = props
  const [query, setQuery] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [defaultUserId, setDefaultUserId] = useState('')
  const [fileName, setFileName] = useState('')
  const [importRows, setImportRows] = useState<SalesLeadImportRow[]>([])
  const [importMessage, setImportMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return leads.filter(lead => !normalized || [lead.name, lead.company, lead.phone, lead.email, lead.productInterest].some(value => value.toLowerCase().includes(normalized)))
  }, [leads, query])
  const selectedLead = leads.find(lead => lead.id === selectedLeadId) || visibleLeads[0] || leads[0]
  const selectedActivities = activities.filter(activity => activity.leadId === selectedLead?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const canEdit = role === 'Sales Executive' || role === 'Super Admin'

  const loadFile = async (file?: File) => {
    setImportMessage('')
    setImportRows([])
    if (!file) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Lead workbook must be 5 MB or smaller.')
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose an .xlsx, .xls, or .csv lead file.')
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error('The selected file has no worksheet.')
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
      if (!rows.length || rows.length > 500) throw new Error('The file must contain between 1 and 500 lead rows.')
      if (role === 'Super Admin' && !defaultUserId && !Object.keys(rows[0]).some(key => /assigned|salesperson/i.test(key))) {
        throw new Error('Choose a Sales Executive, or include an Assigned To column.')
      }
      const converted = rows.map((row, index) => leadRowFromImport(row, index + 2, salesUsers, defaultUserId))
      if (converted.some(row => !row.assignedUserId)) throw new Error('Each lead must be assigned to an active Sales Executive.')
      setImportRows(converted)
      setFileName(file.name)
      setImportMessage(`${converted.length} lead rows ready to import. Duplicate phone numbers are skipped.`)
    } catch (error) {
      setFileName('')
      setImportMessage(error instanceof Error ? error.message : 'Lead file could not be read.')
    }
  }

  const submitImport = async () => {
    if (!importRows.length) return
    setBusy(true)
    setImportMessage('')
    try {
      const defaultAssignee = defaultUserId || importRows[0].assignedUserId
      const result = await importLeads(importRows, defaultAssignee)
      setImportRows([])
      setFileName('')
      setImportMessage(`${result.added} leads imported; ${result.skipped} duplicate phone numbers skipped.`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Lead import failed.')
    } finally {
      setBusy(false)
    }
  }

  const submitManualLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    try {
      await addLead({
        name: String(values.get('name') || '').trim(),
        company: String(values.get('company') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        email: String(values.get('email') || '').trim(),
        productInterest: String(values.get('productInterest') || '').trim(),
        notes: String(values.get('notes') || '').trim(),
        referenceUrl: String(values.get('referenceUrl') || '').trim(),
        assignedUserId: String(values.get('assignedUserId') || ''),
      })
      form.reset()
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Lead could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      'Contact Name': 'Example Customer',
      Company: 'Example Company',
      Phone: '+91 9876543210',
      Email: 'customer@example.com',
      'Product Interest': 'Product or requirement',
      Notes: 'Initial enquiry details',
      'Reference URL': 'https://example.com/lead-details.pdf',
      'Assigned To': '',
    }]), 'Leads')
    XLSX.writeFile(workbook, 'Mahalaxmi-Sales-Leads-Template.xlsx')
  }

  return (
    <section>
      <div className="page-heading"><div><p>SALES PIPELINE</p><h1>Leads and follow-ups</h1><span className="dashboard-description">Log each call or meeting, record the result, and set the next follow-up date.</span></div>{role === 'Super Admin' && <div className="heading-actions"><label className="secondary sales-upload-button"><Upload size={16} /> Import Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" onChange={event => { void loadFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><button className="secondary" onClick={downloadTemplate}><Download size={16} /> Template</button></div>}</div>
      {role === 'Super Admin' && <section className="panel sales-lead-import">
        <div className="panel-heading"><div><h2>Import and assign leads</h2><p>Excel/CSV needs Contact Name and Phone; each row can include an HTTPS PDF or form link.</p></div></div>
        <div className="sales-import-controls">
          <label>Assign rows without an Assigned To value<select value={defaultUserId} onChange={event => setDefaultUserId(event.target.value)}><option value="">Choose Sales Executive</option>{salesUsers.map(user => <option key={user.id} value={user.id}>{user.name} · {user.username}</option>)}</select></label>
          <span>{fileName || 'Choose a lead workbook to preview'}</span>
          <button className="primary" type="button" disabled={!importRows.length || busy} onClick={() => void submitImport()}><Upload size={16} /> Import {importRows.length || ''} leads</button>
        </div>
        {importRows.length > 0 && <div className="sales-import-preview"><strong>Preview · first {Math.min(5, importRows.length)} of {importRows.length}</strong><div className="table-card"><table><thead><tr><th>Contact</th><th>Phone</th><th>Company</th><th>Assigned To</th></tr></thead><tbody>{importRows.slice(0, 5).map((row, index) => <tr key={`${row.phone}-${index}`}><td>{row.name}</td><td>{row.phone}</td><td>{row.company || '—'}</td><td>{salesUsers.find(user => user.id === row.assignedUserId)?.name || '—'}</td></tr>)}</tbody></table></div></div>}
        {importMessage && <p className="sales-message" role="status">{importMessage}</p>}
      </section>}
      {role === 'Super Admin' && <form className="panel form-card sales-manual-lead" onSubmit={submitManualLead}>
        <div className="panel-heading"><div><h2>Add one lead</h2><p>Use this form for a single enquiry or referral.</p></div></div>
        <div className="field-grid">
          <label>Contact name<input name="name" required maxLength={150} /></label>
          <label>Company<input name="company" maxLength={180} /></label>
          <label>Phone<input name="phone" required maxLength={40} /></label>
          <label>Email<input name="email" type="email" maxLength={180} /></label>
          <label>Product interest<input name="productInterest" maxLength={180} /></label>
          <label>Sales Executive<select name="assignedUserId" required defaultValue=""><option value="">Choose Sales Executive</option>{salesUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label>PDF / form reference URL<input name="referenceUrl" type="url" placeholder="https://…" /></label>
          <label>Initial notes<input name="notes" maxLength={1000} /></label>
        </div>
        <button className="primary wide" type="submit" disabled={busy || salesUsers.length === 0}><Plus size={16} /> Save lead</button>
      </form>}
      <section className="panel sales-lead-list">
        <div className="panel-heading"><div><h2>Lead pipeline</h2><p>{leads.length} assigned / tracked leads</p></div><div className="table-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, company, phone" /></div></div>
        {visibleLeads.length ? <div className="table-card entries-table"><table><thead><tr><th>Lead / contact</th><th>Interest</th><th>Owner</th><th>Status</th><th>Next follow-up</th><th>Reference</th><th /></tr></thead><tbody>
          {visibleLeads.map(lead => <tr key={lead.id} className={selectedLead?.id === lead.id ? 'sales-selected-row' : ''}>
            <td><button className="sales-lead-select" onClick={() => setSelectedLeadId(lead.id)}><strong>{lead.name}</strong><small>{lead.company || '—'} · {lead.phone}</small></button></td>
            <td>{lead.productInterest || '—'}</td>
            <td>{role === 'Super Admin' ? <div className="sales-assign-control"><select aria-label={`Assign ${lead.name}`} value={lead.assignedUserId} onChange={event => void assignLead(lead.id, event.target.value).catch(error => setImportMessage(error instanceof Error ? error.message : 'Lead could not be reassigned.'))}>{salesUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div> : lead.assignedUserName}</td>
            <td><span className={`status ${['Converted', 'Qualified'].includes(lead.status) ? 'active' : 'pending'}`}>{lead.status}</span></td>
            <td>{lead.nextFollowUp || '—'}</td>
            <td>{lead.referenceUrl ? <a href={lead.referenceUrl} target="_blank" rel="noreferrer">Open PDF / form</a> : '—'}</td>
            <td><button className="secondary" onClick={() => setSelectedLeadId(lead.id)}>Call log</button></td>
          </tr>)}
        </tbody></table></div> : <div className="empty-state"><Search size={22} /><strong>No leads found</strong><span>Import a spreadsheet or adjust your search.</span></div>}
      </section>
      {selectedLead && <div className="sales-lead-detail">
        <section className="panel">
          <div className="panel-heading"><div><h2>Update follow-up · {selectedLead.name}</h2><p>{selectedLead.phone} · {selectedLead.assignedUserName}</p></div></div>
          {canEdit ? <form className="field-grid sales-activity-form" onSubmit={event => {
            event.preventDefault()
            const form = event.currentTarget
            const values = new FormData(form)
            void updateLead({
              leadId: selectedLead.id,
              status: String(values.get('status')) as SalesLeadStatus,
              activityType: String(values.get('activityType')) as SalesActivityType,
              outcome: String(values.get('outcome') || ''),
              notes: String(values.get('notes') || ''),
              nextFollowUp: String(values.get('nextFollowUp') || ''),
            }).then(() => form.reset()).catch(error => setImportMessage(error instanceof Error ? error.message : 'Call update could not be saved.'))
          }}>
            <label>Contact method<select name="activityType"><option>Call</option><option>WhatsApp</option><option>Meeting</option><option>Note</option></select></label>
            <label>Lead status<select name="status" defaultValue={selectedLead.status}><option>New</option><option>Contacted</option><option>Qualified</option><option>Follow-up</option><option>Converted</option><option>Lost</option></select></label>
            <label>Call outcome<input name="outcome" required maxLength={180} placeholder="Answered, call back, quotation sent…" /></label>
            <label>Next follow-up<input name="nextFollowUp" type="date" defaultValue={selectedLead.nextFollowUp} /></label>
            <label className="sales-note-field">Notes<textarea name="notes" required maxLength={1000} rows={3} placeholder="What happened and what should happen next?" /></label>
            <button className="primary" type="submit"><Phone size={16} /> Save call update</button>
          </form> : <p className="sales-readonly-note">Read-only view. Only the assigned Sales Executive or Super Admin can record a call update.</p>}
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Call history</h2><p>{selectedActivities.length} recorded updates</p></div></div>
          {selectedActivities.length ? <div className="sales-activity-list">{selectedActivities.map(activity => <article key={activity.id}><strong>{activity.type} · {activity.outcome}</strong><span>{activity.createdByName} · {new Date(activity.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span><p>{activity.notes}</p>{activity.nextFollowUp && <small>Next follow-up: {activity.nextFollowUp}</small>}</article>)}</div> : <div className="empty-state"><Phone size={22} /><strong>No call updates yet</strong><span>Saved updates will be recorded here.</span></div>}
        </section>
      </div>}
      {role === 'Super Admin' && importMessage && !importRows.length && <p className="sales-message" role="status">{importMessage}</p>}
    </section>
  )
}

export function SalesOrdersView(props: {
  role: SalesRole
  currentUserId: string
  leads: SalesLead[]
  orders: SalesOrder[]
  products: SalesProduct[]
  createOrder: (input: { leadId: string; sku: string; quantity: number; unitPrice: number; notes: string }) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
}) {
  const { role, currentUserId, leads, orders, products, createOrder, cancelOrder } = props
  const [selectedSku, setSelectedSku] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [quantityDraft, setQuantityDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const activeProducts = sellableProducts(products)
  const selectedProduct = activeProducts.find(product => product.sku === selectedSku)
  const assignedLeads = leads.filter(lead => role !== 'Sales Executive' || lead.status !== 'Lost')
  const sortedOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const quantity = Number(values.get('quantity'))
    const price = Number(unitPrice)
    if (!selectedProduct || !Number.isInteger(quantity) || quantity < 1 || quantity > selectedProduct.stock ||
        !Number.isFinite(price) || price <= 0) {
      setMessage('Choose an in-stock SKU and enter a valid quantity and unit price.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await createOrder({
        leadId: String(values.get('leadId') || ''),
        sku: selectedProduct.sku,
        quantity,
        unitPrice: price,
        notes: String(values.get('notes') || ''),
      })
      form.reset()
      setSelectedSku('')
      setUnitPrice('')
      setQuantityDraft('')
      setMessage('Order booked; stock reserved and sales target updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order could not be booked.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="page-heading"><div><p>SALES</p><h1>Sales Orders</h1><span className="dashboard-description">A booking reserves stock. A supervisor dispatches it later from Shipping &amp; Delivery using the order ID.</span></div></div>
      {role === 'Sales Executive' && <form className="panel form-card sales-order-form" onSubmit={submitOrder}>
        <div className="panel-heading"><div><h2>Book an order</h2><p>Only your assigned leads and active catalog SKUs can be selected.</p></div></div>
        <div className="field-grid">
          <label>Customer / lead<select name="leadId" required defaultValue=""><option value="">Choose assigned lead</option>{assignedLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} · {lead.phone}</option>)}</select></label>
          <label>Product SKU<select value={selectedSku} required onChange={event => { setSelectedSku(event.target.value); setUnitPrice('') }}><option value="">Choose active SKU</option>{activeProducts.map(product => <option key={product.sku} value={product.sku} disabled={product.stock <= 0}>{product.name} · {product.sku} · Available {product.stock}</option>)}</select></label>
          {selectedProduct && <div className="sales-stock-note"><span>Available after existing reservations</span><strong>{selectedProduct.stock.toLocaleString('en-IN')} units</strong></div>}
          <label>Quantity<input name="quantity" type="number" min="1" max={selectedProduct?.stock || undefined} step="1" required value={quantityDraft} onChange={event => setQuantityDraft(event.target.value)} disabled={!selectedProduct || selectedProduct.stock <= 0} /></label>
          <label>Unit price (INR)<input type="number" min="0.01" step="0.01" required value={unitPrice} onChange={event => setUnitPrice(event.target.value)} /></label>
          <label className="sales-note-field">Order notes<input name="notes" maxLength={500} placeholder="Delivery or customer requirement" /></label>
        </div>
        {selectedProduct && <p className="sales-amount-hint">Estimated order amount: <strong>{money((Number(quantityDraft) || 0) * (Number(unitPrice) || 0))}</strong>. Server validates current stock and reserves it atomically.</p>}
        <button className="primary wide" type="submit" disabled={busy || assignedLeads.length === 0 || !selectedProduct || selectedProduct.stock <= 0}><Plus size={16} /> Book order</button>
        {message && <p className="sales-message" role="status">{message}</p>}
      </form>}
      {role === 'Sales Executive' && assignedLeads.length === 0 && <p className="local-storage-note">No open leads are assigned to you yet. Ask the Super Admin to import or assign leads.</p>}
      <section className="panel sales-orders-list">
        <div className="panel-heading"><div><h2>Booked orders</h2><p>{orders.length} orders · {role === 'Sales Executive' ? 'your bookings' : 'all Sales Executive bookings'}</p></div></div>
        {sortedOrders.length ? <div className="table-card entries-table"><table><thead><tr><th>Booked</th><th>Order ID</th><th>Customer</th><th>Salesperson</th><th>SKU / product</th><th>Qty</th><th>Unit price</th><th>Booked amount</th><th>Fulfilment</th><th>Status</th><th /></tr></thead><tbody>
          {sortedOrders.map(order => {
            const remaining = order.quantity - order.fulfilledQuantity - order.cancelledQuantity
            const mayCancel = remaining > 0 && role !== 'Production Supervisor' && (role !== 'Sales Executive' || order.salesUserId === currentUserId)
            return <tr key={order.id}><td>{dateForSales(order.createdAt)}</td><td><code>{order.id}</code></td><td>{order.customerName}</td><td>{order.salesUserName}</td><td><code>{order.sku}</code><small>{order.productName}</small></td><td>{order.quantity}</td><td>{money(order.unitPrice)}</td><td>{money(activeOrderAmount(order))}</td><td>{order.fulfilledQuantity} fulfilled · {remaining} open</td><td><span className={`status ${order.status === 'Booked' ? 'pending' : 'active'}`}>{order.status}</span></td><td>{mayCancel && <button className="secondary" disabled={busy} onClick={() => { if (window.confirm(`Cancel the remaining ${remaining} units of ${order.id}? Reserved stock will be released.`)) { setBusy(true); void cancelOrder(order.id).then(() => setMessage('Order cancelled and reserved stock released.')).catch(error => setMessage(error instanceof Error ? error.message : 'Order could not be cancelled.')).finally(() => setBusy(false)) } }}>Cancel remaining</button>}</td></tr>
          })}
        </tbody></table></div> : <div className="empty-state"><FileSpreadsheet size={22} /><strong>No sales orders yet</strong><span>New bookings will be listed here for the Admin and Production Supervisor.</span></div>}
      </section>
      {role !== 'Sales Executive' && <p className="sales-readonly-note">Admin and Production Supervisor can review all orders. Only the assigned salesperson can book orders; Admin or the owning salesperson can cancel and release unfulfilled reservations.</p>}
    </section>
  )
}
