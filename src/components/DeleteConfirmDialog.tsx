import type { ReactNode } from 'react'

type DeleteConfirmDialogProps = {
  dialogLabel: string
  title: string
  text: ReactNode
  confirmLabel?: string
  confirmingLabel?: string
  isConfirming?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmDialog({
  dialogLabel,
  title,
  text,
  confirmLabel = '确认删除',
  confirmingLabel = '删除中...',
  isConfirming = false,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <div
      className="asset-delete-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) {
          onCancel()
        }
      }}
    >
      <section className="asset-delete-confirm-panel" role="dialog" aria-modal="true" aria-label={dialogLabel}>
        <p className="asset-delete-confirm-title">{title}</p>
        <p className="asset-delete-confirm-text">{text}</p>
        <div className="asset-delete-confirm-actions">
          <button type="button" className="button ghost" disabled={isConfirming} onClick={onCancel}>
            取消
          </button>
          <button type="button" className="button primary asset-delete-confirm-danger" disabled={isConfirming} onClick={onConfirm}>
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
