import { IconEditDeletePill } from './IconEditDeletePill'

type CardAdminActionsProps = {
  onEdit: () => void
  onDelete: () => void
  editLabel?: string
  deleteLabel?: string
  className?: string
}

export function CardAdminActions({
  onEdit,
  onDelete,
  editLabel = '编辑',
  deleteLabel = '删除',
  className = '',
}: CardAdminActionsProps) {
  return (
    <IconEditDeletePill className={`card-admin-actions ${className}`.trim()} onEdit={onEdit} onDelete={onDelete} editLabel={editLabel} deleteLabel={deleteLabel} />
  )
}
