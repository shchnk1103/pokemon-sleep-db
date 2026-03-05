import { ModalShell } from '../ModalShell'
import type { AssetDexCard, MainSkillLevel } from '../../types/catalog'

type ExtraEffectsTable = {
  columns: string[]
  rows: string[][]
}

type ExtraEffectsPopoverState = {
  table: ExtraEffectsTable | null
  left: number
  top: number
  placeAbove: boolean
}

type MainSkillLevelsModalProps = {
  selectedMainSkill: AssetDexCard
  modalLoadState: 'idle' | 'loading' | 'ready' | 'error'
  modalMessage: string
  mainSkillLevels: MainSkillLevel[]
  extraEffectsPopover: ExtraEffectsPopoverState | null
  onClose: () => void
  formatValue: (value: number | string | null) => string
  onOpenExtraEffectsPopover: (extraEffects: unknown, target: HTMLElement) => void
  onCancelCloseExtraEffectsPopover: () => void
  onScheduleCloseExtraEffectsPopover: () => void
}

export function MainSkillLevelsModal({
  selectedMainSkill,
  modalLoadState,
  modalMessage,
  mainSkillLevels,
  extraEffectsPopover,
  onClose,
  formatValue,
  onOpenExtraEffectsPopover,
  onCancelCloseExtraEffectsPopover,
  onScheduleCloseExtraEffectsPopover,
}: MainSkillLevelsModalProps) {
  const title = selectedMainSkill.chineseName ?? selectedMainSkill.name ?? `主技能 ID ${selectedMainSkill.id}`

  return (
    <ModalShell ariaLabel={`${title} 等级表`} onClose={onClose}>
      <header className="asset-modal-header">
        <p className="asset-modal-eyebrow">主技能等级</p>
        <h3>{title}</h3>
      </header>

      {modalLoadState === 'loading' && <p className="page-status inline info">正在加载等级数据...</p>}

      {modalLoadState === 'error' && <p className="page-status warning">{modalMessage}</p>}

      {modalLoadState === 'ready' && mainSkillLevels.length === 0 && <p className="page-status inline info">暂无等级数据。</p>}

      {modalLoadState === 'ready' && mainSkillLevels.length > 0 && (
        <div className="asset-modal-table-wrap">
          <table className="asset-modal-table">
            <thead>
              <tr>
                <th scope="col">level</th>
                <th scope="col">value</th>
              </tr>
            </thead>
            <tbody>
              {mainSkillLevels.map((row) => (
                <tr key={`level-${row.level}`}>
                  <td>{row.level}</td>
                  <td>
                    <span className="asset-level-value">
                      <span>{formatValue(row.value)}</span>
                      {row.extraEffects !== null && (
                        <button
                          type="button"
                          className="asset-extra-effects-trigger"
                          aria-label="查看额外效果"
                          aria-haspopup="dialog"
                          onMouseEnter={(event) => {
                            onOpenExtraEffectsPopover(row.extraEffects, event.currentTarget)
                          }}
                          onMouseLeave={onScheduleCloseExtraEffectsPopover}
                          onFocus={(event) => {
                            onOpenExtraEffectsPopover(row.extraEffects, event.currentTarget)
                          }}
                          onBlur={onScheduleCloseExtraEffectsPopover}
                        >
                          !
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {extraEffectsPopover && (
        <section
          className={`asset-extra-effects-popover-floating ${extraEffectsPopover.placeAbove ? 'above' : 'below'}`}
          style={{
            left: `${extraEffectsPopover.left}px`,
            top: `${extraEffectsPopover.top}px`,
          }}
          role="dialog"
          aria-label="额外效果详情"
          onMouseEnter={onCancelCloseExtraEffectsPopover}
          onMouseLeave={onScheduleCloseExtraEffectsPopover}
        >
          {extraEffectsPopover.table ? (
            <div className="asset-extra-effects-table-wrap">
              <table className="asset-extra-effects-table">
                <thead>
                  <tr>
                    {extraEffectsPopover.table.columns.map((column) => (
                      <th key={`extra-popover-col-${column}`} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {extraEffectsPopover.table.rows.map((cells, rowIndex) => (
                    <tr key={`extra-popover-row-${rowIndex}`}>
                      {cells.map((cell, cellIndex) => (
                        <td key={`extra-popover-cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="asset-extra-effects-empty">无额外效果数据。</p>
          )}
        </section>
      )}
    </ModalShell>
  )
}
