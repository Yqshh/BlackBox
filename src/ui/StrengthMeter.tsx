import { useMemo } from 'react'
import { assessPassword } from '../core/strength'
import { cx } from './cx'

export function StrengthMeter({
  password,
  compact = false,
}: {
  password: string
  compact?: boolean
}) {
  const result = useMemo(() => assessPassword(password), [password])
  const filled = result.score + 1

  return (
    <div className={cx('strength', `strength--${result.score}`, compact && 'strength--compact')}>
      <div className="strength__head">
        <span className="strength__label">Надёжность</span>
        <span className="strength__value">{password ? result.label : '—'}</span>
      </div>

      <div className="strength__bars" aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cx('strength__bar', index < filled && 'is-filled')}
          />
        ))}
      </div>

      {!compact && (
        <>
          <div className="strength__meta">
            <span>≈ {result.entropy} бит энтропии</span>
            <span>{password.length} симв.</span>
          </div>
          {result.hints.length > 0 && (
            <ul className="strength__hints">
              {result.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
