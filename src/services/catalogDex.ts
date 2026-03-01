import type {
  AssetDexCard,
  AssetDexCatalog,
  AssetDexLoadResult,
  MainSkillLevel,
  MainSkillLevelsLoadResult,
  SubSkillEffectType,
} from '../types/catalog'
import type { AuthSession } from '../types/auth'
import { isAuthExpiredError, notifyAuthSessionExpired } from './authSessionGuard'

type UnknownRecord = Record<string, unknown>

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const CATALOG_CACHE_TTL_MS = 1000 * 60 * 10
const CATALOG_CACHE_KEY_PREFIX = 'pokesleep:catalog-cache:v1:'
const MAIN_SKILL_LEVEL_CACHE_TTL_MS = 1000 * 60 * 10

type CatalogCachePayload = {
  expiresAt: number
  data: AssetDexCard[]
}

type MainSkillLevelCachePayload = {
  expiresAt: number
  data: MainSkillLevel[]
}

type MainSkillLevelRow = {
  skillId: number | null
  level: number
  value: number | string
  extraEffects: unknown | null
}

const memoryCache = new Map<AssetDexCatalog, CatalogCachePayload>()
const mainSkillLevelMemoryCache = new Map<number, MainSkillLevelCachePayload>()

const tableCandidates: Record<AssetDexCatalog, string[]> = {
  berries: ['berries'],
  ingredients: ['ingredients'],
  mainskills: ['mainskills', 'main_skills'],
  subskills: ['subskills', 'sub_skills'],
}

type AssetDexUpdatePayload = {
  chineseName?: string
  name?: string
  attribute?: string
  eneryMin?: number | null
  eneryMax?: number | null
  energy?: number | null
  price?: number | null
  description?: string
  value?: string
  effectType?: SubSkillEffectType
  imageUrl?: string
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const numberValue = Number(value)
    if (Number.isFinite(numberValue)) {
      return numberValue
    }

    const match = value.match(/\d+/)
    if (match) {
      return Number(match[0])
    }
  }

  return null
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

function pickNullableString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function normalizeEffectType(value: unknown): SubSkillEffectType {
  if (typeof value !== 'string') {
    return 'unknown'
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'gold' || normalized === 'white' || normalized === 'blue') {
    return normalized
  }

  return 'unknown'
}

function createHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
  }
}

function createAuthHeaders(session: AuthSession) {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  }
}

function parseErrorMessage(payload: unknown) {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as UnknownRecord).message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  return 'Unknown PostgREST error'
}

function primaryTableForCatalog(catalog: AssetDexCatalog) {
  return tableCandidates[catalog][0]
}

async function fetchTableRows(table: string): Promise<UnknownRecord[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const query = new URLSearchParams({
    select: '*',
  })

  if (table !== 'mainskill_levels' && table !== 'main_skill_levels') {
    query.set('order', 'id.asc')
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    headers: createHeaders(),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' && payload !== null
        ? String((payload as UnknownRecord).message ?? 'Unknown PostgREST error')
        : 'Unknown PostgREST error'
    throw new Error(`读取表 ${table} 失败：${errorMessage}`)
  }

  return Array.isArray(payload) ? (payload as UnknownRecord[]) : []
}

function mapCatalogRow(row: UnknownRecord): AssetDexCard | null {
  const id = parseNumber(row.id)
  if (!id) {
    return null
  }

  return {
    id,
    chineseName: pickNullableString(row, ['chinese_name']),
    name: pickNullableString(row, ['name']),
    attribute: pickNullableString(row, ['attribute']),
    eneryMin: parseNumber(row.enery_min) ?? parseNumber(row.energy_min),
    eneryMax: parseNumber(row.enery_max) ?? parseNumber(row.energy_max),
    energy: parseNumber(row.energy),
    price: parseNumber(row.price),
    description: pickNullableString(row, ['description']),
    value: pickNullableString(row, ['value']),
    effectType: normalizeEffectType(row.effect_type),
    imageUrl: pickString(row, ['icon_url', 'image_url', 'img_url']),
  }
}

function mapMainSkillLevelRow(row: UnknownRecord): MainSkillLevelRow | null {
  const level = parseNumber(row.level)
  if (level === null) {
    return null
  }

  const rawValue = row.value
  let value: number | string
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    value = rawValue
  } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
    const trimmed = rawValue.trim()
    const asNumber = Number(trimmed)
    value = Number.isFinite(asNumber) ? asNumber : trimmed
  } else {
    return null
  }

  const skillId =
    parseNumber(row.mainskill_id) ??
    parseNumber(row.main_skill_id) ??
    parseNumber(row.main_skill) ??
    parseNumber(row.mainskill) ??
    parseNumber(row.skill_id)

  const rawExtraEffects = row.extra_effects
  const extraEffects =
    rawExtraEffects === null || rawExtraEffects === undefined || rawExtraEffects === '' ? null : rawExtraEffects

  return { skillId, level, value, extraEffects }
}

function sessionKey(catalog: AssetDexCatalog) {
  return `${CATALOG_CACHE_KEY_PREFIX}${catalog}`
}

function readSessionCache(catalog: AssetDexCatalog, now: number): AssetDexCard[] | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(sessionKey(catalog))
    if (!raw) {
      return null
    }

    const payload = JSON.parse(raw) as CatalogCachePayload
    if (!payload || typeof payload.expiresAt !== 'number' || !Array.isArray(payload.data)) {
      window.sessionStorage.removeItem(sessionKey(catalog))
      return null
    }

    if (payload.expiresAt <= now) {
      window.sessionStorage.removeItem(sessionKey(catalog))
      return null
    }

    return payload.data
  } catch {
    return null
  }
}

function writeCache(catalog: AssetDexCatalog, data: AssetDexCard[]) {
  const payload: CatalogCachePayload = {
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
    data,
  }
  memoryCache.set(catalog, payload)

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.setItem(sessionKey(catalog), JSON.stringify(payload))
  } catch {
    // Ignore storage failures to keep loading path stable.
  }
}

async function resolveRows(catalog: AssetDexCatalog): Promise<UnknownRecord[]> {
  const errors: string[] = []
  for (const table of tableCandidates[catalog]) {
    try {
      return await fetchTableRows(table)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(message)
    }
  }

  throw new Error(errors.join('；'))
}

async function resolveMainSkillLevelRows(): Promise<UnknownRecord[]> {
  const levelTableCandidates = ['mainskill_levels', 'main_skill_levels']
  const errors: string[] = []

  for (const table of levelTableCandidates) {
    try {
      const rows = await fetchTableRows(table)
      return rows
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(message)
    }
  }

  throw new Error(errors.join('；'))
}

/**
 * Fetches one asset catalog (berries/ingredients/main skills/sub skills).
 * Uses in-memory and sessionStorage TTL cache to reduce duplicate requests.
 */
export async function fetchAssetDexEntries(catalog: AssetDexCatalog): Promise<AssetDexLoadResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      data: [],
      source: 'fallback',
      message: '未检测到 Supabase 环境变量，无法加载图鉴数据。',
      total: 0,
    }
  }

  const now = Date.now()
  const memory = memoryCache.get(catalog)
  if (memory && memory.expiresAt > now) {
    return {
      data: memory.data,
      source: 'supabase',
      message: `已从缓存加载 ${memory.data.length} 条图鉴数据。`,
      total: memory.data.length,
    }
  }

  const cachedData = readSessionCache(catalog, now)
  if (cachedData) {
    memoryCache.set(catalog, {
      expiresAt: now + CATALOG_CACHE_TTL_MS,
      data: cachedData,
    })

    return {
      data: cachedData,
      source: 'supabase',
      message: `已从缓存加载 ${cachedData.length} 条图鉴数据。`,
      total: cachedData.length,
    }
  }

  try {
    const rows = await resolveRows(catalog)
    const data = rows
      .map((row) => mapCatalogRow(row))
      .filter((entry): entry is AssetDexCard => entry !== null)
      .sort((a, b) => a.id - b.id)

    writeCache(catalog, data)

    return {
      data,
      source: 'supabase',
      message: `已加载 ${data.length} 条图鉴数据。`,
      total: data.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      data: [],
      source: 'fallback',
      message: `加载图鉴失败：${message}`,
      total: 0,
    }
  }
}

export async function fetchMainSkillLevels(skillId: number): Promise<MainSkillLevelsLoadResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      data: [],
      source: 'fallback',
      message: '未检测到 Supabase 环境变量，无法加载主技能等级数据。',
      total: 0,
    }
  }

  const now = Date.now()
  const cached = mainSkillLevelMemoryCache.get(skillId)
  if (cached && cached.expiresAt > now) {
    return {
      data: cached.data,
      source: 'supabase',
      total: cached.data.length,
      message: `已从缓存加载 ${cached.data.length} 条主技能等级数据。`,
    }
  }

  try {
    const rows = await resolveMainSkillLevelRows()
    const mapped = rows.map((row) => mapMainSkillLevelRow(row)).filter((row): row is MainSkillLevelRow => row !== null)
    const hasSkillRef = mapped.some((row) => row.skillId !== null)
    const filtered = hasSkillRef ? mapped.filter((row) => row.skillId === skillId) : mapped
    const data = filtered
      .map((row) => ({
        level: row.level,
        value: row.value,
        extraEffects: row.extraEffects,
      }))
      .sort((a, b) => a.level - b.level)

    mainSkillLevelMemoryCache.set(skillId, {
      expiresAt: now + MAIN_SKILL_LEVEL_CACHE_TTL_MS,
      data,
    })

    return {
      data,
      source: 'supabase',
      total: data.length,
      message: `已加载 ${data.length} 条主技能等级数据。`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      data: [],
      source: 'fallback',
      message: `加载主技能等级数据失败：${message}`,
      total: 0,
    }
  }
}

export function invalidateAssetDexCache(catalog: AssetDexCatalog) {
  memoryCache.delete(catalog)

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.removeItem(sessionKey(catalog))
  } catch {
    // Ignore storage failures.
  }
}

export async function updateAssetDexEntry(
  session: AuthSession,
  catalog: Exclude<AssetDexCatalog, 'mainskills'>,
  entryId: number,
  payload: AssetDexUpdatePayload,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const table = primaryTableForCatalog(catalog)
  const body: UnknownRecord = {}

  if (catalog === 'berries') {
    body.chinese_name = payload.chineseName?.trim() ?? ''
    body.attribute = payload.attribute?.trim() ?? ''
    body.enery_min = payload.eneryMin ?? null
    body.enery_max = payload.eneryMax ?? null
    body.icon_url = payload.imageUrl?.trim() ?? ''
  } else if (catalog === 'ingredients') {
    body.chinese_name = payload.chineseName?.trim() ?? ''
    body.energy = payload.energy ?? null
    body.price = payload.price ?? null
    body.icon_url = payload.imageUrl?.trim() ?? ''
  } else {
    body.name = payload.name?.trim() ?? ''
    body.description = payload.description?.trim() ?? ''
    body.value = payload.value?.trim() ?? ''
    body.effect_type = payload.effectType ?? 'unknown'
    body.image_url = payload.imageUrl?.trim() ?? ''
  }

  const query = new URLSearchParams({
    id: `eq.${entryId}`,
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    method: 'PATCH',
    headers: createAuthHeaders(session),
    body: JSON.stringify(body),
  })

  const responseBody = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload: responseBody })) {
      notifyAuthSessionExpired()
    }

    throw new Error(`更新失败：${parseErrorMessage(responseBody)}`)
  }
}

export async function deleteAssetDexEntry(
  session: AuthSession,
  catalog: Exclude<AssetDexCatalog, 'mainskills'>,
  entryId: number,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const table = primaryTableForCatalog(catalog)
  const query = new URLSearchParams({
    id: `eq.${entryId}`,
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    method: 'DELETE',
    headers: createAuthHeaders(session),
  })

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null)
    if (isAuthExpiredError({ status: response.status, payload: responseBody })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`删除失败：${parseErrorMessage(responseBody)}`)
  }
}
