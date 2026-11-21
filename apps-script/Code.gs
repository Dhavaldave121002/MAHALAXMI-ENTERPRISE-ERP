    const ERP_USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At']
    const ERP_DATA_SHEETS = ['Users', 'Products', 'SKU_Variants', 'Machines', 'Raw_Materials', 'Finished_Goods', 'Stock_Movement', 'Production']
    const ERP_WRITE_SHEETS = ['Products', 'SKU_Variants', 'Machines', 'Production']
    const ERP_RAW_MATERIAL_HEADERS = ['Material ID', 'Material Name', 'Material SKU', 'Unit', 'Opening Stock', 'Purchase Inward', 'Supplier', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Closing Stock', 'Reorder Level', 'Average Unit Cost', 'Stock Value', 'Updated Date', 'Status']
    const ERP_FINISHED_GOODS_HEADERS = ['Product SKU', 'Product Name', 'Opening Stock', 'Production Received', 'Quality Approved', 'Rejected', 'Reserved Stock', 'Available Stock', 'Dispatched Stock', 'Returned Stock', 'Damaged Stock', 'Last Updated', 'Adjustment In', 'Adjustment Out', 'Status']
    const ERP_STOCK_MOVEMENT_HEADERS = ['Movement ID', 'Date/Time', 'SKU', 'Movement Type', 'Quantity', 'Reference ID', 'Machine ID', 'Reason', 'Opening Stock', 'Closing Stock', 'Created By', 'Item Type']

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
        const data = dispatch_(spreadsheet, request.action, request.payload || {})
        return jsonOutput_({ ok: true, data: data })
      } catch (error) {
        return jsonOutput_({
          ok: false,
          status: Number(error && error.statusCode) || 500,
          error: String(error && error.message || 'Apps Script request failed.'),
        })
      }
    }

    function dispatch_(spreadsheet, action, payload) {
      switch (action) {
        case 'getWorkbookData':
          return getWorkbookData_(spreadsheet)
        case 'getUsers':
          return { users: readSheetRecords_(spreadsheet, 'Users') }
        case 'createInitialAdmin':
          return createInitialAdmin_(spreadsheet, payload.user)
        case 'appendUser':
          return appendUser_(spreadsheet, payload.user)
        case 'setUserActive':
          return setUserActive_(spreadsheet, payload.id, payload.active)
        case 'appendRecord':
          return appendRecord_(spreadsheet, payload)
        case 'addRawMaterial':
          return addRawMaterial_(spreadsheet, payload)
        case 'applyStockMovement':
          return applyStockMovement_(spreadsheet, payload)
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
        sheets[name] = readSheetRecords_(spreadsheet, name)
      })
      return {
        name: spreadsheet.getName(),
        sheetCount: spreadsheet.getSheets().length,
        sheetNames: spreadsheet.getSheets().map(function (sheet) { return sheet.getName() }),
        sheets: sheets,
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
        if (opening > 0) {
          appendStockMovement_(spreadsheet, stockMovementRecord_({
            sku: sku, type: 'Opening Stock', quantity: opening, opening: 0, closing: opening,
            itemType: 'Raw Material', reason: 'Initial stock balance', createdBy: payload.createdBy,
          }), backupState)
        }
        SpreadsheetApp.flush()
        return { material: material }
      })
    }

    function applyStockMovement_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const kind = String(payload.kind || '')
        const sku = String(payload.sku || '').trim()
        const type = String(payload.type || '')
        const reason = String(payload.reason || '').trim()
        const referenceId = String(payload.referenceId || '').trim()
        const quantity = stockNumber_(payload.quantity, 'Quantity')
        if (!sku || quantity <= 0) throw apiError_(400, 'Choose an item and enter a quantity greater than zero.')
        if (reason.length > 300 || referenceId.length > 100) throw apiError_(400, 'Reason or reference is too long.')

        const isRaw = kind === 'raw'
        if (!isRaw && kind !== 'finished') throw apiError_(400, 'Choose raw material or finished goods.')
        const sheetName = isRaw ? 'Raw_Materials' : 'Finished_Goods'
        const itemType = isRaw ? 'Raw Material' : 'Finished Goods'
        const headers = isRaw ? ERP_RAW_MATERIAL_HEADERS : ERP_FINISHED_GOODS_HEADERS
        const key = isRaw ? 'Material SKU' : 'Product SKU'
        const backupState = { created: false }
        const stockSheet = ensureStockSheet_(spreadsheet, sheetName, headers, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const rowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, key, sku)
        let item = readStockRow_(stockSheet.sheet, stockSheet.headers, rowNumber)
        if (!item && !isRaw && ['Opening Stock', 'Adjustment In'].indexOf(type) >= 0 && String(payload.productName || '').trim()) {
          item = {
            'Product SKU': sku, 'Product Name': String(payload.productName).trim(),
            'Opening Stock': 0, 'Production Received': 0, 'Quality Approved': 0, Rejected: 0,
            'Reserved Stock': 0, 'Available Stock': 0, 'Dispatched Stock': 0, 'Returned Stock': 0,
            'Damaged Stock': 0, 'Adjustment In': 0, 'Adjustment Out': 0, Status: 'Active',
          }
        }
        if (!item) throw apiError_(404, 'Stock item was not found. Add the material or product first.')
        if (String(item.Status || 'Active').toLowerCase() === 'archived') throw apiError_(409, 'This item is archived and cannot receive stock movements.')

        if (referenceId && movementSheet.sheet.getLastRow() >= 2) {
          const movementRows = readSheetRecords_(spreadsheet, 'Stock_Movement')
          if (movementRows.some(function (row) {
            return String(row['Item Type'] || '') === itemType
              && String(row.SKU || '').trim().toLowerCase() === sku.toLowerCase()
              && String(row['Reference ID'] || '').trim().toLowerCase() === referenceId.toLowerCase()
          })) throw apiError_(409, 'That reference was already used for this stock item.')
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
          closing += mapping[1] * quantity
          if (closing < 0) throw apiError_(409, 'This movement would make available stock negative.')
          const updatedValue = stockNumber_(item[mapping[0]], mapping[0]) + mapping[2] * quantity
          if (updatedValue < 0) throw apiError_(409, 'You cannot release more units than are currently reserved.')
          item[mapping[0]] = updatedValue
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
        })
        appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        SpreadsheetApp.flush()
        return { item: item, movement: movement }
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
        assertRecordUnique_(spreadsheet, 'Production', record)
        const backupState = { created: false }
        if (productionHeaders.indexOf('Variant SKU') < 0) {
          createBackupOnce_(spreadsheet, backupState)
          productionSheet.getRange(1, productionHeaders.length + 1).setValue('Variant SKU')
          productionHeaders.push('Variant SKU')
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
        if (approved > 0) {
          const movement = stockMovementRecord_({
            sku: sku, type: 'Production Received', quantity: approved,
            referenceId: String(record['Production ID'] || ''),
            reason: 'Production complete; rejected quantity: ' + rejected,
            opening: opening, closing: item['Available Stock'],
            createdBy: String(record['Created By'] || ''), itemType: 'Finished Goods',
          })
          appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        }
        SpreadsheetApp.flush()
        return { finishedGood: item }
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
      if (parents.hasNext()) file.makeCopy(backupName, parents.next())
      else file.makeCopy(backupName)
    }

    function createBackupOnce_(spreadsheet, state) {
      if (state && state.created) return
      createBackup_(spreadsheet)
      if (state) state.created = true
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
