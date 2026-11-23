import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ApiRequest, ApiResponse } from './http.js'
import { ApiError } from './http.js'
import { getSessionSecret, isUserRole, listUsers, publicUser, type EcommercePlatform, type PublicUser, type UserRole, type WorkbookUser } from './workbook.js'

const SESSION_COOKIE = 'mahalaxmi_session'
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30

type SessionPayload = {
  userId: string
  expiresAt: number
  name?: string
  username?: string
  role?: UserRole
  platforms?: EcommercePlatform[]
  sessionBoundWrites?: boolean
}

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

function writeSessionCookie(response: ApiResponse, user: PublicUser, expiresAt: number, sessionBoundWrites: boolean) {
  const payload: SessionPayload = {
    userId: user.id,
    expiresAt,
    name: user.name,
    username: user.username,
    role: user.role,
    platforms: user.platforms,
    sessionBoundWrites,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const token = `${encoded}.${sign(encoded)}`
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`)
}

export function setSessionCookie(response: ApiResponse, user: PublicUser) {
  writeSessionCookie(response, user, Date.now() + SESSION_LIFETIME_SECONDS * 1000, false)
}

export function refreshSessionCookie(response: ApiResponse, request: ApiRequest, user: PublicUser, sessionBoundWrites: boolean) {
  const payload = readSessionPayload(request)
  writeSessionCookie(response, user, payload.expiresAt, sessionBoundWrites)
}

export function clearSessionCookie(response: ApiResponse) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

function readSessionPayload(request: ApiRequest): SessionPayload {
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
  if (payload.role !== undefined && !isUserRole(payload.role)) {
    throw new ApiError(401, 'Your session is invalid. Please sign in again.')
  }
  if (payload.sessionBoundWrites !== undefined && typeof payload.sessionBoundWrites !== 'boolean') {
    throw new ApiError(401, 'Your session is invalid. Please sign in again.')
  }
  if (payload.platforms !== undefined && (!Array.isArray(payload.platforms) || payload.platforms.some(platform => typeof platform !== 'string'))) {
    throw new ApiError(401, 'Your session is invalid. Please sign in again.')
  }
  return payload
}

export function hasSignedSession(request: ApiRequest) {
  try {
    readSessionPayload(request)
    return true
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) return false
    throw error
  }
}

export async function getSessionUser(request: ApiRequest, users?: WorkbookUser[]): Promise<PublicUser> {
  const payload = readSessionPayload(request)
  const accounts = users || await listUsers()
  const user = accounts.find(item => item.id === payload.userId && item.active)
  if (!user) throw new ApiError(401, 'This account is inactive or no longer exists.')
  return publicUser(user)
}

export function getSessionClaims(request: ApiRequest): PublicUser | null {
  const payload = readSessionPayload(request)
  if (!payload.sessionBoundWrites || !payload.name || !payload.username || !payload.role) return null
  return {
    id: payload.userId,
    name: payload.name,
    username: payload.username,
    role: payload.role,
    active: true,
    platforms: payload.platforms || [],
  }
}

export function requireAdmin(user: PublicUser) {
  if (user.role !== 'Super Admin') throw new ApiError(403, 'Only the Super Admin can perform this action.')
}

export function requireSupervisorOrAdmin(user: PublicUser) {
  if (user.role !== 'Super Admin' && user.role !== 'Production Supervisor') {
    throw new ApiError(403, 'Only the Super Admin or Production Supervisor can perform this action.')
  }
}
