import { useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  HardDrive,
  History,
  KeyRound,
  LockKeyhole,
  NotebookPen,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { session } from '../core/session'
import { useSession } from '../hooks/useSession'
import { Brand } from '../ui/Brand'
import { Button, Checkbox, Field, TextInput } from '../ui/Controls'
import { Kbd } from '../ui/Badge'
import { StrengthMeter } from '../ui/StrengthMeter'
import { useToast } from '../ui/Toast'
import { ImportBackupModal } from '../features/backup/ImportBackupModal'
import { LegacyMigrationModal } from '../features/backup/LegacyMigrationModal'

const FEATURES = [
  {
    icon: KeyRound,
    title: 'Пароли и доступы',
    text: 'Ресурсы, учётные записи, TOTP и история паролей.',
  },
  {
    icon: NotebookPen,
    title: 'Заметки в Markdown',
    text: 'Личные и рабочие записи с тегами и блокнотами.',
  },
  {
    icon: ShieldCheck,
    title: 'Только локально',
    text: 'AES-256-GCM, IndexedDB. Данные не уходят в сеть.',
  },
  {
    icon: HardDrive,
    title: 'Автобэкап',
    text: 'Шифрованная копия в файл на диске при каждом изменении.',
  },
]

export function LockScreen() {
  const state = useSession()
  const toast = useToast()
  const isNew = state.isNewVault

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [legacyOpen, setLegacyOpen] = useState(false)

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    setError('')

    if (isNew) {
      if (password.length < 5) {
        setError('Мастер-пароль должен быть не короче 5 символов.')
        return
      }
      if (password !== confirmPassword) {
        setError('Пароли не совпадают.')
        return
      }
      if (!agree) {
        setError('Подтвердите, что понимаете: пароль нельзя восстановить.')
        return
      }
    } else if (!password) {
      setError('Введите мастер-пароль.')
      return
    }

    setBusy(true)
    try {
      if (isNew) {
        await session.create(password)
        toast.push('Хранилище создано. Добро пожаловать!')
      } else {
        await session.unlock(password)
        toast.push('Хранилище разблокировано')
      }
      setPassword('')
      setConfirmPassword('')
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : isNew
            ? 'Не удалось создать хранилище'
            : 'Неверный мастер-пароль',
      )
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lock-page">
      <div className="lock-page__grid" aria-hidden />
      <div className="lock-page__glow" aria-hidden />

      <section className="lock-intro">
        <Brand size="lg" subtitle="пароли · ресурсы · заметки" />

        <div className="lock-intro__body">
          <span className="pill">
            <LockKeyhole size={13} aria-hidden />
            Локальный менеджер
          </span>
          <h1>
            Всё важное —
            <br />
            <span>под одним замком.</span>
          </h1>
          <p>
            Пароли, рабочие доступы и личные заметки в одном зашифрованном пространстве.
            Без облака, аккаунтов и телеметрии.
          </p>

          <div className="lock-features">
            {FEATURES.map((feature) => (
              <div className="lock-feature" key={feature.title}>
                <div className="lock-feature__icon">
                  <feature.icon size={17} aria-hidden />
                </div>
                <div>
                  <strong>{feature.title}</strong>
                  <span>{feature.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lock-intro__foot">
          <ShieldCheck size={15} aria-hidden />
          <span>AES-256-GCM · PBKDF2 600 000 · данные не покидают устройство</span>
        </div>
      </section>

      <section className="lock-panel">
        <div className="lock-card">
          <div className="lock-card__head">
            <div className="lock-card__icon">
              <Fingerprint size={24} aria-hidden />
            </div>
            <div>
              <h2>{isNew ? 'Создание хранилища' : 'С возвращением'}</h2>
              <p>
                {isNew
                  ? 'Придумайте мастер-пароль. Он шифрует всё содержимое.'
                  : 'Введите мастер-пароль, чтобы открыть хранилище.'}
              </p>
            </div>
          </div>

          {state.lockReason === 'timeout' && (
            <p className="notice notice--info">
              Хранилище заблокировано после периода бездействия.
            </p>
          )}

          <form className="lock-form" onSubmit={(event) => void submit(event)}>
            <Field label={isNew ? 'Новый мастер-пароль' : 'Мастер-пароль'}>
              <div className="input-with-action">
                <TextInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
                  placeholder={isNew ? 'Минимум 5 символов' : '••••••••••'}
                  autoComplete={isNew ? 'new-password' : 'current-password'}
                  autoFocus
                  data-autofocus
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {capsLock && (
              <p className="notice notice--warning">
                <AlertTriangle size={14} aria-hidden /> Включён Caps Lock
              </p>
            )}

            {isNew && (
              <>
                {password.length > 0 && <StrengthMeter password={password} />}

                <Field label="Повторите мастер-пароль">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={Boolean(error)}
                  />
                </Field>

                <Checkbox
                  label="Я понимаю, что мастер-пароль нельзя восстановить"
                  description="Единственный способ вернуть доступ — резервная копия и пароль от неё."
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                />
              </>
            )}

            {error && <p className="notice notice--danger">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={busy}
              icon={isNew ? <ShieldCheck size={17} /> : <ArrowRight size={17} />}
            >
              {isNew ? 'Создать хранилище' : 'Разблокировать'}
            </Button>
          </form>

          {isNew && (
            <div className="lock-imports">
              <div className="lock-imports__label">
                <span>Уже есть данные?</span>
              </div>
              <button type="button" className="lock-import" onClick={() => setImportOpen(true)}>
                <Upload size={17} aria-hidden />
                <span>
                  <strong>Импортировать бэкап</strong>
                  <small>JSON из старой или новой версии</small>
                </span>
                <ArrowRight size={15} aria-hidden />
              </button>

              {state.hasLegacy && (
                <button type="button" className="lock-import" onClick={() => setLegacyOpen(true)}>
                  <History size={17} aria-hidden />
                  <span>
                    <strong>Перенести старую базу</strong>
                    <small>Данные найдены в этом браузере</small>
                  </span>
                  <ArrowRight size={15} aria-hidden />
                </button>
              )}
            </div>
          )}

          <div className="lock-card__foot">
            <ShieldCheck size={14} aria-hidden />
            <span>Мастер-пароль не хранится и не передаётся.</span>
            <Kbd>offline</Kbd>
          </div>
        </div>

        <p className="lock-panel__note">
          Открывайте приложение на одном и том же адресе: данные IndexedDB привязаны к
          источнику.
        </p>
      </section>

      <ImportBackupModal open={importOpen} onClose={() => setImportOpen(false)} mode="create" />
      <LegacyMigrationModal
        open={legacyOpen}
        onClose={() => setLegacyOpen(false)}
        mode="create"
      />
    </div>
  )
}
