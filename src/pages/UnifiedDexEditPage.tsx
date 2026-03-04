import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ImageDropzoneField } from '../components/ImageDropzoneField'
import { MaterialIcon } from '../components/MaterialIcon'
import { useAuth } from '../context/AuthContext'
import { useCreateIdAutofill } from '../hooks/useCreateIdAutofill'
import {
  createNatureDexEntry,
  fetchNatureDexEntries,
  fetchAssetDexEntries,
  invalidateAssetDexCache,
  invalidateNatureDexCache,
  updateNatureDexEntry,
  updateAssetDexEntry,
} from '../services/catalogDex'
import { deletePublicImageByUrl, uploadPublicImage } from '../services/mediaStorage'
import { fetchDexEntries, invalidateDexCache, updatePokemonEntry } from '../services/pokedex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCatalog, NatureDexCard, SubSkillEffectType } from '../types/catalog'
import type { PokemonDexCard } from '../types/pokemon'

type UnifiedDexEditKind = 'pokemon' | 'berries' | 'ingredients' | 'subskills' | 'natures'
type LoadState = 'loading' | 'ready' | 'error'

type AssetDraft = {
  id: number
  chineseName: string
  name: string
  attribute: string
  eneryMin: string
  eneryMax: string
  energy: string
  price: string
  description: string
  value: string
  effectType: SubSkillEffectType
  imageUrl: string
}

type PokemonDraft = {
  id: number
  name: string
  type: string
  talent: string
  normalImageUrl: string
  shinyImageUrl: string
  mainSkillId: string
}

type NatureDraft = {
  id: number
  name: string
  belong: string
  upName: string
  upValue: string
  downName: string
  downValue: string
}

type NatureFieldKey = 'name' | 'belong' | 'upName' | 'upValue' | 'downName' | 'downValue'

const NATURE_FIELD_KEYS: NatureFieldKey[] = ['name', 'belong', 'upName', 'upValue', 'downName', 'downValue']
const EMPTY_NATURE_TOUCHED = NATURE_FIELD_KEYS.reduce(
  (acc, key) => {
    acc[key] = false
    return acc
  },
  {} as Record<NatureFieldKey, boolean>,
)

function toNumberOrNull(value: string) {
  const text = value.trim()
  if (!text) {
    return null
  }
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function buildAssetDraft(entry: {
  id: number
  chineseName: string | null
  name: string | null
  attribute: string | null
  eneryMin: number | null
  eneryMax: number | null
  energy: number | null
  price: number | null
  description: string | null
  value: string | null
  effectType: SubSkillEffectType
  imageUrl: string
}): AssetDraft {
  return {
    id: entry.id,
    chineseName: entry.chineseName ?? '',
    name: entry.name ?? '',
    attribute: entry.attribute ?? '',
    eneryMin: entry.eneryMin === null ? '' : String(entry.eneryMin),
    eneryMax: entry.eneryMax === null ? '' : String(entry.eneryMax),
    energy: entry.energy === null ? '' : String(entry.energy),
    price: entry.price === null ? '' : String(entry.price),
    description: entry.description ?? '',
    value: entry.value ?? '',
    effectType: entry.effectType,
    imageUrl: entry.imageUrl ?? '',
  }
}

function buildPokemonDraft(entry: PokemonDexCard): PokemonDraft {
  return {
    id: entry.dexNo,
    name: entry.name,
    type: entry.type,
    talent: entry.talent,
    normalImageUrl: entry.normalImageUrl,
    shinyImageUrl: entry.shinyImageUrl,
    mainSkillId: entry.mainSkill ? String(entry.mainSkill.id) : '',
  }
}

function buildNatureDraft(entry: NatureDexCard): NatureDraft {
  return {
    id: entry.id,
    name: entry.name,
    belong: entry.belong,
    upName: entry.upName,
    upValue: entry.upValue,
    downName: entry.downName,
    downValue: entry.downValue,
  }
}

function createEmptyNatureDraft(): NatureDraft {
  return {
    id: 0,
    name: '',
    belong: '',
    upName: '',
    upValue: '',
    downName: '',
    downValue: '',
  }
}

function clearUntouchedNatureFields(
  draft: NatureDraft,
  touched: Record<NatureFieldKey, boolean>,
  nextId: number,
): NatureDraft {
  const next = { ...draft, id: nextId }
  for (const key of NATURE_FIELD_KEYS) {
    if (!touched[key]) {
      next[key] = ''
    }
  }
  return next
}

function getMeta(kind: UnifiedDexEditKind, mode: 'edit' | 'create') {
  switch (kind) {
    case 'pokemon':
      return {
        title: '编辑宝可梦',
        description: '统一编辑宝可梦图鉴卡片的核心字段。',
        backTo: '/dex',
      }
    case 'berries':
      return {
        title: '编辑树果',
        description: '统一编辑树果图鉴字段。',
        backTo: '/dex/berries',
      }
    case 'ingredients':
      return {
        title: '编辑食材',
        description: '统一编辑食材图鉴字段。',
        backTo: '/dex/ingredients',
      }
    case 'subskills':
      return {
        title: '编辑副技能',
        description: '统一编辑副技能图鉴字段。',
        backTo: '/dex/sub-skills',
      }
    case 'natures':
      if (mode === 'create') {
        return {
          title: '新增性格',
          description: '创建新的性格图鉴记录。',
          backTo: '/dex/natures',
        }
      }
      return {
        title: '编辑性格',
        description: '统一编辑性格图鉴字段。',
        backTo: '/dex/natures',
      }
    default:
      return {
        title: '编辑副技能',
        description: '统一编辑副技能图鉴字段。',
        backTo: '/dex/sub-skills',
      }
  }
}

function renderAssetFields(kind: Exclude<UnifiedDexEditKind, 'pokemon'>, draft: AssetDraft, setDraft: (draft: AssetDraft) => void) {
  return (
    <>
      {(kind === 'berries' || kind === 'ingredients') && (
        <label className="auth-field">
          <span>chinese_name</span>
          <input type="text" value={draft.chineseName} onChange={(event) => setDraft({ ...draft, chineseName: event.target.value })} />
        </label>
      )}

      {kind === 'subskills' && (
        <label className="auth-field">
          <span>name</span>
          <input type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
      )}

      {kind === 'berries' && (
        <>
          <label className="auth-field">
            <span>attribute</span>
            <input type="text" value={draft.attribute} onChange={(event) => setDraft({ ...draft, attribute: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>enery_min</span>
            <input type="text" inputMode="numeric" value={draft.eneryMin} onChange={(event) => setDraft({ ...draft, eneryMin: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>enery_max</span>
            <input type="text" inputMode="numeric" value={draft.eneryMax} onChange={(event) => setDraft({ ...draft, eneryMax: event.target.value })} />
          </label>
        </>
      )}

      {kind === 'ingredients' && (
        <>
          <label className="auth-field">
            <span>energy</span>
            <input type="text" inputMode="numeric" value={draft.energy} onChange={(event) => setDraft({ ...draft, energy: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>price</span>
            <input type="text" inputMode="numeric" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} />
          </label>
        </>
      )}

      {kind === 'subskills' && (
        <>
          <label className="auth-field dex-edit-full">
            <span>description</span>
            <textarea
              className="mainskill-create-textarea"
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label className="auth-field">
            <span>value</span>
            <input type="text" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
          </label>
          <label className="auth-field">
            <span>effect_type</span>
            <select value={draft.effectType} onChange={(event) => setDraft({ ...draft, effectType: event.target.value as SubSkillEffectType })}>
              <option value="gold">gold</option>
              <option value="white">white</option>
              <option value="blue">blue</option>
              <option value="unknown">unknown</option>
            </select>
          </label>
        </>
      )}

    </>
  )
}

export function UnifiedDexEditPage({ kind, mode = 'edit' }: { kind: UnifiedDexEditKind; mode?: 'edit' | 'create' }) {
  const { isReady, isAuthenticated, profile, session } = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [assetDraft, setAssetDraft] = useState<AssetDraft | null>(null)
  const [pokemonDraft, setPokemonDraft] = useState<PokemonDraft | null>(null)
  const [natureDraft, setNatureDraft] = useState<NatureDraft | null>(null)
  const [manualNatureId, setManualNatureId] = useState('')
  const [natureTouched, setNatureTouched] = useState<Record<NatureFieldKey, boolean>>(EMPTY_NATURE_TOUCHED)
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null)
  const [pokemonNormalImageFile, setPokemonNormalImageFile] = useState<File | null>(null)
  const [pokemonShinyImageFile, setPokemonShinyImageFile] = useState<File | null>(null)
  const [initialAssetImageUrl, setInitialAssetImageUrl] = useState('')
  const [initialPokemonNormalImageUrl, setInitialPokemonNormalImageUrl] = useState('')
  const [initialPokemonShinyImageUrl, setInitialPokemonShinyImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCreateMode = mode === 'create' && kind === 'natures'
  const meta = useMemo(() => getMeta(kind, isCreateMode ? 'create' : 'edit'), [kind, isCreateMode])
  const shouldRedirect = isReady && (!isAuthenticated || !profile?.isAdmin || !session)

  const rawId = kind === 'pokemon' ? params.pokemonId : params.entryId
  const parsedId = Number(rawId)
  const needsId = !isCreateMode
  const parsedManualNatureId = Number(manualNatureId.trim())

  useEffect(() => {
    if (!session) {
      return
    }

    let cancelled = false
    const run = async () => {
      setLoadState('loading')
      if (isCreateMode) {
        setNatureDraft(createEmptyNatureDraft())
        setManualNatureId('')
        setNatureTouched(EMPTY_NATURE_TOUCHED)
        setLoadState('ready')
        return
      }

      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return
      }

      if (kind === 'pokemon') {
        const result = await fetchDexEntries()
        if (cancelled) {
          return
        }
        if (result.source !== 'supabase') {
          setLoadState('error')
          return
        }
        const item = result.data.find((entry) => entry.dexNo === parsedId) ?? null
        if (!item) {
          setLoadState('error')
          return
        }
        setPokemonDraft(buildPokemonDraft(item))
        setInitialPokemonNormalImageUrl(item.normalImageUrl)
        setInitialPokemonShinyImageUrl(item.shinyImageUrl)
        setPokemonNormalImageFile(null)
        setPokemonShinyImageFile(null)
        setLoadState('ready')
        return
      }

      if (kind === 'natures') {
        const result = await fetchNatureDexEntries()
        if (cancelled) {
          return
        }
        if (result.source !== 'supabase') {
          setLoadState('error')
          return
        }

        const item = result.data.find((entry) => entry.id === parsedId) ?? null
        if (!item) {
          setLoadState('error')
          return
        }

        setNatureDraft(buildNatureDraft(item))
        setManualNatureId(String(item.id))
        setNatureTouched(EMPTY_NATURE_TOUCHED)
        setLoadState('ready')
        return
      }

      const catalog = kind as Exclude<AssetDexCatalog, 'mainskills' | 'natures'>
      const result = await fetchAssetDexEntries(catalog)
      if (cancelled) {
        return
      }
      if (result.source !== 'supabase') {
        setLoadState('error')
        return
      }

      const item = result.data.find((entry) => entry.id === parsedId) ?? null
      if (!item) {
        setLoadState('error')
        return
      }
      setAssetDraft(buildAssetDraft(item))
      setInitialAssetImageUrl(item.imageUrl ?? '')
      setAssetImageFile(null)
      setLoadState('ready')
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [isCreateMode, kind, parsedId, session])

  const resolveNatureById = useCallback(
    async (id: number) => {
      const result = await fetchNatureDexEntries()
      if (result.source !== 'supabase') {
        throw new Error(result.message ?? '读取性格图鉴失败。')
      }
      return result.data.find((entry) => entry.id === id) ?? null
    },
    [],
  )

  const applyNatureFound = useCallback(
    (id: number, entry: NatureDexCard) => {
      setNatureDraft(buildNatureDraft(entry))
      setNatureTouched(EMPTY_NATURE_TOUCHED)
      showToast({
        id: `nature-id-resolved-${id}`,
        message: `检测到性格 ID ${id} 已存在，已自动加载数据。提交时将执行更新。`,
        variant: 'info',
        durationMs: 3200,
      })
    },
    [showToast],
  )

  const applyNatureMissing = useCallback(
    (id: number) => {
      setNatureDraft((current) => {
        if (!current) {
          return createEmptyNatureDraft()
        }
        return clearUntouchedNatureFields(current, natureTouched, id > 0 ? id : 0)
      })
      if (id > 0) {
        showToast({
          id: `nature-id-missing-${id}`,
          message: `性格 ID ${id} 不存在，已切换为新增模式。`,
          variant: 'info',
          durationMs: 2800,
        })
      }
    },
    [natureTouched, showToast],
  )

  const applyNatureResolveError = useCallback(
    (id: number, error: unknown) => {
      showToast({
        id: `nature-id-resolve-failed-${id}`,
        message: error instanceof Error ? error.message : '检测性格 ID 失败。',
        variant: 'warning',
        durationMs: 3600,
      })
    },
    [showToast],
  )

  const natureCreateAutofill = useCreateIdAutofill<NatureDexCard>({
    enabled: isCreateMode && Boolean(session),
    manualId: manualNatureId,
    isBusy: isSubmitting || loadState !== 'ready',
    resolveById: resolveNatureById,
    onFound: applyNatureFound,
    onMissing: applyNatureMissing,
    onError: applyNatureResolveError,
  })

  useEffect(() => {
    if (!isCreateMode) {
      return
    }

    if (natureCreateAutofill.isResolving) {
      const candidate = Number(manualNatureId.trim())
      showToast({
        id: 'nature-id-resolving',
        message: Number.isInteger(candidate) && candidate > 0 ? `正在检查性格 ID ${candidate}...` : '正在检查性格 ID...',
        variant: 'info',
        durationMs: null,
      })
      return
    }

    dismissToast('nature-id-resolving')
  }, [dismissToast, isCreateMode, manualNatureId, natureCreateAutofill.isResolving, showToast])

  useEffect(() => {
    return () => {
      dismissToast('nature-id-resolving')
    }
  }, [dismissToast])

  if (shouldRedirect) {
    return <Navigate to={meta.backTo} replace />
  }

  if (needsId && (!Number.isInteger(parsedId) || parsedId <= 0)) {
    return <Navigate to={meta.backTo} replace />
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      if (kind === 'pokemon') {
        if (!pokemonDraft) {
          throw new Error('未找到要编辑的宝可梦。')
        }

        let normalImageUrl = pokemonDraft.normalImageUrl.trim()
        let shinyImageUrl = pokemonDraft.shinyImageUrl.trim()

        if (pokemonNormalImageFile) {
          normalImageUrl = await uploadPublicImage(session, pokemonNormalImageFile, 'pokemon')
        }
        if (pokemonShinyImageFile) {
          shinyImageUrl = await uploadPublicImage(session, pokemonShinyImageFile, 'pokemon')
        }

        const mainSkillId = pokemonDraft.mainSkillId.trim() ? Number(pokemonDraft.mainSkillId.trim()) : null
        if (pokemonDraft.mainSkillId.trim() && (!Number.isInteger(mainSkillId) || (mainSkillId ?? 0) <= 0)) {
          throw new Error('main_skill_id 需为正整数或留空。')
        }

        await updatePokemonEntry(session, {
          id: pokemonDraft.id,
          name: pokemonDraft.name,
          type: pokemonDraft.type,
          talent: pokemonDraft.talent,
          normalImageUrl,
          shinyImageUrl,
          mainSkillId,
        })

        if (initialPokemonNormalImageUrl && initialPokemonNormalImageUrl !== normalImageUrl) {
          await deletePublicImageByUrl(session, initialPokemonNormalImageUrl).catch(() => {})
        }
        if (initialPokemonShinyImageUrl && initialPokemonShinyImageUrl !== shinyImageUrl) {
          await deletePublicImageByUrl(session, initialPokemonShinyImageUrl).catch(() => {})
        }

        invalidateDexCache()
      } else if (kind === 'natures') {
        if (!natureDraft) {
          throw new Error(isCreateMode ? '未找到要新增的性格数据。' : '未找到要编辑的性格。')
        }

        if (isCreateMode) {
          if (!Number.isInteger(parsedManualNatureId) || parsedManualNatureId <= 0) {
            throw new Error('请填写有效的性格 ID（正整数）。')
          }

          if (natureCreateAutofill.resolvedExistingId === parsedManualNatureId) {
            await updateNatureDexEntry(session, parsedManualNatureId, {
              name: natureDraft.name,
              belong: natureDraft.belong,
              upName: natureDraft.upName,
              upValue: natureDraft.upValue,
              downName: natureDraft.downName,
              downValue: natureDraft.downValue,
            })
          } else {
            await createNatureDexEntry(session, {
              id: parsedManualNatureId,
              name: natureDraft.name,
              belong: natureDraft.belong,
              upName: natureDraft.upName,
              upValue: natureDraft.upValue,
              downName: natureDraft.downName,
              downValue: natureDraft.downValue,
            })
          }
        } else {
          await updateNatureDexEntry(session, natureDraft.id, {
            name: natureDraft.name,
            belong: natureDraft.belong,
            upName: natureDraft.upName,
            upValue: natureDraft.upValue,
            downName: natureDraft.downName,
            downValue: natureDraft.downValue,
          })
        }
        invalidateNatureDexCache()
      } else {
        if (!assetDraft) {
          throw new Error('未找到要编辑的图鉴项。')
        }

        let imageUrl = assetDraft.imageUrl.trim()
        if (assetImageFile) {
          imageUrl = await uploadPublicImage(session, assetImageFile, kind)
        }

        const catalog = kind as Exclude<AssetDexCatalog, 'mainskills' | 'natures'>
        await updateAssetDexEntry(session, catalog, assetDraft.id, {
          chineseName: assetDraft.chineseName,
          name: assetDraft.name,
          attribute: assetDraft.attribute,
          eneryMin: toNumberOrNull(assetDraft.eneryMin),
          eneryMax: toNumberOrNull(assetDraft.eneryMax),
          energy: toNumberOrNull(assetDraft.energy),
          price: toNumberOrNull(assetDraft.price),
          description: assetDraft.description,
          value: assetDraft.value,
          effectType: assetDraft.effectType,
          imageUrl,
        })

        if (initialAssetImageUrl && initialAssetImageUrl !== imageUrl) {
          await deletePublicImageByUrl(session, initialAssetImageUrl).catch(() => {})
        }

        invalidateAssetDexCache(catalog)
      }

      showToast({
        id: `dex-edit-success-${kind}-${isCreateMode ? 'create' : parsedId}`,
        message:
          isCreateMode && natureCreateAutofill.resolvedExistingId === parsedManualNatureId
            ? '更新成功。'
            : isCreateMode
              ? '创建成功。'
              : '保存成功。',
        variant: 'success',
        durationMs: 3200,
      })
      navigate(meta.backTo)
    } catch (error) {
      showToast({
        id: `dex-edit-failed-${kind}-${isCreateMode ? 'create' : parsedId}`,
        message: error instanceof Error ? error.message : `${isCreateMode ? '创建' : '保存'}失败，请稍后重试。`,
        variant: 'warning',
        durationMs: 4200,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Dex Admin</p>
        <h2>{meta.title}</h2>
        <p>{meta.description}</p>
      </header>

      <article className="dex-card dex-edit-card">
        <form className="dex-edit-form" onSubmit={submit}>
          <div className="dex-edit-head">
            <Link to={meta.backTo} className="button ghost mainskill-create-back-btn">
              <MaterialIcon name="chevron_left" className="button-icon" size={18} />
              <span>返回图鉴</span>
            </Link>
            <button
              type="submit"
              className="button primary"
              disabled={isSubmitting || loadState !== 'ready' || (isCreateMode && natureCreateAutofill.isResolving)}
            >
              {isSubmitting ? (isCreateMode ? '创建中...' : '保存中...') : isCreateMode ? '创建性格' : '保存修改'}
            </button>
          </div>

          {loadState === 'loading' && <p className="page-status info">{isCreateMode ? '正在初始化创建表单...' : '正在加载编辑数据...'}</p>}
          {loadState === 'error' && <p className="page-status warning">{isCreateMode ? '创建表单初始化失败。' : '读取编辑数据失败或记录不存在。'}</p>}

          {loadState === 'ready' && kind === 'pokemon' && pokemonDraft && (
            <div className="dex-edit-grid">
              <label className="auth-field">
                <span>id</span>
                <input type="text" value={String(pokemonDraft.id)} disabled />
              </label>
              <label className="auth-field">
                <span>name</span>
                <input type="text" value={pokemonDraft.name} onChange={(event) => setPokemonDraft({ ...pokemonDraft, name: event.target.value })} />
              </label>
              <label className="auth-field">
                <span>type</span>
                <input type="text" value={pokemonDraft.type} onChange={(event) => setPokemonDraft({ ...pokemonDraft, type: event.target.value })} />
              </label>
              <label className="auth-field">
                <span>talent</span>
                <input
                  type="text"
                  value={pokemonDraft.talent}
                  onChange={(event) => setPokemonDraft({ ...pokemonDraft, talent: event.target.value })}
                />
              </label>
              <div className="dex-edit-full dex-edit-image-pair">
                <ImageDropzoneField
                  label="普通图片"
                  imageUrl={pokemonDraft.normalImageUrl}
                  file={pokemonNormalImageFile}
                  disabled={isSubmitting}
                  onPickFile={(file) => {
                    setPokemonNormalImageFile(file)
                  }}
                  onClear={() => {
                    setPokemonNormalImageFile(null)
                    setPokemonDraft({ ...pokemonDraft, normalImageUrl: '' })
                  }}
                />
                <ImageDropzoneField
                  label="闪光图片"
                  imageUrl={pokemonDraft.shinyImageUrl}
                  file={pokemonShinyImageFile}
                  disabled={isSubmitting}
                  onPickFile={(file) => {
                    setPokemonShinyImageFile(file)
                  }}
                  onClear={() => {
                    setPokemonShinyImageFile(null)
                    setPokemonDraft({ ...pokemonDraft, shinyImageUrl: '' })
                  }}
                />
              </div>
              <label className="auth-field">
                <span>main_skill_id（可留空）</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={pokemonDraft.mainSkillId}
                  onChange={(event) => setPokemonDraft({ ...pokemonDraft, mainSkillId: event.target.value.replace(/[^\d]/g, '') })}
                />
              </label>
            </div>
          )}

          {loadState === 'ready' && kind === 'natures' && natureDraft && (
            <div className="dex-edit-grid">
              <label className="auth-field">
                <span>id</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isCreateMode ? manualNatureId : String(natureDraft.id)}
                  onChange={(event) => {
                    if (!isCreateMode) {
                      return
                    }
                    const nextValue = event.target.value.replace(/[^\d]/g, '')
                    setManualNatureId(nextValue)
                    natureCreateAutofill.reset()
                  }}
                  placeholder={isCreateMode ? '例如: 1' : undefined}
                  disabled={!isCreateMode || isSubmitting}
                />
              </label>
              <label className="auth-field">
                <span>name</span>
                <input
                  type="text"
                  value={natureDraft.name}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, name: true }))
                    setNatureDraft({ ...natureDraft, name: event.target.value })
                  }}
                />
              </label>
              <label className="auth-field">
                <span>belong</span>
                <input
                  type="text"
                  value={natureDraft.belong}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, belong: true }))
                    setNatureDraft({ ...natureDraft, belong: event.target.value })
                  }}
                />
              </label>
              <label className="auth-field">
                <span>up_name</span>
                <input
                  type="text"
                  value={natureDraft.upName}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, upName: true }))
                    setNatureDraft({ ...natureDraft, upName: event.target.value })
                  }}
                />
              </label>
              <label className="auth-field">
                <span>up_value</span>
                <input
                  type="text"
                  value={natureDraft.upValue}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, upValue: true }))
                    setNatureDraft({ ...natureDraft, upValue: event.target.value })
                  }}
                />
              </label>
              <label className="auth-field">
                <span>down_name</span>
                <input
                  type="text"
                  value={natureDraft.downName}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, downName: true }))
                    setNatureDraft({ ...natureDraft, downName: event.target.value })
                  }}
                />
              </label>
              <label className="auth-field">
                <span>down_value</span>
                <input
                  type="text"
                  value={natureDraft.downValue}
                  onChange={(event) => {
                    setNatureTouched((current) => ({ ...current, downValue: true }))
                    setNatureDraft({ ...natureDraft, downValue: event.target.value })
                  }}
                />
              </label>
            </div>
          )}

          {loadState === 'ready' && kind !== 'pokemon' && kind !== 'natures' && assetDraft && (
            <div className="dex-edit-grid">
              <label className="auth-field">
                <span>id</span>
                <input type="text" value={String(assetDraft.id)} disabled />
              </label>
              {renderAssetFields(kind, assetDraft, setAssetDraft)}
              <div className="dex-edit-full">
                <ImageDropzoneField
                  label="图片"
                  imageUrl={assetDraft.imageUrl}
                  file={assetImageFile}
                  disabled={isSubmitting}
                  onPickFile={(file) => {
                    setAssetImageFile(file)
                  }}
                  onClear={() => {
                    setAssetImageFile(null)
                    setAssetDraft({ ...assetDraft, imageUrl: '' })
                  }}
                />
              </div>
            </div>
          )}
        </form>
      </article>
    </section>
  )
}
