import type { PokemonNews, PokemonNewsLoadResult } from '../types/news'

type UnknownRecord = Record<string, unknown>

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const NEWS_CACHE_KEY = 'pokesleep:news-cache:v1'
const NEWS_CACHE_TTL_MS = 1000 * 60 * 8
const NEWS_EMPTY_CACHE_TTL_MS = 1000 * 25

let newsMemoryCache: { expiresAt: number; data: PokemonNews[] } | null = null

type NewsCachePayload = {
  expiresAt: number
  data: PokemonNews[]
}

function createHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
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

function normalizeCategory(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) {
    return '未分类'
  }

  const tokens = compact.split(' ')
  const deduped: string[] = []
  for (const token of tokens) {
    if (deduped.at(-1) !== token) {
      deduped.push(token)
    }
  }

  return deduped.join(' ')
}

function pickFirstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return ''
}

function resolveContent(row: UnknownRecord): string {
  const direct = pickFirstString([
    row.content_markdown,
    row.content,
    row.body,
    row.full_content,
    row.html_content,
    row.markdown_content,
    row.markdown,
    row.md_content,
    row.article_content,
    row.news_content,
    row.detail_content,
    row.description,
    row.summary,
  ])
  if (direct) {
    return direct
  }

  const structured = row.content_json ?? row.body_json ?? row.detail_json ?? row.markdown_blocks ?? row.contents
  if (structured && typeof structured === 'object') {
    try {
      return JSON.stringify(structured, null, 2)
    } catch {
      return ''
    }
  }

  return ''
}

function mapNewsRow(row: UnknownRecord): PokemonNews | null {
  const rawId = row.id
  const id =
    typeof rawId === 'string'
      ? rawId.trim()
      : typeof rawId === 'number' && Number.isFinite(rawId)
        ? String(rawId)
        : ''

  const title = pickString(row, ['title', 'headline', 'news_title', 'subject'])
  if (!id || !title) {
    return null
  }

  return {
    id,
    title,
    category: normalizeCategory(pickString(row, ['category', 'category_name', 'type', 'news_category'], '未分类')),
    coverImageUrl: pickString(row, [
      'cover_image_storage_url',
      'storage_cover_url',
      'cover_storage_url',
      'cover_image',
      'cover_image_url',
      'cover_url',
      'image_url',
      'thumbnail_url',
      'thumbnail',
      'cover',
      'eyecatch',
      'image',
    ]),
    publishedAt: pickString(row, [
      'published_at',
      'publish_time',
      'published_date',
      'publishedAt',
      'date',
      'news_time',
      'created_at',
      'updated_at',
    ]),
    content: resolveContent(row),
  }
}

function toDateMs(dateText: string): number {
  if (!dateText) {
    return 0
  }

  const parsed = Date.parse(dateText)
  return Number.isNaN(parsed) ? 0 : parsed
}

function readSessionCache(now: number): PokemonNews[] | null {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(NEWS_CACHE_KEY)
    if (!raw) {
      return null
    }

    const payload = JSON.parse(raw) as NewsCachePayload
    if (!payload || typeof payload.expiresAt !== 'number' || !Array.isArray(payload.data)) {
      window.sessionStorage.removeItem(NEWS_CACHE_KEY)
      return null
    }

    if (payload.expiresAt <= now) {
      window.sessionStorage.removeItem(NEWS_CACHE_KEY)
      return null
    }

    return payload.data
  } catch {
    return null
  }
}

function writeCache(data: PokemonNews[], ttlMs = NEWS_CACHE_TTL_MS) {
  const payload: NewsCachePayload = {
    expiresAt: Date.now() + ttlMs,
    data,
  }

  newsMemoryCache = payload

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage failures and keep network path available.
  }
}

type FetchNewsOptions = {
  force?: boolean
}

/**
 * Fetches and normalizes pokemon_news records from Supabase.
 */
export async function fetchPokemonNews(options: FetchNewsOptions = {}): Promise<PokemonNewsLoadResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      data: [],
      source: 'fallback',
      message: '未检测到 Supabase 环境变量，无法加载新闻数据。',
      total: 0,
    }
  }

  const force = Boolean(options.force)
  const now = Date.now()
  if (!force && newsMemoryCache && newsMemoryCache.expiresAt > now) {
    return {
      data: newsMemoryCache.data,
      source: 'supabase',
      fromCache: true,
      message: `已从缓存加载 ${newsMemoryCache.data.length} 条新闻。`,
      total: newsMemoryCache.data.length,
    }
  }

  const sessionData = force ? null : readSessionCache(now)
  if (sessionData) {
    newsMemoryCache = {
      expiresAt: now + NEWS_CACHE_TTL_MS,
      data: sessionData,
    }
    return {
      data: sessionData,
      source: 'supabase',
      fromCache: true,
      message: `已从缓存加载 ${sessionData.length} 条新闻。`,
      total: sessionData.length,
    }
  }

  try {
    const query = new URLSearchParams({
      select: '*',
    })
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_news?${query.toString()}`, {
      headers: createHeaders(),
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const errorMessage =
        typeof payload === 'object' && payload !== null
          ? String((payload as UnknownRecord).message ?? 'Unknown PostgREST error')
          : 'Unknown PostgREST error'
      throw new Error(errorMessage)
    }

    const rows = Array.isArray(payload) ? (payload as UnknownRecord[]) : []
    const data = rows
      .map((row) => mapNewsRow(row))
      .filter((item): item is PokemonNews => item !== null)
      .sort((a, b) => toDateMs(b.publishedAt) - toDateMs(a.publishedAt))

    if (data.length > 0) {
      writeCache(data, NEWS_CACHE_TTL_MS)
    } else {
      const previousValid = newsMemoryCache?.data ?? []
      if (previousValid.length > 0) {
        writeCache(previousValid, NEWS_EMPTY_CACHE_TTL_MS)
        return {
          data: previousValid,
          source: 'supabase',
          fromCache: true,
          message: '本次请求返回空结果，已保留上次有效新闻缓存。',
          total: previousValid.length,
        }
      }

      // Empty result may be transient; keep only short-lived cache to avoid lock-in.
      writeCache([], NEWS_EMPTY_CACHE_TTL_MS)
    }

    return {
      data,
      source: 'supabase',
      message: `已加载 ${data.length} 条新闻。`,
      total: data.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      data: [],
      source: 'fallback',
      message: `新闻加载失败：${errorMessage}`,
      total: 0,
    }
  }
}

/**
 * Fetches a single news detail by id.
 * Detail query always prefers the latest DB content (especially content_markdown).
 */
export async function fetchPokemonNewsById(newsId: string): Promise<PokemonNews | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null
  }

  const resolvedId = newsId.trim()
  if (!resolvedId) {
    return null
  }

  // Try cache hit first.
  const cached = newsMemoryCache?.data.find((item) => item.id === resolvedId)
  if (cached && cached.content) {
    return cached
  }

  try {
    const query = new URLSearchParams({
      select: '*',
      id: `eq.${resolvedId}`,
      limit: '1',
    })

    const response = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_news?${query.toString()}`, {
      headers: createHeaders(),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(payload) || payload.length === 0) {
      return null
    }

    const mapped = mapNewsRow(payload[0] as UnknownRecord)
    if (!mapped) {
      return null
    }

    if (newsMemoryCache) {
      const others = newsMemoryCache.data.filter((item) => item.id !== mapped.id)
      newsMemoryCache = {
        expiresAt: newsMemoryCache.expiresAt,
        data: [mapped, ...others].sort((a, b) => toDateMs(b.publishedAt) - toDateMs(a.publishedAt)),
      }
    }

    return mapped
  } catch {
    return null
  }
}
