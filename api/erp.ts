import { randomUUID } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from './_lib/http.js'
import { getSessionUser, requireSupervisorOrAdmin } from './_lib/session.js'
import {
  addWorkbookMarketplaceListing,
  addWorkbookRawMaterial,
  applyWorkbookStockMovement,
  archiveWorkbookStockItem,
  appendWorkbookRecord,
  deleteUnusedWorkbookStockItem,
  getWorkbookData,
  importWorkbookMarketplaceCatalog,
  recordWorkbookProduction,
  readUsers,
  readSheetRecords,
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
  status: string
  createdBy: string
  createdAt: string
}

const MARKETPLACES = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
type Machine = { id: string; name: string; type: string; department: string; operator: string; status: string }
type Production = { id: string; date: string; machine: string; sku: string; product: string; actual: number; rejected: number; createdBy: string }
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

function getSnapshot(data: WorkbookData, user: PublicUser) {
  const masters = records(data, 'Products')
  const variants = records(data, 'SKU_Variants')
  const finishedRows = records(data, 'Finished_Goods')
  const stockBySku = new Map(finishedRows.map(row => [text(row['Product SKU']).toLowerCase(), number(row['Available Stock'])]))
  const archivedFinishedSkus = new Set(finishedRows
    .filter(row => text(row.Status).toLowerCase() === 'archived')
    .map(row => text(row['Product SKU']).toLowerCase()))
  const productStock = (sku: string) => user.role === 'Super Admin' || user.role === 'Production Supervisor'
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
      openingStock: number(row['Opening Stock']),
      closingStock: number(row['Closing Stock']),
      createdBy: text(row['Created By']),
    }]
  })
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
      department: text(row.Department),
      operator: text(row.Operator),
      status: text(row.Status) || 'Idle',
    }]
  })

  const production: Production[] = records(data, 'Production').flatMap((row, index) => {
    const createdBy = text(row['Created By'])
    if (user.role !== 'Production Supervisor' && user.role !== 'Super Admin' && createdBy.toLowerCase() !== user.name.toLowerCase()) return []
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
  const marketplaceListings: MarketplaceListing[] = optionalRecords(data, 'Marketplace_Listings').flatMap(row => {
    const id = text(row['Listing ID'])
    const platform = text(row.Platform)
    const platformSku = text(row['Platform SKU'])
    const productSku = text(row['Product SKU'])
    if (!platformSku || !productSku) return []
    const product = products.find(item => item.sku.toLowerCase() === productSku.toLowerCase())
    return [{
      id: id || `${platform}:${platformSku}`,
      platform,
      platformSku,
      productSku,
      masterSku: text(row['Master SKU']) || product?.masterSku || productSku,
      productName: text(row['Product Name']) || product?.name || productSku,
      status: text(row.Status) || 'Active',
      createdBy: text(row['Created By']),
      createdAt: text(row['Created At']),
    }]
  })

  return {
    products: user.role === 'Production Supervisor' || user.role === 'Super Admin' ? products : products.filter(item => item.status === 'Active'),
    marketplaceListings: user.role === 'Production Supervisor' || user.role === 'Super Admin' ? marketplaceListings : [],
    machines,
    production,
    rawMaterials: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? rawMaterials : [],
    finishedGoods: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? finishedGoods : [],
    stockMovements: user.role === 'Super Admin' || user.role === 'Production Supervisor' ? stockMovements.reverse() : [],
    workbookMeta: { loaded: true, name: data.name, sheetCount: data.sheetCount },
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

function assertUniqueSku(data: WorkbookData, sku: string) {
  const target = sku.toLowerCase()
  const used = [
    ...records(data, 'Products').map(row => text(row['Master SKU'])),
    ...records(data, 'SKU_Variants').map(row => text(row['Variant SKU'])),
  ]
  if (used.some(existing => existing.toLowerCase() === target)) throw new ApiError(409, 'That SKU already exists in the master workbook.')
}

async function addProduct(data: WorkbookData, body: Record<string, unknown>) {
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
  }, ['Internal Product ID', 'Master SKU', 'Product Title', 'Category', 'MRP', 'Status', 'Created Date', 'Updated Date'])
  return item
}

async function addVariant(data: WorkbookData, body: Record<string, unknown>) {
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
  }, ['Variant ID', 'Master SKU', 'Variant SKU', 'Size', 'Color', 'Pack Quantity', 'MRP', 'Selling Price', 'Status'])
  return item
}

async function addMarketplaceListing(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const platform = requiredText(body.platform, 'Platform', 40)
  if (!MARKETPLACES.includes(platform)) throw new ApiError(400, 'Choose a supported marketplace platform.')
  const platformSku = requiredText(body.platformSku, 'Platform SKU', 100)
  const productSku = requiredText(body.productSku, 'Product SKU', 100)
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
    createdBy: listing.createdBy,
    createdAt: listing.createdAt,
  })
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
  for (const [index, listing] of listings.entries()) {
    if (!MARKETPLACES.includes(text(listing.Platform))) {
      throw new ApiError(400, `Marketplace_Listings_Import row ${index + 1} uses an unsupported platform.`)
    }
  }
  return importWorkbookMarketplaceCatalog({ products, variants, listings, createdBy: user.name })
}

async function addMachine(data: WorkbookData, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Machine name', 100)
  const existing = records(data, 'Machines')
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
  await appendWorkbookRecord('Machines', {
    'Machine ID': machine.id,
    'Machine Name': machine.name,
    'Machine Type': machine.type,
    Department: machine.department,
    Operator: machine.operator,
    Status: machine.status,
  }, ['Machine ID', 'Machine Name', 'Machine Type', 'Department', 'Operator', 'Status'])
  return machine
}

async function addProduction(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  if (user.role === 'Store Manager') throw new ApiError(403, 'Your role cannot enter production records.')
  const date = requiredText(body.date, 'Production date', 10)
  const parsedDate = Date.parse(`${date}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, 'Choose a valid production date.')
  }
  const machineId = requiredText(body.machine, 'Machine', 100)
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
    'Product Name': catalog.name,
    'Master SKU': catalog.masterSku,
    'Variant SKU': catalog.isVariant ? catalog.sku : '',
    Operator: user.name,
    'Actual Quantity': actual,
    'Rejected Quantity': rejected,
    'Created By': user.name,
    'Created Date': createdAt,
  }
  const stockResult = await recordWorkbookProduction(productionRecord)
  const savedRecord: Production = {
    id,
    date,
    machine: machineId,
    sku: catalog.sku,
    product: catalog.name,
    actual,
    rejected,
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
  }
}

async function addRawMaterial(user: PublicUser, body: Record<string, unknown>) {
  const sku = requiredText(body.sku, 'Material SKU', 100)
  const name = requiredText(body.name, 'Material name', 180)
  const unit = requiredText(body.unit, 'Unit', 40)
  const openingStock = nonnegativeNumber(body.openingStock, 'Opening stock')
  const reorderLevel = nonnegativeNumber(body.reorderLevel, 'Reorder level')
  const unitCost = nonnegativeNumber(body.unitCost, 'Average unit cost')
  const supplier = text(body.supplier).slice(0, 180)
  const result = await addWorkbookRawMaterial({
    sku, name, unit, openingStock, reorderLevel, unitCost, supplier, createdBy: user.name,
  })
  const material = result.material
  return {
    id: text(material['Material ID']),
    sku: text(material['Material SKU']),
    name: text(material['Material Name']),
    unit: text(material.Unit),
    openingStock: number(material['Opening Stock']),
    purchaseInward: number(material['Purchase Inward']),
    supplier: text(material.Supplier),
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
  } satisfies RawMaterial
}

async function applyStockMovement(data: WorkbookData, user: PublicUser, body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  const type = requiredText(body.type, 'Movement type', 40)
  const quantity = nonnegativeNumber(body.quantity, 'Quantity')
  if (quantity <= 0 || quantity > 1_000_000_000) throw new ApiError(400, 'Quantity must be greater than zero and within the supported range.')
  const reason = text(body.reason)
  const referenceId = text(body.referenceId)
  if (reason.length > 300 || referenceId.length > 100) throw new ApiError(400, 'Reason or reference is too long.')
  if (kind === 'raw') {
    if (!['Purchase Inward', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Adjustment In', 'Adjustment Out'].includes(type)) {
      throw new ApiError(400, 'Choose a supported raw-material movement type.')
    }
  } else if (kind === 'finished') {
    if (!['Opening Stock', 'Dispatch', 'Return', 'Damage', 'Adjustment In', 'Adjustment Out', 'Reserve', 'Release Reservation'].includes(type)) {
      throw new ApiError(400, 'Choose a supported finished-goods movement type.')
    }
    if (!Number.isInteger(quantity)) throw new ApiError(400, 'Finished-goods quantity must be a whole number.')
  } else {
    throw new ApiError(400, 'Choose raw material or finished goods.')
  }
  const product = kind === 'finished'
    ? getSnapshot(data, user).products.find(item => item.sku.toLowerCase() === sku.toLowerCase())
    : undefined
  if (kind === 'finished' && !product) throw new ApiError(404, 'Choose an active SKU from the master workbook.')
  const result = await applyWorkbookStockMovement({
    kind, sku, type, quantity,
    reason: reason.slice(0, 300),
    referenceId: referenceId.slice(0, 100),
    machineId: text(body.machineId).slice(0, 100),
    unitCost: body.unitCost === undefined || body.unitCost === '' ? '' : nonnegativeNumber(body.unitCost, 'Unit cost'),
    productName: product?.name || '',
    createdBy: user.name,
  })
  return result
}

async function archiveStockItem(user: PublicUser, body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  if (!['raw', 'finished'].includes(kind)) throw new ApiError(400, 'Choose a valid stock item type.')
  return archiveWorkbookStockItem({ kind, sku, reason: text(body.reason).slice(0, 300), createdBy: user.name })
}

async function deleteUnusedStockItem(body: Record<string, unknown>) {
  const kind = text(body.kind)
  const sku = requiredText(body.sku, 'SKU', 100)
  if (!['raw', 'finished'].includes(kind)) throw new ApiError(400, 'Choose a valid stock item type.')
  return deleteUnusedWorkbookStockItem({ kind, sku })
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const data = await getWorkbookData()
    const users = readUsers(data.sheets.Users || [])
    const user = await getSessionUser(request, users)
    if (request.method === 'GET') {
      sendJson(response, 200, getSnapshot(data, user))
      return
    }

    const body = await readJsonBody(request)
    const action = text(body.action)
    if (action === 'addProduction') {
      const record = await addProduction(data, user, body)
      sendJson(response, 201, { record })
      return
    }
    if (['addRawMaterial', 'applyStockMovement', 'archiveStockItem', 'deleteUnusedStockItem'].includes(action)) {
      requireSupervisorOrAdmin(user)
      if (action === 'addRawMaterial') {
        const material = await addRawMaterial(user, body)
        sendJson(response, 201, { material })
        return
      }
      if (action === 'applyStockMovement') {
        const result = await applyStockMovement(data, user, body)
        sendJson(response, 200, result)
        return
      }
      if (action === 'archiveStockItem') {
        const result = await archiveStockItem(user, body)
        sendJson(response, 200, result)
        return
      }
      const result = await deleteUnusedStockItem(body)
      sendJson(response, 200, result)
      return
    }
    requireSupervisorOrAdmin(user)
    if (action === 'addProduct') {
      const product = await addProduct(data, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addVariant') {
      const product = await addVariant(data, body)
      sendJson(response, 201, { product })
      return
    }
    if (action === 'addMarketplaceListing') {
      const listing = await addMarketplaceListing(data, user, body)
      sendJson(response, 201, { listing })
      return
    }
    if (action === 'importMarketplaceWorkbook') {
      const result = await importMarketplaceWorkbook(user, body)
      sendJson(response, 200, { result })
      return
    }
    if (action === 'addMachine') {
      const machine = await addMachine(data, body)
      sendJson(response, 201, { machine })
      return
    }
    throw new ApiError(400, 'Choose a valid workbook operation.')
  } catch (error) {
    handleApiError(response, error, 'ERP workbook')
  }
}
