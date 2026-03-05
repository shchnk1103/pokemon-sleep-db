import type { ReactNode } from 'react'

type ModalShellProps = {
  ariaLabel: string
  panelClassName?: string
  backdropClassName?: string
  onClose: () => void
  children: ReactNode
}

export function ModalShell({ ariaLabel, panelClassName = '', backdropClassName = '', onClose, children }: ModalShellProps) {
  return (
    <div className={`asset-modal-backdrop ${backdropClassName}`.trim()} onClick={onClose}>
      <section
        className={`asset-modal-panel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  )
}
