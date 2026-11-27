import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

type MarketplaceRecord = {
  id: string
  recordType: 'ORDER' | 'SETTLEMENT'
  recordId: string
  platform: string
  transactionDate: string
  orderId: string
  settlementId: string
  platformSku: string
  erpSku: string
  quantity: number
  grossSales: number
  refunds: number
  marketplaceFees: number
  shippingFees: number
  advertisingFees: number
  otherCharges: number
  taxWithheld: number
  productCost: number | null
  expectedSettlement: number
  bankCredit: number | null
  importedBy: string
  importedAt: string
}

type Props = {
  user: { role: string; platforms?: string[] }
}

type ERPExpense = { date: string; amount: number }

const columns = [
  'Record Type', 'Record ID', 'Platform', 'Transaction Date', 'Order ID', 'Settlement ID',
  'Platform SKU', 'ERP SKU', 'Quantity', 'Gross Sales', 'Refunds', 'Marketplace Fees',
  'Shipping Fees', 'Advertising Fees', 'Other Charges', 'Tax Withheld', 'Product Cost',
  'Expected Settlement', 'Bank Credit',
]

const aliases: Record<string, string> = {
  recordtype: 'recordType', type: 'recordType',
  recordid: 'recordId', transactionid: 'recordId', sourceid: 'recordId',
  platform: 'platform', marketplace: 'platform',
  transactiondate: 'transactionDate', date: 'transactionDate', orderdate: 'transactionDate',
  settlementdate: 'transactionDate', posteddate: 'transactionDate', datetime: 'transactionDate',
  orderid: 'orderId', orderno: 'orderId', ordernumber: 'orderId', orderreference: 'orderId',
  settlementid: 'settlementId', settlementreference: 'settlementId', settlementnumber: 'settlementId',
  platformsku: 'platformSku', sellersku: 'platformSku',
  erpsku: 'erpSku', productsku: 'erpSku', mastersku: 'erpSku',
  quantity: 'quantity', qty: 'quantity', units: 'quantity',
  grosssales: 'grossSales', saleamount: 'grossSales', sales: 'grossSales', itemamount: 'grossSales',
  productsales: 'grossSales', ordersales: 'grossSales', itemsubtotal: 'grossSales',
  refunds: 'refunds', refundamount: 'refunds',
  marketplacefees: 'marketplaceFees', commission: 'marketplaceFees', commissionfee: 'marketplaceFees',
  commissionfees: 'marketplaceFees', sellingfees: 'marketplaceFees', fees: 'marketplaceFees',
  shippingfees: 'shippingFees', shippingfee: 'shippingFees', shipping: 'shippingFees',
  advertisingfees: 'advertisingFees', advertising: 'advertisingFees', adspend: 'advertisingFees',
  othercharges: 'otherCharges', adjustments: 'otherCharges',
  taxwithheld: 'taxWithheld', tcs: 'taxWithheld', tds: 'taxWithheld',
  productcost: 'productCost', cogs: 'productCost',
  expectedsettlement: 'expectedSettlement', netsettlement: 'expectedSettlement',
  settlementamount: 'expectedSettlement', netpayout: 'expectedSettlement', netproceeds: 'expectedSettlement',
  bankcredit: 'bankCredit', bankreceived: 'bankCredit', bankamount: 'bankCredit',
}

const toNumber = (record: MarketplaceRecord, key: keyof MarketplaceRecord) => {
  const value = record[key]
  return value === null || value === undefined || value === '' ? 0 : Number(value) || 0
}

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(value)

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const text = String(value ?? '').trim()
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : text
}

function mapImportRows(rows: Record<string, unknown>[], defaultPlatform: string, defaultType: 'ORDER' | 'SETTLEMENT') {
  return rows.map(source => {
    const mapped: Record<string, unknown> = {}
    Object.entries(source).forEach(([header, value]) => {
      const field = aliases[normalizeHeader(header)]
      if (field) mapped[field] = field === 'transactionDate' ? normalizeDate(value) : value
    })
    if (!mapped.platform) mapped.platform = defaultPlatform
    if (!mapped.recordType) mapped.recordType = defaultType
    const recordType = String(mapped.recordType).toUpperCase()
    if (!mapped.recordId) {
      mapped.recordId = recordType === 'SETTLEMENT'
        ? mapped.settlementId
        : [mapped.orderId, mapped.platformSku || mapped.erpSku, mapped.transactionDate, mapped.quantity].join(':')
    }
    return mapped
  })
}

function downloadTemplate() {
  const csv = `${columns.join(',')}\r\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'marketplace-reconciliation-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function summarize(records: MarketplaceRecord[]) {
  return records.reduce((result, record) => {
    if (record.recordType === 'ORDER') {
      result.orders += 1
      result.gross += toNumber(record, 'grossSales')
      result.refunds += toNumber(record, 'refunds')
      result.fees += toNumber(record, 'marketplaceFees') + toNumber(record, 'shippingFees') +
        toNumber(record, 'advertisingFees') + toNumber(record, 'otherCharges')
      result.tax += toNumber(record, 'taxWithheld')
      if (record.productCost === null || record.productCost === undefined) {
        result.uncosted += 1
      } else {
        result.cost += toNumber(record, 'productCost')
        result.costedGross += toNumber(record, 'grossSales')
        result.costedRefunds += toNumber(record, 'refunds')
        result.costedFees += toNumber(record, 'marketplaceFees') + toNumber(record, 'shippingFees') +
          toNumber(record, 'advertisingFees') + toNumber(record, 'otherCharges')
      }
    } else {
      result.settlements += 1
      result.expected += toNumber(record, 'expectedSettlement')
      if (record.bankCredit === null || record.bankCredit === undefined) {
        result.unmatched += 1
      } else {
        result.bank += toNumber(record, 'bankCredit')
        result.matchedExpected += toNumber(record, 'expectedSettlement')
      }
    }
    return result
  }, {
    orders: 0, gross: 0, refunds: 0, fees: 0, cost: 0, tax: 0,
    costedGross: 0, costedRefunds: 0, costedFees: 0,
    settlements: 0, expected: 0, matchedExpected: 0, bank: 0, uncosted: 0, unmatched: 0,
  })
}

async function requestReconciliationData() {
  const response = await fetch('/api/marketplace-reconciliation')
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not load reconciliation data.')
  if (!Array.isArray(result.records) || !Array.isArray(result.erpExpenses)) {
    throw new Error('The reconciliation service returned invalid report data.')
  }
  return { records: result.records as MarketplaceRecord[], erpExpenses: result.erpExpenses as ERPExpense[] }
}

export function MarketplaceReconciliationView({ user }: Props) {
  const [records, setRecords] = useState<MarketplaceRecord[]>([])
  const [erpExpenses, setErpExpenses] = useState<ERPExpense[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(user.role === 'Super Admin')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [defaultPlatform, setDefaultPlatform] = useState(user.platforms?.[0] || '')
  const [defaultType, setDefaultType] = useState<'ORDER' | 'SETTLEMENT'>('ORDER')
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await requestReconciliationData()
      setRecords(result.records)
      setErpExpenses(result.erpExpenses)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load reconciliation data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user.role !== 'Super Admin') return
    let active = true
    void requestReconciliationData().then(result => {
      if (!active) return
      setRecords(result.records)
      setErpExpenses(result.erpExpenses)
    }).catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load reconciliation data.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [user.role])

  const periodRecords = useMemo(
    () => selectedMonth ? records.filter(record => record.transactionDate.slice(0, 7) === selectedMonth) : records,
    [records, selectedMonth],
  )
  const periodExpenses = useMemo(
    () => selectedMonth ? erpExpenses.filter(expense => expense.date.slice(0, 7) === selectedMonth) : erpExpenses,
    [erpExpenses, selectedMonth],
  )
  const summary = useMemo(() => summarize(periodRecords), [periodRecords])
  const erpExpenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const byPlatform = useMemo(() => {
    const platforms = Array.from(new Set(periodRecords.map(record => record.platform))).sort()
    return platforms.map(platform => ({ platform, ...summarize(periodRecords.filter(record => record.platform === platform)) }))
  }, [periodRecords])

  const importFile = async (file?: File) => {
    if (!file) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a report smaller than 5 MB.')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!firstSheet) throw new Error('The selected workbook has no worksheet.')
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
      if (sourceRows.length === 0) throw new Error('The selected report has no transaction rows.')
      if (sourceRows.length > 1000) throw new Error('Import up to 1,000 rows at a time.')
      const response = await fetch('/api/marketplace-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapImportRows(sourceRows, defaultPlatform, defaultType) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The report could not be imported.')
      setMessage(`Import complete: ${result.imported} new rows added; ${result.duplicates} duplicate rows skipped.`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The report could not be imported.')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (user.role !== 'Super Admin') {
    return <section className="marketplace-reconciliation">
      <div className="page-heading">
        <div><p>E-COMMERCE</p><h1>Marketplace Report Import</h1><span className="dashboard-description">Import normalized order and settlement data for your assigned marketplaces.</span></div>
      </div>
      <section className="panel reconciliation-import-panel">
        <div className="reconciliation-import-actions">
          <div><FileSpreadsheet size={22} /><div><strong>Standard report template</strong><span>Use the same template for Amazon, Flipkart, Meesho, Shopify, and Myntra.</span></div></div>
          <button className="secondary" type="button" onClick={downloadTemplate}><Download size={16} /> Download CSV template</button>
        </div>
        <div className="reconciliation-import-notes">
          <p>Prepare <strong>ORDER</strong> rows with sales, fees, SKU, quantity, and total product cost. Add a separate <strong>SETTLEMENT</strong> row for each payout, including its expected amount and optional bank credit.</p>
          <p>Choose the marketplace and report type for each upload. Common column names are recognized; if a platform export uses different headers, map/copy its data into the template. Blank product cost or bank credit is flagged rather than guessed.</p>
          <p>Your account can import only platforms assigned by the Super Admin: {user.platforms?.join(', ') || 'none assigned'}.</p>
        </div>
        <div className="reconciliation-import-fields">
          <label>Marketplace<select value={defaultPlatform} required onChange={event => setDefaultPlatform(event.target.value)}>
            {(user.platforms || []).map(platform => <option key={platform} value={platform}>{platform}</option>)}
          </select></label>
          <label>Report type<select value={defaultType} onChange={event => setDefaultType(event.target.value as 'ORDER' | 'SETTLEMENT')}>
            <option value="ORDER">Orders / transactions</option><option value="SETTLEMENT">Settlements / bank credits</option>
          </select></label>
        </div>
        <input
          ref={fileRef}
          className="reconciliation-file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          aria-label="Choose marketplace report"
          disabled={saving}
          onChange={event => void importFile(event.target.files?.[0])}
        />
        <button className="primary" type="button" disabled={saving || !defaultPlatform} onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> {saving ? 'Importing report…' : 'Choose report to import'}
        </button>
        {error && <p className="ecommerce-error" role="alert">{error}</p>}
        {message && <p className="ecommerce-feedback" role="status">{message}</p>}
      </section>
    </section>
  }

  const profit = summary.costedGross - summary.costedRefunds - summary.costedFees - summary.cost
  return <section className="marketplace-reconciliation">
    <div className="page-heading">
      <div><p>FINANCE & RECONCILIATION</p><h1>Marketplace Reconciliation</h1><span className="dashboard-description">Consolidated imported marketplace orders, costs, and settlement matching.</span></div>
      <div className="reconciliation-controls">
        <label>Report period<input aria-label="Filter report month" type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
        <button className="secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>
    </div>
    {error && <p className="ecommerce-error" role="alert">{error}</p>}
    {loading ? <div className="panel empty-state" role="status">Loading marketplace reports…</div> : <>
      <div className="reconciliation-metrics">
        <article className="panel"><span>Gross sales</span><strong>{formatCurrency(summary.gross)}</strong></article>
        <article className="panel"><span>Contribution (costed orders)</span><strong>{formatCurrency(profit)}</strong><small>Excludes uncosted orders and unallocated ERP overhead.</small></article>
        <article className="panel"><span>Expected settlement</span><strong>{formatCurrency(summary.expected)}</strong></article>
        <article className="panel"><span>Bank credited</span><strong>{formatCurrency(summary.bank)}</strong></article>
        <article className="panel"><span>Matched payout variance</span><strong>{formatCurrency(summary.matchedExpected - summary.bank)}</strong><small>Only settlement rows with bank credit entered</small></article>
        <article className="panel"><span>ERP expenses recorded</span><strong>{formatCurrency(erpExpenseTotal)}</strong><small>Unallocated company expenses; not deducted from marketplace contribution</small></article>
        <article className="panel"><span>Tax withheld</span><strong>{formatCurrency(summary.tax)}</strong><small>Shown separately, not deducted from contribution</small></article>
        <article className="panel"><span>Data exceptions</span><strong>{summary.uncosted + summary.unmatched}</strong><small>{summary.uncosted} orders missing product cost · {summary.unmatched} payouts missing bank credit</small></article>
      </div>
      <div className="panel reconciliation-table-panel">
        <div className="panel-heading"><div><h2>Platform summary</h2><p>{periodRecords.length} imported records · {selectedMonth || 'all periods'} · tax withheld is separate</p></div></div>
        {byPlatform.length === 0 ? <div className="empty-state"><FileSpreadsheet size={22} /><strong>No marketplace reports imported</strong><span>Imported executive reports will appear here.</span></div> :
          <div className="ecommerce-table-wrap"><table className="data-table">
            <thead><tr><th>Platform</th><th>Orders</th><th>Gross sales</th><th>Refunds</th><th>Fees & charges</th><th>Product cost</th><th>Est. contribution</th><th>Expected payout</th><th>Bank credited</th><th>Uncosted</th></tr></thead>
            <tbody>{byPlatform.map(row => <tr key={row.platform}>
              <td><strong>{row.platform}</strong></td><td>{row.orders}</td><td>{formatCurrency(row.gross)}</td>
              <td>{formatCurrency(row.refunds)}</td><td>{formatCurrency(row.fees)}</td><td>{formatCurrency(row.cost)}</td>
              <td>{formatCurrency(row.costedGross - row.costedRefunds - row.costedFees - row.cost)}</td>
              <td>{formatCurrency(row.expected)}</td><td>{formatCurrency(row.bank)}</td><td>{row.uncosted}</td>
            </tr>)}</tbody>
          </table></div>}
      </div>
    </>}
  </section>
}
