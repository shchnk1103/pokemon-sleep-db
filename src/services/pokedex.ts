import type {
  PokemonAssetItem,
  PokemonDexCard,
  PokemonIngredientItem,
  PokemonIngredientLevel,
} from '../types/pokemon'
import type { AuthSession } from '../types/auth'
import { isAuthExpiredError, notifyAuthSessionExpired } from './authSessionGuard'

type UnknownRecord = Record<string, unknown>

export type DexLoadResult = {
  data: PokemonDexCard[]
  source: 'supabase' | 'fallback'
  message?: string
  total: number
}

type PokemonBerryRef = {
  id: number
  baseCount: number
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const DEX_CACHE_KEY = 'pokesleep:dex-cache:v2'
const DEX_CACHE_TTL_MS = 1000 * 60 * 10

let assetMapsPromise: Promise<{
  skillMap: Map<number, PokemonAssetItem>
  berryMap: Map<number, PokemonAssetItem>
  ingredientMap: Map<number, PokemonAssetItem>
}> | null = null
let dexMemoryCache: { expiresAt: number; data: PokemonDexCard[] } | null = null

type DexCachePayload = {
  expiresAt: number
  data: PokemonDexCard[]
}

type PokemonUpdateInput = {
  id: number
  name: string
  type: string
  talent: string
  normalImageUrl: string
  shinyImageUrl: string
  mainSkillId: number | null
}

/**
 * Read a valid dex cache snapshot from sessionStorage.
 * Returns null when running outside browser, parsing fails, or cache has expired.
 */
function readDexSessionCache(now: number): PokemonDexCard[] | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(DEX_CACHE_KEY)
    if (!raw) {
      return null
    }

    const payload = JSON.parse(raw) as DexCachePayload
    if (!payload || typeof payload.expiresAt !== 'number' || !Array.isArray(payload.data)) {
      window.sessionStorage.removeItem(DEX_CACHE_KEY)
      return null
    }

    if (payload.expiresAt <= now) {
      window.sessionStorage.removeItem(DEX_CACHE_KEY)
      return null
    }

    return payload.data
  } catch {
    return null
  }
}

/**
 * Persist cache into memory and sessionStorage with a shared TTL.
 */
function writeDexCache(data: PokemonDexCard[]): void {
  const payload: DexCachePayload = {
    expiresAt: Date.now() + DEX_CACHE_TTL_MS,
    data,
  }

  dexMemoryCache = payload

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.setItem(DEX_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage quota and serialization failures.
  }
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

function toJsonObject(value: unknown): UnknownRecord | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as UnknownRecord
  }

  return null
}

function toJsonArray(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is UnknownRecord => typeof item === 'object' && item !== null)
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

function parseErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as UnknownRecord).message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }
  return 'Unknown PostgREST error'
}

async function fetchTable(table: string, select: string, orderBy?: string): Promise<UnknownRecord[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const query = new URLSearchParams({ select })
  if (orderBy) {
    query.set('order', orderBy)
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

function mapSkillRecord(record: UnknownRecord): PokemonAssetItem | null {
  const id = parseNumber(record.id)
  if (!id) {
    return null
  }

  const name = pickString(record, ['chinese_name', 'name'])
  if (!name) {
    return null
  }

  return {
    id,
    name,
    iconUrl: pickString(record, ['image_url']),
  }
}

function mapAssetRecord(record: UnknownRecord): PokemonAssetItem | null {
  const id = parseNumber(record.id)
  if (!id) {
    return null
  }

  const name = pickString(record, ['chinese_name', 'name'])
  if (!name) {
    return null
  }

  return {
    id,
    name,
    iconUrl: pickString(record, ['icon_url']),
  }
}

function parseBerryRefs(value: unknown): PokemonBerryRef[] {
  return toJsonArray(value)
    .map((entry) => {
      const id = parseNumber(entry.id)
      if (!id) {
        return null
      }

      return {
        id,
        baseCount: parseNumber(entry.base_count) ?? 1,
      }
    })
    .filter((entry): entry is PokemonBerryRef => entry !== null)
}

function mapIngredientItems(
  refs: Array<{ id: number; quantity: number }>,
  itemMap: Map<number, PokemonAssetItem>,
): PokemonIngredientItem[] {
  return refs
    .map((ref) => {
      const item = itemMap.get(ref.id)
      if (!item) {
        return null
      }

      return {
        ...item,
        quantity: ref.quantity,
      }
    })
    .filter((item): item is PokemonIngredientItem => item !== null)
}

function parseIngredientLevels(
  value: unknown,
  ingredientMap: Map<number, PokemonAssetItem>,
): PokemonIngredientLevel[] {
  const groups = toJsonObject(value)
  if (!groups) {
    return []
  }

  const levels: PokemonIngredientLevel[] = []
  for (const [rawLevelKey, rawItems] of Object.entries(groups)) {
    const level = parseNumber(rawLevelKey)
    if (!level) {
      continue
    }

    const itemRefs = toJsonArray(rawItems)
      .map((item) => {
        const id = parseNumber(item.id)
        const quantity = parseNumber(item.quantity)
        if (!id || !quantity) {
          return null
        }

        return { id, quantity }
      })
      .filter((item): item is { id: number; quantity: number } => item !== null)

    levels.push({
      level,
      items: mapIngredientItems(itemRefs, ingredientMap),
    })
  }

  return levels.sort((a, b) => a.level - b.level)
}

async function getAssetMaps() {
  if (assetMapsPromise) {
    return assetMapsPromise
  }

  assetMapsPromise = Promise.all([
    fetchTable('mainskills', 'id,name,chinese_name,image_url'),
    fetchTable('berries', 'id,name,chinese_name,icon_url'),
    fetchTable('ingredients', 'id,name,chinese_name,icon_url'),
  ]).then(([skillRows, berryRows, ingredientRows]) => {
    const skillMap = new Map<number, PokemonAssetItem>()
    const berryMap = new Map<number, PokemonAssetItem>()
    const ingredientMap = new Map<number, PokemonAssetItem>()

    for (const row of skillRows) {
      const skill = mapSkillRecord(row)
      if (skill) {
        skillMap.set(skill.id, skill)
      }
    }

    for (const row of berryRows) {
      const berry = mapAssetRecord(row)
      if (berry) {
        berryMap.set(berry.id, berry)
      }
    }

    for (const row of ingredientRows) {
      const ingredient = mapAssetRecord(row)
      if (ingredient) {
        ingredientMap.set(ingredient.id, ingredient)
      }
    }

    return { skillMap, berryMap, ingredientMap }
  })

  return assetMapsPromise
}

function mapPokemonCard(
  row: UnknownRecord,
  maps: {
    skillMap: Map<number, PokemonAssetItem>
    berryMap: Map<number, PokemonAssetItem>
    ingredientMap: Map<number, PokemonAssetItem>
  },
): PokemonDexCard | null {
  const id = pickString(row, ['id'])
  const dexNo = parseNumber(row.id)
  const name = pickString(row, ['name'])

  if (!id || !dexNo || !name) {
    return null
  }

  const mainSkillId = parseNumber(row.main_skill_id)
  const mainSkill = mainSkillId ? maps.skillMap.get(mainSkillId) ?? null : null

  const berries = mapIngredientItems(
    parseBerryRefs(row.berries).map((item) => ({ id: item.id, quantity: item.baseCount })),
    maps.berryMap,
  )

  return {
    id,
    dexNo,
    name,
    type: pickString(row, ['type'], '未知'),
    talent: pickString(row, ['talent'], '未知'),
    ingredientDropRate: parseNumber(row.ingredient_drop_rate),
    skillTriggerRate: parseNumber(row.skill_trigger_rate),
    skillPityTriggerRequiredAssists: parseNumber(row.skill_pity_trigger_required_assists),
    assistInterval: parseNumber(row.assist_interval),
    normalImageUrl: pickString(row, ['img_url']),
    shinyImageUrl: pickString(row, ['shiny_img_url']),
    mainSkill,
    berries,
    ingredientsByLevel: parseIngredientLevels(row.ingredients, maps.ingredientMap),
  }
}

export async function fetchDexEntries(): Promise<DexLoadResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      data: [],
      source: 'fallback',
      message: '未检测到 Supabase 环境变量，无法加载真实图鉴数据。',
      total: 0,
    }
  }

  const now = Date.now()
  if (dexMemoryCache && dexMemoryCache.expiresAt > now) {
    return {
      data: dexMemoryCache.data,
      source: 'supabase',
      message: `已从缓存加载 ${dexMemoryCache.data.length} 条宝可梦数据。`,
      total: dexMemoryCache.data.length,
    }
  }

  const sessionCachedData = readDexSessionCache(now)
  if (sessionCachedData) {
    dexMemoryCache = {
      expiresAt: now + DEX_CACHE_TTL_MS,
      data: sessionCachedData,
    }

    return {
      data: sessionCachedData,
      source: 'supabase',
      message: `已从缓存加载 ${sessionCachedData.length} 条宝可梦数据。`,
      total: sessionCachedData.length,
    }
  }

  try {
    const [maps, pokemonRows] = await Promise.all([
      getAssetMaps(),
      fetchTable(
        'pokemons',
        'id,name,type,talent,img_url,shiny_img_url,main_skill_id,berries,ingredients,ingredient_drop_rate,skill_trigger_rate,skill_pity_trigger_required_assists,assist_interval',
        'id.asc',
      ),
    ])

    const data = pokemonRows
      .map((row) => mapPokemonCard(row, maps))
      .filter((entry): entry is PokemonDexCard => entry !== null)
      .sort((a, b) => a.dexNo - b.dexNo)

    writeDexCache(data)

    return {
      data,
      source: 'supabase',
      message: `已加载 ${data.length} 条宝可梦数据。`,
      total: data.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      data: [],
      source: 'fallback',
      message: `加载真实图鉴失败：${errorMessage}`,
      total: 0,
    }
  }
}

export function invalidateDexCache() {
  dexMemoryCache = null

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.removeItem(DEX_CACHE_KEY)
  } catch {
    // Ignore storage errors.
  }
}

export async function updatePokemonEntry(session: AuthSession, input: PokemonUpdateInput): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const body = {
    name: input.name.trim(),
    type: input.type.trim(),
    talent: input.talent.trim(),
    img_url: input.normalImageUrl.trim(),
    shiny_img_url: input.shinyImageUrl.trim(),
    main_skill_id: input.mainSkillId,
  }

  const query = new URLSearchParams({
    id: `eq.${input.id}`,
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/pokemons?${query.toString()}`, {
    method: 'PATCH',
    headers: createAuthHeaders(session),
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`更新宝可梦失败：${parseErrorMessage(payload)}`)
  }
}

export async function deletePokemonEntry(session: AuthSession, id: number): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }

  const query = new URLSearchParams({
    id: `eq.${id}`,
  })

  const response = await fetch(`${SUPABASE_URL}/rest/v1/pokemons?${query.toString()}`, {
    method: 'DELETE',
    headers: createAuthHeaders(session),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`删除宝可梦失败：${parseErrorMessage(payload)}`)
  }
}
