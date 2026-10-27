import { backup } from './backup'
import {
  LEGACY_FORMAT,
  LEGACY_ITERATIONS,
  PBKDF2_ITERATIONS,
  VAULT_FORMAT,
  bytesToBase64,
  createRecord,
  encryptJSON,
  isVaultRecord,
  openRecord,
  type VaultRecord,
} from './crypto'
import { createEmptyVault, normalizeVault } from './defaults'
import { idbDelete, idbGet, idbSet } from './idb'
import {
  convertLegacyData,
  hasLegacyShape,
  hasLegacyVault,
  importLegacyFromIndexedDb,
} from './legacy'
import { flushPendingChanges } from './pending'
import type { VaultData } from './types'

const RECORD_KEY = 'main'
const SAVE_DEBOUNCE_MS = 350

export type SessionStatus = 'booting' | 'locked' | 'unlocked' | 'fatal'
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
export type LockReason = 'manual' | 'timeout' | null

export interface SessionSnapshot {
  status: SessionStatus
  isNewVault: boolean
  hasLegacy: boolean
  data: VaultData | null
  record: VaultRecord | null
  saveState: SaveState
  saveError: string | null
  lastSavedAt: number | null
  lockReason: LockReason
  fatalError: string | null
}

export interface BackupRecordInput {
  format?: string
  salt: string
  iv: string
  cipher: string
  iterations?: number
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка'
}

/** Расшифровывает резервную копию в актуальные данные. */
export async function decodeBackupData(
  record: BackupRecordInput,
  password: string,
): Promise<VaultData> {
  // Старые авто-бэкапы passwords.html не содержали поле format и
  // использовали 310 000 итераций. Новые конверты всегда содержат format.
  const legacyFormat = record.format === undefined || record.format === LEGACY_FORMAT
  const iterations =
    record.iterations ?? (legacyFormat ? LEGACY_ITERATIONS : PBKDF2_ITERATIONS)
  const { data } = await openRecord<unknown>(record, password, iterations)

  if (legacyFormat || hasLegacyShape(data)) return convertLegacyData(data)
  return normalizeVault(data)
}

class VaultSession {
  private state: SessionSnapshot = {
    status: 'booting',
    isNewVault: false,
    hasLegacy: false,
    data: null,
    record: null,
    saveState: 'idle',
    saveError: null,
    lastSavedAt: null,
    lockReason: null,
    fatalError: null,
  }

  private key: CryptoKey | null = null
  private salt: Uint8Array | null = null
  private iterations = PBKDF2_ITERATIONS
  private version = 0
  private lastSavedVersion = 0
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private saveQueue: Promise<boolean> = Promise.resolve(true)
  private listeners = new Set<() => void>()
  private initPromise: Promise<void> | null = null

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SessionSnapshot => this.state

  private set(patch: Partial<SessionSnapshot>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      try {
        if (typeof crypto === 'undefined' || !crypto.subtle) {
          throw new Error(
            'Web Crypto недоступен. Откройте приложение на localhost или по HTTPS. При открытии файла напрямую используйте сборку build:single.',
          )
        }

        const rawRecord = await idbGet<VaultRecord>('vault', RECORD_KEY)
        let hasLegacy = false
        try {
          hasLegacy = await hasLegacyVault()
        } catch {
          hasLegacy = false
        }

        if (rawRecord && !isVaultRecord(rawRecord)) {
          this.set({
            status: 'fatal',
            fatalError: 'Запись хранилища повреждена или создана несовместимой версией.',
          })
          return
        }

        this.set({
          status: 'locked',
          isNewVault: !rawRecord,
          record: rawRecord ?? null,
          hasLegacy,
          fatalError: null,
        })

        await backup.init()
      } catch (error) {
        this.set({ status: 'fatal', fatalError: messageOf(error) })
      }
    })()

    return this.initPromise
  }

  async create(password: string): Promise<void> {
    if (password.length < 5) {
      throw new Error('Мастер-пароль должен быть не короче 5 символов')
    }
    await this.createWithData(createEmptyVault(), password)
  }

  /** Создаёт новое хранилище из уже расшифрованных/импортированных данных. */
  async createWithData(raw: unknown, password: string): Promise<void> {
    if (password.length < 5) {
      throw new Error('Мастер-пароль должен быть не короче 5 символов')
    }

    const data = this.normaliseImported(raw)
    const { record, key, salt } = await createRecord(data, password)

    await idbSet('vault', RECORD_KEY, record)

    this.key = key
    this.salt = salt
    this.iterations = record.iterations
    this.version = 1
    this.lastSavedVersion = 1

    this.set({
      status: 'unlocked',
      data,
      record,
      isNewVault: false,
      saveState: 'saved',
      saveError: null,
      lastSavedAt: record.updatedAt,
      lockReason: null,
      fatalError: null,
    })

    void backup.write(record)
  }

  async unlock(password: string): Promise<void> {
    const record = this.state.record ?? (await idbGet<VaultRecord>('vault', RECORD_KEY))
    if (!record) throw new Error('Хранилище не найдено')

    const { data, key, salt } = await openRecord<unknown>(
      record,
      password,
      record.iterations,
    )
    const normalised = normalizeVault(data)

    this.key = key
    this.salt = salt
    this.iterations = record.iterations
    this.version = 1
    this.lastSavedVersion = 1

    this.set({
      status: 'unlocked',
      data: normalised,
      record,
      isNewVault: false,
      saveState: 'saved',
      saveError: null,
      lastSavedAt: record.updatedAt,
      lockReason: null,
      fatalError: null,
    })
  }

  /**
   * Блокирует хранилище. Если есть несохранённые изменения, сначала пытается
   * их записать. При ошибке блокировка отменяется, чтобы не потерять данные.
   */
  async lock(reason: LockReason = 'manual'): Promise<boolean> {
    if (this.state.status !== 'unlocked') return true

    // Редактор заметок может держать последние нажатия в локальном дебаунсе.
    flushPendingChanges()

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    if (this.version > this.lastSavedVersion) {
      const saved = await this.saveNow()
      if (!saved) {
        this.set({
          saveError: 'Не удалось сохранить изменения. Блокировка отменена, попробуйте ещё раз.',
        })
        return false
      }
    }

    this.key = null
    this.salt = null
    this.iterations = PBKDF2_ITERATIONS
    this.version = 0
    this.lastSavedVersion = 0

    this.set({
      status: 'locked',
      data: null,
      saveState: 'idle',
      saveError: null,
      lockReason: reason,
    })

    return true
  }

  /** Изменяет данные и планирует сохранение. */
  mutate(update: (draft: VaultData) => void, debounceMs = SAVE_DEBOUNCE_MS): void {
    const current = this.state.data
    if (!current || this.state.status !== 'unlocked') return

    const next = structuredClone(current)
    update(next)
    next.updatedAt = Date.now()

    this.version += 1
    this.set({ data: next, saveState: 'dirty', saveError: null })
    this.scheduleSave(debounceMs)
  }

  async saveNow(): Promise<boolean> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    return this.enqueueSave()
  }

  async replaceData(raw: unknown): Promise<boolean> {
    if (this.state.status !== 'unlocked') throw new Error('Хранилище заблокировано')

    const data = this.normaliseImported(raw)
    this.version += 1
    this.set({ data, saveState: 'dirty', saveError: null })
    return this.saveNow()
  }

  async changeMasterPassword(current: string, next: string): Promise<void> {
    if (next.length < 5) throw new Error('Новый пароль должен быть не короче 5 символов')
    if (!this.state.record || !this.state.data || this.state.status !== 'unlocked') {
      throw new Error('Хранилище заблокировано')
    }

    try {
      await openRecord(this.state.record, current, this.state.record.iterations)
    } catch {
      throw new Error('Текущий мастер-пароль неверен')
    }

    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    if (this.version > this.lastSavedVersion && !(await this.saveNow())) {
      throw new Error('Не удалось сохранить текущие изменения перед сменой пароля')
    }

    const data = this.state.data
    const { record, key, salt } = await createRecord(data, next)

    await idbSet('vault', RECORD_KEY, record)

    this.key = key
    this.salt = salt
    this.iterations = record.iterations
    this.lastSavedVersion = this.version
    this.set({
      record,
      saveState: 'saved',
      saveError: null,
      lastSavedAt: record.updatedAt,
    })

    void backup.write(record)
  }

  /** Переносит данные из первой версии, используя тот же мастер-пароль. */
  async importLegacy(password: string): Promise<void> {
    const data = await importLegacyFromIndexedDb(password)
    await this.createWithData(data, password)
    this.set({ hasLegacy: false })
  }

  async wipe(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    await idbDelete('vault', RECORD_KEY)
    await backup.forget()
    this.key = null
    this.salt = null
    this.iterations = PBKDF2_ITERATIONS
    this.version = 0
    this.lastSavedVersion = 0

    this.set({
      status: 'locked',
      isNewVault: true,
      data: null,
      record: null,
      saveState: 'idle',
      saveError: null,
      lastSavedAt: null,
      lockReason: 'manual',
    })
  }

  async refreshLegacyFlag(): Promise<void> {
    try {
      this.set({ hasLegacy: await hasLegacyVault() })
    } catch {
      // не критично
    }
  }

  getData(): VaultData | null {
    return this.state.data
  }

  getRecord(): VaultRecord | null {
    return this.state.record
  }

  isDirty(): boolean {
    return this.version > this.lastSavedVersion
  }

  private normaliseImported(raw: unknown): VaultData {
    if (Array.isArray(raw) || hasLegacyShape(raw)) return convertLegacyData(raw)
    return normalizeVault(raw)
  }

  private scheduleSave(delay: number): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.saveNow()
    }, delay)
  }

  private enqueueSave(): Promise<boolean> {
    const run = () => this.doSave()
    this.saveQueue = this.saveQueue.then(run, run)
    return this.saveQueue
  }

  private async doSave(): Promise<boolean> {
    if (!this.key || !this.salt || !this.state.data || this.state.status !== 'unlocked') {
      return false
    }

    if (this.version <= this.lastSavedVersion) {
      if (this.state.saveState !== 'saved') this.set({ saveState: 'saved' })
      return true
    }

    const versionAtStart = this.version
    const snapshot = this.state.data

    this.set({ saveState: 'saving', saveError: null })

    try {
      const payload = await encryptJSON(snapshot, this.key)
      const record: VaultRecord = {
        format: VAULT_FORMAT,
        salt: bytesToBase64(this.salt),
        iterations: this.iterations,
        iv: payload.iv,
        cipher: payload.cipher,
        updatedAt: Date.now(),
      }

      await idbSet('vault', RECORD_KEY, record)

      this.lastSavedVersion = versionAtStart
      const stillDirty = this.version !== versionAtStart

      this.set({
        record,
        lastSavedAt: record.updatedAt,
        saveState: stillDirty ? 'dirty' : 'saved',
      })

      void backup.write(record)

      if (stillDirty) this.scheduleSave(60)
      return true
    } catch (error) {
      this.set({
        saveState: 'error',
        saveError: `Не удалось сохранить: ${messageOf(error)}`,
      })
      return false
    }
  }
}

export const session = new VaultSession()
