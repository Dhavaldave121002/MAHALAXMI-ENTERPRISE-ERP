import type { ApiRequest, ApiResponse } from '../http.js'
import { ApiError, handleApiError, sendJson } from '../http.js'
import { getSessionUser, requireAdmin } from '../session.js'
import { listCameraClips, readCameraClipRange } from '../workbook.js'

const RETENTION_MS = 24 * 60 * 60 * 1000
const MAX_PLAYBACK_RANGE_BYTES = 2 * 1024 * 1024

function parseRange(value: string | undefined) {
  if (!value) return { startByte: 0, endByte: MAX_PLAYBACK_RANGE_BYTES - 1 }
  const match = /^bytes=(\d+)-(\d*)$/.exec(value)
  if (!match) throw new ApiError(416, 'The requested camera clip range is invalid.')
  const startByte = Number(match[1])
  const requestedEnd = match[2] ? Number(match[2]) : startByte + MAX_PLAYBACK_RANGE_BYTES - 1
  if (
    !Number.isSafeInteger(startByte) ||
    !Number.isSafeInteger(requestedEnd) ||
    startByte < 0 ||
    requestedEnd < startByte
  ) throw new ApiError(416, 'The requested camera clip range is invalid.')
  return {
    startByte,
    endByte: Math.min(requestedEnd, startByte + MAX_PLAYBACK_RANGE_BYTES - 1),
  }
}

async function streamClip(request: ApiRequest, response: ApiResponse, fileId: string) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new ApiError(404, 'Camera clip was not found.')
  const range = parseRange(request.headers.range)
  const clip = await readCameraClipRange({ fileId, ...range })
  if (
    clip.startByte !== range.startByte ||
    clip.endByte < clip.startByte ||
    clip.totalBytes <= clip.endByte ||
    clip.endByte - clip.startByte + 1 > MAX_PLAYBACK_RANGE_BYTES
  ) throw new ApiError(502, 'Google Drive returned an invalid camera clip range.')

  const bytes = Buffer.from(clip.base64, 'base64')
  if (bytes.length !== clip.endByte - clip.startByte + 1) {
    throw new ApiError(502, 'Google Drive returned an incomplete camera clip range.')
  }
  response.statusCode = 206
  response.setHeader('Accept-Ranges', 'bytes')
  response.setHeader('Cache-Control', 'private, no-store')
  response.setHeader('Content-Length', String(bytes.length))
  response.setHeader('Content-Range', `bytes ${clip.startByte}-${clip.endByte}/${clip.totalBytes}`)
  response.setHeader('Content-Type', clip.mimeType || 'video/webm')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(bytes)
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }
  try {
    const currentUser = await getSessionUser(request)
    requireAdmin(currentUser)
    const url = new URL(request.url || '/', 'http://localhost')
    const fileId = url.searchParams.get('fileId')
    if (fileId) {
      await streamClip(request, response, fileId)
      return
    }

    const result = await listCameraClips()
    const cutoff = Date.now() - RETENTION_MS
    const clips = result.clips.filter(clip => {
      const startedAt = Date.parse(clip.startedAt)
      return Number.isFinite(startedAt) && startedAt >= cutoff && startedAt <= Date.now() + 60_000
    })
    sendJson(response, 200, { recordings: clips })
  } catch (error) {
    handleApiError(response, error, 'Camera recordings')
  }
}
