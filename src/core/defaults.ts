import {
  ACCENTS,
  ASSET_TYPES,
  TASK_PRIORITIES,
  type Accent,
  type Account,
  type Asset,
  type AssetType,
  type AssetVisibility,
  type Category,
  type CustomField,
  type Group,
  type Note,
  type Notebook,
  type PasswordHistoryEntry,
  type Settings,
  type TargetHosts,
  type Task,
  type TaskPriority,
  type ThemeMode,
  type VaultData,
} from './types'
import { uid } from './ids'

export const APP_NAME = 'BlackBox'
export const APP_VERSION = '2.1.0'

export const DEFAULT_SETTINGS: Settings = {
  autoLockMinutes: 10,
  clipboardClearSeconds: 30,
  oldPasswordDays: 90,
  theme: 'system',
  lastBackupAt: null,
}

export const DEFAULT_VISIBILITY: AssetVisibility = {
  hosts: true,
  oneC: true,
  vpn: true,
  webUrl: true,
  customFields: true,
  notes: true,
  titleNote: true,
}

const WELCOME_NOTE = `# Добро пожаловать в BlackBox

Это ваше **локальное** пространство: пароли, рабочие ресурсы и заметки хранятся в одном зашифрованном хранилище на этом компьютере.

## С чего начать

- [ ] Создать раздел в **Паролях** — например, «Рабочие серверы»
- [ ] Добавить ресурс и учётные записи
- [ ] Записать первую заметку
- [ ] Подключить автобэкап в **Настройках**

## Полезные мелочи

- \`Ctrl + K\` — быстрый поиск по всему хранилищу
- Пароли копируются по клику и очищают буфер обмена через 30 секунд
- **TOTP**-коды генерируются прямо в карточке учётной записи
- Заметки пишутся в Markdown и сохраняются автоматически

> Подсказка: этот текст — обычная заметка. Его можно отредактировать или удалить.
`

export function createEmptyVault(): VaultData {
  const now = Date.now()
  const personalId = uid('nb')
  const workId = uid('nb')
  const ideasId = uid('nb')

  return {
    version: 2,
    groups: [],
    notebooks: [
      { id: personalId, name: 'Личное', color: 'sky', createdAt: now },
      { id: workId, name: 'Работа', color: 'violet', createdAt: now },
      { id: ideasId, name: 'Идеи', color: 'amber', createdAt: now },
    ],
    notes: [
      {
        id: uid('note'),
        notebookId: personalId,
        title: 'Добро пожаловать',
        content: WELCOME_NOTE,
        tags: ['старт'],
        pinned: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    tasks: [],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now,
    updatedAt: now,
  }
}

/* ------------------------------------------------------------------ */
/* Нормализация: защищает интерфейс от неполных или старых данных.     */
/* ------------------------------------------------------------------ */

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function accent(value: unknown, fallback: Accent): Accent {
  return ACCENTS.includes(value as Accent) ? (value as Accent) : fallback
}

function assetType(value: unknown): AssetType {
  return ASSET_TYPES.includes(value as AssetType) ? (value as AssetType) : 'note'
}

function category(value: unknown): Category {
  return value === 'personal' ? 'personal' : 'work'
}

function stringList(value: unknown): string[] {
  return arr(value)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function targetHosts(value: unknown): TargetHosts {
  if (value === 'all' || value === undefined || value === null) return 'all'
  if (Array.isArray(value)) return stringList(value)
  return 'all'
}

function normalizeHistory(value: unknown): PasswordHistoryEntry[] {
  return arr(value)
    .filter(isObj)
    .map((entry) => ({
      password: str(entry.password),
      changedAt: num(entry.changedAt, Date.now()),
    }))
    .filter((entry) => entry.password.length > 0)
    .slice(0, 25)
}

function normalizeAccount(value: unknown): Account {
  const raw = isObj(value) ? value : {}
  const now = Date.now()

  return {
    id: str(raw.id) || uid('acc'),
    login: str(raw.login),
    password: str(raw.password),
    role: str(raw.role),
    targetHosts: targetHosts(raw.targetHosts),
    note: str(raw.note),
    totpSecret: str(raw.totpSecret),
    passwordChangedAt: num(raw.passwordChangedAt, now),
    passwordHistory: normalizeHistory(raw.passwordHistory),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
  }
}

function normalizeVisibility(value: unknown): AssetVisibility {
  const raw = isObj(value) ? value : {}
  return {
    hosts: bool(raw.hosts, true),
    oneC: bool(raw.oneC, true),
    vpn: bool(raw.vpn, true),
    webUrl: bool(raw.webUrl, true),
    customFields: bool(raw.customFields, true),
    notes: bool(raw.notes, true),
    titleNote: bool(raw.titleNote, true),
  }
}

function normalizeCustomFields(value: unknown): CustomField[] {
  return arr(value)
    .map((item) => {
      const raw = isObj(item) ? item : {}
      return { key: str(raw.key).trim(), value: str(raw.value).trim() }
    })
    .filter((item) => item.key.length > 0)
}

function normalizeAsset(value: unknown): Asset {
  const raw = isObj(value) ? value : {}
  const rawOneC = isObj(raw.oneC) ? raw.oneC : {}
  const rawVpn = isObj(raw.vpn) ? raw.vpn : {}
  const now = Date.now()

  return {
    id: str(raw.id) || uid('ast'),
    type: assetType(raw.type),
    name: str(raw.name),
    titleNote: str(raw.titleNote),
    hosts: stringList(raw.hosts),
    customFields: normalizeCustomFields(raw.customFields),
    oneC: {
      dbName: str(rawOneC.dbName),
      server: str(rawOneC.server),
      mode: str(rawOneC.mode, 'Серверный (клиент-сервер)'),
    },
    vpn: {
      protocol: str(rawVpn.protocol),
      server: str(rawVpn.server),
    },
    webUrl: str(raw.webUrl),
    notes: str(raw.notes),
    visibility: normalizeVisibility(raw.visibility),
    accounts: arr(raw.accounts).map(normalizeAccount),
    pinned: bool(raw.pinned, false),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
  }
}

function normalizeGroup(value: unknown, index: number): Group {
  const raw = isObj(value) ? value : {}
  const now = Date.now()

  return {
    id: str(raw.id) || uid('grp'),
    category: category(raw.category),
    name: str(raw.name) || `Раздел ${index + 1}`,
    description: str(raw.description),
    color: accent(raw.color, 'sky'),
    assets: arr(raw.assets).map(normalizeAsset),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
  }
}

function normalizeNotebook(value: unknown, index: number): Notebook {
  const raw = isObj(value) ? value : {}
  return {
    id: str(raw.id) || uid('nb'),
    name: str(raw.name) || `Блокнот ${index + 1}`,
    color: accent(raw.color, 'sky'),
    createdAt: num(raw.createdAt, Date.now()),
  }
}

function normalizeNote(value: unknown): Note {
  const raw = isObj(value) ? value : {}
  const now = Date.now()

  return {
    id: str(raw.id) || uid('note'),
    notebookId: typeof raw.notebookId === 'string' && raw.notebookId ? raw.notebookId : null,
    title: str(raw.title),
    content: str(raw.content),
    tags: [...new Set(stringList(raw.tags))].slice(0, 30),
    pinned: bool(raw.pinned, false),
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
  }
}

function normalizeTask(value: unknown): Task {
  const raw = isObj(value) ? value : {}
  const now = Date.now()
  const done = bool(raw.done, false)
  const priority = TASK_PRIORITIES.includes(raw.priority as TaskPriority)
    ? (raw.priority as TaskPriority)
    : 'normal'

  let dueAt: number | null = null
  if (typeof raw.dueAt === 'number' && Number.isFinite(raw.dueAt)) {
    const date = new Date(raw.dueAt)
    date.setHours(0, 0, 0, 0)
    dueAt = date.getTime()
  }

  return {
    id: str(raw.id) || uid('task'),
    title: str(raw.title) || 'Без названия',
    description: str(raw.description),
    dueAt,
    done,
    priority,
    createdAt: num(raw.createdAt, now),
    updatedAt: num(raw.updatedAt, now),
    completedAt: done ? num(raw.completedAt, now) : null,
  }
}

function normalizeSettings(value: unknown): Settings {
  const raw = isObj(value) ? value : {}
  const theme: ThemeMode =
    raw.theme === 'dark' || raw.theme === 'light' || raw.theme === 'system'
      ? raw.theme
      : DEFAULT_SETTINGS.theme

  return {
    autoLockMinutes: clamp(num(raw.autoLockMinutes, DEFAULT_SETTINGS.autoLockMinutes), 0, 24 * 60),
    clipboardClearSeconds: clamp(
      num(raw.clipboardClearSeconds, DEFAULT_SETTINGS.clipboardClearSeconds),
      0,
      300,
    ),
    oldPasswordDays: clamp(num(raw.oldPasswordDays, DEFAULT_SETTINGS.oldPasswordDays), 7, 3650),
    theme,
    lastBackupAt:
      typeof raw.lastBackupAt === 'number' && Number.isFinite(raw.lastBackupAt)
        ? raw.lastBackupAt
        : null,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

/**
 * Приводит расшифрованные данные к актуальной схеме.
 * Вызывается при каждом открытии хранилища и импорте.
 */
export function normalizeVault(value: unknown): VaultData {
  if (!isObj(value)) {
    throw new Error('Неизвестный формат хранилища')
  }

  const now = Date.now()
  const notebooks = arr(value.notebooks).map(normalizeNotebook)
  const notebookIds = new Set(notebooks.map((notebook) => notebook.id))

  const notes = arr(value.notes).map((note) => {
    const normalized = normalizeNote(note)
    if (normalized.notebookId && !notebookIds.has(normalized.notebookId)) {
      normalized.notebookId = null
    }
    return normalized
  })

  if (notebooks.length === 0) {
    const fallback: Notebook = {
      id: uid('nb'),
      name: 'Личное',
      color: 'sky',
      createdAt: now,
    }
    notebooks.push(fallback)
    for (const note of notes) {
      if (!note.notebookId) note.notebookId = fallback.id
    }
  }

  return {
    version: 2,
    groups: arr(value.groups).map(normalizeGroup),
    notebooks,
    notes,
    tasks: arr(value.tasks).map(normalizeTask),
    settings: normalizeSettings(value.settings),
    createdAt: num(value.createdAt, now),
    updatedAt: num(value.updatedAt, now),
  }
}
