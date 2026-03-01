import { useEffect, useMemo, useState } from 'react'
import { MaterialIcon } from '../components/MaterialIcon'
import { fetchAssetDexEntries } from '../services/catalogDex'
import { fetchDexEntries } from '../services/pokedex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCard } from '../types/catalog'
import type { PokemonDexCard } from '../types/pokemon'

type LoadState = 'loading' | 'ready' | 'error'

const SUBSKILL_LEVELS = [1, 25, 50, 75, 100] as const

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

export function CalculatePage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [pokemons, setPokemons] = useState<PokemonDexCard[]>([])
  const [subSkills, setSubSkills] = useState<AssetDexCard[]>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [selectedPokemonId, setSelectedPokemonId] = useState('')
  const [selectedSubSkillsByLevel, setSelectedSubSkillsByLevel] = useState<Record<number, number | null>>(
    createEmptyLevelSelection(),
  )
  const showToast = useToastStore((state) => state.showToast)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoadState('loading')
      const [pokemonResult, subSkillResult] = await Promise.all([
        fetchDexEntries(),
        fetchAssetDexEntries('subskills'),
      ])

      if (cancelled) {
        return
      }

      if (pokemonResult.source !== 'supabase' || subSkillResult.source !== 'supabase') {
        setLoadState('error')
        showToast({
          id: 'calculate-load-failed',
          message: pokemonResult.message ?? subSkillResult.message ?? '计算页面加载失败，请稍后重试。',
          variant: 'warning',
          durationMs: 5200,
        })
        return
      }

      setPokemons([...pokemonResult.data].sort((a, b) => a.dexNo - b.dexNo))
      setSubSkills([...subSkillResult.data].sort((a, b) => a.id - b.id))
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

  const selectedSkillIds = useMemo(
    () => new Set(Object.values(selectedSubSkillsByLevel).filter((value): value is number => value !== null)),
    [selectedSubSkillsByLevel],
  )

  const resetSelections = () => {
    setSelectedPokemonId('')
    setSelectedSubSkillsByLevel(createEmptyLevelSelection())
  }

  const onSubSkillChange = (level: number, rawValue: string) => {
    const nextSkillId = rawValue ? Number(rawValue) : null
    if (nextSkillId !== null && !Number.isFinite(nextSkillId)) {
      return
    }

    const alreadyUsed = Object.entries(selectedSubSkillsByLevel).some(
      ([rawLevel, skillId]) => Number(rawLevel) !== level && skillId === nextSkillId,
    )

    if (alreadyUsed) {
      showToast({
        id: `calculate-duplicate-subskill-${level}-${nextSkillId ?? 'none'}`,
        message: '副技能不能重复选择。',
        variant: 'info',
        durationMs: 2200,
      })
      return
    }

    setSelectedSubSkillsByLevel((current) => ({
      ...current,
      [level]: nextSkillId,
    }))
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Tools</p>
        <h2>计算</h2>
        <p>选择宝可梦并配置 5 个等级副技能（Lv1/Lv25/Lv50/Lv75/Lv100）。同一副技能不可重复选择。</p>
      </header>

      <article className="dex-card calculate-card">
        <button
          type="button"
          className="calculate-add-trigger"
          onClick={() => setIsBuilderOpen((current) => !current)}
          disabled={loadState === 'loading'}
          aria-expanded={isBuilderOpen}
          aria-controls="calculate-builder-panel"
          title="新增计算配置"
        >
          <MaterialIcon name="add" className="calculate-add-icon" size={24} />
        </button>

        <p className="calculate-trigger-hint">
          {loadState === 'loading' ? '正在加载宝可梦与副技能数据...' : '点击加号开始新增一组计算配置'}
        </p>

        {loadState === 'error' && <p className="page-status warning inline">加载失败，请检查数据源配置后重试。</p>}

        {isBuilderOpen && loadState === 'ready' && (
          <section id="calculate-builder-panel" className="calculate-builder">
            <label className="auth-field">
              <span>宝可梦</span>
              <select
                value={selectedPokemonId}
                onChange={(event) => {
                  setSelectedPokemonId(event.target.value)
                  setSelectedSubSkillsByLevel(createEmptyLevelSelection())
                }}
              >
                <option value="">请选择宝可梦</option>
                {pokemons.map((pokemon) => (
                  <option key={pokemon.id} value={pokemon.dexNo}>
                    {`#${pokemon.dexNo.toString().padStart(3, '0')} ${pokemon.name}`}
                  </option>
                ))}
              </select>
            </label>

            <div className="calculate-subskill-grid">
              {SUBSKILL_LEVELS.map((level) => (
                <label key={`subskill-level-${level}`} className="auth-field">
                  <span>{`Lv${level} 副技能`}</span>
                  <select
                    value={selectedSubSkillsByLevel[level] ?? ''}
                    onChange={(event) => onSubSkillChange(level, event.target.value)}
                    disabled={!selectedPokemon}
                  >
                    <option value="">{selectedPokemon ? '请选择副技能' : '请先选择宝可梦'}</option>
                    {subSkills.map((subSkill) => {
                      const selectedForCurrentLevel = selectedSubSkillsByLevel[level] === subSkill.id
                      const disabled = !selectedForCurrentLevel && selectedSkillIds.has(subSkill.id)
                      return (
                        <option key={`level-${level}-subskill-${subSkill.id}`} value={subSkill.id} disabled={disabled}>
                          {getSubSkillLabel(subSkill)}
                        </option>
                      )
                    })}
                  </select>
                </label>
              ))}
            </div>

            <div className="calculate-selected-list">
              {SUBSKILL_LEVELS.map((level) => {
                const subSkillId = selectedSubSkillsByLevel[level]
                const selectedSubSkill = subSkills.find((item) => item.id === subSkillId) ?? null
                return (
                  <span key={`chosen-subskill-${level}`} className="asset-chip">
                    <strong>{`Lv${level}`}</strong>
                    <em>{selectedSubSkill ? getSubSkillLabel(selectedSubSkill) : '未选择'}</em>
                  </span>
                )
              })}
            </div>

            <div className="calculate-actions">
              <button type="button" className="button ghost" onClick={resetSelections}>
                清空
              </button>
            </div>
          </section>
        )}
      </article>
    </section>
  )
}
