import { describe, expect, it } from 'vitest'
import { formatCount, pluralRu, stripMarkdown } from './format'

describe('форматирование', () => {
  it('склоняет русские существительные', () => {
    expect(pluralRu(1, 'заметка', 'заметки', 'заметок')).toBe('заметка')
    expect(pluralRu(2, 'заметка', 'заметки', 'заметок')).toBe('заметки')
    expect(pluralRu(5, 'заметка', 'заметки', 'заметок')).toBe('заметок')
    expect(pluralRu(11, 'заметка', 'заметки', 'заметок')).toBe('заметок')
    expect(pluralRu(21, 'заметка', 'заметки', 'заметок')).toBe('заметка')
    expect(pluralRu(0, 'заметка', 'заметки', 'заметок')).toBe('заметок')
  })

  it('собирает число с существительным', () => {
    expect(formatCount(3, 'ресурс', 'ресурса', 'ресурсов')).toBe('3 ресурса')
  })

  it('убирает Markdown для превью', () => {
    const text = stripMarkdown('# Заголовок\n\n**жирный** и [ссылка](https://x.y)\n\n- [ ] пункт')
    expect(text).toContain('Заголовок')
    expect(text).toContain('жирный')
    expect(text).toContain('ссылка')
    expect(text).not.toContain('**')
    expect(text).not.toContain('https://')
  })
})
