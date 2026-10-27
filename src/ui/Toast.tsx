import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cx } from './cx'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastApi {
  push: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = nextId.current
      nextId.current += 1

      setItems((current) => [...current.slice(-4), { id, message, kind }])
      window.setTimeout(() => remove(id), 4600)
    },
    [remove],
  )

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map((item) => {
          const Icon = ICONS[item.kind]
          return (
            <div key={item.id} className={cx('toast', `toast--${item.kind}`)} role="status">
              <Icon className="toast__icon" size={18} aria-hidden />
              <span className="toast__text">{item.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => remove(item.id)}
                aria-label="Закрыть уведомление"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast должен использоваться внутри ToastProvider')
  return context
}
