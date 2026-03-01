import { MaterialIcon } from './MaterialIcon'

type IconEditDeletePillProps = {
  onEdit: () => void
  onDelete: () => void
  editLabel?: string
  deleteLabel?: string
  className?: string
  disabled?: boolean
}

export function IconEditDeletePill({
  onEdit,
  onDelete,
  editLabel = '编辑',
  deleteLabel = '删除',
  className = '',
  disabled = false,
}: IconEditDeletePillProps) {
  return (
    <div className={`icon-actions-pill ${className}`.trim()}>
      <button
        type="button"
        className="icon-actions-btn"
        aria-label={editLabel}
        title={editLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onEdit()
        }}
      >
        <MaterialIcon name="edit" className="icon-actions-icon" size={16} />
      </button>
      <button
        type="button"
        className="icon-actions-btn danger"
        aria-label={deleteLabel}
        title={deleteLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      >
        <MaterialIcon name="delete" className="icon-actions-icon" size={16} />
      </button>
    </div>
  )
}
