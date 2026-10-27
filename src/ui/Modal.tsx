import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from './cx'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  size?: ModalSize
  children: ReactNode
  footer?: ReactNode
  closeOnBackdrop?: boolean
  className?: string
  bodyClassName?: string
}

let openModalCount = 0

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  className,
  bodyClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    openModalCount += 1
    document.body.classList.add('modal-open')

    const previousFocus = document.activeElement as HTMLElement | null
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
        panel.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
        )
      ;(target ?? panel).focus({ preventScroll: true })
    }, 40)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return

      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)

      if (focusables.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
      openModalCount = Math.max(0, openModalCount - 1)
      if (openModalCount === 0) document.body.classList.remove('modal-open')
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (!closeOnBackdrop) return
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={cx('modal', `modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <header className="modal__header">
            {icon && <div className="modal__icon">{icon}</div>}
            <div className="modal__heading">
              <h2 id={titleId} className="modal__title">
                {title}
              </h2>
              {subtitle && <p className="modal__subtitle">{subtitle}</p>}
            </div>
            <button
              type="button"
              className="icon-btn modal__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X size={18} aria-hidden />
            </button>
          </header>
        )}

        <div className={cx('modal__body', bodyClassName)}>{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
