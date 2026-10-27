import {
  ChevronDown,
  Folder,
  KeyRound,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Account, Asset, Group } from '../../core/types'
import { formatCount, pluralAssets } from '../../core/format'
import { Menu } from '../../ui/Menu'
import { AssetCard } from './AssetCard'
import { cx } from '../../ui/cx'

export function GroupSection({
  group,
  collapsed,
  highlightAssetId,
  highlightAccountId,
  onToggle,
  onEditGroup,
  onDeleteGroup,
  onMoveGroup,
  onNewAsset,
  onEditAsset,
  onDeleteAsset,
  onDuplicateAsset,
  onMoveAsset,
  onTogglePin,
  onNewAccount,
  onEditAccount,
  onDeleteAccount,
  onMoveAccount,
  onShowHistory,
  reusedIds,
  oldPasswordDays,
}: {
  group: Group
  collapsed: boolean
  highlightAssetId?: string
  highlightAccountId?: string
  onToggle: () => void
  onEditGroup: () => void
  onDeleteGroup: () => void
  onMoveGroup: (direction: -1 | 1) => void
  onNewAsset: () => void
  onEditAsset: (asset: Asset) => void
  onDeleteAsset: (asset: Asset) => void
  onDuplicateAsset: (asset: Asset) => void
  onMoveAsset: (asset: Asset, direction: -1 | 1) => void
  onTogglePin: (asset: Asset) => void
  onNewAccount: (asset: Asset) => void
  onEditAccount: (asset: Asset, account: Account) => void
  onDeleteAccount: (asset: Asset, account: Account) => void
  onMoveAccount: (asset: Asset, account: Account, direction: -1 | 1) => void
  onShowHistory: (asset: Asset, account: Account) => void
  reusedIds: Set<string>
  oldPasswordDays: number
}) {
  const accounts = group.assets.reduce((sum, asset) => sum + asset.accounts.length, 0)

  return (
    <section
      id={`group-${group.id}`}
      className={cx('group-card', collapsed && 'is-collapsed')}
      data-accent={group.color}
    >
      <header className="group-card__head">
        <button
          type="button"
          className="group-card__collapse"
          onClick={onToggle}
          aria-label={collapsed ? 'Развернуть раздел' : 'Свернуть раздел'}
          aria-expanded={!collapsed}
        >
          <ChevronDown size={17} className="group-card__chevron" />
        </button>

        <div className="group-card__icon">
          <Folder size={18} aria-hidden />
        </div>

        <div className="group-card__titles">
          <h2>{group.name}</h2>
          <p>
            {group.description || 'Без описания'}
            <span className="group-card__dot">·</span>
            <span>{formatCount(group.assets.length, 'ресурс', 'ресурса', 'ресурсов')}</span>
            <span className="group-card__dot">·</span>
            <span className="group-card__accounts">
              <KeyRound size={11} aria-hidden />
              {accounts}
            </span>
          </p>
        </div>

        <div className="group-card__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onNewAsset}>
            <Plus size={14} aria-hidden />
            <span className="hide-mobile">Ресурс</span>
          </button>

          <Menu
            label="Действия с разделом"
            trigger={<MoreHorizontal size={16} />}
            items={[
              { label: 'Редактировать раздел', icon: <Pencil size={14} />, onClick: onEditGroup },
              { label: 'Переместить вверх', icon: <MoveUp size={14} />, onClick: () => onMoveGroup(-1) },
              { label: 'Переместить вниз', icon: <MoveDown size={14} />, onClick: () => onMoveGroup(1) },
              {
                label: 'Удалить раздел',
                icon: <Trash2 size={14} />,
                onClick: onDeleteGroup,
                danger: true,
                separatorBefore: true,
              },
            ]}
          />
        </div>
      </header>

      {!collapsed && (
        <div className="group-card__body">
          {group.assets.length === 0 ? (
            <div className="group-empty">
              <div className="group-empty__icon">
                <Folder size={22} aria-hidden />
              </div>
              <div>
                <strong>В разделе пока пусто</strong>
                <span>Добавьте ресурс: сервер, сайт, базу 1С или заметку с доступами.</span>
              </div>
              <button type="button" className="btn btn--secondary btn--sm" onClick={onNewAsset}>
                <Plus size={14} aria-hidden />
                Добавить ресурс
              </button>
            </div>
          ) : (
            <div className="asset-list">
              {group.assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  oldPasswordDays={oldPasswordDays}
                  reusedIds={reusedIds}
                  highlightAccountId={
                    highlightAssetId === asset.id ? highlightAccountId : undefined
                  }
                  highlighted={highlightAssetId === asset.id}
                  onEdit={() => onEditAsset(asset)}
                  onDelete={() => onDeleteAsset(asset)}
                  onDuplicate={() => onDuplicateAsset(asset)}
                  onMove={(direction) => onMoveAsset(asset, direction)}
                  onTogglePin={() => onTogglePin(asset)}
                  onNewAccount={() => onNewAccount(asset)}
                  onEditAccount={(account) => onEditAccount(asset, account)}
                  onDeleteAccount={(account) => onDeleteAccount(asset, account)}
                  onMoveAccount={(account, direction) => onMoveAccount(asset, account, direction)}
                  onShowHistory={(account) => onShowHistory(asset, account)}
                />
              ))}
            </div>
          )}

          {group.assets.length > 0 && (
            <div className="group-card__foot">
              <span>{pluralAssets(group.assets.length)}</span>
              <button type="button" className="link-btn" onClick={onNewAsset}>
                <Plus size={13} aria-hidden />
                Добавить ресурс
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
