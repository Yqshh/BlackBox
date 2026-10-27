import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Trash2,
} from 'lucide-react'
import { accountAgeDays } from './vaultStats'
import type { Account, Asset } from '../../core/types'
import { useCopy } from '../../hooks/useCopy'
import { formatDate, pluralRu } from '../../core/format'
import { Menu } from '../../ui/Menu'
import { TotpCode } from './TotpCode'
import { cx } from '../../ui/cx'

export function AccountRow({
  account,
  asset,
  oldPasswordDays,
  reused,
  highlighted,
  onEdit,
  onDelete,
  onMove,
  onHistory,
}: {
  account: Account
  asset: Asset
  oldPasswordDays: number
  reused: boolean
  highlighted: boolean
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
  onHistory: () => void
}) {
  const copy = useCopy()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [account.password])

  const age = accountAgeDays(account)
  const old = age > oldPasswordDays && age > 0
  const historyCount = account.passwordHistory.length

  const hosts =
    account.targetHosts === 'all'
      ? null
      : account.targetHosts.length > 0
        ? account.targetHosts
        : []

  return (
    <div
      id={`account-${account.id}`}
      className={cx('account-row', highlighted && 'is-highlighted')}
    >
      <div className="account-row__identity">
        <button
          type="button"
          className="account-row__login"
          onClick={() => void copy(account.login, 'Логин')}
          title="Скопировать логин"
        >
          {account.login}
          <Copy size={11} aria-hidden />
        </button>
        {account.note && <p className="account-row__note">{account.note}</p>}
      </div>

      <div className="account-row__secret">
        <div className="secret-line">
          <button
            type="button"
            className={cx('secret-value', revealed && 'is-revealed')}
            onClick={() => void copy(account.password, 'Пароль', true)}
            title="Скопировать пароль"
          >
            {revealed ? account.password : '••••••••••'}
          </button>

          <button
            type="button"
            className="secret-action"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
            title={revealed ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <button
            type="button"
            className="secret-action"
            onClick={() => void copy(`${account.login}\t${account.password}`, 'Логин и пароль', true)}
            aria-label="Скопировать логин и пароль"
            title="Копировать логин + Tab + пароль"
          >
            <Copy size={14} />
          </button>

          {old && (
            <span
              className="warning-dot"
              title={`Пароль не менялся ${age} ${pluralRu(age, 'день', 'дня', 'дней')} (с ${formatDate(account.passwordChangedAt)})`}
            >
              <AlertTriangle size={13} aria-hidden />
            </span>
          )}

          {reused && (
            <span className="warning-dot" title="Такой же пароль используется в другой учётной записи">
              <AlertTriangle size={13} aria-hidden />
            </span>
          )}

          {account.totpSecret && <TotpCode secret={account.totpSecret} />}
        </div>

        {old && (
          <p className="secret-hint">
            Пароль не менялся {age} {pluralRu(age, 'день', 'дня', 'дней')}
          </p>
        )}
      </div>

      <div className="account-row__meta">
        {account.role ? <span className="role-badge">{account.role}</span> : <span className="muted">—</span>}
        {hosts === null ? (
          <span className="host-pill host-pill--all">все адреса</span>
        ) : hosts.length > 0 ? (
          hosts.map((host) => (
            <span className="host-pill" key={host}>
              {host}
            </span>
          ))
        ) : (
          <span className="muted small">без привязки</span>
        )}
        {asset.hosts.length > 0 && hosts !== null && hosts.length === 0 && (
          <span className="muted small">укажите адреса в ресурсе</span>
        )}
      </div>

      <div className="account-row__actions">
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          onClick={onEdit}
          aria-label="Редактировать учётную запись"
          title="Редактировать"
        >
          <Pencil size={14} />
        </button>

        <Menu
          label="Действия с учётной записью"
          trigger={<MoreHorizontal size={16} />}
          items={[
            {
              label: historyCount > 0 ? `История (${historyCount})` : 'История пуста',
              icon: <History size={14} />,
              onClick: onHistory,
              disabled: historyCount === 0,
            },
            { label: 'Переместить вверх', icon: <MoveUp size={14} />, onClick: () => onMove(-1) },
            { label: 'Переместить вниз', icon: <MoveDown size={14} />, onClick: () => onMove(1) },
            {
              label: 'Удалить',
              icon: <Trash2 size={14} />,
              onClick: onDelete,
              danger: true,
              separatorBefore: true,
            },
          ]}
        />
      </div>
    </div>
  )
}
