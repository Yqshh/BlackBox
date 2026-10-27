import { describe, expect, it } from 'vitest'
import {
  base64ToBytes,
  bytesToBase64,
  createRecord,
  decryptJSON,
  deriveKey,
  encryptJSON,
  openRecord,
} from './crypto'

describe('crypto', () => {
  it('шифрует и расшифровывает данные', async () => {
    const data = { hello: 'мир', count: 42, nested: { ok: true } }
    const { record } = await createRecord(data, 'test-master-password', {
      iterations: 1_000,
    })

    expect(record.format).toBe('vaultaccess-v2')
    expect(record.iterations).toBe(1_000)

    const opened = await openRecord<typeof data>(record, 'test-master-password')
    expect(opened.data).toEqual(data)
  })

  it('отклоняет неверный пароль', async () => {
    const { record } = await createRecord({ secret: 'value' }, 'right-password', {
      iterations: 1_000,
    })

    await expect(openRecord(record, 'wrong-password')).rejects.toThrow(
      /Неверный мастер-пароль/,
    )
  })

  it('использует разный IV для одинаковых данных', async () => {
    const { key, record } = await createRecord({ a: 1 }, 'password', {
      iterations: 1_000,
    })
    const first = await encryptJSON({ same: 'payload' }, key)
    const second = await encryptJSON({ same: 'payload' }, key)

    expect(first.iv).not.toBe(second.iv)
    expect(first.cipher).not.toBe(second.cipher)

    const key2 = await deriveKey('password', base64ToBytes(record.salt), 1_000)
    const decoded = await decryptJSON<{ same: string }>(first, key2)
    expect(decoded.same).toBe('payload')
  })

  it('корректно кодирует base64 для бинарных данных', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i
    const roundtrip = base64ToBytes(bytesToBase64(bytes))
    expect(Array.from(roundtrip)).toEqual(Array.from(bytes))
  })
})
