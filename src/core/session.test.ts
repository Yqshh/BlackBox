import { describe, expect, it } from 'vitest'
import { LEGACY_ITERATIONS, createRecord } from './crypto'
import { decodeBackupData } from './session'

const legacyData = [
  {
    category: 'work',
    name: 'Старый раздел',
    assets: [
      {
        type: 'web',
        name: 'Старый ресурс',
        hosts: ['old.local'],
        accounts: [{ login: 'old-user', password: 'old-password' }],
      },
    ],
  },
]

describe('декодирование резервных копий', () => {
  it('понимает старый авто-бэкап без поля format', async () => {
    const password = 'old-master-password'
    const { record } = await createRecord(legacyData, password, {
      iterations: LEGACY_ITERATIONS,
    })

    const withoutFormat = {
      salt: record.salt,
      iv: record.iv,
      cipher: record.cipher,
      updatedAt: record.updatedAt,
    }

    const data = await decodeBackupData(withoutFormat, password)
    expect(data.groups[0]?.name).toBe('Старый раздел')
    expect(data.groups[0]?.assets[0]?.accounts[0]?.login).toBe('old-user')
  })

  it('понимает старый конверт с format и 310 000 итераций', async () => {
    const password = 'old-master-password'
    const { record } = await createRecord(legacyData, password, {
      iterations: LEGACY_ITERATIONS,
    })

    const legacyEnvelope = {
      ...record,
      format: 'vaultaccess-encrypted-v1',
      iterations: undefined,
    }

    const data = await decodeBackupData(legacyEnvelope, password)
    expect(data.groups[0]?.name).toBe('Старый раздел')
  })

  it('понимает новый конверт с 600 000 итераций', async () => {
    const password = 'new-master-password'
    const { record } = await createRecord(legacyData, password)
    const data = await decodeBackupData(record, password)
    expect(data.groups[0]?.name).toBe('Старый раздел')
  })

  it('отклоняет неверный пароль', async () => {
    const { record } = await createRecord(legacyData, 'correct-password', {
      iterations: LEGACY_ITERATIONS,
    })
    await expect(
      decodeBackupData(
        { salt: record.salt, iv: record.iv, cipher: record.cipher },
        'wrong-password',
      ),
    ).rejects.toThrow(/Неверный мастер-пароль/)
  })
})
