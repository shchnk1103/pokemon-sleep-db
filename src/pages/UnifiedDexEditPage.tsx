import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ImageDropzoneField } from '../components/ImageDropzoneField'
import { MaterialIcon } from '../components/MaterialIcon'
import { useAuth } from '../context/AuthContext'
import {
  fetchAssetDexEntries,
  invalidateAssetDexCache,
  updateAssetDexEntry,
} from '../services/catalogDex'
import { deletePublicImageByUrl, uploadPublicImage } from '../services/mediaStorage'
import { fetchDexEntries, invalidateDexCache, updatePokemonEntry } from '../services/pokedex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCatalog, SubSkillEffectType } from '../types/catalog'
import type { PokemonDexCard } from '../types/pokemon'

type UnifiedDexEditKind = 'pokemon' | 'berries' | 'ingredients' | 'subskills'
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

function getMeta(kind: UnifiedDexEditKind) {
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

export function UnifiedDexEditPage({ kind }: { kind: UnifiedDexEditKind }) {
  const { isReady, isAuthenticated, profile, session } = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const showToast = useToastStore((state) => state.showToast)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [assetDraft, setAssetDraft] = useState<AssetDraft | null>(null)
  const [pokemonDraft, setPokemonDraft] = useState<PokemonDraft | null>(null)
  const [assetImageFile, setAssetImageFile] = useState<File | null>(null)
  const [pokemonNormalImageFile, setPokemonNormalImageFile] = useState<File | null>(null)
  const [pokemonShinyImageFile, setPokemonShinyImageFile] = useState<File | null>(null)
  const [initialAssetImageUrl, setInitialAssetImageUrl] = useState('')
  const [initialPokemonNormalImageUrl, setInitialPokemonNormalImageUrl] = useState('')
  const [initialPokemonShinyImageUrl, setInitialPokemonShinyImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const meta = useMemo(() => getMeta(kind), [kind])
  const shouldRedirect = isReady && (!isAuthenticated || !profile?.isAdmin || !session)

  const rawId = kind === 'pokemon' ? params.pokemonId : params.entryId
  const parsedId = Number(rawId)

  useEffect(() => {
    if (!session || !Number.isInteger(parsedId) || parsedId <= 0) {
      return
    }

    let cancelled = false
    const run = async () => {
      setLoadState('loading')
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

      const catalog = kind as Exclude<AssetDexCatalog, 'mainskills'>
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
  }, [kind, parsedId, session])

  if (shouldRedirect) {
    return <Navigate to={meta.backTo} replace />
  }

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
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
      } else {
        if (!assetDraft) {
          throw new Error('未找到要编辑的图鉴项。')
        }

        let imageUrl = assetDraft.imageUrl.trim()
        if (assetImageFile) {
          imageUrl = await uploadPublicImage(session, assetImageFile, kind)
        }

        const catalog = kind as Exclude<AssetDexCatalog, 'mainskills'>
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
        id: `dex-edit-success-${kind}-${parsedId}`,
        message: '保存成功。',
        variant: 'success',
        durationMs: 3200,
      })
      navigate(meta.backTo)
    } catch (error) {
      showToast({
        id: `dex-edit-failed-${kind}-${parsedId}`,
        message: error instanceof Error ? error.message : '保存失败，请稍后重试。',
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
            <button type="submit" className="button primary" disabled={isSubmitting || loadState !== 'ready'}>
              {isSubmitting ? '保存中...' : '保存修改'}
            </button>
          </div>

          {loadState === 'loading' && <p className="page-status info">正在加载编辑数据...</p>}
          {loadState === 'error' && <p className="page-status warning">读取编辑数据失败或记录不存在。</p>}

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

          {loadState === 'ready' && kind !== 'pokemon' && assetDraft && (
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
