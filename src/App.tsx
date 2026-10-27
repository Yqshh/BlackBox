import { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import { session } from './core/session'
import { useSession } from './hooks/useSession'
import { useTheme } from './hooks/useTheme'
import { ToastProvider } from './ui/Toast'
import { ConfirmProvider } from './ui/Confirm'
import { BootScreen, FatalScreen } from './layout/StatusScreens'
import { LockScreen } from './layout/LockScreen'
import { AppShell } from './layout/AppShell'

export function App() {
  const state = useSession()

  useEffect(() => {
    void session.init()
  }, [])

  useTheme()

  return (
    <ToastProvider>
      <ConfirmProvider>
        {state.status === 'booting' && <BootScreen />}
        {state.status === 'fatal' && <FatalScreen message={state.fatalError} />}
        {state.status === 'locked' && <LockScreen />}
        {state.status === 'unlocked' && (
          <HashRouter>
            <AppShell />
          </HashRouter>
        )}
      </ConfirmProvider>
    </ToastProvider>
  )
}
