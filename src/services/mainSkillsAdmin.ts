import type { AuthSession } from '../types/auth'
import { isAuthExpiredError, notifyAuthSessionExpired } from './authSessionGuard'

type UnknownRecord = Record<string, unknown>

type MainSkillLevelInput = {
  level: number
  value: number | string
  extraEffects: unknown | null
}

type CreateMainSkillInput = {
  session: AuthSession
  skillId: number
  name: string
  chineseName: string
  description: string
  imageUrl?: string
  imageFile?: File | null
  levels: MainSkillLevelInput[]
}

type UpdateMainSkillInput = {
  session: AuthSession
  skillId: number
  name: string
  chineseName: string
  description: string
  imageUrl?: string
  imageFile?: File | null
  levels: MainSkillLevelInput[]
}

type UpsertMainSkillResult = {
  mainSkillId: number
  levelCount: number
  imageUrl: string
}

type MainSkillDraft = {
  id: number
  name: string
  chineseName: string
  description: string
  imageUrl: string
  levels: Array<{
    level: number
    value: number | string
    extraEffectsText: string
  }>
}

type MainSkillInsertResult = {
  id: number
  table: string
}

type LevelSchema = {
  table: string
  foreignKey: string
}

type UploadedImageRef = {
  publicUrl: string
  objectPath: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET?.trim() || 'pokemon-assets'

const mainSkillTableCandidates = ['mainskills']
const levelTableCandidates = ['mainskill_levels']
const levelForeignKeyCandidates = ['mainskill_id']

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 环境变量，请配置 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。')
  }
}

function authHeaders(session: AuthSession) {
  return {
    apikey: SUPABASE_ANON_KEY ?? '',
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
  }
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) {
      return asNumber
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

function parseErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as UnknownRecord
    const msg = record.message
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim()
    }
  }
  return 'Unknown PostgREST error'
}

function serializeExtraEffects(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function parseLevelRows(rows: UnknownRecord[], skillId: number) {
  const mapped = rows
    .map((row) => {
      const level = parseNumber(row.level)
      if (level === null) {
        return null
      }

      const skillRef =
        parseNumber(row.mainskill_id) ??
        parseNumber(row.main_skill_id) ??
        parseNumber(row.main_skill) ??
        parseNumber(row.mainskill) ??
        parseNumber(row.skill_id)

      if (skillRef !== null && skillRef !== skillId) {
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

      return {
        level,
        value,
        extraEffectsText: serializeExtraEffects(row.extra_effects),
      }
    })
    .filter((row): row is { level: number; value: number | string; extraEffectsText: string } => row !== null)
    .sort((a, b) => a.level - b.level)

  return mapped
}

async function fetchRows(table: string, query: URLSearchParams, session: AuthSession): Promise<UnknownRecord[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    headers: authHeaders(session),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(parseErrorMessage(payload))
  }

  return Array.isArray(payload) ? (payload as UnknownRecord[]) : []
}

async function insertRows(
  table: string,
  body: unknown,
  session: AuthSession,
): Promise<{ ok: boolean; payload: unknown; message?: string }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...authHeaders(session),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    return {
      ok: false,
      payload,
      message: parseErrorMessage(payload),
    }
  }

  return {
    ok: true,
    payload,
  }
}

async function patchRows(
  table: string,
  query: URLSearchParams,
  body: unknown,
  session: AuthSession,
): Promise<{ ok: boolean; payload: unknown; message?: string }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(session),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    return {
      ok: false,
      payload,
      message: parseErrorMessage(payload),
    }
  }

  return {
    ok: true,
    payload,
  }
}

async function deleteRows(
  table: string,
  query: URLSearchParams,
  session: AuthSession,
): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, {
    method: 'DELETE',
    headers: authHeaders(session),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    return {
      ok: false,
      message: parseErrorMessage(payload),
    }
  }

  return { ok: true }
}

async function deleteById(table: string, id: number, session: AuthSession): Promise<boolean> {
  const query = new URLSearchParams({
    id: `eq.${id}`,
  })

  const result = await deleteRows(table, query, session)
  return result.ok
}

function buildImagePath(file: File, session: AuthSession) {
  const cleanedName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-') || 'upload'
  const randomPart = Math.random().toString(36).slice(2, 8)
  return `mainskills/${session.user.id}/${Date.now()}-${randomPart}-${cleanedName}`
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function tryExtractStorageObjectPath(imageUrl: string): string | null {
  const normalized = imageUrl.trim()
  if (!normalized) {
    return null
  }

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`
  const index = normalized.indexOf(marker)
  if (index === -1) {
    return null
  }

  const path = normalized.slice(index + marker.length)
  return path ? decodeURIComponent(path) : null
}

async function uploadMainSkillImage(session: AuthSession, file: File): Promise<UploadedImageRef> {
  const objectPath = buildImagePath(file, session)
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodePath(objectPath)}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    },
  )

  const payload = await uploadResponse.json().catch(() => null)
  if (!uploadResponse.ok) {
    if (isAuthExpiredError({ status: uploadResponse.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`上传主技能图片失败：${parseErrorMessage(payload)}`)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePath(objectPath)}`
  return {
    publicUrl,
    objectPath,
  }
}

async function deleteMainSkillImage(session: AuthSession, objectPath: string): Promise<void> {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodePath(objectPath)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${session.accessToken}`,
      },
    },
  )

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (isAuthExpiredError({ status: response.status, payload })) {
      notifyAuthSessionExpired()
    }
    throw new Error(`删除主技能图片失败：${parseErrorMessage(payload)}`)
  }
}

async function resolveImageUrl(input: {
  session: AuthSession
  imageUrl?: string
  imageFile?: File | null
}): Promise<{ imageUrl: string; uploadedImage: UploadedImageRef | null }> {
  if (input.imageFile) {
    const uploaded = await uploadMainSkillImage(input.session, input.imageFile)
    return {
      imageUrl: uploaded.publicUrl,
      uploadedImage: uploaded,
    }
  }

  const imageUrl = input.imageUrl?.trim() || ''
  if (!imageUrl) {
    throw new Error('请填写 image_url 或选择本地图片上传。')
  }

  return {
    imageUrl,
    uploadedImage: null,
  }
}

async function insertMainSkill(
  session: AuthSession,
  input: {
    skillId: number
    name: string
    chineseName: string
    description: string
    imageUrl: string
  },
): Promise<MainSkillInsertResult> {
  const errors: string[] = []

  for (const table of mainSkillTableCandidates) {
    const result = await insertRows(
      table,
      {
        id: input.skillId,
        name: input.name,
        chinese_name: input.chineseName,
        description: input.description,
        image_url: input.imageUrl,
      },
      session,
    )

    if (!result.ok) {
      errors.push(`${table}: ${result.message ?? 'insert failed'}`)
      continue
    }

    const rows = Array.isArray(result.payload) ? (result.payload as UnknownRecord[]) : []
    const nextId = rows.length > 0 ? parseNumber(rows[0]?.id) : null
    if (nextId === null) {
      errors.push(`${table}: insert succeeded but returned id is invalid`)
      continue
    }

    return {
      id: nextId,
      table,
    }
  }

  throw new Error(`创建主技能失败：${errors.join('；')}`)
}

async function replaceLevels(
  session: AuthSession,
  skillId: number,
  description: string,
  levels: MainSkillLevelInput[],
): Promise<{ levelSchema: LevelSchema; levelCount: number }> {
  if (levels.length === 0) {
    for (const table of levelTableCandidates) {
      for (const foreignKey of levelForeignKeyCandidates) {
        const deleteResult = await deleteRows(
          table,
          new URLSearchParams({ [foreignKey]: `eq.${skillId}` }),
          session,
        )
        if (deleteResult.ok) {
          return {
            levelSchema: { table, foreignKey },
            levelCount: 0,
          }
        }
      }
    }

    throw new Error('未找到可用的主技能等级表结构。')
  }

  const levelErrors: string[] = []
  for (const table of levelTableCandidates) {
    for (const foreignKey of levelForeignKeyCandidates) {
      const deleteResult = await deleteRows(
        table,
        new URLSearchParams({ [foreignKey]: `eq.${skillId}` }),
        session,
      )

      if (!deleteResult.ok) {
        levelErrors.push(`${table}.${foreignKey} delete: ${deleteResult.message ?? 'delete failed'}`)
        continue
      }

      const levelRows = levels.map((item) => ({
        level: item.level,
        value: item.value,
        description,
        extra_effects:
          item.extraEffects === '' ||
          item.extraEffects === undefined ||
          (typeof item.extraEffects === 'string' && item.extraEffects.trim().length === 0)
            ? null
            : item.extraEffects,
        [foreignKey]: skillId,
      }))

      const insertResult = await insertRows(table, levelRows, session)
      if (insertResult.ok) {
        return {
          levelSchema: { table, foreignKey },
          levelCount: levels.length,
        }
      }

      levelErrors.push(`${table}.${foreignKey} insert: ${insertResult.message ?? 'insert failed'}`)
    }
  }

  throw new Error(`创建主技能等级失败：${levelErrors.join('；')}`)
}

async function patchMainSkill(
  session: AuthSession,
  skillId: number,
  body: {
    name: string
    chinese_name: string
    description: string
    image_url: string
  },
): Promise<string> {
  const errors: string[] = []
  for (const table of mainSkillTableCandidates) {
    const result = await patchRows(table, new URLSearchParams({ id: `eq.${skillId}` }), body, session)
    if (!result.ok) {
      errors.push(`${table}: ${result.message ?? 'patch failed'}`)
      continue
    }

    return table
  }

  throw new Error(`更新主技能失败：${errors.join('；')}`)
}

export async function fetchMainSkillDraft(session: AuthSession, skillId: number): Promise<MainSkillDraft> {
  assertEnv()

  const mainSkillErrors: string[] = []
  let mainSkillRow: UnknownRecord | null = null

  for (const table of mainSkillTableCandidates) {
    const query = new URLSearchParams({
      select: '*',
      id: `eq.${skillId}`,
      limit: '1',
    })

    try {
      const rows = await fetchRows(table, query, session)
      if (rows.length > 0) {
        mainSkillRow = rows[0]
        break
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      mainSkillErrors.push(`${table}: ${message}`)
    }
  }

  if (!mainSkillRow) {
    const fallback = mainSkillErrors.length > 0 ? `（${mainSkillErrors.join('；')}）` : ''
    throw new Error(`未找到主技能 ID ${skillId}${fallback}`)
  }

  const levelErrors: string[] = []
  let levels: MainSkillDraft['levels'] = []

  for (const table of levelTableCandidates) {
    const query = new URLSearchParams({
      select: '*',
      order: 'level.asc',
    })

    try {
      const rows = await fetchRows(table, query, session)
      const parsed = parseLevelRows(rows, skillId)
      if (parsed.length > 0) {
        levels = parsed
        break
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      levelErrors.push(`${table}: ${message}`)
    }
  }

  const id = parseNumber(mainSkillRow.id)
  if (id === null) {
    throw new Error('主技能数据缺少有效 id。')
  }

  return {
    id,
    name: pickString(mainSkillRow, ['name']),
    chineseName: pickString(mainSkillRow, ['chinese_name']),
    description: pickString(mainSkillRow, ['description']),
    imageUrl: pickString(mainSkillRow, ['image_url']),
    levels,
  }
}

export async function createMainSkillWithLevels(input: CreateMainSkillInput): Promise<UpsertMainSkillResult> {
  assertEnv()

  const resolvedImage = await resolveImageUrl({
    session: input.session,
    imageUrl: input.imageUrl,
    imageFile: input.imageFile,
  })

  try {
    const createdMainSkill = await insertMainSkill(input.session, {
      skillId: input.skillId,
      name: input.name,
      chineseName: input.chineseName,
      description: input.description,
      imageUrl: resolvedImage.imageUrl,
    })

    try {
      const levelResult = await replaceLevels(input.session, createdMainSkill.id, input.description, input.levels)
      return {
        mainSkillId: createdMainSkill.id,
        levelCount: levelResult.levelCount,
        imageUrl: resolvedImage.imageUrl,
      }
    } catch (error) {
      const rollbackOk = await deleteById(createdMainSkill.table, createdMainSkill.id, input.session)
      const rollbackMessage = rollbackOk ? '已回滚主技能数据。' : '主技能已创建但等级写入失败，且回滚失败，请手动检查。'
      throw new Error(`${error instanceof Error ? error.message : String(error)}。${rollbackMessage}`)
    }
  } catch (error) {
    if (resolvedImage.uploadedImage) {
      await deleteMainSkillImage(input.session, resolvedImage.uploadedImage.objectPath).catch(() => {})
    }

    throw error
  }
}

export async function updateMainSkillWithLevels(input: UpdateMainSkillInput): Promise<UpsertMainSkillResult> {
  assertEnv()

  const oldDraft = await fetchMainSkillDraft(input.session, input.skillId)
  const resolvedImage = await resolveImageUrl({
    session: input.session,
    imageUrl: input.imageUrl || oldDraft.imageUrl,
    imageFile: input.imageFile,
  })

  try {
    await patchMainSkill(input.session, input.skillId, {
      name: input.name,
      chinese_name: input.chineseName,
      description: input.description,
      image_url: resolvedImage.imageUrl,
    })

    const levelResult = await replaceLevels(input.session, input.skillId, input.description, input.levels)

    const oldObjectPath = tryExtractStorageObjectPath(oldDraft.imageUrl)
    const newObjectPath = tryExtractStorageObjectPath(resolvedImage.imageUrl)
    if (input.imageFile && oldObjectPath && newObjectPath && oldObjectPath !== newObjectPath) {
      await deleteMainSkillImage(input.session, oldObjectPath).catch(() => {})
    }

    return {
      mainSkillId: input.skillId,
      levelCount: levelResult.levelCount,
      imageUrl: resolvedImage.imageUrl,
    }
  } catch (error) {
    if (resolvedImage.uploadedImage) {
      await deleteMainSkillImage(input.session, resolvedImage.uploadedImage.objectPath).catch(() => {})
    }

    throw error
  }
}

export async function deleteMainSkill(session: AuthSession, skillId: number): Promise<void> {
  assertEnv()

  let imageUrl = ''
  try {
    const draft = await fetchMainSkillDraft(session, skillId)
    imageUrl = draft.imageUrl
  } catch {
    // Ignore read errors and continue deleting by id.
  }

  for (const table of levelTableCandidates) {
    for (const foreignKey of levelForeignKeyCandidates) {
      await deleteRows(table, new URLSearchParams({ [foreignKey]: `eq.${skillId}` }), session)
    }
  }

  const errors: string[] = []
  let deleted = false

  for (const table of mainSkillTableCandidates) {
    const result = await deleteRows(table, new URLSearchParams({ id: `eq.${skillId}` }), session)
    if (result.ok) {
      deleted = true
      break
    }

    errors.push(`${table}: ${result.message ?? 'delete failed'}`)
  }

  if (!deleted) {
    throw new Error(`删除主技能失败：${errors.join('；')}`)
  }

  const objectPath = tryExtractStorageObjectPath(imageUrl)
  if (objectPath) {
    await deleteMainSkillImage(session, objectPath).catch(() => {})
  }
}
