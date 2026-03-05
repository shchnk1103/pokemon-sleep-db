import type { ComponentType } from 'react'
import type { AssetDexCard } from '../../types/catalog'
import { ModalShell } from '../ModalShell'

type SubSkillSection = {
  effectType: 'gold' | 'blue' | 'white'
  items: AssetDexCard[]
}

type SubSkillSelectionModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  subSkillLevels: readonly number[]
  activeSubSkillLevel: number
  selectedSubSkillCount: number
  selectedSubSkillsByLevel: Record<number, number | null>
  subSkillById: Map<number, AssetDexCard>
  subSkillOwnerLevelMap: Map<number, number>
  groupedSubSkills: SubSkillSection[]
  subSkillsLength: number
  onActiveSubSkillLevelChange: (level: number) => void
  onSelectSubSkill: (subSkillId: number) => void
  onClearSubSkillAtLevel: (level: number) => void
  onLockedSubSkillClick: (subSkillId: number, ownerLevel: number) => void
  getSubSkillLabel: (skill: AssetDexCard) => string
  SubSkillEffectIcon: ComponentType<{ skill: AssetDexCard }>
}

export function SubSkillSelectionModal({
  isOpen,
  onClose,
  title,
  subSkillLevels,
  activeSubSkillLevel,
  selectedSubSkillCount,
  selectedSubSkillsByLevel,
  subSkillById,
  subSkillOwnerLevelMap,
  groupedSubSkills,
  subSkillsLength,
  onActiveSubSkillLevelChange,
  onSelectSubSkill,
  onClearSubSkillAtLevel,
  onLockedSubSkillClick,
  getSubSkillLabel,
  SubSkillEffectIcon,
}: SubSkillSelectionModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <ModalShell
      ariaLabel="选择副技能"
      backdropClassName="calculate-subskill-modal-backdrop"
      panelClassName="calculate-subskill-modal"
      onClose={onClose}
    >
      <header className="asset-modal-header calculate-subskill-modal-header">
        <p className="asset-modal-eyebrow">Sub Skill</p>
        <h3>{title}</h3>
      </header>

      <div className="calculate-subskill-modal-levels">
        {subSkillLevels.map((level) => {
          const selectedSubSkillId = selectedSubSkillsByLevel[level]
          const selectedSubSkill = selectedSubSkillId !== null ? subSkillById.get(selectedSubSkillId) ?? null : null
          return (
            <button
              key={`modal-level-${level}`}
              type="button"
              className={`calculate-subskill-level-tab ${activeSubSkillLevel === level ? 'active' : ''}`}
              onClick={() => onActiveSubSkillLevelChange(level)}
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
                        onLockedSubSkillClick(subSkill.id, ownerLevel as number)
                        return
                      }
                      onSelectSubSkill(subSkill.id)
                    }}
                    onDoubleClick={() => {
                      if (!selectedForCurrentLevel) {
                        return
                      }
                      onClearSubSkillAtLevel(activeSubSkillLevel)
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
        {subSkillsLength === 0 && <p className="calculate-pokemon-empty">暂无副技能数据</p>}
      </div>
    </ModalShell>
  )
}
