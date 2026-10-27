import { idbGet, idbSet, idbDelete } from './idb'
import type { VaultRecord } from './crypto'

/**
 * Автобэкап в настоящий файл на диске через File System Access API.
 * Работает в Chromium-браузерах. В остальных остаётся ручной экспорт.
 */

const HANDLE_KEY = 'backupHandle'
const NAME_KEY = 'backupName'
const LAST_AT_KEY = 'backupLastAt'

export interface BackupState {
  supported: boolean
  enabled: boolean
  needsPermission: boolean
  fileName: string | null
  lastAt: number | null
  error: string | null
  busy: boolean
}

type PermissionHandle = FileSystemFileHandle & {
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

type SaveFilePicker = (options?: {
  suggestedName?: string
  types?: Array<{ description: string; accept: Record<string, string[]> }>
}) => Promise<FileSystemFileHandle>

function getPicker(): SaveFilePicker | null {
  if (typeof window === 'undefined') return null
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  return typeof picker === 'function' ? picker : null
}

class BackupStore {
  private state: BackupState = {
    supported: typeof window !== 'undefined' && getPicker() !== null,
    enabled: false,
    needsPermission: false,
    fileName: null,
    lastAt: null,
    error: null,
    busy: false,
  }

  private handle: PermissionHandle | null = null
  private listeners = new Set<() => void>()
  private initialized = false

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): BackupState => this.state

  private set(patch: Partial<BackupState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    const lastAt = await idbGet<number>('meta', LAST_AT_KEY).catch(() => undefined)
    if (typeof lastAt === 'number') this.set({ lastAt })

    if (!this.state.supported) return

    try {
      const handle = await idbGet<PermissionHandle>('meta', HANDLE_KEY)
      if (!handle) return

      this.handle = handle
      const fileName = await idbGet<string>('meta', NAME_KEY).catch(() => undefined)
      const permission = handle.queryPermission
        ? await handle.queryPermission({ mode: 'readwrite' })
        : 'granted'

      if (permission === 'granted') {
        this.set({ enabled: true, fileName: fileName ?? handle.name, needsPermission: false })
      } else {
        this.set({ enabled: false, fileName: fileName ?? handle.name, needsPermission: true })
      }
    } catch {
      this.set({ enabled: false, needsPermission: false })
    }
  }

  async connect(record: VaultRecord | null): Promise<boolean> {
    const picker = getPicker()
    if (!picker) {
      this.set({ error: 'Браузер не поддерживает автобэкап в файл. Используйте ручной экспорт.' })
      return false
    }

    this.set({ busy: true, error: null })
    try {
      const handle = (await picker({
        suggestedName: 'BlackBox-backup.json',
        types: [
          {
            description: 'Резервная копия BlackBox',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })) as PermissionHandle

      const granted = await this.ensurePermission(handle)
      if (!granted) {
        this.set({ busy: false, error: 'Нет разрешения на запись в выбранный файл.' })
        return false
      }

      this.handle = handle
      await idbSet('meta', HANDLE_KEY, handle)
      await idbSet('meta', NAME_KEY, handle.name)
      this.set({
        enabled: true,
        needsPermission: false,
        fileName: handle.name,
        busy: false,
        error: null,
      })

      if (record) await this.write(record)
      return true
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') {
        this.set({ busy: false })
        return false
      }
      this.set({ busy: false, error: 'Не удалось подключить файл автобэкапа.' })
      return false
    }
  }

  async resume(record: VaultRecord | null): Promise<boolean> {
    if (!this.handle) return false

    this.set({ busy: true, error: null })
    try {
      const granted = await this.ensurePermission(this.handle)
      if (!granted) {
        this.set({ busy: false, needsPermission: true, error: 'Разрешение не выдано.' })
        return false
      }
      this.set({ enabled: true, needsPermission: false, busy: false })
      if (record) await this.write(record)
      return true
    } catch {
      this.set({ busy: false, error: 'Не удалось возобновить автобэкап.' })
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.handle = null
    this.set({ enabled: false, needsPermission: false, fileName: null })
    await idbDelete('meta', HANDLE_KEY).catch(() => undefined)
    await idbDelete('meta', NAME_KEY).catch(() => undefined)
  }

  async forget(): Promise<void> {
    await this.disconnect()
    await idbDelete('meta', LAST_AT_KEY).catch(() => undefined)
    this.set({ lastAt: null })
  }

  /** Вызывается после каждого успешного сохранения хранилища. */
  async write(record: VaultRecord): Promise<void> {
    if (!this.state.enabled || !this.handle) return

    try {
      const granted = await this.ensurePermission(this.handle)
      if (!granted) {
        this.set({
          enabled: false,
          needsPermission: true,
          error: 'Браузеру нужно заново разрешить запись в файл бэкапа.',
        })
        return
      }

      this.set({ busy: true })
      const writable = await this.handle.createWritable()
      await writable.write(JSON.stringify(record, null, 2))
      await writable.close()

      const now = Date.now()
      await idbSet('meta', LAST_AT_KEY, now)
      this.set({ busy: false, lastAt: now, error: null })
    } catch {
      this.set({ busy: false, error: 'Не удалось записать файл автобэкапа.' })
    }
  }

  private async ensurePermission(handle: PermissionHandle): Promise<boolean> {
    if (!handle.queryPermission || !handle.requestPermission) return true
    const current = await handle.queryPermission({ mode: 'readwrite' })
    if (current === 'granted') return true
    const requested = await handle.requestPermission({ mode: 'readwrite' })
    return requested === 'granted'
  }
}

export const backup = new BackupStore()
