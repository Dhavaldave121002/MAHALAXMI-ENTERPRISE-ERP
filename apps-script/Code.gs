const ERP_USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At']
const ERP_DATA_SHEETS = ['Users', 'Products', 'SKU_Variants', 'Machines', 'Finished_Goods', 'Production']
const ERP_WRITE_SHEETS = ['Products', 'SKU_Variants', 'Machines', 'Production']

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
