import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import {
  ArrowLeft,
  Bold,
  Code2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Pin,
  Quote,
  Redo2,
  Strikethrough,
  Trash2,
  Undo2,
} from 'lucide-react'
import type { Note, Notebook } from '../../core/types'
import { formatDateTime, pluralRu } from '../../core/format'
import { registerPendingFlush } from '../../core/pending'
import { updateNote } from './notesActions'
import { IconButton, Select } from '../../ui/Controls'
import { TagInput } from '../../ui/TagInput'
import { cx } from '../../ui/cx'

type NotePatch = Partial<Pick<Note, 'title' | 'content' | 'notebookId' | 'tags'>>

export function NoteEditor({
  note,
  notebooks,
  allTags,
  onBack,
  onDelete,
  onTogglePin,
}: {
  note: Note
  notebooks: Notebook[]
  allTags: string[]
  onBack: () => void
  onDelete: () => void
  onTogglePin: () => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [tags, setTags] = useState(note.tags)
  const [notebookId, setNotebookId] = useState<string | null>(note.notebookId)

  const pending = useRef<{ noteId: string; patch: NotePatch } | null>(null)
  const timer = useRef<number | null>(null)
  const ready = useRef(false)

  const flush = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    const current = pending.current
    if (!current) return
    pending.current = null
    updateNote(current.noteId, current.patch)
  }, [])

  const schedule = useCallback(
    (patch: NotePatch) => {
      const previous = pending.current?.noteId === note.id ? pending.current.patch : {}
      pending.current = { noteId: note.id, patch: { ...previous, ...patch } }

      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => flush(), 450)
    },
    [note.id, flush],
  )

  const scheduleRef = useRef(schedule)
  scheduleRef.current = schedule

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder:
          'Пишите как в обычном редакторе. Выделите текст, чтобы сделать его жирным, или добавьте чек-лист.',
      }),
      Markdown.configure({
        markedOptions: { gfm: true, breaks: true },
      }),
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: note.content,
    contentType: 'markdown',
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: 'rich-editor__content',
        'aria-label': 'Текст заметки',
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (!ready.current) return
      const markdown = instance.getMarkdown()
      setContent(markdown)
      scheduleRef.current({ content: markdown })
    },
  })

  useEffect(() => {
    ready.current = true
    return () => {
      flush()
      ready.current = false
    }
  }, [flush])

  useEffect(() => {
    setNotebookId(note.notebookId)
  }, [note.notebookId])

  useEffect(() => {
    setTitle(note.title)
  }, [note.title])

  useEffect(() => {
    const flushOnExit = () => flush()
    window.addEventListener('beforeunload', flushOnExit)
    const onVisibility = () => {
      if (document.hidden) flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flushOnExit)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flush])

  useEffect(() => registerPendingFlush(flush), [flush])

  const words = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  )

  const changeNotebook = (value: string) => {
    const id = value || null
    setNotebookId(id)
    schedule({ notebookId: id })
  }

  const changeTags = (nextTags: string[]) => {
    setTags(nextTags)
    schedule({ tags: nextTags })
  }

  const goBack = () => {
    flush()
    onBack()
  }

  const remove = () => {
    flush()
    onDelete()
  }

  const togglePin = () => {
    flush()
    onTogglePin()
  }

  const setHeading = (value: string) => {
    if (!editor) return
    if (value === '') {
      editor.chain().focus().setParagraph().run()
      return
    }
    const level = Number(value) as 1 | 2 | 3
    editor.chain().focus().toggleHeading({ level }).run()
  }

  const setLink = () => {
    if (!editor) return
    const current = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Адрес ссылки', current ?? 'https://')
    if (url === null) return

    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const headingValue = editor?.isActive('heading', { level: 1 })
    ? '1'
    : editor?.isActive('heading', { level: 2 })
      ? '2'
      : editor?.isActive('heading', { level: 3 })
        ? '3'
        : ''

  return (
    <article className="note-editor">
      <header className="note-editor__head">
        <IconButton label="Назад к списку" className="note-editor__back" onClick={goBack}>
          <ArrowLeft size={18} />
        </IconButton>

        <input
          className="note-title-input"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            schedule({ title: event.target.value })
          }}
          placeholder="Заголовок заметки"
          maxLength={200}
          aria-label="Заголовок заметки"
        />

        <div className="note-editor__actions">
          <IconButton
            label={note.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
            onClick={togglePin}
            className={cx(note.pinned && 'is-active')}
          >
            <Pin size={17} fill={note.pinned ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton label="Удалить заметку" onClick={remove}>
            <Trash2 size={17} />
          </IconButton>
        </div>
      </header>

      <div className="note-meta">
        <Select
          value={notebookId ?? ''}
          onChange={(event) => changeNotebook(event.target.value)}
          className="notebook-select"
          aria-label="Блокнот"
        >
          <option value="">Без блокнота</option>
          {notebooks.map((notebook) => (
            <option key={notebook.id} value={notebook.id}>
              {notebook.name}
            </option>
          ))}
        </Select>

        <TagInput
          value={tags}
          onChange={changeTags}
          suggestions={allTags}
          placeholder="Добавить тег…"
        />

        <span className="note-meta__date" title="Последнее сохранение">
          {formatDateTime(note.updatedAt)}
        </span>
      </div>

      <div className="note-toolbar">
        <div className="note-toolbar__group">
          <Select
            value={headingValue}
            onChange={(event) => setHeading(event.target.value)}
            className="heading-select"
            aria-label="Стиль абзаца"
            disabled={!editor}
          >
            <option value="">Обычный текст</option>
            <option value="1">Заголовок 1</option>
            <option value="2">Заголовок 2</option>
            <option value="3">Заголовок 3</option>
          </Select>

          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('bold') && 'is-active')}
            title="Полужирный (Ctrl+B)"
            aria-label="Полужирный"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('italic') && 'is-active')}
            title="Курсив (Ctrl+I)"
            aria-label="Курсив"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor}
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('strike') && 'is-active')}
            title="Зачёркнутый"
            aria-label="Зачёркнутый"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            disabled={!editor}
          >
            <Strikethrough size={16} />
          </button>

          <span className="note-toolbar__sep" aria-hidden />

          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('bulletList') && 'is-active')}
            title="Маркированный список"
            aria-label="Маркированный список"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
          >
            <List size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('orderedList') && 'is-active')}
            title="Нумерованный список"
            aria-label="Нумерованный список"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('taskList') && 'is-active')}
            title="Чек-лист"
            aria-label="Чек-лист"
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            disabled={!editor}
          >
            <ListChecks size={16} />
          </button>

          <span className="note-toolbar__sep" aria-hidden />

          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('blockquote') && 'is-active')}
            title="Цитата"
            aria-label="Цитата"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
          >
            <Quote size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('codeBlock') && 'is-active')}
            title="Блок кода"
            aria-label="Блок кода"
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            disabled={!editor}
          >
            <Code2 size={16} />
          </button>
          <button
            type="button"
            className={cx('tool-btn', editor?.isActive('link') && 'is-active')}
            title="Ссылка"
            aria-label="Ссылка"
            onClick={setLink}
            disabled={!editor}
          >
            <Link2 size={16} />
          </button>
        </div>

        <div className="note-toolbar__group note-toolbar__group--right">
          <button
            type="button"
            className="tool-btn"
            title="Отменить"
            aria-label="Отменить"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor || !editor.can().undo()}
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="tool-btn"
            title="Повторить"
            aria-label="Повторить"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor || !editor.can().redo()}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      <div className="rich-editor">
        <EditorContent editor={editor} />
      </div>

      <footer className="note-footer">
        <span>
          {words} {pluralRu(words, 'слово', 'слова', 'слов')}
          <span className="note-footer__dot">·</span>
          {content.length} {pluralRu(content.length, 'символ', 'символа', 'символов')}
        </span>
        <span>
          {tags.length} {pluralRu(tags.length, 'тег', 'тега', 'тегов')}
        </span>
        <span className="note-footer__save">
          <span className="dot dot--green" aria-hidden />
          Автосохранение
        </span>
      </footer>
    </article>
  )
}
