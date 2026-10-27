import { describe, expect, it } from 'vitest'
import { assessPassword, isWeakPassword } from './strength'

describe('password strength', () => {
  it('считает популярные пароли очень слабыми', () => {
    const result = assessPassword('password')
    expect(result.score).toBe(0)
    expect(result.hints.length).toBeGreaterThan(0)
  })

  it('считает короткий пароль слабым', () => {
    expect(assessPassword('abc12').score).toBeLessThanOrEqual(1)
    expect(isWeakPassword('abc12')).toBe(true)
  })

  it('считает длинный пароль с разными классами надёжным', () => {
    const result = assessPassword('K7#mQ2$vX9!pL4@nR8')
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.entropy).toBeGreaterThan(80)
  })

  it('подсказывает про повторяющиеся символы', () => {
    const result = assessPassword('aaaaaaaaaaaaaa')
    expect(result.score).toBe(0)
    expect(result.hints.some((hint) => hint.includes('повтор'))).toBe(true)
  })

  it('обрабатывает пустой пароль', () => {
    expect(assessPassword('').label).toBe('Пустой')
    expect(assessPassword('').score).toBe(0)
  })
})
