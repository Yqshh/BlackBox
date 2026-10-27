import { formatDate, stripMarkdown } from './format'
import type { AssetType, Category, VaultData } from './types'

export type SearchKind = 'account' | 'asset' | 'note' | 'group' | 'task'

export interface SearchHit {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
  meta: string
  score: number
  groupId?: string
  assetId?: string
  accountId?: string
  noteId?: string
  taskId?: string
  category?: Category
  assetType?: AssetType
  tags?: string[]
}

function normalise(value: string): string {
  return value.toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ').trim()
}

function scoreFields(fields: Array<{ text: string; weight: number }>, tokens: string[]): number {
  let total = 0

  for (const token of tokens) {
    let best = 0
    for (const field of fields) {
      const text = normalise(field.text)
      if (!text) continue
      const index = text.indexOf(token)
      if (index === -1) continue

      const starts = index === 0 || /\s|[._\-/]/.test(text[index - 1] ?? '')
      const value = field.weight * (starts ? 2 : 1) + Math.min(4, Math.floor(token.length / 3))
      if (value > best) best = value
    }

    if (best === 0) return 0
    total += best
  }

  return total
}

/**
 * Полнотекстовый поиск по хранилищу. Пароли намеренно не индексируются.
 */
export function searchAll(data: VaultData, query: string, limit = 60): SearchHit[] {
  const tokens = normalise(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return []

  const hits: SearchHit[] = []

  for (const group of data.groups) {
    const groupScore = scoreFields(
      [
        { text: group.name, weight: 14 },
        { text: group.description, weight: 4 },
        {
          text: group.assets.map((asset) => asset.name).join(' '),
          weight: 2,
        },
      ],
      tokens,
    )

    if (groupScore > 0) {
      hits.push({
        id: group.id,
        kind: 'group',
        title: group.name,
        subtitle: group.description || (group.category === 'work' ? 'Рабочий раздел' : 'Личный раздел'),
        meta: `${group.assets.length} ресурс(ов)`,
        score: groupScore,
        groupId: group.id,
        category: group.category,
      })
    }

    for (const asset of group.assets) {
      const assetText = [
        asset.name,
        asset.titleNote,
        asset.hosts.join(' '),
        asset.customFields.map((field) => `${field.key} ${field.value}`).join(' '),
        asset.oneC.dbName,
        asset.oneC.server,
        asset.vpn.protocol,
        asset.vpn.server,
        asset.webUrl,
        asset.notes,
      ]
        .filter(Boolean)
        .join(' ')

      const assetScore = scoreFields(
        [
          { text: asset.name, weight: 16 },
          { text: asset.titleNote, weight: 6 },
          { text: asset.hosts.join(' '), weight: 8 },
          { text: asset.customFields.map((field) => `${field.key} ${field.value}`).join(' '), weight: 4 },
          { text: asset.notes, weight: 2 },
          { text: group.name, weight: 3 },
        ],
        tokens,
      )

      if (assetScore > 0) {
        hits.push({
          id: asset.id,
          kind: 'asset',
          title: asset.name,
          subtitle: `${group.name} · ${asset.titleNote || asset.hosts[0] || 'ресурс'}`,
          meta: `${asset.accounts.length} учёт.`,
          score: assetScore,
          groupId: group.id,
          assetId: asset.id,
          category: group.category,
          assetType: asset.type,
        })
      }

      for (const account of asset.accounts) {
        const accountScore = scoreFields(
          [
            { text: account.login, weight: 18 },
            { text: account.role, weight: 6 },
            { text: account.note, weight: 3 },
            { text: asset.name, weight: 8 },
            { text: group.name, weight: 4 },
            { text: asset.hosts.join(' '), weight: 3 },
            { text: assetText, weight: 1 },
          ],
          tokens,
        )

        if (accountScore > 0) {
          hits.push({
            id: account.id,
            kind: 'account',
            title: account.login,
            subtitle: `${asset.name} · ${group.name}`,
            meta: account.role || 'учётная запись',
            score: accountScore,
            groupId: group.id,
            assetId: asset.id,
            accountId: account.id,
            category: group.category,
            assetType: asset.type,
          })
        }
      }
    }
  }

  for (const note of data.notes) {
    const notebook = data.notebooks.find((item) => item.id === note.notebookId)
    const noteScore = scoreFields(
      [
        { text: note.title, weight: 18 },
        { text: note.tags.join(' '), weight: 8 },
        { text: stripMarkdown(note.content), weight: 2 },
        { text: notebook?.name ?? '', weight: 3 },
      ],
      tokens,
    )

    if (noteScore > 0) {
      hits.push({
        id: note.id,
        kind: 'note',
        title: note.title || 'Без названия',
        subtitle: notebook?.name ?? 'Без блокнота',
        meta: stripMarkdown(note.content).slice(0, 120),
        score: noteScore,
        noteId: note.id,
        tags: note.tags,
      })
    }
  }

  for (const task of data.tasks) {
    const taskScore = scoreFields(
      [
        { text: task.title, weight: 18 },
        { text: task.description, weight: 4 },
        { text: task.dueAt ? formatDate(task.dueAt) : '', weight: 2 },
      ],
      tokens,
    )

    if (taskScore > 0) {
      hits.push({
        id: task.id,
        kind: 'task',
        title: task.title,
        subtitle: task.dueAt ? `Срок: ${formatDate(task.dueAt)}` : 'Без срока',
        meta: task.done ? 'Выполнена' : 'Задача',
        score: taskScore,
        taskId: task.id,
        tags: task.done ? ['выполнено'] : undefined,
      })
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function countSearchHits(hits: SearchHit[]): Record<SearchKind, number> {
  return hits.reduce(
    (acc, hit) => {
      acc[hit.kind] += 1
      return acc
    },
    { account: 0, asset: 0, note: 0, group: 0, task: 0 } as Record<SearchKind, number>,
  )
}
