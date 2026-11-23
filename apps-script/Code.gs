    const ERP_USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At']
    const ERP_DATA_SHEETS = ['Users', 'Products', 'SKU_Variants', 'Marketplace_Listings', 'Machines', 'Raw_Materials', 'Finished_Goods', 'Stock_Movement', 'Production']
    const ERP_WRITE_SHEETS = ['Products', 'SKU_Variants', 'Machines', 'Production']
    const ERP_SESSION_BOUND_ACTIONS = ['addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook']
    const ERP_WORKBOOK_CACHE_SECONDS = 10
    const ERP_WORKBOOK_CACHE_MAX_BYTES = 90000
    const ERP_RAW_MATERIAL_HEADERS = ['Material ID', 'Material Name', 'Material SKU', 'Unit', 'Opening Stock', 'Purchase Inward', 'Supplier', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Closing Stock', 'Reorder Level', 'Average Unit Cost', 'Stock Value', 'Updated Date', 'Status']
    const ERP_FINISHED_GOODS_HEADERS = ['Product SKU', 'Product Name', 'Opening Stock', 'Production Received', 'Quality Approved', 'Rejected', 'Reserved Stock', 'Available Stock', 'Dispatched Stock', 'Returned Stock', 'Damaged Stock', 'Last Updated', 'Adjustment In', 'Adjustment Out', 'Status']
    const ERP_STOCK_MOVEMENT_HEADERS = ['Movement ID', 'Date/Time', 'SKU', 'Movement Type', 'Quantity', 'Reference ID', 'Machine ID', 'Reason', 'Opening Stock', 'Closing Stock', 'Created By', 'Item Type', 'Sales Channel', 'Delivery Partner']

    function onOpen() {
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
      }, true)
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
        }
        const data = dispatch_(spreadsheet, request.action, payload)
        if (request.action !== 'getWorkbookData' && request.action !== 'getUsers') {
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
      return { id: userId, name: String(user.Name || '').trim(), role: String(user.Role || '').trim() }
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
      return 'ERP_WORKBOOK_V1_' + spreadsheet.getId() + '_' + name
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
          const records = JSON.parse(cached)
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
      if (Utilities.newBlob(serialized).getBytes().length <= ERP_WORKBOOK_CACHE_MAX_BYTES) {
        try {
          cache.put(key, serialized, ERP_WORKBOOK_CACHE_SECONDS)
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
          if (['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA'].indexOf(salesChannel) < 0 || deliveryPartner.length > 100) {
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
          } else if (matchingReference.some(function (row) {
            return type !== 'Dispatch' || !salesChannel || !String(row['Sales Channel'] || '') || String(row['Sales Channel'] || '') === salesChannel
          })) {
            throw apiError_(409, 'That reference was already used for this stock item.')
          }
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
          if (linkedOrderReturn && type === 'Damage') {
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

    function createInitialAdmin_(spreadsheet, user) {
      return withWriteLock_(function () {
        const users = readSheetRecords_(spreadsheet, 'Users')
        if (users.some(function (row) { return String(row.Role || '') === 'Super Admin' })) {
          throw apiError_(409, 'The Super Admin account is already set up. Sign in instead.')
        }
        assertUsernameAvailable_(users, user)
        createBackup_(spreadsheet)
        const sheet = ensureUserSheet_(spreadsheet)
        sheet.appendRow(userValues_(user))
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
        ensureUserSheet_(spreadsheet).appendRow(userValues_(user))
        SpreadsheetApp.flush()
        return { created: true }
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

        const headers = ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name', 'Status', 'Created By', 'Created At']
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
            const key = keyOf(record[keyColumn])
            if (!key) return
            for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
              if (keyOf(values[rowIndex][keyIndex]) !== key) continue
              target.headers.forEach(function (header, columnIndex) {
                if (record[header] !== undefined && record[header] !== '') {
                  values[rowIndex][columnIndex] = safeCellValue_(record[header])
                }
              })
              updated += 1
              break
            }
          })
          if (updated) target.sheet.getRange(2, 1, values.length, target.headers.length).setValues(values)
          return updated
        }

        const inputProducts = rowsFor('products', 'Products', 5000)
        const inputVariants = rowsFor('variants', 'SKU variants', 10000)
        const inputListings = rowsFor('listings', 'Marketplace listings', 10000)
        const productHeaders = ['Internal Product ID', 'Master SKU', 'Product Title', 'Category', 'MRP', 'Status', 'Created Date', 'Updated Date', 'ASIN', 'Shopify Product ID']
        const variantHeaders = ['Variant ID', 'Master SKU', 'Variant SKU', 'Size', 'Color', 'Pack Quantity', 'MRP', 'Selling Price', 'Status', 'Variant Title', 'Shopify Product ID', 'Shopify Variant ID', 'Shopify Inventory']
        const listingHeaders = ['Listing ID', 'Platform', 'Platform SKU', 'Product SKU', 'Master SKU', 'Product Name', 'ASIN', 'Amazon Listing ID', 'Selling Price', 'MRP', 'Fulfillment Channel', 'Status', 'Variant Title', 'Shopify Product ID', 'Shopify Variant ID', 'Shopify Inventory', 'Created By', 'Created At']
        const currentProducts = readSheetRecords_(spreadsheet, 'Products')
        const currentVariants = readSheetRecords_(spreadsheet, 'SKU_Variants')
        const currentListings = readSheetRecords_(spreadsheet, 'Marketplace_Listings')
        const productSkuToMaster = new Map()
        const productIds = new Map()
        const variantSkuToMaster = new Map()
        const variantIds = new Map()
        const listingSkuToId = new Map()
        const listingIds = new Map()

        currentProducts.forEach(function (row) {
          const sku = String(row['Master SKU'] || '').trim()
          const key = keyOf(sku)
          const id = keyOf(row['Internal Product ID'])
          if (key) productSkuToMaster.set(key, sku)
          if (id) productIds.set(id, key)
        })
        currentVariants.forEach(function (row) {
          const sku = String(row['Variant SKU'] || '').trim()
          const key = keyOf(sku)
          const master = String(row['Master SKU'] || '').trim()
          const id = keyOf(row['Variant ID'])
          if (key) variantSkuToMaster.set(key, master)
          if (id) variantIds.set(id, key)
        })
        currentListings.forEach(function (row) {
          const id = keyOf(row['Listing ID'])
          const platformKey = keyOf(row.Platform) + ':' + keyOf(row['Platform SKU'])
          if (id) listingIds.set(id, platformKey)
          if (row.Platform && row['Platform SKU']) listingSkuToId.set(platformKey, id)
        })

        const addedProducts = []
        const addedVariants = []
        const addedListings = []
        const updatedProducts = []
        const updatedVariants = []
        const updatedListings = []
        const skuMrpUpdates = new Map()
        const skipped = { products: 0, variants: 0, listings: 0 }
        const seenProductSkus = new Set()
        const seenProductIds = new Set()
        inputProducts.forEach(function (row, index) {
          const label = 'Products row ' + (index + 1)
          const productId = requiredImportText(row, 'Internal Product ID', label + ' Internal Product ID', 160)
          const masterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const title = requiredImportText(row, 'Product Title', label + ' Product Title', 300)
          const skuKey = keyOf(masterSku)
          const idKey = keyOf(productId)
          if (seenProductSkus.has(skuKey)) throw apiError_(409, 'Duplicate product Master SKU in import: ' + masterSku)
          seenProductSkus.add(skuKey)
          if (seenProductIds.has(idKey) || (productIds.has(idKey) && productIds.get(idKey) !== skuKey)) {
            throw apiError_(409, 'Product ID conflicts with an existing product: ' + productId)
          }
          seenProductIds.add(idKey)
          const record = {
            'Internal Product ID': productId,
            'Master SKU': masterSku,
            'Product Title': title,
            Category: importText(row, 'Category', 160),
            MRP: importAmount(row.MRP !== undefined ? row.MRP : (row['MRP (INR)'] !== undefined ? row['MRP (INR)'] : row['List Price']), label + ' MRP'),
            Status: importText(row, 'Status', 40) || 'Active',
            'Created Date': importText(row, 'Created Date', 100),
            'Updated Date': importText(row, 'Updated Date', 100),
            ASIN: importText(row, 'ASIN', 100),
            'Shopify Product ID': importText(row, 'Shopify Product ID', 100),
          }
          if (productSkuToMaster.has(skuKey)) {
            updatedProducts.push(record)
            skipped.products += 1
            if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
            return
          }
          addedProducts.push(record)
          productSkuToMaster.set(skuKey, masterSku)
          productIds.set(idKey, skuKey)
          if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
        })

        const seenVariantSkus = new Set()
        const seenVariantIds = new Set()
        inputVariants.forEach(function (row, index) {
          const label = 'SKU variants row ' + (index + 1)
          const variantId = requiredImportText(row, 'Variant ID', label + ' Variant ID', 160)
          const masterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const variantSku = requiredImportText(row, 'Variant SKU', label + ' Variant SKU', 100)
          const skuKey = keyOf(variantSku)
          const idKey = keyOf(variantId)
          const masterKey = keyOf(masterSku)
          if (seenVariantSkus.has(skuKey)) throw apiError_(409, 'Duplicate variant SKU in import: ' + variantSku)
          seenVariantSkus.add(skuKey)
          if (productSkuToMaster.has(skuKey)) throw apiError_(409, 'Variant SKU conflicts with an existing master SKU: ' + variantSku)
          if (!productSkuToMaster.has(masterKey)) throw apiError_(422, 'Variant ' + variantSku + ' references a missing master product.')
          if (keyOf(productSkuToMaster.get(masterKey)) !== masterKey) throw apiError_(422, 'Variant ' + variantSku + ' references an inconsistent master SKU.')
          if (seenVariantIds.has(idKey) || (variantIds.has(idKey) && variantIds.get(idKey) !== skuKey)) {
            throw apiError_(409, 'Variant ID conflicts with an existing SKU: ' + variantId)
          }
          seenVariantIds.add(idKey)
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
            Status: importText(row, 'Status', 40) || 'Active',
            'Variant Title': importText(row, 'Variant Title', 200),
            'Shopify Product ID': importText(row, 'Shopify Product ID', 100),
            'Shopify Variant ID': importText(row, 'Shopify Variant ID', 100),
            'Shopify Inventory': importAmount(row['Shopify Inventory'], label + ' Shopify Inventory'),
          }
          if (variantSkuToMaster.has(skuKey)) {
            if (keyOf(variantSkuToMaster.get(skuKey)) !== masterKey) throw apiError_(409, 'Existing variant SKU is linked to a different master: ' + variantSku)
            updatedVariants.push(record)
            skipped.variants += 1
            if (record.MRP !== '') skuMrpUpdates.set(skuKey, record.MRP)
            return
          }
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
          const productSku = requiredImportText(row, 'Product SKU', label + ' Product SKU', 100)
          const masterSku = requiredImportText(row, 'Master SKU', label + ' Master SKU', 100)
          const productName = requiredImportText(row, 'Product Name', label + ' Product Name', 300)
          if (allowedPlatforms.indexOf(platform) < 0) throw apiError_(400, 'Unsupported marketplace: ' + platform)
          const listingKey = keyOf(platform) + ':' + keyOf(platformSku)
          const idKey = keyOf(listingId)
          const productKey = keyOf(productSku)
          const linkedMaster = variantSkuToMaster.get(productKey) || productSkuToMaster.get(productKey)
          if (!linkedMaster) throw apiError_(422, 'Listing SKU ' + platformSku + ' references a missing product SKU.')
          if (keyOf(linkedMaster) !== keyOf(masterSku)) throw apiError_(422, 'Listing SKU ' + platformSku + ' has an inconsistent Master SKU.')
          if (seenListingSkus.has(listingKey) || seenListingIds.has(idKey)) {
            throw apiError_(409, 'Duplicate marketplace listing in import: ' + platformSku)
          }
          seenListingSkus.add(listingKey)
          seenListingIds.add(idKey)
          const existingIdPlatform = listingIds.get(idKey)
          const existingSkuId = listingSkuToId.get(listingKey)
          if (existingIdPlatform !== undefined && existingIdPlatform !== listingKey) {
            throw apiError_(409, 'Listing ID conflicts with an existing marketplace SKU: ' + listingId)
          }
          const status = importText(row, 'Status', 40) || 'Active'
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
            'Created By': String(payload.createdBy || ''),
            'Created At': new Date().toISOString(),
          }
          if (existingSkuId !== undefined || existingIdPlatform === listingKey) {
            updatedListings.push(record)
            skipped.listings += 1
            if (record.MRP !== '') {
              skuMrpUpdates.set(productKey, record.MRP)
              if (linkedMaster) skuMrpUpdates.set(keyOf(linkedMaster), record.MRP)
            }
            return
          }
          addedListings.push(record)
          listingSkuToId.set(listingKey, idKey)
          listingIds.set(idKey, listingKey)
          if (record.MRP !== '') {
            skuMrpUpdates.set(productKey, record.MRP)
            if (linkedMaster) skuMrpUpdates.set(keyOf(linkedMaster), record.MRP)
          }
        })

        const totals = {
          added: { products: addedProducts.length, variants: addedVariants.length, listings: addedListings.length },
          skipped: skipped,
          backupName: '',
        }
        if (!addedProducts.length && !addedVariants.length && !addedListings.length
          && !updatedProducts.length && !updatedVariants.length && !updatedListings.length) return totals

        const backupState = { created: false, backupName: '' }
        createBackupOnce_(spreadsheet, backupState)
        const productTarget = ensureStockSheet_(spreadsheet, 'Products', productHeaders, backupState)
        const variantTarget = ensureStockSheet_(spreadsheet, 'SKU_Variants', variantHeaders, backupState)
        const listingTarget = ensureStockSheet_(spreadsheet, 'Marketplace_Listings', listingHeaders, backupState)
        currentProducts.forEach(function (row) {
          const sku = String(row['Master SKU'] || '').trim()
          if (sku && skuMrpUpdates.has(keyOf(sku))) {
            updatedProducts.push({ 'Master SKU': sku, MRP: skuMrpUpdates.get(keyOf(sku)) })
          }
        })
        currentVariants.forEach(function (row) {
          const sku = String(row['Variant SKU'] || '').trim()
          if (sku && skuMrpUpdates.has(keyOf(sku))) {
            updatedVariants.push({ 'Variant SKU': sku, MRP: skuMrpUpdates.get(keyOf(sku)) })
          }
        })
        appendImportRows(productTarget, addedProducts)
        appendImportRows(variantTarget, addedVariants)
        appendImportRows(listingTarget, addedListings)
        updateImportRows(productTarget, updatedProducts, 'Master SKU')
        updateImportRows(variantTarget, updatedVariants, 'Variant SKU')
        updateImportRows(listingTarget, updatedListings, 'Listing ID')
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
      if (missing.length) throw apiError_(422, 'The Users sheet is missing required columns: ' + missing.join(', ') + '.')
      return sheet
    }

    function userValues_(user) {
      return ERP_USER_COLUMNS.map(function (header) {
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
