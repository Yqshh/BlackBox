import { describe, expect, it } from 'vitest'
import {
  convertLegacyData,
  hasLegacyShape,
  isLegacyPayload,
  isLegacyRecord,
} from './legacy'

const legacyData = [
  {
    id: 'grp_1',
    category: 'work',
    name: 'Инфраструктура',
    description: 'Серверы',
    assets: [
      {
        id: 'ast_1',
        type: 'rdp',
        name: 'Сервер 1',
        hosts: ['10.0.0.5', 'server.local'],
        showHosts: false,
        accounts: [
          {
            id: 'acc_1',
            login: 'admin',
            password: 'secret',
            role: 'Администратор',
            targetHost: '10.0.0.5',
            totpSecret: 'JBSWY3DPEHPK3PXP',
            passwordChangedAt: 1_700_000_000_000,
            passwordHistory: [{ password: 'old', changedAt: 1_600_000_000_000 }],
          },
        ],
      },
      {
        id: 'ast_2',
        type: 'note',
        name: 'Памятка',
        notes: 'Не трогать прод после 18:00',
      },
    ],
  },
  {
    id: 'grp_2',
    category: 'personal',
    name: 'Личное',
    assets: [],
  },
]

describe('импорт первой версии', () => {
  it('преобразует старую структуру в актуальную', () => {
    const data = convertLegacyData(legacyData)

    expect(data.version).toBe(2)
    expect(data.groups).toHaveLength(2)
    expect(data.groups[0]?.name).toBe('Инфраструктура')
    expect(data.groups[0]?.assets).toHaveLength(2)
    expect(data.groups[0]?.assets[0]?.accounts[0]?.login).toBe('admin')
    expect(data.groups[0]?.assets[0]?.accounts[0]?.targetHosts).toEqual(['10.0.0.5'])
    expect(data.groups[0]?.assets[0]?.visibility.hosts).toBe(false)
    expect(data.groups[0]?.assets[0]?.accounts[0]?.passwordHistory).toHaveLength(1)
  })

  it('переносит текстовые ресурсы-заметки в настоящие заметки', () => {
    const data = convertLegacyData(legacyData)
    expect(data.notes).toHaveLength(1)
    expect(data.notes[0]?.title).toBe('Памятка')
    expect(data.notes[0]?.content).toContain('Не трогать прод')
    expect(data.notebooks.length).toBeGreaterThan(0)
  })

  it('понимает обёртку { groups: [...] }', () => {
    const data = convertLegacyData({ groups: legacyData })
    expect(data.groups).toHaveLength(2)
  })

  it('отказывается от неизвестного формата', () => {
    expect(() => convertLegacyData({ hello: 'world' })).toThrow()
    expect(() => convertLegacyData('text')).toThrow()
  })

  it('определяет старые форматы', () => {
    const record = { salt: 's', iv: 'i', cipher: 'c' }
    expect(isLegacyRecord(record)).toBe(true)
    expect(isLegacyPayload({ ...record, format: 'vaultaccess-encrypted-v1' })).toBe(true)
    expect(isLegacyPayload({ ...record, format: 'vaultaccess-v2' })).toBe(false)
    expect(hasLegacyShape(legacyData)).toBe(true)
    expect(hasLegacyShape({ version: 2, groups: [] })).toBe(false)
  })
})
