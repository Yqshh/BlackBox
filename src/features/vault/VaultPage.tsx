import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Boxes,
  FolderPlus,
  KeyRound,
  Plus,
  Search,
  Star,
  X,
} from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, ASSET_TYPE_ICONS, ASSET_TYPE_LABELS, ASSET_TYPES, type Account, type Asset, type AssetType, type Category, type Group } from '../../core/types'
import { formatCount } from '../../core/format'
import { useSession } from '../../hooks/useSession'
import { useConfirm } from '../../ui/Confirm'
import { useToast } from '../../ui/Toast'
import { Button, Select, TextInput } from '../../ui/Controls'
import { EmptyState, PageHeader } from '../../ui/Layout'
import { cx } from '../../ui/cx'
import { GroupSection } from './GroupSection'
import { AccountModal, AssetModal, GroupModal, PasswordHistoryModal } from './VaultModals'
import { reusedPasswordIds } from './vaultStats'
import {
  deleteAccount,
  deleteAsset,
  deleteGroup,
  duplicateAsset,
  moveAccount,
  moveAsset,
  moveGroup,
  toggleAssetPin,
} from './vaultActions'

type ModalState =
  | { kind: 'group'; group: Group | null }
  | { kind: 'asset'; groupId: string; asset: Asset | null }
  | { kind: 'account'; groupId: string; assetId: string; account: Account | null }
  | { kind: 'history'; groupId: string; assetId: string; accountId: string }
  | null

function normalise(value: string): string {
  return value.toLocaleLowerCase('ru-RU')
}

function matchesAll(text: string, tokens: string[]): boolean {
  const normalised = normalise(text)
  return tokens.every((token) => normalised.includes(token))
}

function assetText(asset: Asset): string {
  return [
    asset.name,
    asset.titleNote,
    asset.hosts.join(' '),
    asset.oneC.dbName,
    asset.oneC.server,
    asset.vpn.protocol,
    asset.vpn.server,
    asset.webUrl,
    asset.notes,
    asset.customFields.map((field) => `${field.key} ${field.value}`).join(' '),
    asset.accounts.map((account) => `${account.login} ${account.role} ${account.note}`).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
}

function groupText(group: Group): string {
  return [group.name, group.description, group.assets.map((asset) => asset.name).join(' ')]
    .filter(Boolean)
    .join(' ')
}

export function VaultPage() {
  const state = useSession()
  const data = state.data
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [category, setCategory] = useState<Category>('work')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [onlyPinned, setOnlyPinned] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const [highlight, setHighlight] = useState<{ assetId?: string; accountId?: string } | null>(null)

  const handledKey = useRef('')
  const searchKey = searchParams.toString()

  useEffect(() => {
    if (!data) return
    const groupId = searchParams.get('group')
    if (!groupId) return
    const group = data.groups.find((item) => item.id === groupId)
    if (!group) return

    setCategory(group.category)
    setCollapsed((current) => {
      if (!current.has(groupId)) return current
      const next = new Set(current)
      next.delete(groupId)
      return next
    })

    const assetId = searchParams.get('asset') ?? undefined
    const accountId = searchParams.get('account') ?? undefined
    const key = `${groupId}|${assetId ?? ''}|${accountId ?? ''}`
    if (handledKey.current === key) return
    handledKey.current = key
    setHighlight({ assetId, accountId })

    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById(
        accountId ? `account-${accountId}` : assetId ? `asset-${assetId}` : `group-${groupId}`,
      )
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
    const clearTimer = window.setTimeout(() => setHighlight(null), 4200)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(clearTimer)
    }
    // Намеренно реагируем только на смену deep-link, а не на каждое изменение данных.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey])

  useEffect(() => {
    if (searchParams.get('new') !== 'group') return
    setModal({ kind: 'group', group: null })
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }, [searchKey, searchParams, setSearchParams])

  const reusedIds = useMemo(() => (data ? reusedPasswordIds(data) : new Set<string>()), [data])

  const counts = useMemo(() => {
    const result: Record<Category, number> = { work: 0, personal: 0 }
    if (data) {
      for (const group of data.groups) result[group.category] += 1
    }
    return result
  }, [data])

  if (!data) return null

  const tokens = normalise(query).split(/\s+/).filter(Boolean)
  const oldPasswordDays = data.settings.oldPasswordDays

  const visibleGroups = data.groups
    .filter((group) => group.category === category)
    .map((group) => {
      const groupMatches = tokens.length === 0 || matchesAll(groupText(group), tokens)
      const assets = group.assets.filter((asset) => {
        if (typeFilter !== 'all' && asset.type !== typeFilter) return false
        if (onlyPinned && !asset.pinned) return false
        if (tokens.length === 0 || groupMatches) return true
        return matchesAll(assetText(asset), tokens)
      })
      return { group, assets }
    })
    .filter(({ assets }) => {
      if (assets.length > 0) return true
      if (tokens.length > 0) return false
      if (onlyPinned || typeFilter !== 'all') return false
      return true
    })

  const visibleAccounts = visibleGroups.reduce(
    (sum, item) => sum + item.assets.reduce((inner, asset) => inner + asset.accounts.length, 0),
    0,
  )
  const categoryGroups = data.groups.filter((group) => group.category === category)
  const isFiltering = tokens.length > 0 || typeFilter !== 'all' || onlyPinned

  const toggleCollapsed = (groupId: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const closeModal = () => setModal(null)

  const handleDeleteGroup = async (group: Group) => {
    const assets = group.assets.length
    const accounts = group.assets.reduce((sum, asset) => sum + asset.accounts.length, 0)
    const ok = await confirm({
      title: 'Удалить раздел?',
      message: `Раздел «${group.name}» будет удалён вместе со всем содержимым.`,
      details: `${assets} ресурс(ов), ${accounts} учётных записей. Это действие нельзя отменить.`,
      danger: true,
      confirmLabel: 'Удалить раздел',
    })
    if (!ok) return
    deleteGroup(group.id)
    toast.push('Раздел удалён')
  }

  const handleDeleteAsset = async (group: Group, asset: Asset) => {
    const ok = await confirm({
      title: 'Удалить ресурс?',
      message: `«${asset.name}» и ${asset.accounts.length} учётных записей будут удалены.`,
      danger: true,
      confirmLabel: 'Удалить ресурс',
    })
    if (!ok) return
    deleteAsset(group.id, asset.id)
    toast.push('Ресурс удалён')
  }

  const handleDeleteAccount = async (group: Group, asset: Asset, account: Account) => {
    const ok = await confirm({
      title: 'Удалить учётную запись?',
      message: `Логин «${account.login}» будет удалён из ресурса «${asset.name}».`,
      danger: true,
      confirmLabel: 'Удалить',
    })
    if (!ok) return
    deleteAccount(group.id, asset.id, account.id)
    toast.push('Учётная запись удалена')
  }

  const modalGroup =
    modal && 'groupId' in modal
      ? data.groups.find((group) => group.id === modal.groupId) ?? null
      : null
  const modalAsset =
    modal && 'assetId' in modal
      ? modalGroup?.assets.find((asset) => asset.id === modal.assetId) ?? null
      : null
  const modalAccount =
    modal?.kind === 'history' ? modalAsset?.accounts.find((account) => account.id === modal.accountId) ?? null : null

  return (
    <div className="page vault-page">
      <PageHeader
        eyebrow="Хранилище"
        title="Пароли и доступы"
        description="Ресурсы, учётные записи, 2FA и история паролей. Всё зашифровано и хранится локально."
        actions={
          <Button
            variant="primary"
            icon={<FolderPlus size={16} />}
            onClick={() => setModal({ kind: 'group', group: null })}
          >
            Новый раздел
          </Button>
        }
      />

      <div className="vault-tabs" role="tablist" aria-label="Категория раздела">
        {CATEGORIES.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={category === value}
            className={cx('vault-tab', category === value && 'is-active')}
            onClick={() => setCategory(value)}
          >
            {CATEGORY_LABELS[value]}
            <span className="vault-tab__count">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="vault-toolbar">
        <div className="search-field vault-toolbar__search">
          <Search size={16} className="search-field__icon" aria-hidden />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по ресурсам, логинам, адресам…"
            aria-label="Поиск по хранилищу"
          />
          {query && (
            <button
              type="button"
              className="search-field__clear"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as AssetType | 'all')}
          aria-label="Фильтр по типу"
          className="vault-toolbar__type"
        >
          <option value="all">Все типы</option>
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {ASSET_TYPE_ICONS[type]} {ASSET_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

        <button
          type="button"
          className={cx('filter-toggle', onlyPinned && 'is-active')}
          onClick={() => setOnlyPinned((value) => !value)}
          aria-pressed={onlyPinned}
        >
          <Star size={15} fill={onlyPinned ? 'currentColor' : 'none'} aria-hidden />
          Избранное
        </button>

        <span className="vault-toolbar__summary">
          {categoryGroups.length > 0
            ? `${formatCount(
                visibleGroups.reduce((sum, item) => sum + item.assets.length, 0),
                'ресурс',
                'ресурса',
                'ресурсов',
              )} · ${formatCount(
                visibleAccounts,
                'учётная запись',
                'учётные записи',
                'учётных записей',
              )}`
            : ''}
        </span>
      </div>

      {visibleGroups.length === 0 ? (
        categoryGroups.length === 0 ? (
          <EmptyState
            icon={<Boxes size={26} />}
            title={`Нет разделов в категории «${CATEGORY_LABELS[category]}»`}
            description="Создайте раздел для проекта, серверов или личных доступов — внутри появятся ресурсы и учётные записи."
            action={
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => setModal({ kind: 'group', group: null })}
              >
                Создать раздел
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Search size={26} />}
            title="Ничего не найдено"
            description={
              isFiltering
                ? 'Попробуйте изменить запрос, тип ресурса или отключить фильтр избранного.'
                : 'В этой категории пока нет ресурсов.'
            }
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setTypeFilter('all')
                  setOnlyPinned(false)
                }}
              >
                Сбросить фильтры
              </Button>
            }
          />
        )
      ) : (
        <div className="group-list">
          {visibleGroups.map(({ group, assets }) => (
            <GroupSection
              key={group.id}
              group={{ ...group, assets }}
              collapsed={collapsed.has(group.id)}
              highlightAssetId={highlight?.assetId}
              highlightAccountId={highlight?.accountId}
              onToggle={() => toggleCollapsed(group.id)}
              onEditGroup={() => setModal({ kind: 'group', group })}
              onDeleteGroup={() => void handleDeleteGroup(group)}
              onMoveGroup={(direction) => moveGroup(group.id, direction)}
              onNewAsset={() => setModal({ kind: 'asset', groupId: group.id, asset: null })}
              onEditAsset={(asset) => setModal({ kind: 'asset', groupId: group.id, asset })}
              onDeleteAsset={(asset) => void handleDeleteAsset(group, asset)}
              onDuplicateAsset={(asset) => {
                duplicateAsset(group.id, asset.id)
                toast.push('Ресурс продублирован')
              }}
              onMoveAsset={(asset, direction) => moveAsset(group.id, asset.id, direction)}
              onTogglePin={(asset) => toggleAssetPin(group.id, asset.id)}
              onNewAccount={(asset) =>
                setModal({ kind: 'account', groupId: group.id, assetId: asset.id, account: null })
              }
              onEditAccount={(asset, account) =>
                setModal({ kind: 'account', groupId: group.id, assetId: asset.id, account })
              }
              onDeleteAccount={(asset, account) => void handleDeleteAccount(group, asset, account)}
              onMoveAccount={(asset, account, direction) =>
                moveAccount(group.id, asset.id, account.id, direction)
              }
              onShowHistory={(asset, account) =>
                setModal({
                  kind: 'history',
                  groupId: group.id,
                  assetId: asset.id,
                  accountId: account.id,
                })
              }
              reusedIds={reusedIds}
              oldPasswordDays={oldPasswordDays}
            />
          ))}
        </div>
      )}

      {modal?.kind === 'group' && (
        <GroupModal
          open
          group={modal.group}
          defaultCategory={category}
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'asset' && modalGroup && (
        <AssetModal open group={modalGroup} asset={modal.asset} onClose={closeModal} />
      )}

      {modal?.kind === 'account' && modalGroup && modalAsset && (
        <AccountModal
          open
          group={modalGroup}
          asset={modalAsset}
          account={modal.account}
          onClose={closeModal}
        />
      )}

      {modal?.kind === 'history' && (
        <PasswordHistoryModal open account={modalAccount} onClose={closeModal} />
      )}

      {categoryGroups.length === 0 && (
        <p className="vault-footnote">
          <KeyRound size={14} aria-hidden />
          Совет: разделы можно переименовать и перекрасить, а ресурсы — закрепить звёздочкой,
          чтобы они были сверху.
        </p>
      )}
    </div>
  )
}
