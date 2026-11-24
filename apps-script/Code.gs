    const ERP_USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At', 'Assigned Platforms']
    const ERP_DATA_SHEETS = ['Users', 'Products', 'SKU_Variants', 'Marketplace_Listings', 'Machines', 'Raw_Materials', 'Finished_Goods', 'Stock_Movement', 'Production', 'Production_Targets', 'Sales_Leads', 'Sales_Activities', 'Sales_Orders', 'Sales_Targets']
    const ERP_WRITE_SHEETS = ['Products', 'SKU_Variants', 'Machines', 'Production']
    const ERP_SESSION_BOUND_ACTIONS = ['addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook', 'updateMarketplaceSku', 'updateMarketplaceListing', 'uploadEcommerceLabel', 'listEcommerceLabels', 'downloadEcommerceLabel', 'submitEcommerceReport', 'listEcommerceReports', 'getEcommerceTargets', 'setEcommerceTarget', 'setProductionTarget', 'importSalesLeads', 'addSalesLead', 'assignSalesLead', 'recordSalesActivity', 'createSalesOrder', 'cancelSalesOrder', 'setSalesTarget']
    const ERP_ECOMMERCE_PLATFORMS = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
    const ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY = 'ERP_ECOMMERCE_LABEL_FOLDER_ID'
    const ERP_ECOMMERCE_LABEL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
    const ERP_ECOMMERCE_LABEL_CLEANUP_HANDLER = 'cleanupExpiredEcommerceLabels_'
    const ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY = 'ERP_ECOMMERCE_REPORT_FOLDER_ID'
    const ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX = 'ERP_ECOMMERCE_EXEC_DAILY_TARGET_'
    const ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX = 'ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_'
    const ERP_WORKBOOK_CACHE_SECONDS = 10
    const ERP_WORKBOOK_CACHE_MAX_BYTES = 90000
    const ERP_RAW_MATERIAL_HEADERS = ['Material ID', 'Material Name', 'Material SKU', 'Unit', 'Opening Stock', 'Purchase Inward', 'Supplier', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Closing Stock', 'Reorder Level', 'Average Unit Cost', 'Stock Value', 'Updated Date', 'Status']
    const ERP_FINISHED_GOODS_HEADERS = ['Product SKU', 'Product Name', 'Opening Stock', 'Production Received', 'Quality Approved', 'Rejected', 'Reserved Stock', 'Available Stock', 'Dispatched Stock', 'Returned Stock', 'Damaged Stock', 'Last Updated', 'Adjustment In', 'Adjustment Out', 'Status']
    const ERP_STOCK_MOVEMENT_HEADERS = ['Movement ID', 'Date/Time', 'SKU', 'Movement Type', 'Quantity', 'Reference ID', 'Machine ID', 'Reason', 'Opening Stock', 'Closing Stock', 'Created By', 'Item Type', 'Sales Channel', 'Delivery Partner']
    const ERP_SALES_LEAD_HEADERS = ['Lead ID', 'Name', 'Company', 'Phone', 'Email', 'Product Interest', 'Notes', 'Reference URL', 'Assigned User ID', 'Assigned User Name', 'Status', 'Next Follow-Up', 'Created At', 'Created By', 'Updated At']
    const ERP_SALES_ACTIVITY_HEADERS = ['Activity ID', 'Lead ID', 'Activity Type', 'Outcome', 'Notes', 'Next Follow-Up', 'Created At', 'Created By', 'Created By Name']
    const ERP_SALES_ORDER_HEADERS = ['Order ID', 'Created At', 'Sales User ID', 'Sales User Name', 'Lead ID', 'Customer Name', 'Product SKU', 'Product Name', 'Quantity', 'Unit Price', 'Amount', 'Fulfilled Quantity', 'Cancelled Quantity', 'Status', 'Notes']
    const ERP_SALES_TARGET_HEADERS = ['Target ID', 'Sales User ID', 'Sales User Name', 'Period', 'Period Key', 'Target Amount', 'Updated At', 'Updated By']

    function onOpen(event) {
      if (!event || !event.source) {
        Logger.log('Open the bound spreadsheet to create the Mahalaxmi ERP menu.')
        return
      }
      SpreadsheetApp.getUi()
        .createMenu('Mahalaxmi ERP')
        .addItem('Configure API access', 'configureMahalaxmiErp')
        .addToUi()
    }

    function configureMahalaxmiErp() {
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
      if (!spreadsheet) throw new Error('Open this Apps Script from the converted master Google Sheet.')

      const ui = SpreadsheetApp.getUi()
      const result = ui.prompt(
        'Configure Mahalaxmi ERP',
        'Paste the private API secret generated for Vercel. It must be at least 32 characters.',
        ui.ButtonSet.OK_CANCEL,
      )
      if (result.getSelectedButton() !== ui.Button.OK) return

      const secret = result.getResponseText().trim()
      if (secret.length < 32) throw new Error('The API secret must contain at least 32 characters.')
      PropertiesService.getScriptProperties().setProperties({
        ERP_SPREADSHEET_ID: spreadsheet.getId(),
        ERP_API_SECRET: secret,
      }, false)
      ui.alert('ERP API access configured for this spreadsheet.')
    }

    function doGet() {
      const properties = PropertiesService.getScriptProperties()
      return jsonOutput_({
        service: 'Mahalaxmi ERP Apps Script',
        configured: Boolean(properties.getProperty('ERP_SPREADSHEET_ID') && properties.getProperty('ERP_API_SECRET')),
      })
    }

    function doPost(event) {
      try {
        const request = JSON.parse(event && event.postData && event.postData.contents || '{}')
        const properties = PropertiesService.getScriptProperties()
        const expectedSecret = properties.getProperty('ERP_API_SECRET')
        const spreadsheetId = properties.getProperty('ERP_SPREADSHEET_ID')
        if (!expectedSecret || !spreadsheetId) throw apiError_(503, 'Run Configure API access from the master Google Sheet first.')
        if (typeof request.secret !== 'string' || request.secret !== expectedSecret) throw apiError_(401, 'Invalid API secret.')

        const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
        const payload = request.payload || {}
        if (ERP_SESSION_BOUND_ACTIONS.indexOf(request.action) >= 0) {
          const user = assertActiveSessionUser_(spreadsheet, payload)
          payload.createdBy = user.name
          payload.sessionUserRole = user.role
          payload.sessionUserPlatforms = user.platforms
        }
        const data = dispatch_(spreadsheet, request.action, payload)
        if (['getWorkbookData', 'getUsers', 'listEcommerceLabels', 'downloadEcommerceLabel', 'uploadEcommerceLabel', 'submitEcommerceReport', 'listEcommerceReports', 'getEcommerceTargets', 'setEcommerceTarget'].indexOf(request.action) < 0) {
          try {
            invalidateWorkbookCache_(spreadsheet)
          } catch (error) {
            Logger.log('Workbook cache invalidation failed after ' + request.action + ': ' + String(error))
          }
        }
        return jsonOutput_({ ok: true, data: data })
      } catch (error) {
        return jsonOutput_({
          ok: false,
          status: Number(error && error.statusCode) || 500,
          error: String(error && error.message || 'Apps Script request failed.'),
        })
      }
    }

    function assertActiveSessionUser_(spreadsheet, payload) {
      const userId = String(payload.sessionUserId || '').trim()
      const sessionRole = String(payload.sessionRole || '').trim()
      if (!userId || !sessionRole) throw apiError_(401, 'Sign in again before changing inventory.')
      const user = readSheetRecords_(spreadsheet, 'Users').find(function (row) {
        return String(row['User ID'] || '').trim() === userId
      })
      const active = user && (user.Active === true || ['true', '1', 'yes'].indexOf(String(user.Active || '').toLowerCase()) >= 0)
      if (!active) throw apiError_(401, 'This account is inactive or no longer exists.')
      if (String(user.Role || '').trim() !== sessionRole) throw apiError_(401, 'Your role changed. Sign in again.')
      return {
        id: userId,
        name: String(user.Name || '').trim(),
        role: String(user.Role || '').trim(),
        platforms: String(user['Assigned Platforms'] || '').split(',').map(function (platform) { return platform.trim().toUpperCase() }).filter(Boolean),
      }
    }

    function dispatch_(spreadsheet, action, payload) {
      switch (action) {
        case 'getWorkbookData':
          return getWorkbookData_(spreadsheet)
        case 'getUsers':
          return { users: readCachedSheetRecords_(spreadsheet, 'Users') }
        case 'createInitialAdmin':
          return createInitialAdmin_(spreadsheet, payload.user)
        case 'appendUser':
          return appendUser_(spreadsheet, payload.user)
        case 'setUserActive':
          return setUserActive_(spreadsheet, payload.id, payload.active)
        case 'updateMarketplaceSku':
        case 'updateMarketplaceListing':
          return updateMarketplaceSku_(spreadsheet, payload)
        case 'uploadEcommerceLabel':
          return uploadEcommerceLabel_(payload)
        case 'listEcommerceLabels':
          return listEcommerceLabels_(payload)
        case 'downloadEcommerceLabel':
          return downloadEcommerceLabel_(payload)
        case 'submitEcommerceReport':
          return submitEcommerceReport_(spreadsheet, payload)
        case 'listEcommerceReports':
          return listEcommerceReports_(spreadsheet, payload)
        case 'getEcommerceTargets':
          return getEcommerceTargets_(spreadsheet, payload)
        case 'setEcommerceTarget':
          return setEcommerceTarget_(spreadsheet, payload)
        case 'setProductionTarget':
          return setProductionTarget_(spreadsheet, payload)
        case 'importSalesLeads':
          return importSalesLeads_(spreadsheet, payload)
        case 'addSalesLead':
          return addSalesLead_(spreadsheet, payload)
        case 'assignSalesLead':
          return assignSalesLead_(spreadsheet, payload)
        case 'recordSalesActivity':
          return recordSalesActivity_(spreadsheet, payload)
        case 'createSalesOrder':
          return createSalesOrder_(spreadsheet, payload)
        case 'cancelSalesOrder':
          return cancelSalesOrder_(spreadsheet, payload)
        case 'setSalesTarget':
          return setSalesTarget_(spreadsheet, payload)
        case 'appendRecord':
          return appendRecord_(spreadsheet, payload)
        case 'addMarketplaceListing':
          return addMarketplaceListing_(spreadsheet, payload)
        case 'importMarketplaceWorkbook':
          return importMarketplaceWorkbook_(spreadsheet, payload)
        case 'addRawMaterial':
          return addRawMaterial_(spreadsheet, payload)
        case 'applyStockMovement':
          return applyStockMovement_(spreadsheet, payload)
        case 'initializeZeroFinishedStock':
          return initializeZeroFinishedStock_(spreadsheet, payload)
        case 'archiveStockItem':
          return archiveStockItem_(spreadsheet, payload)
        case 'deleteUnusedStockItem':
          return deleteUnusedStockItem_(spreadsheet, payload)
        case 'recordProduction':
          return recordProduction_(spreadsheet, payload)
        default:
          throw apiError_(400, 'Unknown ERP action.')
      }
    }

    function getWorkbookData_(spreadsheet) {
      const sheets = {}
      ERP_DATA_SHEETS.forEach(function (name) {
        sheets[name] = readCachedSheetRecords_(spreadsheet, name)
      })
      const actualSheets = spreadsheet.getSheets()
      return {
        name: spreadsheet.getName(),
        sheetCount: actualSheets.length,
        sheetNames: actualSheets.map(function (sheet) { return sheet.getName() }),
        sheets: sheets,
        capabilities: { sessionBoundWrites: true },
      }
    }

    function readSheetRecords_(spreadsheet, name) {
      const sheet = spreadsheet.getSheetByName(name)
      if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return []

      const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues()
      const headers = values.shift().map(function (value) { return String(value || '').trim() })
      return values.filter(function (row) {
        return row.some(function (value) { return value !== '' && value !== null })
      }).map(function (row) {
        const record = {}
        headers.forEach(function (header, index) {
          if (header) record[header] = serializeCell_(row[index])
        })
        return record
      })
    }

    function workbookCacheKey_(spreadsheet, name) {
      return 'ERP_WORKBOOK_V2_' + spreadsheet.getId() + '_' + name
    }

    function readCachedSheetRecords_(spreadsheet, name) {
      const cache = CacheService.getScriptCache()
      const key = workbookCacheKey_(spreadsheet, name)
      let cached
      try {
        cached = cache.get(key)
      } catch (error) {
        Logger.log('Workbook cache read failed for ' + name + ': ' + String(error))
        return readSheetRecords_(spreadsheet, name)
      }
      if (cached !== null) {
        try {
          const serialized = cached.indexOf('gz:') === 0
            ? Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(cached.slice(3)))).getDataAsString()
            : cached.indexOf('json:') === 0 ? cached.slice(5) : cached
          const records = JSON.parse(serialized)
          if (Array.isArray(records)) return records
          Logger.log('Ignoring invalid ERP workbook cache entry for ' + name + '.')
        } catch (error) {
          Logger.log('Ignoring invalid ERP workbook cache entry for ' + name + ': ' + String(error))
        }
        try {
          cache.remove(key)
        } catch (error) {
          Logger.log('Could not remove invalid ERP workbook cache entry for ' + name + ': ' + String(error))
        }
      }

      const records = readSheetRecords_(spreadsheet, name)
      const serialized = JSON.stringify(records)
      let cacheValue = ''
      try {
        const compressed = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(serialized, 'application/json')).getBytes())
        if (compressed.length + 3 <= ERP_WORKBOOK_CACHE_MAX_BYTES) cacheValue = 'gz:' + compressed
      } catch (error) {
        Logger.log('Workbook cache compression failed for ' + name + ': ' + String(error))
      }
      if (!cacheValue && Utilities.newBlob(serialized).getBytes().length + 5 <= ERP_WORKBOOK_CACHE_MAX_BYTES) {
        cacheValue = 'json:' + serialized
      }
      if (cacheValue) {
        try {
          cache.put(key, cacheValue, ERP_WORKBOOK_CACHE_SECONDS)
        } catch (error) {
          Logger.log('Workbook cache write failed for ' + name + ': ' + String(error))
        }
      }
      return records
    }

    function invalidateWorkbookCache_(spreadsheet) {
      const keys = ERP_DATA_SHEETS.map(function (name) {
        return workbookCacheKey_(spreadsheet, name)
      })
      CacheService.getScriptCache().removeAll(keys)
    }

    function ensureStockSheet_(spreadsheet, name, requiredHeaders, backupState) {
      let sheet = spreadsheet.getSheetByName(name)
      if (!sheet) {
        createBackupOnce_(spreadsheet, backupState)
        sheet = spreadsheet.insertSheet(name)
      }
      if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
        createBackupOnce_(spreadsheet, backupState)
        sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders])
      }
      let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
      requiredHeaders.forEach(function (header) {
        if (headers.indexOf(header) >= 0) return
        createBackupOnce_(spreadsheet, backupState)
        sheet.getRange(1, headers.length + 1).setValue(header)
        headers.push(header)
      })
      return { sheet: sheet, headers: headers }
    }

    function findStockRow_(sheet, headers, key, value) {
      const keyIndex = headers.indexOf(key)
      if (keyIndex < 0 || sheet.getLastRow() < 2) return 0
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
      const target = String(value || '').trim().toLowerCase()
      for (let index = 0; index < rows.length; index += 1) {
        if (String(rows[index][keyIndex] || '').trim().toLowerCase() === target) return index + 2
      }
      return 0
    }

    function findCatalogProductName_(spreadsheet, sku) {
      const target = String(sku || '').trim().toLowerCase()
      if (!target) return ''
      const products = readSheetRecords_(spreadsheet, 'Products')
      const master = products.find(function (row) {
        return String(row['Master SKU'] || '').trim().toLowerCase() === target
          && String(row.Status || '').trim().toLowerCase() === 'active'
      })
      if (master) return String(master['Product Title'] || sku).trim()

      const variant = readSheetRecords_(spreadsheet, 'SKU_Variants').find(function (row) {
        return String(row['Variant SKU'] || '').trim().toLowerCase() === target
          && String(row.Status || '').trim().toLowerCase() === 'active'
      })
      if (!variant) return ''
      const masterSku = String(variant['Master SKU'] || '').trim()
      const parent = products.find(function (row) {
        return String(row['Master SKU'] || '').trim().toLowerCase() === masterSku.toLowerCase()
          && String(row.Status || '').trim().toLowerCase() === 'active'
      })
      if (!parent) return ''
      return String(parent && parent['Product Title'] || masterSku || sku).trim()
    }

    function readStockRow_(sheet, headers, rowNumber) {
      if (!rowNumber) return null
      const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]
      const record = {}
      headers.forEach(function (header, index) { if (header) record[header] = values[index] })
      return record
    }

    function appendStockRow_(sheet, headers, record) {
      sheet.appendRow(headers.map(function (header) {
        return safeCellValue_(record[header] === undefined ? '' : record[header])
      }))
    }

    function updateStockRow_(sheet, headers, rowNumber, record) {
      const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]
      headers.forEach(function (header, index) {
        if (record[header] !== undefined) values[index] = safeCellValue_(record[header])
      })
      sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values])
    }

    function stockNumber_(value, label) {
      if (value === '' || value === null || value === undefined) return 0
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) throw apiError_(422, label + ' must be a valid number.')
      return parsed
    }

    function stockMovementRecord_(input) {
      return {
        'Movement ID': Utilities.getUuid(),
        'Date/Time': new Date().toISOString(),
        SKU: input.sku,
        'Movement Type': input.type,
        Quantity: input.quantity,
        'Reference ID': input.referenceId || '',
        'Machine ID': input.machineId || '',
        Reason: input.reason || '',
        'Opening Stock': input.opening,
        'Closing Stock': input.closing,
        'Created By': input.createdBy || '',
        'Item Type': input.itemType,
        'Sales Channel': input.salesChannel || '',
        'Delivery Partner': input.deliveryPartner || '',
      }
    }

    function appendStockMovement_(spreadsheet, movement, backupState) {
      const stockSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
      appendStockRow_(stockSheet.sheet, stockSheet.headers, movement)
      return movement
    }

    function rawClosingStock_(record) {
      const closing = record['Closing Stock']
      if (closing !== '' && closing !== null && closing !== undefined) return stockNumber_(closing, 'Closing stock')
      return stockNumber_(record['Opening Stock'], 'Opening stock')
        + stockNumber_(record['Purchase Inward'], 'Purchase inward')
        - stockNumber_(record['Material Issued'], 'Material issued')
        - stockNumber_(record['Machine Consumption'], 'Machine consumption')
        - stockNumber_(record['Stitching Consumption'], 'Stitching consumption')
        - stockNumber_(record.Wastage, 'Wastage')
        + stockNumber_(record['Adjustment In'], 'Adjustment in')
        - stockNumber_(record['Adjustment Out'], 'Adjustment out')
    }

    function finishedAvailableStock_(record) {
      const received = stockNumber_(record['Production Received'], 'Production received')
      const rejected = stockNumber_(record.Rejected, 'Rejected')
      const approvedValue = record['Quality Approved']
      const approved = approvedValue === '' || approvedValue === null || approvedValue === undefined
        ? Math.max(0, received - rejected)
        : stockNumber_(approvedValue, 'Quality approved')
      return stockNumber_(record['Opening Stock'], 'Opening stock')
        + approved
        + stockNumber_(record['Returned Stock'], 'Returned stock')
        + stockNumber_(record['Adjustment In'], 'Adjustment in')
        - stockNumber_(record['Dispatched Stock'], 'Dispatched stock')
        - stockNumber_(record['Damaged Stock'], 'Damaged stock')
        - stockNumber_(record['Reserved Stock'], 'Reserved stock')
        - stockNumber_(record['Adjustment Out'], 'Adjustment out')
    }

    function addRawMaterial_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const sku = String(payload.sku || '').trim()
        const name = String(payload.name || '').trim()
        const unit = String(payload.unit || '').trim()
        if (!sku || !name || !unit) throw apiError_(400, 'Material SKU, name, and unit are required.')
        const opening = stockNumber_(payload.openingStock, 'Opening stock')
        const reorder = stockNumber_(payload.reorderLevel, 'Reorder level')
        const unitCost = stockNumber_(payload.unitCost, 'Average unit cost')
        if (opening < 0 || reorder < 0 || unitCost < 0) throw apiError_(400, 'Stock, reorder level, and unit cost cannot be negative.')

        const backupState = { created: false }
        const raw = ensureStockSheet_(spreadsheet, 'Raw_Materials', ERP_RAW_MATERIAL_HEADERS, backupState)
        if (findStockRow_(raw.sheet, raw.headers, 'Material SKU', sku)) throw apiError_(409, 'That material SKU already exists.')
        const now = new Date().toISOString()
        const material = {
          'Material ID': 'MAT-' + Utilities.getUuid(),
          'Material Name': name,
          'Material SKU': sku,
          Unit: unit,
          'Opening Stock': opening,
          'Purchase Inward': 0,
          Supplier: String(payload.supplier || '').trim(),
          'Material Issued': 0,
          'Machine Consumption': 0,
          'Stitching Consumption': 0,
          Wastage: 0,
          'Adjustment In': 0,
          'Adjustment Out': 0,
          'Closing Stock': opening,
          'Reorder Level': reorder,
          'Average Unit Cost': unitCost,
          'Stock Value': opening * unitCost,
          'Updated Date': now,
          Status: 'Active',
        }
        createBackupOnce_(spreadsheet, backupState)
        appendStockRow_(raw.sheet, raw.headers, material)
        let movement = null
        if (opening > 0) {
          movement = appendStockMovement_(spreadsheet, stockMovementRecord_({
            sku: sku, type: 'Opening Stock', quantity: opening, opening: 0, closing: opening,
            itemType: 'Raw Material', reason: 'Initial stock balance', createdBy: payload.createdBy,
          }), backupState)
        }
        SpreadsheetApp.flush()
        return { material: material, movement: movement }
      })
    }

    function applyStockMovement_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const kind = String(payload.kind || '')
        const sku = String(payload.sku || '').trim()
        const type = String(payload.type || '')
        const reason = String(payload.reason || '').trim()
        const referenceId = String(payload.referenceId || '').trim()
        const salesChannel = String(payload.salesChannel || '').trim()
        const deliveryPartner = String(payload.deliveryPartner || '').trim()
        const linkToDispatch = payload.linkToDispatch === true
        const linkedOrderReturn = linkToDispatch && kind === 'finished' && ['Return', 'Damage'].indexOf(type) >= 0
        const quantity = stockNumber_(payload.quantity, 'Quantity')
        if (!sku || quantity <= 0) throw apiError_(400, 'Choose an item and enter a quantity greater than zero.')
        if (reason.length > 300 || referenceId.length > 100) throw apiError_(400, 'Reason or reference is too long.')
        if (payload.linkToDispatch !== undefined && typeof payload.linkToDispatch !== 'boolean') {
          throw apiError_(400, 'Choose whether this return is linked to a dispatched order.')
        }
        if (linkToDispatch && (!linkedOrderReturn || !referenceId || !salesChannel || deliveryPartner)) {
          throw apiError_(400, 'A linked return requires a finished-goods order, platform, and order number.')
        }
        if (salesChannel || deliveryPartner) {
          if (kind !== 'finished' || (!linkedOrderReturn && type !== 'Dispatch') || (type === 'Dispatch' && (!salesChannel || !deliveryPartner))) {
            throw apiError_(400, 'A supported platform is required for dispatches and linked returns.')
          }
          if (['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA', 'DIRECT'].indexOf(salesChannel) < 0 || deliveryPartner.length > 100) {
            throw apiError_(400, 'Choose a supported delivery channel and a valid delivery partner.')
          }
          if (type === 'Dispatch' && !referenceId) throw apiError_(400, 'Enter the marketplace order number to enable order-linked returns.')
        }

        const isRaw = kind === 'raw'
        if (!isRaw && kind !== 'finished') throw apiError_(400, 'Choose raw material or finished goods.')
        const catalogProductName = isRaw ? '' : findCatalogProductName_(spreadsheet, sku)
        if (!isRaw && !catalogProductName) throw apiError_(404, 'Choose an active SKU from the master workbook.')
        const sheetName = isRaw ? 'Raw_Materials' : 'Finished_Goods'
        const itemType = isRaw ? 'Raw Material' : 'Finished Goods'
        const headers = isRaw ? ERP_RAW_MATERIAL_HEADERS : ERP_FINISHED_GOODS_HEADERS
        const key = isRaw ? 'Material SKU' : 'Product SKU'
        const backupState = { created: false }
        const stockSheet = ensureStockSheet_(spreadsheet, sheetName, headers, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const rowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, key, sku)
        let item = readStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber)
        let salesOrderSheet = null
        let salesOrderHeaders = []
        let salesOrderRowNumber = 0
        let linkedSalesOrder = null
        if (!isRaw && type === 'Dispatch' && referenceId) {
          salesOrderSheet = spreadsheet.getSheetByName('Sales_Orders')
          if (salesOrderSheet && salesOrderSheet.getLastRow() > 1) {
            salesOrderHeaders = salesOrderSheet.getRange(1, 1, 1, salesOrderSheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
            salesOrderRowNumber = findStockRow_(salesOrderSheet, salesOrderHeaders, 'Order ID', referenceId)
            if (salesOrderRowNumber) linkedSalesOrder = readStockRow_(salesOrderSheet, salesOrderHeaders, salesOrderRowNumber)
          }
        }
        if (!item && !isRaw && (['Opening Stock', 'Adjustment In'].indexOf(type) >= 0 || (type === 'Dispatch' && salesChannel && deliveryPartner))) {
          item = {
            'Product SKU': sku, 'Product Name': catalogProductName,
            'Opening Stock': 0, 'Production Received': 0, 'Quality Approved': 0, Rejected: 0,
            'Reserved Stock': 0, 'Available Stock': 0, 'Dispatched Stock': 0, 'Returned Stock': 0,
            'Damaged Stock': 0, 'Adjustment In': 0, 'Adjustment Out': 0, Status: 'Active',
          }
        }
        if (!item) throw apiError_(404, 'Stock item was not found. Add the material or product first.')
        if (String(item.Status || 'Active').toLowerCase() === 'archived') throw apiError_(409, 'This item is archived and cannot receive stock movements.')

        if (referenceId) {
          const movementRows = movementSheet.sheet.getLastRow() >= 2
            ? readSheetRecords_(spreadsheet, 'Stock_Movement')
            : []
          const matchingReference = movementRows.filter(function (row) {
            return String(row['Item Type'] || '') === itemType
              && String(row.SKU || '').trim().toLowerCase() === sku.toLowerCase()
              && String(row['Reference ID'] || '').trim().toLowerCase() === referenceId.toLowerCase()
          })
          if (linkedOrderReturn) {
            const dispatch = matchingReference.find(function (row) {
              return String(row['Movement Type'] || '') === 'Dispatch'
                && String(row['Sales Channel'] || '') === salesChannel
            })
            if (!dispatch) throw apiError_(404, 'The selected platform order was not found in the dispatch ledger.')
            const alreadyReturnedOrDamaged = matchingReference.filter(function (row) {
              return ['Return', 'Damage'].indexOf(String(row['Movement Type'] || '')) >= 0
                && (!String(row['Sales Channel'] || '') || String(row['Sales Channel'] || '') === salesChannel)
            }).reduce(function (total, row) {
              return total + stockNumber_(row.Quantity, 'Recorded return quantity')
            }, 0)
            const dispatchedQuantity = stockNumber_(dispatch.Quantity, 'Dispatched quantity')
            if (alreadyReturnedOrDamaged + quantity > dispatchedQuantity) {
              throw apiError_(409, 'Return and damage quantities cannot exceed the remaining quantity from this order.')
            }
          } else if (!linkedSalesOrder && matchingReference.some(function (row) {
            return type !== 'Dispatch' || !salesChannel || !String(row['Sales Channel'] || '') || String(row['Sales Channel'] || '') === salesChannel
          })) {
            throw apiError_(409, 'That reference was already used for this stock item.')
          }
        }
        if (linkedSalesOrder) {
          const remainingOrderQuantity = stockNumber_(linkedSalesOrder.Quantity, 'Sales order quantity')
            - stockNumber_(linkedSalesOrder['Fulfilled Quantity'], 'Fulfilled quantity')
            - stockNumber_(linkedSalesOrder['Cancelled Quantity'], 'Cancelled quantity')
          if (String(linkedSalesOrder['Product SKU'] || '').trim().toLowerCase() !== sku.toLowerCase()) {
            throw apiError_(409, 'The selected sales order is for a different product SKU.')
          }
          if (quantity > remainingOrderQuantity) throw apiError_(409, 'Dispatch quantity exceeds the remaining sales order quantity.')
        }

        const opening = isRaw ? rawClosingStock_(item) : finishedAvailableStock_(item)
        let closing = opening
        if (isRaw) {
          const fields = {
            'Purchase Inward': 1,
            'Material Issued': -1,
            'Machine Consumption': -1,
            'Stitching Consumption': -1,
            Wastage: -1,
            'Adjustment In': 1,
            'Adjustment Out': -1,
          }
          const direction = fields[type]
          if (!direction) throw apiError_(400, 'Choose a supported raw-material movement type.')
          closing += direction * quantity
          if (closing < 0) throw apiError_(409, 'This movement would make raw-material stock negative.')
          item[type] = stockNumber_(item[type], type) + quantity
          if (type === 'Purchase Inward' && payload.unitCost !== undefined && payload.unitCost !== '') {
            const cost = stockNumber_(payload.unitCost, 'Unit cost')
            if (cost < 0) throw apiError_(400, 'Unit cost cannot be negative.')
            const oldCost = stockNumber_(item['Average Unit Cost'], 'Average unit cost')
            item['Average Unit Cost'] = closing === 0 ? cost : ((opening * oldCost) + (quantity * cost)) / closing
          }
          item['Closing Stock'] = closing
          item['Stock Value'] = closing * stockNumber_(item['Average Unit Cost'], 'Average unit cost')
          item['Updated Date'] = new Date().toISOString()
        } else {
          const fields = {
            'Opening Stock': ['Opening Stock', 1, 1],
            Dispatch: ['Dispatched Stock', -1, 1],
            Return: ['Returned Stock', 1, 1],
            Damage: ['Damaged Stock', -1, 1],
            'Adjustment In': ['Adjustment In', 1, 1],
            'Adjustment Out': ['Adjustment Out', -1, 1],
            Reserve: ['Reserved Stock', -1, 1],
            'Release Reservation': ['Reserved Stock', 1, -1],
          }
          const mapping = fields[type]
          if (!mapping) throw apiError_(400, 'Choose a supported finished-goods movement type.')
          if (type === 'Dispatch' && linkedSalesOrder) {
            const reserved = stockNumber_(item['Reserved Stock'], 'Reserved stock')
            if (reserved < quantity) throw apiError_(409, 'The sales order reservation is missing. Ask a supervisor to review it.')
            item['Reserved Stock'] = reserved - quantity
            item['Dispatched Stock'] = stockNumber_(item['Dispatched Stock'], 'Dispatched stock') + quantity
            linkedSalesOrder['Fulfilled Quantity'] = stockNumber_(linkedSalesOrder['Fulfilled Quantity'], 'Fulfilled quantity') + quantity
            linkedSalesOrder.Status = salesOrderStatus_(linkedSalesOrder)
          } else if (linkedOrderReturn && type === 'Damage') {
            item['Returned Stock'] = stockNumber_(item['Returned Stock'], 'Returned stock') + quantity
            item['Damaged Stock'] = stockNumber_(item['Damaged Stock'], 'Damaged stock') + quantity
          } else {
            closing += mapping[1] * quantity
            if (closing < 0) throw apiError_(409, 'This movement would make available stock negative.')
            const updatedValue = stockNumber_(item[mapping[0]], mapping[0]) + mapping[2] * quantity
            if (updatedValue < 0) throw apiError_(409, 'You cannot release more units than are currently reserved.')
            item[mapping[0]] = updatedValue
          }
          item['Available Stock'] = finishedAvailableStock_(item)
          item['Last Updated'] = new Date().toISOString()
        }
        if (item['Available Stock'] !== undefined) closing = stockNumber_(item['Available Stock'], 'Available stock')

        createBackupOnce_(spreadsheet, backupState)
        if (rowNumber) updateStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber, item)
        else appendStockRow_(stockSheet.sheet, stockSheet.headers, item)
        if (linkedSalesOrder && salesOrderSheet && salesOrderRowNumber) {
          updateStockRow_(salesOrderSheet, salesOrderHeaders, salesOrderRowNumber, linkedSalesOrder)
        }
        const movement = stockMovementRecord_({
          sku: sku, type: type, quantity: quantity, referenceId: referenceId,
          machineId: payload.machineId, reason: reason, opening: opening, closing: closing,
          createdBy: payload.createdBy, itemType: itemType,
          salesChannel: salesChannel, deliveryPartner: deliveryPartner,
        })
        appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        SpreadsheetApp.flush()
        return { item: item, movement: movement }
      })
    }

    function initializeZeroFinishedStock_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const marker = 'ERP_ZERO_FINISHED_STOCK_INITIALIZED_' + spreadsheet.getId()
        const properties = PropertiesService.getScriptProperties()
        if (properties.getProperty(marker)) {
          throw apiError_(409, 'The one-time zero-stock initialization has already been completed.')
        }

        const products = readSheetRecords_(spreadsheet, 'Products')
        const masters = new Map()
        products.forEach(function (row) {
          const sku = String(row['Master SKU'] || '').trim()
          if (sku && String(row.Status || '').trim().toLowerCase() === 'active') {
            masters.set(sku.toLowerCase(), {
              sku: sku,
              name: String(row['Product Title'] || sku).trim(),
            })
          }
        })

        const catalog = new Map()
        masters.forEach(function (product) { catalog.set(product.sku.toLowerCase(), product) })
        readSheetRecords_(spreadsheet, 'SKU_Variants').forEach(function (row) {
          const sku = String(row['Variant SKU'] || '').trim()
          const masterSku = String(row['Master SKU'] || '').trim()
          const parent = masters.get(masterSku.toLowerCase())
          if (sku && parent && String(row.Status || '').trim().toLowerCase() === 'active') {
            if (!catalog.has(sku.toLowerCase())) catalog.set(sku.toLowerCase(), { sku: sku, name: parent.name })
          }
        })

        const backupState = { created: false }
        const finished = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const skuIndex = finished.headers.indexOf('Product SKU')
        const existingRows = finished.sheet.getLastRow() > 1
          ? finished.sheet.getRange(2, 1, finished.sheet.getLastRow() - 1, finished.headers.length).getValues()
          : []
        const rowNumbers = new Map()
        existingRows.forEach(function (row, index) {
          const sku = String(row[skuIndex] || '').trim().toLowerCase()
          if (sku && !rowNumbers.has(sku)) rowNumbers.set(sku, index + 2)
        })

        let updated = 0
        let unchanged = 0
        let archived = 0
        const newStockRows = []
        const movements = []
        catalog.forEach(function (product) {
          const key = product.sku.toLowerCase()
          const rowNumber = rowNumbers.get(key) || 0
          let item = null
          if (rowNumber) {
            item = {}
            finished.headers.forEach(function (header, index) {
              if (header) item[header] = existingRows[rowNumber - 2][index]
            })
          }
          if (item && String(item.Status || '').trim().toLowerCase() === 'archived') {
            archived += 1
            return
          }
          const current = item ? finishedAvailableStock_(item) : 0
          if (current > 0) {
            unchanged += 1
            return
          }

          if (!item) {
            item = {
              'Product SKU': product.sku,
              'Product Name': product.name,
              'Opening Stock': 0,
              'Production Received': 0,
              'Quality Approved': 0,
              Rejected: 0,
              'Reserved Stock': 0,
              'Available Stock': 0,
              'Dispatched Stock': 0,
              'Returned Stock': 0,
              'Damaged Stock': 0,
              'Adjustment In': 0,
              'Adjustment Out': 0,
              Status: 'Active',
            }
          }
          const adjustment = 10000 - current
          item['Adjustment In'] = stockNumber_(item['Adjustment In'], 'Adjustment in') + adjustment
          item['Available Stock'] = finishedAvailableStock_(item)
          if (item['Available Stock'] !== 10000) throw apiError_(409, 'Could not set SKU ' + product.sku + ' to the requested available balance.')
          item['Last Updated'] = new Date().toISOString()

          createBackupOnce_(spreadsheet, backupState)
          if (rowNumber) updateStockRow_(finished.sheet, finished.headers, rowNumber, item)
          else newStockRows.push(item)
          movements.push(stockMovementRecord_({
            sku: product.sku,
            type: 'Adjustment In',
            quantity: adjustment,
            opening: current,
            closing: 10000,
            reason: 'One-time initialization of zero or negative stock to 10,000',
            createdBy: payload.createdBy,
            itemType: 'Finished Goods',
          }))
          updated += 1
        })

        if (newStockRows.length) {
          const firstStockRow = finished.sheet.getLastRow() + 1
          finished.sheet.getRange(firstStockRow, 1, newStockRows.length, finished.headers.length)
            .setValues(newStockRows.map(function (item) {
              return finished.headers.map(function (header) {
                return safeCellValue_(item[header] === undefined ? '' : item[header])
              })
            }))
        }
        if (movements.length) {
          const firstMovementRow = movementSheet.sheet.getLastRow() + 1
          movementSheet.sheet.getRange(firstMovementRow, 1, movements.length, movementSheet.headers.length)
            .setValues(movements.map(function (movement) {
              return movementSheet.headers.map(function (header) {
                return safeCellValue_(movement[header] === undefined ? '' : movement[header])
              })
            }))
        }
        SpreadsheetApp.flush()
        properties.setProperty(marker, new Date().toISOString())
        return { updated: updated, unchanged: unchanged, archived: archived, targetStock: 10000 }
      })
    }

    function archiveStockItem_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const kind = String(payload.kind || '')
        const sku = String(payload.sku || '').trim()
        const isRaw = kind === 'raw'
        if (!sku || (!isRaw && kind !== 'finished')) throw apiError_(400, 'Choose a valid stock item.')
        const backupState = { created: false }
        const stockSheet = ensureStockSheet_(spreadsheet, isRaw ? 'Raw_Materials' : 'Finished_Goods', isRaw ? ERP_RAW_MATERIAL_HEADERS : ERP_FINISHED_GOODS_HEADERS, backupState)
        const key = isRaw ? 'Material SKU' : 'Product SKU'
        const rowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, key, sku)
        const item = readStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber)
        if (!item) throw apiError_(404, 'Stock item was not found.')
        const balance = isRaw ? rawClosingStock_(item) : finishedAvailableStock_(item)
        if (balance !== 0) throw apiError_(409, 'Stock must be zero before this item can be archived.')
        if (String(item.Status || '').toLowerCase() === 'archived') throw apiError_(409, 'This item is already archived.')
        createBackupOnce_(spreadsheet, backupState)
        item.Status = 'Archived'
        if (isRaw) item['Updated Date'] = new Date().toISOString()
        else item['Last Updated'] = new Date().toISOString()
        updateStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber, item)
        appendStockMovement_(spreadsheet, stockMovementRecord_({
          sku: sku, type: 'Item Archived', quantity: 0, opening: balance, closing: balance,
          itemType: isRaw ? 'Raw Material' : 'Finished Goods',
          reason: String(payload.reason || 'Archived by administrator'), createdBy: payload.createdBy,
        }), backupState)
        SpreadsheetApp.flush()
        return { item: item }
      })
    }

    function deleteUnusedStockItem_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const kind = String(payload.kind || '')
        const sku = String(payload.sku || '').trim()
        const isRaw = kind === 'raw'
        if (!sku || (!isRaw && kind !== 'finished')) throw apiError_(400, 'Choose a valid stock item.')
        const backupState = { created: false }
        const stockSheet = ensureStockSheet_(spreadsheet, isRaw ? 'Raw_Materials' : 'Finished_Goods', isRaw ? ERP_RAW_MATERIAL_HEADERS : ERP_FINISHED_GOODS_HEADERS, backupState)
        const key = isRaw ? 'Material SKU' : 'Product SKU'
        const rowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, key, sku)
        const item = readStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber)
        if (!item) throw apiError_(404, 'Stock item was not found.')
        const balance = isRaw ? rawClosingStock_(item) : finishedAvailableStock_(item)
        if (balance !== 0) throw apiError_(409, 'Stock must be zero before an unused item can be deleted.')
        const movements = readSheetRecords_(spreadsheet, 'Stock_Movement')
        const itemType = isRaw ? 'Raw Material' : 'Finished Goods'
        if (movements.some(function (row) {
          const movementType = String(row['Item Type'] || '')
          return (!movementType || movementType === itemType) && String(row.SKU || '').trim().toLowerCase() === sku.toLowerCase()
        })) throw apiError_(409, 'This item has stock history; archive it instead of deleting it.')
        createBackupOnce_(spreadsheet, backupState)
        stockSheet.sheet.deleteRow(rowNumber)
        SpreadsheetApp.flush()
        return { deleted: true, sku: sku }
      })
    }

    function recordProduction_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const record = payload.record
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw apiError_(400, 'A production record is required.')
        const actual = stockNumber_(record['Actual Quantity'], 'Actual quantity')
        const rejected = stockNumber_(record['Rejected Quantity'], 'Rejected quantity')
        const sku = String(record['Variant SKU'] || record['Master SKU'] || '').trim()
        if (!sku || actual <= 0 || rejected < 0 || rejected > actual) throw apiError_(400, 'Production quantities or SKU are invalid.')

        const productionSheet = spreadsheet.getSheetByName('Production')
        if (!productionSheet || productionSheet.getLastRow() < 1) throw apiError_(422, 'The Production sheet is missing its header row.')
        let productionHeaders = productionSheet.getRange(1, 1, 1, productionSheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const required = ['Production ID', 'Date', 'Machine ID', 'Product Name', 'Master SKU', 'Actual Quantity', 'Rejected Quantity', 'Created By', 'Created Date', 'Variant SKU']
        const missing = required.filter(function (header) { return header !== 'Variant SKU' && productionHeaders.indexOf(header) < 0 })
        if (missing.length) throw apiError_(422, 'The Production sheet is missing required columns: ' + missing.join(', ') + '.')
        const productionBlock = String(record['Production Block'] || '').trim()
        if (['Block 1', 'Block 2', 'Block 3'].indexOf(productionBlock) < 0) throw apiError_(400, 'Choose a valid production time block.')
        assertRecordUnique_(spreadsheet, 'Production', record)
        const backupState = { created: false }
        if (productionHeaders.indexOf('Variant SKU') < 0) {
          createBackupOnce_(spreadsheet, backupState)
          productionSheet.getRange(1, productionHeaders.length + 1).setValue('Variant SKU')
          productionHeaders.push('Variant SKU')
        }
        if (productionHeaders.indexOf('Production Block') < 0) {
          createBackupOnce_(spreadsheet, backupState)
          productionSheet.getRange(1, productionHeaders.length + 1).setValue('Production Block')
          productionHeaders.push('Production Block')
        }

        const finished = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const rowNumber = findStockRow_(finished.sheet, finished.headers, 'Product SKU', sku)
        let item = readStockRow_(finished.sheet, finished.headers, rowNumber)
        if (!item) {
          item = {
            'Product SKU': sku, 'Product Name': String(record['Product Name'] || sku),
            'Opening Stock': 0, 'Production Received': 0, 'Quality Approved': 0, Rejected: 0,
            'Reserved Stock': 0, 'Available Stock': 0, 'Dispatched Stock': 0, 'Returned Stock': 0,
            'Damaged Stock': 0, 'Adjustment In': 0, 'Adjustment Out': 0, Status: 'Active',
          }
        }
        if (String(item.Status || 'Active').toLowerCase() === 'archived') throw apiError_(409, 'This finished-good SKU is archived.')
        const opening = finishedAvailableStock_(item)
        item['Production Received'] = stockNumber_(item['Production Received'], 'Production received') + actual
        item['Quality Approved'] = stockNumber_(item['Quality Approved'], 'Quality approved') + actual - rejected
        item.Rejected = stockNumber_(item.Rejected, 'Rejected') + rejected
        item['Available Stock'] = finishedAvailableStock_(item)
        item['Last Updated'] = new Date().toISOString()

        createBackupOnce_(spreadsheet, backupState)
        productionSheet.appendRow(productionHeaders.map(function (header) {
          return safeCellValue_(record[header] === undefined ? '' : record[header])
        }))
        if (rowNumber) updateStockRow_(finished.sheet, finished.headers, rowNumber, item)
        else appendStockRow_(finished.sheet, finished.headers, item)
        const approved = actual - rejected
        let movement = null
        if (approved > 0) {
          movement = stockMovementRecord_({
            sku: sku, type: 'Production Received', quantity: approved,
            referenceId: String(record['Production ID'] || ''),
            reason: 'Production complete; rejected quantity: ' + rejected,
            opening: opening, closing: item['Available Stock'],
            createdBy: String(record['Created By'] || ''), itemType: 'Finished Goods',
          })
          appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        }
        SpreadsheetApp.flush()
        return { finishedGood: item, movement: movement }
      })
    }

    function productionTargetPeriod_(periodValue, dateValue) {
      const period = String(periodValue || '').trim().toLowerCase()
      if (['daily', 'weekly', 'monthly'].indexOf(period) < 0) throw apiError_(400, 'Choose a daily, weekly, or monthly target period.')
      const dateText = String(dateValue || '').trim()
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
      if (!match) throw apiError_(400, 'Choose a valid target date.')
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const anchor = new Date(Date.UTC(year, month - 1, day, 12))
      if (anchor.toISOString().slice(0, 10) !== dateText) throw apiError_(400, 'Choose a valid target date.')
      function key(date) {
        return date.toISOString().slice(0, 10)
      }
      if (period === 'daily') return { period: period, startDate: dateText, endDate: dateText }
      if (period === 'weekly') {
        const offset = anchor.getUTCDay() === 0 ? -6 : 1 - anchor.getUTCDay()
        const start = new Date(anchor.getTime())
        start.setUTCDate(start.getUTCDate() + offset)
        const end = new Date(start.getTime())
        end.setUTCDate(end.getUTCDate() + 6)
        return { period: period, startDate: key(start), endDate: key(end) }
      }
      const start = new Date(Date.UTC(year, month - 1, 1, 12))
      const end = new Date(Date.UTC(year, month, 0, 12))
      return { period: period, startDate: key(start), endDate: key(end) }
    }

    function setProductionTarget_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can assign production targets.')
      }
      return withWriteLock_(function () {
        const period = productionTargetPeriod_(payload.period, payload.date)
        const machineId = String(payload.machineId || '').trim()
        const sku = String(payload.sku || '').trim()
        const productName = String(payload.productName || '').trim()
        const targetQuantity = Number(payload.targetQuantity)
        if (!machineId || machineId.length > 100) throw apiError_(400, 'Choose a configured machine.')
        if (!productName || productName.length > 180 || /[\u0000-\u001f]/.test(productName)) {
          throw apiError_(400, 'Enter a product name of 1 to 180 characters.')
        }
        if (sku.length > 100) throw apiError_(400, 'The product SKU is too long.')
        if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 1000000) {
          throw apiError_(400, 'Target quantity must be a whole number from 1 to 1,000,000.')
        }
        const machine = readSheetRecords_(spreadsheet, 'Machines').find(function (row) {
          return String(row['Machine ID'] || '').trim().toLowerCase() === machineId.toLowerCase()
        })
        if (!machine) throw apiError_(400, 'Choose a machine configured in the workbook.')
        if (String(machine.Status || '').trim().toLowerCase() === 'maintenance') {
          throw apiError_(400, 'A machine under maintenance cannot receive a production target.')
        }

        const headers = [
          'Target ID', 'Period', 'Period Start', 'Period End', 'Machine ID', 'Machine Name',
          'Product SKU', 'Product Name', 'Target Quantity', 'Status', 'Created By', 'Created At',
          'Updated By', 'Updated At',
        ]
        const backupState = { created: false, backupName: '' }
        const targetSheet = ensureStockSheet_(spreadsheet, 'Production_Targets', headers, backupState)
        const normalizedProduct = function (value) { return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase() }
        const matches = readSheetRecords_(spreadsheet, 'Production_Targets').filter(function (row) {
          const sameProduct = sku
            ? String(row['Product SKU'] || '').trim().toLowerCase() === sku.toLowerCase()
            : !String(row['Product SKU'] || '').trim() && normalizedProduct(row['Product Name']) === normalizedProduct(productName)
          return String(row.Period || '').trim().toLowerCase() === period.period &&
            String(row['Period Start'] || '').trim() === period.startDate &&
            String(row['Machine ID'] || '').trim().toLowerCase() === machineId.toLowerCase() &&
            sameProduct
        })
        if (matches.length > 1) throw apiError_(409, 'Duplicate targets exist for this machine, product, and period. Resolve them before saving.')

        const existing = matches[0]
        const now = new Date().toISOString()
        const record = {
          'Target ID': String(existing && existing['Target ID'] || Utilities.getUuid()),
          Period: period.period,
          'Period Start': period.startDate,
          'Period End': period.endDate,
          'Machine ID': machineId,
          'Machine Name': String(machine['Machine Name'] || machineId).trim(),
          'Product SKU': sku,
          'Product Name': productName,
          'Target Quantity': targetQuantity,
          Status: 'Active',
          'Created By': String(existing && existing['Created By'] || payload.createdBy || ''),
          'Created At': String(existing && existing['Created At'] || now),
          'Updated By': String(payload.createdBy || ''),
          'Updated At': now,
        }
        if (existing && Number(existing['Target Quantity']) === targetQuantity &&
            String(existing['Machine Name'] || '').trim() === record['Machine Name'] &&
            String(existing['Product Name'] || '').trim() === productName &&
            String(existing.Status || 'Active').trim().toLowerCase() === 'active') {
          return { target: existing, unchanged: true, backupName: backupState.backupName }
        }
        createBackupOnce_(spreadsheet, backupState)
        if (existing) {
          const rowNumber = findStockRow_(targetSheet.sheet, targetSheet.headers, 'Target ID', record['Target ID'])
          if (!rowNumber) throw apiError_(409, 'The existing production target could not be located.')
          updateStockRow_(targetSheet.sheet, targetSheet.headers, rowNumber, record)
        } else {
          appendStockRow_(targetSheet.sheet, targetSheet.headers, record)
        }
        SpreadsheetApp.flush()
        return { target: record, unchanged: false, backupName: backupState.backupName }
      })
    }

    function assertSalesExecutive_(spreadsheet, userId) {
      const executive = readSheetRecords_(spreadsheet, 'Users').find(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        return active && String(row['User ID'] || '').trim() === String(userId || '').trim() &&
          String(row.Role || '').trim() === 'Sales Executive'
      })
      if (!executive) throw apiError_(404, 'The selected active Sales Executive account was not found.')
      return executive
    }

    function salesLeadInput_(input, assignedUserId) {
      const name = String(input.name || '').trim()
      const company = String(input.company || '').trim()
      const phone = String(input.phone || '').trim()
      const email = String(input.email || '').trim()
      const productInterest = String(input.productInterest || '').trim()
      const notes = String(input.notes || '').trim()
      const referenceUrl = String(input.referenceUrl || '').trim()
      if (!name || name.length > 150 || /[\u0000-\u001f]/.test(name)) throw apiError_(400, 'Lead name is required and must be 150 characters or fewer.')
      if (company.length > 180 || phone.length > 40 || email.length > 180 || productInterest.length > 180 || notes.length > 1000) {
        throw apiError_(400, 'A lead field exceeds its allowed length.')
      }
      if (phone.replace(/\D/g, '').length < 7) throw apiError_(400, 'Enter a valid contact phone number.')
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError_(400, 'Enter a valid email address.')
      if (referenceUrl && (referenceUrl.length > 2000 || !/^https:\/\/[^\s]+$/i.test(referenceUrl))) {
        throw apiError_(400, 'Reference must be a valid HTTPS PDF or form link.')
      }
      if (!assignedUserId) throw apiError_(400, 'Assign the lead to an active Sales Executive.')
      return {
        name: name,
        company: company,
        phone: phone,
        email: email,
        productInterest: productInterest,
        notes: notes,
        referenceUrl: referenceUrl,
        assignedUserId: assignedUserId,
      }
    }

    function makeSalesLeadRecord_(input, executive, payload, now) {
      return {
        'Lead ID': 'LEAD-' + Utilities.getUuid(),
        Name: input.name,
        Company: input.company,
        Phone: input.phone,
        Email: input.email,
        'Product Interest': input.productInterest,
        Notes: input.notes,
        'Reference URL': input.referenceUrl,
        'Assigned User ID': String(executive['User ID'] || ''),
        'Assigned User Name': String(executive.Name || ''),
        Status: 'New',
        'Next Follow-Up': '',
        'Created At': now,
        'Created By': String(payload.createdBy || ''),
        'Updated At': now,
      }
    }

    function importSalesLeads_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') throw apiError_(403, 'Only the Super Admin can import or assign sales leads.')
      const rows = payload.rows
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) throw apiError_(400, 'Import between 1 and 500 lead rows at a time.')
      return withWriteLock_(function () {
        const defaultAssignedUserId = String(payload.assignedUserId || '').trim()
        assertSalesExecutive_(spreadsheet, defaultAssignedUserId)
        const backupState = { created: false, backupName: '' }
        const leadSheet = ensureStockSheet_(spreadsheet, 'Sales_Leads', ERP_SALES_LEAD_HEADERS, backupState)
        const existingPhones = new Set(readSheetRecords_(spreadsheet, 'Sales_Leads').map(function (row) {
          return String(row.Phone || '').replace(/\D/g, '')
        }).filter(Boolean))
        const now = new Date().toISOString()
        const leads = []
        let skipped = 0
        rows.forEach(function (row) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) throw apiError_(400, 'Every imported lead must be a row of named fields.')
          const assignedUserId = String(row.assignedUserId || defaultAssignedUserId).trim()
          const executive = assertSalesExecutive_(spreadsheet, assignedUserId)
          const input = salesLeadInput_(row, assignedUserId)
          const phoneKey = input.phone.replace(/\D/g, '')
          if (existingPhones.has(phoneKey)) {
            skipped += 1
            return
          }
          existingPhones.add(phoneKey)
          leads.push(makeSalesLeadRecord_(input, executive, payload, now))
        })
        if (leads.length) {
          createBackupOnce_(spreadsheet, backupState)
          leads.forEach(function (lead) { appendStockRow_(leadSheet.sheet, leadSheet.headers, lead) })
          SpreadsheetApp.flush()
        }
        return { added: leads.length, skipped: skipped, backupName: backupState.backupName }
      })
    }

    function addSalesLead_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') throw apiError_(403, 'Only the Super Admin can create sales leads.')
      return withWriteLock_(function () {
        const source = payload.lead
        if (!source || typeof source !== 'object' || Array.isArray(source)) throw apiError_(400, 'Enter lead details.')
        const executive = assertSalesExecutive_(spreadsheet, source.assignedUserId)
        const input = salesLeadInput_(source, String(executive['User ID'] || ''))
        const backupState = { created: false, backupName: '' }
        const leadSheet = ensureStockSheet_(spreadsheet, 'Sales_Leads', ERP_SALES_LEAD_HEADERS, backupState)
        const phoneKey = input.phone.replace(/\D/g, '')
        if (readSheetRecords_(spreadsheet, 'Sales_Leads').some(function (row) {
          return String(row.Phone || '').replace(/\D/g, '') === phoneKey
        })) throw apiError_(409, 'A lead with this phone number already exists.')
        createBackupOnce_(spreadsheet, backupState)
        const lead = makeSalesLeadRecord_(input, executive, payload, new Date().toISOString())
        appendStockRow_(leadSheet.sheet, leadSheet.headers, lead)
        SpreadsheetApp.flush()
        return { lead: lead, backupName: backupState.backupName }
      })
    }

    function assignSalesLead_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') throw apiError_(403, 'Only the Super Admin can reassign sales leads.')
      return withWriteLock_(function () {
        const leadId = String(payload.leadId || '').trim()
        const userId = String(payload.assignedUserId || '').trim()
        if (!leadId) throw apiError_(400, 'Choose a lead to assign.')
        const executive = assertSalesExecutive_(spreadsheet, userId)
        const backupState = { created: false, backupName: '' }
        const leadSheet = ensureStockSheet_(spreadsheet, 'Sales_Leads', ERP_SALES_LEAD_HEADERS, backupState)
        const rowNumber = findStockRow_(leadSheet.sheet, leadSheet.headers, 'Lead ID', leadId)
        if (!rowNumber) throw apiError_(404, 'Sales lead was not found.')
        const lead = readStockRow_(leadSheet.sheet, leadSheet.headers, rowNumber)
        lead['Assigned User ID'] = userId
        lead['Assigned User Name'] = String(executive.Name || '')
        lead['Updated At'] = new Date().toISOString()
        createBackupOnce_(spreadsheet, backupState)
        updateStockRow_(leadSheet.sheet, leadSheet.headers, rowNumber, lead)
        SpreadsheetApp.flush()
        return { lead: lead }
      })
    }

    function recordSalesActivity_(spreadsheet, payload) {
      if (['Sales Executive', 'Super Admin'].indexOf(String(payload.sessionUserRole || '')) < 0) {
        throw apiError_(403, 'Only the assigned Sales Executive or Super Admin can update a lead.')
      }
      return withWriteLock_(function () {
        const leadId = String(payload.leadId || '').trim()
        const backupState = { created: false, backupName: '' }
        const leadSheet = ensureStockSheet_(spreadsheet, 'Sales_Leads', ERP_SALES_LEAD_HEADERS, backupState)
        const leadRowNumber = findStockRow_(leadSheet.sheet, leadSheet.headers, 'Lead ID', leadId)
        if (!leadRowNumber) throw apiError_(404, 'Sales lead was not found.')
        const lead = readStockRow_(leadSheet.sheet, leadSheet.headers, leadRowNumber)
        if (payload.sessionUserRole === 'Sales Executive' &&
            String(lead['Assigned User ID'] || '') !== String(payload.sessionUserId || '')) {
          throw apiError_(403, 'This lead is assigned to another Sales Executive.')
        }
        const allowedStatuses = ['New', 'Contacted', 'Qualified', 'Follow-up', 'Converted', 'Lost']
        const allowedTypes = ['Call', 'WhatsApp', 'Meeting', 'Note']
        const status = String(payload.status || '')
        const activityType = String(payload.activityType || '')
        const outcome = String(payload.outcome || '').trim()
        const notes = String(payload.notes || '').trim()
        const nextFollowUp = String(payload.nextFollowUp || '').trim()
        if (allowedStatuses.indexOf(status) < 0 || allowedTypes.indexOf(activityType) < 0) {
          throw apiError_(400, 'Choose a valid lead status and activity type.')
        }
        if (!outcome || outcome.length > 180 || !notes || notes.length > 1000) {
          throw apiError_(400, 'Enter a short call outcome and notes of up to 1,000 characters.')
        }
        if (nextFollowUp) {
          const parsed = /^\d{4}-\d{2}-\d{2}$/.test(nextFollowUp) ? new Date(nextFollowUp + 'T12:00:00Z') : new Date('invalid')
          if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== nextFollowUp) {
            throw apiError_(400, 'Choose a valid follow-up date.')
          }
        }
        const activitySheet = ensureStockSheet_(spreadsheet, 'Sales_Activities', ERP_SALES_ACTIVITY_HEADERS, backupState)
        const now = new Date().toISOString()
        const activity = {
          'Activity ID': Utilities.getUuid(),
          'Lead ID': leadId,
          'Activity Type': activityType,
          Outcome: outcome,
          Notes: notes,
          'Next Follow-Up': nextFollowUp,
          'Created At': now,
          'Created By': String(payload.sessionUserId || ''),
          'Created By Name': String(payload.createdBy || ''),
        }
        lead.Status = status
        lead['Next Follow-Up'] = nextFollowUp
        lead['Updated At'] = now
        createBackupOnce_(spreadsheet, backupState)
        updateStockRow_(leadSheet.sheet, leadSheet.headers, leadRowNumber, lead)
        appendStockRow_(activitySheet.sheet, activitySheet.headers, activity)
        SpreadsheetApp.flush()
        return { lead: lead, activity: activity }
      })
    }

    function salesOrderStatus_(order) {
      const quantity = Number(order.Quantity) || 0
      const fulfilled = Number(order['Fulfilled Quantity']) || 0
      const cancelled = Number(order['Cancelled Quantity']) || 0
      if (cancelled >= quantity) return 'Cancelled'
      if (fulfilled >= quantity - cancelled) return cancelled ? 'Partially Cancelled' : 'Fulfilled'
      if (fulfilled || cancelled) return cancelled ? 'Partially Cancelled' : 'Partially Fulfilled'
      return 'Booked'
    }

    function createSalesOrder_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Sales Executive') throw apiError_(403, 'Only a Sales Executive can book a sales order.')
      return withWriteLock_(function () {
        const leadId = String(payload.leadId || '').trim()
        const customerName = String(payload.customerName || '').trim()
        const requestedProductName = String(payload.productName || '').trim()
        const sku = String(payload.sku || '').trim()
        const quantity = Number(payload.quantity)
        const unitPrice = Number(payload.unitPrice)
        const notes = String(payload.notes || '').trim()
        if ((!leadId && !customerName) || customerName.length > 180 || requestedProductName.length > 300 ||
            !sku || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
          throw apiError_(400, 'Choose an assigned lead or enter a customer name, choose a product SKU, and enter a whole-number quantity greater than zero.')
        }
        if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 100000000 || notes.length > 500) {
          throw apiError_(400, 'Enter a valid unit price and optional order note.')
        }
        const backupState = { created: false, backupName: '' }
        let leadSheet = null
        let leadRowNumber = 0
        let lead = null
        if (leadId) {
          leadSheet = ensureStockSheet_(spreadsheet, 'Sales_Leads', ERP_SALES_LEAD_HEADERS, backupState)
          leadRowNumber = findStockRow_(leadSheet.sheet, leadSheet.headers, 'Lead ID', leadId)
          if (!leadRowNumber) throw apiError_(404, 'Sales lead was not found.')
          lead = readStockRow_(leadSheet.sheet, leadSheet.headers, leadRowNumber)
          if (String(lead['Assigned User ID'] || '') !== String(payload.sessionUserId || '')) {
            throw apiError_(403, 'You can only book orders for your assigned leads.')
          }
          if (String(lead.Status || '').toLowerCase() === 'lost') throw apiError_(409, 'A lost lead cannot be converted into an order.')
        }
        const catalogProductName = findCatalogProductName_(spreadsheet, sku)
        if (!catalogProductName) throw apiError_(404, 'Choose an active SKU from the product catalog.')
        const productName = requestedProductName || catalogProductName

        const stockSheet = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const orderSheet = ensureStockSheet_(spreadsheet, 'Sales_Orders', ERP_SALES_ORDER_HEADERS, backupState)
        const stockRowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, 'Product SKU', sku)
        if (!stockRowNumber) throw apiError_(409, 'This SKU has no finished-goods stock record.')
        const item = readStockRow_(stockSheet.sheet, stockSheet.headers, stockRowNumber)
        if (String(item.Status || 'Active').toLowerCase() === 'archived') throw apiError_(409, 'This product is archived.')
        const opening = finishedAvailableStock_(item)
        if (opening < quantity) throw apiError_(409, 'Not enough available stock to book this order.')
        const now = new Date().toISOString()
        const orderId = 'ORD-' + Utilities.getUuid()
        const normalizedUnitPrice = Math.round(unitPrice * 100) / 100
        const order = {
          'Order ID': orderId,
          'Created At': now,
          'Sales User ID': String(payload.sessionUserId || ''),
          'Sales User Name': String(payload.createdBy || ''),
          'Lead ID': leadId,
          'Customer Name': lead ? String(lead.Name || '') : customerName,
          'Product SKU': sku,
          'Product Name': productName,
          Quantity: quantity,
          'Unit Price': normalizedUnitPrice,
          Amount: Math.round(quantity * normalizedUnitPrice * 100) / 100,
          'Fulfilled Quantity': 0,
          'Cancelled Quantity': 0,
          Status: 'Booked',
          Notes: notes,
        }
        item['Reserved Stock'] = stockNumber_(item['Reserved Stock'], 'Reserved stock') + quantity
        item['Available Stock'] = finishedAvailableStock_(item)
        item['Last Updated'] = now
        createBackupOnce_(spreadsheet, backupState)
        updateStockRow_(stockSheet.sheet, stockSheet.headers, stockRowNumber, item)
        appendStockRow_(orderSheet.sheet, orderSheet.headers, order)
        const movement = appendStockMovement_(spreadsheet, stockMovementRecord_({
          sku: sku, type: 'Reserve', quantity: quantity, referenceId: orderId,
          reason: 'Sales order booking', opening: opening, closing: item['Available Stock'],
          createdBy: payload.createdBy, itemType: 'Finished Goods',
        }), backupState)
        if (lead) {
          lead.Status = 'Converted'
          lead['Updated At'] = now
          updateStockRow_(leadSheet.sheet, leadSheet.headers, leadRowNumber, lead)
        }
        SpreadsheetApp.flush()
        return { order: order, item: item, movement: movement }
      })
    }

    function cancelSalesOrder_(spreadsheet, payload) {
      if (['Sales Executive', 'Super Admin'].indexOf(String(payload.sessionUserRole || '')) < 0) {
        throw apiError_(403, 'This account cannot cancel sales orders.')
      }
      return withWriteLock_(function () {
        const orderId = String(payload.orderId || '').trim()
        const backupState = { created: false, backupName: '' }
        const orderSheet = ensureStockSheet_(spreadsheet, 'Sales_Orders', ERP_SALES_ORDER_HEADERS, backupState)
        const orderRowNumber = findStockRow_(orderSheet.sheet, orderSheet.headers, 'Order ID', orderId)
        if (!orderRowNumber) throw apiError_(404, 'Sales order was not found.')
        const order = readStockRow_(orderSheet.sheet, orderSheet.headers, orderRowNumber)
        if (payload.sessionUserRole === 'Sales Executive' &&
            String(order['Sales User ID'] || '') !== String(payload.sessionUserId || '')) {
          throw apiError_(403, 'You can only cancel your own sales orders.')
        }
        const quantity = stockNumber_(order.Quantity, 'Order quantity')
        const fulfilled = stockNumber_(order['Fulfilled Quantity'], 'Fulfilled quantity')
        const cancelled = stockNumber_(order['Cancelled Quantity'], 'Cancelled quantity')
        const remaining = quantity - fulfilled - cancelled
        if (remaining <= 0) throw apiError_(409, 'This sales order has no remaining units to cancel.')
        const sku = String(order['Product SKU'] || '').trim()
        const stockSheet = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const stockRowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, 'Product SKU', sku)
        if (!stockRowNumber) throw apiError_(409, 'The reserved stock record for this order is missing.')
        const item = readStockRow_(stockSheet.sheet, stockSheet.headers, stockRowNumber)
        const opening = finishedAvailableStock_(item)
        const reserved = stockNumber_(item['Reserved Stock'], 'Reserved stock')
        if (reserved < remaining) throw apiError_(409, 'Reserved stock no longer matches this order. Ask a supervisor to review it.')
        item['Reserved Stock'] = reserved - remaining
        item['Available Stock'] = finishedAvailableStock_(item)
        item['Last Updated'] = new Date().toISOString()
        order['Cancelled Quantity'] = cancelled + remaining
        order.Status = salesOrderStatus_(order)
        createBackupOnce_(spreadsheet, backupState)
        updateStockRow_(stockSheet.sheet, stockSheet.headers, stockRowNumber, item)
        updateStockRow_(orderSheet.sheet, orderSheet.headers, orderRowNumber, order)
        const movement = stockMovementRecord_({
          sku: sku, type: 'Release Reservation', quantity: remaining, referenceId: orderId,
          reason: 'Sales order cancellation', opening: opening, closing: item['Available Stock'],
          createdBy: payload.createdBy, itemType: 'Finished Goods',
        })
        appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        SpreadsheetApp.flush()
        return { order: order, item: item, movement: movement }
      })
    }

    function setSalesTarget_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') throw apiError_(403, 'Only the Super Admin can set sales targets.')
      const period = String(payload.period || '').toLowerCase()
      const periodKey = String(payload.periodKey || '').trim()
      const expectedKey = period === 'monthly' ? /^\d{4}-(0[1-9]|1[0-2])$/ : /^\d{4}$/
      if (!['monthly', 'yearly'].includes(period) || !expectedKey.test(periodKey)) throw apiError_(400, 'Choose a valid month or year for the sales target.')
      const targetAmount = Number(payload.targetAmount)
      if (!Number.isFinite(targetAmount) || targetAmount < 0 || targetAmount > 100000000000) {
        throw apiError_(400, 'Sales target must be between 0 and 100,000,000,000.')
      }
      return withWriteLock_(function () {
        const executive = assertSalesExecutive_(spreadsheet, payload.salesUserId)
        const backupState = { created: false, backupName: '' }
        const targetSheet = ensureStockSheet_(spreadsheet, 'Sales_Targets', ERP_SALES_TARGET_HEADERS, backupState)
        const records = readSheetRecords_(spreadsheet, 'Sales_Targets').filter(function (row) {
          return String(row['Sales User ID'] || '') === String(payload.salesUserId || '') &&
            String(row.Period || '').toLowerCase() === period &&
            String(row['Period Key'] || '') === periodKey
        })
        if (records.length > 1) throw apiError_(409, 'Duplicate target records exist for this sales account and period.')
        const existing = records[0]
        const target = {
          'Target ID': String(existing && existing['Target ID'] || Utilities.getUuid()),
          'Sales User ID': String(payload.salesUserId || ''),
          'Sales User Name': String(executive.Name || ''),
          Period: period,
          'Period Key': periodKey,
          'Target Amount': Math.round(targetAmount * 100) / 100,
          'Updated At': new Date().toISOString(),
          'Updated By': String(payload.createdBy || ''),
        }
        if (existing && Number(existing['Target Amount']) === target['Target Amount']) {
          return { target: existing, backupName: backupState.backupName }
        }
        createBackupOnce_(spreadsheet, backupState)
        if (existing) {
          const rowNumber = findStockRow_(targetSheet.sheet, targetSheet.headers, 'Target ID', target['Target ID'])
          if (!rowNumber) throw apiError_(409, 'The existing sales target could not be located.')
          updateStockRow_(targetSheet.sheet, targetSheet.headers, rowNumber, target)
        } else {
          appendStockRow_(targetSheet.sheet, targetSheet.headers, target)
        }
        SpreadsheetApp.flush()
        return { target: target, backupName: backupState.backupName }
      })
    }

    function createInitialAdmin_(spreadsheet, user) {
      return withWriteLock_(function () {
        const users = readSheetRecords_(spreadsheet, 'Users')
        if (users.some(function (row) { return String(row.Role || '') === 'Super Admin' })) {
          throw apiError_(409, 'The Super Admin account is already set up. Sign in instead.')
        }
        assertUsernameAvailable_(users, user)
        createBackup_(spreadsheet)
        const sheet = ensureUserSheet_(spreadsheet)
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        sheet.appendRow(userValues_(user, headers))
        SpreadsheetApp.flush()
        return { created: true }
      })
    }

    function appendUser_(spreadsheet, user) {
      return withWriteLock_(function () {
        if (!user || user.Role === 'Super Admin') throw apiError_(403, 'Only the initial account can be Super Admin.')
        const users = readSheetRecords_(spreadsheet, 'Users')
        assertUsernameAvailable_(users, user)
        createBackup_(spreadsheet)
        const sheet = ensureUserSheet_(spreadsheet)
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        sheet.appendRow(userValues_(user, headers))
        SpreadsheetApp.flush()
        return { created: true }
      })
    }

    function assertEcommercePlatformAccess_(payload, platform) {
      const normalizedPlatform = String(platform || '').trim().toUpperCase()
      if (ERP_ECOMMERCE_PLATFORMS.indexOf(normalizedPlatform) < 0) throw apiError_(400, 'Choose a valid marketplace platform.')
      const role = String(payload.sessionUserRole || '')
      if (role === 'Super Admin' || role === 'Production Supervisor') return normalizedPlatform
      if (role !== 'E-commerce Executive') throw apiError_(403, 'This account cannot access e-commerce platform data.')
      const assigned = Array.isArray(payload.sessionUserPlatforms) ? payload.sessionUserPlatforms : []
      if (assigned.indexOf(normalizedPlatform) < 0) throw apiError_(403, 'This marketplace platform is not assigned to your account.')
      return normalizedPlatform
    }

    function normalizeMarketplacePlatform_(platform) {
      const normalized = String(platform || '').trim().toUpperCase()
      return normalized === 'AMAZON.IN' || normalized === 'AMAZON.COM' ? 'AMAZON' : normalized
    }

    function assertEcommerceWriteRole_(payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'E-commerce Executive' && role !== 'Super Admin') {
        throw apiError_(403, 'Only an E-commerce Executive or Super Admin can perform this action.')
      }
    }

    function updateMarketplaceSku_(spreadsheet, payload) {
      assertEcommerceWriteRole_(payload)
      const platform = assertEcommercePlatformAccess_(payload, payload.platform)
      const listingId = String(payload.listingId || '').trim()
      const platformSku = String(payload.platformSku || '').trim()
      if (!listingId || !platformSku || platformSku.length > 120) throw apiError_(400, 'A listing and platform SKU of 1 to 120 characters are required.')
      const hasMrp = payload.mrp !== undefined && payload.mrp !== null
      const hasSellingPrice = payload.sellingPrice !== undefined && payload.sellingPrice !== null
      if (hasMrp !== hasSellingPrice) throw apiError_(400, 'Enter both MRP and selling price.')
      const mrp = hasMrp ? Number(payload.mrp) : null
      const sellingPrice = hasSellingPrice ? Number(payload.sellingPrice) : null
      if (hasMrp && (!isFinite(mrp) || mrp < 0 || !isFinite(sellingPrice) || sellingPrice < 0)) {
        throw apiError_(400, 'MRP and selling price must be non-negative numbers.')
      }
      return withWriteLock_(function () {
        const sheet = spreadsheet.getSheetByName('Marketplace_Listings')
        if (!sheet || sheet.getLastRow() < 2) throw apiError_(404, 'Marketplace listings were not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const idColumn = headers.indexOf('Listing ID')
        const platformColumn = headers.indexOf('Platform')
        const skuColumn = headers.indexOf('Platform SKU')
        const mrpColumn = headers.indexOf('MRP')
        const sellingPriceColumn = headers.indexOf('Selling Price')
        if (idColumn < 0 || platformColumn < 0 || skuColumn < 0 ||
            (hasMrp && (mrpColumn < 0 || sellingPriceColumn < 0))) {
          throw apiError_(422, 'The Marketplace_Listings sheet is missing required SKU or price columns.')
        }
        const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
        let targetRow = 0
        let listing = null
        rows.forEach(function (row, index) {
          if (String(row[idColumn] || '').trim() === listingId && normalizeMarketplacePlatform_(row[platformColumn]) === platform) {
            targetRow = index + 2
            listing = row
          }
        })
        if (!targetRow || !listing) throw apiError_(404, 'The marketplace listing was not found.')
        const duplicate = rows.some(function (row, index) {
          return index + 2 !== targetRow &&
            normalizeMarketplacePlatform_(row[platformColumn]) === platform &&
            String(row[skuColumn] || '').trim().toLowerCase() === platformSku.toLowerCase()
        })
        if (duplicate) throw apiError_(409, 'That platform SKU is already assigned to another listing on this platform.')
        createBackup_(spreadsheet)
        sheet.getRange(targetRow, skuColumn + 1).setValue(safeCellValue_(platformSku))
        if (hasMrp) {
          sheet.getRange(targetRow, mrpColumn + 1).setValue(mrp)
          sheet.getRange(targetRow, sellingPriceColumn + 1).setValue(sellingPrice)
        }
        SpreadsheetApp.flush()
        const updated = {}
        headers.forEach(function (header, index) {
          const value = index === skuColumn ? platformSku
            : index === mrpColumn && hasMrp ? mrp
              : index === sellingPriceColumn && hasSellingPrice ? sellingPrice
                : listing[index]
          updated[header] = serializeCell_(value)
        })
        return { listing: updated }
      })
    }

    function getEcommerceLabelFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = DriveApp.createFolder('Mahalaxmi ERP Private E-commerce Labels')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function ecommerceLabelMetadata_(file) {
      let metadata
      try {
        metadata = JSON.parse(file.getDescription() || '{}')
      } catch (error) {
        throw apiError_(500, 'A stored shipping label has invalid metadata.')
      }
      if (metadata.kind !== 'mahalaxmi-erp-ecommerce-label' || ERP_ECOMMERCE_PLATFORMS.indexOf(metadata.platform) < 0) {
        throw apiError_(500, 'A stored shipping label has invalid metadata.')
      }
      return {
        id: file.getId(),
        fileName: file.getName(),
        orderNumber: String(metadata.orderNumber || ''),
        platform: metadata.platform,
        uploadedBy: String(metadata.uploadedBy || ''),
        uploadedAt: String(metadata.uploadedAt || ''),
      }
    }

    function ensureEcommerceLabelCleanupTrigger_() {
      return withWriteLock_(function () {
        const exists = ScriptApp.getProjectTriggers().some(function (trigger) {
          return trigger.getHandlerFunction() === ERP_ECOMMERCE_LABEL_CLEANUP_HANDLER
        })
        if (!exists) {
          ScriptApp.newTrigger(ERP_ECOMMERCE_LABEL_CLEANUP_HANDLER).timeBased().everyHours(1).create()
        }
      })
    }

    function installEcommerceLabelCleanupTrigger() {
      ensureEcommerceLabelCleanupTrigger_()
      return cleanupExpiredEcommerceLabels_()
    }

    function ecommerceLabelExpired_(file, cutoff) {
      let metadata
      try {
        metadata = JSON.parse(file.getDescription() || '{}')
      } catch (error) {
        Logger.log('Using Drive creation date to expire a shipping label with invalid metadata: ' + file.getId())
        return file.getDateCreated().getTime() <= cutoff
      }
      if (metadata.kind !== 'mahalaxmi-erp-ecommerce-label') return false
      const uploadedAt = Date.parse(String(metadata.uploadedAt || ''))
      const createdAt = file.getDateCreated().getTime()
      return (Number.isFinite(uploadedAt) ? uploadedAt : createdAt) <= cutoff
    }

    function permanentlyDeleteEcommerceLabel_(file) {
      const response = UrlFetchApp.fetch(
        'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(file.getId()),
        {
          method: 'delete',
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true,
        }
      )
      const status = response.getResponseCode()
      if (status !== 200 && status !== 204) {
        Logger.log('Drive API could not permanently delete expired shipping label ' + file.getId() + '; HTTP status ' + status)
        throw apiError_(500, 'Expired shipping labels could not be deleted. Please retry shortly.')
      }
    }

    function cleanupExpiredEcommerceLabels_() {
      return withWriteLock_(function () {
        const folder = getEcommerceLabelFolder_(false)
        if (!folder) return 0
        const cutoff = Date.now() - ERP_ECOMMERCE_LABEL_RETENTION_MS
        const expired = []
        const files = folder.getFiles()
        while (files.hasNext()) {
          const file = files.next()
          if (ecommerceLabelExpired_(file, cutoff)) expired.push(file)
        }
        expired.forEach(permanentlyDeleteEcommerceLabel_)
        return expired.length
      })
    }

    function uploadEcommerceLabel_(payload) {
      assertEcommerceWriteRole_(payload)
      const platform = assertEcommercePlatformAccess_(payload, payload.platform)
      const orderNumber = String(payload.orderNumber || '').trim()
      const requestedName = String(payload.fileName || '').trim()
      const base64 = String(payload.base64 || '')
      if (!orderNumber || orderNumber.length > 120) throw apiError_(400, 'Enter an order number of 1 to 120 characters.')
      if (!requestedName || requestedName.length > 180 || !/\.pdf$/i.test(requestedName)) throw apiError_(400, 'Upload a PDF file with a valid file name.')
      if (!base64 || base64.length > 4200000) throw apiError_(413, 'Shipping-label PDFs must be 3 MB or smaller.')
      const bytes = Utilities.base64Decode(base64)
      if (bytes.length > 3145728 || bytes.length < 5 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) {
        throw apiError_(400, 'The uploaded file is not a valid PDF of 3 MB or smaller.')
      }
      const safeName = requestedName.replace(/[\\/:*?"<>|]/g, '_')
      const uploadedAt = new Date().toISOString()
      const folder = getEcommerceLabelFolder_(true)
      cleanupExpiredEcommerceLabels_()
      const blob = Utilities.newBlob(bytes, 'application/pdf', safeName)
      const file = folder.createFile(blob)
      try {
        file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
        file.setDescription(JSON.stringify({
          kind: 'mahalaxmi-erp-ecommerce-label',
          orderNumber: orderNumber,
          platform: platform,
          uploadedBy: String(payload.createdBy || ''),
          uploadedAt: uploadedAt,
        }))
      } catch (error) {
        file.setTrashed(true)
        throw error
      }
      return ecommerceLabelMetadata_(file)
    }

    function listEcommerceLabels_(payload) {
      if (['E-commerce Executive', 'Production Supervisor', 'Super Admin'].indexOf(String(payload.sessionUserRole || '')) < 0) {
        throw apiError_(403, 'This account cannot view shipping labels.')
      }
      const platform = String(payload.platform || '').trim().toUpperCase()
      if (platform) assertEcommercePlatformAccess_(payload, platform)
      const folder = getEcommerceLabelFolder_(false)
      if (!folder) return { labels: [] }
      cleanupExpiredEcommerceLabels_()
      const labels = []
      const files = folder.getFiles()
      while (files.hasNext()) {
        const metadata = ecommerceLabelMetadata_(files.next())
        if ((!platform || metadata.platform === platform) &&
            (payload.sessionUserRole !== 'E-commerce Executive' ||
              (Array.isArray(payload.sessionUserPlatforms) && payload.sessionUserPlatforms.indexOf(metadata.platform) >= 0))) {
          labels.push(metadata)
        }
      }
      labels.sort(function (a, b) { return String(b.uploadedAt).localeCompare(String(a.uploadedAt)) })
      return { labels: labels }
    }

    function downloadEcommerceLabel_(payload) {
      const fileId = String(payload.fileId || '').trim()
      if (!fileId) throw apiError_(400, 'A shipping-label ID is required.')
      const folder = getEcommerceLabelFolder_(false)
      if (!folder) throw apiError_(404, 'Shipping label was not found.')
      cleanupExpiredEcommerceLabels_()
      const files = folder.getFiles()
      while (files.hasNext()) {
        const file = files.next()
        if (file.getId() !== fileId) continue
        const metadata = ecommerceLabelMetadata_(file)
        assertEcommercePlatformAccess_(payload, metadata.platform)
        return {
          fileName: metadata.fileName,
          base64: Utilities.base64Encode(file.getBlob().getBytes()),
        }
      }
      throw apiError_(404, 'Shipping label was not found.')
    }

    function getEcommerceReportFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = DriveApp.createFolder('Mahalaxmi ERP Private E-commerce Daily Reports')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function submitEcommerceReport_(spreadsheet, payload) {
      if (payload.sessionUserRole !== 'E-commerce Executive') throw apiError_(403, 'Only an E-commerce Executive can submit a daily report.')
      const platform = assertEcommercePlatformAccess_(payload, payload.platform)
      const completed = String(payload.completed || '').trim()
      const pending = String(payload.pending || '').trim()
      const issues = String(payload.issues || '').trim()
      if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
        throw apiError_(400, 'Completed work is required; each report field must be 3,000 characters or fewer.')
      }
      return withWriteLock_(function () {
        const date = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')
        const userId = String(payload.sessionUserId || '')
        if (!userId) throw apiError_(401, 'Sign in again before submitting a daily report.')
        const folder = getEcommerceReportFolder_(true)
        const fileName = 'report_' + date + '_' + userId.replace(/[^A-Za-z0-9_-]/g, '_') + '_' + platform + '.json'
        const matchingFiles = folder.getFilesByName(fileName)
        const existingFile = matchingFiles.hasNext() ? matchingFiles.next() : null
        let previous = null
        if (existingFile) {
          try {
            previous = JSON.parse(existingFile.getBlob().getDataAsString())
          } catch (error) {
            throw apiError_(500, 'The existing daily report is corrupted and was not overwritten.')
          }
          if (!previous || previous.kind !== 'mahalaxmi-erp-ecommerce-report' || previous.version !== 1) {
            throw apiError_(500, 'The existing daily report has an unsupported format and was not overwritten.')
          }
        }
        const now = new Date().toISOString()
        const report = {
          kind: 'mahalaxmi-erp-ecommerce-report',
          version: 1,
          id: previous ? previous.id : Utilities.getUuid(),
          date: date,
          platform: platform,
          userId: userId,
          userName: String(payload.createdBy || ''),
          completed: completed,
          pending: pending,
          issues: issues,
          createdAt: previous ? previous.createdAt : now,
          updatedAt: now,
        }
        const content = JSON.stringify(report)
        if (existingFile) {
          existingFile.setContent(content)
        } else {
          const file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT)
          try {
            file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
            file.setDescription(JSON.stringify({ kind: report.kind, version: report.version }))
          } catch (error) {
            file.setTrashed(true)
            throw error
          }
        }
        return { report: report }
      })
    }

    function listEcommerceReports_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'Super Admin' && role !== 'E-commerce Executive') {
        throw apiError_(403, 'Only an E-commerce Executive or Super Admin can view daily reports.')
      }
      const sessionUserId = String(payload.sessionUserId || '')
      const folder = getEcommerceReportFolder_(false)
      if (!folder) return { reports: [] }
      const reports = []
      const files = folder.getFiles()
      while (files.hasNext()) {
        const file = files.next()
        let report
        try {
          report = JSON.parse(file.getBlob().getDataAsString())
        } catch (error) {
          throw apiError_(500, 'A stored daily report is corrupted.')
        }
        if (!report || report.kind !== 'mahalaxmi-erp-ecommerce-report' || report.version !== 1 ||
            typeof report.id !== 'string' || typeof report.date !== 'string' ||
            ERP_ECOMMERCE_PLATFORMS.indexOf(report.platform) < 0) {
          throw apiError_(500, 'A stored daily report has an unsupported format.')
        }
        if (role === 'E-commerce Executive' && String(report.userId || '') !== sessionUserId) continue
        reports.push(report)
      }
      reports.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) })
      return { reports: reports }
    }

    function ecommerceExecutiveTarget_(properties, executiveId) {
      const dailyValue = properties.getProperty(ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX + executiveId)
      const monthlyValue = properties.getProperty(ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX + executiveId)
      const dailyTarget = dailyValue === null ? 0 : Number(dailyValue)
      const monthlyTarget = monthlyValue === null ? 0 : Number(monthlyValue)
      if (!Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
          !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
        throw apiError_(500, 'The saved order target for this executive is invalid.')
      }
      return { dailyTarget: dailyTarget, monthlyTarget: monthlyTarget }
    }

    function getEcommerceTargets_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'E-commerce Executive' && role !== 'Super Admin') {
        throw apiError_(403, 'This account cannot view e-commerce targets.')
      }
      const properties = PropertiesService.getScriptProperties()
      if (role === 'E-commerce Executive') {
        const executiveId = String(payload.sessionUserId || '').trim()
        if (!/^[A-Za-z0-9_-]{1,120}$/.test(executiveId)) throw apiError_(401, 'Sign in again before viewing targets.')
        return { targets: ecommerceExecutiveTarget_(properties, executiveId) }
      }

      const executives = readSheetRecords_(spreadsheet, 'Users').filter(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        return active && String(row.Role || '').trim() === 'E-commerce Executive'
      }).map(function (row) {
        const executiveId = String(row['User ID'] || '').trim()
        const target = ecommerceExecutiveTarget_(properties, executiveId)
        const platforms = String(row['Assigned Platforms'] || '').split(',').map(function (platform) {
          return platform.trim().toUpperCase()
        }).filter(function (platform) {
          return ERP_ECOMMERCE_PLATFORMS.indexOf(platform) >= 0
        })
        return {
          executiveId: executiveId,
          executiveName: String(row.Name || '').trim(),
          platforms: platforms,
          dailyTarget: target.dailyTarget,
          monthlyTarget: target.monthlyTarget,
        }
      })
      return { targets: { executives: executives } }
    }

    function setEcommerceTarget_(spreadsheet, payload) {
      if (payload.sessionUserRole !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can set executive order targets.')
      }
      const executiveId = String(payload.executiveId || '').trim()
      const dailyTarget = payload.dailyTarget
      const monthlyTarget = payload.monthlyTarget
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(executiveId)) throw apiError_(400, 'Choose a valid E-commerce Executive account.')
      const executive = readSheetRecords_(spreadsheet, 'Users').find(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        return active && String(row['User ID'] || '').trim() === executiveId &&
          String(row.Role || '').trim() === 'E-commerce Executive'
      })
      if (!executive) throw apiError_(404, 'The selected active E-commerce Executive account was not found.')
      if (typeof dailyTarget !== 'number' || !Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
          typeof monthlyTarget !== 'number' || !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
        throw apiError_(400, 'Daily and monthly order targets must be whole numbers from 0 to 100,000.')
      }
      return withWriteLock_(function () {
        const properties = {}
        properties[ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX + executiveId] = String(dailyTarget)
        properties[ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX + executiveId] = String(monthlyTarget)
        PropertiesService.getScriptProperties().setProperties(properties, false)
        return { executiveId: executiveId, dailyTarget: dailyTarget, monthlyTarget: monthlyTarget }
      })
    }

    function setUserActive_(spreadsheet, userId, active) {
      return withWriteLock_(function () {
        if (typeof userId !== 'string' || !userId || typeof active !== 'boolean') {
          throw apiError_(400, 'A user ID and active status are required.')
        }
        const sheet = spreadsheet.getSheetByName('Users')
        if (!sheet || sheet.getLastRow() < 2) throw apiError_(404, 'User account sheet was not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const idColumn = headers.indexOf('User ID')
        const activeColumn = headers.indexOf('Active')
        const roleColumn = headers.indexOf('Role')
        if (idColumn < 0 || activeColumn < 0 || roleColumn < 0) throw apiError_(422, 'The Users sheet is missing required columns.')

        const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
        let targetRow = 0
        let targetRole = ''
        let activeAdmins = 0
        rows.forEach(function (row, index) {
          const rowRole = String(row[roleColumn] || '')
          const rowActive = String(row[activeColumn]).toLowerCase() === 'true'
          if (rowRole === 'Super Admin' && rowActive) activeAdmins += 1
          if (String(row[idColumn] || '') === userId) {
            targetRow = index + 2
            targetRole = rowRole
          }
        })
        if (!targetRow) throw apiError_(404, 'User account was not found.')
        if (!active && targetRole === 'Super Admin' && activeAdmins <= 1) {
          throw apiError_(400, 'The only Super Admin account cannot be deactivated.')
        }

        createBackup_(spreadsheet)
        sheet.getRange(targetRow, activeColumn + 1).setValue(active ? 'TRUE' : 'FALSE')
        SpreadsheetApp.flush()
        return { updated: true }
      })
    }

    function appendRecord_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const sheetName = String(payload.sheet || '')
        if (ERP_WRITE_SHEETS.indexOf(sheetName) < 0) throw apiError_(403, 'This workbook sheet cannot be edited through the API.')
        const sheet = spreadsheet.getSheetByName(sheetName)
        if (!sheet || sheet.getLastRow() < 1) throw apiError_(422, 'The master Google Sheet is missing the ' + sheetName + ' header row.')

        const record = payload.record
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw apiError_(400, 'A record is required.')
        const addedColumns = Array.isArray(payload.ensureColumns) ? payload.ensureColumns.map(String) : []
        let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const requiredHeaders = Array.isArray(payload.requiredHeaders) ? payload.requiredHeaders.map(String) : []
        const missing = requiredHeaders.filter(function (header) {
          return headers.indexOf(header) < 0 && addedColumns.indexOf(header) < 0
        })
        if (missing.length) throw apiError_(422, 'The ' + sheetName + ' sheet is missing required columns: ' + missing.join(', ') + '.')

        assertRecordUnique_(spreadsheet, sheetName, record)
        createBackup_(spreadsheet)
        addedColumns.forEach(function (column) {
          if (headers.indexOf(column) >= 0) return
          sheet.getRange(1, headers.length + 1).setValue(column)
          headers.push(column)
        })
        const requiredAfterAdd = requiredHeaders.filter(function (header) { return headers.indexOf(header) < 0 })
        if (requiredAfterAdd.length) throw apiError_(422, 'Could not add required columns: ' + requiredAfterAdd.join(', ') + '.')
        sheet.appendRow(headers.map(function (header) { return safeCellValue_(record[header] === undefined ? '' : record[header]) }))
        SpreadsheetApp.flush()
        return { appended: true }
      })
    }

    function addMarketplaceListing_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const platform = String(payload.platform || '').trim()
        const platformSku = String(payload.platformSku || '').trim()
        const productSku = String(payload.productSku || '').trim()
        const allowedPlatforms = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
        if (allowedPlatforms.indexOf(platform) < 0) throw apiError_(400, 'Choose a supported marketplace platform.')
        if (!platformSku || platformSku.length > 100 || !productSku || productSku.length > 100) {
          throw apiError_(400, 'A valid platform SKU and product SKU are required.')
        }

        const headers = ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name', 'Selling Price', 'MRP', 'Status', 'Created By', 'Created At']
        const backupState = { created: false }
        const target = ensureStockSheet_(spreadsheet, 'Marketplace_Listings', headers, backupState)
        const existing = readSheetRecords_(spreadsheet, 'Marketplace_Listings')
        if (existing.some(function (row) {
          return String(row.Platform || '').trim().toLowerCase() === platform.toLowerCase()
            && String(row['Platform SKU'] || '').trim().toLowerCase() === platformSku.toLowerCase()
        })) throw apiError_(409, 'That platform SKU already exists on ' + platform + '.')

        createBackupOnce_(spreadsheet, backupState)
        const record = {
          'Listing ID': String(payload.id || Utilities.getUuid()),
          Platform: platform,
          'Platform SKU': platformSku,
          'Product SKU': productSku,
          'Master SKU': String(payload.masterSku || productSku),
          'Product Name': String(payload.productName || productSku),
          'Selling Price': Number(payload.sellingPrice || 0),
          MRP: Number(payload.mrp || 0),
          Status: 'Active',
          'Created By': String(payload.createdBy || ''),
          'Created At': String(payload.createdAt || new Date().toISOString()),
        }
        appendStockRow_(target.sheet, target.headers, record)
        SpreadsheetApp.flush()
        return { appended: true, listing: record }
      })
    }

    function importMarketplaceWorkbook_(spreadsheet, payload) {
      return withWriteLock_(function () {
        function rowsFor(key, label, maximum) {
          const rows = payload[key]
          if (!Array.isArray(rows) || rows.length < 1 || rows.length > maximum) {
            throw apiError_(400, label + ' must contain between 1 and ' + maximum + ' rows.')
          }
          return rows.map(function (row, index) {
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
              throw apiError_(400, label + ' row ' + (index + 1) + ' must be an object.')
            }
            return row
          })
        }

        function requiredImportText(row, key, label, maximum) {
          const value = String(row[key] === undefined || row[key] === null ? '' : row[key]).trim()
          if (!value || value.length > maximum || /[\u0000-\u001f]/.test(value)) {
            throw apiError_(400, label + ' is missing or invalid.')
          }
          return value
        }

        function importText(row, key, maximum) {
          const value = String(row[key] === undefined || row[key] === null ? '' : row[key]).trim()
          if (value.length > maximum || /[\u0000-\u001f]/.test(value)) {
            throw apiError_(400, key + ' is too long or contains invalid characters.')
          }
          return value
        }

        function importAmount(value, label) {
          if (value === '' || value === null || value === undefined) return ''
          const amount = Number(value)
          if (!isFinite(amount) || amount < 0) throw apiError_(400, label + ' must be a non-negative number.')
          return amount
        }

        function keyOf(value) {
          const text = String(value || '').trim()
          const normalized = text.charAt(0) === "'" && /^[=+\-@\t\r]/.test(text.charAt(1))
            ? text.slice(1)
            : text
          return normalized.toLowerCase()
        }

        function sameImportValue(current, incoming) {
          const currentValue = current instanceof Date ? current.toISOString() : String(current === null || current === undefined ? '' : current).trim()
          const incomingValue = incoming instanceof Date ? incoming.toISOString() : String(incoming === null || incoming === undefined ? '' : incoming).trim()
          return currentValue === incomingValue
        }

        function hasImportChanges(current, incoming) {
          return Object.keys(incoming).some(function (header) {
            return incoming[header] !== undefined && incoming[header] !== '' &&
              !sameImportValue(current[header], incoming[header])
          })
        }

        function mergeImportRecord(current, incoming) {
          const merged = Object.assign({}, current)
          Object.keys(incoming).forEach(function (header) {
            if (incoming[header] !== undefined && incoming[header] !== '') merged[header] = incoming[header]
          })
          return merged
        }

        function previousSkuList(value) {
          return String(value || '').split('|').map(function (sku) { return sku.trim() }).filter(Boolean)
        }

        function appendImportRows(target, rows) {
          if (!rows.length) return
          const values = rows.map(function (record) {
            return target.headers.map(function (header) {
              return safeCellValue_(record[header] === undefined ? '' : record[header])
            })
          })
          const startRow = Math.max(2, target.sheet.getLastRow() + 1)
          target.sheet.getRange(startRow, 1, values.length, target.headers.length).setValues(values)
        }

        function updateImportRows(target, rows, keyColumn) {
          if (!rows.length || target.sheet.getLastRow() < 2) return 0
          const keyIndex = target.headers.indexOf(keyColumn)
          if (keyIndex < 0) return 0
          const values = target.sheet.getRange(2, 1, target.sheet.getLastRow() - 1, target.headers.length).getValues()
          let updated = 0
          rows.forEach(function (record) {
            const key = keyOf(record.__importMatchKey === undefined ? record[keyColumn] : record.__importMatchKey)
            if (!key) return
            for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
              if (keyOf(values[rowIndex][keyIndex]) !== key) continue
              let rowChanged = false
              target.headers.forEach(function (header, columnIndex) {
                if (record[header] === undefined || record[header] === '' ||
                    sameImportValue(values[rowIndex][columnIndex], record[header])) return
                values[rowIndex][columnIndex] = safeCellValue_(record[header])
                rowChanged = true
              })
              if (rowChanged) {
                updated += 1
              }
              break
            }
          })
          if (updated) target.sheet.getRange(2, 1, values.length, target.headers.length).setValues(values)
          return updated
        }

        const inputProducts = rowsFor('products', 'Products', 5000)
        const inputVariants = rowsFor('variants', 'SKU variants', 10000)
        const inputListings = rowsFor('listings', 'Marketplace listings', 10000)
        const productHeaders = ['Internal Product ID', 'Master SKU', 'Product Title', 'Category', 'MRP', 'Status', 'Created Date', 'Updated Date', 'ASIN', 'Shopify Product ID', 'Previous SKUs']
        const variantHeaders = ['Variant ID', 'Master SKU', 'Variant SKU', 'Size', 'Color', 'Pack Quantity', 'MRP', 'Selling Price', 'Status', 'Variant Title', 'Shopify Product ID', 'Shopify Variant ID', 'Shopify Inventory']
        const listingHeaders = ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name', 'ASIN', 'Amazon Listing ID', 'Selling Price', 'MRP', 'Fulfillment Channel', 'Status', 'Variant Title', 'Shopify Product ID', 'Shopify Variant ID', 'Shopify Inventory', 'Created By', 'Created At']
        const currentProducts = readSheetRecords_(spreadsheet, 'Products')
        const currentVariants = readSheetRecords_(spreadsheet, 'SKU_Variants')
        const currentListings = readSheetRecords_(spreadsheet, 'Marketplace_Listings')
        const productSkuToMaster = new Map()
        const productById = new Map()
        const productBySku = new Map()
        const productsByTitle = new Map()
        const productAliasToMaster = new Map()
        const variantSkuToMaster = new Map()
        const variantIds = new Map()
        const variantById = new Map()
        const variantBySku = new Map()
        const listingSkuToId = new Map()
        const listingIds = new Map()
        const listingById = new Map()
        const skuRenames = []

        function titleKey(value) {
          return keyOf(String(value || '').trim().replace(/\s+/g, ' '))
        }

        currentProducts.forEach(function (row) {
          const sku = String(row['Master SKU'] || '').trim()
          const key = keyOf(sku)
          const id = keyOf(row['Internal Product ID'])
          if (key && productBySku.has(key)) throw apiError_(409, 'Existing products contain a duplicate Master SKU: ' + sku)
          if (id && productById.has(id)) throw apiError_(409, 'Existing products contain a duplicate Internal Product ID: ' + row['Internal Product ID'])
          if (key) productSkuToMaster.set(key, sku)
          if (id) {
            productById.set(id, row)
          }
          if (key) productBySku.set(key, row)
          const title = titleKey(row['Product Title'])
          if (title) {
            const matches = productsByTitle.get(title) || []
            matches.push(row)
            productsByTitle.set(title, matches)
          }
          previousSkuList(row['Previous SKUs']).forEach(function (previousSku) {
            const aliasKey = keyOf(previousSku)
            const existingAlias = productAliasToMaster.get(aliasKey)
            if (existingAlias && keyOf(existingAlias) !== key) {
              throw apiError_(409, 'Existing products share a previous SKU alias: ' + previousSku)
            }
            productAliasToMaster.set(aliasKey, sku)
          })
        })
        currentVariants.forEach(function (row) {
          const sku = String(row['Variant SKU'] || '').trim()
          const key = keyOf(sku)
          const master = String(row['Master SKU'] || '').trim()
          const id = keyOf(row['Variant ID'])
          if (key && variantBySku.has(key)) throw apiError_(409, 'Existing variants contain a duplicate Variant SKU: ' + sku)
          if (id && variantById.has(id)) throw apiError_(409, 'Existing variants contain a duplicate Variant ID: ' + row['Variant ID'])
          if (key) variantSkuToMaster.set(key, master)
          if (id) {
            variantIds.set(id, key)
            variantById.set(id, row)
          }
          if (key) variantBySku.set(key, row)
        })
        currentListings.forEach(function (row) {
          const id = keyOf(row['Listing ID'])
          const platformKey = keyOf(row.Platform) + ':' + keyOf(row['Platform SKU'])
          if (id && listingById.has(id)) throw apiError_(409, 'Existing listings contain a duplicate Listing ID: ' + row['Listing ID'])
          if (row.Platform && row['Platform SKU'] && listingSkuToId.has(platformKey)) {
            throw apiError_(409, 'Existing listings contain a duplicate platform SKU: ' + row['Platform SKU'])
          }
          if (id) {
            listingIds.set(id, platformKey)
            listingById.set(id, row)
          }
          if (row.Platform && row['Platform SKU']) listingSkuToId.set(platformKey, id)
        })

        const addedProducts = []
        const addedVariants = []
        const addedListings = []
        const updatedProducts = []
        const updatedVariants = []
        const updatedListings = []
        const matched = { products: 0, variants: 0, listings: 0 }
        const skuMrpUpdates = new Map()
        const seenProductSkus = new Set()
        const seenProductIds = new Set()
        const claimedProductIds = new Set()
        inputProducts.forEach(function (row, index) {
          const label = 'Products row ' + (index + 1)
          const productId = requiredImportText(row, 'Internal Product ID', label + ' Internal Product ID', 160)
          const masterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const title = requiredImportText(row, 'Product Title', label + ' Product Title', 300)
          const skuKey = keyOf(masterSku)
          const idKey = keyOf(productId)
          if (seenProductSkus.has(skuKey)) throw apiError_(409, 'Duplicate product Master SKU in import: ' + masterSku)
          if (seenProductIds.has(idKey)) throw apiError_(409, 'Duplicate product ID in import: ' + productId)
          const byId = productById.get(idKey)
          const bySku = productBySku.get(skuKey)
          const matchingTitles = productsByTitle.get(titleKey(title)) || []
          if (!byId && !bySku && matchingTitles.length > 1) {
            throw apiError_(409, 'Product title matches more than one existing product; keep its Internal Product ID unchanged: ' + title)
          }
          const existing = byId || bySku || (matchingTitles.length === 1 ? matchingTitles[0] : null)
          if ((byId && bySku && keyOf(byId['Internal Product ID']) !== keyOf(bySku['Internal Product ID'])) ||
              (!byId && bySku && matchingTitles.length === 1 &&
                keyOf(bySku['Internal Product ID']) !== keyOf(matchingTitles[0]['Internal Product ID']))) {
            throw apiError_(409, 'Product ID, SKU, and title identify different existing products: ' + title)
          }
          const existingId = existing ? String(existing['Internal Product ID'] || '').trim() : productId
          const existingIdKey = keyOf(existingId)
          if (existing && claimedProductIds.has(existingIdKey)) {
            throw apiError_(409, 'More than one imported row matches the same existing product: ' + title)
          }
          const inputIdOwner = productById.get(idKey)
          if (inputIdOwner && (!existing || keyOf(inputIdOwner['Internal Product ID']) !== existingIdKey)) {
            throw apiError_(409, 'Product ID conflicts with a different existing product: ' + productId)
          }
          const skuOwner = productBySku.get(skuKey)
          if (skuOwner && (!existing || keyOf(skuOwner['Internal Product ID']) !== existingIdKey)) {
            throw apiError_(409, 'Master SKU is already assigned to a different product: ' + masterSku)
          }
          if (variantSkuToMaster.has(skuKey)) throw apiError_(409, 'Master SKU conflicts with an existing variant SKU: ' + masterSku)
          const aliasTarget = productAliasToMaster.get(skuKey)
          const aliasOwner = aliasTarget ? productBySku.get(keyOf(aliasTarget)) : null
          if (aliasOwner && (!existing || keyOf(aliasOwner['Internal Product ID']) !== existingIdKey)) {
            throw apiError_(409, 'Master SKU is already recorded as a previous SKU for another product: ' + masterSku)
          }
          seenProductSkus.add(skuKey)
          seenProductIds.add(idKey)
          if (existing) claimedProductIds.add(existingIdKey)
          const record = {
            'Internal Product ID': existingId || productId,
            'Master SKU': masterSku,
            'Product Title': title,
            Category: importText(row, 'Category', 160),
            MRP: importAmount(row.MRP !== undefined ? row.MRP : (row['MRP (INR)'] !== undefined ? row['MRP (INR)'] : row['List Price']), label + ' MRP'),
            Status: importText(row, 'Status', 40),
            'Created Date': importText(row, 'Created Date', 100),
            'Updated Date': importText(row, 'Updated Date', 100),
            ASIN: importText(row, 'ASIN', 100),
            'Shopify Product ID': importText(row, 'Shopify Product ID', 100),
            'Previous SKUs': '',
          }
          if (existing) {
            matched.products += 1
            const oldSku = String(existing['Master SKU'] || '').trim()
            const oldSkuKey = keyOf(oldSku)
            const aliases = previousSkuList(existing['Previous SKUs'])
            if (oldSku && oldSkuKey !== skuKey) {
              if (!aliases.some(function (alias) { return keyOf(alias) === oldSkuKey })) aliases.push(oldSku)
              skuRenames.push({
                oldSku: oldSku,
                newSku: masterSku,
                oldTitle: String(existing['Product Title'] || '').trim(),
                newTitle: title,
              })
            }
            record['Previous SKUs'] = aliases.join(' | ')
            const merged = mergeImportRecord(existing, record)
            if (hasImportChanges(existing, merged)) updatedProducts.push(merged)
            if (oldSkuKey && oldSkuKey !== skuKey) {
              productSkuToMaster.delete(oldSkuKey)
              productBySku.delete(oldSkuKey)
              productAliasToMaster.set(oldSkuKey, masterSku)
            }
            aliases.forEach(function (alias) { productAliasToMaster.set(keyOf(alias), masterSku) })
            productSkuToMaster.set(skuKey, masterSku)
            productBySku.set(skuKey, merged)
            productById.set(existingIdKey, merged)
            if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
            return
          }
          record.Status = record.Status || 'Active'
          addedProducts.push(record)
          productSkuToMaster.set(skuKey, masterSku)
          productById.set(idKey, record)
          productBySku.set(skuKey, record)
          if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
        })

        const seenVariantSkus = new Set()
        const seenVariantIds = new Set()
        inputVariants.forEach(function (row, index) {
          const label = 'SKU variants row ' + (index + 1)
          const variantId = requiredImportText(row, 'Variant ID', label + ' Variant ID', 160)
          const importedMasterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const variantSku = requiredImportText(row, 'Variant SKU', label + ' Variant SKU', 100)
          const skuKey = keyOf(variantSku)
          const idKey = keyOf(variantId)
          const importedMasterKey = keyOf(importedMasterSku)
          const masterSku = productSkuToMaster.get(importedMasterKey) || productAliasToMaster.get(importedMasterKey) || ''
          const masterKey = keyOf(masterSku)
          if (seenVariantSkus.has(skuKey)) throw apiError_(409, 'Duplicate variant SKU in import: ' + variantSku)
          seenVariantSkus.add(skuKey)
          if (productSkuToMaster.has(skuKey)) throw apiError_(409, 'Variant SKU conflicts with an existing master SKU: ' + variantSku)
          if (!masterSku) throw apiError_(422, 'Variant ' + variantSku + ' references a missing master product.')
          if (seenVariantIds.has(idKey) || (variantIds.has(idKey) && variantIds.get(idKey) !== skuKey)) {
            throw apiError_(409, 'Variant ID conflicts with an existing SKU: ' + variantId)
          }
          seenVariantIds.add(idKey)
          const existingMaster = variantSkuToMaster.get(skuKey)
          const canonicalExistingMaster = productAliasToMaster.get(keyOf(existingMaster)) || existingMaster
          if (existingMaster && keyOf(canonicalExistingMaster) !== masterKey) {
            throw apiError_(409, 'Existing variant SKU is linked to a different master: ' + variantSku)
          }
          const packQuantity = row['Pack Quantity'] === '' || row['Pack Quantity'] === null || row['Pack Quantity'] === undefined
            ? ''
            : Number(row['Pack Quantity'])
          if (packQuantity !== '' && (!isFinite(packQuantity) || packQuantity < 1 || Math.floor(packQuantity) !== packQuantity)) {
            throw apiError_(400, label + ' Pack Quantity must be a positive whole number.')
          }
          const record = {
            'Variant ID': variantId,
            'Master SKU': masterSku,
            'Variant SKU': variantSku,
            Size: importText(row, 'Size', 60),
            Color: importText(row, 'Color', 100),
            'Pack Quantity': packQuantity,
            MRP: importAmount(row.MRP !== undefined ? row.MRP : (row['MRP (INR)'] !== undefined ? row['MRP (INR)'] : row['List Price']), label + ' MRP'),
            'Selling Price': importAmount(row['Selling Price'], label + ' Selling Price'),
            Status: importText(row, 'Status', 40),
            'Variant Title': importText(row, 'Variant Title', 200),
            'Shopify Product ID': importText(row, 'Shopify Product ID', 100),
            'Shopify Variant ID': importText(row, 'Shopify Variant ID', 100),
            'Shopify Inventory': importAmount(row['Shopify Inventory'], label + ' Shopify Inventory'),
          }
          const existingVariant = variantById.get(idKey) || variantBySku.get(skuKey)
          if (existingVariant) {
            matched.variants += 1
            const merged = mergeImportRecord(existingVariant, record)
            if (hasImportChanges(existingVariant, merged)) updatedVariants.push(merged)
            variantSkuToMaster.set(skuKey, masterSku)
            variantIds.set(idKey, skuKey)
            if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
            return
          }
          record.Status = record.Status || 'Active'
          addedVariants.push(record)
          variantSkuToMaster.set(skuKey, masterSku)
          variantIds.set(idKey, skuKey)
          if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
        })

        const seenListingSkus = new Set()
        const seenListingIds = new Set()
        const allowedPlatforms = ['Amazon.in', 'Amazon.com', 'Flipkart', 'Meesho', 'Myntra', 'Shopify']
        inputListings.forEach(function (row, index) {
          const label = 'Marketplace listings row ' + (index + 1)
          const listingId = requiredImportText(row, 'Listing ID', label + ' Listing ID', 180)
          const platform = requiredImportText(row, 'Platform', label + ' Platform', 40)
          const platformSku = requiredImportText(row, 'Platform SKU', label + ' Platform SKU', 100)
          const importedProductSku = requiredImportText(row, 'Product SKU', label + ' Product SKU', 100)
          const importedMasterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const productName = requiredImportText(row, 'Product Name', label + ' Product Name', 300)
          if (allowedPlatforms.indexOf(platform) < 0) throw apiError_(400, 'Unsupported marketplace: ' + platform)
          const listingKey = keyOf(platform) + ':' + keyOf(platformSku)
          const idKey = keyOf(listingId)
          const importedProductKey = keyOf(importedProductSku)
          const importedMasterKey = keyOf(importedMasterSku)
          const productSku = productAliasToMaster.get(importedProductKey) ||
            productSkuToMaster.get(importedProductKey) || importedProductSku
          const productKey = keyOf(productSku)
          const rawLinkedMaster = variantSkuToMaster.get(importedProductKey) ||
            productSkuToMaster.get(importedProductKey) || productAliasToMaster.get(importedProductKey)
          const linkedMaster = productAliasToMaster.get(keyOf(rawLinkedMaster)) || rawLinkedMaster
          const declaredMaster = productSkuToMaster.get(importedMasterKey) ||
            productAliasToMaster.get(importedMasterKey) || importedMasterSku
          if (!linkedMaster) throw apiError_(422, 'Listing SKU ' + platformSku + ' references a missing product SKU.')
          if (keyOf(linkedMaster) !== keyOf(declaredMaster)) throw apiError_(422, 'Listing SKU ' + platformSku + ' has an inconsistent Master SKU.')
          const masterSku = linkedMaster
          if (seenListingSkus.has(listingKey) || seenListingIds.has(idKey)) {
            throw apiError_(409, 'Duplicate marketplace listing in import: ' + platformSku)
          }
          seenListingSkus.add(listingKey)
          seenListingIds.add(idKey)
          const existingIdPlatform = listingIds.get(idKey)
          const existingSkuId = listingSkuToId.get(listingKey)
          if (existingIdPlatform !== undefined && keyOf(existingIdPlatform.split(':')[0]) !== keyOf(platform)) {
            throw apiError_(409, 'Listing ID is already assigned to a different marketplace: ' + listingId)
          }
          if (existingSkuId !== undefined && existingSkuId !== idKey) {
            throw apiError_(409, 'Platform SKU is already assigned to another listing: ' + platformSku)
          }
          const status = importText(row, 'Status', 40)
          const record = {
            'Listing ID': listingId,
            Platform: platform,
            'Platform SKU': platformSku,
            'Product SKU': productSku,
            'Master SKU': masterSku,
            'Product Name': productName,
            ASIN: importText(row, 'ASIN', 100),
            'Amazon Listing ID': importText(row, 'Amazon Listing ID', 100),
            'Selling Price': importAmount(row['Selling Price'], label + ' Selling Price'),
            MRP: importAmount(row.MRP !== undefined ? row.MRP : (row['MRP (INR)'] !== undefined ? row['MRP (INR)'] : row['List Price']), label + ' MRP'),
            'Fulfillment Channel': importText(row, 'Fulfillment Channel', 100),
            Status: status,
            'Variant Title': importText(row, 'Variant Title', 200),
            'Shopify Product ID': importText(row, 'Shopify Product ID', 100),
            'Shopify Variant ID': importText(row, 'Shopify Variant ID', 100),
            'Shopify Inventory': importAmount(row['Shopify Inventory'], label + ' Shopify Inventory'),
            'Created By': '',
            'Created At': '',
          }
          const existingListing = listingById.get(idKey) ||
            currentListings.find(function (item) {
              return keyOf(item.Platform) + ':' + keyOf(item['Platform SKU']) === listingKey
            })
          if (existingIdPlatform !== undefined || existingSkuId !== undefined) {
            if (existingListing) {
              matched.listings += 1
              record['Listing ID'] = String(existingListing['Listing ID'] || listingId)
              const merged = mergeImportRecord(existingListing, record)
              if (hasImportChanges(existingListing, merged)) updatedListings.push(merged)
            }
            if (record.MRP !== '') {
              skuMrpUpdates.set(productKey, record.MRP)
              if (linkedMaster) skuMrpUpdates.set(keyOf(linkedMaster), record.MRP)
            }
            listingIds.set(idKey, listingKey)
            listingSkuToId.set(listingKey, keyOf(record['Listing ID']))
            return
          }
          record.Status = record.Status || 'Active'
          record['Created By'] = String(payload.createdBy || '')
          record['Created At'] = new Date().toISOString()
          addedListings.push(record)
          listingSkuToId.set(listingKey, idKey)
          listingIds.set(idKey, listingKey)
          if (record.MRP !== '') {
            skuMrpUpdates.set(productKey, record.MRP)
            if (linkedMaster) skuMrpUpdates.set(keyOf(linkedMaster), record.MRP)
          }
        })

        currentProducts.forEach(function (row) {
          const currentSku = String(row['Master SKU'] || '').trim()
          const currentSkuKey = keyOf(currentSku)
          const canonicalSku = productAliasToMaster.get(currentSkuKey) || currentSku
          const mrp = skuMrpUpdates.get(keyOf(canonicalSku))
          if (mrp === undefined || mrp === '' || !currentSku) return
          const idKey = keyOf(row['Internal Product ID'])
          const staged = updatedProducts.find(function (item) { return keyOf(item['Internal Product ID']) === idKey })
          const base = staged || row
          const merged = mergeImportRecord(base, { 'Master SKU': canonicalSku, MRP: mrp })
          if (hasImportChanges(base, merged)) {
            if (staged) Object.assign(staged, merged)
            else {
              merged.__importMatchKey = row['Internal Product ID']
              updatedProducts.push(merged)
            }
          }
        })
        addedProducts.forEach(function (row) {
          const mrp = skuMrpUpdates.get(keyOf(row['Master SKU']))
          if (mrp !== undefined && mrp !== '') row.MRP = mrp
        })

        currentVariants.forEach(function (row) {
          const existingMaster = String(row['Master SKU'] || '').trim()
          const canonicalMaster = productAliasToMaster.get(keyOf(existingMaster)) || existingMaster
          const sku = String(row['Variant SKU'] || '').trim()
          const mrp = skuMrpUpdates.get(keyOf(sku))
          const idKey = keyOf(row['Variant ID'])
          const staged = updatedVariants.find(function (item) { return keyOf(item['Variant ID']) === idKey })
          const base = staged || row
          const patch = { 'Master SKU': canonicalMaster }
          if (mrp !== undefined && mrp !== '') patch.MRP = mrp
          const merged = mergeImportRecord(base, patch)
          if (hasImportChanges(base, merged)) {
            if (staged) Object.assign(staged, merged)
            else {
              merged.__importMatchKey = row['Variant ID']
              updatedVariants.push(merged)
            }
          }
        })
        addedVariants.forEach(function (row) {
          const mrp = skuMrpUpdates.get(keyOf(row['Variant SKU']))
          if (mrp !== undefined && mrp !== '') row.MRP = mrp
        })

        const stagedListingIds = new Set(updatedListings.map(function (row) { return keyOf(row['Listing ID']) }))
        currentListings.forEach(function (row) {
          const listingId = keyOf(row['Listing ID'])
          if (stagedListingIds.has(listingId)) return
          const previousMaster = String(row['Master SKU'] || '').trim()
          const previousProduct = String(row['Product SKU'] || '').trim()
          const canonicalMaster = productAliasToMaster.get(keyOf(previousMaster))
          const canonicalProduct = productAliasToMaster.get(keyOf(previousProduct))
          if (!canonicalMaster && !canonicalProduct) return
          const patch = {}
          if (canonicalMaster) patch['Master SKU'] = canonicalMaster
          if (canonicalProduct) patch['Product SKU'] = canonicalProduct
          const merged = mergeImportRecord(row, patch)
          if (hasImportChanges(row, merged)) {
            merged.__importMatchKey = row['Listing ID']
            updatedListings.push(merged)
            stagedListingIds.add(listingId)
          }
        })

        const finishedRows = readSheetRecords_(spreadsheet, 'Finished_Goods')
        const finishedUpdates = []
        const finishedSkuKeys = new Set(finishedRows.map(function (row) { return keyOf(row['Product SKU']) }).filter(Boolean))
        const renameTargets = new Set()
        skuRenames.forEach(function (rename) {
          const oldKey = keyOf(rename.oldSku)
          const newKey = keyOf(rename.newSku)
          if (renameTargets.has(newKey)) throw apiError_(409, 'Multiple products cannot be renamed to the same Master SKU: ' + rename.newSku)
          renameTargets.add(newKey)
          if (finishedSkuKeys.has(newKey)) {
            throw apiError_(409, 'Finished-goods stock already has the new SKU; resolve the stock-row collision before renaming: ' + rename.newSku)
          }
          const stockRow = finishedRows.find(function (item) { return keyOf(item['Product SKU']) === oldKey })
          if (finishedRows.filter(function (item) { return keyOf(item['Product SKU']) === oldKey }).length > 1) {
            throw apiError_(409, 'Finished-goods stock contains duplicate rows for the SKU being renamed: ' + rename.oldSku)
          }
          if (stockRow) {
            const merged = mergeImportRecord(stockRow, { 'Product SKU': rename.newSku })
            if (hasImportChanges(stockRow, merged)) {
              merged.__importMatchKey = rename.oldSku
              finishedUpdates.push(merged)
            }
          }
        })

        const totals = {
          added: { products: addedProducts.length, variants: addedVariants.length, listings: addedListings.length },
          updated: { products: 0, variants: 0, listings: 0 },
          skipped: { products: 0, variants: 0, listings: 0 },
          renamedProducts: skuRenames.length,
          backupName: '',
        }
        if (!addedProducts.length && !addedVariants.length && !addedListings.length
          && !updatedProducts.length && !updatedVariants.length && !updatedListings.length && !finishedUpdates.length) {
          totals.skipped = matched
          return totals
        }

        const backupState = { created: false, backupName: '' }
        createBackupOnce_(spreadsheet, backupState)
        const productTarget = ensureStockSheet_(spreadsheet, 'Products', productHeaders, backupState)
        const variantTarget = ensureStockSheet_(spreadsheet, 'SKU_Variants', variantHeaders, backupState)
        const listingTarget = ensureStockSheet_(spreadsheet, 'Marketplace_Listings', listingHeaders, backupState)
        const finishedTarget = finishedUpdates.length
          ? ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
          : null
        appendImportRows(productTarget, addedProducts)
        appendImportRows(variantTarget, addedVariants)
        appendImportRows(listingTarget, addedListings)
        totals.updated.products = updateImportRows(productTarget, updatedProducts, 'Internal Product ID')
        totals.updated.variants = updateImportRows(variantTarget, updatedVariants, 'Variant ID')
        totals.updated.listings = updateImportRows(listingTarget, updatedListings, 'Listing ID')
        if (finishedTarget) updateImportRows(finishedTarget, finishedUpdates, 'Product SKU')
        totals.skipped = {
          products: Math.max(0, matched.products - totals.updated.products),
          variants: Math.max(0, matched.variants - totals.updated.variants),
          listings: Math.max(0, matched.listings - totals.updated.listings),
        }
        SpreadsheetApp.flush()
        totals.backupName = backupState.backupName
        return totals
      })
    }

    function assertRecordUnique_(spreadsheet, sheetName, record) {
      const fields = {
        Products: 'Master SKU',
        SKU_Variants: 'Variant SKU',
        Machines: 'Machine ID',
        Production: 'Production ID',
      }
      const field = fields[sheetName]
      const value = String(record[field] || '').trim().toLowerCase()
      if (!value) return
      const existing = readSheetRecords_(spreadsheet, sheetName)
      if (existing.some(function (row) { return String(row[field] || '').trim().toLowerCase() === value })) {
        throw apiError_(409, 'That ' + field + ' already exists in the master Google Sheet.')
      }
    }

    function assertUsernameAvailable_(users, user) {
      if (!user || typeof user.Username !== 'string' || !user.Username.trim()) throw apiError_(400, 'A valid username is required.')
      const username = user.Username.trim().toLowerCase()
      if (users.some(function (row) { return String(row.Username || '').trim().toLowerCase() === username })) {
        throw apiError_(409, 'That login ID is already in use.')
      }
    }

    function ensureUserSheet_(spreadsheet) {
      let sheet = spreadsheet.getSheetByName('Users')
      if (!sheet) sheet = spreadsheet.insertSheet('Users')
      if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, ERP_USER_COLUMNS.length).setValues([ERP_USER_COLUMNS])
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
      const missing = ERP_USER_COLUMNS.filter(function (column) { return headers.indexOf(column) < 0 })
      const requiredMissing = missing.filter(function (column) { return column !== 'Assigned Platforms' })
      if (requiredMissing.length) throw apiError_(422, 'The Users sheet is missing required columns: ' + requiredMissing.join(', ') + '.')
      missing.forEach(function (column) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(column)
        headers.push(column)
      })
      return sheet
    }

    function userValues_(user, headers) {
      return headers.map(function (header) {
        const active = user.Active === true || String(user.Active || '').toLowerCase() === 'true'
        const value = header === 'Active' ? (active ? 'TRUE' : 'FALSE') : user[header]
        return safeCellValue_(value === undefined ? '' : value)
      })
    }

    function createBackup_(spreadsheet) {
      const file = DriveApp.getFileById(spreadsheet.getId())
      const timestamp = Utilities.formatDate(new Date(), spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd-HH-mm-ss')
      const backupName = spreadsheet.getName() + '-Backup-' + timestamp
      const parents = file.getParents()
      const backup = parents.hasNext() ? file.makeCopy(backupName, parents.next()) : file.makeCopy(backupName)
      return backup.getName()
    }

    function createBackupOnce_(spreadsheet, state) {
      if (state && state.created) return
      const backupName = createBackup_(spreadsheet)
      if (state) {
        state.created = true
        state.backupName = backupName
      }
      return backupName
    }

    function safeCellValue_(value) {
      if (typeof value === 'string' && /^[=+\-@\t\r]/.test(value)) return "'" + value
      return value
    }

    function serializeCell_(value) {
      return value instanceof Date ? value.toISOString() : value
    }

    function withWriteLock_(operation) {
      const lock = LockService.getScriptLock()
      lock.waitLock(30000)
      try {
        return operation()
      } finally {
        lock.releaseLock()
      }
    }

    function apiError_(status, message) {
      const error = new Error(message)
      error.statusCode = status
      return error
    }

    function jsonOutput_(value) {
      return ContentService.createTextOutput(JSON.stringify(value))
        .setMimeType(ContentService.MimeType.JSON)
    }
