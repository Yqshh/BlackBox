import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PASSWORD_OPTIONS,
  estimateEntropyBits,
  generatePassword,
  type PasswordOptions,
} from './password'

const baseOptions: PasswordOptions = {
  ...DEFAULT_PASSWORD_OPTIONS,
  length: 24,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
}

describe('password generator', () => {
  it('возвращает пароль нужной длины', () => {
    for (const length of [8, 12, 20, 32, 64]) {
      const password = generatePassword({ ...baseOptions, length })
      expect(password).toHaveLength(length)
    }
  })

  it('гарантирует каждый выбранный класс символов', () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generatePassword({ ...baseOptions, length: 4 })
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/\d/)
      expect(password).toMatch(/[^A-Za-z0-9]/)
    }
  })

  it('не выдаёт символы вне выбранных наборов', () => {
    const password = generatePassword({
      ...baseOptions,
      length: 64,
      uppercase: false,
      symbols: false,
    })
    expect(password).toMatch(/^[a-z0-9]+$/)
  })

  it('исключает похожие символы', () => {
    for (let i = 0; i < 20; i += 1) {
      const password = generatePassword({
        ...baseOptions,
        length: 48,
        excludeAmbiguous: true,
      })
      expect(password).not.toMatch(/[Il1O0o|]/)
    }
  })

  it('возвращает разные пароли', () => {
    const values = new Set(Array.from({ length: 20 }, () => generatePassword(baseOptions)))
    expect(values.size).toBe(20)
  })

  it('оценивает энтропию', () => {
    expect(estimateEntropyBits('')).toBe(0)
    expect(estimateEntropyBits('abcdefghijklmnop')).toBeGreaterThan(60)
    expect(estimateEntropyBits('aB3!aB3!aB3!aB3!')).toBeGreaterThan(
      estimateEntropyBits('aaaaaaaaaaaaaaaa'),
    )
  })
})
