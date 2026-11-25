import type { ApiRequest, ApiResponse } from './_lib/http.js'
import { ApiError, handleApiError, sendJson } from './_lib/http.js'
import { getSessionUser } from './_lib/session.js'
import { downloadWorkbookEcommerceLabel, listUsers } from './_lib/workbook.js'

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const users = await listUsers()
    const user = await getSessionUser(request, users)
    if (!['E-commerce Executive', 'E-commerce Manager', 'Production Supervisor', 'Super Admin'].includes(user.role)) {
      throw new ApiError(403, 'This account cannot download shipping labels.')
    }
    const url = new URL(request.url || '/', 'http://localhost')
    const fileId = url.searchParams.get('id') || ''
    if (!fileId || fileId.length > 200) throw new ApiError(400, 'A valid shipping-label ID is required.')
    const result = await downloadWorkbookEcommerceLabel(user, fileId)
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(result.base64) || result.base64.length > 4200000) {
      throw new ApiError(503, 'The stored shipping label could not be read.')
    }
    const file = Buffer.from(result.base64, 'base64')
    if (file.length > 3145728 || file.length < 5 || file.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new ApiError(503, 'The stored shipping label is not a valid PDF.')
    }
    const fileName = result.fileName.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 180) || 'shipping-label.pdf'
    const encodedName = encodeURIComponent(fileName).replace(/[!'()*]/g, character =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader('Content-Length', String(file.length))
    response.setHeader('Content-Disposition', `attachment; filename="shipping-label.pdf"; filename*=UTF-8''${encodedName}`)
    response.setHeader('Cache-Control', 'private, no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(file)
  } catch (error) {
    handleApiError(response, error, 'E-commerce shipping-label download')
  }
}
