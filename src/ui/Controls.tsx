import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Loader2 } from 'lucide-react'
import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  block = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="spin" size={16} aria-hidden /> : icon}
      {children}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md'
}

export function IconButton({ label, size = 'md', className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cx('icon-btn', `icon-btn--${size}`, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  )
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function TextInput({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx('input', invalid && 'input--invalid', className)}
      {...rest}
    />
  )
})

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function TextArea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx('input', 'textarea', invalid && 'input--invalid', className)}
      {...rest}
    />
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cx('input', 'select', className)} {...rest}>
        {children}
      </select>
    )
  },
)

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  htmlFor?: string
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, htmlFor, required, className, children }: FieldProps) {
  return (
    <div className={cx('field', className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {required && <span className="field__required">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="field__error">{error}</p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cx('checkbox', className)}>
      <input type="checkbox" className="checkbox__input" {...rest} />
      <span className="checkbox__box" aria-hidden />
      <span className="checkbox__text">
        <span className="checkbox__label">{label}</span>
        {description && <span className="checkbox__description">{description}</span>}
      </span>
    </label>
  )
}
