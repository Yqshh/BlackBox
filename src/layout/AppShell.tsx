import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { APP_VERSION } from '../core/defaults'
import { useAutoLock, useUnsavedWarning } from '../hooks/useAutoLock'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { VaultPage } from '../features/vault/VaultPage'
import { NotesPage } from '../features/notes/NotesPage'
import { TasksPage } from '../features/tasks/TasksPage'
import { SearchPage } from '../features/search/SearchPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { PasswordGeneratorModal } from '../features/generator/PasswordGenerator'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { cx } from '../ui/cx'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const location = useLocation()

  useAutoLock()
  useUnsavedWarning()

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setPaletteOpen((value) => !value)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={cx('app-shell', navOpen && 'app-shell--nav-open')}>
      <a className="skip-link" href="#main">
        К содержимому
      </a>

      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onOpenGenerator={() => setGeneratorOpen(true)}
      />

      <button
        type="button"
        className="nav-backdrop"
        aria-label="Закрыть меню"
        onClick={() => setNavOpen(false)}
      />

      <div className="app-main">
        <Topbar
          onMenu={() => setNavOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenGenerator={() => setGeneratorOpen(true)}
        />

        <main id="main" className="app-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/notes/:noteId" element={<NotesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} aria-hidden />
            Данные остаются на этом устройстве
          </span>
          <span>
            BlackBox {APP_VERSION} · offline
          </span>
        </footer>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenGenerator={() => {
          setPaletteOpen(false)
          setGeneratorOpen(true)
        }}
      />

      <PasswordGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
      />
    </div>
  )
}
