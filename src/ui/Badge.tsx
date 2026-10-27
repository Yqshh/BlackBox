import type { ReactNode } from 'react'
import { cx } from './cx'

export type BadgeTone =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'slate'
  | 'cyan'
  | 'indigo'

export function Badge({
  children,
  tone = 'slate',
  icon,
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  className?: string
}) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Spinner({ label = 'Загрузка' }: { label?: string }) {
  return (
    <span className="spinner" role="status" aria-label={label}>
      <span className="spinner__ring" aria-hidden />
    </span>
  )
}
