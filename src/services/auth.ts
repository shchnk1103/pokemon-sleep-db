import type { AppUserProfile, AuthSession, AuthUser } from '../types/auth'

type UnknownRecord = Record<string, unknown>

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const AUTH_STORAGE_KEY = 'pokesleep-auth-session-v1'

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }
}

function baseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

function pickString(record: UnknownRecord, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return fallback
}

function pickBoolean(record: UnknownRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false
    }
  }
  return fallback
}

function mapAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const obj = raw as UnknownRecord
  const id = pickString(obj, ['id'])
  const email = pickString(obj, ['email'])
  if (!id || !email) {
    return null
  }
  return { id, email }
}

function mapSessionPayload(payload: unknown): AuthSession | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const obj = payload as UnknownRecord
  const accessToken = pickString(obj, ['access_token'])
  const refreshToken = pickString(obj, ['refresh_token'])
  const expiresAtRaw = obj.expires_at
  const expiresAt =
    typeof expiresAtRaw === 'number' && Number.isFinite(expiresAtRaw) ? expiresAtRaw * 1000 : null
  const user = mapAuthUser(obj.user)
  if (!accessToken || !refreshToken || !user) {
    return null
  }
  return {
    accessToken,
    refreshToken,
    expiresAt,
    user,
  }
}

function toProfile(record: UnknownRecord): AppUserProfile | null {
  const id = pickString(record, ['id'])
  const authUserId = pickString(record, ['auth_user_id'])
  const email = pickString(record, ['email'])
  if (!id || !authUserId || !email) {
    return null
  }
  return {
    id,
    authUserId,
    email,
    displayName: pickString(record, ['display_name'], email),
    isAdmin: pickBoolean(record, ['is_admin'], false),
    createdAt: pickString(record, ['created_at']),
    updatedAt: pickString(record, ['updated_at']),
  }
}

function saveSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id || !parsed?.user?.email) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

function authHeaders(accessToken: string) {
  return {
    ...baseHeaders(),
    Authorization: `Bearer ${accessToken}`,
  }
}

async function selectOwnProfileRows(
  session: AuthSession,
  includeAdminField: boolean,
): Promise<{ ok: boolean; rows: UnknownRecord[] }> {
  const selectFields = includeAdminField
    ? 'id,auth_user_id,email,display_name,is_admin,created_at,updated_at'
    : 'id,auth_user_id,email,display_name,created_at,updated_at'

  const query = new URLSearchParams({
    select: selectFields,
    auth_user_id: `eq.${session.user.id}`,
    limit: '1',
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?${query.toString()}`, {
    headers: authHeaders(session.accessToken),
  })
  const payload = await parseResponse(response)

  return {
    ok: response.ok,
    rows: Array.isArray(payload) ? (payload as UnknownRecord[]) : [],
  }
}

async function resolveOwnProfile(session: AuthSession): Promise<AppUserProfile | null> {
  const primary = await selectOwnProfileRows(session, true)
  if (primary.ok) {
    return primary.rows[0] ? toProfile(primary.rows[0]) : null
  }

  // Backward-compatible fallback when is_admin column is not ready yet.
  const fallback = await selectOwnProfileRows(session, false)
  if (!fallback.ok) {
    return null
  }

  return fallback.rows[0] ? toProfile(fallback.rows[0]) : null
}

async function ensureProfileExists(session: AuthSession, displayName?: string): Promise<AppUserProfile | null> {
  assertEnv()

  const existing = await resolveOwnProfile(session)
  if (existing) {
    return existing
  }

  const insertBody = {
    auth_user_id: session.user.id,
    email: session.user.email,
    display_name: displayName?.trim() || session.user.email.split('@')[0] || 'Trainer',
  }

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      ...authHeaders(session.accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(insertBody),
  })
  const insertPayload = await parseResponse(insertRes)
  if (!insertRes.ok || !Array.isArray(insertPayload) || insertPayload.length === 0) {
    return null
  }

  return toProfile(insertPayload[0] as UnknownRecord)
}

async function fetchOwnProfile(session: AuthSession): Promise<AppUserProfile | null> {
  assertEnv()
  return resolveOwnProfile(session)
}

export async function signUpWithEmail(input: {
  email: string
  password: string
  displayName?: string
}): Promise<{ session: AuthSession | null; needsEmailConfirm: boolean; profile: AppUserProfile | null }> {
  assertEnv()

  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      data: {
        display_name: input.displayName?.trim() || undefined,
      },
    }),
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? pickString(payload as UnknownRecord, ['msg', 'message'], '注册失败')
        : '注册失败'
    throw new Error(message)
  }

  const session = mapSessionPayload(payload)
  const needsEmailConfirm = !session
  let profile: AppUserProfile | null = null
  if (session) {
    saveSession(session)
    profile = await ensureProfileExists(session, input.displayName)
  }

  return { session, needsEmailConfirm, profile }
}

export async function signInWithEmail(input: {
  email: string
  password: string
}): Promise<{ session: AuthSession; profile: AppUserProfile | null }> {
  assertEnv()

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: baseHeaders(),
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
    }),
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null
        ? pickString(payload as UnknownRecord, ['msg', 'message'], '登录失败')
        : '登录失败'
    throw new Error(message)
  }

  const session = mapSessionPayload(payload)
  if (!session) {
    throw new Error('登录失败：会话数据无效。')
  }

  saveSession(session)
  const profile = await ensureProfileExists(session)
  return { session, profile }
}

export async function signOut(session: AuthSession | null): Promise<void> {
  if (!session || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    saveSession(null)
    return
  }

  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: authHeaders(session.accessToken),
  }).catch(() => null)

  saveSession(null)
}

export async function loadPersistedSession(): Promise<{ session: AuthSession | null; profile: AppUserProfile | null }> {
  assertEnv()
  const persisted = readSession()
  if (!persisted) {
    return { session: null, profile: null }
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(persisted.accessToken),
  })
  const payload = await parseResponse(response)

  if (!response.ok) {
    saveSession(null)
    return { session: null, profile: null }
  }

  const user = mapAuthUser(payload)
  if (!user) {
    saveSession(null)
    return { session: null, profile: null }
  }

  const session: AuthSession = {
    ...persisted,
    user,
  }
  saveSession(session)
  const profile = await ensureProfileExists(session)
  return { session, profile }
}

export async function updateOwnProfile(
  session: AuthSession,
  input: { displayName: string },
): Promise<AppUserProfile | null> {
  assertEnv()

  const trimmedName = input.displayName.trim()
  if (!trimmedName) {
    throw new Error('昵称不能为空。')
  }

  const query = new URLSearchParams({
    auth_user_id: `eq.${session.user.id}`,
    select: 'id,auth_user_id,email,display_name,is_admin,created_at,updated_at',
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?${query.toString()}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(session.accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      display_name: trimmedName,
    }),
  })
  const payload = await parseResponse(response)
  if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
    // Backward-compatible fallback when users.is_admin column is not ready.
    const fallbackQuery = new URLSearchParams({
      auth_user_id: `eq.${session.user.id}`,
      select: 'id,auth_user_id,email,display_name,created_at,updated_at',
    })
    const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/users?${fallbackQuery.toString()}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(session.accessToken),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        display_name: trimmedName,
      }),
    })
    const fallbackPayload = await parseResponse(fallbackRes)
    if (fallbackRes.ok && Array.isArray(fallbackPayload) && fallbackPayload.length > 0) {
      return toProfile(fallbackPayload[0] as UnknownRecord)
    }

    const message =
      typeof payload === 'object' && payload !== null
        ? pickString(payload as UnknownRecord, ['message'], '资料更新失败')
        : '资料更新失败'
    throw new Error(message)
  }

  return toProfile(payload[0] as UnknownRecord)
}

export async function refreshOwnProfile(session: AuthSession): Promise<AppUserProfile | null> {
  const profile = await fetchOwnProfile(session)
  return profile ?? ensureProfileExists(session)
}
