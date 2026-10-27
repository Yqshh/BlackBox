import { useState } from 'react'
import { FileJson, Upload } from 'lucide-react'
import {
  convertLegacyData,
  hasLegacyShape,
  isLegacyPayload,
  isLegacyRecord,
} from '../../core/legacy'
import { normalizeVault } from '../../core/defaults'
import { isVaultRecord } from '../../core/crypto'
import { pickFile, readFileAsText } from '../../core/files'
import { decodeBackupData, session, type BackupRecordInput } from '../../core/session'
import { formatCount } from '../../core/format'
import { Button, Field, TextInput } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'
import type { VaultData } from '../../core/types'

type BackupKind = 'v2-encrypted' | 'v1-encrypted' | 'plain-v2' | 'plain-legacy' | 'unknown'

function detectKind(payload: unknown): BackupKind {
  if (isVaultRecord(payload)) return 'v2-encrypted'
  if (isLegacyPayload(payload) || isLegacyRecord(payload)) return 'v1-encrypted'
  if (Array.isArray(payload) || hasLegacyShape(payload)) return 'plain-legacy'
  if (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as { groups?: unknown }).groups)
  ) {
    return 'plain-v2'
  }
  return 'unknown'
}

const KIND_LABELS: Record<BackupKind, string> = {
  'v2-encrypted': 'Шифрованный бэкап BlackBox',
  'v1-encrypted': 'Шифрованный бэкап первой версии',
  'plain-v2': 'Открытый JSON BlackBox',
  'plain-legacy': 'Открытый JSON первой версии',
  unknown: 'Неизвестный формат',
}

export function ImportBackupModal({
  open,
  onClose,
  mode,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'replace'
}) {
  const toast = useToast()
  const [fileName, setFileName] = useState('')
  const [payload, setPayload] = useState<unknown>(null)
  const [kind, setKind] = useState<BackupKind>('unknown')
  const [backupPassword, setBackupPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setFileName('')
    setPayload(null)
    setKind('unknown')
    setBackupPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setBusy(false)
    setError('')
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const chooseFile = async () => {
    setError('')
    const file = await pickFile('.json,application/json')
    if (!file) return

    try {
      const text = await readFileAsText(file)
      const parsed = JSON.parse(text) as unknown
      const detected = detectKind(parsed)
      if (detected === 'unknown') {
        setError('Файл не похож на резервную копию BlackBox.')
        return
      }
      setFileName(file.name)
      setPayload(parsed)
      setKind(detected)
    } catch {
      setError('Не удалось прочитать JSON-файл.')
    }
  }

  const encrypted = kind === 'v2-encrypted' || kind === 'v1-encrypted'

  const submit = async () => {
    if (!payload || kind === 'unknown') {
      setError('Сначала выберите файл резервной копии.')
      return
    }

    if (encrypted && !backupPassword) {
      setError('Введите пароль от резервной копии.')
      return
    }

    if (mode === 'create') {
      if (newPassword.length < 5) {
        setError('Новый мастер-пароль должен быть не короче 5 символов.')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Мастер-пароли не совпадают.')
        return
      }
    }

    setBusy(true)
    setError('')

    try {
      let data: VaultData
      if (encrypted) {
        data = await decodeBackupData(payload as BackupRecordInput, backupPassword)
      } else if (kind === 'plain-legacy') {
        data = convertLegacyData(payload)
      } else {
        data = normalizeVault(payload)
      }

      if (mode === 'create') {
        await session.createWithData(data, newPassword)
      } else {
        const saved = await session.replaceData(data)
        if (!saved) throw new Error('Не удалось сохранить импортированные данные')
      }

      toast.push(
        `Импортировано: ${formatCount(data.groups.length, 'раздел', 'раздела', 'разделов')}, ${formatCount(data.notes.length, 'заметка', 'заметки', 'заметок')}`,
      )
      reset()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось импортировать данные')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Импорт резервной копии"
      subtitle="Данные заменят текущее содержимое хранилища"
      icon={<Upload size={20} />}
      size="md"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button
            variant="primary"
            loading={busy}
            onClick={() => void submit()}
            disabled={!payload}
          >
            Импортировать
          </Button>
        </div>
      }
    >
      <div className="form-stack">
        <div className="file-picker">
          <div className="file-picker__icon">
            <FileJson size={22} aria-hidden />
          </div>
          <div className="file-picker__body">
            <strong>{fileName || 'Файл не выбран'}</strong>
            <span>
              {fileName ? KIND_LABELS[kind] : 'Шифрованный или открытый JSON-бэкап BlackBox'}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void chooseFile()}>
            Выбрать
          </Button>
        </div>

        {kind === 'plain-legacy' || kind === 'plain-v2' ? (
          <p className="notice notice--warning">
            Это открытый JSON: пароли в нём не защищены. После импорта задайте надёжный
            мастер-пароль и удалите файл.
          </p>
        ) : null}

        {encrypted && (
          <Field label="Пароль от резервной копии" required>
            <TextInput
              type="password"
              value={backupPassword}
              onChange={(event) => setBackupPassword(event.target.value)}
              autoComplete="off"
              placeholder="Пароль, которым был сделан бэкап"
            />
          </Field>
        )}

        {mode === 'create' && (
          <>
            <div className="divider" />
            <p className="muted">
              Для импортированных данных задаётся новый мастер-пароль. Он будет использоваться
              для входа в это хранилище.
            </p>
            <Field label="Новый мастер-пароль" hint="Минимум 5 символов" required>
              <TextInput
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Повторите мастер-пароль" required>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </>
        )}

        {error && <p className="notice notice--danger">{error}</p>}
      </div>
    </Modal>
  )
}
