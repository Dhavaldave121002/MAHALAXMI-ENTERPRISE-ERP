import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireAdmin } from './_lib/session.js'
import {
  appendSheetRecord,
  ensureSheetColumns,
  loadWorkbook,
  readSheetRecords,
  saveWorkbook,
  type WorkbookContext,
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

type Machine = { id: string; name: string; type: string; department: string; operator: string; status: string }
type Production = { id: string; date: string; machine: string; sku: string; product: string; actual: number; rejected: number; createdBy: string }

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

function records(context: WorkbookContext, sheetName: string) {
  return readSheetRecords(context.workbook, sheetName)
}

function productionSkus(products: CatalogItem[]) {
  const variantMasters = new Set(
    products.filter(item => item.isVariant && item.status === 'Active').map(item => item.masterSku.toLowerCase()),
  )
  return products.filter(item =>
    item.status === 'Active' && (item.isVariant || !variantMasters.has(item.sku.toLowerCase()))
  )
}

function getSnapshot(context: WorkbookContext, user: ReturnType<typeof getSessionUser>) {
  const masters = records(context, 'Products')
  const variants = records(context, 'SKU_Variants')
  const stockBySku = new Map(records(context, 'Finished_Goods').map(row => [text(row['Product SKU']).toLowerCase(), number(row['Available Stock'])]))
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
      stock: stockBySku.get(sku.toLowerCase()) || 0,
      status: normalizedStatus(row.Status),
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
      stock: stockBySku.get(sku.toLowerCase()) || 0,
      status: master?.status === 'Active' ? normalizedStatus(row.Status) : 'Draft',
      size: text(row.Size),
      color: text(row.Color),
      packQuantity: number(row['Pack Quantity']) || 1,
      isVariant: true,
    })
  }

  const machines: Machine[] = records(context, 'Machines').flatMap((row, index) => {
    const id = text(row['Machine ID']) || `Machine ${String(index + 1).padStart(2, '0')}`
    if (!text(row['Machine Name']) && !text(row['Machine ID'])) return []
    return [{
      id,
      name: text(row['Machine Name']),
      type: text(row['Machine Type']),
      department: text(row.Department),
      operator: text(row.Operator),
      status: text(row.Status) || 'Idle',
    }]
  })

  const production: Production[] = records(context, 'Production').flatMap((row, index) => {
    const createdBy = text(row['Created By'])
    if (user.role !== 'Super Admin' && createdBy.toLowerCase() !== user.name.toLowerCase()) return []
    return [{
      id: text(row['Production ID']) || `PRO-${index + 1}`,
      date: dateKey(row.Date),
      machine: text(row['Machine ID']),
      sku: text(row['Variant SKU']) || text(row['Master SKU']),
      product: text(row['Product Name']),
      actual: number(row['Actual Quantity']),
      rejected: number(row['Rejected Quantity']),
      createdBy,
    }]
  })

  return {
    products: user.role === 'Super Admin' ? products : products.filter(item => item.status === 'Active'),
    machines,
    production,
    workbookMeta: { loaded: true, name: context.name, sheetCount: context.workbook.SheetNames.length },
  }
}

function requiredText(value: unknown, label: string, maxLength: number) {
  const result = text(value)
  if (!result || result.length > maxLength || /[\u0000-\u001f]/.test(result)) {
    throw new ApiError(400, `${label} is required and must be ${maxLength} characters or fewer.`)
  }
  return result
}

function nonnegativeNumber(value: unknown, label: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new ApiError(400, `${label} must be a non-negative number.`)
  return parsed
}

function assertUniqueSku(context: WorkbookContext, sku: string) {
  const target = sku.toLowerCase()
  const used = [
    ...records(context, 'Products').map(row => text(row['Master SKU'])),
    ...records(context, 'SKU_Variants').map(row => text(row['Variant SKU'])),
  ]
  if (used.some(existing => existing.toLowerCase() === target)) throw new ApiError(409, 'That SKU already exists in the master workbook.')
}

async function addProduct(context: WorkbookContext, body: Record<string, unknown>) {
  const sku = requiredText(body.sku, 'Master SKU', 100)
  const name = requiredText(body.name, 'Product name', 180)
  const category = text(body.category).slice(0, 100)
  const mrp = nonnegativeNumber(body.mrp, 'MRP')
  assertUniqueSku(context, sku)
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
  appendSheetRecord(context.workbook, 'Products', {
    'Internal Product ID': item.id,
    'Master SKU': item.sku,
    'Product Title': item.name,
    Category: item.category,
    MRP: item.mrp,
    Status: item.status,
    'Created Date': createdAt,
    'Updated Date': createdAt,
  }, ['Internal Product ID', 'Master SKU', 'Product Title', 'Category', 'MRP', 'Status', 'Created Date', 'Updated Date'])
  await saveWorkbook(context)
  return item
}

async function addVariant(context: WorkbookContext, body: Record<string, unknown>) {
  const masterSku = requiredText(body.masterSku, 'Master SKU', 100)
  const sku = requiredText(body.sku, 'Variant SKU', 100)
  const master = records(context, 'Products').find(row => text(row['Master SKU']).toLowerCase() === masterSku.toLowerCase())
  if (!master) throw new ApiError(404, 'Choose an existing master product before adding a SKU variant.')
  if (normalizedStatus(master.Status) !== 'Active') throw new ApiError(400, 'Activate the master product before adding variants.')
  assertUniqueSku(context, sku)
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
  appendSheetRecord(context.workbook, 'SKU_Variants', {
    'Variant ID': item.id,
    'Master SKU': item.masterSku,
    'Variant SKU': item.sku,
    Size: item.size,
    Color: item.color,
    'Pack Quantity': item.packQuantity,
    MRP: item.mrp,
    'Selling Price': sellingPrice,
    Status: item.status,
  }, ['Variant ID', 'Master SKU', 'Variant SKU', 'Size', 'Color', 'Pack Quantity', 'MRP', 'Selling Price', 'Status'])
  await saveWorkbook(context)
  return item
}

async function addMachine(context: WorkbookContext, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Machine name', 100)
  const existing = records(context, 'Machines')
  let nextId = 1
  const ids = new Set(existing.map(row => text(row['Machine ID']).toLowerCase()))
  while (ids.has(`machine ${String(nextId).padStart(2, '0')}`)) nextId += 1
  const machine: Machine = {
    id: `Machine ${String(nextId).padStart(2, '0')}`,
    name,
    type: text(body.type).slice(0, 80),
    department: text(body.department).slice(0, 80),
    operator: text(body.operator).slice(0, 100),
    status: text(body.status) || 'Idle',
  }
  if (!['Idle', 'Running', 'Maintenance'].includes(machine.status)) throw new ApiError(400, 'Choose a valid machine status.')
  appendSheetRecord(context.workbook, 'Machines', {
    'Machine ID': machine.id,
    'Machine Name': machine.name,
    'Machine Type': machine.type,
    Department: machine.department,
    Operator: machine.operator,
    Status: machine.status,
  }, ['Machine ID', 'Machine Name', 'Machine Type', 'Department', 'Operator', 'Status'])
  await saveWorkbook(context)
  return machine
}

async function addProduction(context: WorkbookContext, user: ReturnType<typeof getSessionUser>, body: Record<string, unknown>) {
  if (user.role === 'Store Manager') throw new ApiError(403, 'Your role cannot enter production records.')
  const date = requiredText(body.date, 'Production date', 10)
  const parsedDate = Date.parse(`${date}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Choose a valid production date.')
  }
  const machineId = requiredText(body.machine, 'Machine', 100)
  const machine = records(context, 'Machines').find(row => text(row['Machine ID']).toLowerCase() === machineId.toLowerCase())
  if (!machine) throw new ApiError(400, 'Choose a machine configured by the Admin.')
  if (text(machine.Status).toLowerCase() === 'maintenance') throw new ApiError(400, 'The selected machine is under maintenance.')
  const sku = requiredText(body.sku, 'SKU', 100)
  const catalog = productionSkus(getSnapshot(context, user).products).find(item => item.sku.toLowerCase() === sku.toLowerCase())
  if (!catalog) throw new ApiError(400, 'Choose an active SKU from the master workbook.')
  const actual = Number(body.actual)
  const rejected = Number(body.rejected)
  if (!Number.isInteger(actual) || actual <= 0 || !Number.isInteger(rejected) || rejected < 0 || rejected > actual) {
    throw new ApiError(400, 'Enter whole-number quantities; rejected quantity cannot exceed actual quantity.')
  }
  const id = `PRO-${randomUUID()}`
  const createdAt = new Date().toISOString()
  ensureSheetColumns(context.workbook, 'Production', ['Variant SKU'])
  appendSheetRecord(context.workbook, 'Production', {
    'Production ID': id,
    Date: date,
    'Machine ID': machineId,
    'Product Name': catalog.name,
    'Master SKU': catalog.masterSku,
    'Variant SKU': catalog.isVariant ? catalog.sku : '',
    Operator: user.name,
    'Actual Quantity': actual,
    'Rejected Quantity': rejected,
    'Created By': user.name,
    'Created Date': createdAt,
  }, ['Production ID', 'Date', 'Machine ID', 'Product Name', 'Master SKU', 'Variant SKU', 'Operator', 'Actual Quantity', 'Rejected Quantity', 'Created By', 'Created Date'])
  await saveWorkbook(context)
  return {
    id,
    date,
    machine: machineId,
    sku: catalog.sku,
    product: catalog.name,
    actual,
    rejected,
    createdBy: user.name,
  } satisfies Production
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const context = await loadWorkbook()
    const user = getSessionUser(request, context)
    if (request.method === 'GET') {
      sendJson(response, 200, getSnapshot(context, user))
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    if (action === 'addProduction') {
      const record = await addProduction(context, user, body)
      sendJson(response, 201, { record })
      return
    }
    requireAdmin(user)
    if (action === 'addProduct') {
      const product = await addProduct(context, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addVariant') {
      const product = await addVariant(context, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addMachine') {
      const machine = await addMachine(context, body)
      sendJson(response, 201, { machine })
      return
    }
    throw new ApiError(400, 'Choose a valid workbook operation.')
  } catch (error) {
    handleApiError(response, error, 'ERP workbook')
  }
}
