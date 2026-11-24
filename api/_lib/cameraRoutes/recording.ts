import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, readJsonBody, sendJson } from '../http.js'
import { cameraScheduleForRole } from '../../../shared/cameraSchedule.js'
import { getSessionUser } from '../session.js'
import {
  getSessionSecret,
  startCameraClipUpload,
  uploadCameraClipChunk,
} from '../workbook.js'

const MAX_CLIP_BYTES = 100 * 1024 * 1024
const MAX_CHUNK_BYTES = 2 * 1024 * 1024
const UPLOAD_TOKEN_LIFETIME_MS = 4 * 60 * 60 * 1000

type UploadGrant = {
  userId: string
  uploadUrl: string
  totalBytes: number
  expiresAt: number
}

function isGoogleDriveUploadUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.hostname === 'www.googleapis.com'
      && url.pathname === '/upload/drive/v3/files'
      && url.searchParams.get('uploadType') === 'resumable'
      && Boolean(url.searchParams.get('upload_id'))
  } catch {
    return false
  }
}

function signUploadGrant(grant: UploadGrant) {
  const encoded = Buffer.from(JSON.stringify(grant)).toString('base64url')
  const signature = createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

function verifyUploadGrant(token: unknown, userId: string): UploadGrant {
  if (typeof token !== 'string') throw new ApiError(401, 'Camera clip upload session is invalid. Retry the clip.')
  const [encoded, providedSignature] = token.split('.')
  if (!encoded || !providedSignature) throw new ApiError(401, 'Camera clip upload session is invalid. Retry the clip.')

  const expected = Buffer.from(createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url'))
  const actual = Buffer.from(providedSignature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ApiError(401, 'Camera clip upload session is invalid. Retry the clip.')
  }

  let grant: UploadGrant
  try {
    grant = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as UploadGrant
  } catch {
    throw new ApiError(401, 'Camera clip upload session is invalid. Retry the clip.')
  }
  if (
    grant.userId !== userId ||
    !Number.isSafeInteger(grant.totalBytes) ||
    grant.totalBytes < 1 ||
    grant.totalBytes > MAX_CLIP_BYTES ||
    typeof grant.expiresAt !== 'number' ||
    grant.expiresAt <= Date.now() ||
    !isGoogleDriveUploadUrl(grant.uploadUrl)
  ) throw new ApiError(401, 'Camera clip upload session has expired. Retry the clip.')
  return grant
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const user = await getSessionUser(request)
    if (user.role === 'Super Admin') throw new ApiError(403, 'The Super Admin account is a camera viewer, not a camera publisher.')
    const body = await readJsonBody(request)
    const action = body.action

    if (action === 'createUpload') {
      const totalBytes = Number(body.totalBytes)
      const startedAt = Number(body.startedAt)
      if (!Number.isSafeInteger(totalBytes) || totalBytes < 1 || totalBytes > MAX_CLIP_BYTES) {
        throw new ApiError(413, 'Camera clips must be 100 MB or smaller.')
      }
      if (
        !Number.isSafeInteger(startedAt) ||
        String(startedAt).length !== 13 ||
        startedAt < Date.now() - 10 * 60 * 1000 ||
        startedAt > Date.now() + 60_000 ||
        cameraScheduleForRole(user.role, new Date(startedAt)).state !== 'active'
      ) {
        throw new ApiError(400, 'A valid camera clip start time is required.')
      }

      const fileName = `camera-${user.id}-${startedAt}.webm`
      const upload = await startCameraClipUpload({
        id: user.id,
        role: user.role,
        fileName,
        startedAt,
        totalBytes,
      })
      if (!isGoogleDriveUploadUrl(upload.uploadUrl) || upload.chunkSize !== MAX_CHUNK_BYTES) {
        throw new ApiError(502, 'Google Drive returned an invalid camera upload session.')
      }
      const uploadToken = signUploadGrant({
        userId: user.id,
        uploadUrl: upload.uploadUrl,
        totalBytes,
        expiresAt: Date.now() + UPLOAD_TOKEN_LIFETIME_MS,
      })
      sendJson(response, 201, { uploadToken, chunkSize: upload.chunkSize })
      return
    }

    if (action === 'uploadChunk') {
      const grant = verifyUploadGrant(body.uploadToken, user.id)
      const startByte = Number(body.startByte)
      const endByte = Number(body.endByte)
      const base64 = typeof body.base64 === 'string' ? body.base64 : ''
      if (
        !Number.isSafeInteger(startByte) ||
        !Number.isSafeInteger(endByte) ||
        startByte < 0 ||
        endByte < startByte ||
        endByte >= grant.totalBytes ||
        base64.length > Math.ceil(MAX_CHUNK_BYTES / 3) * 4 + 4 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
      ) throw new ApiError(400, 'The camera clip upload chunk is invalid.')
      const bytes = Buffer.from(base64, 'base64')
      if (
        bytes.length !== endByte - startByte + 1 ||
        bytes.length > MAX_CHUNK_BYTES ||
        (endByte + 1 < grant.totalBytes && bytes.length % (256 * 1024) !== 0)
      ) throw new ApiError(400, 'The camera clip upload chunk is invalid.')

      const result = await uploadCameraClipChunk({
        id: user.id,
        role: user.role,
        uploadUrl: grant.uploadUrl,
        startByte,
        endByte,
        totalBytes: grant.totalBytes,
        base64,
      })
      if (result.complete) {
        sendJson(response, 200, { complete: true, fileId: result.fileId })
        return
      }
      if (
        typeof result.nextOffset !== 'number' ||
        !Number.isSafeInteger(result.nextOffset) ||
        result.nextOffset <= startByte ||
        result.nextOffset > endByte + 1
      ) throw new ApiError(502, 'Google Drive returned an invalid upload offset.')
      sendJson(response, 200, { complete: false, nextOffset: result.nextOffset })
      return
    }

    throw new ApiError(400, 'Choose a valid camera recording action.')
  } catch (error) {
    handleApiError(response, error, 'Camera recording')
  }
}
