    const ERP_USER_COLUMNS = ['User ID', 'Name', 'Username', 'Role', 'Active', 'Password Salt', 'Password Hash', 'Created At', 'Assigned Platforms', 'Manager ID']
    const ERP_DATA_SHEETS = ['Users', 'Products', 'SKU_Variants', 'Marketplace_Listings', 'Machines', 'Raw_Materials', 'Finished_Goods', 'Stock_Movement', 'Production', 'Production_Targets', 'Sales_Leads', 'Sales_Activities', 'Sales_Orders', 'Sales_Targets', 'Graphic_Design_Tasks', 'Suppliers', 'Accounts_Expenses']
    const ERP_WRITE_SHEETS = ['Products', 'SKU_Variants', 'Machines', 'Production']
    const ERP_SESSION_BOUND_ACTIONS = ['appendUser', 'setUserActive', 'setUserManager', 'setUserPassword', 'appendRecord', 'addMarketplaceListing', 'recordProduction', 'reviewProductionQuality', 'submitGraphicDesignTask', 'updateGraphicDesignProgress', 'reviewGraphicDesignTask', 'submitGraphicDesignReport', 'listGraphicDesignReports', 'addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook', 'resetErpData', 'updateMarketplaceSku', 'updateMarketplaceListing', 'uploadEcommerceLabel', 'listEcommerceLabels', 'downloadEcommerceLabel', 'startCameraClipUpload', 'uploadCameraClipChunk', 'listCameraClips', 'readCameraClipRange', 'cleanupExpiredCameraClips', 'listChatData', 'listChatMessages', 'listChatTyping', 'setChatTyping', 'sendChatMessage', 'readChatAttachment', 'listAssistantState', 'saveAssistantTurn', 'clearAssistantMemory', 'submitEcommerceReport', 'listEcommerceReports', 'listEcommerceTasks', 'createEcommerceTask', 'updateEcommerceTask', 'reviewEcommerceTask', 'submitSalesReport', 'listSalesReports', 'getEcommerceTargets', 'setEcommerceTarget', 'setProductionTarget', 'importSalesLeads', 'addSalesLead', 'assignSalesLead', 'recordSalesActivity', 'createSalesOrder', 'cancelSalesOrder', 'setSalesTarget', 'addSupplier', 'setSupplierActive', 'recordAccountExpense']
    const ERP_AUDIT_ACTIONS = ['appendUser', 'setUserActive', 'setUserManager', 'setUserPassword', 'appendRecord', 'addMarketplaceListing', 'recordProduction', 'reviewProductionQuality', 'submitGraphicDesignTask', 'updateGraphicDesignProgress', 'reviewGraphicDesignTask', 'submitGraphicDesignReport', 'addRawMaterial', 'applyStockMovement', 'initializeZeroFinishedStock', 'archiveStockItem', 'deleteUnusedStockItem', 'importMarketplaceWorkbook', 'resetErpData', 'updateMarketplaceSku', 'updateMarketplaceListing', 'uploadEcommerceLabel', 'submitEcommerceReport', 'createEcommerceTask', 'updateEcommerceTask', 'reviewEcommerceTask', 'submitSalesReport', 'setEcommerceTarget', 'setProductionTarget', 'importSalesLeads', 'addSalesLead', 'assignSalesLead', 'recordSalesActivity', 'createSalesOrder', 'cancelSalesOrder', 'setSalesTarget', 'addSupplier', 'setSupplierActive', 'recordAccountExpense']
    ERP_SESSION_BOUND_ACTIONS.push('importMarketplaceReconciliation')
    ERP_SESSION_BOUND_ACTIONS.push('listMarketplaceReconciliation')
    ERP_AUDIT_ACTIONS.push('importMarketplaceReconciliation')
    ERP_DATA_SHEETS.push('IndiaMART_Listings')
    ERP_SESSION_BOUND_ACTIONS.push('saveIndiaMartListings')
    ERP_AUDIT_ACTIONS.push('saveIndiaMartListings')
    ERP_SESSION_BOUND_ACTIONS.push('setMachineStatus')
    ERP_AUDIT_ACTIONS.push('setMachineStatus')
    ERP_SESSION_BOUND_ACTIONS.push('listDailyTasks')
    ERP_SESSION_BOUND_ACTIONS.push('downloadDailyTaskAttachment')
    ERP_SESSION_BOUND_ACTIONS.push('createDailyTask')
    ERP_SESSION_BOUND_ACTIONS.push('updateDailyTask')
    ERP_SESSION_BOUND_ACTIONS.push('reviewDailyTask')
    ERP_AUDIT_ACTIONS.push('createDailyTask')
    ERP_AUDIT_ACTIONS.push('updateDailyTask')
    ERP_AUDIT_ACTIONS.push('reviewDailyTask')
    const ERP_AUDIT_SPREADSHEET_PROPERTY = 'ERP_PRIVATE_AUDIT_SPREADSHEET_ID'
    const ERP_AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
    const ERP_AUDIT_HEADERS = ['Event ID', 'Timestamp', 'User ID', 'User Name', 'Role', 'Action', 'Target', 'Outcome']
    const ERP_ECOMMERCE_PLATFORMS = ['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA']
    const ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY = 'ERP_ECOMMERCE_LABEL_FOLDER_ID'
    const ERP_ECOMMERCE_LABEL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
    const ERP_ECOMMERCE_LABEL_CLEANUP_HANDLER = 'cleanupExpiredEcommerceLabels_'
    const ERP_AUDIT_CLEANUP_HANDLER = 'cleanupExpiredAuditEventsScheduled_'
    const ERP_CHAT_CLEANUP_HANDLER = 'cleanupExpiredChatMessagesScheduled_'
    const ERP_CHAT_SPREADSHEET_PROPERTY = 'ERP_PRIVATE_CHAT_SPREADSHEET_ID'
    const ERP_CHAT_ATTACHMENT_FOLDER_PROPERTY = 'ERP_PRIVATE_CHAT_ATTACHMENT_FOLDER_ID'
    const ERP_CHAT_RETENTION_MS = 48 * 60 * 60 * 1000
    const ERP_CHAT_MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024
    const ERP_CHAT_HEADERS = ['Message ID', 'Conversation ID', 'Sender ID', 'Sender Name', 'Sender Role', 'Recipient ID', 'Recipient Name', 'Recipient Role', 'Sent At', 'Message', 'Attachment ID', 'Attachment Name', 'Attachment MIME Type', 'Attachment Size']
    const ERP_ASSISTANT_SPREADSHEET_PROPERTY = 'ERP_PRIVATE_ASSISTANT_SPREADSHEET_ID'
    const ERP_ASSISTANT_RETENTION_MS = 24 * 60 * 60 * 1000
    const ERP_ASSISTANT_MESSAGE_HEADERS = ['Message ID', 'User ID', 'Role', 'Content', 'Created At']
    const ERP_ASSISTANT_MEMORY_HEADERS = ['User ID', 'Memory', 'Updated At']
    const ERP_ASSISTANT_MEMORY_MAX_LENGTH = 2000
    const ERP_CAMERA_RECORDING_FOLDER_PROPERTY = 'ERP_CAMERA_RECORDING_FOLDER_ID'
    const ERP_CAMERA_RECORDING_RETENTION_MS = 24 * 60 * 60 * 1000
    const ERP_WORKBOOK_BACKUP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
    const ERP_WORKBOOK_BACKUP_CLEANUP_HANDLER = 'cleanupExpiredWorkbookBackupsScheduled_'
    const ERP_CAMERA_RECORDING_KIND = 'mahalaxmi-erp-camera-recording'
    const ERP_SCREEN_RECORDING_KIND = 'mahalaxmi-erp-screen-recording'
    const ERP_CAMERA_UPLOAD_CHUNK_MAX_BYTES = 2 * 1024 * 1024
    const ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY = 'ERP_ECOMMERCE_REPORT_FOLDER_ID'
    const ERP_GRAPHIC_DESIGN_REPORT_FOLDER_PROPERTY = 'ERP_GRAPHIC_DESIGN_REPORT_FOLDER_ID'
    const ERP_DAILY_TASK_ATTACHMENT_FOLDER_PROPERTY = 'ERP_DAILY_TASK_ATTACHMENT_FOLDER_ID'
    const ERP_DAILY_TASK_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024
    const ERP_GRAPHIC_DESIGN_REPORT_KIND = 'mahalaxmi-erp-graphic-design-daily-report'
    const ERP_SALES_REPORT_FOLDER_PROPERTY = 'ERP_SALES_REPORT_FOLDER_ID'
    const ERP_CAMERA_USER_FOLDER_PREFIX = 'ERP_CAMERA_RECORDING_USER_FOLDER_'
    const ERP_RESETTABLE_STORAGE_FOLDERS = [
      { property: ERP_CHAT_ATTACHMENT_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private Chat Attachments', category: 'chat' },
      { property: ERP_CAMERA_RECORDING_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private Camera Recordings', category: 'camera' },
      { property: ERP_GRAPHIC_DESIGN_REPORT_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private Graphic Design Daily Reports', category: 'graphicDesign' },
      { property: ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private E-commerce Labels', category: 'ecommerce' },
      { property: ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private E-commerce Daily Reports', category: 'ecommerce' },
      { property: ERP_DAILY_TASK_ATTACHMENT_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private Daily Task Attachments', category: 'dailyTasks' },
      { property: ERP_SALES_REPORT_FOLDER_PROPERTY, name: 'Mahalaxmi ERP Private Sales Daily Reports', category: 'sales' },
    ]
    const ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX = 'ERP_ECOMMERCE_EXEC_DAILY_TARGET_'
    const ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX = 'ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_'
    const ERP_ECOMMERCE_MANAGER_DAILY_TARGET_PREFIX = 'ERP_ECOMMERCE_MANAGER_DAILY_TARGET_'
    const ERP_ECOMMERCE_MANAGER_MONTHLY_TARGET_PREFIX = 'ERP_ECOMMERCE_MANAGER_MONTHLY_TARGET_'
    const ERP_ECOMMERCE_TASK_HEADERS = ['Task ID', 'Manager ID', 'Manager Name', 'Executive ID', 'Executive Name', 'Task Date', 'Title', 'Description', 'Status', 'Created At', 'Updated At', 'Reviewed By ID', 'Reviewed By', 'Reviewed At', 'Review Note']
    const ERP_DAILY_TASK_HEADERS = ['Task ID', 'Task Date', 'Title', 'Description', 'Attachment ID', 'Attachment Name', 'Attachment MIME Type', 'Assigned To ID', 'Assigned To Name', 'Assigned To Role', 'Created By ID', 'Created By', 'Created At', 'Updated At', 'Status', 'Completed Work', 'Pending Work', 'Issues', 'Reviewed By ID', 'Reviewed By', 'Reviewed At', 'Review Note']
    const ERP_WORKBOOK_CACHE_SECONDS = 30
    const ERP_WORKBOOK_CACHE_MAX_BYTES = 90000
    const ERP_RAW_MATERIAL_HEADERS = ['Material ID', 'Material Name', 'Material SKU', 'Unit', 'Opening Stock', 'Purchase Inward', 'Supplier', 'Supplier ID', 'Material Issued', 'Machine Consumption', 'Stitching Consumption', 'Wastage', 'Closing Stock', 'Reorder Level', 'Average Unit Cost', 'Stock Value', 'Updated Date', 'Status']
    const ERP_FINISHED_GOODS_HEADERS = ['Product SKU', 'Product Name', 'Opening Stock', 'Production Received', 'Quality Approved', 'Rejected', 'Reserved Stock', 'Available Stock', 'Dispatched Stock', 'Returned Stock', 'Damaged Stock', 'Last Updated', 'Adjustment In', 'Adjustment Out', 'Status']
    const ERP_STOCK_MOVEMENT_HEADERS = ['Movement ID', 'Date/Time', 'SKU', 'Movement Type', 'Quantity', 'Reference ID', 'Machine ID', 'Reason', 'Opening Stock', 'Closing Stock', 'Created By', 'Item Type', 'Sales Channel', 'Delivery Partner', 'Supplier ID', 'Supplier', 'Unit Cost', 'Total Cost', 'Unit Price', 'Total Amount']
    const ERP_SUPPLIER_HEADERS = ['Supplier ID', 'Supplier Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Notes', 'Status', 'Created At', 'Created By', 'Updated At', 'Updated By']
    const ERP_ACCOUNT_EXPENSE_HEADERS = ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Reference ID', 'Created At', 'Created By ID', 'Created By']
    const ERP_SALES_LEAD_HEADERS = ['Lead ID', 'Name', 'Company', 'Phone', 'Location', 'Email', 'Product Interest', 'Notes', 'Reference URL', 'Assigned User ID', 'Assigned User Name', 'Status', 'Next Follow-Up', 'Created At', 'Created By', 'Updated At', 'Enquiry Date']
    const ERP_SALES_ACTIVITY_HEADERS = ['Activity ID', 'Lead ID', 'Activity Type', 'Outcome', 'Notes', 'Next Follow-Up', 'Created At', 'Created By', 'Created By Name']
    const ERP_SALES_ORDER_HEADERS = ['Order ID', 'Created At', 'Sales User ID', 'Sales User Name', 'Lead ID', 'Customer Name', 'Product SKU', 'Product Name', 'Quantity', 'Unit Price', 'Amount', 'Fulfilled Quantity', 'Cancelled Quantity', 'Status', 'Notes', 'Sales Channel', 'IndiaMART Listing ID', 'IndiaMART SKU', 'Unit Cost']
    const ERP_INDIAMART_LISTING_HEADERS = ['Listing ID', 'Product SKU', 'IndiaMART SKU', 'Product Name', 'Listed Price', 'Unit Cost', 'Source URL', 'Image URL', 'Status', 'Updated At', 'Updated By', 'Listing Inventory']
    const ERP_SALES_TARGET_HEADERS = ['Target ID', 'Sales User ID', 'Sales User Name', 'Period', 'Period Key', 'Target Amount', 'Updated At', 'Updated By']
    const ERP_GRAPHIC_DESIGN_HEADERS = ['Task ID', 'Planned Date', 'Month', 'Product SKU', 'Product Name', 'Platforms', 'Content Type', 'Brief', 'Caption', 'Script', 'Shoot Status', 'Edit Status', 'Review Status', 'Review Note', 'Created By ID', 'Created By', 'Created At', 'Reviewed By', 'Reviewed At']
    const ERP_STORAGE_ROOT_PROPERTY = 'ERP_STORAGE_ROOT_FOLDER_ID'
    const ERP_STORAGE_CATEGORIES = {
      spreadsheet: '01 Main ERP Spreadsheet',
      chat: '02 Chat',
      audit: '03 Audit Logs',
      camera: '04 Screen Recordings',
      graphicDesign: '05 Graphic Design',
      ecommerce: '06 E-commerce',
      sales: '07 Sales',
      dailyTasks: '08 Daily Tasks',
      assistant: '09 AI Assistant',
    }

    function onOpen(event) {
      if (!event || !event.source) {
        Logger.log('Open the bound spreadsheet to create the Mahalaxmi ERP menu.')
        return
      }
      SpreadsheetApp.getUi()
        .createMenu('Mahalaxmi ERP')
        .addItem('Configure API access', 'configureMahalaxmiErp')
        .addItem('Organize ERP Drive', 'organizeMahalaxmiErpDrive')
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

    function findUniqueDriveFolder_(name) {
      const folders = DriveApp.getFoldersByName(name)
      if (!folders.hasNext()) return null
      const folder = folders.next()
      if (folders.hasNext()) throw apiError_(409, 'Multiple Drive folders named "' + name + '" were found. Organize or rename duplicates, then retry.')
      return folder
    }

    function findUniqueDriveFile_(name) {
      const files = DriveApp.getFilesByName(name)
      if (!files.hasNext()) return null
      const file = files.next()
      if (files.hasNext()) throw apiError_(409, 'Multiple Drive files named "' + name + '" were found. Organize or rename duplicates, then retry.')
      return file
    }

    function getErpStorageRootFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_STORAGE_ROOT_PROPERTY)
      let folder = folderId ? DriveApp.getFolderById(folderId) : findUniqueDriveFolder_('Mahalaxmi ERP')
      if (!folder && !createIfMissing) return null
      if (!folder) {
        folder = DriveApp.createFolder('Mahalaxmi ERP')
        folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      } else if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
        throw apiError_(403, 'The Mahalaxmi ERP Drive folder must be private. Review its sharing settings before continuing.')
      }
      properties.setProperty(ERP_STORAGE_ROOT_PROPERTY, folder.getId())
      return folder
    }

    function getErpStorageCategoryFolder_(category, createIfMissing) {
      if (!Object.prototype.hasOwnProperty.call(ERP_STORAGE_CATEGORIES, category)) {
        throw new Error('Unknown ERP Drive storage category.')
      }
      const root = getErpStorageRootFolder_(createIfMissing)
      if (!root) return null
      const name = ERP_STORAGE_CATEGORIES[category]
      const folders = root.getFoldersByName(name)
      if (folders.hasNext()) {
        const folder = folders.next()
        if (folders.hasNext()) throw apiError_(409, 'Multiple ERP storage folders named "' + name + '" were found.')
        if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          throw apiError_(403, 'The ERP storage folder "' + name + '" must be private.')
        }
        return folder
      }
      if (!createIfMissing) return null
      const folder = root.createFolder(name)
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      return folder
    }

    function configuredDriveFolder_(propertyName, folderName) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(propertyName)
      const folder = folderId ? DriveApp.getFolderById(folderId) : findUniqueDriveFolder_(folderName)
      if (folder) properties.setProperty(propertyName, folder.getId())
      return folder
    }

    function configuredDriveFile_(propertyName, fileName) {
      const properties = PropertiesService.getScriptProperties()
      const fileId = properties.getProperty(propertyName)
      const file = fileId ? DriveApp.getFileById(fileId) : findUniqueDriveFile_(fileName)
      if (file) properties.setProperty(propertyName, file.getId())
      return file
    }

    function organizeMahalaxmiErpDrive() {
      const properties = PropertiesService.getScriptProperties()
      const spreadsheetId = properties.getProperty('ERP_SPREADSHEET_ID')
      if (!spreadsheetId) throw new Error('Configure ERP API access from the master spreadsheet before organizing Drive.')

      const root = getErpStorageRootFolder_(true)
      const destinations = {}
      Object.keys(ERP_STORAGE_CATEGORIES).forEach(function (category) {
        destinations[category] = getErpStorageCategoryFolder_(category, true)
      })
      const movePlan = []
      const plannedFileIds = {}
      const plannedFolderIds = {}
      const addFile = function (file, category) {
        if (!file || plannedFileIds[file.getId()]) return
        plannedFileIds[file.getId()] = true
        movePlan.push({ type: 'file', item: file, destination: destinations[category] })
      }
      const addFolder = function (folder, category) {
        if (!folder || plannedFolderIds[folder.getId()]) return
        plannedFolderIds[folder.getId()] = true
        movePlan.push({ type: 'folder', item: folder, destination: destinations[category] })
      }

      const masterFile = DriveApp.getFileById(spreadsheetId)
      addFile(masterFile, 'spreadsheet')
      const backupPrefix = masterFile.getName() + '-Backup-'
      const masterParents = masterFile.getParents()
      while (masterParents.hasNext()) {
        const siblings = masterParents.next().getFiles()
        while (siblings.hasNext()) {
          const sibling = siblings.next()
          if (sibling.getName().indexOf(backupPrefix) === 0) addFile(sibling, 'spreadsheet')
        }
      }

      addFile(configuredDriveFile_(ERP_CHAT_SPREADSHEET_PROPERTY, 'Mahalaxmi ERP Private Chats'), 'chat')
      addFile(configuredDriveFile_(ERP_AUDIT_SPREADSHEET_PROPERTY, 'Mahalaxmi ERP Private Audit Log'), 'audit')
      addFolder(configuredDriveFolder_(ERP_CHAT_ATTACHMENT_FOLDER_PROPERTY, 'Mahalaxmi ERP Private Chat Attachments'), 'chat')
      addFolder(configuredDriveFolder_(ERP_CAMERA_RECORDING_FOLDER_PROPERTY, 'Mahalaxmi ERP Private Camera Recordings'), 'camera')
      addFolder(configuredDriveFolder_(ERP_GRAPHIC_DESIGN_REPORT_FOLDER_PROPERTY, 'Mahalaxmi ERP Private Graphic Design Daily Reports'), 'graphicDesign')
      addFolder(configuredDriveFolder_(ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY, 'Mahalaxmi ERP Private E-commerce Labels'), 'ecommerce')
      addFolder(configuredDriveFolder_(ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY, 'Mahalaxmi ERP Private E-commerce Daily Reports'), 'ecommerce')
      addFolder(configuredDriveFolder_(ERP_DAILY_TASK_ATTACHMENT_FOLDER_PROPERTY, 'Mahalaxmi ERP Private Daily Task Attachments'), 'dailyTasks')
      addFolder(configuredDriveFolder_(ERP_SALES_REPORT_FOLDER_PROPERTY, 'Mahalaxmi ERP Private Sales Daily Reports'), 'sales')

      let moved = 0
      movePlan.forEach(function (entry) {
        const parents = entry.item.getParents()
        let alreadyInDestination = false
        while (parents.hasNext()) {
          if (parents.next().getId() === entry.destination.getId()) alreadyInDestination = true
        }
        if (alreadyInDestination) return
        if (entry.type === 'file') entry.item.moveTo(entry.destination)
        else {
          if (entry.item.getId() === entry.destination.getId()) {
            throw apiError_(409, 'An ERP storage folder cannot be moved inside itself.')
          }
          entry.item.moveTo(entry.destination)
        }
        moved += 1
      })
      return { folderName: root.getName(), folderId: root.getId(), moved: moved, categories: Object.keys(ERP_STORAGE_CATEGORIES).length }
    }

    function doGet() {
      const properties = PropertiesService.getScriptProperties()
      return jsonOutput_({
        service: 'Mahalaxmi ERP Apps Script',
        configured: Boolean(properties.getProperty('ERP_SPREADSHEET_ID') && properties.getProperty('ERP_API_SECRET')),
      })
    }

    function doPost(event) {
      let auditEntry = null
      let action = 'unknown'
      try {
        const request = JSON.parse(event && event.postData && event.postData.contents || '{}')
        action = String(request && request.action || 'unknown')
        const properties = PropertiesService.getScriptProperties()
        const expectedSecret = properties.getProperty('ERP_API_SECRET')
        const spreadsheetId = properties.getProperty('ERP_SPREADSHEET_ID')
        if (!expectedSecret || !spreadsheetId) throw apiError_(503, 'Run Configure API access from the master Google Sheet first.')
        if (typeof request.secret !== 'string' || request.secret !== expectedSecret) throw apiError_(401, 'Invalid API secret.')

        const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
        const payload = request.payload || {}
        let sessionUser = null
        if (ERP_SESSION_BOUND_ACTIONS.indexOf(request.action) >= 0) {
          sessionUser = assertActiveSessionUser_(spreadsheet, payload)
          payload.createdBy = sessionUser.name
          payload.sessionUserRole = sessionUser.role
          payload.sessionUserPlatforms = sessionUser.platforms
        }
        if (ERP_AUDIT_ACTIONS.indexOf(request.action) >= 0) {
          auditEntry = beginAuditEvent_(sessionUser, request.action, payload)
        }
        let data
        try {
          data = dispatch_(spreadsheet, request.action, payload)
        } catch (error) {
          if (auditEntry) {
            try {
              finishAuditEvent_(auditEntry, 'Failed')
            } catch (auditError) {
              Logger.log('Could not update failed audit event: ' + String(auditError))
            }
          }
          throw error
        }
        if (auditEntry) {
          try {
            finishAuditEvent_(auditEntry, 'Succeeded')
          } catch (auditError) {
            Logger.log('ERP action succeeded but its audit status remains Started: ' + String(auditError))
          }
        }
        if (['getWorkbookData', 'getUsers', 'listAuditEvents', 'recordAuditEvent', 'listEcommerceLabels', 'downloadEcommerceLabel', 'uploadEcommerceLabel', 'startCameraClipUpload', 'uploadCameraClipChunk', 'listCameraClips', 'readCameraClipRange', 'cleanupExpiredCameraClips', 'listChatData', 'listChatMessages', 'listChatTyping', 'setChatTyping', 'sendChatMessage', 'readChatAttachment', 'listAssistantState', 'saveAssistantTurn', 'clearAssistantMemory', 'submitEcommerceReport', 'listEcommerceReports', 'listEcommerceTasks', 'submitGraphicDesignReport', 'listGraphicDesignReports', 'submitSalesReport', 'listSalesReports', 'getEcommerceTargets', 'setEcommerceTarget', 'listDailyTasks', 'downloadDailyTaskAttachment'].indexOf(request.action) < 0) {
          try {
            invalidateWorkbookCache_(spreadsheet)
          } catch (error) {
            Logger.log('Workbook cache invalidation failed after ' + request.action + ': ' + String(error))
          }
        }
        return jsonOutput_({ ok: true, data: data })
      } catch (error) {
        const detail = String(error && error.message || 'Apps Script request failed.')
          .replace(/([?&](?:upload_id|access_token|key)=)[^&\s]+/gi, '$1[redacted]')
          .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
          .slice(0, 500)
        Logger.log('Apps Script request failed for ' + action + ': ' + detail)
        return jsonOutput_({
          ok: false,
          status: Number(error && error.statusCode) || 500,
          error: detail,
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
        managerId: String(user['Manager ID'] || '').trim(),
        platforms: String(user['Assigned Platforms'] || '').split(',').map(function (platform) { return platform.trim().toUpperCase() }).filter(Boolean),
      }
    }

    function dispatch_(spreadsheet, action, payload) {
      switch (action) {
        case 'getWorkbookData':
          return getWorkbookData_(spreadsheet)
        case 'getUsers':
          return { users: readCachedSheetRecords_(spreadsheet, 'Users') }
        case 'listAuditEvents':
          return listAuditEvents_()
        case 'resetErpData':
          return resetErpData_(spreadsheet, payload)
        case 'recordAuditEvent':
          return recordAuditEvent_(payload)
        case 'listChatData':
          return listChatData_(spreadsheet, payload)
        case 'listChatMessages':
          return listChatMessages_(payload)
        case 'listChatTyping':
          return listChatTyping_(payload)
        case 'setChatTyping':
          return setChatTyping_(payload)
        case 'sendChatMessage':
          return sendChatMessage_(spreadsheet, payload)
        case 'readChatAttachment':
          return readChatAttachment_(payload)
        case 'listAssistantState':
          return listAssistantState_(payload)
        case 'saveAssistantTurn':
          return saveAssistantTurn_(payload)
        case 'clearAssistantMemory':
          return clearAssistantMemory_(payload)
        case 'createInitialAdmin':
          return createInitialAdmin_(spreadsheet, payload.user)
        case 'appendUser':
          return appendUser_(spreadsheet, payload)
        case 'setUserActive':
          return setUserActive_(spreadsheet, payload)
        case 'setUserManager':
          return setUserManager_(spreadsheet, payload)
        case 'setUserPassword':
          return setUserPassword_(spreadsheet, payload)
        case 'updateMarketplaceSku':
        case 'updateMarketplaceListing':
          return updateMarketplaceSku_(spreadsheet, payload)
        case 'uploadEcommerceLabel':
          return uploadEcommerceLabel_(payload)
        case 'listEcommerceLabels':
          return listEcommerceLabels_(spreadsheet, payload)
        case 'downloadEcommerceLabel':
          return downloadEcommerceLabel_(spreadsheet, payload)
        case 'startCameraClipUpload':
          return startCameraClipUpload_(payload)
        case 'uploadCameraClipChunk':
          return uploadCameraClipChunk_(payload)
        case 'listCameraClips':
          return listCameraClips_()
        case 'readCameraClipRange':
          return readCameraClipRange_(payload)
        case 'cleanupExpiredCameraClips':
          return withWriteLock_(function () { return cleanupExpiredCameraClips_() })
        case 'submitEcommerceReport':
          return submitEcommerceReport_(spreadsheet, payload)
        case 'listEcommerceReports':
          return listEcommerceReports_(spreadsheet, payload)
        case 'importMarketplaceReconciliation':
          return importMarketplaceReconciliation_(spreadsheet, payload)
        case 'listMarketplaceReconciliation':
          return listMarketplaceReconciliation_(spreadsheet, payload)
        case 'listEcommerceTasks':
          return listEcommerceTasks_(spreadsheet, payload)
        case 'createEcommerceTask':
          return createEcommerceTask_(spreadsheet, payload)
        case 'updateEcommerceTask':
          return updateEcommerceTask_(spreadsheet, payload)
        case 'reviewEcommerceTask':
          return reviewEcommerceTask_(spreadsheet, payload)
        case 'listDailyTasks':
          return listDailyTasks_(spreadsheet, payload)
        case 'createDailyTask':
          return createDailyTask_(spreadsheet, payload)
        case 'updateDailyTask':
          return updateDailyTask_(spreadsheet, payload)
        case 'reviewDailyTask':
          return reviewDailyTask_(spreadsheet, payload)
        case 'downloadDailyTaskAttachment':
          return downloadDailyTaskAttachment_(spreadsheet, payload)
        case 'submitSalesReport':
          return submitSalesReport_(payload)
        case 'listSalesReports':
          return listSalesReports_(payload)
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
        case 'saveIndiaMartListings':
          return saveIndiaMartListings_(spreadsheet, payload)
        case 'createSalesOrder':
          return createSalesOrder_(spreadsheet, payload)
        case 'cancelSalesOrder':
          return cancelSalesOrder_(spreadsheet, payload)
        case 'setSalesTarget':
          return setSalesTarget_(spreadsheet, payload)
        case 'addSupplier':
          return addSupplier_(spreadsheet, payload)
        case 'setSupplierActive':
          return setSupplierActive_(spreadsheet, payload)
        case 'setMachineStatus':
          return setMachineStatus_(spreadsheet, payload)
        case 'recordAccountExpense':
          return recordAccountExpense_(spreadsheet, payload)
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
        case 'reviewProductionQuality':
          return reviewProductionQuality_(spreadsheet, payload)
        case 'submitGraphicDesignTask':
          return submitGraphicDesignTask_(spreadsheet, payload)
        case 'updateGraphicDesignProgress':
          return updateGraphicDesignProgress_(spreadsheet, payload)
        case 'reviewGraphicDesignTask':
          return reviewGraphicDesignTask_(spreadsheet, payload)
        case 'submitGraphicDesignReport':
          return submitGraphicDesignReport_(payload)
        case 'listGraphicDesignReports':
          return listGraphicDesignReports_(payload)
        default:
          throw apiError_(400, 'Unknown ERP action.')
      }
    }

    function chatSheet_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      let id = properties.getProperty(ERP_CHAT_SPREADSHEET_PROPERTY)
      if (!id && !createIfMissing) return null
      if (!id) {
        const chatSpreadsheet = SpreadsheetApp.create('Mahalaxmi ERP Private Chats')
        const chatFile = DriveApp.getFileById(chatSpreadsheet.getId())
        chatFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
        chatFile.moveTo(getErpStorageCategoryFolder_('chat', true))
        const sheet = chatSpreadsheet.getSheets()[0]
        sheet.setName('Messages')
        sheet.getRange(1, 1, 1, ERP_CHAT_HEADERS.length).setValues([ERP_CHAT_HEADERS])
        properties.setProperty(ERP_CHAT_SPREADSHEET_PROPERTY, chatSpreadsheet.getId())
        return sheet
      }

      const spreadsheet = SpreadsheetApp.openById(id)
      const sheet = spreadsheet.getSheetByName('Messages')
      if (!sheet) throw new Error('The private chat spreadsheet is missing its Messages sheet.')
      const headers = sheet.getRange(1, 1, 1, ERP_CHAT_HEADERS.length).getValues()[0]
      if (ERP_CHAT_HEADERS.some(function (header, index) { return String(headers[index] || '') !== header })) {
        throw new Error('The private chat spreadsheet has an unrecognized header format.')
      }
      return sheet
    }

    function chatAttachmentFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_CHAT_ATTACHMENT_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('chat', true).createFolder('Mahalaxmi ERP Private Chat Attachments')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_CHAT_ATTACHMENT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function chatConversationId_(firstUserId, secondUserId) {
      return JSON.stringify([String(firstUserId), String(secondUserId)].sort())
    }

    function chatConversationParticipants_(conversationId) {
      let participants
      try {
        participants = JSON.parse(conversationId)
      } catch (error) {
        throw apiError_(400, 'Choose a valid chat conversation.')
      }
      if (!Array.isArray(participants) || participants.length !== 2 ||
          participants.some(function (id) { return typeof id !== 'string' || !id || id.length > 120 }) ||
          participants[0] === participants[1] ||
          conversationId !== chatConversationId_(participants[0], participants[1])) {
        throw apiError_(400, 'Choose a valid chat conversation.')
      }
      return participants
    }

    function chatTypingCacheKey_(conversationId, userId) {
      const digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        conversationId + '|' + userId
      )
      return 'ERP_CHAT_TYPING_' + Utilities.base64EncodeWebSafe(digest)
    }

    function chatMessageFromRow_(row) {
      const attachmentId = String(row[10] || '')
      return {
        id: String(row[0] || ''),
        conversationId: String(row[1] || ''),
        senderId: String(row[2] || ''),
        senderName: String(row[3] || ''),
        senderRole: String(row[4] || ''),
        recipientId: String(row[5] || ''),
        recipientName: String(row[6] || ''),
        recipientRole: String(row[7] || ''),
        sentAt: String(row[8] || ''),
        text: String(row[9] || ''),
        attachmentId: attachmentId,
        attachment: attachmentId ? {
          name: String(row[11] || ''),
          mimeType: String(row[12] || ''),
          size: Number(row[13]) || 0,
        } : null,
      }
    }

    function chatRows_(sheet) {
      if (!sheet || sheet.getLastRow() < 2) return []
      return sheet.getRange(2, 1, sheet.getLastRow() - 1, ERP_CHAT_HEADERS.length)
        .getValues()
        .map(chatMessageFromRow_)
    }

    function chatContact_(row) {
      const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
      if (!active) return null
      const id = String(row['User ID'] || '').trim()
      const name = String(row.Name || '').trim()
      const role = String(row.Role || '').trim()
      if (!id || !name || !role) return null
      return { id: id, name: name, role: role }
    }

    function listChatData_(spreadsheet, payload) {
      const actorId = String(payload.sessionUserId || '').trim()
      const isAdmin = String(payload.sessionUserRole || '') === 'Super Admin'
      const contacts = readSheetRecords_(spreadsheet, 'Users').map(chatContact_).filter(function (contact) {
        return contact && contact.id !== actorId
      })
      const sheet = chatSheet_(false)
      const rows = chatRows_(sheet)
      const threadsById = {}
      rows.forEach(function (message) {
        if (!isAdmin && message.senderId !== actorId && message.recipientId !== actorId) return
        const existing = threadsById[message.conversationId]
        if (!existing || Date.parse(message.sentAt) > Date.parse(existing.sentAt)) {
          threadsById[message.conversationId] = {
            conversationId: message.conversationId,
            participant1Id: message.senderId < message.recipientId ? message.senderId : message.recipientId,
            participant1Name: message.senderId < message.recipientId ? message.senderName : message.recipientName,
            participant2Id: message.senderId < message.recipientId ? message.recipientId : message.senderId,
            participant2Name: message.senderId < message.recipientId ? message.recipientName : message.senderName,
            lastMessage: message.text || (message.attachment ? 'Attachment: ' + message.attachment.name : ''),
            sentAt: message.sentAt,
            lastSenderId: message.senderId,
          }
        }
      })
      const threads = Object.keys(threadsById).map(function (key) { return threadsById[key] })
        .sort(function (left, right) { return Date.parse(right.sentAt) - Date.parse(left.sentAt) })
      return { contacts: contacts, threads: threads, retentionHours: 48 }
    }

    function listChatMessages_(payload) {
      const actorId = String(payload.sessionUserId || '').trim()
      const isAdmin = String(payload.sessionUserRole || '') === 'Super Admin'
      const conversationId = String(payload.conversationId || '').trim()
      const participants = chatConversationParticipants_(conversationId)
      if (!isAdmin && participants.indexOf(actorId) < 0) throw apiError_(403, 'You can only view conversations you participate in.')

      const sheet = chatSheet_(false)
      const cutoff = Date.now() - ERP_CHAT_RETENTION_MS
      const messages = chatRows_(sheet).filter(function (message) {
        return message.conversationId === conversationId && Date.parse(message.sentAt) > cutoff
      })
      const hasOlder = messages.length > 200
      const visibleMessages = messages.slice(-200).map(function (message) {
        return {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole,
          sentAt: message.sentAt,
          text: message.text,
          attachment: message.attachment,
        }
      })
      return { messages: visibleMessages, hasOlder: hasOlder }
    }

    function listChatTyping_(payload) {
      const actorId = String(payload.sessionUserId || '').trim()
      const isAdmin = String(payload.sessionUserRole || '') === 'Super Admin'
      const conversationId = String(payload.conversationId || '').trim()
      const participants = chatConversationParticipants_(conversationId)
      if (!isAdmin && participants.indexOf(actorId) < 0) {
        throw apiError_(403, 'You can only view typing status for conversations you participate in.')
      }
      const cache = CacheService.getScriptCache()
      const typingUsers = []
      participants.forEach(function (userId) {
        if (userId === actorId) return
        const cached = cache.get(chatTypingCacheKey_(conversationId, userId))
        if (!cached) return
        let status
        try {
          status = JSON.parse(cached)
        } catch (error) {
          throw apiError_(500, 'Chat typing status could not be read.')
        }
        if (status && typeof status.name === 'string' && status.name) {
          typingUsers.push({ userId: userId, name: status.name })
        }
      })
      return { typingUsers: typingUsers }
    }

    function setChatTyping_(payload) {
      const actorId = String(payload.sessionUserId || '').trim()
      const conversationId = String(payload.conversationId || '').trim()
      const participants = chatConversationParticipants_(conversationId)
      if (participants.indexOf(actorId) < 0) {
        throw apiError_(403, 'You can only set typing status in conversations you participate in.')
      }
      const key = chatTypingCacheKey_(conversationId, actorId)
      const cache = CacheService.getScriptCache()
      if (payload.typing !== true) {
        cache.remove(key)
        return { typing: false }
      }
      const name = String(payload.createdBy || '').trim()
      if (!name) throw apiError_(401, 'Sign in again before sending typing status.')
      cache.put(key, JSON.stringify({ name: name }), 10)
      return { typing: true }
    }

    function validChatAttachment_(attachment) {
      if (!attachment || typeof attachment !== 'object') throw apiError_(400, 'Choose a valid image or PDF attachment.')
      const name = String(attachment.name || '').trim()
      const mimeType = String(attachment.mimeType || '').trim().toLowerCase()
      const base64 = String(attachment.base64 || '')
      if (!name || name.length > 180 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) ||
          base64.length > 4194304 || ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].indexOf(mimeType) < 0) {
        throw apiError_(400, 'Only valid JPEG, PNG, GIF, WebP images or PDF files up to 3 MB are supported.')
      }
      const bytes = Utilities.base64Decode(base64)
      if (!bytes.length || bytes.length > ERP_CHAT_MAX_ATTACHMENT_BYTES) {
        throw apiError_(413, 'Chat attachments must be 3 MB or smaller.')
      }
      const byteAt = function (index) { return bytes[index] & 255 }
      const isPdf = mimeType === 'application/pdf' && bytes.length >= 5 &&
        byteAt(0) === 37 && byteAt(1) === 80 && byteAt(2) === 68 && byteAt(3) === 70 && byteAt(4) === 45
      const isJpeg = mimeType === 'image/jpeg' && bytes.length >= 3 &&
        byteAt(0) === 255 && byteAt(1) === 216 && byteAt(2) === 255
      const isPng = mimeType === 'image/png' && bytes.length >= 8 &&
        byteAt(0) === 137 && byteAt(1) === 80 && byteAt(2) === 78 && byteAt(3) === 71 &&
        byteAt(4) === 13 && byteAt(5) === 10 && byteAt(6) === 26 && byteAt(7) === 10
      const isGif = mimeType === 'image/gif' && bytes.length >= 6 &&
        String.fromCharCode.apply(null, bytes.slice(0, 6)) === 'GIF89a' ||
        mimeType === 'image/gif' && bytes.length >= 6 &&
        String.fromCharCode.apply(null, bytes.slice(0, 6)) === 'GIF87a'
      const isWebp = mimeType === 'image/webp' && bytes.length >= 12 &&
        String.fromCharCode.apply(null, bytes.slice(0, 4)) === 'RIFF' &&
        String.fromCharCode.apply(null, bytes.slice(8, 12)) === 'WEBP'
      if (!isPdf && !isJpeg && !isPng && !isGif && !isWebp) {
        throw apiError_(400, 'The attachment content does not match a supported image or PDF type.')
      }
      const safeName = name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 140)
      const extensionMatches = mimeType === 'image/jpeg' ? /\.(jpe?g)$/i.test(safeName)
        : mimeType === 'image/png' ? /\.png$/i.test(safeName)
          : mimeType === 'image/gif' ? /\.gif$/i.test(safeName)
            : mimeType === 'image/webp' ? /\.webp$/i.test(safeName)
              : /\.pdf$/i.test(safeName)
      if (!extensionMatches) throw apiError_(400, 'Use a file name that matches the selected image or PDF type.')
      return { name: safeName, mimeType: mimeType, bytes: bytes }
    }

    function sendChatMessage_(spreadsheet, payload) {
      const senderId = String(payload.sessionUserId || '').trim()
      const senderName = String(payload.createdBy || '').trim()
      const senderRole = String(payload.sessionUserRole || '').trim()
      const recipientId = String(payload.recipientId || '').trim()
      const messageText = String(payload.text || '').trim()
      if (!recipientId || recipientId === senderId) throw apiError_(400, 'Choose another active user to chat with.')
      if (messageText.length > 4000) throw apiError_(400, 'Messages must be 4,000 characters or fewer.')
      const recipient = readSheetRecords_(spreadsheet, 'Users').map(chatContact_).find(function (contact) {
        return contact && contact.id === recipientId
      })
      if (!recipient) throw apiError_(404, 'That user is inactive or no longer exists.')
      const attachment = payload.attachment ? validChatAttachment_(payload.attachment) : null
      if (!messageText && !attachment) throw apiError_(400, 'Enter a message or attach an image/PDF.')

      return withWriteLock_(function () {
        const id = Utilities.getUuid()
        const conversationId = chatConversationId_(senderId, recipient.id)
        let file = null
        if (attachment) {
          file = chatAttachmentFolder_(true).createFile(
            Utilities.newBlob(attachment.bytes, attachment.mimeType, attachment.name),
          )
          file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
          file.setDescription(JSON.stringify({
            kind: 'mahalaxmi-erp-chat-attachment',
            messageId: id,
            conversationId: conversationId,
            sentAt: new Date().toISOString(),
          }))
        }
        try {
          const sheet = chatSheet_(true)
          const sentAt = new Date().toISOString()
          sheet.appendRow([
            id, conversationId, senderId, senderName, senderRole,
            recipient.id, recipient.name, recipient.role, sentAt, messageText,
            file ? file.getId() : '',
            attachment ? attachment.name : '',
            attachment ? attachment.mimeType : '',
            attachment ? attachment.bytes.length : '',
          ].map(safeCellValue_))
          return {
            message: {
              id: id,
              conversationId: conversationId,
              senderId: senderId,
              senderName: senderName,
              senderRole: senderRole,
              sentAt: sentAt,
              text: messageText,
              attachment: attachment ? {
                name: attachment.name,
                mimeType: attachment.mimeType,
                size: attachment.bytes.length,
              } : null,
            },
          }
        } catch (error) {
          if (file) {
            try {
              file.setTrashed(true)
            } catch (cleanupError) {
              Logger.log('A chat attachment orphaned by a failed message write could not be trashed: ' + file.getId())
            }
          }
          throw error
        }
      })
    }

    function permanentlyDeleteChatAttachment_(fileId) {
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new Error('A chat attachment has an invalid Drive ID.')
      const response = UrlFetchApp.fetch(
        'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId),
        {
          method: 'delete',
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true,
        }
      )
      const status = response.getResponseCode()
      if (status !== 200 && status !== 204 && status !== 404) {
        Logger.log('Drive API could not permanently delete expired chat attachment ' + fileId + '; HTTP status ' + status)
        throw apiError_(500, 'Expired chat attachments could not be deleted. Please retry cleanup.')
      }
    }

    function cleanupExpiredChatMessages_() {
      const sheet = chatSheet_(false)
      if (!sheet || sheet.getLastRow() < 2) return 0
      const cutoff = Date.now() - ERP_CHAT_RETENTION_MS
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ERP_CHAT_HEADERS.length).getValues()
      const expiredRows = []
      for (let index = 0; index < rows.length; index += 1) {
        const sentAt = Date.parse(String(rows[index][8] || ''))
        if (!Number.isFinite(sentAt) || sentAt <= cutoff) {
          const attachmentId = String(rows[index][10] || '')
          if (attachmentId) permanentlyDeleteChatAttachment_(attachmentId)
          expiredRows.push(index + 2)
        }
      }
      expiredRows.reverse().forEach(function (row) { sheet.deleteRow(row) })
      return expiredRows.length
    }

    function assistantSpreadsheet_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      let id = properties.getProperty(ERP_ASSISTANT_SPREADSHEET_PROPERTY)
      if (!id && !createIfMissing) return null
      if (!id) {
        const spreadsheet = SpreadsheetApp.create('Mahalaxmi Saathi Private Memory')
        const file = DriveApp.getFileById(spreadsheet.getId())
        file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
        file.moveTo(getErpStorageCategoryFolder_('assistant', true))
        const messages = spreadsheet.getSheets()[0]
        messages.setName('Messages')
        messages.getRange(1, 1, 1, ERP_ASSISTANT_MESSAGE_HEADERS.length).setValues([ERP_ASSISTANT_MESSAGE_HEADERS])
        const memory = spreadsheet.insertSheet('Memory')
        memory.getRange(1, 1, 1, ERP_ASSISTANT_MEMORY_HEADERS.length).setValues([ERP_ASSISTANT_MEMORY_HEADERS])
        properties.setProperty(ERP_ASSISTANT_SPREADSHEET_PROPERTY, spreadsheet.getId())
        return spreadsheet
      }
      return SpreadsheetApp.openById(id)
    }

    function assistantSheet_(spreadsheet, name, headers) {
      const sheet = spreadsheet.getSheetByName(name)
      if (!sheet) throw new Error('The private Mahalaxmi Saathi spreadsheet is missing its ' + name + ' sheet.')
      const actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0].map(function (value) {
        return String(value || '').trim()
      })
      if (headers.some(function (header, index) { return actual[index] !== header })) {
        throw new Error('The private Mahalaxmi Saathi ' + name + ' sheet has an unrecognized header format.')
      }
      return sheet
    }

    function assistantMessageFromRow_(row) {
      const role = String(row[2] || '')
      if (role !== 'user' && role !== 'assistant') {
        throw apiError_(503, 'The private Mahalaxmi Saathi message store contains an invalid role.')
      }
      return {
        id: String(row[0] || ''),
        role: role,
        content: String(row[3] || ''),
        createdAt: row[4] instanceof Date ? row[4].toISOString() : String(row[4] || ''),
      }
    }

    function listAssistantState_(payload) {
      const userId = String(payload.sessionUserId || '').trim()
      if (!userId) throw apiError_(401, 'Sign in again before opening Mahalaxmi Saathi.')
      const spreadsheet = assistantSpreadsheet_(false)
      if (!spreadsheet) return { messages: [], memory: '', retentionHours: 24 }

      const messagesSheet = assistantSheet_(spreadsheet, 'Messages', ERP_ASSISTANT_MESSAGE_HEADERS)
      const memorySheet = assistantSheet_(spreadsheet, 'Memory', ERP_ASSISTANT_MEMORY_HEADERS)
      const cutoff = Date.now() - ERP_ASSISTANT_RETENTION_MS
      const messages = messagesSheet.getLastRow() < 2
        ? []
        : messagesSheet.getRange(2, 1, messagesSheet.getLastRow() - 1, ERP_ASSISTANT_MESSAGE_HEADERS.length)
          .getValues()
          .filter(function (row) {
            return String(row[1] || '') === userId && Date.parse(String(row[4] || '')) > cutoff
          })
          .map(assistantMessageFromRow_)
          .sort(function (left, right) { return Date.parse(left.createdAt) - Date.parse(right.createdAt) })
          .slice(-40)
      const memoryRows = memorySheet.getLastRow() < 2
        ? []
        : memorySheet.getRange(2, 1, memorySheet.getLastRow() - 1, ERP_ASSISTANT_MEMORY_HEADERS.length).getValues()
          .filter(function (row) { return String(row[0] || '') === userId })
      if (memoryRows.length > 1) throw apiError_(503, 'The private Mahalaxmi Saathi memory store contains duplicate entries.')
      return {
        messages: messages,
        memory: memoryRows.length ? String(memoryRows[0][1] || '').slice(0, ERP_ASSISTANT_MEMORY_MAX_LENGTH) : '',
        retentionHours: 24,
      }
    }

    function saveAssistantTurn_(payload) {
      const userId = String(payload.sessionUserId || '').trim()
      const question = String(payload.question || '').trim()
      const answer = String(payload.answer || '').trim()
      const memory = String(payload.memory || '').trim()
      if (!userId || !question || question.length > 3000 || !answer || answer.length > 7000 ||
          memory.length > ERP_ASSISTANT_MEMORY_MAX_LENGTH) {
        throw apiError_(400, 'The Mahalaxmi Saathi message or memory is invalid.')
      }
      return withWriteLock_(function () {
        const existingSpreadsheet = assistantSpreadsheet_(false)
        if (existingSpreadsheet) {
          const existingMessagesSheet = assistantSheet_(existingSpreadsheet, 'Messages', ERP_ASSISTANT_MESSAGE_HEADERS)
          const expiredConversation = assistantConversationForUser_(existingMessagesSheet, userId)
          if (expiredConversation && expiredConversation.latestAt <= Date.now() - ERP_ASSISTANT_RETENTION_MS) {
            archiveAssistantConversation_(userId, expiredConversation)
            expiredConversation.rowNumbers.sort(function (left, right) { return right - left })
              .forEach(function (rowNumber) { existingMessagesSheet.deleteRow(rowNumber) })
          }
        }
        const spreadsheet = assistantSpreadsheet_(true)
        const messagesSheet = assistantSheet_(spreadsheet, 'Messages', ERP_ASSISTANT_MESSAGE_HEADERS)
        const memorySheet = assistantSheet_(spreadsheet, 'Memory', ERP_ASSISTANT_MEMORY_HEADERS)
        const matchingMemoryRows = memorySheet.getLastRow() < 2
          ? []
          : memorySheet.getRange(2, 1, memorySheet.getLastRow() - 1, ERP_ASSISTANT_MEMORY_HEADERS.length)
            .getValues()
            .map(function (row, index) { return { row: row, rowNumber: index + 2 } })
            .filter(function (item) { return String(item.row[0] || '') === userId })
        if (matchingMemoryRows.length > 1) throw apiError_(503, 'The private Mahalaxmi Saathi memory store contains duplicate entries.')
        const timestamp = new Date().toISOString()
        const userMessage = { id: Utilities.getUuid(), role: 'user', content: question, createdAt: timestamp }
        const assistantMessage = { id: Utilities.getUuid(), role: 'assistant', content: answer, createdAt: timestamp }
        const startRow = messagesSheet.getLastRow() + 1
        messagesSheet.getRange(startRow, 1, 2, ERP_ASSISTANT_MESSAGE_HEADERS.length).setValues([
          [userMessage.id, userId, userMessage.role, safeCellValue_(userMessage.content), timestamp],
          [assistantMessage.id, userId, assistantMessage.role, safeCellValue_(assistantMessage.content), timestamp],
        ])
        if (memory) {
          if (matchingMemoryRows.length) {
            const rowNumber = matchingMemoryRows[0].rowNumber
            memorySheet.getRange(rowNumber, 2, 1, 2).setValues([[safeCellValue_(memory), timestamp]])
          } else {
            memorySheet.appendRow([userId, safeCellValue_(memory), timestamp])
          }
        } else if (matchingMemoryRows.length) {
          memorySheet.deleteRow(matchingMemoryRows[0].rowNumber)
        }
        return { userMessage: userMessage, assistantMessage: assistantMessage, memory: memory }
      })
    }

    function clearAssistantMemory_(payload) {
      const userId = String(payload.sessionUserId || '').trim()
      if (!userId) throw apiError_(401, 'Sign in again before clearing Mahalaxmi Saathi memory.')
      return withWriteLock_(function () {
        const spreadsheet = assistantSpreadsheet_(false)
        if (!spreadsheet) return { cleared: true }
        const sheet = assistantSheet_(spreadsheet, 'Memory', ERP_ASSISTANT_MEMORY_HEADERS)
        if (sheet.getLastRow() < 2) return { cleared: true }
        const matchingRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ERP_ASSISTANT_MEMORY_HEADERS.length)
          .getValues()
          .map(function (row, index) { return { row: row, rowNumber: index + 2 } })
          .filter(function (item) { return String(item.row[0] || '') === userId })
        matchingRows.reverse().forEach(function (item) { sheet.deleteRow(item.rowNumber) })
        return { cleared: true }
      })
    }

    function assistantConversationForUser_(sheet, userId) {
      if (sheet.getLastRow() < 2) return null
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ERP_ASSISTANT_MESSAGE_HEADERS.length).getValues()
      const conversation = { messages: [], rowNumbers: [], latestAt: 0 }
      rows.forEach(function (row, index) {
        if (String(row[1] || '') !== userId) return
        const createdAt = Date.parse(String(row[4] || ''))
        conversation.messages.push(assistantMessageFromRow_(row))
        conversation.rowNumbers.push(index + 2)
        conversation.latestAt = Math.max(conversation.latestAt, Number.isFinite(createdAt) ? createdAt : 0)
      })
      return conversation.messages.length ? conversation : null
    }

    function archiveAssistantConversation_(userId, conversation) {
      const archive = {
        kind: 'mahalaxmi-saathi-expired-chat',
        userId: userId,
        archivedAt: new Date().toISOString(),
        messages: conversation.messages,
      }
      const file = getErpStorageCategoryFolder_('assistant', true).createFile(
        'Mahalaxmi-Saathi-Chat-' + Utilities.getUuid() + '.json',
        JSON.stringify(archive),
        MimeType.PLAIN_TEXT,
      )
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      file.setTrashed(true)
      return conversation.rowNumbers.length
    }

    function cleanupExpiredAssistantChats_() {
      const spreadsheet = assistantSpreadsheet_(false)
      if (!spreadsheet) return 0
      const sheet = assistantSheet_(spreadsheet, 'Messages', ERP_ASSISTANT_MESSAGE_HEADERS)
      if (sheet.getLastRow() < 2) return 0
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, ERP_ASSISTANT_MESSAGE_HEADERS.length).getValues()
      const conversations = {}
      rows.forEach(function (row, index) {
        const userId = String(row[1] || '')
        if (!userId) throw apiError_(503, 'The private Mahalaxmi Saathi message store contains an invalid user.')
        if (!conversations[userId]) conversations[userId] = { messages: [], rowNumbers: [], latestAt: 0 }
        const createdAt = Date.parse(String(row[4] || ''))
        conversations[userId].messages.push(assistantMessageFromRow_(row))
        conversations[userId].rowNumbers.push(index + 2)
        conversations[userId].latestAt = Math.max(conversations[userId].latestAt, Number.isFinite(createdAt) ? createdAt : 0)
      })

      const cutoff = Date.now() - ERP_ASSISTANT_RETENTION_MS
      const expiredRowNumbers = []
      Object.keys(conversations).forEach(function (userId) {
        const conversation = conversations[userId]
        if (conversation.latestAt > cutoff) return
        expiredRowNumbers.push.apply(expiredRowNumbers, conversation.rowNumbers)
        archiveAssistantConversation_(userId, conversation)
      })
      expiredRowNumbers.sort(function (left, right) { return right - left })
        .forEach(function (rowNumber) { sheet.deleteRow(rowNumber) })
      return expiredRowNumbers.length
    }

    function cleanupExpiredChatMessagesScheduled_() {
      return withWriteLock_(function () {
        return cleanupExpiredChatMessages_() + cleanupExpiredAssistantChats_()
      })
    }

    function readChatAttachment_(payload) {
      const messageId = String(payload.messageId || '').trim()
      const actorId = String(payload.sessionUserId || '').trim()
      const isAdmin = String(payload.sessionUserRole || '') === 'Super Admin'
      if (!messageId) throw apiError_(400, 'Choose a chat attachment.')
      const sheet = chatSheet_(false)
      const message = chatRows_(sheet).find(function (item) { return item.id === messageId })
      if (!message || !message.attachmentId || Date.parse(message.sentAt) <= Date.now() - ERP_CHAT_RETENTION_MS) {
        throw apiError_(404, 'This chat attachment has expired or was not found.')
      }
      if (!isAdmin && message.senderId !== actorId && message.recipientId !== actorId) {
        throw apiError_(403, 'You cannot access an attachment from another conversation.')
      }
      const file = DriveApp.getFileById(message.attachmentId)
      const blob = file.getBlob()
      const bytes = blob.getBytes()
      return {
        name: message.attachment.name,
        mimeType: message.attachment.mimeType,
        size: bytes.length,
        base64: Utilities.base64Encode(bytes),
      }
    }

    function auditSpreadsheet_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      let id = properties.getProperty(ERP_AUDIT_SPREADSHEET_PROPERTY)
      if (!id && !createIfMissing) return null
      if (!id) {
        const auditSpreadsheet = SpreadsheetApp.create('Mahalaxmi ERP Private Audit Log')
        const auditFile = DriveApp.getFileById(auditSpreadsheet.getId())
        auditFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
        auditFile.moveTo(getErpStorageCategoryFolder_('audit', true))
        const sheet = auditSpreadsheet.getSheets()[0]
        sheet.setName('Audit Events')
        sheet.getRange(1, 1, 1, ERP_AUDIT_HEADERS.length).setValues([ERP_AUDIT_HEADERS])
        properties.setProperty(ERP_AUDIT_SPREADSHEET_PROPERTY, auditSpreadsheet.getId())
        return sheet
      }

      const spreadsheet = SpreadsheetApp.openById(id)
      const sheet = spreadsheet.getSheetByName('Audit Events')
      if (!sheet) throw new Error('The configured private audit spreadsheet is missing its Audit Events sheet.')
      const headers = sheet.getRange(1, 1, 1, ERP_AUDIT_HEADERS.length).getValues()[0]
      if (ERP_AUDIT_HEADERS.some(function (header, index) { return String(headers[index] || '') !== header })) {
        throw new Error('The configured private audit spreadsheet has an unrecognized header format.')
      }
      return sheet
    }

    function cleanupExpiredAuditEvents_(sheet) {
      if (!sheet || sheet.getLastRow() < 2) return 0
      const cutoff = Date.now() - ERP_AUDIT_RETENTION_MS
      const timestamps = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues()
      let removed = 0
      for (let index = timestamps.length - 1; index >= 0; index -= 1) {
        const timestamp = Date.parse(String(timestamps[index][0] || ''))
        if (Number.isFinite(timestamp) && timestamp < cutoff) {
          sheet.deleteRow(index + 2)
          removed += 1
        }
      }
      return removed
    }

    function auditActionLabel_(action, payload) {
      const labels = {
        appendUser: 'Created user account',
        setUserActive: payload.active ? 'Activated user account' : 'Deactivated user account',
        setUserManager: 'Assigned E-commerce Manager',
        setUserPassword: 'Changed account password',
        addMarketplaceListing: 'Created marketplace listing',
        recordProduction: 'Recorded production',
        reviewProductionQuality: 'Reviewed production quality',
        submitGraphicDesignTask: 'Submitted creative task',
        updateGraphicDesignProgress: 'Updated creative production status',
        reviewGraphicDesignTask: 'Reviewed creative task',
        submitGraphicDesignReport: 'Submitted Graphic Designer daily report',
        addRawMaterial: 'Created raw material',
        applyStockMovement: 'Recorded stock movement',
        initializeZeroFinishedStock: 'Initialized finished-goods stock',
        archiveStockItem: 'Archived stock item',
        deleteUnusedStockItem: 'Deleted unused stock item',
        importMarketplaceWorkbook: 'Imported marketplace catalog',
        resetErpData: 'Reset ERP business data',
        updateMarketplaceSku: 'Updated marketplace SKU',
        updateMarketplaceListing: 'Updated marketplace listing',
        uploadEcommerceLabel: 'Uploaded shipping label',
        submitEcommerceReport: 'Submitted e-commerce report',
        createEcommerceTask: 'Created e-commerce daily task',
        updateEcommerceTask: 'Updated e-commerce task status',
        reviewEcommerceTask: 'Reviewed e-commerce daily task',
        createDailyTask: 'Assigned company daily task',
        updateDailyTask: 'Submitted company daily task progress',
        reviewDailyTask: 'Reviewed company daily task',
        submitSalesReport: 'Submitted sales report',
        setEcommerceTarget: 'Changed e-commerce target',
        setProductionTarget: 'Changed production target',
        importSalesLeads: 'Imported sales leads',
        addSalesLead: 'Created sales lead',
        assignSalesLead: 'Assigned sales lead',
        recordSalesActivity: 'Recorded sales activity',
        createSalesOrder: 'Created sales order',
        cancelSalesOrder: 'Cancelled sales order',
        saveIndiaMartListings: 'Updated IndiaMART listings',
        setSalesTarget: 'Changed sales target',
        addSupplier: 'Created supplier',
        setSupplierActive: payload.active ? 'Activated supplier' : 'Deactivated supplier',
        setMachineStatus: 'Changed machine status',
        recordAccountExpense: 'Recorded account expense',
      }
      if (action === 'appendRecord') {
        const sheet = String(payload.sheet || '')
        return ERP_DATA_SHEETS.indexOf(sheet) >= 0 ? 'Created record in ' + sheet : 'Created ERP record'
      }
      return labels[action] || 'Changed ERP data'
    }

    function appendAuditEvent_(user, action, target, outcome) {
      if (!user || !user.id || !user.name || !user.role) throw new Error('An audit event requires a validated actor.')
      return withWriteLock_(function () {
        const sheet = auditSpreadsheet_(true)
        cleanupExpiredAuditEvents_(sheet)
        const row = sheet.getLastRow() + 1
        const eventId = Utilities.getUuid()
        const timestamp = new Date().toISOString()
        sheet.getRange(row, 1, 1, ERP_AUDIT_HEADERS.length).setValues([[
          eventId, timestamp, user.id, user.name, user.role, action, target || '', outcome,
        ].map(safeCellValue_)])
        return { row: row, eventId: eventId }
      })
    }

    function beginAuditEvent_(user, action, payload) {
      return appendAuditEvent_(user, auditActionLabel_(action, payload), auditTarget_(payload), 'Started')
    }

    function auditTarget_(payload) {
      const record = payload.record && typeof payload.record === 'object' ? payload.record : {}
      const user = payload.user && typeof payload.user === 'object' ? payload.user : {}
      const candidates = [
        payload.id, payload.listingId, payload.orderId, payload.leadId, payload.materialId, payload.supplierId, payload.expenseId, payload.executiveId, payload.taskId, payload.machineId,
        payload.sku, user['User ID'], record.id, record['Internal Product ID'],
        record['Variant ID'], record['Machine ID'], record['Production ID'], record['Movement ID'],
      ]
      const value = candidates.find(function (candidate) {
        return typeof candidate === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(candidate.trim())
      })
      if (!value) return ''
      return String(value).trim()
    }

    function finishAuditEvent_(entry, outcome) {
      withWriteLock_(function () {
        const sheet = auditSpreadsheet_(false)
        if (!sheet || entry.row > sheet.getLastRow() || String(sheet.getRange(entry.row, 1).getValue()) !== entry.eventId) {
          throw new Error('The pending audit event could not be found.')
        }
        sheet.getRange(entry.row, 8).setValue(outcome)
      })
    }

    function recordAuditEvent_(payload) {
      const eventType = String(payload.eventType || '')
      const actionByType = {
        login: 'Signed in',
        logout: 'Signed out',
        module_view: 'Opened ERP module',
        screen_recording_started: 'Started screen recording',
        screen_recording_stopped: 'Stopped screen recording',
      }
      if (!Object.prototype.hasOwnProperty.call(actionByType, eventType)) throw apiError_(400, 'Unknown audit event.')
      const user = {
        id: String(payload.userId || '').trim().slice(0, 120),
        name: String(payload.userName || '').trim().slice(0, 120),
        role: String(payload.role || '').trim().slice(0, 80),
      }
      const roles = ['Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer']
      if (!user.id || !user.name || roles.indexOf(user.role) < 0) throw apiError_(400, 'Audit actor details are invalid.')
      let target = ''
      if (eventType === 'module_view') {
        const modules = ['Dashboard', 'Sales Dashboard', 'Sales Daily Report', 'Leads', 'Production', 'Production Targets', 'Stitching', 'Raw Material', 'Finished Goods', 'Product Catalog', 'Orders', 'Inventory', 'Stock Movement', 'Shipping & Delivery', 'Returns & RTO', 'IndiaMART', 'E-commerce Workspace', 'E-commerce Stock', 'E-commerce Orders', 'Shipping Labels', 'Marketplace Reconciliation', 'Daily Tasks', 'Daily Work Report', 'Machines', 'Quality Control', 'Graphic Design', 'Employees', 'Suppliers', 'Accounts', 'Reports', 'Excel Management', 'User Management', 'Settings', 'Audit Logs', 'Camera Monitoring', 'Chat']
        target = String(payload.module || '')
        if (modules.indexOf(target) < 0) throw apiError_(400, 'ERP module is invalid.')
      }
      appendAuditEvent_(user, actionByType[eventType], target, 'Succeeded')
      return { recorded: true }
    }

    function listAuditEvents_() {
      const sheet = auditSpreadsheet_(false)
      if (!sheet) return { events: [], retentionDays: 90 }
      return withWriteLock_(function () {
        cleanupExpiredAuditEvents_(sheet)
        const lastRow = sheet.getLastRow()
        if (lastRow < 2) return { events: [], retentionDays: 90 }
        const startRow = Math.max(2, lastRow - 499)
        const values = sheet.getRange(startRow, 1, lastRow - startRow + 1, ERP_AUDIT_HEADERS.length).getValues()
        const events = values.reverse().map(function (row) {
          return {
            id: String(row[0] || ''),
            timestamp: String(row[1] || ''),
            userId: String(row[2] || ''),
            userName: String(row[3] || ''),
            role: String(row[4] || ''),
            action: String(row[5] || ''),
            target: String(row[6] || ''),
            outcome: String(row[7] || ''),
          }
        })
        return { events: events, retentionDays: 90 }
      })
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

    function salesOrderUnitPrice_(spreadsheet, orderId) {
      const target = String(orderId || '').trim()
      if (!target) return 0
      const order = readSheetRecords_(spreadsheet, 'Sales_Orders').find(function (row) {
        return String(row['Order ID'] || '').trim() === target
      })
      return order ? stockNumber_(order['Unit Price'], 'Sales order unit price') : 0
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
        'Supplier ID': input.supplierId || '',
        Supplier: input.supplier || '',
        'Unit Cost': input.unitCost === undefined ? '' : input.unitCost,
        'Total Cost': input.totalCost === undefined ? '' : input.totalCost,
        'Unit Price': input.unitPrice === undefined ? '' : input.unitPrice,
        'Total Amount': input.totalAmount === undefined ? '' : input.totalAmount,
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

    function requireProductionSupervisor_(payload) {
      if (String(payload.sessionUserRole || '') !== 'Production Supervisor') {
        throw apiError_(403, 'Only the Production Supervisor can manage raw materials and finished goods.')
      }
    }

    function supplierById_(spreadsheet, supplierId) {
      const target = String(supplierId || '').trim()
      if (!target) return null
      return readSheetRecords_(spreadsheet, 'Suppliers').find(function (row) {
        return String(row['Supplier ID'] || '').trim() === target
      }) || null
    }

    function addSupplier_(spreadsheet, payload) {
      if (!['Super Admin', 'Production Supervisor'].includes(String(payload.sessionUserRole || ''))) {
        throw apiError_(403, 'Only the Super Admin or Production Supervisor can add suppliers.')
      }
      return withWriteLock_(function () {
        const input = payload.supplier || {}
        const name = String(input.name || '').trim()
        if (!name || name.length > 180) throw apiError_(400, 'Supplier name is required and must be 180 characters or fewer.')
        const contactPerson = String(input.contactPerson || '').trim()
        const phone = String(input.phone || '').trim()
        const email = String(input.email || '').trim()
        const address = String(input.address || '').trim()
        const notes = String(input.notes || '').trim()
        if ([name, contactPerson, phone, email, address, notes].some(function (value) {
          return /[\u0000-\u001f\u007f]/.test(value)
        })) throw apiError_(400, 'Supplier details cannot contain control characters.')
        if (contactPerson.length > 120 || phone.length > 40 || email.length > 180 || address.length > 300 || notes.length > 500) {
          throw apiError_(400, 'One or more supplier details exceed their supported length.')
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError_(400, 'Enter a valid supplier email address.')
        const duplicate = readSheetRecords_(spreadsheet, 'Suppliers').some(function (row) {
          return String(row['Supplier Name'] || '').trim().toLowerCase() === name.toLowerCase()
        })
        if (duplicate) throw apiError_(409, 'A supplier with that name already exists.')
        const backupState = { created: false }
        const registry = ensureStockSheet_(spreadsheet, 'Suppliers', ERP_SUPPLIER_HEADERS, backupState)
        const now = new Date().toISOString()
        const supplier = {
          'Supplier ID': 'SUP-' + Utilities.getUuid(),
          'Supplier Name': name,
          'Contact Person': contactPerson,
          Phone: phone,
          Email: email,
          Address: address,
          Notes: notes,
          Status: 'Active',
          'Created At': now,
          'Created By': payload.createdBy || '',
          'Updated At': now,
          'Updated By': payload.createdBy || '',
        }
        createBackupOnce_(spreadsheet, backupState)
        appendStockRow_(registry.sheet, registry.headers, supplier)
        SpreadsheetApp.flush()
        return { supplier: supplier }
      })
    }

    function setSupplierActive_(spreadsheet, payload) {
      requireProductionSupervisor_(payload)
      return withWriteLock_(function () {
        const supplierId = String(payload.supplierId || '').trim()
        if (!supplierId || typeof payload.active !== 'boolean') throw apiError_(400, 'Choose a supplier and active status.')
        const sheet = spreadsheet.getSheetByName('Suppliers')
        if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) throw apiError_(404, 'Supplier was not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const rowNumber = findStockRow_(sheet, headers, 'Supplier ID', supplierId)
        if (!rowNumber) throw apiError_(404, 'Supplier was not found.')
        const supplier = readStockRow_(sheet, headers, rowNumber)
        const nextStatus = payload.active ? 'Active' : 'Inactive'
        if (String(supplier.Status || '') === nextStatus) return { supplier: supplier }
        const backupState = { created: false }
        createBackupOnce_(spreadsheet, backupState)
        supplier.Status = nextStatus
        supplier['Updated At'] = new Date().toISOString()
        supplier['Updated By'] = payload.createdBy || ''
        updateStockRow_(sheet, headers, rowNumber, supplier)
        SpreadsheetApp.flush()
        return { supplier: supplier }
      })
    }

    function setMachineStatus_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'Super Admin' && role !== 'Production Supervisor') {
        throw apiError_(403, 'Only the Super Admin or Production Supervisor can change machine status.')
      }
      return withWriteLock_(function () {
        const machineId = String(payload.machineId || '').trim()
        const status = String(payload.status || '').trim()
        if (!machineId || machineId.length > 100 || ['Idle', 'Running', 'Maintenance'].indexOf(status) < 0) {
          throw apiError_(400, 'Choose a valid machine and status.')
        }
        const sheet = spreadsheet.getSheetByName('Machines')
        if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) throw apiError_(404, 'Machine was not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        if (headers.indexOf('Machine ID') < 0 || headers.indexOf('Status') < 0) {
          throw apiError_(422, 'The Machines sheet is missing the Machine ID or Status column.')
        }
        const rowNumber = findStockRow_(sheet, headers, 'Machine ID', machineId)
        if (!rowNumber) throw apiError_(404, 'Machine was not found.')
        const record = readStockRow_(sheet, headers, rowNumber)
        if (String(record.Status || '') !== status) {
          const backupState = { created: false }
          createBackupOnce_(spreadsheet, backupState)
          record.Status = status
          updateStockRow_(sheet, headers, rowNumber, record)
          SpreadsheetApp.flush()
        }
        return {
          machine: {
            id: String(record['Machine ID'] || ''),
            name: String(record['Machine Name'] || ''),
            type: String(record['Machine Type'] || ''),
            operator: String(record.Operator || ''),
            status: String(record.Status || ''),
          },
        }
      })
    }

    function recordAccountExpense_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can record account expenses.')
      }
      return withWriteLock_(function () {
        const input = payload.expense || {}
        const date = String(input.date || '').trim()
        const parsedDate = Date.parse(date + 'T00:00:00.000Z')
        const amount = Number(input.amount)
        const category = String(input.category || '').trim()
        const description = String(input.description || '').trim()
        const paymentMethod = String(input.paymentMethod || '').trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsedDate) || new Date(parsedDate).toISOString().slice(0, 10) !== date) {
          throw apiError_(400, 'Enter a valid expense date.')
        }
        if (!category || category.length > 80 || !description || description.length > 300 ||
            /[\u0000-\u001f\u007f]/.test(category) || /[\u0000-\u001f\u007f]/.test(description)) {
          throw apiError_(400, 'Expense category and description are required and must fit the supported lengths.')
        }
        if (!isFinite(amount) || amount <= 0 || amount > 1000000000) throw apiError_(400, 'Enter a valid expense amount greater than zero.')
        if (['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'].indexOf(paymentMethod) < 0) {
          throw apiError_(400, 'Choose a valid payment method.')
        }
        if (String(input.referenceId || '').trim().length > 100) throw apiError_(400, 'Reference ID must be 100 characters or fewer.')
        const roundedAmount = Math.round(amount * 100) / 100
        if (roundedAmount <= 0) throw apiError_(400, 'Expense amount must be at least one cent.')
        const backupState = { created: false }
        const sheet = ensureStockSheet_(spreadsheet, 'Accounts_Expenses', ERP_ACCOUNT_EXPENSE_HEADERS, backupState)
        const expense = {
          'Expense ID': 'EXP-' + Utilities.getUuid(),
          Date: date,
          Category: category,
          Description: description,
          Amount: roundedAmount,
          'Payment Method': paymentMethod,
          'Reference ID': String(input.referenceId || '').trim(),
          'Created At': new Date().toISOString(),
          'Created By ID': payload.sessionUserId || '',
          'Created By': payload.createdBy || '',
        }
        createBackupOnce_(spreadsheet, backupState)
        appendStockRow_(sheet.sheet, sheet.headers, expense)
        SpreadsheetApp.flush()
        return { expense: expense }
      })
    }

    function addRawMaterial_(spreadsheet, payload) {
      requireProductionSupervisor_(payload)
      return withWriteLock_(function () {
        const sku = String(payload.sku || '').trim()
        const name = String(payload.name || '').trim()
        const unit = String(payload.unit || '').trim()
        const supplier = supplierById_(spreadsheet, payload.supplierId)
        if (!sku || !name || !unit || !supplier || String(supplier.Status || '').toLowerCase() !== 'active') {
          throw apiError_(400, 'Material SKU, name, unit, and an active supplier are required.')
        }
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
          Supplier: String(supplier['Supplier Name'] || ''),
          'Supplier ID': String(supplier['Supplier ID'] || ''),
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
            supplierId: supplier['Supplier ID'], supplier: supplier['Supplier Name'],
            unitCost: unitCost, totalCost: opening * unitCost,
          }), backupState)
        }
        SpreadsheetApp.flush()
        return { material: material, movement: movement }
      })
    }

    function applyStockMovement_(spreadsheet, payload) {
      requireProductionSupervisor_(payload)
      return withWriteLock_(function () {
        const kind = String(payload.kind || '')
        const sku = String(payload.sku || '').trim()
        const type = String(payload.type || '')
        const reason = String(payload.reason || '').trim()
        const referenceId = String(payload.referenceId || '').trim()
        const salesChannel = String(payload.salesChannel || '').trim()
        const deliveryPartner = String(payload.deliveryPartner || '').trim()
        const unitPriceInput = payload.unitPrice === undefined || payload.unitPrice === '' ? 0 : stockNumber_(payload.unitPrice, 'Unit sale price')
        if (unitPriceInput < 0) throw apiError_(400, 'Unit sale price cannot be negative.')
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
          if (['AMAZON', 'FLIPKART', 'MEESHO', 'SHOPIFY', 'MYNTRA', 'DIRECT', 'INDIAMART'].indexOf(salesChannel) < 0 || deliveryPartner.length > 100) {
            throw apiError_(400, 'Choose a supported delivery channel and a valid delivery partner.')
          }
          if (type === 'Dispatch' && !referenceId) throw apiError_(400, 'Enter the marketplace order number to enable order-linked returns.')
        }

        const isRaw = kind === 'raw'
        if (!isRaw && kind !== 'finished') throw apiError_(400, 'Choose raw material or finished goods.')
        const isPurchase = isRaw && type === 'Purchase Inward'
        const purchaseSupplierId = String(payload.supplierId || '').trim()
        const purchaseSupplier = isPurchase ? supplierById_(spreadsheet, purchaseSupplierId) : null
        let purchaseUnitCost = 0
        if (isPurchase) {
          if (!purchaseSupplier || String(purchaseSupplier.Status || '').toLowerCase() !== 'active') {
            throw apiError_(400, 'Choose an active supplier for this purchase.')
          }
          if (payload.unitCost === undefined || payload.unitCost === '') throw apiError_(400, 'Enter the purchase unit cost.')
          purchaseUnitCost = stockNumber_(payload.unitCost, 'Unit cost')
          if (purchaseUnitCost < 0) throw apiError_(400, 'Unit cost cannot be negative.')
        }
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
        let linkedDispatch = null
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
            linkedDispatch = dispatch
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
          const orderChannel = String(linkedSalesOrder['Sales Channel'] || 'DIRECT').trim()
          if (orderChannel !== salesChannel) throw apiError_(409, 'The selected sales order belongs to a different sales channel.')
          if (quantity > remainingOrderQuantity) throw apiError_(409, 'Dispatch quantity exceeds the remaining sales order quantity.')
        }
        if (type === 'Dispatch' && salesChannel === 'INDIAMART' && !linkedSalesOrder) {
          throw apiError_(409, 'Book an IndiaMART order before dispatching its stock.')
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
          if (type === 'Purchase Inward') {
            const cost = purchaseUnitCost
            const oldCost = stockNumber_(item['Average Unit Cost'], 'Average unit cost')
            item['Average Unit Cost'] = closing === 0 ? cost : ((opening * oldCost) + (quantity * cost)) / closing
            item.Supplier = String(purchaseSupplier['Supplier Name'] || '')
            item['Supplier ID'] = String(purchaseSupplier['Supplier ID'] || '')
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

        let recordedUnitPrice = unitPriceInput
        if (type === 'Dispatch') {
          if (linkedSalesOrder) recordedUnitPrice = stockNumber_(linkedSalesOrder['Unit Price'], 'Sales order unit price')
        } else if (linkedDispatch && recordedUnitPrice <= 0) {
          recordedUnitPrice = stockNumber_(linkedDispatch['Unit Price'], 'Dispatch unit price')
            || salesOrderUnitPrice_(spreadsheet, referenceId)
        }
        if (type === 'Dispatch' && recordedUnitPrice <= 0) {
          throw apiError_(400, 'Enter a positive sale price for this dispatch.')
        }

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
          supplierId: isPurchase ? purchaseSupplier['Supplier ID'] : '',
          supplier: isPurchase ? purchaseSupplier['Supplier Name'] : '',
          unitCost: isPurchase ? purchaseUnitCost : undefined,
          totalCost: isPurchase ? Math.round(quantity * purchaseUnitCost * 100) / 100 : undefined,
          unitPrice: recordedUnitPrice > 0 ? recordedUnitPrice : undefined,
          totalAmount: recordedUnitPrice > 0 ? Math.round(quantity * recordedUnitPrice * 100) / 100 : undefined,
        })
        appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        SpreadsheetApp.flush()
        return { item: item, movement: movement }
      })
    }

    function initializeZeroFinishedStock_(spreadsheet, payload) {
      requireProductionSupervisor_(payload)
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
      requireProductionSupervisor_(payload)
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
      requireProductionSupervisor_(payload)
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

    function ensureProductionHeaders_(spreadsheet, sheet, headers, requiredHeaders, backupState) {
      const missing = requiredHeaders.filter(function (header) { return headers.indexOf(header) < 0 })
      if (!missing.length) return
      createBackupOnce_(spreadsheet, backupState)
      sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing])
      headers.push.apply(headers, missing)
    }

    function recordProduction_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Production Supervisor') {
        throw apiError_(403, 'Only the Production Supervisor can record production.')
      }
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
        const required = ['Production ID', 'Date', 'Machine ID', 'Product Name', 'Master SKU', 'Actual Quantity', 'Rejected Quantity', 'Created By', 'Created Date']
        const missing = required.filter(function (header) { return productionHeaders.indexOf(header) < 0 })
        if (missing.length) throw apiError_(422, 'The Production sheet is missing required columns: ' + missing.join(', ') + '.')
        const productionBlock = String(record['Production Block'] || '').trim()
        if (['Block 1', 'Block 2', 'Block 3'].indexOf(productionBlock) < 0) throw apiError_(400, 'Choose a valid production time block.')
        assertRecordUnique_(spreadsheet, 'Production', record)
        const backupState = { created: false }
        ensureProductionHeaders_(spreadsheet, productionSheet, productionHeaders, [
          'Variant SKU', 'Production Block', 'QC Status', 'QC Approved Quantity',
          'QC Rejected Quantity', 'QC Reviewed By', 'QC Reviewed At',
        ], backupState)

        const finished = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
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
        const productionReceived = stockNumber_(item['Production Received'], 'Production received')
        const priorRejected = stockNumber_(item.Rejected, 'Rejected')
        const priorApprovedValue = item['Quality Approved']
        const priorApproved = priorApprovedValue === '' || priorApprovedValue === null || priorApprovedValue === undefined
          ? Math.max(0, productionReceived - priorRejected)
          : stockNumber_(priorApprovedValue, 'Quality approved')
        item['Production Received'] = productionReceived + actual
        item['Quality Approved'] = priorApproved
        item['Available Stock'] = finishedAvailableStock_(item)
        item['Last Updated'] = new Date().toISOString()
        record['QC Status'] = 'Pending'
        record['QC Approved Quantity'] = 0
        record['QC Rejected Quantity'] = 0
        record['QC Reviewed By'] = ''
        record['QC Reviewed At'] = ''

        createBackupOnce_(spreadsheet, backupState)
        productionSheet.appendRow(productionHeaders.map(function (header) {
          return safeCellValue_(record[header] === undefined ? '' : record[header])
        }))
        if (rowNumber) updateStockRow_(finished.sheet, finished.headers, rowNumber, item)
        else appendStockRow_(finished.sheet, finished.headers, item)
        SpreadsheetApp.flush()
        return { finishedGood: item, movement: null }
      })
    }

    function reviewProductionQuality_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Production Supervisor') {
        throw apiError_(403, 'Only the Production Supervisor can review production quality.')
      }
      return withWriteLock_(function () {
        const productionId = String(payload.productionId || '').trim()
        const approved = Number(payload.approved)
        const rejected = Number(payload.rejected)
        if (!productionId || productionId.length > 120) throw apiError_(400, 'Choose a valid production batch.')
        if (!Number.isInteger(approved) || approved < 0 || !Number.isInteger(rejected) || rejected < 0) {
          throw apiError_(400, 'QC pass and reject quantities must be whole numbers greater than or equal to zero.')
        }

        const productionSheet = spreadsheet.getSheetByName('Production')
        if (!productionSheet || productionSheet.getLastRow() < 2) throw apiError_(404, 'The production batch was not found.')
        const productionHeaders = productionSheet.getRange(1, 1, 1, productionSheet.getLastColumn())
          .getDisplayValues()[0].map(function (value) { return value.trim() })
        const productionRow = findStockRow_(productionSheet, productionHeaders, 'Production ID', productionId)
        if (!productionRow) throw apiError_(404, 'The production batch was not found.')
        const record = readStockRow_(productionSheet, productionHeaders, productionRow)
        const actual = stockNumber_(record['Actual Quantity'], 'Actual quantity')
        if (approved + rejected !== actual) {
          throw apiError_(400, 'QC pass and reject quantities must add up to the batch actual quantity (' + actual + ').')
        }
        if (String(record['QC Status'] || '').trim() !== 'Pending') {
          throw apiError_(409, 'This batch is not awaiting quality review.')
        }
        const sku = String(record['Variant SKU'] || record['Master SKU'] || '').trim()
        if (!sku) throw apiError_(409, 'The production batch has no SKU and cannot update finished-goods stock.')

        const backupState = { created: false, backupName: '' }
        const finished = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
        const movementSheet = ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
        const stockRow = findStockRow_(finished.sheet, finished.headers, 'Product SKU', sku)
        if (!stockRow) throw apiError_(409, 'The finished-goods stock record for this pending batch is missing.')
        const item = readStockRow_(finished.sheet, finished.headers, stockRow)
        if (String(item.Status || 'Active').toLowerCase() === 'archived') {
          throw apiError_(409, 'This finished-good SKU is archived and cannot receive QC-approved stock.')
        }
        const opening = finishedAvailableStock_(item)
        const approvedValue = item['Quality Approved']
        if (approvedValue === '' || approvedValue === null || approvedValue === undefined) {
          item['Quality Approved'] = Math.max(
            0,
            stockNumber_(item['Production Received'], 'Production received') - stockNumber_(item.Rejected, 'Rejected'),
          )
        }
        item['Quality Approved'] = stockNumber_(item['Quality Approved'], 'Quality approved') + approved
        item.Rejected = stockNumber_(item.Rejected, 'Rejected') + rejected
        item['Available Stock'] = finishedAvailableStock_(item)
        item['Last Updated'] = new Date().toISOString()
        record['QC Status'] = 'Reviewed'
        record['QC Approved Quantity'] = approved
        record['QC Rejected Quantity'] = rejected
        record['QC Reviewed By'] = String(payload.createdBy || '')
        record['QC Reviewed At'] = new Date().toISOString()

        createBackupOnce_(spreadsheet, backupState)
        updateStockRow_(productionSheet, productionHeaders, productionRow, record)
        updateStockRow_(finished.sheet, finished.headers, stockRow, item)
        let movement = null
        if (approved > 0) {
          movement = stockMovementRecord_({
            sku: sku, type: 'QC Approved', quantity: approved,
            referenceId: productionId, machineId: String(record['Machine ID'] || ''),
            reason: 'QC approved production batch; rejected quantity: ' + rejected,
            opening: opening, closing: item['Available Stock'],
            createdBy: String(payload.createdBy || ''), itemType: 'Finished Goods',
          })
          appendStockRow_(movementSheet.sheet, movementSheet.headers, movement)
        }
        SpreadsheetApp.flush()
        return { record: record, finishedGood: item, movement: movement, backupName: backupState.backupName }
      })
    }

    function graphicDesignTaskSheet_(spreadsheet, backupState) {
      return ensureStockSheet_(spreadsheet, 'Graphic_Design_Tasks', ERP_GRAPHIC_DESIGN_HEADERS, backupState)
    }

    function submitGraphicDesignTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Graphic Designer') {
        throw apiError_(403, 'Only a Graphic Designer can submit social content tasks.')
      }
      const plannedDate = String(payload.plannedDate || '').trim()
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(plannedDate)
      const month = String(payload.month || '').trim()
      const expectedMonth = plannedDate.slice(0, 7)
      const date = dateMatch ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), 12)) : null
      if (!date || date.toISOString().slice(0, 10) !== plannedDate || month !== expectedMonth) {
        throw apiError_(400, 'Choose a valid posting date within the selected month.')
      }
      const sku = String(payload.sku || '').trim()
      const productName = findCatalogProductName_(spreadsheet, sku)
      if (!sku || !productName) throw apiError_(400, 'Choose an active product or variant from the catalog.')
      const platforms = Array.isArray(payload.platforms)
        ? Array.from(new Set(payload.platforms.map(function (value) { return String(value || '').trim() })))
        : []
      const allowedPlatforms = ['Instagram', 'Facebook', 'YouTube', 'LinkedIn']
      if (!platforms.length || platforms.some(function (platform) { return allowedPlatforms.indexOf(platform) < 0 })) {
        throw apiError_(400, 'Choose at least one valid social platform.')
      }
      const contentType = String(payload.contentType || '').trim()
      if (['Post', 'Video'].indexOf(contentType) < 0) throw apiError_(400, 'Choose Post or Video content.')
      const brief = String(payload.brief || '').trim()
      const caption = String(payload.caption || '').trim()
      const script = String(payload.script || '').trim()
      if (!brief || brief.length > 2000 || caption.length > 2000 || script.length > 5000) {
        throw apiError_(400, 'Enter a brief and keep the brief, caption, and script within their character limits.')
      }
      const now = new Date().toISOString()
      const task = {
        'Task ID': Utilities.getUuid(),
        'Planned Date': plannedDate,
        Month: month,
        'Product SKU': sku,
        'Product Name': productName,
        Platforms: platforms.join(', '),
        'Content Type': contentType,
        Brief: brief,
        Caption: caption,
        Script: script,
        'Shoot Status': contentType === 'Video' ? 'Not started' : 'Not required',
        'Edit Status': 'Not started',
        'Review Status': 'Pending',
        'Review Note': '',
        'Created By ID': String(payload.sessionUserId || ''),
        'Created By': String(payload.createdBy || ''),
        'Created At': now,
        'Reviewed By': '',
        'Reviewed At': '',
      }
      if (!task['Created By ID']) throw apiError_(401, 'Sign in again before submitting a creative task.')
      return withWriteLock_(function () {
        const backupState = { created: false, backupName: '' }
        const sheet = graphicDesignTaskSheet_(spreadsheet, backupState)
        createBackupOnce_(spreadsheet, backupState)
        appendStockRow_(sheet.sheet, sheet.headers, task)
        SpreadsheetApp.flush()
        return { task: task, backupName: backupState.backupName }
      })
    }

    function updateGraphicDesignProgress_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (!['Graphic Designer', 'Super Admin'].includes(role)) {
        throw apiError_(403, 'Only the task owner or Super Admin can update creative production progress.')
      }
      return withWriteLock_(function () {
        const taskId = String(payload.taskId || '').trim()
        const shootStatus = String(payload.shootStatus || '').trim()
        const editStatus = String(payload.editStatus || '').trim()
        const validProgress = ['Not started', 'In progress', 'Completed']
        if (!taskId || taskId.length > 120 || validProgress.indexOf(editStatus) < 0 ||
            (shootStatus !== 'Not required' && validProgress.indexOf(shootStatus) < 0)) {
          throw apiError_(400, 'Choose valid shoot and edit statuses.')
        }
        const taskSheet = graphicDesignTaskSheet_(spreadsheet, { created: false, backupName: '' })
        const rowNumber = findStockRow_(taskSheet.sheet, taskSheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The creative task was not found.')
        const task = readStockRow_(taskSheet.sheet, taskSheet.headers, rowNumber)
        if (role === 'Graphic Designer' && String(task['Created By ID'] || '') !== String(payload.sessionUserId || '')) {
          throw apiError_(403, 'You can only update your own creative tasks.')
        }
        if (String(task['Review Status'] || '') === 'Rejected') {
          throw apiError_(409, 'This task was rejected. Submit a revised creative as a new task.')
        }
        if (String(task['Content Type'] || '') !== 'Video' && shootStatus !== 'Not required') {
          throw apiError_(400, 'Only video tasks can have shoot progress.')
        }
        const backupState = { created: false, backupName: '' }
        createBackupOnce_(spreadsheet, backupState)
        task['Shoot Status'] = shootStatus
        task['Edit Status'] = editStatus
        updateStockRow_(taskSheet.sheet, taskSheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: task, backupName: backupState.backupName }
      })
    }

    function reviewGraphicDesignTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can review social content tasks.')
      }
      return withWriteLock_(function () {
        const taskId = String(payload.taskId || '').trim()
        const decision = String(payload.decision || '').trim()
        const reviewNote = String(payload.reviewNote || '').trim()
        if (!taskId || taskId.length > 120 || ['Approved', 'Rejected'].indexOf(decision) < 0 || reviewNote.length > 1000) {
          throw apiError_(400, 'Choose an approval decision and keep review notes within 1,000 characters.')
        }
        const taskSheet = graphicDesignTaskSheet_(spreadsheet, { created: false, backupName: '' })
        const rowNumber = findStockRow_(taskSheet.sheet, taskSheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The creative task was not found.')
        const task = readStockRow_(taskSheet.sheet, taskSheet.headers, rowNumber)
        if (String(task['Review Status'] || '') !== 'Pending') {
          throw apiError_(409, 'This creative task has already been reviewed.')
        }
        const backupState = { created: false, backupName: '' }
        createBackupOnce_(spreadsheet, backupState)
        task['Review Status'] = decision
        task['Review Note'] = reviewNote
        task['Reviewed By'] = String(payload.createdBy || '')
        task['Reviewed At'] = new Date().toISOString()
        updateStockRow_(taskSheet.sheet, taskSheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: task, backupName: backupState.backupName }
      })
    }

    function getGraphicDesignReportFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_GRAPHIC_DESIGN_REPORT_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('graphicDesign', true).createFolder('Mahalaxmi ERP Private Graphic Design Daily Reports')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_GRAPHIC_DESIGN_REPORT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function submitGraphicDesignReport_(payload) {
      if (String(payload.sessionUserRole || '') !== 'Graphic Designer') {
        throw apiError_(403, 'Only a Graphic Designer can submit a daily report.')
      }
      const completed = String(payload.completed || '').trim()
      const pending = String(payload.pending || '').trim()
      const issues = String(payload.issues || '').trim()
      if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
        throw apiError_(400, 'Completed work is required; each report field must be 3,000 characters or fewer.')
      }
      const userId = String(payload.sessionUserId || '').trim()
      if (!userId) throw apiError_(401, 'Sign in again before submitting a daily report.')
      return withWriteLock_(function () {
        const date = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')
        const folder = getGraphicDesignReportFolder_(true)
        const fileName = 'report_' + date + '_' + userId.replace(/[^A-Za-z0-9_-]/g, '_') + '.json'
        const matchingFiles = folder.getFilesByName(fileName)
        const existingFile = matchingFiles.hasNext() ? matchingFiles.next() : null
        let previous = null
        if (existingFile) {
          try {
            previous = JSON.parse(existingFile.getBlob().getDataAsString())
          } catch (error) {
            throw apiError_(500, 'The existing Graphic Designer daily report is corrupted and was not overwritten.')
          }
          if (!previous || previous.kind !== ERP_GRAPHIC_DESIGN_REPORT_KIND || previous.version !== 1 ||
              previous.date !== date || previous.userId !== userId) {
            throw apiError_(500, 'The existing Graphic Designer daily report has an unsupported format and was not overwritten.')
          }
        }
        const now = new Date().toISOString()
        const report = {
          kind: ERP_GRAPHIC_DESIGN_REPORT_KIND,
          version: 1,
          id: previous ? previous.id : Utilities.getUuid(),
          date: date,
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

    function listGraphicDesignReports_(payload) {
      const role = String(payload.sessionUserRole || '')
      const userId = String(payload.sessionUserId || '').trim()
      if (!userId || (role !== 'Super Admin' && role !== 'Graphic Designer')) {
        throw apiError_(403, 'Only a Graphic Designer or Super Admin can view Graphic Design daily reports.')
      }
      const folder = getGraphicDesignReportFolder_(false)
      if (!folder) return { reports: [] }
      const reports = []
      const files = folder.getFiles()
      while (files.hasNext()) {
        const file = files.next()
        let report
        try {
          report = JSON.parse(file.getBlob().getDataAsString())
        } catch (error) {
          throw apiError_(500, 'A stored Graphic Designer daily report is corrupted.')
        }
        if (!report || report.kind !== ERP_GRAPHIC_DESIGN_REPORT_KIND || report.version !== 1 ||
            typeof report.id !== 'string' || typeof report.date !== 'string' ||
            typeof report.userId !== 'string' || typeof report.completed !== 'string' ||
            typeof report.pending !== 'string' || typeof report.issues !== 'string') {
          throw apiError_(500, 'A stored Graphic Designer daily report has an unsupported format.')
        }
        if (role === 'Graphic Designer' && report.userId !== userId) continue
        reports.push(report)
      }
      reports.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) })
      return { reports: reports }
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
      const enquiryDate = String(input.enquiryDate || Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')).trim()
      const name = String(input.name || '').trim()
      const company = String(input.company || '').trim()
      const phone = String(input.phone || '').trim()
      const location = String(input.location || '').trim()
      const email = String(input.email || '').trim()
      const productInterest = String(input.productInterest || '').trim()
      const notes = String(input.notes || '').trim()
      const referenceUrl = String(input.referenceUrl || '').trim()
      if (!name || name.length > 150 || /[\u0000-\u001f]/.test(name)) throw apiError_(400, 'Lead name is required and must be 150 characters or fewer.')
      if (company.length > 180 || phone.length > 40 || location.length > 240 || email.length > 180 || productInterest.length > 180 || notes.length > 1000) {
        throw apiError_(400, 'A lead field exceeds its allowed length.')
      }
      if (phone.replace(/\D/g, '').length < 7) throw apiError_(400, 'Enter a valid contact phone number.')
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError_(400, 'Enter a valid email address.')
      if (referenceUrl && (referenceUrl.length > 2000 || !/^https:\/\/[^\s]+$/i.test(referenceUrl))) {
        throw apiError_(400, 'Reference must be a valid HTTPS PDF or form link.')
      }
      if (!assignedUserId) throw apiError_(400, 'Assign the lead to an active Sales Executive.')
      const parsedEnquiryDate = new Date(enquiryDate + 'T00:00:00.000Z')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(enquiryDate) || Number.isNaN(parsedEnquiryDate.getTime()) ||
          parsedEnquiryDate.toISOString().slice(0, 10) !== enquiryDate) {
        throw apiError_(400, 'Enter a valid enquiry date.')
      }
      return {
        enquiryDate: enquiryDate,
        name: name,
        company: company,
        phone: phone,
        location: location,
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
        Location: input.location,
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
        'Enquiry Date': input.enquiryDate,
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
      const role = String(payload.sessionUserRole || '')
      const actorId = String(payload.sessionUserId || '').trim()
      if (['Super Admin', 'Sales Executive'].indexOf(role) < 0) throw apiError_(403, 'Only Sales Executives and the Super Admin can create sales leads.')
      return withWriteLock_(function () {
        const source = payload.lead
        if (!source || typeof source !== 'object' || Array.isArray(source)) throw apiError_(400, 'Enter lead details.')
        if (role === 'Sales Executive' && String(source.assignedUserId || '').trim() !== actorId) {
          throw apiError_(403, 'A Sales Executive can only create an enquiry assigned to their own account.')
        }
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

    function saveIndiaMartListings_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can manage IndiaMART listings.')
      }
      if (!Array.isArray(payload.listings) || payload.listings.length > 1000) {
        throw apiError_(400, 'Provide no more than 1,000 IndiaMART listings to save.')
      }
      return withWriteLock_(function () {
        const backupState = { created: false, backupName: '' }
        const target = ensureStockSheet_(spreadsheet, 'IndiaMART_Listings', ERP_INDIAMART_LISTING_HEADERS, backupState)
        const existing = readSheetRecords_(spreadsheet, 'IndiaMART_Listings')
        const updates = []
        const ids = {}
        const activeSkus = {}
        const normalized = payload.listings.map(function (entry, index) {
          if (!entry || typeof entry !== 'object') throw apiError_(400, 'IndiaMART listing ' + (index + 1) + ' is invalid.')
          const id = String(entry.id || '').trim()
          const productSku = String(entry.productSku || '').trim()
          const listingSku = String(entry.listingSku || '').trim()
          const productName = String(entry.productName || '').trim()
          const sourceUrl = String(entry.sourceUrl || '').trim()
          const imageUrl = String(entry.imageUrl || '').trim()
          const status = String(entry.status || '').trim()
          const listedPrice = entry.listedPrice === '' || entry.listedPrice === null || entry.listedPrice === undefined
            ? ''
            : stockNumber_(entry.listedPrice, 'IndiaMART listed price')
          const unitCost = entry.unitCost === '' || entry.unitCost === null || entry.unitCost === undefined
            ? ''
            : stockNumber_(entry.unitCost, 'IndiaMART unit cost')
          const listingInventory = entry.listingInventory === '' || entry.listingInventory === null || entry.listingInventory === undefined
            ? ''
            : Number(entry.listingInventory)
          if (!id || id.length > 100 || !productName || productName.length > 300 ||
              sourceUrl && !/^https:\/\/www\.mahalaxmienterprise\.in\.net(?:\/|$)/i.test(sourceUrl) ||
              imageUrl && !/^https:\/\/(?:[a-z0-9-]+\.)*imimg\.com\//i.test(imageUrl) ||
              ['Draft', 'Active', 'Inactive'].indexOf(status) < 0 ||
              listingSku && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(listingSku) ||
              listedPrice !== '' && (listedPrice < 0 || listedPrice > 100000000) ||
              unitCost !== '' && (unitCost < 0 || unitCost > 100000000) ||
              listingInventory !== '' && (!Number.isSafeInteger(listingInventory) || listingInventory < 0 || listingInventory > 1000000)) {
            throw apiError_(400, 'IndiaMART listing ' + (index + 1) + ' contains invalid data.')
          }
          if (ids[id.toLowerCase()]) throw apiError_(400, 'Duplicate IndiaMART listing ID: ' + id + '.')
          ids[id.toLowerCase()] = true
          if (status === 'Active') {
            if (!listingSku || !productSku || !listedPrice || unitCost === '' || listingInventory === '' || listingInventory < 1) {
              throw apiError_(400, 'Active IndiaMART listings require a listing SKU, mapped ERP SKU, positive price, unit cost, and listing inventory.')
            }
            const skuKey = listingSku.toLowerCase()
            if (activeSkus[skuKey]) throw apiError_(409, 'IndiaMART SKU ' + listingSku + ' is already in use.')
            activeSkus[skuKey] = true
            if (!findCatalogProductName_(spreadsheet, productSku)) {
              throw apiError_(409, 'Map active IndiaMART listings to an active ERP product SKU.')
            }
            const stockSheet = ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
            const stockRowNumber = findStockRow_(stockSheet.sheet, stockSheet.headers, 'Product SKU', productSku)
            if (!stockRowNumber || String(readStockRow_(stockSheet.sheet, stockSheet.headers, stockRowNumber).Status || '').toLowerCase() === 'archived') {
              throw apiError_(409, 'Map active IndiaMART listings to an ERP SKU with a non-archived finished-goods stock record.')
            }
          }
          return {
            'Listing ID': id,
            'Product SKU': productSku,
            'IndiaMART SKU': listingSku,
            'Product Name': productName,
            'Listed Price': listedPrice,
            'Unit Cost': unitCost,
            'Source URL': sourceUrl,
            'Image URL': imageUrl,
            'Listing Inventory': listingInventory,
            Status: status,
            'Updated At': new Date().toISOString(),
            'Updated By': String(payload.createdBy || ''),
          }
        })
        const submittedIds = {}
        normalized.forEach(function (listing) { submittedIds[String(listing['Listing ID']).toLowerCase()] = true })
        const existingIds = {}
        existing.forEach(function (listing) {
          const listingId = String(listing['Listing ID'] || '').trim().toLowerCase()
          if (!listingId || existingIds[listingId]) throw apiError_(409, 'Existing IndiaMART listings contain a duplicate or blank listing ID.')
          existingIds[listingId] = true
          if (submittedIds[listingId] || String(listing.Status || '') !== 'Active') return
          const sku = String(listing['IndiaMART SKU'] || '').trim().toLowerCase()
          if (!sku || activeSkus[sku]) throw apiError_(409, 'Existing IndiaMART listings contain duplicate active SKUs. Resolve them before saving.')
          activeSkus[sku] = true
        })
        createBackupOnce_(spreadsheet, backupState)
        normalized.forEach(function (listing) {
          const rowNumber = findStockRow_(target.sheet, target.headers, 'Listing ID', listing['Listing ID'])
          if (rowNumber) updateStockRow_(target.sheet, target.headers, rowNumber, listing)
          else appendStockRow_(target.sheet, target.headers, listing)
          updates.push(listing)
        })
        SpreadsheetApp.flush()
        return { listings: updates }
      })
    }

    function createSalesOrder_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Sales Executive') throw apiError_(403, 'Only a Sales Executive can book a sales order.')
      return withWriteLock_(function () {
        const leadId = String(payload.leadId || '').trim()
        const customerName = String(payload.customerName || '').trim()
        const requestedProductName = String(payload.productName || '').trim()
        const salesChannel = String(payload.salesChannel || 'DIRECT').trim()
        const listingId = String(payload.indiaMartListingId || '').trim()
        let sku = String(payload.sku || '').trim()
        const quantity = Number(payload.quantity)
        let unitPrice = Number(payload.unitPrice)
        let unitCost = ''
        let indiaMartSku = ''
        let listingProductName = ''
        const notes = String(payload.notes || '').trim()
        if ((!leadId && !customerName) || customerName.length > 180 || requestedProductName.length > 300 ||
            !Number.isInteger(quantity) || quantity < 1 || quantity > 100000 ||
            ['DIRECT', 'INDIAMART'].indexOf(salesChannel) < 0 ||
            salesChannel === 'DIRECT' && !sku ||
            salesChannel === 'INDIAMART' && !listingId) {
          throw apiError_(400, 'Choose an assigned lead or enter a customer name, choose a product SKU, and enter a whole-number quantity greater than zero.')
        }
        if (salesChannel === 'DIRECT' && (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 100000000) || notes.length > 500) {
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
        if (salesChannel === 'INDIAMART') {
          const listingSheet = ensureStockSheet_(spreadsheet, 'IndiaMART_Listings', ERP_INDIAMART_LISTING_HEADERS, backupState)
          const listingRowNumber = findStockRow_(listingSheet.sheet, listingSheet.headers, 'Listing ID', listingId)
          if (!listingRowNumber) throw apiError_(404, 'IndiaMART listing was not found.')
          const listing = readStockRow_(listingSheet.sheet, listingSheet.headers, listingRowNumber)
          if (String(listing.Status || '') !== 'Active') throw apiError_(409, 'This IndiaMART listing is not active.')
          sku = String(listing['Product SKU'] || '').trim()
          indiaMartSku = String(listing['IndiaMART SKU'] || '').trim()
          listingProductName = String(listing['Product Name'] || '').trim()
          unitPrice = stockNumber_(listing['Listed Price'], 'IndiaMART listed price')
          unitCost = stockNumber_(listing['Unit Cost'], 'IndiaMART unit cost')
          if (!sku || !indiaMartSku || !listingProductName || unitPrice <= 0 || unitCost < 0) {
            throw apiError_(409, 'This IndiaMART listing is missing its mapped SKU, price, or cost.')
          }
        }
        const catalogProductName = findCatalogProductName_(spreadsheet, sku)
        if (!catalogProductName) throw apiError_(404, 'Choose an active SKU from the product catalog.')
        const productName = salesChannel === 'INDIAMART' ? listingProductName : requestedProductName || catalogProductName

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
          'Sales Channel': salesChannel,
          'IndiaMART Listing ID': salesChannel === 'INDIAMART' ? listingId : '',
          'IndiaMART SKU': indiaMartSku,
          'Unit Cost': unitCost,
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
          createdBy: payload.createdBy, itemType: 'Finished Goods', salesChannel: salesChannel,
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
          createdBy: payload.createdBy, itemType: 'Finished Goods', salesChannel: String(order['Sales Channel'] || 'DIRECT'),
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

    function appendUser_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const user = payload.user
        const actorRole = String(payload.sessionUserRole || '')
        const actorId = String(payload.sessionUserId || '')
        if (!user || user.Role === 'Super Admin') throw apiError_(403, 'Only the initial account can be Super Admin.')
        if (actorRole !== 'Super Admin' && !(actorRole === 'E-commerce Manager' && user.Role === 'E-commerce Executive')) {
          throw apiError_(403, 'This account cannot create the requested user role.')
        }
        const users = readSheetRecords_(spreadsheet, 'Users')
        if (user.Role === 'E-commerce Executive') {
          const managerId = String(user['Manager ID'] || '').trim()
          if (managerId) {
            const manager = users.find(function (row) {
              const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
              return active && String(row['User ID'] || '').trim() === managerId && String(row.Role || '').trim() === 'E-commerce Manager'
            })
            if (!manager) throw apiError_(400, 'Choose an active E-commerce Manager.')
          } else if (actorRole !== 'Super Admin') {
            throw apiError_(400, 'An E-commerce Manager must create executives assigned to their account.')
          }
          if (actorRole === 'E-commerce Manager' && managerId !== actorId) {
            throw apiError_(403, 'An E-commerce Manager can only create executives who report to them.')
          }
        } else if (String(user['Manager ID'] || '').trim()) {
          throw apiError_(400, 'Only E-commerce Executives can be assigned to an E-commerce Manager.')
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

    function ecommercePlatformsForManager_(spreadsheet, managerId) {
      const assigned = {}
      readSheetRecords_(spreadsheet, 'Users').forEach(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        if (!active || String(row.Role || '').trim() !== 'E-commerce Executive' ||
            String(row['Manager ID'] || '').trim() !== String(managerId || '').trim()) return
        String(row['Assigned Platforms'] || '').split(',').forEach(function (platform) {
          const normalized = platform.trim().toUpperCase()
          if (ERP_ECOMMERCE_PLATFORMS.indexOf(normalized) >= 0) assigned[normalized] = true
        })
      })
      return ERP_ECOMMERCE_PLATFORMS.filter(function (platform) { return assigned[platform] })
    }

    function assertEcommercePlatformAccess_(payload, platform, spreadsheet) {
      const normalizedPlatform = String(platform || '').trim().toUpperCase()
      if (ERP_ECOMMERCE_PLATFORMS.indexOf(normalizedPlatform) < 0) throw apiError_(400, 'Choose a valid marketplace platform.')
      const role = String(payload.sessionUserRole || '')
      if (role === 'Super Admin' || role === 'Production Supervisor') return normalizedPlatform
      if (role === 'E-commerce Manager') {
        if (!spreadsheet || ecommercePlatformsForManager_(spreadsheet, payload.sessionUserId).indexOf(normalizedPlatform) < 0) {
          throw apiError_(403, 'This marketplace platform is not assigned to your executive team.')
        }
        return normalizedPlatform
      }
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
      const platform = assertEcommercePlatformAccess_(payload, payload.platform, spreadsheet)
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

    function getCameraRecordingFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_CAMERA_RECORDING_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      const folderName = 'Mahalaxmi ERP Private Camera Recordings'
      const existingFolders = DriveApp.getFoldersByName(folderName)
      let existingFolder = null
      if (existingFolders.hasNext()) {
        existingFolder = existingFolders.next()
        if (existingFolders.hasNext()) throw apiError_(409, 'Multiple private camera recording folders were found. Contact the administrator.')
      }
      if (existingFolder) {
        if (existingFolder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          throw apiError_(403, 'The private camera recording folder has unexpected sharing permissions.')
        }
        properties.setProperty(ERP_CAMERA_RECORDING_FOLDER_PROPERTY, existingFolder.getId())
        return existingFolder
      }
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('camera', true).createFolder(folderName)
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_CAMERA_RECORDING_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function getCameraUserRecordingFolder_(userId, userName, createIfMissing) {
      const propertyName = 'ERP_CAMERA_RECORDING_USER_FOLDER_' + userId
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(propertyName)
      if (folderId) return DriveApp.getFolderById(folderId)
      const root = getCameraRecordingFolder_(createIfMissing)
      if (!root) return null
      const safeName = String(userName || 'Team member').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim().slice(0, 80) || 'Team member'
      const folderName = safeName + ' (' + userId + ')'
      const existingFolders = root.getFoldersByName(folderName)
      let existingFolder = null
      if (existingFolders.hasNext()) {
        existingFolder = existingFolders.next()
        if (existingFolders.hasNext()) throw apiError_(409, 'Multiple recording folders exist for this team member. Contact the administrator.')
      }
      if (existingFolder) {
        if (existingFolder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          throw apiError_(403, 'The team member recording folder has unexpected sharing permissions.')
        }
        properties.setProperty(propertyName, existingFolder.getId())
        return existingFolder
      }
      if (!createIfMissing) return null
      const folder = root.createFolder(folderName)
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(propertyName, folder.getId())
      return folder
    }

    function startCameraClipUpload_(payload) {
      const userId = String(payload.sessionUserId || '').trim()
      const userName = String(payload.createdBy || '').trim()
      const recordingType = String(payload.kind || 'camera')
      const startedAt = Number(payload.startedAt)
      const totalBytes = Number(payload.totalBytes)
      const fileName = String(payload.fileName || '').trim()
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) throw apiError_(400, 'A valid camera user is required.')
      if (!userName || userName.length > 180) throw apiError_(400, 'A valid camera user name is required.')
      if (recordingType !== 'screen') throw apiError_(403, 'Webcam recording is disabled. Only screen clips can be uploaded.')
      if (!Number.isSafeInteger(startedAt) || String(startedAt).length !== 13 || startedAt > Date.now() + 60000) {
        throw apiError_(400, 'A valid camera clip start time is required.')
      }
      if (!Number.isSafeInteger(totalBytes) || totalBytes < 1 || totalBytes > 100 * 1024 * 1024) {
        throw apiError_(413, 'Camera clips must be 100 MB or smaller.')
      }
      const expectedName = recordingType + '-' + userId + '-' + startedAt + '.webm'
      if (fileName !== expectedName) throw apiError_(400, 'The recording clip name is invalid.')

      const folder = getCameraUserRecordingFolder_(userId, userName, true)
      const uploadedAt = new Date().toISOString()
      const metadata = {
        name: fileName,
        mimeType: 'video/webm',
        parents: [folder.getId()],
        description: JSON.stringify({
          kind: recordingType === 'screen' ? ERP_SCREEN_RECORDING_KIND : ERP_CAMERA_RECORDING_KIND,
          recordingType: recordingType,
          userId: userId,
          userName: userName,
          startedAt: startedAt,
          uploadedAt: uploadedAt,
        }),
      }
      const response = UrlFetchApp.fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime',
        {
          method: 'post',
          contentType: 'application/json; charset=utf-8',
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
            'X-Upload-Content-Type': 'video/webm',
            'X-Upload-Content-Length': String(totalBytes),
          },
          payload: JSON.stringify(metadata),
          muteHttpExceptions: true,
          followRedirects: false,
        }
      )
      const status = response.getResponseCode()
      const headers = response.getAllHeaders()
      const locationKey = Object.keys(headers).filter(function (key) { return key.toLowerCase() === 'location' })[0]
      const uploadUrl = locationKey ? String(headers[locationKey] || '') : ''
      if ((status !== 200 && status !== 201) || !uploadUrl) {
        Logger.log('Google Drive could not create a camera upload session; HTTP status ' + status)
        throw apiError_(502, 'Google Drive could not start the camera clip upload.')
      }
      return { uploadUrl: uploadUrl, chunkSize: ERP_CAMERA_UPLOAD_CHUNK_MAX_BYTES }
    }

    function uploadCameraClipChunk_(payload) {
      const uploadUrl = String(payload.uploadUrl || '')
      if (
        !/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/.test(uploadUrl) ||
        !/[?&]uploadType=resumable(?:&|$)/.test(uploadUrl) ||
        !/[?&]upload_id=[^&]+/.test(uploadUrl)
      ) throw apiError_(400, 'The camera clip upload session is invalid.')

      const startByte = Number(payload.startByte)
      const endByte = Number(payload.endByte)
      const totalBytes = Number(payload.totalBytes)
      const base64 = String(payload.base64 || '')
      if (
        !Number.isSafeInteger(startByte) ||
        !Number.isSafeInteger(endByte) ||
        !Number.isSafeInteger(totalBytes) ||
        startByte < 0 ||
        endByte < startByte ||
        endByte >= totalBytes ||
        totalBytes > 100 * 1024 * 1024 ||
        base64.length > Math.ceil(ERP_CAMERA_UPLOAD_CHUNK_MAX_BYTES / 3) * 4 + 4
      ) throw apiError_(400, 'The camera clip upload range is invalid.')
      const bytes = Utilities.base64Decode(base64)
      if (
        bytes.length !== endByte - startByte + 1 ||
        bytes.length > ERP_CAMERA_UPLOAD_CHUNK_MAX_BYTES ||
        (endByte + 1 < totalBytes && bytes.length % (256 * 1024) !== 0)
      ) throw apiError_(400, 'The camera clip upload chunk is invalid.')

      const response = UrlFetchApp.fetch(uploadUrl, {
        method: 'put',
        contentType: 'video/webm',
        headers: { 'Content-Range': 'bytes ' + startByte + '-' + endByte + '/' + totalBytes },
        payload: bytes,
        muteHttpExceptions: true,
        followRedirects: false,
      })
      const status = response.getResponseCode()
      if (status === 308) {
        const headers = response.getAllHeaders()
        const rangeKey = Object.keys(headers).filter(function (key) { return key.toLowerCase() === 'range' })[0]
        const range = rangeKey ? String(headers[rangeKey] || '') : ''
        const match = /^bytes=0-(\d+)$/.exec(range)
        if (!match) throw apiError_(502, 'Google Drive did not confirm camera clip upload progress. Retry the upload.')
        return { complete: false, nextOffset: Number(match[1]) + 1 }
      }
      if (status !== 200 && status !== 201) {
        Logger.log('Google Drive camera clip upload failed; HTTP status ' + status)
        throw apiError_(502, 'Google Drive could not save a camera clip. Retry the upload.')
      }
      let result = {}
      try {
        result = JSON.parse(response.getContentText())
      } catch (error) {
        throw apiError_(502, 'Google Drive returned an invalid camera clip response.')
      }
      if (!result.id || Number(result.size) !== totalBytes) {
        throw apiError_(502, 'Google Drive did not confirm the complete camera clip. Retry the upload.')
      }
      return { complete: true, fileId: String(result.id) }
    }

    function parseCameraRecordingMetadata_(file) {
      let metadata
      try {
        metadata = JSON.parse(file.getDescription() || '{}')
      } catch (error) {
        return null
      }
      if (
        (metadata.kind !== ERP_CAMERA_RECORDING_KIND && metadata.kind !== ERP_SCREEN_RECORDING_KIND) ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(String(metadata.userId || '')) ||
        !Number.isSafeInteger(Number(metadata.startedAt))
      ) return null
      if (metadata.recordingType !== 'camera' && metadata.recordingType !== 'screen') {
        metadata.recordingType = metadata.kind === ERP_SCREEN_RECORDING_KIND ? 'screen' : 'camera'
      }
      return metadata
    }

    function appendCameraClipsFromFolder_(folder, cutoff, clips) {
      const files = folder.getFiles()
      while (files.hasNext()) {
        const file = files.next()
        const metadata = parseCameraRecordingMetadata_(file)
        const startedAt = metadata ? Number(metadata.startedAt) : 0
        if (!metadata || startedAt < cutoff || startedAt > Date.now() + 60000 || file.getSize() < 1) continue
        clips.push({
          id: file.getId(),
          userId: String(metadata.userId),
          userName: String(metadata.userName || 'Team member'),
          kind: String(metadata.recordingType),
          startedAt: new Date(startedAt).toISOString(),
          uploadedAt: String(metadata.uploadedAt || ''),
          size: file.getSize(),
          mimeType: file.getMimeType(),
        })
      }
    }

    function listCameraClips_() {
      const root = getCameraRecordingFolder_(false)
      if (!root) return { clips: [] }
      const cutoff = Date.now() - ERP_CAMERA_RECORDING_RETENTION_MS
      const clips = []
      appendCameraClipsFromFolder_(root, cutoff, clips)
      const folders = root.getFolders()
      while (folders.hasNext()) appendCameraClipsFromFolder_(folders.next(), cutoff, clips)
      clips.sort(function (left, right) { return String(right.startedAt).localeCompare(String(left.startedAt)) })
      return { clips: clips }
    }

    function readCameraClipRange_(payload) {
      const fileId = String(payload.fileId || '').trim()
      const startByte = Number(payload.startByte)
      const endByte = Number(payload.endByte)
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw apiError_(400, 'A valid camera clip is required.')
      if (!Number.isSafeInteger(startByte) || !Number.isSafeInteger(endByte) || startByte < 0 || endByte < startByte) {
        throw apiError_(400, 'The camera clip range is invalid.')
      }
      if (endByte - startByte + 1 > ERP_CAMERA_UPLOAD_CHUNK_MAX_BYTES) {
        throw apiError_(413, 'Camera clip playback range is too large.')
      }
      if (!getCameraRecordingFolder_(false)) throw apiError_(404, 'Camera clip was not found.')
      let file
      try {
        file = DriveApp.getFileById(fileId)
      } catch (error) {
        throw apiError_(404, 'Camera clip was not found.')
      }
      const metadata = parseCameraRecordingMetadata_(file)
      const parents = file.getParents()
      const root = getCameraRecordingFolder_(false)
      const userFolder = metadata
        ? getCameraUserRecordingFolder_(String(metadata.userId), String(metadata.userName || ''), false)
        : null
      const parent = parents.hasNext() ? parents.next() : null
      const parentIsValid = Boolean(parent && root && (
        parent.getId() === root.getId() ||
        (userFolder && parent.getId() === userFolder.getId())
      ))
      if (
        !metadata ||
        Number(metadata.startedAt) < Date.now() - ERP_CAMERA_RECORDING_RETENTION_MS ||
        !parentIsValid
      ) {
        throw apiError_(404, 'Camera clip was not found.')
      }
      const totalBytes = file.getSize()
      if (startByte >= totalBytes) throw apiError_(416, 'The camera clip range is outside the file.')
      const actualEnd = Math.min(endByte, totalBytes - 1)
      const response = UrlFetchApp.fetch(
        'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media',
        {
          method: 'get',
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
            Range: 'bytes=' + startByte + '-' + actualEnd,
          },
          muteHttpExceptions: true,
        }
      )
      if (response.getResponseCode() !== 206) {
        Logger.log('Google Drive camera clip range read failed; HTTP status ' + response.getResponseCode())
        throw apiError_(502, 'Google Drive could not stream the camera clip.')
      }
      const bytes = response.getContent()
      if (bytes.length !== actualEnd - startByte + 1) throw apiError_(502, 'Google Drive returned an incomplete camera clip range.')
      return {
        base64: Utilities.base64Encode(bytes),
        startByte: startByte,
        endByte: actualEnd,
        totalBytes: totalBytes,
        mimeType: file.getMimeType() || 'video/webm',
      }
    }

    function cleanupExpiredCameraClips_() {
      const root = getCameraRecordingFolder_(false)
      if (!root) return 0
      const cutoff = Date.now() - ERP_CAMERA_RECORDING_RETENTION_MS
      const expired = []
      const rootFiles = root.getFiles()
      while (rootFiles.hasNext()) {
        const file = rootFiles.next()
        const metadata = parseCameraRecordingMetadata_(file)
        if (metadata && Number(metadata.startedAt) <= cutoff) expired.push(file)
      }
      const folders = root.getFolders()
      while (folders.hasNext()) {
        const files = folders.next().getFiles()
        while (files.hasNext()) {
          const file = files.next()
          const metadata = parseCameraRecordingMetadata_(file)
          if (!metadata || Number(metadata.startedAt) > cutoff) continue
          expired.push(file)
        }
      }
      expired.forEach(function (file) {
        try {
          file.setTrashed(true)
        } catch (error) {
          Logger.log('Could not move expired camera clip to Drive Trash ' + file.getId() + ': ' + String(error))
          throw apiError_(500, 'Expired camera clips could not be moved to Drive Trash. Please retry shortly.')
        }
      })
      return expired.length
    }

    function permanentlyDeleteWorkbookBackup_(file) {
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
        Logger.log('Drive API could not permanently delete expired ERP backup ' + file.getId() + '; HTTP status ' + status)
        throw apiError_(500, 'Expired ERP backups could not be permanently deleted. Please retry shortly.')
      }
    }

    function cleanupExpiredWorkbookBackups_() {
      return withWriteLock_(function () {
        const spreadsheetId = PropertiesService.getScriptProperties().getProperty('ERP_SPREADSHEET_ID')
        if (!spreadsheetId) throw apiError_(503, 'Configure ERP API access before cleaning workbook backups.')
        const masterFile = DriveApp.getFileById(spreadsheetId)
        const backupPrefix = masterFile.getName() + '-Backup-'
        const backupById = new Map()
        const parents = masterFile.getParents()
        let parentCount = 0
        while (parents.hasNext()) {
          parentCount += 1
          const files = parents.next().getFiles()
          while (files.hasNext()) {
            const file = files.next()
            const name = file.getName()
            const timestamp = name.slice(backupPrefix.length)
            if (
              name.indexOf(backupPrefix) !== 0 ||
              !/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(timestamp) ||
              file.getMimeType() !== MimeType.GOOGLE_SHEETS
            ) continue
            backupById.set(file.getId(), { file: file, createdAt: file.getDateCreated().getTime() })
          }
        }
        if (!parentCount) {
          const files = DriveApp.getRootFolder().getFiles()
          while (files.hasNext()) {
            const file = files.next()
            const name = file.getName()
            const timestamp = name.slice(backupPrefix.length)
            if (
              name.indexOf(backupPrefix) !== 0 ||
              !/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(timestamp) ||
              file.getMimeType() !== MimeType.GOOGLE_SHEETS
            ) continue
            backupById.set(file.getId(), { file: file, createdAt: file.getDateCreated().getTime() })
          }
        }

        const backups = Array.from(backupById.values())
        if (!backups.length) return 0
        const newest = backups.reduce(function (latest, backup) {
          return backup.createdAt > latest.createdAt ? backup : latest
        })
        const cutoff = Date.now() - ERP_WORKBOOK_BACKUP_RETENTION_MS
        let deleted = 0
        backups.forEach(function (backup) {
          if (backup.file.getId() === newest.file.getId() || backup.createdAt >= cutoff) return
          permanentlyDeleteWorkbookBackup_(backup.file)
          deleted += 1
        })
        return deleted
      })
    }

    function cleanupExpiredWorkbookBackupsScheduled_() {
      return cleanupExpiredWorkbookBackups_()
    }

    function getEcommerceLabelFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_ECOMMERCE_LABEL_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('ecommerce', true).createFolder('Mahalaxmi ERP Private E-commerce Labels')
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
        const handlers = [
          ERP_ECOMMERCE_LABEL_CLEANUP_HANDLER,
          ERP_AUDIT_CLEANUP_HANDLER,
          ERP_WORKBOOK_BACKUP_CLEANUP_HANDLER,
        ]
        handlers.forEach(function (handler) {
          const exists = ScriptApp.getProjectTriggers().some(function (trigger) {
            return trigger.getHandlerFunction() === handler
          })
          if (!exists) ScriptApp.newTrigger(handler).timeBased().everyHours(1).create()
        })
        const chatCleanupExists = ScriptApp.getProjectTriggers().some(function (trigger) {
          return trigger.getHandlerFunction() === ERP_CHAT_CLEANUP_HANDLER
        })
        if (!chatCleanupExists) {
          ScriptApp.newTrigger(ERP_CHAT_CLEANUP_HANDLER).timeBased().everyMinutes(15).create()
        }
      })
    }

    function installEcommerceLabelCleanupTrigger() {
      verifyCameraDriveUploadAuthorization_()
      ensureEcommerceLabelCleanupTrigger_()
      return cleanupExpiredEcommerceLabels_() + cleanupExpiredWorkbookBackups_()
    }

    function authorizeCameraClipUploads() {
      verifyCameraDriveUploadAuthorization_()
      return { authorized: true }
    }

    function verifyCameraDriveUploadAuthorization_() {
      const response = UrlFetchApp.fetch(
        'https://www.googleapis.com/drive/v3/about?fields=kind',
        {
          method: 'get',
          headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
          muteHttpExceptions: true,
        }
      )
      const status = response.getResponseCode()
      if (status !== 200) {
        let failureDetails = ''
        try {
          const responseBody = JSON.parse(response.getContentText() || '{}')
          const driveError = responseBody && responseBody.error
          const reasons = driveError && Array.isArray(driveError.errors)
            ? driveError.errors.map(function (item) { return String(item.reason || '') }).join(' ')
            : ''
          failureDetails = [
            reasons,
            driveError && driveError.status,
            driveError && driveError.message,
          ].filter(Boolean).join(': ')
        } catch (error) {
          failureDetails = ''
        }
        Logger.log('Drive API authorization check failed with HTTP status ' + status + (failureDetails ? ': ' + failureDetails.slice(0, 500) : ''))
        if (/accessNotConfigured|SERVICE_DISABLED|serviceDisabled|has not been used|is disabled|not enabled/i.test(failureDetails)) {
          throw apiError_(500, 'Enable the Google Drive API in the Google Cloud project linked to this Apps Script project, then run authorizeCameraClipUploads again.')
        }
        throw apiError_(500, 'Google Drive authorization check failed with HTTP status ' + status + '. Run authorizeCameraClipUploads in the Apps Script editor and approve the requested Drive and external-request permissions.')
      }
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
        const expired = []
        if (folder) {
          const cutoff = Date.now() - ERP_ECOMMERCE_LABEL_RETENTION_MS
          const files = folder.getFiles()
          while (files.hasNext()) {
            const file = files.next()
            if (ecommerceLabelExpired_(file, cutoff)) expired.push(file)
          }
          expired.forEach(permanentlyDeleteEcommerceLabel_)
        }
        return expired.length + cleanupExpiredCameraClips_()
      })
    }

    function cleanupExpiredAuditEventsScheduled_() {
      return withWriteLock_(function () {
        return cleanupExpiredAuditEvents_(auditSpreadsheet_(false))
      })
    }

    function uploadEcommerceLabel_(payload) {
      if (String(payload.sessionUserRole || '') !== 'E-commerce Executive') {
        throw apiError_(403, 'Only an E-commerce Executive can upload shipping labels.')
      }
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

    function listEcommerceLabels_(spreadsheet, payload) {
      if (['E-commerce Executive', 'E-commerce Manager', 'Production Supervisor'].indexOf(String(payload.sessionUserRole || '')) < 0) {
        throw apiError_(403, 'This account cannot view shipping labels.')
      }
      const platform = String(payload.platform || '').trim().toUpperCase()
      if (platform) assertEcommercePlatformAccess_(payload, platform, spreadsheet)
      const managerPlatforms = payload.sessionUserRole === 'E-commerce Manager'
        ? ecommercePlatformsForManager_(spreadsheet, payload.sessionUserId)
        : []
      const folder = getEcommerceLabelFolder_(false)
      if (!folder) return { labels: [] }
      cleanupExpiredEcommerceLabels_()
      const labels = []
      const files = folder.getFiles()
      while (files.hasNext()) {
        const metadata = ecommerceLabelMetadata_(files.next())
        if ((!platform || metadata.platform === platform) &&
            (payload.sessionUserRole !== 'E-commerce Executive' ||
              (Array.isArray(payload.sessionUserPlatforms) && payload.sessionUserPlatforms.indexOf(metadata.platform) >= 0)) &&
            (payload.sessionUserRole !== 'E-commerce Manager' || managerPlatforms.indexOf(metadata.platform) >= 0)) {
          labels.push(metadata)
        }
      }
      labels.sort(function (a, b) { return String(b.uploadedAt).localeCompare(String(a.uploadedAt)) })
      return { labels: labels }
    }

    function downloadEcommerceLabel_(spreadsheet, payload) {
      if (['E-commerce Executive', 'E-commerce Manager', 'Production Supervisor'].indexOf(String(payload.sessionUserRole || '')) < 0) {
        throw apiError_(403, 'This account cannot download shipping labels.')
      }
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
        assertEcommercePlatformAccess_(payload, metadata.platform, spreadsheet)
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
      const folder = getErpStorageCategoryFolder_('ecommerce', true).createFolder('Mahalaxmi ERP Private E-commerce Daily Reports')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_ECOMMERCE_REPORT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function submitEcommerceReport_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'E-commerce Executive' && role !== 'E-commerce Manager') {
        throw apiError_(403, 'Only an E-commerce Executive or Manager can submit a daily report.')
      }
      const platform = role === 'E-commerce Manager'
        ? 'TEAM'
        : assertEcommercePlatformAccess_(payload, payload.platform, spreadsheet)
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
      if (role !== 'Super Admin' && role !== 'E-commerce Executive' && role !== 'E-commerce Manager') {
        throw apiError_(403, 'Only an E-commerce Executive, E-commerce Manager, or Super Admin can view daily reports.')
      }
      const sessionUserId = String(payload.sessionUserId || '')
      const teamIds = {}
      if (role === 'E-commerce Manager') {
        readSheetRecords_(spreadsheet, 'Users').forEach(function (row) {
          if (String(row.Role || '').trim() === 'E-commerce Executive' &&
              String(row['Manager ID'] || '').trim() === sessionUserId) {
            teamIds[String(row['User ID'] || '').trim()] = true
          }
        })
      }
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
            (ERP_ECOMMERCE_PLATFORMS.indexOf(report.platform) < 0 && report.platform !== 'TEAM')) {
          throw apiError_(500, 'A stored daily report has an unsupported format.')
        }
        if (role === 'E-commerce Executive' && String(report.userId || '') !== sessionUserId) continue
        if (role === 'E-commerce Manager') {
          const reportUserId = String(report.userId || '')
          if (report.platform === 'TEAM' ? reportUserId !== sessionUserId : !teamIds[reportUserId]) continue
        }
        reports.push(report)
      }
      reports.sort(function (a, b) { return String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) })
      return { reports: reports }
    }

    function importMarketplaceReconciliation_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'E-commerce Executive') {
        throw apiError_(403, 'Only an E-commerce Executive can import marketplace reports.')
      }
      if (!Array.isArray(payload.rows) || payload.rows.length < 1 || payload.rows.length > 1000) {
        throw apiError_(400, 'Import between 1 and 1,000 report rows at a time.')
      }
      const headers = [
        'Record ID', 'Record Type', 'Platform', 'Transaction Date', 'Order ID', 'Settlement ID',
        'Platform SKU', 'ERP SKU', 'Quantity', 'Gross Sales', 'Refunds', 'Marketplace Fees',
        'Shipping Fees', 'Advertising Fees', 'Other Charges', 'Tax Withheld', 'Product Cost',
        'Expected Settlement', 'Bank Credit', 'Imported By', 'Imported At',
      ]
      return withWriteLock_(function () {
        const target = ensureStockSheet_(spreadsheet, 'Marketplace_Reconciliation', headers)
        const existing = readSheetRecords_(spreadsheet, 'Marketplace_Reconciliation')
        const seen = {}
        existing.forEach(function (record) {
          const key = [record.Platform, record['Record Type'], record['Record ID']].join('|').toUpperCase()
          seen[key] = true
        })
        let imported = 0
        let duplicates = 0
        payload.rows.forEach(function (source, index) {
          if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw apiError_(400, 'Marketplace report row ' + (index + 2) + ' is invalid.')
          }
          const recordType = String(source.recordType || '').trim().toUpperCase()
          if (recordType !== 'ORDER' && recordType !== 'SETTLEMENT') {
            throw apiError_(400, 'Marketplace report row ' + (index + 2) + ' must be ORDER or SETTLEMENT.')
          }
          const platform = assertEcommercePlatformAccess_(payload, source.platform, spreadsheet)
          const recordId = String(source.recordId || '').trim()
          const transactionDate = String(source.transactionDate || '').trim()
          const orderId = String(source.orderId || '').trim()
          const settlementId = String(source.settlementId || '').trim()
          const platformSku = String(source.platformSku || '').trim()
          const erpSku = String(source.erpSku || '').trim()
          const quantity = Number(source.quantity || 0)
          if (!recordId || recordId.length > 200 ||
              !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
              !Number.isInteger(quantity) || quantity < 0 ||
              (recordType === 'ORDER' && (!orderId || (!platformSku && !erpSku) || quantity < 1)) ||
              (recordType === 'SETTLEMENT' && !settlementId)) {
            throw apiError_(400, 'Marketplace report row ' + (index + 2) + ' is missing required fields or has invalid values.')
          }
          const key = [platform, recordType, recordId].join('|').toUpperCase()
          if (seen[key]) {
            duplicates += 1
            return
          }
          const numericFields = [
            ['grossSales', 'Gross Sales'], ['refunds', 'Refunds'], ['marketplaceFees', 'Marketplace Fees'],
            ['shippingFees', 'Shipping Fees'], ['advertisingFees', 'Advertising Fees'],
            ['otherCharges', 'Other Charges'], ['taxWithheld', 'Tax Withheld'],
            ['expectedSettlement', 'Expected Settlement'],
          ]
          const record = {
            'Record ID': recordId,
            'Record Type': recordType,
            Platform: platform,
            'Transaction Date': transactionDate,
            'Order ID': orderId,
            'Settlement ID': settlementId,
            'Platform SKU': platformSku,
            'ERP SKU': erpSku,
            Quantity: quantity,
            'Product Cost': source.productCost === null || source.productCost === '' ? '' : Number(source.productCost),
            'Bank Credit': source.bankCredit === null || source.bankCredit === '' ? '' : Number(source.bankCredit),
            'Imported By': String(payload.createdBy || ''),
            'Imported At': new Date().toISOString(),
          }
          numericFields.forEach(function (field) {
            const value = Number(source[field[0]] || 0)
            if (!Number.isFinite(value) || Math.abs(value) > 1000000000000) {
              throw apiError_(400, 'Marketplace report row ' + (index + 2) + ' has an invalid ' + field[1] + '.')
            }
            record[field[1]] = value
          })
          ;['Product Cost', 'Bank Credit'].forEach(function (field) {
            const value = record[field]
            if (value !== '' && (!Number.isFinite(value) || Math.abs(value) > 1000000000000)) {
              throw apiError_(400, 'Marketplace report row ' + (index + 2) + ' has an invalid ' + field + '.')
            }
          })
          appendStockRow_(target.sheet, target.headers, record)
          seen[key] = true
          imported += 1
        })
        return { imported: imported, duplicates: duplicates }
      })
    }

    function listMarketplaceReconciliation_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can view marketplace reconciliation.')
      }
      return {
        records: readSheetRecords_(spreadsheet, 'Marketplace_Reconciliation'),
        expenses: readSheetRecords_(spreadsheet, 'Accounts_Expenses').map(function (record) {
          return { Date: record.Date, Amount: record.Amount }
        }),
      }
    }

    function listEcommerceTasks_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      const userId = String(payload.sessionUserId || '').trim()
      if (!userId || ['Super Admin', 'E-commerce Manager', 'E-commerce Executive'].indexOf(role) < 0) {
        throw apiError_(403, 'Only E-commerce users and the Super Admin can view daily tasks.')
      }
      const tasks = readSheetRecords_(spreadsheet, 'Ecommerce_Tasks').filter(function (task) {
        if (role === 'E-commerce Manager') return String(task['Manager ID'] || '').trim() === userId
        if (role === 'E-commerce Executive') return String(task['Executive ID'] || '').trim() === userId
        return true
      }).map(function (task) {
        const status = String(task.Status || '')
        if (['Assigned', 'In Progress', 'Submitted', 'Needs Changes', 'Approved'].indexOf(status) < 0) {
          throw apiError_(500, 'The Ecommerce_Tasks sheet contains an invalid task status.')
        }
        return {
          id: String(task['Task ID'] || ''),
          managerId: String(task['Manager ID'] || ''),
          managerName: String(task['Manager Name'] || ''),
          executiveId: String(task['Executive ID'] || ''),
          executiveName: String(task['Executive Name'] || ''),
          taskDate: String(task['Task Date'] || ''),
          title: String(task.Title || ''),
          description: String(task.Description || ''),
          status: status,
          createdAt: String(task['Created At'] || ''),
          updatedAt: String(task['Updated At'] || ''),
          reviewedBy: String(task['Reviewed By'] || ''),
          reviewedAt: String(task['Reviewed At'] || ''),
          reviewNote: String(task['Review Note'] || ''),
        }
      })
      tasks.sort(function (a, b) {
        return String(b.taskDate).localeCompare(String(a.taskDate)) || String(b.createdAt).localeCompare(String(a.createdAt))
      })
      return { tasks: tasks }
    }

    function createEcommerceTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'E-commerce Manager') {
        throw apiError_(403, 'Only an E-commerce Manager can assign daily tasks.')
      }
      const managerId = String(payload.sessionUserId || '').trim()
      const executiveId = String(payload.executiveId || '').trim()
      const taskDate = String(payload.taskDate || '').trim()
      const title = String(payload.title || '').trim()
      const description = String(payload.description || '').trim()
      const date = /^\d{4}-\d{2}-\d{2}$/.test(taskDate) ? new Date(taskDate + 'T00:00:00Z') : null
      if (!date || isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== taskDate ||
          !/^[A-Za-z0-9_-]{1,120}$/.test(executiveId) || !title || title.length > 200 ||
          ecommerceTaskHasControlCharacters_(title, false) || description.length > 2000 ||
          ecommerceTaskHasControlCharacters_(description, true)) {
        throw apiError_(400, 'Enter a valid task date, an active team executive, a task title up to 200 characters, and details up to 2,000 characters.')
      }
      return withWriteLock_(function () {
        const executive = readSheetRecords_(spreadsheet, 'Users').find(function (row) {
          const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
          return active && String(row['User ID'] || '').trim() === executiveId &&
            String(row.Role || '').trim() === 'E-commerce Executive' &&
            String(row['Manager ID'] || '').trim() === managerId
        })
        if (!executive) throw apiError_(404, 'Choose an active E-commerce Executive who reports to you.')
        const now = new Date().toISOString()
        const task = {
          'Task ID': Utilities.getUuid(),
          'Manager ID': managerId,
          'Manager Name': String(payload.createdBy || ''),
          'Executive ID': executiveId,
          'Executive Name': String(executive.Name || ''),
          'Task Date': taskDate,
          Title: title,
          Description: description,
          Status: 'Assigned',
          'Created At': now,
          'Updated At': now,
          'Reviewed By ID': '',
          'Reviewed By': '',
          'Reviewed At': '',
          'Review Note': '',
        }
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Ecommerce_Tasks', ERP_ECOMMERCE_TASK_HEADERS, backupState)
        createBackupOnce_(spreadsheet, backupState)
        appendStockRow_(sheet.sheet, sheet.headers, task)
        SpreadsheetApp.flush()
        return { task: {
          id: task['Task ID'],
          managerId: task['Manager ID'],
          managerName: task['Manager Name'],
          executiveId: task['Executive ID'],
          executiveName: task['Executive Name'],
          taskDate: task['Task Date'],
          title: task.Title,
          description: task.Description,
          status: task.Status,
          createdAt: task['Created At'],
          updatedAt: task['Updated At'],
          reviewedBy: task['Reviewed By'],
          reviewedAt: task['Reviewed At'],
          reviewNote: task['Review Note'],
        }, backupName: backupState.backupName }
      })
    }

    function ecommerceTaskHasControlCharacters_(value, allowLineFeed) {
      return String(value || '').split('').some(function (character) {
        const code = character.charCodeAt(0)
        return (code < 32 && !(allowLineFeed && code === 10)) || code === 127
      })
    }

    function updateEcommerceTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'E-commerce Executive') {
        throw apiError_(403, 'Only the assigned E-commerce Executive can update task progress.')
      }
      const taskId = String(payload.taskId || '').trim()
      const status = String(payload.status || '').trim()
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(taskId) || ['In Progress', 'Submitted'].indexOf(status) < 0) {
        throw apiError_(400, 'Choose a valid task and progress status.')
      }
      return withWriteLock_(function () {
        if (!spreadsheet.getSheetByName('Ecommerce_Tasks')) throw apiError_(404, 'The assigned daily task was not found.')
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Ecommerce_Tasks', ERP_ECOMMERCE_TASK_HEADERS, backupState)
        const rowNumber = findStockRow_(sheet.sheet, sheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The assigned daily task was not found.')
        const task = readStockRow_(sheet.sheet, sheet.headers, rowNumber)
        if (String(task['Executive ID'] || '') !== String(payload.sessionUserId || '').trim()) {
          throw apiError_(403, 'You can only update tasks assigned to your account.')
        }
        if (['Assigned', 'In Progress', 'Needs Changes'].indexOf(String(task.Status || '')) < 0) {
          throw apiError_(409, 'This task is already awaiting review or has been approved.')
        }
        createBackupOnce_(spreadsheet, backupState)
        task.Status = status
        task['Updated At'] = new Date().toISOString()
        if (status === 'Submitted') {
          task['Reviewed By ID'] = ''
          task['Reviewed By'] = ''
          task['Reviewed At'] = ''
          task['Review Note'] = ''
        }
        updateStockRow_(sheet.sheet, sheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: task, backupName: backupState.backupName }
      })
    }

    function reviewEcommerceTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'E-commerce Manager') {
        throw apiError_(403, 'Only the owning E-commerce Manager can review task completion.')
      }
      const taskId = String(payload.taskId || '').trim()
      const decision = String(payload.decision || '').trim()
      const reviewNote = String(payload.reviewNote || '').trim()
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(taskId) || ['Approved', 'Needs Changes'].indexOf(decision) < 0 ||
          reviewNote.length > 1000 || (decision === 'Needs Changes' && !reviewNote)) {
        throw apiError_(400, 'Choose a review decision; a note of up to 1,000 characters is required when requesting changes.')
      }
      return withWriteLock_(function () {
        if (!spreadsheet.getSheetByName('Ecommerce_Tasks')) throw apiError_(404, 'The daily task was not found.')
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Ecommerce_Tasks', ERP_ECOMMERCE_TASK_HEADERS, backupState)
        const rowNumber = findStockRow_(sheet.sheet, sheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The daily task was not found.')
        const task = readStockRow_(sheet.sheet, sheet.headers, rowNumber)
        if (String(task['Manager ID'] || '') !== String(payload.sessionUserId || '').trim()) {
          throw apiError_(403, 'You can only review tasks assigned by your manager account.')
        }
        if (String(task.Status || '') !== 'Submitted') {
          throw apiError_(409, 'Only tasks submitted for review can be approved or returned for changes.')
        }
        createBackupOnce_(spreadsheet, backupState)
        task.Status = decision
        task['Updated At'] = new Date().toISOString()
        task['Reviewed By ID'] = String(payload.sessionUserId || '')
        task['Reviewed By'] = String(payload.createdBy || '')
        task['Reviewed At'] = task['Updated At']
        task['Review Note'] = reviewNote
        updateStockRow_(sheet.sheet, sheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: task, backupName: backupState.backupName }
      })
    }

    function dailyTaskPublicRecord_(task) {
      return {
        id: String(task['Task ID'] || ''),
        taskDate: String(task['Task Date'] || ''),
        title: String(task.Title || ''),
        description: String(task.Description || ''),
        attachmentName: String(task['Attachment Name'] || ''),
        assigneeId: String(task['Assigned To ID'] || ''),
        assigneeName: String(task['Assigned To Name'] || ''),
        assigneeRole: String(task['Assigned To Role'] || ''),
        createdBy: String(task['Created By'] || ''),
        createdAt: String(task['Created At'] || ''),
        updatedAt: String(task['Updated At'] || ''),
        status: String(task.Status || ''),
        completed: String(task['Completed Work'] || ''),
        pending: String(task['Pending Work'] || ''),
        issues: String(task.Issues || ''),
        reviewedBy: String(task['Reviewed By'] || ''),
        reviewedAt: String(task['Reviewed At'] || ''),
        reviewNote: String(task['Review Note'] || ''),
      }
    }

    function listDailyTasks_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      const userId = String(payload.sessionUserId || '').trim()
      const validRoles = ['Super Admin', 'Production Supervisor', 'Machine Operator', 'Store Manager', 'E-commerce Manager', 'E-commerce Executive', 'Sales Executive', 'Graphic Designer']
      if (!userId || validRoles.indexOf(role) < 0) throw apiError_(403, 'This account cannot view company daily tasks.')
      const tasks = readSheetRecords_(spreadsheet, 'Daily_Tasks').filter(function (task) {
        return role === 'Super Admin' || String(task['Assigned To ID'] || '').trim() === userId
      }).map(function (task) {
        const status = String(task.Status || '')
        if (['Assigned', 'In Progress', 'Submitted', 'Needs Changes', 'Approved'].indexOf(status) < 0) {
          throw apiError_(500, 'The Daily_Tasks sheet contains an invalid task status.')
        }
        return dailyTaskPublicRecord_(task)
      })
      tasks.sort(function (a, b) {
        return String(b.taskDate).localeCompare(String(a.taskDate)) || String(b.createdAt).localeCompare(String(a.createdAt))
      })
      return { tasks: tasks }
    }

    function getDailyTaskAttachmentFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_DAILY_TASK_ATTACHMENT_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('dailyTasks', true).createFolder('Mahalaxmi ERP Private Daily Task Attachments')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_DAILY_TASK_ATTACHMENT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function createDailyTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can assign company daily tasks.')
      }
      const taskDate = String(payload.taskDate || '').trim()
      const date = /^\d{4}-\d{2}-\d{2}$/.test(taskDate) ? new Date(taskDate + 'T00:00:00Z') : null
      const title = String(payload.title || '').trim()
      const description = String(payload.description || '').replace(/\r\n?/g, '\n').trim()
      const recipientIds = Array.isArray(payload.recipientIds) ? payload.recipientIds : []
      if (!date || isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== taskDate ||
          !title || title.length > 200 || ecommerceTaskHasControlCharacters_(title, false) ||
          !description || description.length > 3000 || ecommerceTaskHasControlCharacters_(description, true) ||
          recipientIds.length === 0 || recipientIds.length > 500) {
        throw apiError_(400, 'Enter a valid task date, title, instructions, and at least one employee.')
      }
      const uniqueRecipientIds = Array.from(new Set(recipientIds.map(function (value) { return String(value || '').trim() })))
      if (uniqueRecipientIds.length !== recipientIds.length || uniqueRecipientIds.some(function (id) {
        return !/^[A-Za-z0-9._:-]{1,120}$/.test(id)
      })) {
        throw apiError_(400, 'Choose valid employee accounts for this task.')
      }
      const users = readSheetRecords_(spreadsheet, 'Users')
      const employees = uniqueRecipientIds.map(function (id) {
        const user = users.find(function (row) {
          const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
          return active && String(row['User ID'] || '').trim() === id &&
            String(row.Role || '').trim() !== 'Super Admin'
        })
        if (!user) throw apiError_(400, 'Tasks can only be assigned to active non-admin employee accounts.')
        return user
      })
      let attachment = null
      if (payload.attachment !== undefined && payload.attachment !== null) {
        if (!payload.attachment || typeof payload.attachment !== 'object' || Array.isArray(payload.attachment)) {
          throw apiError_(400, 'Choose a valid PDF or TXT attachment.')
        }
        const fileName = String(payload.attachment.fileName || '').trim()
        const mimeType = String(payload.attachment.mimeType || '').trim().toLowerCase()
        const base64 = String(payload.attachment.base64 || '')
        const isPdf = /\.pdf$/i.test(fileName) && mimeType === 'application/pdf'
        const isText = /\.txt$/i.test(fileName) && mimeType === 'text/plain'
        if (!fileName || fileName.length > 180 || /[\\/:*?"<>|\r\n]/.test(fileName) ||
            (!isPdf && !isText) || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) ||
            base64.length > 4200000) {
          throw apiError_(400, 'Attach a PDF or TXT file up to 3 MB.')
        }
        const bytes = Utilities.base64Decode(base64)
        if (bytes.length === 0 || bytes.length > ERP_DAILY_TASK_ATTACHMENT_MAX_BYTES ||
            (isPdf && (bytes.length < 5 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45)) ||
            (isText && bytes.indexOf(0) >= 0)) {
          throw apiError_(400, 'The attachment must be a valid PDF or text file up to 3 MB.')
        }
        attachment = { fileName: fileName, mimeType: mimeType, bytes: bytes }
      }

      return withWriteLock_(function () {
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Daily_Tasks', ERP_DAILY_TASK_HEADERS, backupState)
        createBackupOnce_(spreadsheet, backupState)
        let attachmentFile = null
        if (attachment) {
          const folder = getDailyTaskAttachmentFolder_(true)
          attachmentFile = folder.createFile(Utilities.newBlob(attachment.bytes, attachment.mimeType, attachment.fileName))
          try {
            attachmentFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
            attachmentFile.setDescription(JSON.stringify({ kind: 'mahalaxmi-erp-daily-task-attachment' }))
          } catch (error) {
            attachmentFile.setTrashed(true)
            throw error
          }
        }
        const now = new Date().toISOString()
        const records = employees.map(function (employee) {
          return {
            'Task ID': Utilities.getUuid(),
            'Task Date': taskDate,
            Title: title,
            Description: description,
            'Attachment ID': attachmentFile ? attachmentFile.getId() : '',
            'Attachment Name': attachmentFile ? attachment.fileName : '',
            'Attachment MIME Type': attachmentFile ? attachment.mimeType : '',
            'Assigned To ID': String(employee['User ID'] || ''),
            'Assigned To Name': String(employee.Name || ''),
            'Assigned To Role': String(employee.Role || ''),
            'Created By ID': String(payload.sessionUserId || ''),
            'Created By': String(payload.createdBy || ''),
            'Created At': now,
            'Updated At': now,
            Status: 'Assigned',
            'Completed Work': '',
            'Pending Work': '',
            Issues: '',
            'Reviewed By ID': '',
            'Reviewed By': '',
            'Reviewed At': '',
            'Review Note': '',
          }
        })
        try {
          const startRow = sheet.sheet.getLastRow() + 1
          sheet.sheet.getRange(startRow, 1, records.length, sheet.headers.length).setValues(records.map(function (record) {
            return sheet.headers.map(function (header) {
              return safeCellValue_(record[header] === undefined ? '' : record[header])
            })
          }))
          SpreadsheetApp.flush()
        } catch (error) {
          if (attachmentFile) attachmentFile.setTrashed(true)
          throw error
        }
        return { tasks: records.map(dailyTaskPublicRecord_), backupName: backupState.backupName }
      })
    }

    function updateDailyTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') === 'Super Admin') {
        throw apiError_(403, 'Super Admin reviews employee submissions instead of reporting on assigned tasks.')
      }
      const taskId = String(payload.taskId || '').trim()
      const status = String(payload.status || '').trim()
      const completed = String(payload.completed || '').replace(/\r\n?/g, '\n').trim()
      const pending = String(payload.pending || '').replace(/\r\n?/g, '\n').trim()
      const issues = String(payload.issues || '').replace(/\r\n?/g, '\n').trim()
      if (!/^[A-Za-z0-9._:-]{1,120}$/.test(taskId) || ['In Progress', 'Submitted'].indexOf(status) < 0 ||
          [completed, pending, issues].some(function (value) { return value.length > 3000 || ecommerceTaskHasControlCharacters_(value, true) }) ||
          (status === 'Submitted' && !completed)) {
        throw apiError_(400, 'Enter a completed-work summary up to 3,000 characters before submitting.')
      }
      return withWriteLock_(function () {
        if (!spreadsheet.getSheetByName('Daily_Tasks')) throw apiError_(404, 'The assigned daily task was not found.')
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Daily_Tasks', ERP_DAILY_TASK_HEADERS, backupState)
        const rowNumber = findStockRow_(sheet.sheet, sheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The assigned daily task was not found.')
        const task = readStockRow_(sheet.sheet, sheet.headers, rowNumber)
        if (String(task['Assigned To ID'] || '').trim() !== String(payload.sessionUserId || '').trim()) {
          throw apiError_(403, 'You can only update tasks assigned to your account.')
        }
        if (['Assigned', 'In Progress', 'Needs Changes'].indexOf(String(task.Status || '')) < 0) {
          throw apiError_(409, 'This task is already awaiting review or has been approved.')
        }
        createBackupOnce_(spreadsheet, backupState)
        task.Status = status
        task['Completed Work'] = completed
        task['Pending Work'] = pending
        task.Issues = issues
        task['Updated At'] = new Date().toISOString()
        if (status === 'Submitted') {
          task['Reviewed By ID'] = ''
          task['Reviewed By'] = ''
          task['Reviewed At'] = ''
          task['Review Note'] = ''
        }
        updateStockRow_(sheet.sheet, sheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: dailyTaskPublicRecord_(task), backupName: backupState.backupName }
      })
    }

    function reviewDailyTask_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can review company daily tasks.')
      }
      const taskId = String(payload.taskId || '').trim()
      const decision = String(payload.decision || '').trim()
      const reviewNote = String(payload.reviewNote || '').trim()
      if (!/^[A-Za-z0-9._:-]{1,120}$/.test(taskId) || ['Approved', 'Needs Changes'].indexOf(decision) < 0 ||
          reviewNote.length > 1000 || ecommerceTaskHasControlCharacters_(reviewNote, true) ||
          (decision === 'Needs Changes' && !reviewNote)) {
        throw apiError_(400, 'Choose a valid review decision; a note is required when requesting changes.')
      }
      return withWriteLock_(function () {
        if (!spreadsheet.getSheetByName('Daily_Tasks')) throw apiError_(404, 'The daily task was not found.')
        const backupState = { created: false, backupName: '' }
        const sheet = ensureStockSheet_(spreadsheet, 'Daily_Tasks', ERP_DAILY_TASK_HEADERS, backupState)
        const rowNumber = findStockRow_(sheet.sheet, sheet.headers, 'Task ID', taskId)
        if (!rowNumber) throw apiError_(404, 'The daily task was not found.')
        const task = readStockRow_(sheet.sheet, sheet.headers, rowNumber)
        if (String(task.Status || '') !== 'Submitted') throw apiError_(409, 'Only submitted tasks can be reviewed.')
        createBackupOnce_(spreadsheet, backupState)
        task.Status = decision
        task['Updated At'] = new Date().toISOString()
        task['Reviewed By ID'] = String(payload.sessionUserId || '')
        task['Reviewed By'] = String(payload.createdBy || '')
        task['Reviewed At'] = task['Updated At']
        task['Review Note'] = reviewNote
        updateStockRow_(sheet.sheet, sheet.headers, rowNumber, task)
        SpreadsheetApp.flush()
        return { task: dailyTaskPublicRecord_(task), backupName: backupState.backupName }
      })
    }

    function downloadDailyTaskAttachment_(spreadsheet, payload) {
      const taskId = String(payload.taskId || '').trim()
      const userId = String(payload.sessionUserId || '').trim()
      const role = String(payload.sessionUserRole || '')
      if (!taskId || !userId) throw apiError_(400, 'A valid daily task is required.')
      const task = readSheetRecords_(spreadsheet, 'Daily_Tasks').find(function (record) {
        return String(record['Task ID'] || '').trim() === taskId
      })
      if (!task || (role !== 'Super Admin' && String(task['Assigned To ID'] || '').trim() !== userId)) {
        throw apiError_(404, 'The task attachment was not found.')
      }
      const fileId = String(task['Attachment ID'] || '').trim()
      if (!fileId) throw apiError_(404, 'This task has no attachment.')
      const folder = getDailyTaskAttachmentFolder_(false)
      if (!folder) throw apiError_(404, 'The task attachment was not found.')
      const file = DriveApp.getFileById(fileId)
      const parents = file.getParents()
      let belongsToTaskFolder = false
      while (parents.hasNext()) {
        if (parents.next().getId() === folder.getId()) belongsToTaskFolder = true
      }
      if (!belongsToTaskFolder || file.getSharingAccess() !== DriveApp.Access.PRIVATE ||
          file.getDescription() !== JSON.stringify({ kind: 'mahalaxmi-erp-daily-task-attachment' })) {
        throw apiError_(404, 'The task attachment was not found.')
      }
      return {
        fileName: String(task['Attachment Name'] || file.getName()),
        mimeType: String(task['Attachment MIME Type'] || file.getMimeType()),
        base64: Utilities.base64Encode(file.getBlob().getBytes()),
      }
    }

    function getSalesReportFolder_(createIfMissing) {
      const properties = PropertiesService.getScriptProperties()
      const folderId = properties.getProperty(ERP_SALES_REPORT_FOLDER_PROPERTY)
      if (folderId) return DriveApp.getFolderById(folderId)
      if (!createIfMissing) return null
      const folder = getErpStorageCategoryFolder_('sales', true).createFolder('Mahalaxmi ERP Private Sales Daily Reports')
      folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      properties.setProperty(ERP_SALES_REPORT_FOLDER_PROPERTY, folder.getId())
      return folder
    }

    function submitSalesReport_(payload) {
      if (payload.sessionUserRole !== 'Sales Executive') throw apiError_(403, 'Only a Sales Executive can submit a daily sales report.')
      const completed = String(payload.completed || '').trim()
      const pending = String(payload.pending || '').trim()
      const issues = String(payload.issues || '').trim()
      if (!completed || completed.length > 3000 || pending.length > 3000 || issues.length > 3000) {
        throw apiError_(400, 'Completed work is required; each report field must be 3,000 characters or fewer.')
      }
      return withWriteLock_(function () {
        const date = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd')
        const userId = String(payload.sessionUserId || '')
        if (!userId) throw apiError_(401, 'Sign in again before submitting a daily sales report.')
        const folder = getSalesReportFolder_(true)
        const fileName = 'sales_report_' + date + '_' + userId.replace(/[^A-Za-z0-9_-]/g, '_') + '.json'
        const matchingFiles = folder.getFilesByName(fileName)
        const existingFile = matchingFiles.hasNext() ? matchingFiles.next() : null
        let previous = null
        if (existingFile) {
          try {
            previous = JSON.parse(existingFile.getBlob().getDataAsString())
          } catch (error) {
            throw apiError_(500, 'The existing daily sales report is corrupted and was not overwritten.')
          }
          if (!previous || previous.kind !== 'mahalaxmi-erp-sales-report' || previous.version !== 1 ||
              previous.userId !== userId || previous.date !== date || typeof previous.id !== 'string') {
            throw apiError_(500, 'The existing daily sales report has an unsupported format and was not overwritten.')
          }
        }
        const now = new Date().toISOString()
        const report = {
          kind: 'mahalaxmi-erp-sales-report',
          version: 1,
          id: previous ? previous.id : Utilities.getUuid(),
          date: date,
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

    function listSalesReports_(payload) {
      const role = String(payload.sessionUserRole || '')
      if (['Super Admin', 'Production Supervisor', 'Sales Executive'].indexOf(role) < 0) {
        throw apiError_(403, 'This account cannot view Sales daily reports.')
      }
      const sessionUserId = String(payload.sessionUserId || '')
      if (!sessionUserId) throw apiError_(401, 'Sign in again before viewing daily sales reports.')
      const folder = getSalesReportFolder_(false)
      if (!folder) return { reports: [] }
      const reports = []
      const files = folder.getFiles()
      while (files.hasNext()) {
        const file = files.next()
        let report
        try {
          report = JSON.parse(file.getBlob().getDataAsString())
        } catch (error) {
          throw apiError_(500, 'A stored Sales daily report is corrupted.')
        }
        const validDate = report && typeof report.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(report.date) &&
          !isNaN(Date.parse(report.date + 'T00:00:00.000Z')) &&
          new Date(Date.parse(report.date + 'T00:00:00.000Z')).toISOString().slice(0, 10) === report.date
        if (!report || report.kind !== 'mahalaxmi-erp-sales-report' || report.version !== 1 ||
            typeof report.id !== 'string' || !report.id || !validDate ||
            typeof report.userId !== 'string' || !report.userId ||
            typeof report.userName !== 'string' || typeof report.completed !== 'string' ||
            typeof report.pending !== 'string' || typeof report.issues !== 'string' ||
            report.completed.length > 3000 || report.pending.length > 3000 || report.issues.length > 3000) {
          throw apiError_(500, 'A stored Sales daily report has an unsupported format.')
        }
        if (role === 'Sales Executive' && report.userId !== sessionUserId) continue
        reports.push(report)
      }
      reports.sort(function (a, b) {
        return String(b.date || '').localeCompare(String(a.date || '')) ||
          String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
      })
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

    function ecommerceManagerTarget_(properties, managerId) {
      const dailyValue = properties.getProperty(ERP_ECOMMERCE_MANAGER_DAILY_TARGET_PREFIX + managerId)
      const monthlyValue = properties.getProperty(ERP_ECOMMERCE_MANAGER_MONTHLY_TARGET_PREFIX + managerId)
      const dailyTarget = dailyValue === null ? 0 : Number(dailyValue)
      const monthlyTarget = monthlyValue === null ? 0 : Number(monthlyValue)
      if (!Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
          !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
        throw apiError_(500, 'The saved order target for this manager is invalid.')
      }
      return { dailyTarget: dailyTarget, monthlyTarget: monthlyTarget }
    }

    function ecommerceTargetPlatforms_(user) {
      return String(user['Assigned Platforms'] || '').split(',').map(function (platform) {
        return platform.trim().toUpperCase()
      }).filter(function (platform) {
        return ERP_ECOMMERCE_PLATFORMS.indexOf(platform) >= 0
      })
    }

    function getEcommerceTargets_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      if (role !== 'E-commerce Executive' && role !== 'E-commerce Manager' && role !== 'Super Admin') {
        throw apiError_(403, 'This account cannot view e-commerce targets.')
      }
      const properties = PropertiesService.getScriptProperties()
      const users = readSheetRecords_(spreadsheet, 'Users')
      if (role === 'E-commerce Executive') {
        const executiveId = String(payload.sessionUserId || '').trim()
        if (!/^[A-Za-z0-9_-]{1,120}$/.test(executiveId)) throw apiError_(401, 'Sign in again before viewing targets.')
        return { targets: ecommerceExecutiveTarget_(properties, executiveId) }
      }

      const managerId = String(payload.sessionUserId || '').trim()
      if (role === 'E-commerce Manager' && !/^[A-Za-z0-9_-]{1,120}$/.test(managerId)) {
        throw apiError_(401, 'Sign in again before viewing manager targets.')
      }
      const executives = users.filter(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        return active && String(row.Role || '').trim() === 'E-commerce Executive' &&
          (role !== 'E-commerce Manager' || String(row['Manager ID'] || '').trim() === managerId)
      }).map(function (row) {
        const executiveId = String(row['User ID'] || '').trim()
        const target = ecommerceExecutiveTarget_(properties, executiveId)
        return {
          executiveId: executiveId,
          executiveName: String(row.Name || '').trim(),
          platforms: ecommerceTargetPlatforms_(row),
          dailyTarget: target.dailyTarget,
          monthlyTarget: target.monthlyTarget,
        }
      })
      if (role === 'E-commerce Manager') {
        const target = ecommerceManagerTarget_(properties, managerId)
        return { targets: { dailyTarget: target.dailyTarget, monthlyTarget: target.monthlyTarget, executives: executives } }
      }
      const managers = users.filter(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        return active && String(row.Role || '').trim() === 'E-commerce Manager'
      }).map(function (row) {
        const id = String(row['User ID'] || '').trim()
        const platforms = {}
        users.forEach(function (executive) {
          const active = executive.Active === true || ['true', '1', 'yes'].indexOf(String(executive.Active || '').toLowerCase()) >= 0
          if (!active || String(executive.Role || '').trim() !== 'E-commerce Executive' ||
              String(executive['Manager ID'] || '').trim() !== id) return
          ecommerceTargetPlatforms_(executive).forEach(function (platform) { platforms[platform] = true })
        })
        const target = ecommerceManagerTarget_(properties, id)
        return {
          managerId: id,
          managerName: String(row.Name || '').trim(),
          platforms: ERP_ECOMMERCE_PLATFORMS.filter(function (platform) { return platforms[platform] }),
          dailyTarget: target.dailyTarget,
          monthlyTarget: target.monthlyTarget,
        }
      })
      return { targets: { executives: executives, managers: managers } }
    }

    function setEcommerceTarget_(spreadsheet, payload) {
      const role = String(payload.sessionUserRole || '')
      const targetType = String(payload.targetType || 'executive')
      const targetId = String(payload.targetId || payload.executiveId || payload.managerId || '').trim()
      const dailyTarget = payload.dailyTarget
      const monthlyTarget = payload.monthlyTarget
      if (!['manager', 'executive'].includes(targetType)) throw apiError_(400, 'Choose a manager or executive target.')
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(targetId)) throw apiError_(400, 'Choose a valid E-commerce account.')
      if (targetType === 'manager' && role !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can set E-commerce Manager targets.')
      }
      if (targetType === 'executive' && role !== 'Super Admin' && role !== 'E-commerce Manager') {
        throw apiError_(403, 'Only the Super Admin or owning E-commerce Manager can set executive targets.')
      }
      const target = readSheetRecords_(spreadsheet, 'Users').find(function (row) {
        const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
        const expectedRole = targetType === 'manager' ? 'E-commerce Manager' : 'E-commerce Executive'
        return active && String(row['User ID'] || '').trim() === targetId && String(row.Role || '').trim() === expectedRole
      })
      if (!target) throw apiError_(404, 'The selected active E-commerce account was not found.')
      if (targetType === 'executive' && role === 'E-commerce Manager' &&
          String(target['Manager ID'] || '').trim() !== String(payload.sessionUserId || '').trim()) {
        throw apiError_(403, 'You can only set targets for your own E-commerce Executives.')
      }
      if (typeof dailyTarget !== 'number' || !Number.isInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100000 ||
          typeof monthlyTarget !== 'number' || !Number.isInteger(monthlyTarget) || monthlyTarget < 0 || monthlyTarget > 100000) {
        throw apiError_(400, 'Daily and monthly order targets must be whole numbers from 0 to 100,000.')
      }
      return withWriteLock_(function () {
        const properties = {}
        const dailyPrefix = targetType === 'manager' ? ERP_ECOMMERCE_MANAGER_DAILY_TARGET_PREFIX : ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX
        const monthlyPrefix = targetType === 'manager' ? ERP_ECOMMERCE_MANAGER_MONTHLY_TARGET_PREFIX : ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX
        properties[dailyPrefix + targetId] = String(dailyTarget)
        properties[monthlyPrefix + targetId] = String(monthlyTarget)
        PropertiesService.getScriptProperties().setProperties(properties, false)
        return { targetType: targetType, targetId: targetId, dailyTarget: dailyTarget, monthlyTarget: monthlyTarget }
      })
    }

    function resetErpData_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can reset ERP data.')
      }
      if (String(payload.confirmation || '') !== 'RESET ERP') {
        throw apiError_(400, 'Type RESET ERP to confirm the data reset.')
      }

      const usersSheet = spreadsheet.getSheetByName('Users')
      if (!usersSheet || usersSheet.getLastRow() < 2 || usersSheet.getLastColumn() < 1) {
        throw apiError_(422, 'The Users sheet must contain the active Super Admin account before reset.')
      }
      const userHeaders = usersSheet.getRange(1, 1, 1, usersSheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
      const userIdColumn = userHeaders.indexOf('User ID')
      const userRoleColumn = userHeaders.indexOf('Role')
      const userActiveColumn = userHeaders.indexOf('Active')
      if (userIdColumn < 0 || userRoleColumn < 0 || userActiveColumn < 0) {
        throw apiError_(422, 'The Users sheet is missing the columns required to preserve the Super Admin.')
      }
      const activeUserId = String(payload.sessionUserId || '').trim()
      const userRows = usersSheet.getRange(2, 1, usersSheet.getLastRow() - 1, usersSheet.getLastColumn()).getValues()
      const adminRowIndex = userRows.findIndex(function (row) {
        const active = row[userActiveColumn] === true || ['true', '1', 'yes'].indexOf(String(row[userActiveColumn] || '').toLowerCase()) >= 0
        return String(row[userIdColumn] || '').trim() === activeUserId &&
          String(row[userRoleColumn] || '').trim() === 'Super Admin' && active
      })
      if (adminRowIndex < 0) throw apiError_(401, 'The active Super Admin account could not be verified for reset.')

      return withWriteLock_(function () {
        const timestamp = Utilities.formatDate(new Date(), spreadsheet.getSpreadsheetTimeZone(), 'yyyy-MM-dd-HH-mm-ss')
        const root = getErpStorageRootFolder_(true)
        const archiveFolder = root.createFolder('Reset Backup ' + timestamp)
        archiveFolder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
        const backupFiles = []
        const masterFile = DriveApp.getFileById(spreadsheet.getId())
        backupFiles.push(copyFileToResetArchive_(masterFile, archiveFolder, timestamp))

        const chatFile = configuredDriveFile_(ERP_CHAT_SPREADSHEET_PROPERTY, 'Mahalaxmi ERP Private Chats')
        let chatSpreadsheet = null
        if (chatFile) {
          backupFiles.push(copyFileToResetArchive_(chatFile, archiveFolder, timestamp))
          chatSpreadsheet = SpreadsheetApp.openById(chatFile.getId())
        }

        const archivedFolders = archiveResetStorageFolders_(archiveFolder)
        const workbookReset = clearSpreadsheetForReset_(spreadsheet, {
          sheetName: 'Users',
          rowNumber: adminRowIndex + 2,
        })
        let chatReset = { clearedSheets: [], clearedRecords: 0 }
        if (chatSpreadsheet) chatReset = clearSpreadsheetForReset_(chatSpreadsheet, null)
        clearResetScriptProperties_()
        SpreadsheetApp.flush()

        return {
          backupFolderName: archiveFolder.getName(),
          backupFiles: backupFiles,
          clearedSheets: workbookReset.clearedSheets.concat(chatReset.clearedSheets),
          clearedRecords: workbookReset.clearedRecords + chatReset.clearedRecords,
          archivedFolders: archivedFolders,
        }
      })
    }

    function copyFileToResetArchive_(file, archiveFolder, timestamp) {
      const backup = file.makeCopy(file.getName() + '-Reset-Backup-' + timestamp, archiveFolder)
      backup.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
      return backup.getName()
    }

    function archiveResetStorageFolders_(archiveFolder) {
      const properties = PropertiesService.getScriptProperties()
      const plan = ERP_RESETTABLE_STORAGE_FOLDERS.map(function (config) {
        const originalPropertyValue = properties.getProperty(config.property)
        const folder = originalPropertyValue ? DriveApp.getFolderById(originalPropertyValue) : findUniqueDriveFolder_(config.name)
        if (!folder) return null
        if (folder.getId() === archiveFolder.getId()) throw apiError_(409, 'A reset archive cannot be used as an active ERP storage folder.')
        if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
          throw apiError_(403, 'The Drive folder "' + config.name + '" must be private before it can be archived.')
        }
        return {
          config: config,
          folder: folder,
          destination: getErpStorageCategoryFolder_(config.category, true),
          originalPropertyValue: originalPropertyValue,
          originalParent: (function () {
            const parents = folder.getParents()
            return parents.hasNext() ? parents.next() : null
          })(),
        }
      }).filter(Boolean)

      const completed = []
      try {
        plan.forEach(function (entry) {
          completed.push(entry)
          entry.replacement = entry.destination.createFolder(entry.config.name)
          entry.replacement.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE)
          entry.folder.moveTo(archiveFolder)
          entry.moved = true
          properties.setProperty(entry.config.property, entry.replacement.getId())
        })
      } catch (error) {
        const rollbackErrors = []
        completed.reverse().forEach(function (entry) {
          try {
            if (entry.moved && entry.originalParent) entry.folder.moveTo(entry.originalParent)
            if (entry.replacement) entry.replacement.setTrashed(true)
            if (entry.originalPropertyValue) properties.setProperty(entry.config.property, entry.originalPropertyValue)
            else properties.deleteProperty(entry.config.property)
          } catch (rollbackError) {
            rollbackErrors.push(String(rollbackError))
          }
        })
        if (rollbackErrors.length) {
          throw apiError_(500, 'Drive archiving failed and rollback was incomplete. Preserve the reset backup "' + archiveFolder.getName() + '" and review the ERP Drive folders. ' + rollbackErrors.join('; '))
        }
        throw error
      }
      return plan.map(function (entry) { return entry.config.name })
    }

    function clearSpreadsheetForReset_(spreadsheet, preservedRow) {
      const clearedSheets = []
      let clearedRecords = 0
      spreadsheet.getSheets().forEach(function (sheet) {
        const lastRow = sheet.getLastRow()
        const lastColumn = sheet.getLastColumn()
        if (lastRow < 2 || lastColumn < 1) return
        const rows = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
        let keepRow = null
        let removed = 0
        rows.forEach(function (row, index) {
          const isPreservedRow = preservedRow && sheet.getName() === preservedRow.sheetName && index + 2 === preservedRow.rowNumber
          if (isPreservedRow) {
            keepRow = row
            return
          }
          if (row.some(function (value) { return value !== '' && value !== null })) removed += 1
        })
        sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent()
        if (keepRow) sheet.getRange(2, 1, 1, lastColumn).setValues([keepRow])
        if (removed > 0) clearedSheets.push(sheet.getName())
        clearedRecords += removed
      })
      if (preservedRow && !spreadsheet.getSheetByName(preservedRow.sheetName)) {
        throw apiError_(422, 'The Users sheet disappeared during reset.')
      }
      return { clearedSheets: clearedSheets, clearedRecords: clearedRecords }
    }

    function clearResetScriptProperties_() {
      const properties = PropertiesService.getScriptProperties()
      const keys = Object.keys(properties.getProperties())
      const prefixes = [
        ERP_ECOMMERCE_EXEC_DAILY_TARGET_PREFIX,
        ERP_ECOMMERCE_EXEC_MONTHLY_TARGET_PREFIX,
        ERP_ECOMMERCE_MANAGER_DAILY_TARGET_PREFIX,
        ERP_ECOMMERCE_MANAGER_MONTHLY_TARGET_PREFIX,
        ERP_CAMERA_USER_FOLDER_PREFIX,
      ]
      keys.forEach(function (key) {
        if (prefixes.some(function (prefix) { return key.indexOf(prefix) === 0 })) properties.deleteProperty(key)
      })
    }

    function setUserActive_(spreadsheet, payload) {
      return withWriteLock_(function () {
        const userId = String(payload.id || '')
        const active = payload.active
        const actorRole = String(payload.sessionUserRole || '')
        const actorId = String(payload.sessionUserId || '')
        if (actorRole !== 'Super Admin' && actorRole !== 'E-commerce Manager') {
          throw apiError_(403, 'Only the Super Admin or owning E-commerce Manager can change this account status.')
        }
        if (!userId || typeof active !== 'boolean') {
          throw apiError_(400, 'A user ID and active status are required.')
        }
        const sheet = spreadsheet.getSheetByName('Users')
        if (!sheet || sheet.getLastRow() < 2) throw apiError_(404, 'User account sheet was not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const idColumn = headers.indexOf('User ID')
        const activeColumn = headers.indexOf('Active')
        const roleColumn = headers.indexOf('Role')
        const managerColumn = headers.indexOf('Manager ID')
        if (idColumn < 0 || activeColumn < 0 || roleColumn < 0) throw apiError_(422, 'The Users sheet is missing required columns.')

        const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
        let targetRow = 0
        let targetRole = ''
        let targetManagerId = ''
        let activeAdmins = 0
        rows.forEach(function (row, index) {
          const rowRole = String(row[roleColumn] || '')
          const rowActive = String(row[activeColumn]).toLowerCase() === 'true'
          if (rowRole === 'Super Admin' && rowActive) activeAdmins += 1
          if (String(row[idColumn] || '') === userId) {
            targetRow = index + 2
            targetRole = rowRole
            targetManagerId = managerColumn < 0 ? '' : String(row[managerColumn] || '').trim()
          }
        })
        if (!targetRow) throw apiError_(404, 'User account was not found.')
        if (actorRole === 'E-commerce Manager' && (targetRole !== 'E-commerce Executive' || targetManagerId !== actorId)) {
          throw apiError_(403, 'An E-commerce Manager can only change the status of their own executives.')
        }
        if (!active && targetRole === 'Super Admin' && activeAdmins <= 1) {
          throw apiError_(400, 'The only Super Admin account cannot be deactivated.')
        }

        createBackup_(spreadsheet)
        sheet.getRange(targetRow, activeColumn + 1).setValue(active ? 'TRUE' : 'FALSE')
        SpreadsheetApp.flush()
        return { updated: true }
      })
    }

    function setUserPassword_(spreadsheet, payload) {
      const userId = String(payload.id || '').trim()
      const actorId = String(payload.sessionUserId || '').trim()
      const actorRole = String(payload.sessionUserRole || '')
      const salt = String(payload.salt || '')
      const passwordHash = String(payload.passwordHash || '')
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(userId)) throw apiError_(400, 'Choose a valid user account.')
      if (actorRole !== 'Super Admin' && actorId !== userId) {
        throw apiError_(403, 'You can only change your own password.')
      }
      if (!/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{64}$/i.test(passwordHash)) {
        throw apiError_(400, 'The new password credentials are invalid.')
      }
      return withWriteLock_(function () {
        const sheet = spreadsheet.getSheetByName('Users')
        if (!sheet || sheet.getLastRow() < 2) throw apiError_(404, 'User account sheet was not found.')
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const idColumn = headers.indexOf('User ID')
        const saltColumn = headers.indexOf('Password Salt')
        const hashColumn = headers.indexOf('Password Hash')
        if (idColumn < 0 || saltColumn < 0 || hashColumn < 0) throw apiError_(422, 'The Users sheet is missing password columns.')
        const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
        const rowIndex = values.findIndex(function (row) { return String(row[idColumn] || '').trim() === userId })
        if (rowIndex < 0) throw apiError_(404, 'User account was not found.')
        createBackup_(spreadsheet)
        sheet.getRange(rowIndex + 2, saltColumn + 1).setValue(salt)
        sheet.getRange(rowIndex + 2, hashColumn + 1).setValue(passwordHash)
        SpreadsheetApp.flush()
        invalidateWorkbookCache_(spreadsheet)
        return { updated: true }
      })
    }

    function setUserManager_(spreadsheet, payload) {
      if (String(payload.sessionUserRole || '') !== 'Super Admin') {
        throw apiError_(403, 'Only the Super Admin can assign an E-commerce Manager.')
      }
      const executiveId = String(payload.executiveId || '').trim()
      const managerId = String(payload.managerId || '').trim()
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(executiveId)) throw apiError_(400, 'Choose a valid E-commerce Executive account.')
      return withWriteLock_(function () {
        const users = readSheetRecords_(spreadsheet, 'Users')
        const executive = users.find(function (row) {
          return String(row['User ID'] || '').trim() === executiveId && String(row.Role || '').trim() === 'E-commerce Executive'
        })
        if (!executive) throw apiError_(404, 'E-commerce Executive account was not found.')
        if (managerId) {
          const manager = users.find(function (row) {
            const active = row.Active === true || ['true', '1', 'yes'].indexOf(String(row.Active || '').toLowerCase()) >= 0
            return active && String(row['User ID'] || '').trim() === managerId && String(row.Role || '').trim() === 'E-commerce Manager'
          })
          if (!manager) throw apiError_(400, 'Choose an active E-commerce Manager.')
        }
        createBackup_(spreadsheet)
        const sheet = ensureUserSheet_(spreadsheet)
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function (value) { return value.trim() })
        const idColumn = headers.indexOf('User ID')
        const managerColumn = headers.indexOf('Manager ID')
        const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), sheet.getLastColumn()).getValues()
        const rowIndex = values.findIndex(function (row) { return String(row[idColumn] || '').trim() === executiveId })
        if (rowIndex < 0 || managerColumn < 0) throw apiError_(404, 'E-commerce Executive account was not found.')
        sheet.getRange(rowIndex + 2, managerColumn + 1).setValue(managerId)
        SpreadsheetApp.flush()
        return { executiveId: executiveId, managerId: managerId }
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
          const rowIndexes = new Map()
          values.forEach(function (row, rowIndex) {
            const key = keyOf(row[keyIndex])
            if (key && !rowIndexes.has(key)) rowIndexes.set(key, rowIndex)
          })
          let updated = 0
          rows.forEach(function (record) {
            const key = keyOf(record.__importMatchKey === undefined ? record[keyColumn] : record.__importMatchKey)
            if (!key) return
            const rowIndex = rowIndexes.get(key)
            if (rowIndex === undefined) return
            let rowChanged = false
            target.headers.forEach(function (header, columnIndex) {
              if (record[header] === undefined || record[header] === '' ||
                  sameImportValue(values[rowIndex][columnIndex], record[header])) return
              values[rowIndex][columnIndex] = safeCellValue_(record[header])
              rowChanged = true
            })
            if (rowChanged) updated += 1
          })
          if (updated) target.sheet.getRange(2, 1, values.length, target.headers.length).setValues(values)
          return updated
        }

        const inputProducts = rowsFor('products', 'Products', 5000)
        const inputVariants = rowsFor('variants', 'SKU variants', 10000)
        const inputListings = rowsFor('listings', 'Marketplace listings', 10000)
        const inputFinishedGoods = payload.finishedGoods === undefined ? [] : payload.finishedGoods
        if (!Array.isArray(inputFinishedGoods) || inputFinishedGoods.length > 5000) {
          throw apiError_(400, 'Finished-goods opening stock must contain no more than 5000 rows.')
        }
        inputFinishedGoods.forEach(function (row, index) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) {
            throw apiError_(400, 'Finished-goods opening stock row ' + (index + 1) + ' must be an object.')
          }
        })
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
        const listingByPlatformSku = new Map()
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
          if (row.Platform && row['Platform SKU']) {
            listingSkuToId.set(platformKey, id)
            listingByPlatformSku.set(platformKey, row)
          }
        })

        const addedProducts = []
        const addedVariants = []
        const addedListings = []
        const updatedProducts = []
        const updatedVariants = []
        const updatedListings = []
        const addedFinishedGoods = []
        let skippedOpeningStock = 0
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
          const existingListing = listingById.get(idKey) || listingByPlatformSku.get(listingKey)
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

        const finishedRows = readSheetRecords_(spreadsheet, 'Finished_Goods')
        const movementRows = readSheetRecords_(spreadsheet, 'Stock_Movement')
        const finishedRowsBySku = new Map()
        finishedRows.forEach(function (record) {
          const key = keyOf(record['Product SKU'])
          if (!key) return
          const rows = finishedRowsBySku.get(key) || []
          rows.push(record)
          finishedRowsBySku.set(key, rows)
        })
        const movementsBySku = new Map()
        movementRows.forEach(function (record) {
          const itemType = String(record['Item Type'] || '').trim()
          if (itemType && itemType !== 'Finished Goods') return
          const key = keyOf(record.SKU)
          if (!key) return
          const rows = movementsBySku.get(key) || []
          rows.push(record)
          movementsBySku.set(key, rows)
        })
        const renamedSkuKeys = new Set(skuRenames.map(function (rename) { return keyOf(rename.newSku) }))
        const stockSkus = new Set()
        inputFinishedGoods.forEach(function (row, index) {
          const label = 'Finished-goods opening stock row ' + (index + 1)
          const sku = requiredImportText(row, 'Product SKU', label + ' Product SKU', 100)
          const productName = requiredImportText(row, 'Product Name', label + ' Product Name', 300)
          const openingStock = importAmount(row['Opening Stock'], label + ' Opening Stock')
          const skuKey = keyOf(sku)
          if (openingStock === '' || !Number.isInteger(openingStock) || openingStock > 10000000) {
            throw apiError_(400, label + ' Opening Stock must be a whole number from 0 to 10,000,000.')
          }
          if (stockSkus.has(skuKey)) throw apiError_(409, 'Duplicate finished-goods SKU in import: ' + sku)
          stockSkus.add(skuKey)
          if (!productSkuToMaster.has(skuKey) && !variantSkuToMaster.has(skuKey)) {
            throw apiError_(422, 'Finished-goods SKU ' + sku + ' does not match an imported product or variant.')
          }
          if (renamedSkuKeys.has(skuKey)) {
            throw apiError_(409, 'Import opening stock for renamed SKU ' + sku + ' separately after resolving its existing stock.')
          }

          const existingStockRows = finishedRowsBySku.get(skuKey) || []
          if (existingStockRows.length > 1) throw apiError_(409, 'Finished-goods stock contains duplicate rows for SKU ' + sku + '.')
          const skuMovements = movementsBySku.get(skuKey) || []
          const referenceId = 'ERP-IMPORT-OPENING-STOCK-' + sku
          const importedMovement = skuMovements.filter(function (record) {
            return String(record['Movement Type'] || '').trim() === 'Opening Stock' &&
              String(record['Reference ID'] || '').trim() === referenceId
          })
          if (existingStockRows.length) {
            const priorOpening = Number(existingStockRows[0]['Opening Stock'])
            if (importedMovement.length === 1 && priorOpening === openingStock) {
              skippedOpeningStock += 1
              return
            }
            throw apiError_(409, 'Finished-goods stock already exists for SKU ' + sku + '; existing stock will not be overwritten.')
          }
          if (skuMovements.length) {
            throw apiError_(409, 'Stock history already exists for SKU ' + sku + '; opening stock cannot be imported safely.')
          }

          const stockRecord = {
            'Product SKU': sku,
            'Product Name': productName,
            'Opening Stock': openingStock,
            'Production Received': 0,
            'Quality Approved': 0,
            Rejected: 0,
            'Reserved Stock': 0,
            'Available Stock': openingStock,
            'Dispatched Stock': 0,
            'Returned Stock': 0,
            'Damaged Stock': 0,
            'Last Updated': new Date().toISOString(),
            'Adjustment In': 0,
            'Adjustment Out': 0,
            Status: 'Active',
          }
          const movement = stockMovementRecord_({
            sku: sku,
            type: 'Opening Stock',
            quantity: openingStock,
            referenceId: referenceId,
            reason: 'Opening stock imported from the catalog workbook.',
            opening: 0,
            closing: openingStock,
            createdBy: String(payload.createdBy || ''),
            itemType: 'Finished Goods',
          })
          addedFinishedGoods.push({ stock: stockRecord, movement: movement })
        })

        const updatedProductsById = new Map(updatedProducts.map(function (row) {
          return [keyOf(row['Internal Product ID']), row]
        }))
        currentProducts.forEach(function (row) {
          const currentSku = String(row['Master SKU'] || '').trim()
          const currentSkuKey = keyOf(currentSku)
          const canonicalSku = productAliasToMaster.get(currentSkuKey) || currentSku
          const mrp = skuMrpUpdates.get(keyOf(canonicalSku))
          if (mrp === undefined || mrp === '' || !currentSku) return
          const idKey = keyOf(row['Internal Product ID'])
          const staged = updatedProductsById.get(idKey)
          const base = staged || row
          const merged = mergeImportRecord(base, { 'Master SKU': canonicalSku, MRP: mrp })
          if (hasImportChanges(base, merged)) {
            if (staged) Object.assign(staged, merged)
            else {
              merged.__importMatchKey = row['Internal Product ID']
              updatedProducts.push(merged)
              updatedProductsById.set(idKey, merged)
            }
          }
        })
        addedProducts.forEach(function (row) {
          const mrp = skuMrpUpdates.get(keyOf(row['Master SKU']))
          if (mrp !== undefined && mrp !== '') row.MRP = mrp
        })

        const updatedVariantsById = new Map(updatedVariants.map(function (row) {
          return [keyOf(row['Variant ID']), row]
        }))
        currentVariants.forEach(function (row) {
          const existingMaster = String(row['Master SKU'] || '').trim()
          const canonicalMaster = productAliasToMaster.get(keyOf(existingMaster)) || existingMaster
          const sku = String(row['Variant SKU'] || '').trim()
          const mrp = skuMrpUpdates.get(keyOf(sku))
          const idKey = keyOf(row['Variant ID'])
          const staged = updatedVariantsById.get(idKey)
          const base = staged || row
          const patch = { 'Master SKU': canonicalMaster }
          if (mrp !== undefined && mrp !== '') patch.MRP = mrp
          const merged = mergeImportRecord(base, patch)
          if (hasImportChanges(base, merged)) {
            if (staged) Object.assign(staged, merged)
            else {
              merged.__importMatchKey = row['Variant ID']
              updatedVariants.push(merged)
              updatedVariantsById.set(idKey, merged)
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
          openingStock: { added: addedFinishedGoods.length, skipped: skippedOpeningStock },
          renamedProducts: skuRenames.length,
          backupName: '',
        }
        if (!addedProducts.length && !addedVariants.length && !addedListings.length
          && !updatedProducts.length && !updatedVariants.length && !updatedListings.length
          && !finishedUpdates.length && !addedFinishedGoods.length) {
          totals.skipped = matched
          return totals
        }

        const backupState = { created: false, backupName: '' }
        createBackupOnce_(spreadsheet, backupState)
        const productTarget = ensureStockSheet_(spreadsheet, 'Products', productHeaders, backupState)
        const variantTarget = ensureStockSheet_(spreadsheet, 'SKU_Variants', variantHeaders, backupState)
        const listingTarget = ensureStockSheet_(spreadsheet, 'Marketplace_Listings', listingHeaders, backupState)
        const finishedTarget = finishedUpdates.length || addedFinishedGoods.length
          ? ensureStockSheet_(spreadsheet, 'Finished_Goods', ERP_FINISHED_GOODS_HEADERS, backupState)
          : null
        const movementTarget = addedFinishedGoods.length
          ? ensureStockSheet_(spreadsheet, 'Stock_Movement', ERP_STOCK_MOVEMENT_HEADERS, backupState)
          : null
        appendImportRows(productTarget, addedProducts)
        appendImportRows(variantTarget, addedVariants)
        appendImportRows(listingTarget, addedListings)
        totals.updated.products = updateImportRows(productTarget, updatedProducts, 'Internal Product ID')
        totals.updated.variants = updateImportRows(variantTarget, updatedVariants, 'Variant ID')
        totals.updated.listings = updateImportRows(listingTarget, updatedListings, 'Listing ID')
        if (finishedTarget) updateImportRows(finishedTarget, finishedUpdates, 'Product SKU')
        appendImportRows(finishedTarget, addedFinishedGoods.map(function (record) { return record.stock }))
        appendImportRows(movementTarget, addedFinishedGoods.map(function (record) { return record.movement }))
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
      const requiredMissing = missing.filter(function (column) {
        return column !== 'Assigned Platforms' && column !== 'Manager ID'
      })
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
