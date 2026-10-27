/**
 * TOTP (RFC 6238) на Web Crypto. Секрет вводится в base32,
 * как его выдают Google Authenticator, 1Password и другие.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export interface TotpResult {
  code: string
  remaining: number
}

export function normalizeTotpSecret(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed)
      return (url.searchParams.get('secret') ?? '').replace(/[\s-]/g, '').toUpperCase()
    } catch {
      return ''
    }
  }

  return trimmed.replace(/[\s-]/g, '').replace(/=+$/g, '').toUpperCase()
}

export function base32Decode(value: string): Uint8Array {
  const clean = value.replace(/[\s-]/g, '').replace(/=+$/g, '').toUpperCase()
  const output: number[] = []
  let bits = 0
  let accumulator = 0

  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue
    accumulator = (accumulator << 5) | index
    bits += 5
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return new Uint8Array(output)
}

export async function generateTOTP(
  secret: string,
  options: { period?: number; digits?: number; timestamp?: number } = {},
): Promise<string> {
  const period = options.period ?? 30
  const digits = options.digits ?? 6
  const timestamp = options.timestamp ?? Date.now()
  const keyBytes = base32Decode(secret)

  if (keyBytes.length === 0) throw new Error('Пустой TOTP-секрет')

  const counter = Math.floor(timestamp / 1000 / period)
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setUint32(0, 0)
  view.setUint32(4, counter)

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, buffer))
  const offset = (signature[signature.length - 1] ?? 0) & 0x0f
  const binary =
    (((signature[offset] ?? 0) & 0x7f) << 24) |
    ((signature[offset + 1] ?? 0) << 16) |
    ((signature[offset + 2] ?? 0) << 8) |
    (signature[offset + 3] ?? 0)

  const code = String(binary % 10 ** digits).padStart(digits, '0')
  return code
}

export function totpRemaining(period = 30, timestamp = Date.now()): number {
  return period - (Math.floor(timestamp / 1000) % period)
}

export async function totpWithRemaining(secret: string, period = 30): Promise<TotpResult> {
  const now = Date.now()
  return {
    code: await generateTOTP(secret, { period, timestamp: now }),
    remaining: totpRemaining(period, now),
  }
}
