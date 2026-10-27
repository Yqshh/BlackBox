import { useSyncExternalStore } from 'react'
import { session, type SessionSnapshot } from '../core/session'

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
}
