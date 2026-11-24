import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { timingSafeEqual } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, sendJson } from '../_lib/http.js'
import { createCameraClients, createCameraS3Client, isCameraEgressForUser, parseCameraRecordingKey } from '../_lib/camera.js'
import { cameraRoomName, cameraScheduleForRole } from '../../shared/cameraSchedule.js'
import { listUsers } from '../_lib/workbook.js'

const RETENTION_MS = 48 * 60 * 60 * 1000

function isAuthorized(request: ApiRequest) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.authorization || ''
  if (!secret || !authorization.startsWith('Bearer ')) return false
  const provided = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    if (!isAuthorized(request)) throw new ApiError(401, 'Unauthorized scheduled cleanup request.')
    const storage = createCameraS3Client()
    const { roomService, egress } = createCameraClients()
    const users = await listUsers()
    const roomName = cameraRoomName()
    const rooms = await roomService.listRooms([roomName])
    let disconnected = 0
    let stoppedEgress = 0
    if (rooms.length) {
      const participants = await roomService.listParticipants(roomName)
      const activeEgress = await egress.listEgress({ roomName, active: true })
      const userById = new Map(users.map(user => [user.id, user]))
      for (const participant of participants) {
        const user = userById.get(participant.identity)
        if (user?.active && (user.role === 'Super Admin' || cameraScheduleForRole(user.role).state === 'active')) continue
        for (const item of activeEgress.filter(recording => isCameraEgressForUser(recording, participant.identity))) {
          await egress.stopEgress(item.egressId)
          stoppedEgress += 1
        }
        await roomService.removeParticipant(roomName, participant.identity)
        disconnected += 1
      }
    }

    const cutoff = Date.now() - RETENTION_MS
    let deleted = 0
    let continuationToken: string | undefined
    do {
      const page = await storage.client.send(new ListObjectsV2Command({
        Bucket: storage.bucket,
        Prefix: 'recordings/',
        ContinuationToken: continuationToken,
      }))
      const expiredKeys = (page.Contents || [])
        .filter(object => object.Key && parseCameraRecordingKey(object.Key) && object.LastModified && object.LastModified.getTime() <= cutoff)
        .map(object => ({ Key: object.Key }))
      for (let offset = 0; offset < expiredKeys.length; offset += 1000) {
        const batch = expiredKeys.slice(offset, offset + 1000)
        const result = await storage.client.send(new DeleteObjectsCommand({
          Bucket: storage.bucket,
          Delete: { Objects: batch, Quiet: true },
        }))
        if (result.Errors?.length) throw new Error(`Storage failed to delete ${result.Errors.length} expired camera recording(s).`)
        deleted += batch.length
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (continuationToken)
    sendJson(response, 200, { deleted, disconnected, stoppedEgress })
  } catch (error) {
    handleApiError(response, error, 'Camera recording cleanup')
  }
}
