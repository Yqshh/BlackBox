import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import type { Account, Asset } from '../../core/types'
import { ASSET_TYPE_ICONS, ASSET_TYPE_LABELS } from '../../core/types'
import { formatCount, pluralAccounts, truncate } from '../../core/format'
import { useCopy } from '../../hooks/useCopy'
import { Badge } from '../../ui/Badge'
import { Menu } from '../../ui/Menu'
import { AccountRow } from './AccountRow'
import { cx } from '../../ui/cx'

const TYPE_TONE: Record<Asset['type'], 'sky' | 'amber' | 'emerald' | 'violet' | 'rose' | 'cyan' | 'slate'> = {
  rdp: 'sky',
  '1c': 'amber',
  vpn: 'emerald',
  web: 'violet',
  db: 'rose',
  ssh: 'cyan',
  note: 'slate',
}

function keyInfo(asset: Asset): string {
  if (asset.type === '1c' && asset.oneC.dbName) return `База: ${asset.oneC.dbName}`
  if (asset.type === 'vpn' && asset.vpn.protocol) return asset.vpn.protocol
  if (asset.type === 'web' && asset.webUrl) {
    try {
      return new URL(asset.webUrl).host
    } catch {
      return asset.webUrl
    }
  }
  return asset.hosts[0] ?? ''
}

export function AssetCard({
  asset,
  oldPasswordDays,
  reusedIds,
  highlightAccountId,
  highlighted,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onTogglePin,
  onNewAccount,
  onEditAccount,
  onDeleteAccount,
  onMoveAccount,
  onShowHistory,
}: {
  asset: Asset
  oldPasswordDays: number
  reusedIds: Set<string>
  highlightAccountId?: string
  highlighted: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (direction: -1 | 1) => void
  onTogglePin: () => void
  onNewAccount: () => void
  onEditAccount: (account: Account) => void
  onDeleteAccount: (account: Account) => void
  onMoveAccount: (account: Account, direction: -1 | 1) => void
  onShowHistory: (account: Account) => void
}) {
  const copy = useCopy()
  const info = keyInfo(asset)
  const tone = TYPE_TONE[asset.type]

  return (
    <article
      id={`asset-${asset.id}`}
      className={cx(
        'asset-card',
        asset.pinned && 'is-pinned',
        highlighted && 'is-highlighted',
      )}
      data-type={asset.type}
    >
      <header className="asset-card__head">
        <div className="asset-card__identity">
          <Badge tone={tone} className="asset-badge">
            <span aria-hidden>{ASSET_TYPE_ICONS[asset.type]}</span>
            {ASSET_TYPE_LABELS[asset.type]}
          </Badge>

          <div className="asset-card__titles">
            <h3>{asset.name}</h3>
            <div className="asset-card__sub">
              {asset.titleNote && <span className="title-note">{asset.titleNote}</span>}
              {info && (
                <button
                  type="button"
                  className="key-info"
                  onClick={() => void copy(info, 'Значение')}
                  title="Скопировать"
                >
                  {truncate(info, 44)}
                  <Copy size={10} aria-hidden />
                </button>
              )}
              <span className="muted small">
                {formatCount(asset.accounts.length, 'учётная запись', 'учётные записи', 'учётных записей')}
              </span>
            </div>
          </div>
        </div>

        <div className="asset-card__tools">
          <button
            type="button"
            className={cx('icon-btn icon-btn--sm', asset.pinned && 'is-pinned')}
            onClick={onTogglePin}
            aria-label={asset.pinned ? 'Открепить ресурс' : 'Закрепить ресурс'}
            title={asset.pinned ? 'Открепить' : 'Закрепить'}
          >
            <Star size={15} fill={asset.pinned ? 'currentColor' : 'none'} />
          </button>

          <button type="button" className="btn btn--ghost btn--sm" onClick={onNewAccount}>
            <Plus size={14} aria-hidden />
            <span className="hide-mobile">Доступ</span>
          </button>

          <Menu
            label="Действия с ресурсом"
            trigger={<MoreHorizontal size={16} />}
            items={[
              { label: 'Редактировать', icon: <Pencil size={14} />, onClick: onEdit },
              { label: 'Дублировать', icon: <Copy size={14} />, onClick: onDuplicate },
              { label: 'Переместить вверх', icon: <MoveUp size={14} />, onClick: () => onMove(-1) },
              { label: 'Переместить вниз', icon: <MoveDown size={14} />, onClick: () => onMove(1) },
              {
                label: 'Удалить ресурс',
                icon: <Trash2 size={14} />,
                onClick: onDelete,
                danger: true,
                separatorBefore: true,
              },
            ]}
          />
        </div>
      </header>

      {(asset.visibility.hosts && asset.hosts.length > 0) ||
      (asset.visibility.oneC && asset.type === '1c' && (asset.oneC.dbName || asset.oneC.server)) ||
      (asset.visibility.vpn && asset.type === 'vpn' && (asset.vpn.protocol || asset.vpn.server)) ||
      (asset.visibility.webUrl && asset.webUrl) ||
      (asset.visibility.customFields && asset.customFields.length > 0) ||
      (asset.visibility.notes && asset.notes) ? (
        <div className="asset-card__details">
          {asset.visibility.hosts && asset.hosts.length > 0 && (
            <div className="host-list">
              {asset.hosts.map((host) => (
                <button
                  key={host}
                  type="button"
                  className="host-chip"
                  onClick={() => void copy(host, 'Адрес')}
                  title="Скопировать адрес"
                >
                  {host}
                </button>
              ))}
            </div>
          )}

          {asset.visibility.oneC &&
            asset.type === '1c' &&
            (asset.oneC.dbName || asset.oneC.server) && (
              <div className="info-chip info-chip--amber">
                {asset.oneC.dbName && (
                  <span>
                    База: <strong>{asset.oneC.dbName}</strong>
                  </span>
                )}
                {asset.oneC.server && (
                  <span>
                    Кластер: <strong>{asset.oneC.server}</strong>
                  </span>
                )}
                {asset.oneC.mode && <span>{asset.oneC.mode}</span>}
              </div>
            )}

          {asset.visibility.vpn &&
            asset.type === 'vpn' &&
            (asset.vpn.protocol || asset.vpn.server) && (
              <div className="info-chip info-chip--emerald">
                {asset.vpn.protocol && <span>{asset.vpn.protocol}</span>}
                {asset.vpn.server && (
                  <span>
                    Сервер: <strong>{asset.vpn.server}</strong>
                  </span>
                )}
              </div>
            )}

          {asset.visibility.webUrl && asset.webUrl && (
            <a className="web-link" href={asset.webUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLink size={12} aria-hidden />
              {asset.webUrl}
            </a>
          )}

          {asset.visibility.customFields && asset.customFields.length > 0 && (
            <div className="custom-fields">
              {asset.customFields.map((field) => (
                <span className="custom-field" key={`${field.key}-${field.value}`}>
                  <strong>{field.key}</strong>
                  {field.value}
                </span>
              ))}
            </div>
          )}

          {asset.visibility.notes && asset.notes && (
            <p className="asset-notes">{asset.notes}</p>
          )}
        </div>
      ) : null}

      <div className="accounts">
        <div className="accounts__head">
          <span>{pluralAccounts(asset.accounts.length)}</span>
          {asset.accounts.length > 0 && (
            <button type="button" className="link-btn" onClick={onNewAccount}>
              <Plus size={13} aria-hidden />
              Добавить
            </button>
          )}
        </div>

        {asset.accounts.length === 0 ? (
          <div className="accounts__empty">
            <span>Нет учётных записей</span>
            <button type="button" className="link-btn" onClick={onNewAccount}>
              <Plus size={13} aria-hidden />
              Добавить первую
            </button>
          </div>
        ) : (
          <div className="accounts__list">
            {asset.accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                asset={asset}
                oldPasswordDays={oldPasswordDays}
                reused={reusedIds.has(account.id)}
                highlighted={highlightAccountId === account.id}
                onEdit={() => onEditAccount(account)}
                onDelete={() => onDeleteAccount(account)}
                onMove={(direction) => onMoveAccount(account, direction)}
                onHistory={() => onShowHistory(account)}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
