import { useEffect } from 'react'
import { flushPendingChanges } from '../core/pending'
import { session } from '../core/session'
import { useSession } from './useSession'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** Автоблокировка по бездействию и при долгом уходе со вкладки. */
export function useAutoLock(): void {
  const { status, data } = useSession()
  const minutes = data?.settings.autoLockMinutes ?? 0

  useEffect(() => {
    if (status !== 'unlocked' || minutes <= 0) return

    const timeoutMs = minutes * 60_000
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastReset = 0
    let hiddenAt: number | null = null

    const lock = () => {
      void session.lock('timeout')
    }

    const reset = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      if (timer) clearTimeout(timer)
      timer = setTimeout(lock, timeoutMs)
    }

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }

      if (hiddenAt !== null && Date.now() - hiddenAt >= timeoutMs) {
        lock()
      } else {
        reset()
      }
      hiddenAt = null
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, reset, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    reset()

    return () => {
      if (timer) clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, reset)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [status, minutes])
}

/** Предупреждает при закрытии вкладки, если изменения ещё не записаны. */
export function useUnsavedWarning(): void {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      flushPendingChanges()
      if (!session.isDirty()) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
}
