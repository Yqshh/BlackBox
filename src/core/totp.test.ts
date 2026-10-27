import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  generateTOTP,
  normalizeTotpSecret,
  totpRemaining,
} from './totp'

/**
 * Тестовый секрет из RFC 6238 — ASCII-строка «12345678901234567890»
 * в base32.
 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('TOTP', () => {
  it('совпадает с векторами RFC 6238 (SHA-1, 8 цифр)', async () => {
    const vectors: Array<[number, string]> = [
      [59, '94287082'],
      [1_111_111_109, '07081804'],
      [1_111_111_111, '14050471'],
      [1_234_567_890, '89005924'],
      [2_000_000_000, '69279037'],
      [20_000_000_000, '65353130'],
    ]

    for (const [seconds, expected] of vectors) {
      const code = await generateTOTP(RFC_SECRET, {
        digits: 8,
        timestamp: seconds * 1000,
      })
      expect(code, `timestamp ${seconds}`).toBe(expected)
    }
  })

  it('генерирует шестизначный код', async () => {
    const code = await generateTOTP(RFC_SECRET, { timestamp: 59_000 })
    expect(code).toBe('287082')
    expect(code).toMatch(/^\d{6}$/)
  })

  it('считает оставшееся время окна', () => {
    expect(totpRemaining(30, 59_000)).toBe(1)
    expect(totpRemaining(30, 60_000)).toBe(30)
    expect(totpRemaining(30, 89_000)).toBe(1)
  })

  it('нормализует base32 и otpauth-ссылки', () => {
    expect(normalizeTotpSecret(' jbsw y3dp ehpk 3pxp ')).toBe('JBSWY3DPEHPK3PXP')
    expect(
      normalizeTotpSecret(
        'otpauth://totp/Test:user?secret=JBSWY3DPEHPK3PXP&issuer=Test',
      ),
    ).toBe('JBSWY3DPEHPK3PXP')
    expect(normalizeTotpSecret('')).toBe('')
  })

  it('декодирует base32', () => {
    const bytes = base32Decode('JBSWY3DPEHPK3PXP')
    expect(bytes.length).toBe(10)
    expect(Array.from(base32Decode('')).length).toBe(0)
  })

  it('падает на пустом секрете', async () => {
    await expect(generateTOTP('')).rejects.toThrow()
  })
})
