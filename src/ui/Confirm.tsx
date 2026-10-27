import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, TextInput } from './Controls'
import { Modal } from './Modal'
import { cx } from './cx'

export interface ConfirmOptions {
  title: string
  message: ReactNode
  details?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Если задано, пользователь должен ввести это слово для подтверждения. */
  requireText?: string
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [text, setText] = useState('')
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((nextOptions) => {
    resolver.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setText('')
      setOptions(nextOptions)
    })
  }, [])

  const finish = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
    setText('')
  }, [])

  useEffect(() => {
    if (!options) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [options, finish])

  const textMatches = !options?.requireText || text.trim() === options.requireText

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Modal
        open={options !== null}
        onClose={() => finish(false)}
        title={options?.title}
        icon={
          <span className={cx('confirm-icon', options?.danger ? 'is-danger' : 'is-warning')}>
            <AlertTriangle size={20} aria-hidden />
          </span>
        }
        size="sm"
        footer={
          options && (
            <div className="modal__actions">
              <Button variant="ghost" onClick={() => finish(false)}>
                {options.cancelLabel ?? 'Отмена'}
              </Button>
              <Button
                variant={options.danger ? 'danger' : 'primary'}
                disabled={!textMatches}
                onClick={() => finish(true)}
              >
                {options.confirmLabel ?? 'Подтвердить'}
              </Button>
            </div>
          )
        }
      >
        {options && (
          <div className="confirm">
            <div className="confirm__message">{options.message}</div>
            {options.details && <div className="confirm__details">{options.details}</div>}
            {options.requireText && (
              <div className="confirm__guard">
                <label htmlFor="confirm-guard-input" className="field__label">
                  Введите <code>{options.requireText}</code> для подтверждения
                </label>
                <TextInput
                  id="confirm-guard-input"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  autoComplete="off"
                  data-autofocus
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm должен использоваться внутри ConfirmProvider')
  return context
}
