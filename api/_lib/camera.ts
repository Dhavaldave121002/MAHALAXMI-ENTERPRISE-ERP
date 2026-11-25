import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from 'livekit-server-sdk'
import { ApiError } from './http.js'
import type { PublicUser } from './workbook.js'

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

export function getScreenSharingRoomName() {
  return 'staff-screen-shares'
}

export async function createScreenSharingAccessToken(user: PublicUser, isAdmin: boolean) {
  const { apiKey, apiSecret } = getLiveKitConfig()
  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: user.name,
    metadata: JSON.stringify({ role: user.role }),
    ttl: 12 * 60 * 60,
  })
  token.addGrant({
    roomJoin: true,
    room: getScreenSharingRoomName(),
    canPublish: !isAdmin,
    canPublishSources: isAdmin ? [] : [TrackSource.SCREEN_SHARE],
    canSubscribe: isAdmin,
    canPublishData: false,
  })
  return token.toJwt()
}

export function getCameraBrowserUrl() {
  return getLiveKitConfig().browserUrl
}
