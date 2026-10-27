// @vitest-environment jsdom
import { Editor } from '@tiptap/core'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'

let editor: Editor | null = null

function createEditor(markdown: string): Editor {
  editor = new Editor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
    ],
    content: markdown,
    contentType: 'markdown',
  })
  return editor
}

afterEach(() => {
  editor?.destroy()
  editor = null
})

describe('Markdown в TipTap', () => {
  it('превращает разметку в форматированный документ', () => {
    const instance = createEditor('# Заголовок\n\n**жирный** и _курсив_')
    const html = instance.getHTML()
    expect(html).toContain('<h1')
    expect(html).toContain('<strong>жирный</strong>')
    expect(html).toContain('<em>курсив</em>')
  })

  it('поддерживает интерактивные чек-листы', () => {
    const instance = createEditor('- [x] сделано\n- [ ] в процессе')
    const html = instance.getHTML()
    expect(html).toContain('data-type="taskList"')
    expect(html).toContain('data-type="taskItem"')
    expect(html).toContain('data-checked="true"')
    expect(html).toContain('type="checkbox"')
  })

  it('возвращает Markdown обратно', () => {
    const instance = createEditor(
      '# Заголовок\n\n**жирный** и _курсив_\n\n- [x] сделано\n- [ ] в процессе',
    )
    const markdown = instance.getMarkdown()
    expect(markdown).toContain('# Заголовок')
    expect(markdown).toContain('**жирный**')
    expect(markdown).toContain('- [x] сделано')
    expect(markdown).toContain('- [ ] в процессе')
  })
})
