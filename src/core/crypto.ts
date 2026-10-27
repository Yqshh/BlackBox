/**
 * Шифрование хранилища.
 *
 * Мастер-пароль никогда не сохраняется. Из него через PBKDF2 выводится
 * неизвлекаемый AES-256-GCM-ключ, который живёт только в памяти вкладки.
 */

export const VAULT_FORMAT = 'vaultaccess-v2'
export const LEGACY_FORMAT = 'vaultaccess-encrypted-v1'
export const PBKDF2_ITERATIONS = 600_000
export const LEGACY_ITERATIONS = 310_000

export interface VaultRecord {
  format: typeof VAULT_FORMAT
  salt: string
  iterations: number
  iv: string
  cipher: string
  updatedAt: number
}

export interface EncryptedPayload {
  iv: string
  cipher: string
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    let part = ''
    for (let i = 0; i < chunk.length; i += 1) {
      part += String.fromCharCode(chunk[i] ?? 0)
    }
    binary += part
  }

  return btoa(binary)
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export function assertCryptoAvailable(): void {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Web Crypto недоступен. Откройте приложение по HTTPS или на localhost (не через file://).',
    )
  }
}

export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  assertCryptoAvailable()

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJSON(data: unknown, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBuffer(iv) },
    key,
    plaintext,
  )

  return {
    iv: bytesToBase64(iv),
    cipher: bytesToBase64(new Uint8Array(cipher)),
  }
}

export async function decryptJSON<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  try {
    const iv = base64ToBytes(payload.iv)
    const cipher = base64ToBytes(payload.cipher)
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toBuffer(iv) },
      key,
      toBuffer(cipher),
    )
    return JSON.parse(new TextDecoder().decode(plaintext)) as T
  } catch {
    throw new Error('Неверный мастер-пароль или повреждённые данные')
  }
}

export async function createRecord<T>(
  data: T,
  password: string,
  options?: { salt?: Uint8Array; iterations?: number },
): Promise<{ record: VaultRecord; key: CryptoKey; salt: Uint8Array }> {
  const salt = options?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const iterations = options?.iterations ?? PBKDF2_ITERATIONS
  const key = await deriveKey(password, salt, iterations)
  const payload = await encryptJSON(data, key)

  return {
    record: {
      format: VAULT_FORMAT,
      salt: bytesToBase64(salt),
      iterations,
      iv: payload.iv,
      cipher: payload.cipher,
      updatedAt: Date.now(),
    },
    key,
    salt,
  }
}

export async function openRecord<T>(
  record: Pick<VaultRecord, 'salt' | 'iv' | 'cipher'> & { iterations?: number },
  password: string,
  iterations = record.iterations ?? PBKDF2_ITERATIONS,
): Promise<{ data: T; key: CryptoKey; salt: Uint8Array }> {
  const salt = base64ToBytes(record.salt)
  const key = await deriveKey(password, salt, iterations)
  const data = await decryptJSON<T>({ iv: record.iv, cipher: record.cipher }, key)
  return { data, key, salt }
}

export function isVaultRecord(value: unknown): value is VaultRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<VaultRecord>
  return (
    record.format === VAULT_FORMAT &&
    typeof record.salt === 'string' &&
    typeof record.iv === 'string' &&
    typeof record.cipher === 'string' &&
    typeof record.iterations === 'number'
  )
}
