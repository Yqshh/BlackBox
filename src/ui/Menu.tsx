import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from './cx'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  separatorBefore?: boolean
}

export interface MenuProps {
  trigger: ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  label?: string
  className?: string
}

export function Menu({ trigger, items, align = 'right', label = 'Меню', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={cx('menu', className)} ref={containerRef}>
      <button
        type="button"
        className="menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>

      {open && (
        <div className={cx('menu__panel', align === 'right' ? 'menu__panel--right' : 'menu__panel--left')} role="menu">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              {item.separatorBefore && <div className="menu__separator" />}
              <button
                type="button"
                role="menuitem"
                className={cx('menu__item', item.danger && 'menu__item--danger')}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
              >
                {item.icon && <span className="menu__icon">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
