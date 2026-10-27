/**
 * Единая модель данных приложения.
 *
 * Всё, что описано здесь, целиком шифруется одним AES-GCM-блоком
 * и хранится в IndexedDB. Никакие поля не уходят в сеть.
 */

export const CATEGORIES = ['work', 'personal'] as const
export type Category = (typeof CATEGORIES)[number]

export const ASSET_TYPES = ['rdp', '1c', 'vpn', 'web', 'db', 'ssh', 'note'] as const
export type AssetType = (typeof ASSET_TYPES)[number]

export const ACCENTS = ['sky', 'emerald', 'amber', 'violet', 'rose', 'slate'] as const
export type Accent = (typeof ACCENTS)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
}

export type ThemeMode = 'dark' | 'light' | 'system'

export interface PasswordHistoryEntry {
  password: string
  changedAt: number
}

/**
 * Привязка учётной записи к адресам ресурса.
 * `'all'` — учётка подходит ко всему ресурсу.
 */
export type TargetHosts = 'all' | string[]

export interface Account {
  id: string
  login: string
  password: string
  role: string
  targetHosts: TargetHosts
  note: string
  /** Base32-секрет TOTP. Пустая строка — 2FA не используется. */
  totpSecret: string
  passwordChangedAt: number
  passwordHistory: PasswordHistoryEntry[]
  createdAt: number
  updatedAt: number
}

export interface CustomField {
  key: string
  value: string
}

export interface AssetVisibility {
  hosts: boolean
  oneC: boolean
  vpn: boolean
  webUrl: boolean
  customFields: boolean
  notes: boolean
  titleNote: boolean
}

export interface OneCParams {
  dbName: string
  server: string
  mode: string
}

export interface VpnParams {
  protocol: string
  server: string
}

export interface Asset {
  id: string
  type: AssetType
  name: string
  /** Короткий бейдж рядом с названием: «прод», «через VPN» и т.п. */
  titleNote: string
  hosts: string[]
  customFields: CustomField[]
  oneC: OneCParams
  vpn: VpnParams
  webUrl: string
  notes: string
  visibility: AssetVisibility
  accounts: Account[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface Group {
  id: string
  category: Category
  name: string
  description: string
  color: Accent
  assets: Asset[]
  createdAt: number
  updatedAt: number
}

export interface Notebook {
  id: string
  name: string
  color: Accent
  createdAt: number
}

export interface Note {
  id: string
  notebookId: string | null
  title: string
  /** Markdown-текст заметки. */
  content: string
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface Task {
  id: string
  title: string
  description: string
  /** Локальная дата на 00:00 или null, если срок не задан. */
  dueAt: number | null
  done: boolean
  priority: TaskPriority
  createdAt: number
  updatedAt: number
  completedAt: number | null
}

export interface Settings {
  /** 0 — не блокировать автоматически. */
  autoLockMinutes: number
  /** 0 — не очищать буфер обмена. */
  clipboardClearSeconds: number
  oldPasswordDays: number
  theme: ThemeMode
  lastBackupAt: number | null
}

export interface VaultData {
  version: 2
  groups: Group[]
  notebooks: Notebook[]
  notes: Note[]
  tasks: Task[]
  settings: Settings
  createdAt: number
  updatedAt: number
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  rdp: 'RDP',
  '1c': 'База 1С',
  vpn: 'VPN',
  web: 'Веб-сайт',
  db: 'База данных',
  ssh: 'SSH',
  note: 'Заметка',
}

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  rdp: '💻',
  '1c': '📦',
  vpn: '🛡️',
  web: '🌐',
  db: '🗄️',
  ssh: '⚡',
  note: '📝',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  work: 'Рабочие',
  personal: 'Личные',
}

export const ACCENT_LABELS: Record<Accent, string> = {
  sky: 'Голубой',
  emerald: 'Зелёный',
  amber: 'Янтарный',
  violet: 'Фиолетовый',
  rose: 'Розовый',
  slate: 'Серый',
}
