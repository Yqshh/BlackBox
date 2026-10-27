import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  HardDrive,
  KeyRound,
  LayoutDashboard,
  ListTodo,
  Lock,
  NotebookPen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react'
import { session } from '../core/session'
import { useSession } from '../hooks/useSession'
import { useBackup } from '../hooks/useBackup'
import { createNote } from '../features/notes/notesActions'
import { Brand } from '../ui/Brand'
import { Button, IconButton } from '../ui/Controls'
import { useToast } from '../ui/Toast'
import { cx } from '../ui/cx'

export function Sidebar({
  open,
  onClose,
  onOpenGenerator,
}: {
  open: boolean
  onClose: () => void
  onOpenGenerator: () => void
}) {
  const state = useSession()
  const backup = useBackup()
  const navigate = useNavigate()
  const toast = useToast()

  const counts = useMemo(() => {
    const data = state.data
    if (!data) return { accounts: 0, notes: 0, tasks: 0 }
    return {
      accounts: data.groups.reduce(
        (sum, group) => sum + group.assets.reduce((inner, asset) => inner + asset.accounts.length, 0),
        0,
      ),
      notes: data.notes.length,
      tasks: data.tasks.filter((task) => !task.done).length,
    }
  }, [state.data])

  const lock = async () => {
    onClose()
    const locked = await session.lock('manual')
    if (!locked) toast.push('Не удалось сохранить изменения, блокировка отменена', 'error')
  }

  const newNote = () => {
    const id = createNote()
    navigate(`/notes/${id}`)
    onClose()
  }

  const navItems: Array<{
    to: string
    label: string
    icon: LucideIcon
    end?: boolean
    badge?: number
  }> = [
    { to: '/', label: 'Обзор', icon: LayoutDashboard, end: true },
    { to: '/vault', label: 'Пароли', icon: KeyRound, badge: counts.accounts },
    { to: '/notes', label: 'Заметки', icon: NotebookPen, badge: counts.notes },
    { to: '/tasks', label: 'Задачи', icon: ListTodo, badge: counts.tasks },
    { to: '/search', label: 'Поиск', icon: Search },
    { to: '/settings', label: 'Настройки', icon: Settings },
  ]

  return (
    <aside className={cx('sidebar', open && 'is-open')} aria-label="Основная навигация">
      <div className="sidebar__head">
        <Brand />
        <IconButton label="Закрыть меню" className="sidebar__close" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      <nav className="sidebar__nav">
        <p className="sidebar__label">Хранилище</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cx('nav-item', isActive && 'is-active')}
            onClick={onClose}
          >
            <item.icon size={18} aria-hidden />
            <span className="nav-item__label">{item.label}</span>
            {typeof item.badge === 'number' && item.badge > 0 && (
              <span className="nav-item__badge">{item.badge}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__quick">
        <Button variant="secondary" block icon={<Plus size={16} />} onClick={newNote}>
          Новая заметка
        </Button>
        <Button
          variant="ghost"
          block
          icon={<Plus size={16} />}
          onClick={() => {
            navigate('/vault?new=group')
            onClose()
          }}
        >
          Новый раздел
        </Button>
      </div>

      <div className="sidebar__spacer" />

      <div className="sidebar__status">
        <button
          type="button"
          className="backup-chip"
          onClick={() => {
            navigate('/settings')
            onClose()
          }}
        >
          <span className={cx('dot', backup.enabled ? 'dot--green' : 'dot--amber')} />
          <HardDrive size={15} aria-hidden />
          <span className="backup-chip__text">
            <strong>{backup.enabled ? 'Автобэкап включён' : 'Автобэкап выключен'}</strong>
            <small>{backup.fileName ?? 'Настроить в разделе «Данные»'}</small>
          </span>
        </button>

        <button type="button" className="sidebar__lock" onClick={() => void lock()}>
          <Lock size={15} aria-hidden />
          <span>Заблокировать</span>
        </button>
      </div>

      <div className="sidebar__foot">
        <ShieldCheck size={14} aria-hidden />
        <span>v2.0 · AES-256-GCM</span>
      </div>

      <div className="sidebar__mobile-actions">
        <Button variant="ghost" size="sm" onClick={onOpenGenerator}>
          Генератор
        </Button>
      </div>
    </aside>
  )
}
