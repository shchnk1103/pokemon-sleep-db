import type { ComponentType } from 'react'
import { CardAdminActions } from '../CardAdminActions'
import type { AssetDexCard } from '../../types/catalog'
import type { PokemonDexCard } from '../../types/pokemon'

type AddedConfigItem = {
  id: string
  pokemon: PokemonDexCard
  level: number
  natureId: number | null
  natureLabel: string
  subSkillsByLevel: Record<number, number | null>
}

type AddedConfigsSectionProps = {
  addedConfigs: AddedConfigItem[]
  subSkillLevels: readonly number[]
  subSkillById: Map<number, AssetDexCard>
  onEdit: (config: AddedConfigItem) => void
  onCopy: (configId: string) => void
  onDelete: (configId: string) => void
  getPokemonImageUrl: (pokemon: PokemonDexCard) => string
  getPokemonLabel: (pokemon: PokemonDexCard) => string
  getSubSkillLabel: (skill: AssetDexCard) => string
  SubSkillEffectIcon: ComponentType<{ skill: AssetDexCard }>
}

export function AddedConfigsSection({
  addedConfigs,
  subSkillLevels,
  subSkillById,
  onEdit,
  onCopy,
  onDelete,
  getPokemonImageUrl,
  getPokemonLabel,
  getSubSkillLabel,
  SubSkillEffectIcon,
}: AddedConfigsSectionProps) {
  if (addedConfigs.length === 0) {
    return null
  }

  return (
    <section className="calculate-added-configs" aria-label="已添加配置">
      <h3>已添加配置</h3>
      <div className="calculate-added-list">
        {addedConfigs.map((config) => (
          <article key={config.id} className="calculate-added-item">
            <CardAdminActions
              className="calculate-added-actions"
              onEdit={() => onEdit(config)}
              onCopy={() => onCopy(config.id)}
              onDelete={() => onDelete(config.id)}
              editLabel={`编辑 ${config.pokemon.name} 配置`}
              copyLabel={`复制 ${config.pokemon.name} 配置`}
              deleteLabel={`删除 ${config.pokemon.name} 配置`}
            />
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
              {subSkillLevels.map((level) => {
                const subSkillId = config.subSkillsByLevel[level]
                const selectedSubSkill = subSkillId !== null ? subSkillById.get(subSkillId) ?? null : null
                return (
                  <span key={`added-${config.id}-lv-${level}`} className="calculate-added-subskill-chip">
                    <strong className="calculate-added-subskill-level">{`Lv${level}`}</strong>
                    <span className="calculate-added-subskill-body">
                      {selectedSubSkill ? (
                        <>
                          <SubSkillEffectIcon skill={selectedSubSkill} />
                          <em>{getSubSkillLabel(selectedSubSkill)}</em>
                        </>
                      ) : (
                        <em className="calculate-added-subskill-empty">未选择</em>
                      )}
                    </span>
                  </span>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
