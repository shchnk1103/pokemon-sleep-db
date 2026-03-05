import { MaterialIcon } from '../MaterialIcon'
import { ModalShell } from '../ModalShell'

type NatureSelectionModalProps = {
  isOpen: boolean
  onClose: () => void
  natureUpEffects: string[]
  natureDownEffects: string[]
  selectedNatureUpEffect: string
  selectedNatureDownEffect: string
  formatNatureEffectName: (value: string) => string
  onSelectUpEffect: (effect: string) => void
  onSelectDownEffect: (effect: string) => void
}

export function NatureSelectionModal({
  isOpen,
  onClose,
  natureUpEffects,
  natureDownEffects,
  selectedNatureUpEffect,
  selectedNatureDownEffect,
  formatNatureEffectName,
  onSelectUpEffect,
  onSelectDownEffect,
}: NatureSelectionModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <ModalShell
      ariaLabel="选择性格效果"
      backdropClassName="calculate-subskill-modal-backdrop"
      panelClassName="calculate-subskill-modal calculate-nature-modal"
      onClose={onClose}
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
                    if (!lockedByDown) {
                      onSelectUpEffect(effect)
                    }
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
                    if (!lockedByUp) {
                      onSelectDownEffect(effect)
                    }
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
    </ModalShell>
  )
}
