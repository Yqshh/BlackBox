import { describe, expect, it } from 'vitest'
import { createEmptyVault, normalizeVault } from './defaults'

describe('данные по умолчанию и нормализация', () => {
  it('создаёт пустое хранилище с блокнотами и приветственной заметкой', () => {
    const data = createEmptyVault()
    expect(data.version).toBe(2)
    expect(data.groups).toHaveLength(0)
    expect(data.notebooks).toHaveLength(3)
    expect(data.notes).toHaveLength(1)
    expect(data.notes[0]?.title).toContain('Добро пожаловать')
  })

  it('восстанавливает отсутствующие поля', () => {
    const data = normalizeVault({ groups: [], notebooks: [], notes: [] })
    expect(data.settings.autoLockMinutes).toBe(10)
    expect(data.settings.theme).toBe('system')
    expect(data.notebooks).toHaveLength(1)
  })

  it('ограничивает настройки разумными значениями', () => {
    const data = normalizeVault({
      settings: {
        autoLockMinutes: 99_999,
        clipboardClearSeconds: -5,
        oldPasswordDays: 1,
        theme: 'neon',
      },
    })
    expect(data.settings.autoLockMinutes).toBe(1440)
    expect(data.settings.clipboardClearSeconds).toBe(0)
    expect(data.settings.oldPasswordDays).toBe(7)
    expect(data.settings.theme).toBe('system')
  })

  it('приводит заметки к существующему блокноту', () => {
    const data = normalizeVault({
      notebooks: [{ id: 'nb_1', name: 'Работа' }],
      notes: [{ id: 'n1', title: 'Тест', notebookId: 'missing' }],
    })
    expect(data.notes[0]?.notebookId).toBeNull()
  })

  it('нормализует вложенные сущности', () => {
    const data = normalizeVault({
      groups: [
        {
          name: 'Раздел',
          category: 'unknown',
          assets: [
            {
              type: 'unknown',
              name: 'Ресурс',
              hosts: ['ok', 42, ''],
              accounts: [{ login: 'user', targetHosts: ['a', 'b'] }],
              visibility: { hosts: false },
            },
          ],
        },
      ],
    })

    const group = data.groups[0]
    const asset = group?.assets[0]
    expect(group?.category).toBe('work')
    expect(asset?.type).toBe('note')
    expect(asset?.hosts).toEqual(['ok'])
    expect(asset?.accounts[0]?.targetHosts).toEqual(['a', 'b'])
    expect(asset?.visibility.hosts).toBe(false)
    expect(asset?.visibility.notes).toBe(true)
  })

  it('бросает ошибку на неизвестном формате', () => {
    expect(() => normalizeVault(null)).toThrow()
    expect(() => normalizeVault([])).toThrow()
  })
})
