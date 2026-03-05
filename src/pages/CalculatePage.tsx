import { useEffect, useMemo, useRef, useState } from 'react'
import { AddedConfigsSection } from '../components/calculate/AddedConfigsSection'
import { CalculateBuilderForm } from '../components/calculate/CalculateBuilderForm'
import { NatureSelectionModal } from '../components/calculate/NatureSelectionModal'
import { SubSkillSelectionModal } from '../components/calculate/SubSkillSelectionModal'
import { MaterialIcon } from '../components/MaterialIcon'
import { ModalShell } from '../components/ModalShell'
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
const CALCULATE_ADDED_CONFIGS_STORAGE_KEY = 'calculate:added-configs:v1'

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

function normalizeStoredSubSkillsByLevel(raw: unknown): Record<number, number | null> {
  const base = createEmptyLevelSelection()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  const map = raw as Record<string, unknown>
  for (const level of SUBSKILL_LEVELS) {
    const value = map[String(level)]
    if (value === null) {
      base[level] = null
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      base[level] = value
    }
  }
  return base
}

type AddedCalculationConfig = {
  id: string
  pokemon: PokemonDexCard
  level: number
  natureId: number | null
  natureLabel: string
  subSkillsByLevel: Record<number, number | null>
}

function createCalculationConfigId(dexNo: number): string {
  return `${dexNo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
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
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const text = window.localStorage.getItem(CALCULATE_ADDED_CONFIGS_STORAGE_KEY)
      if (!text) {
        return
      }

      const parsed = JSON.parse(text) as unknown
      if (!Array.isArray(parsed)) {
        return
      }

      const restored: AddedCalculationConfig[] = []
      for (const item of parsed) {
        if (!item || typeof item !== 'object') {
          continue
        }
        const raw = item as Record<string, unknown>
        const pokemon = raw.pokemon as PokemonDexCard | undefined
        if (!pokemon || typeof pokemon !== 'object') {
          continue
        }
        if (typeof pokemon.dexNo !== 'number' || !Number.isFinite(pokemon.dexNo) || typeof pokemon.name !== 'string') {
          continue
        }

        const id = typeof raw.id === 'string' && raw.id ? raw.id : createCalculationConfigId(pokemon.dexNo)
        const level = clampPokemonLevel(typeof raw.level === 'number' ? raw.level : POKEMON_LEVEL_MIN)
        const natureId = typeof raw.natureId === 'number' && Number.isFinite(raw.natureId) ? raw.natureId : null
        const natureLabel = typeof raw.natureLabel === 'string' && raw.natureLabel ? raw.natureLabel : '未选择性格'

        restored.push({
          id,
          pokemon,
          level,
          natureId,
          natureLabel,
          subSkillsByLevel: normalizeStoredSubSkillsByLevel(raw.subSkillsByLevel),
        })
      }

      setAddedConfigs(restored)
    } catch {
      // Ignore malformed local cache.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      if (addedConfigs.length === 0) {
        window.localStorage.removeItem(CALCULATE_ADDED_CONFIGS_STORAGE_KEY)
        return
      }
      window.localStorage.setItem(CALCULATE_ADDED_CONFIGS_STORAGE_KEY, JSON.stringify(addedConfigs))
    } catch {
      // Ignore write failures (private mode/quota).
    }
  }, [addedConfigs])

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
    setEditingConfigId(null)
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

  const removeConfig = (configId: string) => {
    setAddedConfigs((current) => current.filter((item) => item.id !== configId))
  }

  const copyConfig = (configId: string) => {
    setAddedConfigs((current) => {
      const index = current.findIndex((item) => item.id === configId)
      if (index < 0) {
        return current
      }

      const source = current[index]
      const cloned: AddedCalculationConfig = {
        ...source,
        id: createCalculationConfigId(source.pokemon.dexNo),
        subSkillsByLevel: { ...source.subSkillsByLevel },
      }
      return [...current.slice(0, index + 1), cloned, ...current.slice(index + 1)]
    })
  }

  const editConfig = (config: AddedCalculationConfig) => {
    const fallbackNature = natures.find((item) => getNatureLabel(item) === config.natureLabel) ?? null
    const resolvedNatureId =
      config.natureId !== null && natures.some((item) => item.id === config.natureId) ? config.natureId : fallbackNature?.id ?? null

    setEditingConfigId(config.id)
    setSelectedPokemonId(String(config.pokemon.dexNo))
    setSelectedPokemonLevel(clampPokemonLevel(config.level))
    setSelectedSubSkillsByLevel(normalizeStoredSubSkillsByLevel(config.subSkillsByLevel))
    setSelectedNatureId(resolvedNatureId !== null ? String(resolvedNatureId) : '')
    setSelectedNatureUpEffect('')
    setSelectedNatureDownEffect('')
    setIsNatureModalDirty(false)
    setActiveSubSkillLevel(SUBSKILL_LEVELS.find((level) => config.subSkillsByLevel[level] === null) ?? SUBSKILL_LEVELS[0])
    setIsBuilderOpen(true)
  }

  const addConfig = () => {
    if (!selectedPokemon) {
      return
    }

    const nextConfig: AddedCalculationConfig = {
      id: editingConfigId ?? createCalculationConfigId(selectedPokemon.dexNo),
      pokemon: selectedPokemon,
      level: selectedPokemonLevel,
      natureId: selectedNature ? selectedNature.id : null,
      natureLabel: selectedNature ? getNatureLabel(selectedNature) : '未选择性格',
      subSkillsByLevel: { ...selectedSubSkillsByLevel },
    }

    setAddedConfigs((current) => {
      if (!editingConfigId) {
        return [...current, nextConfig]
      }
      return current.map((item) => (item.id === editingConfigId ? nextConfig : item))
    })

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
          onClick={() => {
            resetSelections()
            setIsBuilderOpen(true)
          }}
          disabled={loadState === 'loading'}
          aria-expanded={isBuilderOpen}
          aria-controls="calculate-builder-panel"
          title="新增计算配置"
        >
          <MaterialIcon name="add" className="calculate-add-icon" size={24} />
        </button>
      </header>

      <article className="dex-card calculate-card">
        {addedConfigs.length === 0 && (
          <p className="calculate-trigger-hint">
            {loadState === 'loading' ? '正在加载宝可梦与副技能数据...' : '点击加号开始新增一组计算配置'}
          </p>
        )}

        {loadState === 'error' && <p className="page-status warning inline">加载失败，请检查数据源配置后重试。</p>}

        <AddedConfigsSection
          addedConfigs={addedConfigs}
          subSkillLevels={SUBSKILL_LEVELS}
          subSkillById={subSkillById}
          onEdit={editConfig}
          onCopy={copyConfig}
          onDelete={removeConfig}
          getPokemonImageUrl={getPokemonImageUrl}
          getPokemonLabel={getPokemonLabel}
          getSubSkillLabel={getSubSkillLabel}
          SubSkillEffectIcon={SubSkillEffectIcon}
        />
      </article>

      {isBuilderOpen && loadState === 'ready' && (
        <ModalShell
          ariaLabel="添加配置"
          backdropClassName="calculate-subskill-modal-backdrop"
          panelClassName="calculate-subskill-modal calculate-builder-modal"
          onClose={() => setIsBuilderOpen(false)}
        >
          <section id="calculate-builder-panel">
            <header className="asset-modal-header calculate-subskill-modal-header">
              <p className="asset-modal-eyebrow">Config</p>
              <h3>{editingConfigId ? '编辑配置' : '添加配置'}</h3>
              <button type="button" className="button ghost calculate-builder-close-btn" onClick={() => setIsBuilderOpen(false)}>
                关闭
              </button>
            </header>

            <CalculateBuilderForm
              pokemonSelectRef={pokemonSelectRef}
              isPokemonDropdownOpen={isPokemonDropdownOpen}
              selectedPokemon={selectedPokemon}
              selectedPokemonId={selectedPokemonId}
              pokemonQuery={pokemonQuery}
              filteredPokemons={filteredPokemons}
              selectedPokemonLevel={selectedPokemonLevel}
              pokemonLevelMin={POKEMON_LEVEL_MIN}
              pokemonLevelMax={POKEMON_LEVEL_MAX}
              pokemonLevelPresets={POKEMON_LEVEL_PRESETS}
              selectedSubSkillCount={selectedSubSkillCount}
              subSkillLevels={SUBSKILL_LEVELS}
              selectedSubSkillsByLevel={selectedSubSkillsByLevel}
              subSkillById={subSkillById}
              selectedNature={selectedNature}
              isNatureModalOpen={isNatureModalOpen}
              canAddConfig={canAddConfig}
              editingConfigId={editingConfigId}
              onTogglePokemonDropdown={() => setIsPokemonDropdownOpen((current) => !current)}
              onPokemonQueryChange={setPokemonQuery}
              onSelectPokemon={(pokemon) => {
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
              onPokemonLevelChange={(value) => setSelectedPokemonLevel(clampPokemonLevel(value))}
              onSubSkillSlotClick={handleSubSkillSlotClick}
              onSubSkillSlotDoubleClick={handleSubSkillSlotDoubleClick}
              onOpenNatureModal={() => {
                setSelectedNatureUpEffect(selectedNature ? normalizeNatureEffectName(selectedNature.upName) : '')
                setSelectedNatureDownEffect(selectedNature ? normalizeNatureEffectName(selectedNature.downName) : '')
                setIsNatureModalDirty(false)
                setIsNatureModalOpen(true)
              }}
              onClearNature={() => {
                setSelectedNatureId('')
                setSelectedNatureUpEffect('')
                setSelectedNatureDownEffect('')
                setIsNatureModalDirty(false)
              }}
              onResetSelections={resetSelections}
              onAddConfig={addConfig}
              getPokemonImageUrl={getPokemonImageUrl}
              getNatureLabel={getNatureLabel}
              getSubSkillLabel={getSubSkillLabel}
              formatNatureEffectName={formatNatureEffectName}
              formatPokemonMetric={formatPokemonMetric}
              SubSkillEffectIcon={SubSkillEffectIcon}
            />
          </section>
        </ModalShell>
      )}

      <NatureSelectionModal
        isOpen={isNatureModalOpen}
        onClose={() => setIsNatureModalOpen(false)}
        natureUpEffects={natureUpEffects}
        natureDownEffects={natureDownEffects}
        selectedNatureUpEffect={selectedNatureUpEffect}
        selectedNatureDownEffect={selectedNatureDownEffect}
        formatNatureEffectName={formatNatureEffectName}
        onSelectUpEffect={(effect) => {
          if (selectedNatureUpEffect !== effect) {
            setIsNatureModalDirty(true)
          }
          setSelectedNatureUpEffect(effect)
        }}
        onSelectDownEffect={(effect) => {
          if (selectedNatureDownEffect !== effect) {
            setIsNatureModalDirty(true)
          }
          setSelectedNatureDownEffect(effect)
        }}
      />

      <SubSkillSelectionModal
        isOpen={isSubSkillModalOpen}
        onClose={() => setIsSubSkillModalOpen(false)}
        title={selectedPokemon ? `${getPokemonLabel(selectedPokemon)} - 副技能` : '副技能选择'}
        subSkillLevels={SUBSKILL_LEVELS}
        activeSubSkillLevel={activeSubSkillLevel}
        selectedSubSkillCount={selectedSubSkillCount}
        selectedSubSkillsByLevel={selectedSubSkillsByLevel}
        subSkillById={subSkillById}
        subSkillOwnerLevelMap={subSkillOwnerLevelMap}
        groupedSubSkills={groupedSubSkills}
        subSkillsLength={subSkills.length}
        onActiveSubSkillLevelChange={setActiveSubSkillLevel}
        onSelectSubSkill={selectSubSkillFromModal}
        onClearSubSkillAtLevel={clearSubSkillSelection}
        onLockedSubSkillClick={(subSkillId, ownerLevel) => {
          showToast({
            id: `calculate-subskill-locked-${subSkillId}-${ownerLevel}`,
            message: `该副技能已被 Lv${ownerLevel} 使用，请先取消后再选择。`,
            variant: 'info',
            durationMs: 2000,
          })
        }}
        getSubSkillLabel={getSubSkillLabel}
        SubSkillEffectIcon={SubSkillEffectIcon}
      />
    </section>
  )
}
