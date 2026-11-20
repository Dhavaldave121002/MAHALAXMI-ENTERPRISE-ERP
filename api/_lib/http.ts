import type { IncomingMessage, ServerResponse } from 'node:http'

export type ApiRequest = IncomingMessage & { body?: unknown }
export type ApiResponse = ServerResponse

export class ApiError extends Error {
  readonly statusCode: number
  readonly publicMessage: string

  constructor(
    statusCode: number,
    publicMessage: string,
  ) {
    super(publicMessage)
    this.statusCode = statusCode
    this.publicMessage = publicMessage
  }
}

export function sendJson(response: ApiResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(body))
}

export async function readJsonBody(request: ApiRequest): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body as Record<string, unknown>
  }

  const chunks: Buffer[] = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try {
    const body: unknown = JSON.parse(text)
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>
    throw new ApiError(400, 'Request body must be a JSON object')
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'Request body is not valid JSON')
  }
}

export function handleApiError(response: ApiResponse, error: unknown, operation: string) {
  if (error instanceof ApiError) {
    sendJson(response, error.statusCode, { error: error.publicMessage })
    return
  }
  console.error(`${operation} failed`)
  sendJson(response, 500, { error: 'The request could not be completed. Check server configuration and retry.' })
}
