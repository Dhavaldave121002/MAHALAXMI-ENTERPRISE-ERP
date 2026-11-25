export type PrivateClipKind = 'camera' | 'screen'

type ApiResult = { error?: string }

const MAX_UPLOAD_RETRIES = 3

async function recordingApi<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const result = await response.json() as T & ApiResult
  if (!response.ok) throw new Error(result.error || 'Recording request failed.')
  return result
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  const stride = 0x8000
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + stride, bytes.length)))
  }
  return btoa(binary)
}

export async function uploadPrivateClip(blob: Blob, startedAt: number, kind: PrivateClipKind) {
  const upload = await recordingApi<{ uploadToken: string; chunkSize: number }>('/api/cameras/recording', {
    method: 'POST',
    body: JSON.stringify({ action: 'createUpload', kind, startedAt, totalBytes: blob.size }),
  })
  if (!upload.uploadToken || !Number.isSafeInteger(upload.chunkSize) || upload.chunkSize < 256 * 1024) {
    throw new Error('The server returned an invalid Google Drive upload session.')
  }

  let offset = 0
  while (offset < blob.size) {
    const chunk = blob.slice(offset, Math.min(offset + upload.chunkSize, blob.size))
    const bytes = new Uint8Array(await chunk.arrayBuffer())
    const base64 = bytesToBase64(bytes)
    let response: { complete: boolean; nextOffset?: number } | null = null
    let lastError: unknown
    for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt += 1) {
      try {
        response = await recordingApi<{ complete: boolean; nextOffset?: number }>('/api/cameras/recording', {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadChunk',
            uploadToken: upload.uploadToken,
            startByte: offset,
            endByte: offset + bytes.length - 1,
            base64,
          }),
        })
        break
      } catch (error) {
        lastError = error
        if (attempt + 1 < MAX_UPLOAD_RETRIES) {
          await new Promise(resolve => window.setTimeout(resolve, 750 * (attempt + 1)))
        }
      }
    }
    if (!response) throw lastError instanceof Error ? lastError : new Error('The recording clip could not be uploaded.')
    if (response.complete) {
      if (offset + bytes.length !== blob.size) throw new Error('Google Drive completed the clip before all bytes were sent.')
      return
    }
    if (
      typeof response.nextOffset !== 'number' ||
      !Number.isSafeInteger(response.nextOffset) ||
      response.nextOffset <= offset ||
      response.nextOffset > blob.size
    ) throw new Error('Google Drive returned an invalid recording upload offset.')
    offset = response.nextOffset
  }
}
