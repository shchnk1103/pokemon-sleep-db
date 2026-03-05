import { useEffect, useMemo, useRef, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { fetchAssetDexEntries, fetchNatureDexEntries } from '../services/catalogDex'
import { fetchDexEntries } from '../services/pokedex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCard, NatureDexCard } from '../types/catalog'
import type { PokemonDexCard } from '../types/pokemon'

type LoadState = 'loading' | 'ready' | 'error'

const SUBSKILL_LEVELS = [1, 25, 50, 75, 100] as const
const SUBSKILL_EFFECT_ORDER = ['gold', 'blue', 'white'] as const
const POKEMON_LEVEL_PRESETS = [1, 10, 25, 30, 50, 60, 65, 75, 100] as const
const POKEMON_LEVEL_MIN = 1
const POKEMON_LEVEL_MAX = 100

function normalizeNatureEffectName(value: string): string {
  const text = value.trim()
  if (!text) {
    return ''
  }
  const lowered = text.toLowerCase()
  if (lowered === 'none' || lowered === 'null') {
    return ''
  }
  return text
}

function formatNatureEffectName(value: string): string {
  const normalized = normalizeNatureEffectName(value)
  return normalized || '-'
}

function getNatureLabel(nature: NatureDexCard): string {
  return nature.name.trim() || `#${nature.id}`
}

function createEmptyLevelSelection(): Record<number, number | null> {
  return {
    1: null,
    25: null,
    50: null,
    75: null,
    100: null,
  }
}

function getSubSkillLabel(skill: AssetDexCard): string {
  return skill.chineseName ?? skill.name ?? `ID ${skill.id}`
}

function getSubSkillEffectClass(skill: AssetDexCard): string {
  if (skill.effectType === 'gold' || skill.effectType === 'white' || skill.effectType === 'blue') {
    return `effect-${skill.effectType}`
  }
  return 'effect-unknown'
}

function getSubSkillIconUrl(skill: AssetDexCard): string {
  return skill.imageUrl.trim()
}

function SubSkillEffectIcon({ skill }: { skill: AssetDexCard }) {
  const iconUrl = getSubSkillIconUrl(skill)
  return (
    <span className={`calculate-subskill-effect-icon ${getSubSkillEffectClass(skill)}`} aria-hidden="true">
      {iconUrl ? <img src={iconUrl} alt="" /> : <span className="calculate-subskill-effect-fallback">✦</span>}
    </span>
  )
}

function getPokemonLabel(pokemon: PokemonDexCard): string {
  return `#${pokemon.dexNo.toString().padStart(3, '0')} ${pokemon.name}`
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function getPokemonImageUrl(pokemon: PokemonDexCard): string {
  return pokemon.normalImageUrl || pokemon.shinyImageUrl || ''
}

function formatPokemonMetric(value: number | null, suffix = ''): string {
  if (value === null || !Number.isFinite(value)) {
    return '--'
  }
  return `${value}${suffix}`
}

function clampPokemonLevel(value: number): number {
  if (!Number.isFinite(value)) {
    return POKEMON_LEVEL_MIN
  }
  return Math.min(POKEMON_LEVEL_MAX, Math.max(POKEMON_LEVEL_MIN, Math.round(value)))
}

type AddedCalculationConfig = {
  id: string
  pokemon: PokemonDexCard
  level: number
  natureLabel: string
  subSkillsByLevel: Record<number, number | null>
}

export function CalculatePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [pokemons, setPokemons] = useState<PokemonDexCard[]>([])
  const [subSkills, setSubSkills] = useState<AssetDexCard[]>([])
  const [natures, setNatures] = useState<NatureDexCard[]>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedPokemonId, setSelectedPokemonId] = useState('')
  const [selectedPokemonLevel, setSelectedPokemonLevel] = useState<number>(POKEMON_LEVEL_MIN)
  const [pokemonQuery, setPokemonQuery] = useState('')
  const [isPokemonDropdownOpen, setIsPokemonDropdownOpen] = useState(false)
  const [selectedNatureId, setSelectedNatureId] = useState('')
  const [isNatureModalOpen, setIsNatureModalOpen] = useState(false)
  const [selectedNatureUpEffect, setSelectedNatureUpEffect] = useState('')
  const [selectedNatureDownEffect, setSelectedNatureDownEffect] = useState('')
  const [isNatureModalDirty, setIsNatureModalDirty] = useState(false)
  const [isSubSkillModalOpen, setIsSubSkillModalOpen] = useState(false)
  const [activeSubSkillLevel, setActiveSubSkillLevel] = useState<number>(SUBSKILL_LEVELS[0])
  const [addedConfigs, setAddedConfigs] = useState<AddedCalculationConfig[]>([])
  const [selectedSubSkillsByLevel, setSelectedSubSkillsByLevel] = useState<Record<number, number | null>>(
    createEmptyLevelSelection(),
  )
  const slotClickTimerRef = useRef<number | null>(null)
  const pokemonSelectRef = useRef<HTMLDivElement | null>(null)
  const showToast = useToastStore((state) => state.showToast)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadState('loading')
      const [pokemonResult, subSkillResult, natureResult] = await Promise.all([
        fetchDexEntries(),
        fetchAssetDexEntries('subskills'),
        fetchNatureDexEntries(),
      ])

      if (cancelled) {
        return
      }

      if (pokemonResult.source !== 'supabase' || subSkillResult.source !== 'supabase' || natureResult.source !== 'supabase') {
        setLoadState('error')
        showToast({
          id: 'calculate-load-failed',
          message: pokemonResult.message ?? subSkillResult.message ?? natureResult.message ?? '计算页面加载失败，请稍后重试。',
          variant: 'warning',
          durationMs: 5200,
        })
        return
      }

      setPokemons([...pokemonResult.data].sort((a, b) => a.dexNo - b.dexNo))
      setSubSkills([...subSkillResult.data].sort((a, b) => a.id - b.id))
      setNatures([...natureResult.data].sort((a, b) => a.id - b.id))
      setLoadState('ready')
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [showToast])

  const selectedPokemon = useMemo(
    () => pokemons.find((pokemon) => String(pokemon.dexNo) === selectedPokemonId) ?? null,
    [pokemons, selectedPokemonId],
  )

  const subSkillById = useMemo(() => new Map(subSkills.map((skill) => [skill.id, skill])), [subSkills])
  const subSkillOwnerLevelMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const level of SUBSKILL_LEVELS) {
      const skillId = selectedSubSkillsByLevel[level]
      if (skillId !== null) {
        map.set(skillId, level)
      }
    }
    return map
  }, [selectedSubSkillsByLevel])

  const selectedNature = useMemo(
    () => natures.find((item) => String(item.id) === selectedNatureId) ?? null,
    [natures, selectedNatureId],
  )

  const natureUpEffects = useMemo(() => {
    const unique = new Set<string>()
    for (const nature of natures) {
      unique.add(normalizeNatureEffectName(nature.upName))
    }
    return [...unique]
  }, [natures])

  const natureDownEffects = useMemo(() => {
    const unique = new Set<string>()
    for (const nature of natures) {
      unique.add(normalizeNatureEffectName(nature.downName))
    }
    return [...unique]
  }, [natures])

  const canAddConfig = Boolean(selectedPokemon)

  const filteredPokemons = useMemo(() => {
    const normalizedQuery = normalizeSearchText(pokemonQuery)
    if (!normalizedQuery) {
      return pokemons
    }

    return pokemons.filter((pokemon) => {
      const dexText = String(pokemon.dexNo)
      const paddedDex = dexText.padStart(3, '0')
      const name = normalizeSearchText(pokemon.name)
      return name.includes(normalizedQuery) || dexText.includes(normalizedQuery) || paddedDex.includes(normalizedQuery)
    })
  }, [pokemons, pokemonQuery])

  const selectedSubSkillCount = useMemo(
    () => SUBSKILL_LEVELS.filter((level) => selectedSubSkillsByLevel[level] !== null).length,
    [selectedSubSkillsByLevel],
  )

  const groupedSubSkills = useMemo(
    () =>
      SUBSKILL_EFFECT_ORDER.map((effectType) => ({
        effectType,
        items: subSkills.filter((skill) => skill.effectType === effectType),
      })),
    [subSkills],
  )

  const resetSelections = () => {
    setSelectedPokemonId('')
    setSelectedPokemonLevel(POKEMON_LEVEL_MIN)
    setPokemonQuery('')
    setSelectedNatureId('')
    setSelectedNatureUpEffect('')
    setSelectedNatureDownEffect('')
    setIsNatureModalDirty(false)
    setSelectedSubSkillsByLevel(createEmptyLevelSelection())
    setActiveSubSkillLevel(SUBSKILL_LEVELS[0])
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!pokemonSelectRef.current?.contains(event.target as Node)) {
        setIsPokemonDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!selectedPokemonId) {
      return
    }
    setIsPokemonDropdownOpen(false)
  }, [selectedPokemonId])

  useEffect(() => {
    if (!isSubSkillModalOpen && !isNatureModalOpen && !isBuilderOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSubSkillModalOpen(false)
        setIsNatureModalOpen(false)
        setIsBuilderOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isBuilderOpen, isNatureModalOpen, isSubSkillModalOpen])

  useEffect(() => {
    if (!isNatureModalOpen) {
      return
    }
    if (!selectedNature) {
      return
    }

    setSelectedNatureUpEffect(normalizeNatureEffectName(selectedNature.upName))
    setSelectedNatureDownEffect(normalizeNatureEffectName(selectedNature.downName))
    setIsNatureModalDirty(false)
  }, [isNatureModalOpen, selectedNature])

  useEffect(() => {
    if (!isNatureModalOpen) {
      return
    }
    if (!isNatureModalDirty) {
      return
    }
    if (!selectedNatureUpEffect && !selectedNatureDownEffect) {
      return
    }
    if (!selectedNatureUpEffect || !selectedNatureDownEffect) {
      return
    }

    const matched = natures.find(
      (item) =>
        normalizeNatureEffectName(item.upName) === selectedNatureUpEffect &&
        normalizeNatureEffectName(item.downName) === selectedNatureDownEffect,
    )

    if (!matched) {
      showToast({
        id: 'calculate-nature-no-match',
        message: '未匹配到对应性格，请调整积极/消极效果组合。',
        variant: 'info',
        durationMs: 2600,
      })
      return
    }

    setSelectedNatureId(String(matched.id))
    setIsNatureModalDirty(false)
    setIsNatureModalOpen(false)
    showToast({
      id: `calculate-nature-selected-${matched.id}`,
      message: `已选择性格：${getNatureLabel(matched)}`,
      variant: 'success',
      durationMs: 1800,
    })
  }, [isNatureModalDirty, isNatureModalOpen, natures, selectedNatureDownEffect, selectedNatureUpEffect, showToast])

  const openSubSkillModal = (level: number) => {
    setActiveSubSkillLevel(level)
    setIsSubSkillModalOpen(true)
  }

  const clearSubSkillSelection = (level: number) => {
    setSelectedSubSkillsByLevel((current) => ({
      ...current,
      [level]: null,
    }))
  }

  const selectSubSkillFromModal = (subSkillId: number) => {
    const selectedForCurrentLevel = selectedSubSkillsByLevel[activeSubSkillLevel] === subSkillId
    if (selectedForCurrentLevel) {
      return
    }

    const alreadyUsed = Object.entries(selectedSubSkillsByLevel).some(
      ([rawLevel, skillId]) => Number(rawLevel) !== activeSubSkillLevel && skillId === subSkillId,
    )

    if (alreadyUsed) {
      showToast({
        id: `calculate-duplicate-subskill-${activeSubSkillLevel}-${subSkillId}`,
        message: '副技能不能重复选择。',
        variant: 'info',
        durationMs: 2200,
      })
      return
    }

    const nextSelections = {
      ...selectedSubSkillsByLevel,
      [activeSubSkillLevel]: subSkillId,
    }
    setSelectedSubSkillsByLevel(nextSelections)

    const firstUnselectedLevel = SUBSKILL_LEVELS.find((level) => nextSelections[level] === null)
    if (firstUnselectedLevel === undefined) {
      setIsSubSkillModalOpen(false)
      return
    }

    setActiveSubSkillLevel(firstUnselectedLevel)
  }

  const handleSubSkillSlotClick = (level: number) => {
    if (slotClickTimerRef.current !== null) {
      window.clearTimeout(slotClickTimerRef.current)
      slotClickTimerRef.current = null
    }

    slotClickTimerRef.current = window.setTimeout(() => {
      openSubSkillModal(level)
      slotClickTimerRef.current = null
    }, 180)
  }

  const handleSubSkillSlotDoubleClick = (level: number, hasSelection: boolean) => {
    if (slotClickTimerRef.current !== null) {
      window.clearTimeout(slotClickTimerRef.current)
      slotClickTimerRef.current = null
    }

    if (!hasSelection) {
      return
    }

    clearSubSkillSelection(level)
    if (activeSubSkillLevel === level) {
      setIsSubSkillModalOpen(false)
    }
  }

  const addConfig = () => {
    if (!selectedPokemon) {
      return
    }

    setAddedConfigs((current) => [
      ...current,
      {
        id: `${selectedPokemon.dexNo}-${Date.now()}`,
        pokemon: selectedPokemon,
        level: selectedPokemonLevel,
        natureLabel: selectedNature ? getNatureLabel(selectedNature) : '未选择性格',
        subSkillsByLevel: { ...selectedSubSkillsByLevel },
      },
    ])

    resetSelections()
    setIsPokemonDropdownOpen(false)
    setIsSubSkillModalOpen(false)
    setIsBuilderOpen(false)
  }

  return (
    <section className="page">
      <header className="section-header calculate-header">
        <div className="calculate-header-copy">
          <p className="eyebrow">Tools</p>
          <h2>计算</h2>
          <p>选择宝可梦并配置 5 个等级副技能（Lv1/Lv25/Lv50/Lv75/Lv100）。同一副技能不可重复选择。</p>
        </div>
        <button
          type="button"
          className="calculate-add-trigger calculate-add-trigger-floating"
          onClick={() => setIsBuilderOpen(true)}
          disabled={loadState === 'loading'}
          aria-expanded={isBuilderOpen}
          aria-controls="calculate-builder-panel"
          title="新增计算配置"
        >
          <MaterialIcon name="add" className="calculate-add-icon" size={24} />
        </button>
      </header>

      <article className="dex-card calculate-card">
        <p className="calculate-trigger-hint">
          {loadState === 'loading' ? '正在加载宝可梦与副技能数据...' : '点击加号开始新增一组计算配置'}
        </p>

        {loadState === 'error' && <p className="page-status warning inline">加载失败，请检查数据源配置后重试。</p>}

        {addedConfigs.length > 0 && (
          <section className="calculate-added-configs" aria-label="已添加配置">
            <h3>已添加配置</h3>
            <div className="calculate-added-list">
              {addedConfigs.map((config) => (
                <article key={config.id} className="calculate-added-item">
                  <header>
                    {getPokemonImageUrl(config.pokemon) ? (
                      <img src={getPokemonImageUrl(config.pokemon)} alt={config.pokemon.name} />
                    ) : (
                      <span className="calculate-pokemon-option-dot" aria-hidden="true" />
                    )}
                    <strong>{getPokemonLabel(config.pokemon)}</strong>
                    <span className="calculate-added-level">{`Lv${config.level}`}</span>
                    <span className="calculate-added-nature">{config.natureLabel}</span>
                  </header>
                  <div className="calculate-added-subskills">
                    {SUBSKILL_LEVELS.map((level) => {
                      const subSkillId = config.subSkillsByLevel[level]
                      const selectedSubSkill = subSkillId !== null ? subSkillById.get(subSkillId) ?? null : null
                      return (
                        <span key={`added-${config.id}-lv-${level}`} className="asset-chip">
                          <strong>{`Lv${level}`}</strong>
                          {selectedSubSkill ? (
                            <>
                              <SubSkillEffectIcon skill={selectedSubSkill} />
                              <em>{getSubSkillLabel(selectedSubSkill)}</em>
                            </>
                          ) : (
                            <em>未选择</em>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>

      {isBuilderOpen && loadState === 'ready' && (
        <div className="asset-modal-backdrop calculate-subskill-modal-backdrop" onClick={() => setIsBuilderOpen(false)}>
          <section
            id="calculate-builder-panel"
            className="asset-modal-panel calculate-subskill-modal calculate-builder-modal"
            role="dialog"
            aria-modal="true"
            aria-label="添加配置"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="asset-modal-header calculate-subskill-modal-header">
              <p className="asset-modal-eyebrow">Config</p>
              <h3>添加配置</h3>
              <button type="button" className="button ghost calculate-builder-close-btn" onClick={() => setIsBuilderOpen(false)}>
                关闭
              </button>
            </header>

            <section className="calculate-builder">
              <div className="auth-field">
                <span>宝可梦</span>
                <div ref={pokemonSelectRef} className={`calculate-pokemon-select ${isPokemonDropdownOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="calculate-pokemon-trigger"
                    onClick={() => setIsPokemonDropdownOpen((current) => !current)}
                    aria-expanded={isPokemonDropdownOpen}
                    aria-controls="calculate-pokemon-dropdown"
                  >
                    {selectedPokemon ? (
                      <span className="calculate-pokemon-option-value">
                        {getPokemonImageUrl(selectedPokemon) ? (
                          <img src={getPokemonImageUrl(selectedPokemon)} alt={selectedPokemon.name} />
                        ) : (
                          <span className="calculate-pokemon-option-dot" aria-hidden="true" />
                        )}
                        <strong>{`#${selectedPokemon.dexNo.toString().padStart(3, '0')}`}</strong>
                        <em>{selectedPokemon.name}</em>
                      </span>
                    ) : (
                      <span className="calculate-pokemon-placeholder">请选择宝可梦</span>
                    )}
                  </button>

                  {isPokemonDropdownOpen && (
                    <div id="calculate-pokemon-dropdown" className="calculate-pokemon-dropdown" role="listbox" aria-label="宝可梦列表">
                      <input
                        type="search"
                        value={pokemonQuery}
                        onChange={(event) => setPokemonQuery(event.target.value)}
                        className="calculate-pokemon-search-input"
                        placeholder="搜索宝可梦名称或编号"
                        aria-label="搜索宝可梦"
                      />
                      <div className="calculate-pokemon-options">
                        {filteredPokemons.map((pokemon) => (
                          <button
                            key={pokemon.id}
                            type="button"
                            className={`calculate-pokemon-option ${selectedPokemonId === String(pokemon.dexNo) ? 'active' : ''}`}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setSelectedPokemonId(String(pokemon.dexNo))
                              setSelectedPokemonLevel(POKEMON_LEVEL_MIN)
                              setSelectedNatureId('')
                              setSelectedNatureUpEffect('')
                              setSelectedNatureDownEffect('')
                              setIsNatureModalDirty(false)
                              setSelectedSubSkillsByLevel(createEmptyLevelSelection())
                              setActiveSubSkillLevel(SUBSKILL_LEVELS[0])
                              setIsPokemonDropdownOpen(false)
                            }}
                            role="option"
                            aria-selected={selectedPokemonId === String(pokemon.dexNo)}
                          >
                            {getPokemonImageUrl(pokemon) ? (
                              <img src={getPokemonImageUrl(pokemon)} alt={pokemon.name} />
                            ) : (
                              <span className="calculate-pokemon-option-dot" aria-hidden="true" />
                            )}
                            <strong>{`#${pokemon.dexNo.toString().padStart(3, '0')}`}</strong>
                            <em>{pokemon.name}</em>
                          </button>
                        ))}
                        {filteredPokemons.length === 0 && <p className="calculate-pokemon-empty">没有匹配到宝可梦</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedPokemon && (
                <section className="calculate-level-card" aria-label="宝可梦等级设置">
                  <div className="calculate-level-header">
                    <span>宝可梦等级</span>
                    <strong>{selectedPokemonLevel}</strong>
                  </div>
                  <input
                    type="range"
                    min={POKEMON_LEVEL_MIN}
                    max={POKEMON_LEVEL_MAX}
                    step={1}
                    value={selectedPokemonLevel}
                    onChange={(event) => setSelectedPokemonLevel(clampPokemonLevel(Number(event.target.value)))}
                    className="calculate-level-slider"
                    aria-label="宝可梦等级滑块"
                  />
                  <div className="calculate-level-presets" role="listbox" aria-label="等级快捷选择">
                    {POKEMON_LEVEL_PRESETS.map((level) => (
                      <button
                        key={`pokemon-level-${level}`}
                        type="button"
                        className={`calculate-level-preset ${selectedPokemonLevel === level ? 'active' : ''}`}
                        onClick={() => setSelectedPokemonLevel(level)}
                        role="option"
                        aria-selected={selectedPokemonLevel === level}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {selectedPokemon && (
                <dl className="calculate-pokemon-stats" aria-label="宝可梦属性">
                  <div className="calculate-pokemon-stat-item">
                    <dt>食材几率</dt>
                    <dd>{formatPokemonMetric(selectedPokemon.ingredientDropRate, '%')}</dd>
                  </div>
                  <div className="calculate-pokemon-stat-item">
                    <dt>技能触发几率</dt>
                    <dd>{formatPokemonMetric(selectedPokemon.skillTriggerRate, '%')}</dd>
                  </div>
                  <div className="calculate-pokemon-stat-item">
                    <dt>技能保底触发次数</dt>
                    <dd>{formatPokemonMetric(selectedPokemon.skillPityTriggerRequiredAssists, '次')}</dd>
                  </div>
                  <div className="calculate-pokemon-stat-item">
                    <dt>帮忙间隔</dt>
                    <dd>{formatPokemonMetric(selectedPokemon.assistInterval, ' s')}</dd>
                  </div>
                </dl>
              )}

              <div className="calculate-subskill-section">
                <div className="calculate-subskill-header">
                  <span>副技能</span>
                  <small>{`已选择 ${selectedSubSkillCount}/5`}</small>
                </div>

                <div className="calculate-subskill-grid">
                  {SUBSKILL_LEVELS.map((level) => {
                    const subSkillId = selectedSubSkillsByLevel[level]
                    const selectedSubSkill = subSkillId !== null ? subSkillById.get(subSkillId) ?? null : null
                    return (
                      <button
                        key={`subskill-level-${level}`}
                        type="button"
                        className={`calculate-subskill-slot ${subSkillId !== null ? 'filled' : ''}`}
                        onClick={() => handleSubSkillSlotClick(level)}
                        onDoubleClick={() => handleSubSkillSlotDoubleClick(level, subSkillId !== null)}
                        title={subSkillId !== null ? '双击可取消当前副技能' : '点击选择副技能'}
                      >
                        <strong>{`Lv${level}`}</strong>
                        {selectedSubSkill ? (
                          <span className="calculate-subskill-slot-value">
                            <SubSkillEffectIcon skill={selectedSubSkill} />
                            <em>{getSubSkillLabel(selectedSubSkill)}</em>
                          </span>
                        ) : (
                          <em>点击选择副技能</em>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="auth-field">
                <span>性格</span>
                <div className="calculate-nature-picker-wrap">
                  <button
                    type="button"
                    className="calculate-nature-picker-trigger"
                    onClick={() => {
                      setSelectedNatureUpEffect(selectedNature ? normalizeNatureEffectName(selectedNature.upName) : '')
                      setSelectedNatureDownEffect(selectedNature ? normalizeNatureEffectName(selectedNature.downName) : '')
                      setIsNatureModalDirty(false)
                      setIsNatureModalOpen(true)
                    }}
                    aria-haspopup="dialog"
                    aria-expanded={isNatureModalOpen}
                  >
                    {selectedNature ? (
                      <span className="calculate-nature-picker-value">
                        <strong>{getNatureLabel(selectedNature)}</strong>
                        <em className="calculate-nature-picker-effects">
                          <span className="calculate-nature-picker-effect">
                            <MaterialIcon name="arrow_drop_up" className="calculate-nature-up-icon" size={18} />
                            <span>{formatNatureEffectName(selectedNature.upName)}</span>
                          </span>
                          <span className="calculate-nature-picker-split">/</span>
                          <span className="calculate-nature-picker-effect">
                            <MaterialIcon name="arrow_drop_down" className="calculate-nature-down-icon" size={18} />
                            <span>{formatNatureEffectName(selectedNature.downName)}</span>
                          </span>
                        </em>
                      </span>
                    ) : (
                      <span className="calculate-pokemon-placeholder">请选择性格（弹窗）</span>
                    )}
                  </button>
                  {selectedNature && (
                    <button
                      type="button"
                      className="calculate-nature-delete-btn"
                      aria-label="清空性格"
                      title="清空性格"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedNatureId('')
                        setSelectedNatureUpEffect('')
                        setSelectedNatureDownEffect('')
                        setIsNatureModalDirty(false)
                      }}
                    >
                      <MaterialIcon name="delete" size={16} className="calculate-nature-delete-icon" />
                    </button>
                  )}
                </div>
                <small className="profile-edit-hint">选择积极与消极效果后将自动匹配唯一性格。</small>
              </div>

              <div className="calculate-actions">
                <button type="button" className="button ghost" onClick={resetSelections}>
                  清空
                </button>
                <button
                  type="button"
                  className="button primary calculate-add-config-btn"
                  onClick={addConfig}
                  disabled={!canAddConfig}
                  aria-label="添加当前配置"
                  title="添加当前配置"
                >
                  <img src="/icons/material/add.svg" alt="" aria-hidden="true" />
                </button>
              </div>
            </section>
          </section>
        </div>
      )}

      {isNatureModalOpen && (
        <div className="asset-modal-backdrop calculate-subskill-modal-backdrop" onClick={() => setIsNatureModalOpen(false)}>
          <section
            className="asset-modal-panel calculate-subskill-modal calculate-nature-modal"
            role="dialog"
            aria-modal="true"
            aria-label="选择性格效果"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="asset-modal-header calculate-subskill-modal-header">
              <p className="asset-modal-eyebrow">Nature</p>
              <h3>选择性格效果</h3>
            </header>

            <div className="calculate-nature-effect-panel">
              <div className="calculate-nature-effect-row">
                <p>
                  <MaterialIcon name="arrow_drop_up" className="calculate-nature-up-icon" size={18} />
                  积极效果
                </p>
                <div className={`calculate-nature-effect-options ${selectedNatureUpEffect ? 'has-selection' : ''}`}>
                  {natureUpEffects.map((effect) => {
                    const lockedByDown = selectedNatureDownEffect === effect && effect !== ''
                    return (
                    <button
                      key={`nature-up-${effect || 'none'}`}
                      type="button"
                      className={`calculate-nature-effect-option ${selectedNatureUpEffect === effect ? 'active' : ''} ${selectedNatureUpEffect && selectedNatureUpEffect !== effect ? 'dimmed' : ''} ${lockedByDown ? 'is-locked' : ''}`}
                      onClick={() => {
                        if (lockedByDown) {
                          return
                        }
                        if (selectedNatureUpEffect !== effect) {
                          setIsNatureModalDirty(true)
                        }
                        setSelectedNatureUpEffect(effect)
                      }}
                      disabled={lockedByDown}
                      aria-disabled={lockedByDown}
                    >
                      {formatNatureEffectName(effect)}
                    </button>
                    )
                  })}
                </div>
              </div>

              <div className="calculate-nature-effect-row">
                <p>
                  <MaterialIcon name="arrow_drop_down" className="calculate-nature-down-icon" size={18} />
                  消极效果
                </p>
                <div className={`calculate-nature-effect-options ${selectedNatureDownEffect ? 'has-selection' : ''}`}>
                  {natureDownEffects.map((effect) => {
                    const lockedByUp = selectedNatureUpEffect === effect && effect !== ''
                    return (
                    <button
                      key={`nature-down-${effect || 'none'}`}
                      type="button"
                      className={`calculate-nature-effect-option ${selectedNatureDownEffect === effect ? 'active' : ''} ${selectedNatureDownEffect && selectedNatureDownEffect !== effect ? 'dimmed' : ''} ${lockedByUp ? 'is-locked' : ''}`}
                      onClick={() => {
                        if (lockedByUp) {
                          return
                        }
                        if (selectedNatureDownEffect !== effect) {
                          setIsNatureModalDirty(true)
                        }
                        setSelectedNatureDownEffect(effect)
                      }}
                      disabled={lockedByUp}
                      aria-disabled={lockedByUp}
                    >
                      {formatNatureEffectName(effect)}
                    </button>
                    )
                  })}
                </div>
              </div>

              <p className="calculate-subskill-modal-hint">
                已选：{`↑ ${formatNatureEffectName(selectedNatureUpEffect)} / ↓ ${formatNatureEffectName(selectedNatureDownEffect)}`}
              </p>
            </div>
          </section>
        </div>
      )}

      {isSubSkillModalOpen && (
        <div className="asset-modal-backdrop calculate-subskill-modal-backdrop" onClick={() => setIsSubSkillModalOpen(false)}>
          <section className="asset-modal-panel calculate-subskill-modal" role="dialog" aria-modal="true" aria-label="选择副技能" onClick={(event) => event.stopPropagation()}>
            <header className="asset-modal-header calculate-subskill-modal-header">
              <p className="asset-modal-eyebrow">Sub Skill</p>
              <h3>{selectedPokemon ? `${getPokemonLabel(selectedPokemon)} - 副技能` : '副技能选择'}</h3>
            </header>

            <div className="calculate-subskill-modal-levels">
              {SUBSKILL_LEVELS.map((level) => {
                const selectedSubSkillId = selectedSubSkillsByLevel[level]
                const selectedSubSkill = selectedSubSkillId !== null ? subSkillById.get(selectedSubSkillId) ?? null : null
                return (
                  <button
                    key={`modal-level-${level}`}
                    type="button"
                    className={`calculate-subskill-level-tab ${activeSubSkillLevel === level ? 'active' : ''}`}
                    onClick={() => setActiveSubSkillLevel(level)}
                  >
                    <span className="calculate-subskill-level-tab-label">{`Lv${level}`}</span>
                    {selectedSubSkill && <SubSkillEffectIcon skill={selectedSubSkill} />}
                  </button>
                )
              })}
            </div>

            <p className="calculate-subskill-modal-hint">{`请按顺序选择，当前：Lv${activeSubSkillLevel}（已选 ${selectedSubSkillCount}/5，双击已选项可取消）`}</p>

            <div className="calculate-subskill-modal-sections" role="listbox" aria-label="副技能列表">
              {groupedSubSkills.map((section) => (
                <section
                  key={`subskill-section-${section.effectType}`}
                  className={`calculate-subskill-effect-section effect-${section.effectType}`}
                  aria-label={`${section.effectType} 副技能`}
                >
                  <header className="calculate-subskill-effect-section-title">
                    {section.effectType === 'gold' ? '金色技能' : section.effectType === 'blue' ? '蓝色技能' : '白色技能'}
                  </header>
                  <div className="calculate-subskill-modal-options">
                    {section.items.map((subSkill) => {
                      const ownerLevel = subSkillOwnerLevelMap.get(subSkill.id) ?? null
                      const selectedForCurrentLevel = ownerLevel === activeSubSkillLevel
                      const lockedByOtherLevel = ownerLevel !== null && ownerLevel !== activeSubSkillLevel
                      return (
                        <button
                          key={`modal-subskill-${subSkill.id}`}
                          type="button"
                          className={`calculate-subskill-modal-option ${selectedForCurrentLevel ? 'active' : ''} ${lockedByOtherLevel ? 'is-locked' : ''}`}
                          onClick={() => {
                            if (lockedByOtherLevel) {
                              showToast({
                                id: `calculate-subskill-locked-${subSkill.id}-${ownerLevel}`,
                                message: `该副技能已被 Lv${ownerLevel} 使用，请先取消后再选择。`,
                                variant: 'info',
                                durationMs: 2000,
                              })
                              return
                            }
                            selectSubSkillFromModal(subSkill.id)
                          }}
                          onDoubleClick={() => {
                            if (!selectedForCurrentLevel) {
                              return
                            }
                            clearSubSkillSelection(activeSubSkillLevel)
                          }}
                          aria-disabled={lockedByOtherLevel}
                          title={selectedForCurrentLevel ? '双击可取消当前等级的副技能' : lockedByOtherLevel ? `已被 Lv${ownerLevel} 使用` : undefined}
                        >
                          <SubSkillEffectIcon skill={subSkill} />
                          <em>{getSubSkillLabel(subSkill)}</em>
                        </button>
                      )
                    })}
                    {section.items.length === 0 && <p className="calculate-pokemon-empty">该颜色暂无副技能</p>}
                  </div>
                </section>
              ))}
              {subSkills.length === 0 && <p className="calculate-pokemon-empty">暂无副技能数据</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
