import { describe, expect, it } from 'vitest'
import { flushPendingChanges, registerPendingFlush } from './pending'

describe('отложенные изменения интерфейса', () => {
  it('вызывает зарегистрированные обработчики', () => {
    let calls = 0
    const unregister = registerPendingFlush(() => {
      calls += 1
    })

    flushPendingChanges()
    expect(calls).toBe(1)

    unregister()
    flushPendingChanges()
    expect(calls).toBe(1)
  })

  it('продолжает работу, если один обработчик упал', () => {
    const unregisterBad = registerPendingFlush(() => {
      throw new Error('boom')
    })
    let calls = 0
    const unregisterGood = registerPendingFlush(() => {
      calls += 1
    })

    expect(() => flushPendingChanges()).not.toThrow()
    expect(calls).toBe(1)

    unregisterBad()
    unregisterGood()
  })
})
