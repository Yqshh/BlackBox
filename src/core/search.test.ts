import { describe, expect, it } from 'vitest'
import { createEmptyVault } from './defaults'
import { countSearchHits, searchAll } from './search'
import type { VaultData } from './types'

function fixture(): VaultData {
  const data = createEmptyVault()
  data.groups = [
    {
      id: 'grp_work',
      category: 'work',
      name: 'Инфраструктура',
      description: 'Серверы и VPN',
      color: 'sky',
      createdAt: 1,
      updatedAt: 1,
      assets: [
        {
          id: 'ast_srv',
          type: 'ssh',
          name: 'Продовый сервер',
          titleNote: 'не трогать',
          hosts: ['10.0.0.42', 'prod.local'],
          customFields: [{ key: 'VLAN', value: '120' }],
          oneC: { dbName: '', server: '', mode: '' },
          vpn: { protocol: '', server: '' },
          webUrl: '',
          notes: 'Вход только через VPN',
          visibility: {
            hosts: true,
            oneC: true,
            vpn: true,
            webUrl: true,
            customFields: true,
            notes: true,
            titleNote: true,
          },
          accounts: [
            {
              id: 'acc_root',
              login: 'root',
              password: 'SuperSecretPassword',
              role: 'Администратор',
              targetHosts: 'all',
              note: 'только по заявке',
              totpSecret: '',
              passwordChangedAt: 1,
              passwordHistory: [],
              createdAt: 1,
              updatedAt: 1,
            },
          ],
          pinned: true,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    },
  ]
  data.notes.push({
    id: 'note_1',
    notebookId: data.notebooks[0]?.id ?? null,
    title: 'Инструкция по VPN',
    content: 'Подключиться к **wireguard** и открыть 1С',
    tags: ['vpn', 'инструкция'],
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
  })
  return data
}

describe('поиск', () => {
  it('находит учётные записи по логину и роли', () => {
    const data = fixture()
    const byLogin = searchAll(data, 'root')
    const byRole = searchAll(data, 'администратор')

    expect(byLogin.some((hit) => hit.kind === 'account' && hit.accountId === 'acc_root')).toBe(true)
    expect(byRole.some((hit) => hit.kind === 'account')).toBe(true)
  })

  it('находит ресурсы по хосту и заметки по тексту', () => {
    const data = fixture()
    expect(searchAll(data, '10.0.0.42').some((hit) => hit.assetId === 'ast_srv')).toBe(true)
    expect(searchAll(data, 'wireguard').some((hit) => hit.noteId === 'note_1')).toBe(true)
    expect(searchAll(data, 'инструкция').some((hit) => hit.noteId === 'note_1')).toBe(true)
  })

  it('не ищет по паролям', () => {
    const data = fixture()
    expect(searchAll(data, 'SuperSecretPassword')).toHaveLength(0)
  })

  it('требует все слова запроса', () => {
    const data = fixture()
    const hits = searchAll(data, 'продовый сервер')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.some((hit) => hit.kind === 'asset')).toBe(true)
    expect(searchAll(data, 'продовый жираф')).toHaveLength(0)
  })

  it('возвращает пустой результат для пустого запроса', () => {
    expect(searchAll(fixture(), '')).toEqual([])
    expect(searchAll(fixture(), '   ')).toEqual([])
  })

  it('считает результаты по типам', () => {
    const data = fixture()
    const counts = countSearchHits(searchAll(data, 'сервер'))
    expect(counts.asset).toBeGreaterThan(0)
    expect(counts.account + counts.note + counts.group + counts.asset).toBeGreaterThan(0)
  })
})
