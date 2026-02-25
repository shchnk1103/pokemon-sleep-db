import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDexEntries } from '../services/pokedex'
import { useToastStore } from '../stores/toastStore'
import type { PokemonDexCard, PokemonIngredientItem, PokemonIngredientLevel } from '../types/pokemon'

type LoadState = 'loading' | 'ready' | 'error'
type ImageMode = 'normal' | 'shiny'

const PAGE_SIZE = 24

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function scorePokemon(pokemon: PokemonDexCard, query: string): number {
  const q = normalizeText(query)
  if (!q) {
    return 0
  }

  const compactQuery = q.replace(/\s+/g, '')
  const isNumericQuery = /^\d+$/.test(q)
  const numericQuery = isNumericQuery ? Number.parseInt(q, 10) : null
  const hasLeadingZeroNumericQuery = isNumericQuery && q.length > 1 && q.startsWith('0')
  const idText = String(pokemon.dexNo)
  const idPadded = idText.padStart(Math.max(3, q.length), '0')
  const name = normalizeText(pokemon.name)
  const type = normalizeText(pokemon.type)
  const talent = normalizeText(pokemon.talent)
  const mainSkillName = normalizeText(pokemon.mainSkill?.name ?? '')
  const ingredientNames = pokemon.ingredientsByLevel
    .flatMap((level) => level.items.map((item) => normalizeText(item.name)))
    .join(' ')

  let score = 0

  if (isNumericQuery && numericQuery !== null && Number.isFinite(numericQuery)) {
    const canonicalNumeric = String(numericQuery)

    if (hasLeadingZeroNumericQuery) {
      if (idPadded === q || idText === q) score += 260
      else if (idText.endsWith(q) || idPadded.endsWith(q)) score += 180
      else if (idText.includes(q) || idPadded.includes(q)) score += 95
    } else {
      if (pokemon.dexNo === numericQuery) score += 260
      if (idPadded === q) score += 220
      else if (idText === canonicalNumeric) score += 200
      else if (idPadded.startsWith(q) || idText.startsWith(canonicalNumeric)) score += 90
      else if (idText.includes(canonicalNumeric)) score += 25
    }
  } else {
    if (idText === q) score += 160
    else if (idText.startsWith(q)) score += 100
    else if (idText.includes(q)) score += 60
  }

  if (name === q) score += 150
  else if (name.startsWith(q)) score += 110
  else if (name.includes(q)) score += 80

  if (mainSkillName.includes(q)) score += 70
  if (ingredientNames.includes(q)) score += 55
  if (type.includes(q)) score += 30
  if (talent.includes(q)) score += 20

  const compactName = name.replace(/\s+/g, '')
  const compactSkill = mainSkillName.replace(/\s+/g, '')
  const compactIngredients = ingredientNames.replace(/\s+/g, '')

  if (compactName.includes(compactQuery)) score += 25
  if (compactSkill.includes(compactQuery)) score += 15
  if (compactIngredients.includes(compactQuery)) score += 15

  return score
}

function AssetRow({
  label,
  items,
}: {
  label: string
  items: PokemonIngredientItem[]
}) {
  return (
    <div className="asset-section">
      <p className="asset-title">{label}</p>
      <div className="asset-list">
        {items.length === 0 && <span className="asset-empty">暂无</span>}
        {items.map((item) => (
          <span key={`${label}-${item.id}`} className="asset-chip">
            {item.iconUrl ? <img src={item.iconUrl} alt={item.name} /> : <span className="asset-dot" />}
            <span>{item.name}</span>
            <em>x{item.quantity}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

function IngredientLevelRow({ levelData }: { levelData: PokemonIngredientLevel }) {
  return (
    <div className="asset-section ingredient-level-row">
      <p className="asset-title">Lv.{levelData.level}</p>
      <div className="asset-list">
        {levelData.items.length === 0 && <span className="asset-empty">暂无</span>}
        {levelData.items.map((item) => (
          <span key={`lv-${levelData.level}-${item.id}`} className="asset-chip">
            {item.iconUrl ? <img src={item.iconUrl} alt={item.name} /> : <span className="asset-dot" />}
            <span>{item.name}</span>
            <em>x{item.quantity}</em>
          </span>
        ))}
      </div>
    </div>
  )
}

function PokemonCard({ pokemon }: { pokemon: PokemonDexCard }) {
  const [mode, setMode] = useState<ImageMode>('normal')
  const [displayedImage, setDisplayedImage] = useState(pokemon.normalImageUrl || pokemon.shinyImageUrl)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const loadedUrlsRef = useRef<Set<string>>(new Set())

  const hasShiny = Boolean(pokemon.shinyImageUrl)
  const normalUrl = pokemon.normalImageUrl || pokemon.shinyImageUrl
  const shinyUrl = pokemon.shinyImageUrl || pokemon.normalImageUrl

  useEffect(() => {
    const candidates = [normalUrl, shinyUrl].filter((url): url is string => Boolean(url))

    for (const url of candidates) {
      if (loadedUrlsRef.current.has(url)) {
        continue
      }

      const image = new Image()
      image.onload = () => {
        loadedUrlsRef.current.add(url)
      }
      image.onerror = () => {
        loadedUrlsRef.current.add(url)
      }
      image.src = url
    }
  }, [normalUrl, shinyUrl])

  const changeMode = (nextMode: ImageMode) => {
    if (nextMode === mode || isImageLoading) {
      return
    }

    const targetUrl = nextMode === 'normal' ? normalUrl : shinyUrl
    if (!targetUrl || targetUrl === displayedImage) {
      setMode(nextMode)
      return
    }

    setMode(nextMode)
    setIsImageLoading(!loadedUrlsRef.current.has(targetUrl))
    setDisplayedImage(targetUrl)
  }

  const imageAltText = useMemo(
    () => `${pokemon.name}${mode === 'shiny' ? '（闪光）' : '（普通）'}`,
    [mode, pokemon.name],
  )

  return (
    <article className="dex-card pokemon-card">
      <div className="pokemon-image-wrap">
        <div className={`shiny-segment mode-${mode} ${isImageLoading ? 'is-loading' : ''}`}>
          <span className="shiny-segment-indicator" aria-hidden="true" />
          <button
            type="button"
            className={mode === 'normal' ? 'active' : ''}
            onClick={() => changeMode('normal')}
            disabled={isImageLoading}
          >
            普通
          </button>
          <button
            type="button"
            className={mode === 'shiny' ? 'active' : ''}
            onClick={() => changeMode('shiny')}
            disabled={isImageLoading || !hasShiny}
            title={hasShiny ? '切换闪光形态' : '暂无闪光图'}
          >
            闪光
          </button>
        </div>

        {displayedImage ? (
          <>
            <img
              src={displayedImage}
              alt={imageAltText}
              className="pokemon-image"
              loading="lazy"
              onLoad={() => {
                if (displayedImage) {
                  loadedUrlsRef.current.add(displayedImage)
                }
                setIsImageLoading(false)
              }}
              onError={() => {
                if (displayedImage) {
                  loadedUrlsRef.current.add(displayedImage)
                }
                setIsImageLoading(false)
              }}
            />
            {isImageLoading && (
              <div className="pokemon-image-loading" aria-live="polite">
                <span className="loading-spinner" />
                <span>图片加载中...</span>
              </div>
            )}
          </>
        ) : (
          <div className="pokemon-image-fallback">无图片</div>
        )}
      </div>

      <div className="dex-head">
        <span className="dex-no">#{pokemon.dexNo.toString().padStart(3, '0')}</span>
        <h3>{pokemon.name}</h3>
      </div>

      <dl className="pokemon-meta">
        <div>
          <dt>属性</dt>
          <dd>{pokemon.type}</dd>
        </div>
        <div>
          <dt>专长</dt>
          <dd>{pokemon.talent}</dd>
        </div>
      </dl>

      <div className="asset-section">
        <p className="asset-title">主技能</p>
        {pokemon.mainSkill ? (
          <span className="asset-chip main-skill-chip">
            {pokemon.mainSkill.iconUrl ? (
              <img src={pokemon.mainSkill.iconUrl} alt={pokemon.mainSkill.name} />
            ) : (
              <span className="asset-dot" />
            )}
            <span>{pokemon.mainSkill.name}</span>
          </span>
        ) : (
          <span className="asset-empty">暂无</span>
        )}
      </div>

      <AssetRow label="树果" items={pokemon.berries} />

      <div className="asset-section">
        <p className="asset-title">食材（分等级）</p>
        <div className="ingredient-level-list">
          {pokemon.ingredientsByLevel.length === 0 && <span className="asset-empty">暂无</span>}
          {pokemon.ingredientsByLevel.map((levelData) => (
            <IngredientLevelRow key={`ingredient-level-${pokemon.id}-${levelData.level}`} levelData={levelData} />
          ))}
        </div>
      </div>
    </article>
  )
}

export function DexPage() {
  const [allEntries, setAllEntries] = useState<PokemonDexCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)
  const searchWrapRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadState('loading')
      showToast({
        id: 'pokedex-loading',
        message: '正在从 Supabase 加载图鉴数据...',
        variant: 'info',
        durationMs: null,
      })
      const result = await fetchDexEntries()

      if (cancelled) {
        return
      }

      dismissToast('pokedex-loading')

      if (result.source === 'supabase') {
        setAllEntries(result.data)
        setLoadState('ready')
        if (result.message) {
          showToast({
            id: 'pokedex-load-done',
            message: result.message,
            variant: 'success',
            durationMs: 4200,
          })
        }
      } else {
        setAllEntries([])
        setLoadState('error')
        showToast({
          id: 'pokedex-load-failed',
          message: result.message ?? '图鉴加载失败，请稍后再试。',
          variant: 'warning',
          durationMs: 5200,
        })
      }
    }

    void run()

    return () => {
      cancelled = true
      dismissToast('pokedex-loading')
    }
  }, [dismissToast, showToast])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchQuery.trim()) {
        return
      }

      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setIsSearchExpanded(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [searchQuery])

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim()
    if (!query) {
      return [...allEntries].sort((a, b) => a.dexNo - b.dexNo)
    }

    return [...allEntries]
      .map((pokemon) => ({
        pokemon,
        score: scorePokemon(pokemon, query),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score
        }

        return a.pokemon.dexNo - b.pokemon.dexNo
      })
      .map((item) => item.pokemon)
  }, [allEntries, searchQuery])

  const visibleEntries = useMemo(
    () => filteredEntries.slice(0, visibleCount),
    [filteredEntries, visibleCount],
  )

  const hasMore = visibleCount < filteredEntries.length

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery])

  useEffect(() => {
    if (!hasMore || loadState !== 'ready') {
      return
    }

    const node = loaderRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entriesObserve) => {
        const target = entriesObserve[0]
        if (!target?.isIntersecting || isLoadingMore) {
          return
        }

        setIsLoadingMore(true)
        window.requestAnimationFrame(() => {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, filteredEntries.length))
          setIsLoadingMore(false)
        })
      },
      {
        rootMargin: '220px 0px',
      },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [filteredEntries.length, hasMore, isLoadingMore, loadState])

  const searchEnabled = loadState === 'ready'
  const showExpandedSearch = isSearchExpanded || searchQuery.trim().length > 0

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Pokedex</p>
        <h2>宝可梦图鉴</h2>
        <p>默认按 ID 升序；搜索时按最相关结果排序（ID/名字/主技能/食材）。</p>
      </header>

      <div
        ref={searchWrapRef}
        className={`search-dock ${showExpandedSearch ? 'expanded' : ''} ${searchEnabled ? '' : 'disabled'}`}
        onMouseEnter={() => searchEnabled && setIsSearchExpanded(true)}
        onMouseLeave={() => {
          if (searchEnabled && !searchQuery.trim()) {
            setIsSearchExpanded(false)
          }
        }}
      >
        <button
          type="button"
          className="search-trigger"
          onClick={() => {
            if (!searchEnabled) return

            if (showExpandedSearch) {
              searchInputRef.current?.focus()
              return
            }

            setIsSearchExpanded(true)
            window.requestAnimationFrame(() => {
              searchInputRef.current?.focus()
            })
          }}
          disabled={!searchEnabled}
          aria-expanded={showExpandedSearch}
          aria-controls="pokedex-search-input"
        >
          搜索
        </button>

        <input
          id="pokedex-search-input"
          ref={searchInputRef}
          className="pokedex-search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onFocus={() => searchEnabled && setIsSearchExpanded(true)}
          placeholder={searchEnabled ? '搜索 ID、名字、主技能或食材...' : '图鉴加载中，搜索暂不可用...'}
          disabled={!searchEnabled}
          aria-label="搜索宝可梦"
        />
      </div>

      {loadState === 'ready' && searchQuery.trim() !== '' && (
        <p className="page-status info inline">共匹配 {filteredEntries.length} 条结果，按相关性排序。</p>
      )}

      <div className="dex-grid pokemon-dex-grid">
        {visibleEntries.map((pokemon) => (
          <PokemonCard key={pokemon.id} pokemon={pokemon} />
        ))}
      </div>

      {loadState === 'ready' && (
        <div className="pokedex-footer" ref={loaderRef}>
          {isLoadingMore && <p className="page-status info inline">正在加载更多宝可梦...</p>}
          {!hasMore && filteredEntries.length > 0 && (
            <p className="page-status success inline">
              {searchQuery.trim() ? '已展示全部匹配结果。' : `已展示全部 ${filteredEntries.length} 条宝可梦数据。`}
            </p>
          )}
          {filteredEntries.length === 0 && searchQuery.trim() !== '' && (
            <p className="page-status warning inline">没有匹配到相关宝可梦，请尝试其他关键词。</p>
          )}
        </div>
      )}

    </section>
  )
}
