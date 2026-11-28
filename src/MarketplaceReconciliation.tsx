import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { unzip } from 'fflate'

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

const RECONCILIATION_PLATFORMS = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']

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
  if (match) return match[1]
  const dotted = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`
  const slashed = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (slashed) return `${slashed[3]}-${slashed[2]}-${slashed[1]}`
  return text
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

function cleanAmount(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(String(value ?? '').replace(/[₹,$,%\s]/g, '').replace(/,/g, '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function parseAmazonOrders(rows: Record<string, unknown>[]) {
  const result: Record<string, unknown>[] = []
  rows.forEach((row, index) => {
    const quantity = cleanAmount(row.quantity)
    const status = String(row['item-status'] ?? '').toLowerCase()
    if (!quantity || status.includes('cancel') || status.includes('refund')) return
    const orderId = String(row['amazon-order-id'] ?? '').trim()
    const sku = String(row.sku ?? '').trim()
    if (!orderId || !sku) return
    const transactionDate = normalizeDate(row['purchase-date'])
    result.push({
      recordType: 'ORDER',
      recordId: `${orderId}:${row['order-item-id'] || index}:${sku}`,
      platform: 'AMAZON',
      transactionDate,
      orderId,
      settlementId: '',
      platformSku: sku,
      erpSku: sku,
      quantity,
      grossSales: cleanAmount(row['item-price']) * quantity,
      refunds: 0,
      marketplaceFees: 0,
      shippingFees: 0,
      advertisingFees: 0,
      otherCharges: 0,
      taxWithheld: 0,
      productCost: null,
      expectedSettlement: 0,
      bankCredit: null,
    })
  })
  return result
}

function parseAmazonPayments(rows: Record<string, unknown>[]) {
  const orders = new Map<string, Record<string, unknown>>()
  const settlements = new Map<string, Record<string, unknown>>()
  const orderLevelRows: Record<string, unknown>[] = []
  const addAmounts = (existing: Record<string, unknown>, row: Record<string, unknown>) => {
    const transactionType = String(row['transaction-type'] ?? '').trim().toLowerCase()
    const amountType = String(row['amount-type'] ?? '').trim().toLowerCase()
    const description = String(row['amount-description'] ?? '').trim().toLowerCase()
    const amount = cleanAmount(row.amount)
    if (transactionType === 'refund') {
      existing.refunds = Number(existing.refunds) + Math.abs(amount)
    } else if (amountType === 'itemprice' && amount > 0) {
      existing.grossSales = Number(existing.grossSales) + amount
    } else if (amountType === 'itemfees') {
      existing.marketplaceFees = Number(existing.marketplaceFees) + Math.abs(amount)
    } else if (description.includes('easy ship') || description.includes('shipping') || description.includes('postage')) {
      existing.shippingFees = Number(existing.shippingFees) + Math.abs(amount)
    } else if (description.includes('tcs') || description.includes('tds')) {
      existing.taxWithheld = Number(existing.taxWithheld) + Math.abs(amount)
    } else if (amountType === 'promotion') {
      existing.otherCharges = Number(existing.otherCharges) + Math.abs(amount)
    }
  }
  rows.forEach((row, index) => {
    const settlementId = String(row['settlement-id'] ?? '').trim()
    const settlementAmount = cleanAmount(row['total-amount'])
    if (settlementId && settlementAmount && !settlements.has(settlementId)) {
      settlements.set(settlementId, {
        recordType: 'SETTLEMENT',
        recordId: settlementId,
        platform: 'AMAZON',
        transactionDate: normalizeDate(row['deposit-date']),
        orderId: '',
        settlementId,
        platformSku: '',
        erpSku: '',
        quantity: 0,
        grossSales: 0,
        refunds: 0,
        marketplaceFees: 0,
        shippingFees: 0,
        advertisingFees: 0,
        otherCharges: 0,
        taxWithheld: 0,
        productCost: null,
        expectedSettlement: settlementAmount,
        bankCredit: settlementAmount >= 0 ? settlementAmount : null,
      })
    }
    const transactionType = String(row['transaction-type'] ?? '').trim().toLowerCase()
    const orderId = String(row['order-id'] ?? '').trim()
    if (!orderId || (!transactionType.includes('order') && !transactionType.includes('refund') && !transactionType.includes('transaction'))) return
    const sku = String(row.sku ?? '').trim()
    if (!sku) {
      orderLevelRows.push(row)
      return
    }
    const key = `${orderId}:${sku}`
    const existing = orders.get(key) || {
      recordType: 'ORDER',
      recordId: `${orderId}:${sku}:${String(row['posted-date'] ?? row['posted-date-time'] ?? index)}`,
      platform: 'AMAZON',
      transactionDate: normalizeDate(row['posted-date'] || row['posted-date-time']),
      orderId,
      settlementId: '',
      platformSku: sku,
      erpSku: sku,
      quantity: cleanAmount(row['quantity-purchased']) || 1,
      grossSales: 0,
      refunds: 0,
      marketplaceFees: 0,
      shippingFees: 0,
      advertisingFees: 0,
      otherCharges: 0,
      taxWithheld: 0,
      productCost: null,
      expectedSettlement: 0,
      bankCredit: null,
    }
    addAmounts(existing, row)
    orders.set(key, existing)
  })
  const ordersByOrderId = new Map<string, Record<string, unknown>[]>()
  orders.forEach(order => {
    const orderId = String(order.orderId ?? '')
    const matchingOrders = ordersByOrderId.get(orderId) || []
    matchingOrders.push(order)
    ordersByOrderId.set(orderId, matchingOrders)
  })
  orderLevelRows.forEach(row => {
    const orderId = String(row['order-id'] ?? '').trim()
    const matchingOrders = ordersByOrderId.get(orderId) || []
    if (matchingOrders.length !== 1) return
    addAmounts(matchingOrders[0], row)
  })
  return [...orders.values(), ...settlements.values()]
}

function parseFlipkartOrders(rows: Record<string, unknown>[]) {
  const result: Record<string, unknown>[] = []
  rows.forEach(row => {
    const status = String(row.order_item_status ?? row.OrderItemStatus ?? '').trim().toUpperCase()
    const orderId = String(row.order_id ?? row.OrderID ?? '').trim()
    const itemId = String(row.order_item_id ?? row.OrderItemID ?? '').trim()
    const sku = String(row.sku ?? row.SKU ?? '').replace(/^(?:"*)?SKU:/i, '').replace(/^["]+|["]+$/g, '').trim()
    const quantity = cleanAmount(row.quantity)
    if (!orderId || !itemId || !sku || !quantity || status === 'CANCELLED') return
    result.push({
      recordType: 'ORDER',
      recordId: itemId,
      platform: 'FLIPKART',
      transactionDate: normalizeDate(row.order_date),
      orderId,
      settlementId: '',
      platformSku: sku,
      erpSku: sku,
      quantity,
      grossSales: 0,
      refunds: status === 'RETURNED' ? quantity : 0,
      marketplaceFees: 0,
      shippingFees: 0,
      advertisingFees: 0,
      otherCharges: 0,
      taxWithheld: 0,
      productCost: null,
      expectedSettlement: 0,
      bankCredit: null,
    })
  })
  return result
}

function parseMeeshoWorkbook(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['Order Payments']
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    range: 3,
    defval: '',
  })
  const orders: Record<string, unknown>[] = []
  const settlements = new Map<string, Record<string, unknown>>()
  rows.forEach((values) => {
    const subOrder = String(values[0] ?? '').trim()
    const sku = String(values[4] ?? '').trim()
    if (!subOrder || !sku) return
    const quantity = cleanAmount(values[10]) || 1
    const status = String(values[7] ?? '').trim().toLowerCase()
    const transactionId = String(values[11] ?? '').trim()
    const paymentDate = normalizeDate(values[12])
    const gross = cleanAmount(values[15])
    const refund = Math.abs(cleanAmount(values[16]))
    const feeAmounts = [17, 18, 19, 20, 22, 23, 24, 25, 26, 27]
      .map(column => cleanAmount(values[column]))
    const fees = feeAmounts.reduce((sum, amount) => sum + Math.max(0, -amount), 0)
    const taxWithheld = Math.abs(cleanAmount(values[34])) + Math.abs(cleanAmount(values[36]))
    const shippingCharge = cleanAmount(values[29])
    const otherCharges = -feeAmounts.reduce((sum, amount) => sum + Math.max(0, amount), 0) -
      Math.max(0, shippingCharge) - cleanAmount(values[28]) - cleanAmount(values[32]) - cleanAmount(values[33])
    orders.push({
      recordType: 'ORDER',
      recordId: subOrder,
      platform: 'MEESHO',
      transactionDate: normalizeDate(values[1]),
      orderId: subOrder,
      settlementId: transactionId,
      platformSku: sku,
      erpSku: sku,
      quantity,
      grossSales: gross,
      refunds: status.includes('rto') || status.includes('return') || refund > 0 ? refund : 0,
      marketplaceFees: fees,
      shippingFees: Math.max(0, -shippingCharge),
      advertisingFees: 0,
      otherCharges,
      taxWithheld,
      productCost: null,
      expectedSettlement: 0,
      bankCredit: null,
    })
    if (transactionId) {
      const settlementAmount = cleanAmount(values[13])
      const existing = settlements.get(transactionId)
      settlements.set(transactionId, existing ? {
        ...existing,
        expectedSettlement: Number(existing.expectedSettlement) + settlementAmount,
        bankCredit: Number(existing.bankCredit) + settlementAmount,
      } : {
        recordType: 'SETTLEMENT',
        recordId: transactionId,
        platform: 'MEESHO',
        transactionDate: paymentDate,
        orderId: '',
        settlementId: transactionId,
        platformSku: '',
        erpSku: '',
        quantity: 0,
        grossSales: 0,
        refunds: 0,
        marketplaceFees: 0,
        shippingFees: 0,
        advertisingFees: 0,
        otherCharges: 0,
        taxWithheld: 0,
        productCost: null,
        expectedSettlement: settlementAmount,
        bankCredit: settlementAmount,
      })
    }
  })
  return [...orders, ...settlements.values()]
}

function parseWorkbook(workbook: XLSX.WorkBook, defaultPlatform: string, defaultType: 'ORDER' | 'SETTLEMENT') {
  const sheetName = workbook.SheetNames.find(name => {
    const lower = name.toLowerCase()
    return lower === 'orders' || lower.includes('order') || lower.includes('payment')
  }) || workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) throw new Error('The selected workbook has no worksheet.')
  if (sheetName === 'Order Payments') return parseMeeshoWorkbook(workbook)
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  if (!rows.length) throw new Error('The selected report has no transaction rows.')
  const headers = Object.keys(rows[0]).map(normalizeHeader)
  if (headers.includes('settlementid') && headers.includes('transactiontype') &&
      headers.includes('amountdescription') && headers.includes('amount') && headers.includes('totalamount')) {
    return parseAmazonPayments(rows).filter(row => row.recordType === defaultType)
  }
  if (headers.includes('amazonorderid') || headers.includes('purchaseorderid') && headers.includes('sku')) {
    return parseAmazonOrders(rows)
  }
  if (headers.includes('orderitemid') || headers.includes('orderid') && headers.includes('sku')) {
    return parseFlipkartOrders(rows)
  }
  return mapImportRows(rows, defaultPlatform, defaultType)
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

function extractZip(bytes: Uint8Array) {
  return new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(bytes, (error, files) => {
      if (error) {
        reject(error)
        return
      }
      resolve(files)
    })
  })
}

function waitForBrowserPaint() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

export function MarketplaceReconciliationView({ user }: Props) {
  const isAdmin = user.role === 'Super Admin'
  const availablePlatforms = isAdmin ? RECONCILIATION_PLATFORMS : user.platforms || []
  const [records, setRecords] = useState<MarketplaceRecord[]>([])
  const [erpExpenses, setErpExpenses] = useState<ERPExpense[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(isAdmin)
  const [saving, setSaving] = useState(false)
  const [importStatus, setImportStatus] = useState('')
  const [importProgress, setImportProgress] = useState<{ completed: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [defaultPlatform, setDefaultPlatform] = useState(availablePlatforms[0] || '')
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
    setImportStatus('Reading report…')
    setImportProgress(null)
    setError('')
    setMessage('')
    let imported = 0
    let duplicates = 0
    let processed = 0
    let totalRows = 0
    const confirmedRecords: MarketplaceRecord[] = []
    const mergeImportedRecords = () => {
      if (!isAdmin || !confirmedRecords.length) return
      setRecords(current => {
        const existingIds = new Set(current.map(record => record.id))
        const additions = confirmedRecords.filter(record => !existingIds.has(record.id))
        return additions.length ? [...current, ...additions] : current
      })
    }
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('Choose a report smaller than 25 MB.')
      const mappedRows: Record<string, unknown>[] = []
      if (/\.zip$/i.test(file.name)) {
        setImportStatus('Extracting report files…')
        await waitForBrowserPaint()
        const archive = await extractZip(new Uint8Array(await file.arrayBuffer()))
        const reportFiles = Object.entries(archive).filter(([name]) => /\.(xlsx|xls|csv)$/i.test(name))
        if (!reportFiles.length) throw new Error('This ZIP contains PDFs only (labels/invoices), not an importable order or settlement report.')
        for (const [index, [name, bytes]] of reportFiles.entries()) {
          setImportStatus(`Reading file ${index + 1} of ${reportFiles.length}: ${name}`)
          await waitForBrowserPaint()
          const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
          for (const row of parseWorkbook(workbook, defaultPlatform, defaultType)) mappedRows.push(row)
        }
      } else {
        await waitForBrowserPaint()
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
        for (const row of parseWorkbook(workbook, defaultPlatform, defaultType)) mappedRows.push(row)
      }
      if (!mappedRows.length) throw new Error('The selected report has no supported transaction rows.')
      totalRows = mappedRows.length
      const batchSize = 500
      for (let offset = 0; offset < mappedRows.length; offset += batchSize) {
        const batch = mappedRows.slice(offset, offset + batchSize)
        const end = offset + batch.length
        setImportProgress({ completed: processed, total: totalRows })
        setImportStatus(`Importing rows ${offset + 1}–${end} of ${totalRows}…`)
        await waitForBrowserPaint()
        const response = await fetch('/api/marketplace-reconciliation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'The report could not be imported.')
        if (!Array.isArray(result.records)) throw new Error('The import completed without returning its saved rows. Refresh the dashboard to verify the result.')
        imported += Number(result.imported || 0)
        duplicates += Number(result.duplicates || 0)
        processed = end
        confirmedRecords.push(...result.records as MarketplaceRecord[])
        setImportProgress({ completed: processed, total: totalRows })
      }
      mergeImportedRecords()
      setImportStatus('')
      setMessage(`Import complete: ${imported} new rows added; ${duplicates} duplicate rows skipped. (${mappedRows.length} source rows processed.)`)
    } catch (importError) {
      mergeImportedRecords()
      const detail = importError instanceof Error ? importError.message : 'The report could not be imported.'
      setError(processed
        ? `${detail} Import stopped after ${processed} of ${totalRows} rows; ${imported} new rows were confirmed.`
        : detail)
    } finally {
      setSaving(false)
      setImportStatus('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const importPanel = (
    <section className="panel reconciliation-import-panel">
      <div className="reconciliation-import-actions">
        <div><FileSpreadsheet size={22} /><div><strong>Standard report template</strong><span>Use the same template for Amazon, Flipkart, Meesho, Shopify, and Myntra.</span></div></div>
        <button className="secondary" type="button" onClick={downloadTemplate}><Download size={16} /> Download CSV template</button>
      </div>
      <div className="reconciliation-import-notes">
        <p>Prepare <strong>ORDER</strong> rows with sales, fees, SKU, quantity, and total product cost. Add a separate <strong>SETTLEMENT</strong> row for each payout, including its expected amount and optional bank credit.</p>
        <p>For Amazon, import the Orders export as Orders / transactions, then import the Payments/Settlement report as Settlements / bank credits. The payout import excludes its overlapping order lines to avoid double-counting sales. Meesho payment workbooks import both orders and payouts from the Order Payments tab in one upload; other tabs such as Ads Cost are not imported here. For other exports with different headers, map/copy the data into the template. Blank product cost or bank credit is flagged rather than guessed.</p>
        <p>{isAdmin
          ? 'As Super Admin, you can import reports for any supported marketplace.'
          : `Your account can import only platforms assigned by the Super Admin: ${availablePlatforms.join(', ') || 'none assigned'}.`}</p>
      </div>
      <div className="reconciliation-import-fields">
        <label>Marketplace<select value={defaultPlatform} required onChange={event => setDefaultPlatform(event.target.value)}>
          {availablePlatforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}
        </select></label>
        <label>Report type<select value={defaultType} onChange={event => setDefaultType(event.target.value as 'ORDER' | 'SETTLEMENT')}>
          <option value="ORDER">Orders / transactions</option><option value="SETTLEMENT">Settlements / bank credits</option>
        </select></label>
      </div>
      <input
        ref={fileRef}
        className="reconciliation-file-input"
        type="file"
        accept=".csv,.xlsx,.xls,.zip"
        aria-label="Choose marketplace report"
        disabled={saving}
        onChange={event => void importFile(event.target.files?.[0])}
      />
      <button className="primary" type="button" disabled={saving || !defaultPlatform} onClick={() => fileRef.current?.click()}>
        <Upload size={16} /> {saving ? 'Importing report…' : 'Choose report to import'}
      </button>
      {saving && <div className="reconciliation-import-progress" role="status" aria-live="polite">
        <span>{importStatus || 'Preparing report…'}</span>
        {importProgress && <>
          <progress aria-label="Marketplace import progress" max={importProgress.total} value={importProgress.completed} />
          <small>{importProgress.completed} of {importProgress.total} rows processed</small>
        </>}
      </div>}
      {!isAdmin && error && <p className="ecommerce-error" role="alert">{error}</p>}
      {message && <p className="ecommerce-feedback" role="status">{message}</p>}
    </section>
  )

  if (!isAdmin) {
    return <section className="marketplace-reconciliation">
      <div className="page-heading">
        <div><p>E-COMMERCE</p><h1>Marketplace Report Import</h1><span className="dashboard-description">Import normalized order and settlement data for your assigned marketplaces.</span></div>
      </div>
      {importPanel}
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
    <div className="reconciliation-admin-import">
      <h2>Import marketplace reports</h2>
      {importPanel}
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
