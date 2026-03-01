import type { AuthSession } from '../types/auth'
import { isAuthExpiredError, notifyAuthSessionExpired } from './authSessionGuard'

type UnknownRecord = Record<string, unknown>

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'pokemon-assets'

function parseErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as UnknownRecord
    const message = record.message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  return 'Unknown storage error'
}

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，无法上传图片。')
  }
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function buildObjectPath(session: AuthSession, folder: string, file: File) {
  const safeFolder = folder.trim().replace(/^\/+|\/+$/g, '') || 'uploads'
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'upload'
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `${safeFolder}/${session.user.id}/${Date.now()}-${randomPart}-${safeName}`
}

function getObjectPathFromPublicUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) {
    return null
  }

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`
  const index = trimmed.indexOf(marker)
  if (index === -1) {
    return null
  }

  const path = trimmed.slice(index + marker.length)
  if (!path) {
    return null
  }

  return decodeURIComponent(path)
}

export async function uploadPublicImage(session: AuthSession, file: File, folder: string): Promise<string> {
  assertEnv()

  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  const objectPath = buildObjectPath(session, folder, file)

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodePath(objectPath)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`上传图片失败：${parseErrorMessage(payload)}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePath(objectPath)}`
}

export async function deletePublicImageByUrl(session: AuthSession, url: string): Promise<void> {
  assertEnv()

  const objectPath = getObjectPathFromPublicUrl(url)
  if (!objectPath) {
    return
  }

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodePath(objectPath)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${session.accessToken}`,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`删除图片失败：${parseErrorMessage(payload)}`)
  }
}
