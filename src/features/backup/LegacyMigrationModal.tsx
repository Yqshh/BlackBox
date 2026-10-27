import { useState } from 'react'
import { History } from 'lucide-react'
import {
  importLegacyFromIndexedDb,
} from '../../core/legacy'
import { session } from '../../core/session'
import { Button, Field, TextInput } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'

export function LegacyMigrationModal({
  open,
  onClose,
  mode,
}: {
  open: boolean
  onClose: () => void
  mode: 'create' | 'replace'
}) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (busy) return
    setPassword('')
    setError('')
    onClose()
  }

  const submit = async () => {
    if (!password) {
      setError('Введите мастер-пароль старой базы.')
      return
    }

    setBusy(true)
    setError('')

    try {
      if (mode === 'create') {
        await session.importLegacy(password)
      } else {
        const data = await importLegacyFromIndexedDb(password)
        const saved = await session.replaceData(data)
        if (!saved) throw new Error('Не удалось сохранить импортированные данные')
      }

      toast.push('Данные первой версии перенесены')
      setPassword('')
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось перенести данные. Проверьте мастер-пароль.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Перенос из первой версии"
      subtitle="Найдена локальная база passwords.html"
      icon={<History size={20} />}
      size="sm"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" loading={busy} onClick={() => void submit()}>
            Перенести
          </Button>
        </div>
      }
    >
      <div className="form-stack">
        <p className="muted">
          Введите мастер-пароль, который использовался в старой версии. Данные будут
          расшифрованы и сохранены в новом формате.
        </p>

        <Field label="Мастер-пароль старой базы" required>
          <TextInput
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            data-autofocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
        </Field>

        {mode === 'create' && (
          <p className="notice notice--info">
            Пароль останется прежним. После входа его можно сменить в настройках.
          </p>
        )}

        {error && <p className="notice notice--danger">{error}</p>}
      </div>
    </Modal>
  )
}
