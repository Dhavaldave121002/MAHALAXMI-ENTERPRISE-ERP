import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../_lib/http.js'
import { createCameraS3Client, parseCameraRecordingKey } from '../_lib/camera.js'
import { getSessionUser, requireAdmin } from '../_lib/session.js'
import { listUsers } from '../_lib/workbook.js'

const RETENTION_MS = 48 * 60 * 60 * 1000

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const currentUser = await getSessionUser(request)
    requireAdmin(currentUser)
    const storage = createCameraS3Client()
    const now = Date.now()
    if (request.method === 'POST') {
      const body = await readJsonBody(request)
      const key = typeof body.key === 'string' ? body.key : ''
      const recording = parseCameraRecordingKey(key)
      if (!recording || recording.startedAt < now - RETENTION_MS || recording.startedAt > now + 60_000) {
        throw new ApiError(404, 'Recording is unavailable or has expired.')
      }
      let object
      try {
        object = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }))
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          ['NotFound', 'NoSuchKey'].includes(String(error.name))
        ) throw new ApiError(404, 'Recording is unavailable or has expired.')
        throw error
      }
      if (!object.LastModified || object.LastModified.getTime() < now - RETENTION_MS) {
        throw new ApiError(404, 'Recording is unavailable or has expired.')
      }
      const url = await getSignedUrl(
        storage.client,
        new GetObjectCommand({ Bucket: storage.bucket, Key: key }),
        { expiresIn: 15 * 60 },
      )
      sendJson(response, 200, { url })
      return
    }

    const names = new Map((await listUsers()).map(user => [user.id, user.name]))
    const recordings: { key: string; userId: string; userName: string; startedAt: string; size: number }[] = []
    let continuationToken: string | undefined
    do {
      const page = await storage.client.send(new ListObjectsV2Command({
        Bucket: storage.bucket,
        Prefix: 'recordings/',
        ContinuationToken: continuationToken,
      }))
      for (const object of page.Contents || []) {
        if (!object.Key) continue
        const recording = parseCameraRecordingKey(object.Key)
        if (
          !recording ||
          recording.startedAt > now + 60_000 ||
          !object.LastModified ||
          object.LastModified.getTime() < now - RETENTION_MS
        ) continue
        recordings.push({
          key: object.Key,
          userId: recording.userId,
          userName: names.get(recording.userId) || 'Inactive or removed account',
          startedAt: new Date(recording.startedAt).toISOString(),
          size: object.Size || 0,
        })
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (continuationToken)
    recordings.sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    sendJson(response, 200, { recordings: recordings.slice(0, 100) })
  } catch (error) {
    if (error instanceof ApiError) {
      handleApiError(response, error, 'Camera recordings')
      return
    }
    handleApiError(response, error, 'Camera recordings')
  }
}
