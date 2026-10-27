import { isWeakPassword } from '../../core/strength'
import type { Account, Asset, Group, VaultData } from '../../core/types'

export interface AccountRef {
  group: Group
  asset: Asset
  account: Account
}

const DAY = 24 * 60 * 60 * 1000

export function allAccounts(data: VaultData): AccountRef[] {
  const result: AccountRef[] = []
  for (const group of data.groups) {
    for (const asset of group.assets) {
      for (const account of asset.accounts) {
        result.push({ group, asset, account })
      }
    }
  }
  return result
}

export function accountAgeDays(account: Account): number {
  return Math.floor((Date.now() - account.passwordChangedAt) / DAY)
}

export function isAccountOld(account: Account, days: number): boolean {
  return accountAgeDays(account) > days
}

export function reusedPasswordIds(data: VaultData): Set<string> {
  const byPassword = new Map<string, string[]>()

  for (const { account } of allAccounts(data)) {
    if (!account.password) continue
    const list = byPassword.get(account.password) ?? []
    list.push(account.id)
    byPassword.set(account.password, list)
  }

  const reused = new Set<string>()
  for (const ids of byPassword.values()) {
    if (ids.length > 1) ids.forEach((id) => reused.add(id))
  }
  return reused
}

export interface VaultHealth {
  accounts: number
  assets: number
  groups: number
  notes: number
  weak: number
  old: number
  reused: number
  score: number
}

export function vaultHealth(data: VaultData): VaultHealth {
  const accounts = allAccounts(data)
  const reusedIds = reusedPasswordIds(data)
  const oldLimit = data.settings.oldPasswordDays

  const weak = accounts.filter(({ account }) => isWeakPassword(account.password)).length
  const old = accounts.filter(({ account }) => isAccountOld(account, oldLimit)).length
  const reused = accounts.filter(({ account }) => reusedIds.has(account.id)).length
  const total = accounts.length

  let score = 100
  if (total > 0) {
    score -= Math.min(45, (weak / total) * 60)
    score -= Math.min(25, (reused / total) * 40)
    score -= Math.min(20, (old / total) * 25)
  }

  return {
    accounts: total,
    assets: data.groups.reduce((sum, group) => sum + group.assets.length, 0),
    groups: data.groups.length,
    notes: data.notes.length,
    weak,
    old,
    reused,
    score: Math.max(0, Math.round(score)),
  }
}

export function weakAccounts(data: VaultData): AccountRef[] {
  return allAccounts(data).filter(({ account }) => isWeakPassword(account.password))
}

export function oldAccounts(data: VaultData): AccountRef[] {
  const limit = data.settings.oldPasswordDays
  return allAccounts(data).filter(({ account }) => isAccountOld(account, limit))
}

export function reusedAccounts(data: VaultData): AccountRef[] {
  const ids = reusedPasswordIds(data)
  return allAccounts(data).filter(({ account }) => ids.has(account.id))
}

export function healthLabel(score: number): string {
  if (score >= 85) return 'Отличное состояние'
  if (score >= 65) return 'Есть что улучшить'
  if (score >= 40) return 'Требует внимания'
  return 'Высокий риск'
}

export function healthTone(score: number): 'emerald' | 'amber' | 'rose' {
  if (score >= 85) return 'emerald'
  if (score >= 60) return 'amber'
  return 'rose'
}

export function recentAccounts(data: VaultData, limit = 6): AccountRef[] {
  return allAccounts(data)
    .slice()
    .sort((a, b) => b.account.updatedAt - a.account.updatedAt)
    .slice(0, limit)
}
