import { DEFAULT_SETTINGS, DEFAULT_VISIBILITY } from './defaults'
import { LEGACY_FORMAT, LEGACY_ITERATIONS, openRecord } from './crypto'
import { uid } from './ids'
import {
  ASSET_TYPES,
  type Accent,
  type Account,
  type Asset,
  type AssetType,
  type Category,
  type Note,
  type Notebook,
  type PasswordHistoryEntry,
  type Settings,
  type TargetHosts,
  type VaultData,
} from './types'

/**
 * Импорт данных из первой версии приложения (passwords.html).
 *
 * Старая версия хранила в IndexedDB запись { salt, iv, cipher } и выводила
 * ключ через PBKDF2 SHA-256 с 310 000 итераций. Здесь она расшифровывается
 * и перекладывается в новую схему.
 */

const LEGACY_DB = 'vaultaccess_db'
const LEGACY_STORE = 'vault'
const LEGACY_KEY = 'main_vault'

export interface LegacyRecord {
  salt: string
  iv: string
  cipher: string
  updatedAt?: number
}

type Obj = Record<string, unknown>

function isObj(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export function isLegacyRecord(value: unknown): value is LegacyRecord {
  if (!isObj(value)) return false
  return (
    typeof value.salt === 'string' &&
    typeof value.iv === 'string' &&
    typeof value.cipher === 'string'
  )
}

export function isLegacyPayload(value: unknown): value is LegacyRecord & { format: string } {
  return isObj(value) && value.format === LEGACY_FORMAT && isLegacyRecord(value)
}

/** Проверяет, существует ли база первой версии в этом браузере. */
export async function hasLegacyVault(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false

  try {
    if (typeof indexedDB.databases === 'function') {
      const databases = await indexedDB.databases()
      return databases.some((database) => database.name === LEGACY_DB)
    }
  } catch {
    // ниже пробуем открыть базу без версии
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(LEGACY_DB)
    } catch {
      finish(false)
      return
    }

    request.onupgradeneeded = () => {
      // Базы не было: откатываем создание, чтобы не оставлять мусор.
      request.transaction?.abort()
      finish(false)
    }
    request.onsuccess = () => {
      const db = request.result
      const exists = db.objectStoreNames.contains(LEGACY_STORE)
      db.close()
      finish(exists)
    }
    request.onerror = () => finish(false)
    request.onblocked = () => finish(false)
  })
}

export async function readLegacyRecord(): Promise<LegacyRecord | null> {
  if (!(await hasLegacyVault())) return null

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB)
    request.onupgradeneeded = () => {
      request.transaction?.abort()
      resolve(null)
    }
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.close()
        resolve(null)
        return
      }
      const transaction = db.transaction(LEGACY_STORE, 'readonly')
      const read = transaction.objectStore(LEGACY_STORE).get(LEGACY_KEY)
      read.onsuccess = () => {
        db.close()
        resolve(isLegacyRecord(read.result) ? read.result : null)
      }
      read.onerror = () => {
        db.close()
        reject(read.error ?? new Error('Не удалось прочитать старую базу'))
      }
    }
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть старую базу'))
  })
}

export async function decryptLegacyRecord(
  record: LegacyRecord,
  password: string,
): Promise<unknown> {
  const { data } = await openRecord<unknown>(record, password, LEGACY_ITERATIONS)
  return data
}

function mapTargetHosts(raw: Obj): TargetHosts {
  if (Array.isArray(raw.targetHosts)) return strArray(raw.targetHosts)
  if (typeof raw.targetHost === 'string') {
    return raw.targetHost === 'all' ? 'all' : [raw.targetHost]
  }
  return 'all'
}

function mapHistory(value: unknown): PasswordHistoryEntry[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isObj)
    .map((entry) => ({
      password: str(entry.password),
      changedAt: typeof entry.changedAt === 'number' ? entry.changedAt : Date.now(),
    }))
    .filter((entry) => entry.password.length > 0)
    .slice(0, 25)
}

function mapAccount(value: unknown): Account {
  const raw = isObj(value) ? value : {}
  const now = Date.now()
  return {
    id: str(raw.id) || uid('acc'),
    login: str(raw.login),
    password: str(raw.password),
    role: str(raw.role),
    targetHosts: mapTargetHosts(raw),
    note: str(raw.note),
    totpSecret: str(raw.totpSecret),
    passwordChangedAt: typeof raw.passwordChangedAt === 'number' ? raw.passwordChangedAt : now,
    passwordHistory: mapHistory(raw.passwordHistory),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

function mapAssetType(value: unknown): AssetType {
  return ASSET_TYPES.includes(value as AssetType) ? (value as AssetType) : 'note'
}

function mapAsset(value: unknown): Asset {
  const raw = isObj(value) ? value : {}
  const now = Date.now()
  const accounts = Array.isArray(raw.accounts) ? raw.accounts.map(mapAccount) : []

  return {
    id: str(raw.id) || uid('ast'),
    type: mapAssetType(raw.type),
    name: str(raw.name) || 'Без названия',
    titleNote: str(raw.titleNote),
    hosts: strArray(raw.hosts),
    customFields: Array.isArray(raw.customFields)
      ? raw.customFields
          .filter(isObj)
          .map((field) => ({ key: str(field.key), value: str(field.value) }))
          .filter((field) => field.key.length > 0)
      : [],
    oneC: {
      dbName: str(raw.c1DbName),
      server: str(raw.c1Server),
      mode: str(raw.c1Mode, 'Серверный (клиент-сервер)'),
    },
    vpn: {
      protocol: str(raw.vpnProtocol),
      server: str(raw.vpnServer),
    },
    webUrl: str(raw.webUrl),
    notes: str(raw.notes),
    visibility: {
      hosts: raw.showHosts !== false,
      oneC: raw.show1c !== false,
      vpn: raw.showVpn !== false,
      webUrl: raw.showWebUrl !== false,
      customFields: raw.showCustomFields !== false,
      notes: raw.showNotes !== false,
      titleNote: raw.showTitleNote !== false,
    },
    accounts,
    pinned: raw.pinned === true,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

function mapGroup(value: unknown, index: number) {
  const raw = isObj(value) ? value : {}
  const now = Date.now()
  return {
    id: str(raw.id) || uid('grp'),
    category: (raw.category === 'personal' ? 'personal' : 'work') as Category,
    name: str(raw.name) || `Раздел ${index + 1}`,
    description: str(raw.description),
    color: 'sky' as Accent,
    assets: Array.isArray(raw.assets) ? raw.assets.map(mapAsset) : [],
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

/** Преобразует старый массив групп (или открытый JSON) в актуальную схему. */
export function convertLegacyData(value: unknown): VaultData {
  let groupsRaw: unknown[] = []

  if (Array.isArray(value)) {
    groupsRaw = value
  } else if (isObj(value) && Array.isArray(value.groups)) {
    groupsRaw = value.groups
  } else {
    throw new Error('Это не похоже на данные первой версии VaultAccess')
  }

  const now = Date.now()
  const notebooks: Notebook[] = [
    { id: uid('nb'), name: 'Импортированное', color: 'amber', createdAt: now },
  ]
  const settings: Settings = { ...DEFAULT_SETTINGS }

  const notes: Note[] = []
  const groups = groupsRaw.map(mapGroup)

  // Старые «ресурсы-заметки» с текстом переносим в настоящие заметки,
  // чтобы ими было удобно пользоваться в новом разделе.
  for (const group of groups) {
    for (const asset of group.assets) {
      if (asset.type === 'note' && asset.notes.trim().length > 0) {
        notes.push({
          id: uid('note'),
          notebookId: notebooks[0]?.id ?? null,
          title: asset.name,
          content: asset.notes,
          tags: [group.name],
          pinned: false,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
        })
      }
    }
  }

  return {
    version: 2,
    groups,
    notebooks,
    notes,
    tasks: [],
    settings,
    createdAt: now,
    updatedAt: now,
  }
}

/** Читает и расшифровывает старую базу из IndexedDB. */
export async function importLegacyFromIndexedDb(password: string): Promise<VaultData> {
  const record = await readLegacyRecord()
  if (!record) throw new Error('Старая база не найдена в этом браузере')
  const data = await decryptLegacyRecord(record, password)
  return convertLegacyData(data)
}

export function hasLegacyShape(value: unknown): boolean {
  return Array.isArray(value) || (isObj(value) && Array.isArray(value.groups) && !('version' in value))
}

/** Проверяет, что запись похожа на шифрованный бэкап первой версии. */
export function legacyRecordFrom(value: unknown): LegacyRecord | null {
  if (!isLegacyRecord(value)) return null
  if (isObj(value) && value.format && value.format !== LEGACY_FORMAT) return null
  return value
}

export { DEFAULT_VISIBILITY }
