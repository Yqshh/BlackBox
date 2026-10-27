import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Cloud,
  Loader2,
  Lock,
  Menu,
  Search,
  Wand2,
} from 'lucide-react'
import { session } from '../core/session'
import { formatTime } from '../core/format'
import { useSession } from '../hooks/useSession'
import { IconButton } from '../ui/Controls'
import { Kbd } from '../ui/Badge'
import { useToast } from '../ui/Toast'

const TITLES: Record<string, string> = {
  '/': 'Обзор',
  '/vault': 'Пароли',
  '/notes': 'Заметки',
  '/tasks': 'Задачи',
  '/search': 'Поиск',
  '/settings': 'Настройки',
}

function currentTitle(pathname: string): string {
  if (pathname.startsWith('/notes/')) return 'Заметки'
  return TITLES[pathname] ?? 'BlackBox'
}

function SaveStatus() {
  const state = useSession()
  const toast = useToast()

  const retry = async () => {
    const saved = await session.saveNow()
    toast.push(saved ? 'Изменения сохранены' : 'Не удалось сохранить изменения', saved ? 'success' : 'error')
  }

  if (state.saveState === 'error') {
    return (
      <button type="button" className="save-status save-status--error" onClick={() => void retry()}>
        <AlertTriangle size={14} aria-hidden />
        <span>Не сохранено</span>
      </button>
    )
  }

  if (state.saveState === 'saving') {
    return (
      <span className="save-status">
        <Loader2 className="spin" size={14} aria-hidden />
        <span>Сохранение…</span>
      </span>
    )
  }

  if (state.saveState === 'dirty') {
    return (
      <span className="save-status">
        <Cloud size={14} aria-hidden />
        <span>Есть изменения</span>
      </span>
    )
  }

  if (state.saveState === 'saved' && state.lastSavedAt) {
    return (
      <span className="save-status save-status--ok" title={`Сохранено в ${formatTime(state.lastSavedAt)}`}>
        <Check size={14} aria-hidden />
        <span className="save-status__text">Сохранено</span>
      </span>
    )
  }

  return null
}

export function Topbar({
  onMenu,
  onOpenPalette,
  onOpenGenerator,
}: {
  onMenu: () => void
  onOpenPalette: () => void
  onOpenGenerator: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const lock = async () => {
    const locked = await session.lock('manual')
    if (!locked) toast.push('Не удалось сохранить изменения, блокировка отменена', 'error')
  }

  return (
    <header className="topbar">
      <div className="topbar__left">
        <IconButton label="Открыть меню" className="topbar__menu" onClick={onMenu}>
          <Menu size={19} />
        </IconButton>
        <div className="topbar__titles">
          <span className="topbar__eyebrow">BlackBox</span>
          <h1>{currentTitle(location.pathname)}</h1>
        </div>
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="search-open"
          onClick={onOpenPalette}
          aria-label="Поиск по хранилищу"
          title="Поиск по хранилищу (Ctrl+K)"
        >
          <Search size={16} aria-hidden />
          <span className="search-open__text">Поиск по хранилищу</span>
          <Kbd>Ctrl K</Kbd>
        </button>

        <SaveStatus />

        <IconButton label="Генератор паролей" onClick={onOpenGenerator}>
          <Wand2 size={18} />
        </IconButton>

        <IconButton label="Заблокировать" onClick={() => void lock()}>
          <Lock size={18} />
        </IconButton>

        <button
          type="button"
          className="topbar__avatar"
          onClick={() => navigate('/settings')}
          title="Настройки"
          aria-label="Настройки"
        >
          <span className="topbar__avatar" aria-hidden>L</span>
        </button>
      </div>
    </header>
  )
}
