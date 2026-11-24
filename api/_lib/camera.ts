import { S3Client } from '@aws-sdk/client-s3'
import {
  AccessToken,
  EgressClient,
  EgressInfo,
  EncodingOptions,
  FileOutput,
  MediaSource,
  Output,
  ParticipantVideo,
  RoomServiceClient,
  S3Upload,
  StartEgressRequest,
  StorageConfig,
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

function getS3Config() {
  const endpoint = process.env.CAMERA_S3_ENDPOINT?.trim() || ''
  if (endpoint) {
    try {
      const url = new URL(endpoint)
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported protocol')
    } catch {
      throw new ApiError(503, 'Camera monitoring has an invalid S3 endpoint configuration.')
    }
  }
  return {
    bucket: requiredEnv('CAMERA_S3_BUCKET'),
    region: requiredEnv('CAMERA_S3_REGION'),
    endpoint,
    forcePathStyle: process.env.CAMERA_S3_FORCE_PATH_STYLE === 'true',
  }
}

export function createCameraClients() {
  const config = getLiveKitConfig()
  return {
    ...config,
    roomService: new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret),
    egress: new EgressClient(config.apiUrl, config.apiKey, config.apiSecret),
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

export function isCameraEgressForUser(egress: EgressInfo, userId: string) {
  if (egress.request.case !== 'egress' || !egress.request.value) return false
  const media = egress.request.value.source
  return media.case === 'media'
    && media.value.video.case === 'participantVideo'
    && media.value.video.value.identity === userId
}

export function createCameraEgressRequest(roomName: string, user: PublicUser, startedAt: number) {
  const s3 = getS3Config()
  const accessKey = requiredEnv('LIVEKIT_S3_ACCESS_KEY')
  const secret = requiredEnv('LIVEKIT_S3_SECRET_KEY')
  const request = new StartEgressRequest({
    roomName,
    source: {
      case: 'media',
      value: new MediaSource({
        video: {
          case: 'participantVideo',
          value: new ParticipantVideo({ identity: user.id }),
        },
      }),
    },
    encoding: {
      case: 'advanced',
      value: new EncodingOptions({
        width: 640,
        height: 360,
        framerate: 15,
        videoBitrate: 500,
      }),
    },
    outputs: [
      new Output({
        config: {
          case: 'file',
          value: new FileOutput({
            filepath: `recordings/${user.id}/${startedAt}.mp4`,
            disableManifest: true,
          }),
        },
      }),
    ],
    storage: new StorageConfig({
      provider: {
        case: 's3',
        value: new S3Upload({
          bucket: s3.bucket,
          region: s3.region,
          endpoint: s3.endpoint || undefined,
          forcePathStyle: s3.forcePathStyle,
          accessKey,
          secret,
        }),
      },
    }),
  })
  return request
}

export function createCameraS3Client() {
  const s3 = getS3Config()
  return {
    ...s3,
    client: new S3Client({
      region: s3.region,
      endpoint: s3.endpoint || undefined,
      forcePathStyle: s3.forcePathStyle,
      credentials: {
        accessKeyId: requiredEnv('CAMERA_S3_ACCESS_KEY'),
        secretAccessKey: requiredEnv('CAMERA_S3_SECRET_KEY'),
      },
    }),
  }
}

export function parseCameraRecordingKey(key: string) {
  const match = /^recordings\/([a-zA-Z0-9_-]{1,128})\/(\d{13})\.mp4$/.exec(key)
  if (!match) return null
  const startedAt = Number(match[2])
  if (!Number.isSafeInteger(startedAt)) return null
  return { userId: match[1], startedAt }
}
