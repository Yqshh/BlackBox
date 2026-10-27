import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  CornerDownLeft,
  Folder,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Lock,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Wand2,
} from 'lucide-react'
import { createNote } from '../features/notes/notesActions'
import { searchAll, type SearchHit, type SearchKind } from '../core/search'
import { session } from '../core/session'
import { useSession } from '../hooks/useSession'
import { formatCount } from '../core/format'
import { Highlight } from '../ui/Highlight'
import { Kbd } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { cx } from '../ui/cx'

interface PaletteEntry {
  id: string
  title: string
  subtitle?: string
  icon: ReactNode
  kind?: SearchKind
  run: () => void
}

const KIND_ICONS: Record<SearchKind, ReactNode> = {
  account: <KeyRound size={16} />,
  asset: <Boxes size={16} />,
  note: <NotebookPen size={16} />,
  group: <Folder size={16} />,
  task: <ListTodo size={16} />,
}

const KIND_LABELS: Record<SearchKind, string> = {
  account: 'Учётная запись',
  asset: 'Ресурс',
  note: 'Заметка',
  group: 'Раздел',
  task: 'Задача',
}

export function CommandPalette({
  open,
  onClose,
  onOpenGenerator,
}: {
  open: boolean
  onClose: () => void
  onOpenGenerator: () => void
}) {
  const state = useSession()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const data = state.data

  const hits = useMemo(() => {
    if (!data || !query.trim()) return []
    return searchAll(data, query, 14)
  }, [data, query])

  const openHit = (hit: SearchHit) => {
    if (hit.kind === 'note' && hit.noteId) {
      navigate(`/notes/${hit.noteId}`)
      return
    }

    if (hit.kind === 'task' && hit.taskId) {
      navigate(`/tasks?task=${hit.taskId}`)
      return
    }

    const params = new URLSearchParams()
    if (hit.groupId) params.set('group', hit.groupId)
    if (hit.assetId) params.set('asset', hit.assetId)
    if (hit.accountId) params.set('account', hit.accountId)
    navigate(`/vault?${params.toString()}`)
  }

  const searchEntries: PaletteEntry[] = hits.map((hit) => ({
    id: `${hit.kind}-${hit.id}`,
    title: hit.title,
    subtitle: `${KIND_LABELS[hit.kind]} · ${hit.subtitle}`,
    icon: KIND_ICONS[hit.kind],
    kind: hit.kind,
    run: () => openHit(hit),
  }))

  const newNoteEntry: PaletteEntry = {
    id: 'new-note',
    title: query.trim() ? `Создать заметку «${query.trim()}»` : 'Создать заметку',
    subtitle: 'Новая заметка в первом блокноте',
    icon: <Plus size={16} />,
    run: () => {
      const id = createNote()
      if (query.trim()) {
        navigate(`/notes/${id}?title=${encodeURIComponent(query.trim())}`)
      } else {
        navigate(`/notes/${id}`)
      }
    },
  }

  const navigation: PaletteEntry[] = [
    {
      id: 'nav-dashboard',
      title: 'Обзор',
      subtitle: 'Сводка и быстрые действия',
      icon: <LayoutDashboard size={16} />,
      run: () => navigate('/'),
    },
    {
      id: 'nav-vault',
      title: 'Пароли',
      subtitle: 'Ресурсы и учётные записи',
      icon: <KeyRound size={16} />,
      run: () => navigate('/vault'),
    },
    {
      id: 'nav-notes',
      title: 'Заметки',
      subtitle: 'Личные и рабочие записи',
      icon: <NotebookPen size={16} />,
      run: () => navigate('/notes'),
    },
    {
      id: 'nav-tasks',
      title: 'Задачи',
      subtitle: 'Задачи и календарь',
      icon: <ListTodo size={16} />,
      run: () => navigate('/tasks'),
    },
    {
      id: 'nav-search',
      title: 'Поиск',
      subtitle: 'Полнотекстовый поиск',
      icon: <Search size={16} />,
      run: () => navigate('/search'),
    },
    {
      id: 'nav-settings',
      title: 'Настройки',
      subtitle: 'Безопасность, данные, тема',
      icon: <Settings size={16} />,
      run: () => navigate('/settings'),
    },
  ]

  const actions: PaletteEntry[] = [
    {
      id: 'action-task',
      title: 'Новая задача',
      subtitle: 'Добавить задачу или напоминание',
      icon: <Plus size={16} />,
      run: () => navigate('/tasks?new=1'),
    },
    {
      id: 'action-generator',
      title: 'Генератор паролей',
      subtitle: 'Создать надёжный пароль',
      icon: <Wand2 size={16} />,
      run: onOpenGenerator,
    },
    {
      id: 'action-lock',
      title: 'Заблокировать хранилище',
      subtitle: 'Мгновенно закрыть доступ',
      icon: <Lock size={16} />,
      run: () => void session.lock('manual'),
    },
  ]

  const normalisedQuery = query.trim().toLocaleLowerCase('ru')

  const filteredNavigation = normalisedQuery
    ? navigation.filter((entry) => entry.title.toLocaleLowerCase('ru').includes(normalisedQuery))
    : navigation

  const filteredActions = normalisedQuery
    ? actions.filter((entry) => entry.title.toLocaleLowerCase('ru').includes(normalisedQuery))
    : actions

  const sections = normalisedQuery
    ? [
        ...(searchEntries.length > 0
          ? [{ title: `Найдено · ${formatCount(searchEntries.length, 'совпадение', 'совпадения', 'совпадений')}`, items: searchEntries }]
          : []),
        { title: 'Создать', items: [newNoteEntry] },
        ...(filteredNavigation.length > 0 ? [{ title: 'Перейти', items: filteredNavigation }] : []),
        ...(filteredActions.length > 0 ? [{ title: 'Действия', items: filteredActions }] : []),
      ]
    : [
        { title: 'Перейти', items: navigation },
        { title: 'Создать', items: [newNoteEntry] },
        { title: 'Действия', items: actions },
      ]

  const flat = sections.flatMap((section) => section.items)
  const safeActive = Math.min(active, Math.max(0, flat.length - 1))

  useEffect(() => {
    setActive(0)
  }, [query])

  const execute = (entry: PaletteEntry | undefined) => {
    if (!entry) return
    onClose()
    entry.run()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => Math.min(flat.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => Math.max(0, value - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      execute(flat[safeActive])
    }
  }

  let index = -1

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className="command-modal"
      bodyClassName="command-modal__body"
    >
      <div className="command-search">
        <Search size={19} aria-hidden />
        <input
          className="command-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Найти пароль, ресурс, заметку или действие…"
          aria-label="Поиск по хранилищу и действиям"
          autoComplete="off"
          spellCheck={false}
          data-autofocus
        />
        <Kbd>Esc</Kbd>
      </div>

      <div className="command-list" role="listbox" aria-label="Результаты поиска">
        {sections.map((section) => (
          <div className="command-section" key={section.title}>
            <div className="command-section__title">{section.title}</div>
            {section.items.map((entry) => {
              index += 1
              const isActive = index === safeActive
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={cx('command-item', isActive && 'is-active')}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => execute(entry)}
                >
                  <span className={cx('command-item__icon', entry.kind && `command-item__icon--${entry.kind}`)}>
                    {entry.icon}
                  </span>
                  <span className="command-item__body">
                    <span className="command-item__title">
                      <Highlight text={entry.title} query={query} />
                    </span>
                    {entry.subtitle && (
                      <span className="command-item__subtitle">
                        <Highlight text={entry.subtitle} query={query} />
                      </span>
                    )}
                  </span>
                  {isActive && <CornerDownLeft size={14} className="command-item__enter" aria-hidden />}
                </button>
              )
            })}
          </div>
        ))}

        {flat.length === 0 && (
          <div className="command-empty">
            <Search size={22} aria-hidden />
            <p>Ничего не найдено</p>
            <span>Попробуйте другой запрос или создайте заметку.</span>
          </div>
        )}
      </div>

      <div className="command-footer">
        <span className="command-footer__hint">
          <ArrowRight size={13} aria-hidden /> <Kbd>↑</Kbd> <Kbd>↓</Kbd> навигация
        </span>
        <span className="command-footer__hint">
          <Kbd>Enter</Kbd> открыть
        </span>
        <span className="command-footer__hint">
          <Kbd>Esc</Kbd> закрыть
        </span>
      </div>
    </Modal>
  )
}
