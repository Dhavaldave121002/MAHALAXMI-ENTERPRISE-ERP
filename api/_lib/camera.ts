import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk'
import { ApiError } from './http.js'
import type { PublicUser } from './workbook.js'
import { cameraRoomName, cameraScheduleForRole } from '../../shared/cameraSchedule.js'

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new ApiError(503, 'Camera monitoring is not configured. Contact the Super Admin.')
  return value
}

function getLiveKitConfig() {
  const configuredUrl = requiredEnv('LIVEKIT_URL')
  let url: URL
  try {
    url = new URL(configuredUrl)
  } catch {
    throw new ApiError(503, 'Camera monitoring has an invalid LiveKit URL configuration.')
  }
  if (!['wss:', 'ws:', 'https:', 'http:'].includes(url.protocol)) {
    throw new ApiError(503, 'Camera monitoring has an invalid LiveKit URL configuration.')
  }
  const apiUrl = new URL(url)
  apiUrl.protocol = url.protocol === 'ws:' || url.protocol === 'http:' ? 'http:' : 'https:'
  const browserUrl = new URL(url)
  browserUrl.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:'
  const apiKey = requiredEnv('LIVEKIT_API_KEY')
  const apiSecret = requiredEnv('LIVEKIT_API_SECRET')
  return { apiUrl: apiUrl.origin, browserUrl: browserUrl.toString().replace(/\/$/, ''), apiKey, apiSecret }
}

export function createCameraClients() {
  const config = getLiveKitConfig()
  return {
    roomService: new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret),
  }
}

export async function createCameraAccessToken(user: PublicUser, isAdmin: boolean) {
  const { apiKey, apiSecret } = getLiveKitConfig()
  const schedule = cameraScheduleForRole(user.role)
  const ttl = isAdmin
    ? 12 * 60 * 60
    : Math.max(60, schedule.minutesUntilShiftEnd * 60 - 60)
  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({ role: user.role }),
    ttl,
  })
  token.addGrant({
    roomJoin: true,
    room: cameraRoomName(),
    canPublish: !isAdmin,
    canPublishSources: isAdmin ? [] : [TrackSource.CAMERA],
    canSubscribe: isAdmin,
    canPublishData: false,
  })
  return token.toJwt()
}

export function getCameraBrowserUrl() {
  return getLiveKitConfig().browserUrl
}

export function isScheduledCameraUser(user: PublicUser) {
  const schedule = cameraScheduleForRole(user.role)
  if (schedule.state !== 'active') {
    throw new ApiError(403, schedule.message)
  }
  return schedule
}
