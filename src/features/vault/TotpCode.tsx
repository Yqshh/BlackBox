import { ShieldCheck } from 'lucide-react'
import { useCopy } from '../../hooks/useCopy'
import { useTOTP } from '../../hooks/useTOTP'
import { cx } from '../../ui/cx'

export function TotpCode({ secret }: { secret: string }) {
  const { code, progress, error } = useTOTP(secret)
  const copy = useCopy()
  const ready = !error && code !== '------'

  return (
    <button
      type="button"
      className={cx('totp', error && 'totp--error')}
      onClick={() => {
        if (ready) void copy(code, '2FA-код', true)
      }}
      title={ready ? 'Скопировать 2FA-код' : 'Проверьте TOTP-секрет'}
      aria-label={ready ? `Скопировать 2FA-код ${code}` : 'TOTP-код недоступен'}
    >
      <ShieldCheck size={12} aria-hidden />
      <span className="totp__code">{code}</span>
      <span className="totp__timer" aria-hidden>
        <span className="totp__timer-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
    </button>
  )
}
