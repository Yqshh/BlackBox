import { uid } from '../../core/ids'
import { session } from '../../core/session'
import type {
  Account,
  Asset,
  AssetType,
  AssetVisibility,
  Category,
  CustomField,
  Group,
  OneCParams,
  TargetHosts,
  VpnParams,
} from '../../core/types'

export interface GroupInput {
  category: Category
  name: string
  description: string
  color: Group['color']
}

export interface AssetInput {
  type: AssetType
  name: string
  titleNote: string
  hosts: string[]
  customFields: CustomField[]
  oneC: OneCParams
  vpn: VpnParams
  webUrl: string
  notes: string
  visibility: AssetVisibility
}

export interface AccountInput {
  login: string
  password: string
  role: string
  targetHosts: TargetHosts
  note: string
  totpSecret: string
}

function findGroup(groups: Group[], groupId: string): Group | undefined {
  return groups.find((group) => group.id === groupId)
}

function touchAsset(asset: Asset): void {
  asset.updatedAt = Date.now()
}

export function createGroup(input: GroupInput): string {
  const id = uid('grp')
  const now = Date.now()

  session.mutate((draft) => {
    draft.groups.push({
      id,
      category: input.category,
      name: input.name.trim() || 'Новый раздел',
      description: input.description.trim(),
      color: input.color,
      assets: [],
      createdAt: now,
      updatedAt: now,
    })
  })

  return id
}

export function updateGroup(groupId: string, input: GroupInput): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    if (!group) return
    group.category = input.category
    group.name = input.name.trim() || group.name
    group.description = input.description.trim()
    group.color = input.color
    group.updatedAt = Date.now()
  })
}

export function deleteGroup(groupId: string): void {
  session.mutate((draft) => {
    draft.groups = draft.groups.filter((group) => group.id !== groupId)
  })
}

export function moveGroup(groupId: string, direction: -1 | 1): void {
  session.mutate((draft) => {
    const group = draft.groups.find((item) => item.id === groupId)
    if (!group) return

    // Меняем порядок только внутри одной категории: иначе в текущей
    // вкладке перемещение может выглядеть как «ничего не произошло».
    const sameCategory = draft.groups.filter((item) => item.category === group.category)
    const position = sameCategory.findIndex((item) => item.id === groupId)
    const neighbor = sameCategory[position + direction]
    if (!neighbor) return

    const from = draft.groups.indexOf(group)
    const to = draft.groups.indexOf(neighbor)
    if (from === -1 || to === -1) return
    ;[draft.groups[from], draft.groups[to]] = [draft.groups[to]!, draft.groups[from]!]
  })
}

export function createAsset(groupId: string, input: AssetInput): string {
  const id = uid('ast')
  const now = Date.now()

  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    if (!group) return
    group.assets.push({
      id,
      type: input.type,
      name: input.name.trim() || 'Новый ресурс',
      titleNote: input.titleNote.trim(),
      hosts: input.hosts.map((host) => host.trim()).filter(Boolean),
      customFields: input.customFields
        .map((field) => ({ key: field.key.trim(), value: field.value.trim() }))
        .filter((field) => field.key.length > 0),
      oneC: { ...input.oneC },
      vpn: { ...input.vpn },
      webUrl: input.webUrl.trim(),
      notes: input.notes.trim(),
      visibility: { ...input.visibility },
      accounts: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })
    group.updatedAt = now
  })

  return id
}

export function updateAsset(groupId: string, assetId: string, input: AssetInput): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    if (!group || !asset) return

    const hosts = input.hosts.map((host) => host.trim()).filter(Boolean)

    asset.type = input.type
    asset.name = input.name.trim() || asset.name
    asset.titleNote = input.titleNote.trim()
    asset.hosts = hosts
    asset.customFields = input.customFields
      .map((field) => ({ key: field.key.trim(), value: field.value.trim() }))
      .filter((field) => field.key.length > 0)
    asset.oneC = { ...input.oneC }
    asset.vpn = { ...input.vpn }
    asset.webUrl = input.webUrl.trim()
    asset.notes = input.notes.trim()
    asset.visibility = { ...input.visibility }

    for (const account of asset.accounts) {
      if (Array.isArray(account.targetHosts)) {
        account.targetHosts = account.targetHosts.filter((host) => hosts.includes(host))
        if (account.targetHosts.length === 0) account.targetHosts = 'all'
      }
    }

    touchAsset(asset)
    group.updatedAt = Date.now()
  })
}

export function deleteAsset(groupId: string, assetId: string): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    if (!group) return
    group.assets = group.assets.filter((asset) => asset.id !== assetId)
    group.updatedAt = Date.now()
  })
}

export function duplicateAsset(groupId: string, assetId: string): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const index = group?.assets.findIndex((asset) => asset.id === assetId) ?? -1
    const source = group?.assets[index]
    if (!group || !source) return

    const now = Date.now()
    const copy = structuredClone(source)
    copy.id = uid('ast')
    copy.name = `${source.name} (копия)`
    copy.pinned = false
    copy.createdAt = now
    copy.updatedAt = now
    copy.accounts = source.accounts.map((account) => ({
      ...structuredClone(account),
      id: uid('acc'),
      createdAt: now,
      updatedAt: now,
    }))

    group.assets.splice(index + 1, 0, copy)
    group.updatedAt = now
  })
}

export function toggleAssetPin(groupId: string, assetId: string): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    if (!group || !asset) return

    const wasPinned = asset.pinned
    asset.pinned = !wasPinned

    if (!wasPinned) {
      const index = group.assets.indexOf(asset)
      if (index > 0) {
        group.assets.splice(index, 1)
        group.assets.unshift(asset)
      }
    }

    group.updatedAt = Date.now()
  })
}

export function moveAsset(groupId: string, assetId: string, direction: -1 | 1): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    if (!group) return
    const index = group.assets.findIndex((asset) => asset.id === assetId)
    const target = index + direction
    if (index === -1 || target < 0 || target >= group.assets.length) return
    const [asset] = group.assets.splice(index, 1)
    if (asset) group.assets.splice(target, 0, asset)
    group.updatedAt = Date.now()
  })
}

function applyAccount(account: Account, input: AccountInput): void {
  const now = Date.now()

  if (account.password !== input.password) {
    account.passwordHistory = [
      { password: account.password, changedAt: account.passwordChangedAt || now },
      ...account.passwordHistory,
    ].slice(0, 25)
    account.passwordChangedAt = now
  }

  account.login = input.login.trim()
  account.password = input.password
  account.role = input.role.trim()
  account.targetHosts = input.targetHosts
  account.note = input.note.trim()
  account.totpSecret = input.totpSecret
  account.updatedAt = now
}

export function createAccount(groupId: string, assetId: string, input: AccountInput): string {
  const id = uid('acc')

  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    if (!group || !asset) return

    const now = Date.now()
    asset.accounts.push({
      id,
      login: input.login.trim(),
      password: input.password,
      role: input.role.trim(),
      targetHosts: input.targetHosts,
      note: input.note.trim(),
      totpSecret: input.totpSecret,
      passwordChangedAt: now,
      passwordHistory: [],
      createdAt: now,
      updatedAt: now,
    })
    touchAsset(asset)
    group.updatedAt = now
  })

  return id
}

export function updateAccount(
  groupId: string,
  assetId: string,
  accountId: string,
  input: AccountInput,
): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    const account = asset?.accounts.find((item) => item.id === accountId)
    if (!group || !asset || !account) return

    applyAccount(account, input)
    touchAsset(asset)
    group.updatedAt = Date.now()
  })
}

export function deleteAccount(groupId: string, assetId: string, accountId: string): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    if (!group || !asset) return
    asset.accounts = asset.accounts.filter((account) => account.id !== accountId)
    touchAsset(asset)
    group.updatedAt = Date.now()
  })
}

export function moveAccount(
  groupId: string,
  assetId: string,
  accountId: string,
  direction: -1 | 1,
): void {
  session.mutate((draft) => {
    const group = findGroup(draft.groups, groupId)
    const asset = group?.assets.find((item) => item.id === assetId)
    if (!group || !asset) return
    const index = asset.accounts.findIndex((account) => account.id === accountId)
    const target = index + direction
    if (index === -1 || target < 0 || target >= asset.accounts.length) return
    const [account] = asset.accounts.splice(index, 1)
    if (account) asset.accounts.splice(target, 0, account)
    touchAsset(asset)
  })
}
