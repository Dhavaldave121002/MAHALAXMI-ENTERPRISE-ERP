import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Boxes, CheckCircle2, Download, FileSpreadsheet, Phone, Plus, RefreshCw, Save, Search, Store, Target, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import type {
  IndiaMartCatalogCandidate, IndiaMartListing, SalesAccount, SalesActivity, SalesActivityType, SalesLead, SalesLeadImportRow, SalesLeadStatus,
  SalesDailyReport, SalesOrder, SalesTarget, SalesTargetPeriod,
} from './salesTypes'

type SalesRole = 'Super Admin' | 'Production Supervisor' | 'Sales Executive'
type SalesProduct = { sku: string; name: string; mrp: number; stock: number; status: string; masterSku?: string; isVariant?: boolean }

export function SalesDailyReportView(props: {
  role: SalesRole
  currentUser: { id: string; name: string }
  leads: SalesLead[]
  activities: SalesActivity[]
  orders: SalesOrder[]
}) {
  const { role, currentUser, leads, activities, orders } = props
  const [dailyReportDate, setDailyReportDate] = useState(() => currentIndiaDate())
  const [dailyWorkReports, setDailyWorkReports] = useState<SalesDailyReport[]>([])
  const [dailyWorkReportsLoading, setDailyWorkReportsLoading] = useState(true)
  const [dailyWorkReportsError, setDailyWorkReportsError] = useState('')
  const [dailyWorkReportMessage, setDailyWorkReportMessage] = useState('')
  const [savingDailyWorkReport, setSavingDailyWorkReport] = useState(false)

  useEffect(() => {
    let active = true
    void fetch('/api/sales-reports', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json() as { error?: string; reports?: SalesDailyReport[] }
        if (!response.ok) throw new Error(result.error || 'Sales daily reports could not be loaded.')
        if (active) {
          setDailyWorkReports(result.reports || [])
          setDailyWorkReportsError('')
        }
      })
      .catch(error => {
        if (active) setDailyWorkReportsError(error instanceof Error ? error.message : 'Sales daily reports could not be loaded.')
      })
      .finally(() => {
        if (active) setDailyWorkReportsLoading(false)
      })
    return () => { active = false }
  }, [])

  const today = currentIndiaDate()
  const todayWorkReport = dailyWorkReports.find(report => report.userId === currentUser.id && report.date === today)
  const workReportsForDate = dailyWorkReports.filter(report => report.date === dailyReportDate)
    .sort((a, b) => a.userName.localeCompare(b.userName))
  const dailyReportOrders = orders
    .filter(order => dailyReportDate && dateForSales(order.createdAt) === dailyReportDate)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const dailyReportLeads = leads
    .filter(lead => dailyReportDate && dateForSales(lead.createdAt) === dailyReportDate &&
      (role !== 'Sales Executive' || lead.assignedUserId === currentUser.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const dailyReportActivities = activities
    .filter(activity => dailyReportDate && dateForSales(activity.createdAt) === dailyReportDate &&
      (role !== 'Sales Executive' || activity.createdBy === currentUser.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const dailyReportAmount = dailyReportOrders.reduce((sum, order) => sum + activeOrderAmount(order), 0)
  const dailyReportLeadNames = new Map(leads.map(lead => [lead.id, lead.name]))
  const dailyReportLeadsContacted = new Set(dailyReportActivities.map(activity => activity.leadId)).size

  const submitDailyWorkReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const completed = String(values.get('completed') || '').trim()
    const pending = String(values.get('pending') || '').trim()
    const issues = String(values.get('issues') || '').trim()
    if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
      setDailyWorkReportMessage('Completed work is required; each field must be 3,000 characters or fewer.')
      return
    }
    setSavingDailyWorkReport(true)
    setDailyWorkReportMessage('')
    try {
      const response = await fetch('/api/sales-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, pending, issues }),
      })
      const result = await response.json() as { error?: string; report?: SalesDailyReport }
      if (!response.ok || !result.report) throw new Error(result.error || 'Daily sales report could not be saved.')
      const savedReport = result.report
      setDailyWorkReports(previous => [savedReport, ...previous.filter(report => report.id !== savedReport.id)])
      setDailyWorkReportsError('')
      setDailyWorkReportMessage('Daily work report saved. You can update it again today.')
    } catch (error) {
      setDailyWorkReportMessage(error instanceof Error ? error.message : 'Daily sales report could not be saved.')
    } finally {
      setSavingDailyWorkReport(false)
    }
  }

  const exportDailyReport = () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Date: dailyReportDate,
      Scope: role === 'Sales Executive' ? currentUser.name : 'All Sales Executives',
      'Orders Booked': dailyReportOrders.length,
      'New Enquiries': dailyReportLeads.length,
      'Net Booked Amount': dailyReportAmount,
      'Activities Logged': dailyReportActivities.length,
      'Unique Leads Contacted': dailyReportLeadsContacted,
      'Follow-Ups Scheduled': dailyReportActivities.filter(activity => activity.nextFollowUp).length,
    }]), 'Daily Summary')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyReportOrders.map(order => ({
      'Order ID': order.id,
      Time: new Date(order.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      Salesperson: order.salesUserName,
      Customer: order.customerName,
      SKU: order.sku,
      Product: order.productName,
      Quantity: order.quantity,
      'Net Booked Amount': activeOrderAmount(order),
      Status: order.status,
    }))), 'Orders')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyReportLeads.map(lead => ({
      Date: dateForSales(lead.createdAt),
      Phone: lead.phone,
      Name: lead.name,
      Product: lead.productInterest,
      Location: lead.location,
      Company: lead.company,
      Email: lead.email,
      Notes: lead.notes,
    }))), 'Daily Enquiries')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyReportActivities.map(activity => ({
      Time: new Date(activity.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      Salesperson: activity.createdByName,
      Lead: dailyReportLeadNames.get(activity.leadId) || activity.leadId,
      Type: activity.type,
      Outcome: activity.outcome,
      Notes: activity.notes,
      'Next Follow-Up': activity.nextFollowUp,
    }))), 'Activities')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(workReportsForDate.map(report => ({
      Date: report.date,
      Salesperson: report.userName,
      Completed: report.completed,
      Pending: report.pending,
      'Issues / notes': report.issues,
      'Last updated': report.updatedAt,
    }))), 'Work Reports')
    XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Sales-Daily-Report-${dailyReportDate}.xlsx`)
  }

  return (
    <section>
      <div className="page-heading">
        <div><p>SALES WORKSPACE</p><h1>Sales Daily Report</h1><span className="dashboard-description">Review daily enquiries, orders, call activities, and work reports for the selected date.</span></div>
      </div>
      <section className="panel sales-daily-report">
        <div className="panel-heading">
          <div><h2>Daily sales report</h2><p>{role === 'Sales Executive' ? currentUser.name : 'All Sales Executives'} · {dailyReportDate}</p></div>
          <div className="sales-daily-controls">
            <label>Report date<input type="date" value={dailyReportDate} onChange={event => setDailyReportDate(event.target.value)} /></label>
            <button className="secondary" disabled={!dailyReportDate} onClick={exportDailyReport}><Download size={16} /> Export daily report</button>
          </div>
        </div>
        <div className="sales-daily-summary">
          <article><span>Orders booked</span><strong>{dailyReportOrders.length}</strong></article>
          <article><span>New enquiries</span><strong>{dailyReportLeads.length}</strong></article>
          <article><span>Net booked value</span><strong>{money(dailyReportAmount)}</strong></article>
          <article><span>Activities logged</span><strong>{dailyReportActivities.length}</strong><small>{dailyReportActivities.filter(activity => activity.type === 'Call').length} calls · {dailyReportLeadsContacted} leads contacted</small></article>
          <article><span>Follow-ups scheduled</span><strong>{dailyReportActivities.filter(activity => activity.nextFollowUp).length}</strong></article>
        </div>
        <div className="sales-daily-tables">
          <div>
            <div className="sales-daily-table-heading"><h3>Daily enquiries</h3><span>{dailyReportLeads.length}</span></div>
            {dailyReportLeads.length ? <div className="table-card entries-table"><table><thead><tr><th>Date</th><th>Phone</th><th>Name</th><th>Product</th><th>Location</th><th>Company</th><th>Email</th><th>Notes</th></tr></thead><tbody>
              {dailyReportLeads.map(lead => <tr key={lead.id}><td>{dateForSales(lead.createdAt)}</td><td>{lead.phone}</td><td>{lead.name}</td><td>{lead.productInterest || '—'}</td><td>{lead.location || '—'}</td><td>{lead.company || '—'}</td><td>{lead.email || '—'}</td><td className="sales-report-cell">{lead.notes || '—'}</td></tr>)}
            </tbody></table></div> : <div className="sales-daily-empty">No enquiries were added on this date.</div>}
          </div>
        </div>
        <div className="sales-daily-tables">
          <div>
            <div className="sales-daily-table-heading"><h3>Orders booked</h3><span>{dailyReportOrders.length}</span></div>
            {dailyReportOrders.length ? <div className="table-card entries-table"><table><thead><tr><th>Order</th><th>Customer</th><th>SKU / product</th><th>Qty</th><th>Net amount</th><th>Salesperson</th></tr></thead><tbody>
              {dailyReportOrders.map(order => <tr key={order.id}><td><code>{order.id}</code></td><td>{order.customerName}</td><td><code>{order.sku}</code><small>{order.productName}</small></td><td>{order.quantity}</td><td>{money(activeOrderAmount(order))}</td><td>{order.salesUserName}</td></tr>)}
            </tbody></table></div> : <div className="sales-daily-empty">No orders were booked on this date.</div>}
          </div>
          <div>
            <div className="sales-daily-table-heading"><h3>Lead activities</h3><span>{dailyReportActivities.length}</span></div>
            {dailyReportActivities.length ? <div className="table-card entries-table"><table><thead><tr><th>Lead</th><th>Type</th><th>Outcome / notes</th><th>Salesperson</th><th>Next follow-up</th></tr></thead><tbody>
              {dailyReportActivities.map(activity => <tr key={activity.id}><td>{dailyReportLeadNames.get(activity.leadId) || activity.leadId}</td><td>{activity.type}</td><td>{activity.outcome}<small>{activity.notes}</small></td><td>{activity.createdByName}</td><td>{activity.nextFollowUp || '—'}</td></tr>)}
            </tbody></table></div> : <div className="sales-daily-empty">No lead activities were recorded on this date.</div>}
          </div>
        </div>
      </section>
      <section className="panel sales-work-report">
        <div className="panel-heading"><div><h2>Daily work report</h2><p>One report per Sales Executive each day; submitting again updates today’s report.</p></div></div>
        {role === 'Sales Executive' && <form key={todayWorkReport?.updatedAt || 'new'} className="ecommerce-form" onSubmit={event => void submitDailyWorkReport(event)}>
          <label>Completed work<textarea name="completed" required maxLength={3000} rows={4} defaultValue={todayWorkReport?.completed || ''} /></label>
          <label>Pending work<textarea name="pending" maxLength={3000} rows={3} defaultValue={todayWorkReport?.pending || ''} /></label>
          <label>Issues / notes<textarea name="issues" maxLength={3000} rows={3} defaultValue={todayWorkReport?.issues || ''} /></label>
          <button className="primary" type="submit" disabled={savingDailyWorkReport}><CheckCircle2 size={15} /> {todayWorkReport ? 'Update today’s report' : 'Submit daily report'}</button>
        </form>}
        {role !== 'Sales Executive' && <p className="sales-readonly-note">Read-only report history for {dailyReportDate}. Sales Executives can submit or update their own report for today.</p>}
        {dailyWorkReportsError && <p className="sales-message" role="alert">{dailyWorkReportsError}</p>}
        {dailyWorkReportsLoading ? <p className="sales-readonly-note">Loading saved work reports…</p>
          : workReportsForDate.length ? <div className="table-card entries-table sales-work-report-table"><table><thead><tr><th>Sales Executive</th><th>Completed work</th><th>Pending work</th><th>Issues / notes</th><th>Last updated</th></tr></thead><tbody>
            {workReportsForDate.map(report => <tr key={report.id}><td>{report.userName}</td><td className="sales-report-cell">{report.completed}</td><td className="sales-report-cell">{report.pending || '—'}</td><td className="sales-report-cell">{report.issues || '—'}</td><td>{new Date(report.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>)}
          </tbody></table></div>
            : <div className="sales-daily-empty">{dailyWorkReportsError ? 'Saved reports could not be loaded.' : `No work reports were submitted for ${dailyReportDate}.`}</div>}
        <p className="sales-message" role="status" aria-live="polite">{dailyWorkReportMessage}</p>
      </section>
    </section>
  )
}

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
    location: get('location', 'city', 'citystate', 'address', 'region'),
    email: get('email', 'emailaddress'),
    productInterest: get('productinterest', 'interest', 'product', 'requirement'),
    notes: get('notes', 'remarks', 'comment'),
    referenceUrl,
    assignedUserId: assignedUser?.id || defaultUserId,
  }
}

const INDIA_MART_LISTING_HEADERS = [
  'Product Name',
  'IndiaMART SKU',
  'ERP SKU',
  'Listing Price (INR)',
  'Unit Cost (INR)',
  'Status',
  'Product URL',
  'Image URL',
  'Listing ID',
]

function normalizedListingHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function listingImportValue(row: Record<string, unknown>, aliases: string[]) {
  const keys = new Map(Object.keys(row).map(key => [normalizedListingHeader(key), key]))
  const key = aliases.map(alias => keys.get(alias)).find(Boolean)
  return key ? String(row[key] ?? '').trim() : ''
}

function parseListingImportAmount(value: string, label: string, rowNumber: number) {
  if (!value) return null
  const amount = Number(value.replace(/(?:₹|INR|Rs\.?)/gi, '').replace(/[,\s]/g, ''))
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000000) {
    throw new Error(`Row ${rowNumber} has an invalid ${label}.`)
  }
  return amount
}

async function importedListingId(productName: string, listingSku: string, sourceUrl: string) {
  const identity = [productName, listingSku, sourceUrl].map(value => value.trim().toLowerCase()).join('|')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  return `IMX-${hash.slice(0, 24)}`
}

function normalizedListingName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function IndiaMartView(props: {
  role: SalesRole
  listings: IndiaMartListing[]
  products: SalesProduct[]
  previewCatalog: () => Promise<IndiaMartCatalogCandidate[]>
  saveListings: (listings: IndiaMartListing[]) => Promise<IndiaMartListing[]>
}) {
  const { role, listings: savedListings, products, previewCatalog, saveListings } = props
  const [draftListings, setDraftListings] = useState(savedListings)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const activeProducts = sellableProducts(products)
  const productBySku = new Map(products.map(product => [product.sku.toLowerCase(), product]))
  const canEdit = role === 'Super Admin'
  const activeListings = draftListings.filter(listing => listing.status === 'Active')
  const canSave = draftListings.every(listing =>
    listing.status !== 'Active' ||
    Boolean(listing.listingSku && listing.productSku && listing.listedPrice !== null && listing.listedPrice > 0 && listing.unitCost !== null && listing.unitCost >= 0),
  )

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([INDIA_MART_LISTING_HEADERS]), 'IndiaMART Listings')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['IndiaMART listing import instructions'],
      ['Required: Product Name. Use Status=Draft while reviewing new listings.'],
      ['Optional: IndiaMART SKU, ERP SKU, Listing Price (INR), Unit Cost (INR), Product URL, Image URL, Listing ID.'],
      ['Product URL must use https://www.mahalaxmienterprise.in.net; Image URL, if provided, must use imimg.com.'],
      ['Inventory is read from the mapped ERP SKU. Import does not set or overwrite inventory to 1,000.'],
      ['After importing, review the rows and click Save listing changes. Active listings require a mapped active ERP SKU, price, listing SKU, and unit cost.'],
    ]), 'Instructions')
    XLSX.writeFile(workbook, 'Mahalaxmi-IndiaMART-Listings-Template.xlsx')
  }

  const importListingsFile = async (file?: File) => {
    setMessage('')
    if (!file) return
    setBusy(true)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('IndiaMART workbook must be 5 MB or smaller.')
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Choose an .xlsx, .xls, or .csv IndiaMART listing file.')
      const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error('The selected file has no worksheet.')
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
      if (!rows.length || rows.length > 1000) throw new Error('The file must contain between 1 and 1,000 listing rows.')

      const next = new Map(draftListings.map(listing => [listing.id.toLowerCase(), listing]))
      const bySku = new Map(draftListings.filter(listing => listing.listingSku).map(listing => [listing.listingSku.toLowerCase(), listing]))
      const byName = new Map(draftListings.map(listing => [normalizedListingName(listing.productName), listing]))
      const importedIds = new Set<string>()
      let merged = 0
      const imported: IndiaMartListing[] = []

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2
        const productName = listingImportValue(row, ['productname', 'name', 'itemname'])
        if (!productName || productName.length > 300) throw new Error(`Row ${rowNumber} needs a Product Name of 300 characters or fewer.`)
        const listingSku = listingImportValue(row, ['indiamartsku', 'listingsku', 'indiamartproductsku', 'sku'])
        const productSku = listingImportValue(row, ['erpsku', 'productsku', 'stocksku'])
        const sourceUrl = listingImportValue(row, ['producturl', 'sourceurl', 'listingurl'])
        const imageUrl = listingImportValue(row, ['imageurl', 'image'])
        const suppliedId = listingImportValue(row, ['listingid', 'id'])
        const priceValue = listingImportValue(row, ['listingpriceinr', 'listedpriceinr', 'listingprice', 'listedprice', 'priceinr', 'price'])
        const costValue = listingImportValue(row, ['unitcostinr', 'unitcost', 'cost'])
        const suppliedStatus = listingImportValue(row, ['status']).toLowerCase()
        if (listingSku.length > 100 || productSku.length > 100) throw new Error(`Row ${rowNumber} has an SKU longer than 100 characters.`)
        if (suppliedId.length > 100) throw new Error(`Row ${rowNumber} has a Listing ID longer than 100 characters.`)
        if (sourceUrl.length > 2000 || imageUrl.length > 2000) throw new Error(`Row ${rowNumber} has a URL longer than 2,000 characters.`)
        if (sourceUrl) {
          let parsedSourceUrl: URL
          try {
            parsedSourceUrl = new URL(sourceUrl)
          } catch {
            throw new Error(`Row ${rowNumber} has an invalid Product URL.`)
          }
          if (parsedSourceUrl.protocol !== 'https:' || parsedSourceUrl.origin !== 'https://www.mahalaxmienterprise.in.net') {
            throw new Error(`Row ${rowNumber} Product URL must use the approved storefront host.`)
          }
        }
        if (imageUrl) {
          let parsedImageUrl: URL
          try {
            parsedImageUrl = new URL(imageUrl)
          } catch {
            throw new Error(`Row ${rowNumber} has an invalid Image URL.`)
          }
          if (parsedImageUrl.protocol !== 'https:' || !/(^|\.)imimg\.com$/i.test(parsedImageUrl.hostname)) {
            throw new Error(`Row ${rowNumber} Image URL must use an approved product-image host.`)
          }
        }
        if (suppliedStatus && !['draft', 'active', 'inactive'].includes(suppliedStatus)) {
          throw new Error(`Row ${rowNumber} has an invalid Status. Use Draft, Active, or Inactive.`)
        }

        const listedPrice = parseListingImportAmount(priceValue, 'Listing Price', rowNumber)
        const unitCost = parseListingImportAmount(costValue, 'Unit Cost', rowNumber)
        const matched = (suppliedId && next.get(suppliedId.toLowerCase())) ||
          (listingSku ? bySku.get(listingSku.toLowerCase()) : byName.get(normalizedListingName(productName)))
        const id = suppliedId || matched?.id || await importedListingId(productName, listingSku, sourceUrl)
        const idKey = id.toLowerCase()
        if (importedIds.has(idKey)) throw new Error(`Row ${rowNumber} duplicates a Listing ID in this file.`)
        importedIds.add(idKey)
        if (matched) merged += 1

        const status = suppliedStatus
          ? (suppliedStatus === 'draft' ? 'Draft' : suppliedStatus === 'active' ? 'Active' : 'Inactive')
          : matched?.status || 'Draft'
        const listing: IndiaMartListing = {
          id,
          productName,
          listingSku: listingSku || matched?.listingSku || '',
          productSku: productSku || matched?.productSku || '',
          listedPrice: listedPrice ?? matched?.listedPrice ?? null,
          unitCost: unitCost ?? matched?.unitCost ?? null,
          sourceUrl: sourceUrl || matched?.sourceUrl || '',
          imageUrl: imageUrl || matched?.imageUrl || '',
          status,
          updatedAt: matched?.updatedAt || '',
        }
        imported.push(listing)
        next.set(idKey, listing)
        if (listing.listingSku) bySku.set(listing.listingSku.toLowerCase(), listing)
        byName.set(normalizedListingName(listing.productName), listing)
      }

      if (next.size > 1000) throw new Error('The combined IndiaMART catalog cannot exceed 1,000 listings.')
      setDraftListings([...next.values()])
      setMessage(`${imported.length} Excel rows loaded; ${merged} matched existing listings. Review changes, then click Save listing changes.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'IndiaMART listing workbook could not be imported.')
    } finally {
      setBusy(false)
    }
  }

  const importCatalog = async () => {
    setBusy(true)
    setMessage('')
    try {
      const candidates = await previewCatalog()
      const currentById = new Map(draftListings.map(listing => [listing.id, listing]))
      const refreshed = candidates.map(candidate => {
        const existing = currentById.get(candidate.id)
        if (existing) {
          return { ...existing, productName: candidate.productName, sourceUrl: candidate.sourceUrl, imageUrl: candidate.imageUrl }
        }
        return {
          id: candidate.id,
          productName: candidate.productName,
          sourceUrl: candidate.sourceUrl,
          imageUrl: candidate.imageUrl,
          listingSku: `IM-${candidate.id.slice(-8)}`,
          productSku: '',
          listedPrice: candidate.suggestedPrice,
          unitCost: null,
          status: 'Draft' as const,
          updatedAt: '',
        }
      })
      const importedIds = new Set(refreshed.map(listing => listing.id))
      setDraftListings([...refreshed, ...draftListings.filter(listing => !importedIds.has(listing.id))])
      setMessage(`${candidates.length} storefront products loaded for review. New listings remain Draft until an Admin maps and activates them.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The IndiaMART catalog could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  const updateListing = (id: string, patch: Partial<IndiaMartListing>) => {
    setDraftListings(current => current.map(listing => listing.id === id ? { ...listing, ...patch } : listing))
  }

  const persistListings = async () => {
    setBusy(true)
    setMessage('')
    try {
      const saved = await saveListings(draftListings)
      setDraftListings(saved)
      setMessage('IndiaMART listings saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'IndiaMART listings could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div><p>SALES CHANNEL</p><h1>IndiaMART</h1><span className="dashboard-description">IndiaMART listings use shared ERP finished-goods stock. Admin approves the imported catalog, maps ERP SKUs, sets listing SKUs, prices, and unit costs.</span></div>
        {canEdit && <div className="heading-actions">
          <label className="secondary sales-upload-button"><Upload size={16} /> Import Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={event => { void importListingsFile(event.target.files?.[0]); event.currentTarget.value = '' }} /></label>
          <button className="secondary" disabled={busy} onClick={downloadTemplate}><Download size={16} /> Template</button>
          <button className="secondary" disabled={busy} onClick={() => void importCatalog()}><RefreshCw size={16} /> Preview website catalog</button>
          <button className="primary" disabled={busy || !canSave} onClick={() => void persistListings()}><Save size={16} /> Save listing changes</button>
        </div>}
      </div>
      {message && <p className="sales-message" role="status">{message}</p>}
      {canEdit && <p className="sales-readonly-note">Inventory comes from the mapped ERP SKU and is shared with other channels. Excel import does not set stock to 1,000.</p>}
      {!canEdit && <div className="stats-grid sales-stats">
        <article className="stat-card"><div className="stat-icon blue"><Store size={20} /></div><div className="stat-body"><span>Active IndiaMART listings</span><strong>{activeListings.length.toLocaleString('en-IN')}</strong><small>Admin-managed products</small></div></article>
        <article className="stat-card"><div className="stat-icon green"><Boxes size={20} /></div><div className="stat-body"><span>Mapped ERP SKUs in stock</span><strong>{activeListings.filter(listing => (productBySku.get(listing.productSku.toLowerCase())?.stock || 0) > 0).length.toLocaleString('en-IN')}</strong><small>Stock is shared with other sales channels</small></div></article>
      </div>}
      {draftListings.length ? <div className="table-card entries-table india-mart-table"><table>
        <thead><tr><th>Storefront product</th><th>IndiaMART SKU</th><th>ERP stock SKU</th><th>Available stock</th><th>Listing price (INR)</th>{canEdit && <th>Unit cost (INR)</th>}<th>Status</th></tr></thead>
        <tbody>{draftListings.map(listing => {
          const product = productBySku.get(listing.productSku.toLowerCase())
          return <tr key={listing.id}>
            <td><div className="india-mart-product">{listing.imageUrl && <img src={listing.imageUrl} alt="" loading="lazy" />}<div><strong>{listing.productName}</strong>{listing.sourceUrl && <small><a href={listing.sourceUrl} target="_blank" rel="noreferrer">Open storefront listing</a></small>}</div></div></td>
            <td>{canEdit ? <input aria-label={`${listing.productName} IndiaMART SKU`} maxLength={100} value={listing.listingSku} onChange={event => updateListing(listing.id, { listingSku: event.target.value })} /> : <code>{listing.listingSku}</code>}</td>
            <td>{canEdit
              ? <select aria-label={`${listing.productName} mapped ERP SKU`} value={listing.productSku} onChange={event => updateListing(listing.id, { productSku: event.target.value })}>
                <option value="">Map ERP SKU</option>{activeProducts.map(product => <option key={product.sku} value={product.sku}>{product.name} · {product.sku}</option>)}
              </select>
              : <code>{listing.productSku || 'Not mapped'}</code>}</td>
            <td>{product ? product.stock.toLocaleString('en-IN') : '—'}</td>
            <td>{canEdit
              ? <input aria-label={`${listing.productName} IndiaMART listed price`} type="number" min="0" step="0.01" value={listing.listedPrice ?? ''} onChange={event => updateListing(listing.id, { listedPrice: event.target.value === '' ? null : Number(event.target.value) })} />
              : listing.listedPrice === null ? '—' : money(listing.listedPrice)}</td>
            {canEdit && <td><input aria-label={`${listing.productName} unit cost`} type="number" min="0" step="0.01" value={listing.unitCost ?? ''} onChange={event => updateListing(listing.id, { unitCost: event.target.value === '' ? null : Number(event.target.value) })} /></td>}
            <td>{canEdit
              ? <select aria-label={`${listing.productName} listing status`} value={listing.status} onChange={event => updateListing(listing.id, { status: event.target.value as IndiaMartListing['status'] })}>
                <option value="Draft">Draft</option><option value="Active" disabled={!listing.listingSku || !listing.productSku || listing.listedPrice === null || listing.listedPrice <= 0 || listing.unitCost === null}>Active</option><option value="Inactive">Inactive</option>
              </select>
              : <span className={`status ${listing.status === 'Active' ? 'active' : 'pending'}`}>{listing.status}</span>}</td>
          </tr>
        })}</tbody>
      </table></div> : <div className="empty-state"><Store size={22} /><strong>No IndiaMART products yet</strong><span>Admin can preview the public storefront catalog and approve products here.</span></div>}
      {canEdit && draftListings.some(listing => listing.status === 'Active' && listing.unitCost === null) && <p className="sales-readonly-note">Enter an Admin unit cost for every active listing so IndiaMART gross profit can be reported.</p>}
    </section>
  )
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
  indiaMartListings: IndiaMartListing[]
  stockMovements: Array<{ id: string; date: string; sku: string; itemType: string; type: string; quantity: number; referenceId: string; salesChannel: string; unitPrice: number; totalAmount: number }>
  setTarget: (salesUserId: string, period: SalesTargetPeriod, periodKey: string, targetAmount: number) => Promise<void>
}) {
  const { role, currentUser, salesUsers, leads, activities, orders, targets, products, indiaMartListings, stockMovements, setTarget } = props
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
  const indiaMartOrderById = new Map(orders.filter(order => order.salesChannel === 'INDIAMART').map(order => [order.id, order]))
  const indiaMartDispatches = stockMovements.filter(movement =>
    movement.itemType === 'Finished Goods' &&
    movement.type === 'Dispatch' &&
    movement.salesChannel === 'INDIAMART' &&
    dateForSales(movement.date).slice(0, 7) === selectedMonth &&
    indiaMartOrderById.has(movement.referenceId),
  )
  const indiaMartRevenue = indiaMartDispatches.reduce((sum, movement) => {
    const order = indiaMartOrderById.get(movement.referenceId)!
    return sum + (movement.totalAmount > 0 ? movement.totalAmount : movement.quantity * order.unitPrice)
  }, 0)
  const indiaMartCost = indiaMartDispatches.reduce((sum, movement) => {
    const order = indiaMartOrderById.get(movement.referenceId)!
    return sum + movement.quantity * (order.unitCost ?? 0)
  }, 0)
  const indiaMartGrossProfit = indiaMartDispatches.reduce((sum, movement) => {
    const order = indiaMartOrderById.get(movement.referenceId)!
    return order.unitCost === null
      ? sum
      : sum + (movement.totalAmount > 0 ? movement.totalAmount : movement.quantity * order.unitPrice) - movement.quantity * order.unitCost
  }, 0)
  const indiaMartMissingCost = indiaMartDispatches.filter(movement => indiaMartOrderById.get(movement.referenceId)?.unitCost === null).length
  const activeIndiaMartListings = indiaMartListings.filter(listing => listing.status === 'Active')
  const productBySku = new Map(products.map(product => [product.sku.toLowerCase(), product]))
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
      Channel: order.salesChannel,
      Salesperson: order.salesUserName,
      Customer: order.customerName,
      SKU: order.sku,
      'IndiaMART SKU': order.listingSku,
      Product: order.productName,
      Quantity: order.quantity,
      'Unit Price': order.unitPrice,
      'Booked Amount': order.amount,
      'Cancelled Amount': order.unitPrice * order.cancelledQuantity,
      Status: order.status,
    }))), 'Orders')
    if (role === 'Super Admin') {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(indiaMartDispatches.map(movement => {
        const order = indiaMartOrderById.get(movement.referenceId)!
        const revenue = movement.totalAmount > 0 ? movement.totalAmount : movement.quantity * order.unitPrice
        const productCost = order.unitCost === null ? null : movement.quantity * order.unitCost
        return {
          'Dispatch Date': dateForSales(movement.date),
          'Order ID': order.id,
          Customer: order.customerName,
          'IndiaMART SKU': order.listingSku,
          'ERP SKU': order.sku,
          Quantity: movement.quantity,
          Revenue: revenue,
          'Product Cost': productCost,
          'Gross Profit': productCost === null ? null : revenue - productCost,
        }
      })), 'IndiaMART P&L')
    }
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(leads.map(lead => ({
      Lead: lead.name,
      Company: lead.company,
      Phone: lead.phone,
      Email: lead.email,
      'Product Interest': lead.productInterest,
      Location: lead.location,
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
    XLSX.writeFile(workbook, `Mahalaxmi-Enterprise-Sales-Report-${selectedMonth}.xlsx`)
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
      <section className="panel sales-dashboard-orders">
        <div className="panel-heading"><div><h2>IndiaMART inventory</h2><p>{activeIndiaMartListings.length} active listings · stock is shared with other ERP sales channels</p></div></div>
        {activeIndiaMartListings.length ? <div className="table-card entries-table"><table><thead><tr><th>IndiaMART SKU</th><th>Product</th><th>ERP stock SKU</th><th>Available stock</th><th>Listing price</th></tr></thead><tbody>
          {activeIndiaMartListings.map(listing => {
            const product = productBySku.get(listing.productSku.toLowerCase())
            return <tr key={listing.id}><td><code>{listing.listingSku}</code></td><td>{listing.productName}</td><td><code>{listing.productSku}</code></td><td>{product ? product.stock.toLocaleString('en-IN') : '—'}</td><td>{listing.listedPrice === null ? '—' : money(listing.listedPrice)}</td></tr>
          })}
        </tbody></table></div> : <div className="empty-state"><Store size={22} /><strong>No active IndiaMART listings</strong><span>Admin must map and activate products in the IndiaMART workspace.</span></div>}
      </section>
      {role === 'Super Admin' && <section className="panel sales-target-panel">
        <div className="panel-heading"><div><h2>IndiaMART gross profit</h2><p>{selectedMonth} · based on actual dispatch dates and fulfilled quantities</p></div></div>
        <div className="stats-grid sales-stats">
          <article className="stat-card"><div className="stat-icon blue"><BarChart3 size={20} /></div><div className="stat-body"><span>Dispatched revenue</span><strong>{money(indiaMartRevenue)}</strong><small>{indiaMartDispatches.length} dispatch lines</small></div></article>
          <article className="stat-card"><div className="stat-icon orange"><Boxes size={20} /></div><div className="stat-body"><span>Recorded product cost</span><strong>{money(indiaMartCost)}</strong><small>Admin cost snapshot × dispatched quantity</small></div></article>
          <article className="stat-card"><div className="stat-icon green"><Target size={20} /></div><div className="stat-body"><span>Gross product profit</span><strong>{money(indiaMartGrossProfit)}</strong><small>Cost-known dispatches only</small></div></article>
        </div>
        <p className="sales-readonly-note">Gross product profit excludes marketplace fees, shipping, taxes, and returns. {indiaMartMissingCost > 0 ? `${indiaMartMissingCost} dispatch lines have no saved unit-cost snapshot; profit is incomplete.` : 'Only fulfilled units are included.'}</p>
        {indiaMartDispatches.length > 0 && <div className="table-card entries-table"><table><thead><tr><th>Dispatch date</th><th>Order</th><th>IndiaMART SKU / ERP SKU</th><th>Qty</th><th>Revenue</th><th>Product cost</th><th>Gross profit</th></tr></thead><tbody>
          {indiaMartDispatches.map(movement => {
            const order = indiaMartOrderById.get(movement.referenceId)!
            const revenue = movement.totalAmount > 0 ? movement.totalAmount : movement.quantity * order.unitPrice
            const cost = order.unitCost === null ? null : movement.quantity * order.unitCost
            return <tr key={movement.id}><td>{dateForSales(movement.date)}</td><td><code>{order.id}</code></td><td><code>{order.listingSku || '—'}</code><small>{order.sku}</small></td><td>{movement.quantity}</td><td>{money(revenue)}</td><td>{cost === null ? 'Missing cost' : money(cost)}</td><td>{cost === null ? '—' : money(revenue - cost)}</td></tr>
          })}
        </tbody></table></div>}
      </section>}
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
        location: String(values.get('location') || '').trim(),
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
      Location: 'City, State, Country',
      Email: 'customer@example.com',
      'Product Interest': 'Product or requirement',
      Notes: 'Initial enquiry details',
      'Reference URL': 'https://example.com/lead-details.pdf',
      'Assigned To': '',
    }]), 'Leads')
    XLSX.writeFile(workbook, 'Mahalaxmi-Enterprise-Sales-Leads-Template.xlsx')
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
        {importRows.length > 0 && <div className="sales-import-preview"><strong>Preview · first {Math.min(5, importRows.length)} of {importRows.length}</strong><div className="table-card"><table><thead><tr><th>Contact</th><th>Phone</th><th>Product</th><th>Location</th><th>Company</th><th>Assigned To</th></tr></thead><tbody>{importRows.slice(0, 5).map((row, index) => <tr key={`${row.phone}-${index}`}><td>{row.name}</td><td>{row.phone}</td><td>{row.productInterest || '—'}</td><td>{row.location || '—'}</td><td>{row.company || '—'}</td><td>{salesUsers.find(user => user.id === row.assignedUserId)?.name || '—'}</td></tr>)}</tbody></table></div></div>}
        {importMessage && <p className="sales-message" role="status">{importMessage}</p>}
      </section>}
      {role === 'Super Admin' && <form className="panel form-card sales-manual-lead" onSubmit={submitManualLead}>
        <div className="panel-heading"><div><h2>Add one lead</h2><p>Use this form for a single enquiry or referral.</p></div></div>
        <div className="field-grid">
          <label>Contact name<input name="name" required maxLength={150} /></label>
          <label>Company<input name="company" maxLength={180} /></label>
          <label>Phone<input name="phone" required maxLength={40} /></label>
          <label>Location<input name="location" maxLength={240} placeholder="City, State, Country" /></label>
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
  indiaMartListings: IndiaMartListing[]
  createOrder: (input: { leadId: string; customerName: string; sku: string; productName: string; quantity: number; unitPrice: number; notes: string; salesChannel: 'DIRECT' | 'INDIAMART'; indiaMartListingId?: string }) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
}) {
  const { role, currentUserId, leads, orders, products, indiaMartListings, createOrder, cancelOrder } = props
  const [customerSelection, setCustomerSelection] = useState('')
  const [selectedSku, setSelectedSku] = useState('')
  const [salesChannel, setSalesChannel] = useState<'DIRECT' | 'INDIAMART'>('DIRECT')
  const [selectedIndiaMartListingId, setSelectedIndiaMartListingId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [quantityDraft, setQuantityDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const activeProducts = sellableProducts(products)
  const activeIndiaMartListings = indiaMartListings.filter(listing => listing.status === 'Active')
  const selectedIndiaMartListing = activeIndiaMartListings.find(listing => listing.id === selectedIndiaMartListingId)
  const selectedProduct = salesChannel === 'INDIAMART'
    ? activeProducts.find(product => product.sku === selectedIndiaMartListing?.productSku)
    : activeProducts.find(product => product.sku === selectedSku)
  const assignedLeads = leads.filter(lead => role !== 'Sales Executive' || lead.status !== 'Lost')
  const sortedOrders = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const selectedLeadId = String(values.get('leadId') || '')
    const isCustomCustomer = selectedLeadId === '__custom_customer__'
    const customerName = isCustomCustomer ? String(values.get('customerName') || '').trim() : ''
    const quantity = Number(values.get('quantity'))
    const price = salesChannel === 'INDIAMART' ? selectedIndiaMartListing?.listedPrice ?? 0 : Number(unitPrice)
    if ((isCustomCustomer && (!customerName || customerName.length > 180)) ||
        (!isCustomCustomer && !assignedLeads.some(lead => lead.id === selectedLeadId)) ||
        !selectedProduct || !Number.isInteger(quantity) || quantity < 1 || quantity > selectedProduct.stock ||
        !Number.isFinite(price) || price <= 0 ||
        salesChannel === 'INDIAMART' && !selectedIndiaMartListing) {
      setMessage('Choose an assigned lead or enter a customer name, then choose an in-stock listing and valid quantity.')
      return
    }
    const productName = String(values.get('productName') || '').trim()
    if (productName.length > 300) {
      setMessage('The order-only product name must be 300 characters or fewer.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await createOrder({
        leadId: isCustomCustomer ? '' : selectedLeadId,
        customerName,
        sku: selectedProduct.sku,
        productName: salesChannel === 'INDIAMART' ? '' : productName,
        quantity,
        unitPrice: price,
        notes: String(values.get('notes') || ''),
        salesChannel,
        indiaMartListingId: salesChannel === 'INDIAMART' ? selectedIndiaMartListing!.id : undefined,
      })
      form.reset()
      setCustomerSelection('')
      setSelectedSku('')
      setSelectedIndiaMartListingId('')
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
      <div className="page-heading"><div><p>SALES</p><h1>Sales Orders</h1><span className="dashboard-description">Choose a sales channel. IndiaMART bookings show only active IndiaMART SKUs and use the Admin-managed price and mapped shared ERP stock.</span></div></div>
      {role === 'Sales Executive' && <form className="panel form-card sales-order-form" onSubmit={submitOrder}>
        <div className="panel-heading"><div><h2>Book an order</h2><p>Custom customer and product names are saved only with the order, never as leads or catalog/listing products.</p></div></div>
        <div className="field-grid">
          <label>Sales channel<select value={salesChannel} onChange={event => {
            const channel = event.target.value as 'DIRECT' | 'INDIAMART'
            setSalesChannel(channel)
            setSelectedSku('')
            setSelectedIndiaMartListingId('')
            setUnitPrice('')
          }}><option value="DIRECT">Direct sales</option><option value="INDIAMART">IndiaMART</option></select></label>
          <label>Customer / lead<select name="leadId" required value={customerSelection} onChange={event => setCustomerSelection(event.target.value)}><option value="">Choose assigned lead</option>{assignedLeads.map(lead => <option key={lead.id} value={lead.id}>{lead.name} · {lead.phone}</option>)}<option value="__custom_customer__">Enter a one-time customer name</option></select></label>
          {customerSelection === '__custom_customer__' && <label>Customer name<input name="customerName" required maxLength={180} placeholder="Enter customer name for this order" /></label>}
          {salesChannel === 'DIRECT' && <label>One-time product name (optional)<input name="productName" maxLength={300} placeholder={selectedProduct?.name || 'Enter a name for this order'} /><small className="field-hint">Saved on this order only. Select an active inventory SKU below to reserve stock; this name will not be added to the catalog or listings.</small></label>}
          <label>{salesChannel === 'INDIAMART' ? 'IndiaMART listing SKU' : 'Product SKU'}<select value={salesChannel === 'INDIAMART' ? selectedIndiaMartListingId : selectedSku} required onChange={event => {
            if (salesChannel === 'INDIAMART') {
              setSelectedIndiaMartListingId(event.target.value)
              setUnitPrice('')
            } else {
              setSelectedSku(event.target.value)
              setUnitPrice('')
            }
          }}><option value="">{salesChannel === 'INDIAMART' ? 'Choose active IndiaMART listing' : 'Choose active SKU'}</option>
            {salesChannel === 'INDIAMART'
              ? activeIndiaMartListings.map(listing => {
                  const product = activeProducts.find(item => item.sku === listing.productSku)
                  return <option key={listing.id} value={listing.id} disabled={!product || product.stock <= 0 || !listing.listedPrice}>{listing.productName} · {listing.listingSku} · Available {product?.stock ?? 0}</option>
                })
              : activeProducts.map(product => <option key={product.sku} value={product.sku} disabled={product.stock <= 0}>{product.name} · {product.sku} · Available {product.stock}</option>)}
          </select></label>
          {selectedProduct && <div className="sales-stock-note"><span>Available after existing reservations</span><strong>{selectedProduct.stock.toLocaleString('en-IN')} units</strong></div>}
          <label>Quantity<input name="quantity" type="number" min="1" max={selectedProduct?.stock || undefined} step="1" required value={quantityDraft} onChange={event => setQuantityDraft(event.target.value)} disabled={!selectedProduct || selectedProduct.stock <= 0} /></label>
          <label>Unit price (INR)<input type="number" min="0.01" step="0.01" required value={salesChannel === 'INDIAMART' ? selectedIndiaMartListing?.listedPrice ?? '' : unitPrice} onChange={event => setUnitPrice(event.target.value)} readOnly={salesChannel === 'INDIAMART'} /></label>
          <label className="sales-note-field">Order notes<input name="notes" maxLength={500} placeholder="Delivery or customer requirement" /></label>
        </div>
        {selectedProduct && <p className="sales-amount-hint">Estimated order amount: <strong>{money((Number(quantityDraft) || 0) * (salesChannel === 'INDIAMART' ? selectedIndiaMartListing?.listedPrice || 0 : Number(unitPrice) || 0))}</strong>. Server validates current price and stock and reserves it atomically.</p>}
        <button className="primary wide" type="submit" disabled={busy || !customerSelection || !selectedProduct || selectedProduct.stock <= 0}><Plus size={16} /> Book order</button>
        {message && <p className="sales-message" role="status">{message}</p>}
      </form>}
      {role === 'Sales Executive' && assignedLeads.length === 0 && <p className="local-storage-note">No open leads are assigned to you yet. You can still book an order by entering a one-time customer name.</p>}
      <section className="panel sales-orders-list">
        <div className="panel-heading"><div><h2>Booked orders</h2><p>{orders.length} orders · {role === 'Sales Executive' ? 'your bookings' : 'all Sales Executive bookings'}</p></div></div>
        {sortedOrders.length ? <div className="table-card entries-table"><table><thead><tr><th>Booked</th><th>Order ID</th><th>Channel</th><th>Customer</th><th>Salesperson</th><th>SKU / product</th><th>Qty</th><th>Unit price</th><th>Booked amount</th><th>Fulfilment</th><th>Status</th><th /></tr></thead><tbody>
          {sortedOrders.map(order => {
            const remaining = order.quantity - order.fulfilledQuantity - order.cancelledQuantity
            const mayCancel = remaining > 0 && role !== 'Production Supervisor' && (role !== 'Sales Executive' || order.salesUserId === currentUserId)
            return <tr key={order.id}><td>{dateForSales(order.createdAt)}</td><td><code>{order.id}</code></td><td>{order.salesChannel === 'INDIAMART' ? 'IndiaMART' : 'Direct'}</td><td>{order.customerName}</td><td>{order.salesUserName}</td><td><code>{order.listingSku || order.sku}</code><small>{order.listingSku ? `ERP SKU: ${order.sku}` : order.productName}</small></td><td>{order.quantity}</td><td>{money(order.unitPrice)}</td><td>{money(activeOrderAmount(order))}</td><td>{order.fulfilledQuantity} fulfilled · {remaining} open</td><td><span className={`status ${order.status === 'Booked' ? 'pending' : 'active'}`}>{order.status}</span></td><td>{mayCancel && <button className="secondary" disabled={busy} onClick={() => { if (window.confirm(`Cancel the remaining ${remaining} units of ${order.id}? Reserved stock will be released.`)) { setBusy(true); void cancelOrder(order.id).then(() => setMessage('Order cancelled and reserved stock released.')).catch(error => setMessage(error instanceof Error ? error.message : 'Order could not be cancelled.')).finally(() => setBusy(false)) } }}>Cancel remaining</button>}</td></tr>
          })}
        </tbody></table></div> : <div className="empty-state"><FileSpreadsheet size={22} /><strong>No sales orders yet</strong><span>New bookings will be listed here for the Admin and Production Supervisor.</span></div>}
      </section>
      {role !== 'Sales Executive' && <p className="sales-readonly-note">Admin and Production Supervisor can review all orders. Only the assigned salesperson can book orders; Admin or the owning salesperson can cancel and release unfulfilled reservations.</p>}
    </section>
  )
}
