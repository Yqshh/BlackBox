const DB_NAME = 'vaultaccess_v2'
const DB_VERSION = 1

export type StoreName = 'vault' | 'meta'

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB недоступен в этом браузере'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('vault')) db.createObjectStore('vault')
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть IndexedDB'))
    request.onblocked = () => reject(new Error('IndexedDB заблокирован другой вкладкой'))
  })

  return databasePromise
}

export async function idbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase()
  return new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error('Ошибка чтения IndexedDB'))
  })
}

export async function idbSet(store: StoreName, key: string, value: unknown): Promise<void> {
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    transaction.objectStore(store).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка записи IndexedDB'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Запись IndexedDB отменена'))
  })
}

export async function idbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    transaction.objectStore(store).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка удаления IndexedDB'))
  })
}
