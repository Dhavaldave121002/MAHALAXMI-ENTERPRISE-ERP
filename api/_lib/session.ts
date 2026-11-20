import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './http.js'
import { ApiError } from './http.js'
import { getSessionSecret, readUsers, type PublicUser, type WorkbookContext } from './workbook.js'

const SESSION_COOKIE = 'mahalaxmi_session'
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30

type SessionPayload = { userId: string; expiresAt: number }

function sign(value: string) {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url')
}

function getCookie(request: ApiRequest, name: string) {
  const cookies = request.headers.cookie?.split(';') || []
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split('=')
    if (key === name) return decodeURIComponent(valueParts.join('='))
  }
  return ''
}

export function setSessionCookie(response: ApiResponse, userId: string) {
  const payload: SessionPayload = { userId, expiresAt: Date.now() + SESSION_LIFETIME_SECONDS * 1000 }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const token = `${encoded}.${sign(encoded)}`
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_LIFETIME_SECONDS}${secure}`)
}

export function clearSessionCookie(response: ApiResponse) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

export function getSessionUser(request: ApiRequest, context: WorkbookContext): PublicUser {
  const token = getCookie(request, SESSION_COOKIE)
  const [encoded, providedSignature] = token.split('.')
  if (!encoded || !providedSignature) throw new ApiError(401, 'Please sign in.')

  const expectedSignature = Buffer.from(sign(encoded))
  const actualSignature = Buffer.from(providedSignature)
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    throw new ApiError(401, 'Your session is invalid. Please sign in again.')
  }

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload
  } catch {
    throw new ApiError(401, 'Your session is invalid. Please sign in again.')
  }
  if (typeof payload.userId !== 'string' || typeof payload.expiresAt !== 'number' || payload.expiresAt <= Date.now()) {
    throw new ApiError(401, 'Your session has expired. Please sign in again.')
  }

  const user = readUsers(context.workbook).find(item => item.id === payload.userId && item.active)
  if (!user) throw new ApiError(401, 'This account is inactive or no longer exists.')
  return { id: user.id, name: user.name, username: user.username, role: user.role, active: user.active }
}

export function requireAdmin(user: PublicUser) {
  if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can perform this action.')
}
