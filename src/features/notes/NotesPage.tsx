import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  FileText,
  Folder,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useSession } from '../../hooks/useSession'
import { useConfirm } from '../../ui/Confirm'
import { useToast } from '../../ui/Toast'
import { Button, IconButton, Select, TextInput } from '../../ui/Controls'
import { EmptyState, PageHeader } from '../../ui/Layout'
import { Menu } from '../../ui/Menu'
import { cx } from '../../ui/cx'
import { formatCount, formatRelative, stripMarkdown, truncate } from '../../core/format'
import type { Note, Notebook } from '../../core/types'
import { createNote, deleteNote, deleteNotebook, noteTags, toggleNotePin, updateNote } from './notesActions'
import { NoteEditor } from './NoteEditor'
import { NotebookModal } from './NotebookModal'

type ViewFilter = 'all' | 'pinned' | 'none'

export function NotesPage() {
  const state = useSession()
  const data = state.data
  const { noteId } = useParams<{ noteId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const confirm = useConfirm()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewFilter>('all')
  const [notebookFilter, setNotebookFilter] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [notebookModal, setNotebookModal] = useState<{ notebook: Notebook | null } | null>(null)
  const noteListRef = useRef<HTMLDivElement>(null)

  const selectedNote = data?.notes.find((note) => note.id === noteId) ?? null

  useEffect(() => {
    noteListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view, notebookFilter, activeTag, query])

  useEffect(() => {
    if (!noteId) return
    const title = searchParams.get('title')
    if (!title) return

    updateNote(noteId, { title })
    const next = new URLSearchParams(searchParams)
    next.delete('title')
    setSearchParams(next, { replace: true })
  }, [noteId, searchParams, setSearchParams])

  const notes = useMemo(() => {
    if (!data) return []
    return [...data.notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
  }, [data])

  const tagStats = useMemo(() => (data ? noteTags(data.notes) : []), [data])
  const allTags = useMemo(() => tagStats.map((item) => item.tag), [tagStats])

  const notebookCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const note of notes) {
      if (note.notebookId) counts.set(note.notebookId, (counts.get(note.notebookId) ?? 0) + 1)
    }
    return counts
  }, [notes])

  const filtered = useMemo(() => {
    const tokens = query.toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean)
    return notes.filter((note) => {
      if (view === 'pinned' && !note.pinned) return false
      if (view === 'none' && note.notebookId) return false
      if (notebookFilter && note.notebookId !== notebookFilter) return false
      if (activeTag && !note.tags.includes(activeTag)) return false
      if (tokens.length === 0) return true

      const text = [note.title, note.content, note.tags.join(' ')]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
      return tokens.every((token) => text.includes(token))
    })
  }, [notes, view, notebookFilter, activeTag, query])

  if (!data) return null

  const activeNotebook = data.notebooks.find((notebook) => notebook.id === notebookFilter)

  const newNote = () => {
    const id = createNote(notebookFilter, activeTag ? [activeTag] : [])
    navigate(`/notes/${id}`)
  }

  const resetFilters = () => {
    setQuery('')
    setView('all')
    setNotebookFilter(null)
    setActiveTag(null)
  }

  const handleDeleteNote = (note: Note) => {
    deleteNote(note.id)
    if (noteId === note.id) navigate('/notes')
    toast.push('Заметка удалена')
  }

  const requestDeleteNote = async (note: Note) => {
    const ok = await confirm({
      title: 'Удалить заметку?',
      message: `«${note.title || 'Без названия'}» будет удалена безвозвратно.`,
      danger: true,
      confirmLabel: 'Удалить',
    })
    if (ok) handleDeleteNote(note)
  }

  const requestDeleteNotebook = async (notebook: Notebook) => {
    const count = notebookCounts.get(notebook.id) ?? 0
    const ok = await confirm({
      title: 'Удалить блокнот?',
      message: `Блокнот «${notebook.name}» будет удалён.`,
      details:
        count > 0
          ? `${count} заметок останутся, но перейдут в «Без блокнота».`
          : 'В блокноте нет заметок.',
      danger: true,
      confirmLabel: 'Удалить блокнот',
    })
    if (!ok) return
    deleteNotebook(notebook.id)
    if (notebookFilter === notebook.id) setNotebookFilter(null)
    if (selectedNote?.notebookId === notebook.id) {
      updateNote(selectedNote.id, { notebookId: null })
    }
    toast.push('Блокнот удалён')
  }

  return (
    <div className="page notes-page">
      <PageHeader
        eyebrow="Заметки"
        title="Личные и рабочие записи"
        description="Форматированный редактор, теги и блокноты. Всё сохраняется автоматически и остаётся внутри хранилища."
        actions={
          <>
            <span className="page-header__stat">
              {formatCount(notes.length, 'заметка', 'заметки', 'заметок')}
              <span>·</span>
              {formatCount(data.notebooks.length, 'блокнот', 'блокнота', 'блокнотов')}
            </span>
            <Button variant="primary" icon={<Plus size={16} />} onClick={newNote}>
              Новая заметка
            </Button>
          </>
        }
      />

      <div className={cx('notes-layout', selectedNote && 'notes-layout--selected')}>
        <aside className="notes-sidebar">
          <div className="notes-sidebar__head">
            <div className="search-field">
              <Search size={16} className="search-field__icon" aria-hidden />
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по заметкам…"
                aria-label="Поиск по заметкам"
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
          </div>

          <div className="notes-filters notes-filters--chips">
            <button
              type="button"
              className={cx('notes-filter', view === 'all' && !notebookFilter && 'is-active')}
              onClick={() => {
                setView('all')
                setNotebookFilter(null)
              }}
            >
              <FileText size={14} aria-hidden />
              Все
              <span>{notes.length}</span>
            </button>
            <button
              type="button"
              className={cx('notes-filter', view === 'pinned' && 'is-active')}
              onClick={() => {
                setView('pinned')
                setNotebookFilter(null)
              }}
            >
              <Star size={14} aria-hidden />
              Закреплённые
              <span>{notes.filter((note) => note.pinned).length}</span>
            </button>
            <button
              type="button"
              className={cx('notes-filter', view === 'none' && 'is-active')}
              onClick={() => {
                setView('none')
                setNotebookFilter(null)
              }}
            >
              <Folder size={14} aria-hidden />
              Без блокнота
              <span>{notes.filter((note) => !note.notebookId).length}</span>
            </button>
          </div>

          <div className="notes-notebook-row">
            <span
              className="notebook-dot"
              data-accent={activeNotebook?.color ?? 'slate'}
              aria-hidden
            />
            <Select
              value={notebookFilter ?? ''}
              onChange={(event) => {
                setNotebookFilter(event.target.value || null)
                setView('all')
              }}
              className="notes-notebook-select"
              aria-label="Фильтр по блокноту"
            >
              <option value="">Все блокноты</option>
              {data.notebooks.map((notebook) => (
                <option key={notebook.id} value={notebook.id}>
                  {notebook.name} · {notebookCounts.get(notebook.id) ?? 0}
                </option>
              ))}
            </Select>

            <IconButton
              label="Новый блокнот"
              size="sm"
              onClick={() => setNotebookModal({ notebook: null })}
            >
              <Plus size={14} />
            </IconButton>

            {activeNotebook && (
              <Menu
                label={`Действия с блокнотом ${activeNotebook.name}`}
                trigger={<MoreHorizontal size={15} />}
                items={[
                  {
                    label: 'Переименовать блокнот',
                    icon: <Pencil size={13} />,
                    onClick: () => setNotebookModal({ notebook: activeNotebook }),
                  },
                  {
                    label: 'Удалить блокнот',
                    icon: <Trash2 size={13} />,
                    onClick: () => void requestDeleteNotebook(activeNotebook),
                    danger: true,
                  },
                ]}
              />
            )}
          </div>

          {tagStats.length > 0 && (
            <div className="notes-tag-strip">
              <span className="notes-tag-strip__label">
                <Tag size={12} aria-hidden /> Теги
              </span>
              <div className="notes-tag-strip__items">
                {tagStats.slice(0, 16).map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    className={cx('tag-chip', activeTag === tag && 'is-active')}
                    onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                  >
                    #{tag}
                    <span>{count}</span>
                  </button>
                ))}
              </div>
              {activeTag && (
                <button type="button" className="link-btn" onClick={() => setActiveTag(null)}>
                  Сброс
                </button>
              )}
            </div>
          )}

          <div className="note-list" ref={noteListRef}>
            <div className="notes-section__head notes-section__head--sticky">
              <span>
                {activeNotebook ? `Блокнот «${activeNotebook.name}»` : 'Заметки'}
                {activeTag && ` · #${activeTag}`}
              </span>
              <div className="notes-section__actions">
                {(query || activeTag || notebookFilter || view !== 'all') && (
                  <button type="button" className="link-btn" onClick={resetFilters}>
                    Сбросить
                  </button>
                )}
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={newNote}
                  aria-label="Новая заметка"
                  title="Новая заметка"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="note-list__empty">
                <NotebookPen size={20} aria-hidden />
                <p>Ничего не найдено</p>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              </div>
            ) : (
              filtered.map((note) => {
                const notebook = data.notebooks.find((item) => item.id === note.notebookId)
                return (
                  <button
                    key={note.id}
                    type="button"
                    className={cx('note-item', note.id === noteId && 'is-active')}
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <span className="note-item__head">
                      <strong>{note.title || 'Без названия'}</strong>
                      {note.pinned && <Pin size={11} aria-label="Закреплена" />}
                    </span>
                    <span className="note-item__snippet">
                      {truncate(stripMarkdown(note.content), 96) || 'Пустая заметка'}
                    </span>
                    <span className="note-item__meta">
                      <span>{formatRelative(note.updatedAt)}</span>
                      {notebook && (
                        <span className="note-item__notebook" data-accent={notebook.color}>
                          {notebook.name}
                        </span>
                      )}
                    </span>
                    {note.tags.length > 0 && (
                      <span className="note-item__tags">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="note-pane">
          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id}
              note={selectedNote}
              notebooks={data.notebooks}
              allTags={allTags}
              onBack={() => navigate('/notes')}
              onDelete={() => void requestDeleteNote(selectedNote)}
              onTogglePin={() => toggleNotePin(selectedNote.id)}
            />
          ) : (
            <EmptyState
              icon={<NotebookPen size={28} />}
              title={notes.length === 0 ? 'Пока нет заметок' : 'Выберите заметку'}
              description={
                notes.length === 0
                  ? 'Создайте первую заметку: личную, рабочую или просто идею. Редактор поддерживает Markdown.'
                  : 'Откройте заметку из списка слева или создайте новую. Всё сохраняется автоматически.'
              }
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={newNote}>
                  Новая заметка
                </Button>
              }
            />
          )}
        </section>
      </div>

      {notebookModal && (
        <NotebookModal
          open
          notebook={notebookModal.notebook}
          onClose={() => setNotebookModal(null)}
        />
      )}
    </div>
  )
}
