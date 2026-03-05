import type { ComponentType, RefObject } from 'react'
import { MaterialIcon } from '../MaterialIcon'
import type { AssetDexCard, NatureDexCard } from '../../types/catalog'
import type { PokemonDexCard } from '../../types/pokemon'

type CalculateBuilderFormProps = {
  pokemonSelectRef: RefObject<HTMLDivElement | null>
  isPokemonDropdownOpen: boolean
  selectedPokemon: PokemonDexCard | null
  selectedPokemonId: string
  pokemonQuery: string
  filteredPokemons: PokemonDexCard[]
  selectedPokemonLevel: number
  pokemonLevelMin: number
  pokemonLevelMax: number
  pokemonLevelPresets: readonly number[]
  selectedSubSkillCount: number
  subSkillLevels: readonly number[]
  selectedSubSkillsByLevel: Record<number, number | null>
  subSkillById: Map<number, AssetDexCard>
  selectedNature: NatureDexCard | null
  isNatureModalOpen: boolean
  canAddConfig: boolean
  editingConfigId: string | null
  onTogglePokemonDropdown: () => void
  onPokemonQueryChange: (value: string) => void
  onSelectPokemon: (pokemon: PokemonDexCard) => void
  onPokemonLevelChange: (value: number) => void
  onSubSkillSlotClick: (level: number) => void
  onSubSkillSlotDoubleClick: (level: number, hasSelection: boolean) => void
  onOpenNatureModal: () => void
  onClearNature: () => void
  onResetSelections: () => void
  onAddConfig: () => void
  getPokemonImageUrl: (pokemon: PokemonDexCard) => string
  getNatureLabel: (nature: NatureDexCard) => string
  getSubSkillLabel: (skill: AssetDexCard) => string
  formatNatureEffectName: (value: string) => string
  formatPokemonMetric: (value: number | null, suffix?: string) => string
  SubSkillEffectIcon: ComponentType<{ skill: AssetDexCard }>
}

export function CalculateBuilderForm({
  pokemonSelectRef,
  isPokemonDropdownOpen,
  selectedPokemon,
  selectedPokemonId,
  pokemonQuery,
  filteredPokemons,
  selectedPokemonLevel,
  pokemonLevelMin,
  pokemonLevelMax,
  pokemonLevelPresets,
  selectedSubSkillCount,
  subSkillLevels,
  selectedSubSkillsByLevel,
  subSkillById,
  selectedNature,
  isNatureModalOpen,
  canAddConfig,
  editingConfigId,
  onTogglePokemonDropdown,
  onPokemonQueryChange,
  onSelectPokemon,
  onPokemonLevelChange,
  onSubSkillSlotClick,
  onSubSkillSlotDoubleClick,
  onOpenNatureModal,
  onClearNature,
  onResetSelections,
  onAddConfig,
  getPokemonImageUrl,
  getNatureLabel,
  getSubSkillLabel,
  formatNatureEffectName,
  formatPokemonMetric,
  SubSkillEffectIcon,
}: CalculateBuilderFormProps) {
  return (
    <section className="calculate-builder">
      <div className="auth-field">
        <span>宝可梦</span>
        <div ref={pokemonSelectRef} className={`calculate-pokemon-select ${isPokemonDropdownOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="calculate-pokemon-trigger"
            onClick={onTogglePokemonDropdown}
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
                onChange={(event) => onPokemonQueryChange(event.target.value)}
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
                      onSelectPokemon(pokemon)
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
            min={pokemonLevelMin}
            max={pokemonLevelMax}
            step={1}
            value={selectedPokemonLevel}
            onChange={(event) => onPokemonLevelChange(Number(event.target.value))}
            className="calculate-level-slider"
            aria-label="宝可梦等级滑块"
          />
          <div className="calculate-level-presets" role="listbox" aria-label="等级快捷选择">
            {pokemonLevelPresets.map((level) => (
              <button
                key={`pokemon-level-${level}`}
                type="button"
                className={`calculate-level-preset ${selectedPokemonLevel === level ? 'active' : ''}`}
                onClick={() => onPokemonLevelChange(level)}
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
          {subSkillLevels.map((level) => {
            const subSkillId = selectedSubSkillsByLevel[level]
            const selectedSubSkill = subSkillId !== null ? subSkillById.get(subSkillId) ?? null : null
            return (
              <button
                key={`subskill-level-${level}`}
                type="button"
                className={`calculate-subskill-slot ${subSkillId !== null ? 'filled' : ''}`}
                onClick={() => onSubSkillSlotClick(level)}
                onDoubleClick={() => onSubSkillSlotDoubleClick(level, subSkillId !== null)}
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
            onClick={onOpenNatureModal}
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
                onClearNature()
              }}
            >
              <MaterialIcon name="delete" size={16} className="calculate-nature-delete-icon" />
            </button>
          )}
        </div>
        <small className="profile-edit-hint">选择积极与消极效果后将自动匹配唯一性格。</small>
      </div>

      <div className="calculate-actions">
        <button type="button" className="button ghost" onClick={onResetSelections}>
          清空
        </button>
        <button
          type="button"
          className="button primary calculate-add-config-btn"
          onClick={onAddConfig}
          disabled={!canAddConfig}
          aria-label={editingConfigId ? '更新当前配置' : '添加当前配置'}
          title={editingConfigId ? '更新当前配置' : '添加当前配置'}
        >
          <img src="/icons/material/add.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
