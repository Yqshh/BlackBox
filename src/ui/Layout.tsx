import type { ReactNode } from 'react'
import { cx } from './cx'

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={cx('empty-state', compact && 'empty-state--compact')}>
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = 'sky',
  onClick,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose'
  onClick?: () => void
}) {
  const content = (
    <>
      <div className={cx('stat__icon', `stat__icon--${tone}`)}>{icon}</div>
      <div className="stat__body">
        <span className="stat__label">{label}</span>
        <span className="stat__value">{value}</span>
        {hint && <span className="stat__hint">{hint}</span>}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className="stat stat--clickable" onClick={onClick}>
        {content}
      </button>
    )
  }

  return <div className="stat">{content}</div>
}
