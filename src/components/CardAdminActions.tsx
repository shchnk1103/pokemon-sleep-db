import { IconEditDeletePill } from './IconEditDeletePill'

type CardAdminActionsProps = {
  onEdit: () => void
  onDelete: () => void
  onCopy?: () => void
  editLabel?: string
  deleteLabel?: string
  copyLabel?: string
  className?: string
}

export function CardAdminActions({
  onEdit,
  onDelete,
  onCopy,
  editLabel = '编辑',
  deleteLabel = '删除',
  copyLabel = '复制',
  className = '',
}: CardAdminActionsProps) {
  return (
    <IconEditDeletePill
      className={`card-admin-actions ${className}`.trim()}
      onEdit={onEdit}
      onCopy={onCopy}
      onDelete={onDelete}
      editLabel={editLabel}
      copyLabel={copyLabel}
      deleteLabel={deleteLabel}
    />
  )
}
