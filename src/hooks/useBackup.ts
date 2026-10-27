import { useSyncExternalStore } from 'react'
import { backup, type BackupState } from '../core/backup'

export function useBackup(): BackupState {
  return useSyncExternalStore(backup.subscribe, backup.getSnapshot, backup.getSnapshot)
}
