import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '../../core/types'
import { TASK_PRIORITY_LABELS } from '../../core/types'
import { Menu } from '../../ui/Menu'
import { cx } from '../../ui/cx'
import { dueLabel, dueTone } from './taskUtils'

export function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const tone = dueTone(task)

  return (
    <div className={cx('task-row', task.done && 'is-done')}>
      <button
        type="button"
        className="task-check"
        onClick={onToggle}
        aria-label={task.done ? 'Вернуть задачу в работу' : 'Отметить выполненной'}
        aria-pressed={task.done}
      >
        {task.done && <Check size={13} aria-hidden />}
      </button>

      <button type="button" className="task-row__body" onClick={onEdit}>
        <span className="task-row__title">{task.title}</span>
        {task.description && <span className="task-row__desc">{task.description}</span>}
        <span className="task-row__meta">
          <span className={cx('task-due', `task-due--${tone}`)}>{dueLabel(task.dueAt)}</span>
          {task.priority !== 'normal' && (
            <span className={cx('task-priority', `task-priority--${task.priority}`)}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {task.done && <span className="task-done-label">выполнено</span>}
        </span>
      </button>

      <Menu
        label={`Действия с задачей «${task.title}»`}
        trigger={<MoreHorizontal size={16} />}
        items={[
          { label: 'Редактировать', icon: <Pencil size={14} />, onClick: onEdit },
          {
            label: 'Удалить задачу',
            icon: <Trash2 size={14} />,
            onClick: onDelete,
            danger: true,
            separatorBefore: true,
          },
        ]}
      />
    </div>
  )
}
