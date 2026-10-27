import { Vault } from 'lucide-react'
import { cx } from './cx'

export function Brand({
  subtitle = 'локальное хранилище',
  size = 'md',
}: {
  subtitle?: string
  size?: 'md' | 'lg'
}) {
  return (
    <div className={cx('brand', `brand--${size}`)}>
      <div className="brand__mark">
        <Vault size={size === 'lg' ? 26 : 20} aria-hidden />
      </div>
      <div className="brand__text">
        <div className="brand__name-row">
          <strong className="brand__name">BlackBox</strong>
          <span className="brand__by">by Yqsh</span>
        </div>
        <span className="brand__subtitle">{subtitle}</span>
      </div>
    </div>
  )
}
