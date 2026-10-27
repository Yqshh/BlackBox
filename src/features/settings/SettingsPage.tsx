import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Clipboard,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  HardDrive,
  History,
  Info,
  KeyRound,
  Keyboard,
  Lock,
  Monitor,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Timer,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { APP_VERSION } from '../../core/defaults'
import { PBKDF2_ITERATIONS } from '../../core/crypto'
import { CATEGORY_LABELS, type Settings, type ThemeMode } from '../../core/types'
import { ASSET_TYPE_LABELS } from '../../core/types'
import { downloadJSON, downloadText, todayStamp } from '../../core/files'
import { formatDateTime, formatRelative } from '../../core/format'
import { session } from '../../core/session'
import { useSession } from '../../hooks/useSession'
import { useBackup } from '../../hooks/useBackup'
import { backup as backupStore } from '../../core/backup'
import { useConfirm } from '../../ui/Confirm'
import { useToast } from '../../ui/Toast'
import { Button, Field, Select, TextInput } from '../../ui/Controls'
import { PageHeader } from '../../ui/Layout'
import { StrengthMeter } from '../../ui/StrengthMeter'
import { Modal } from '../../ui/Modal'
import { Kbd } from '../../ui/Badge'
import { cx } from '../../ui/cx'
import { allAccounts } from '../vault/vaultStats'
import { ImportBackupModal } from '../backup/ImportBackupModal'
import { LegacyMigrationModal } from '../backup/LegacyMigrationModal'

const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Никогда' },
  { value: 1, label: '1 минута' },
  { value: 5, label: '5 минут' },
  { value: 10, label: '10 минут' },
  { value: 15, label: '15 минут' },
  { value: 30, label: '30 минут' },
  { value: 60, label: '1 час' },
]

const CLIPBOARD_OPTIONS = [
  { value: 0, label: 'Не очищать' },
  { value: 15, label: '15 секунд' },
  { value: 30, label: '30 секунд' },
  { value: 60, label: '1 минута' },
  { value: 120, label: '2 минуты' },
]

const OLD_PASSWORD_OPTIONS = [
  { value: 30, label: '30 дней' },
  { value: 60, label: '60 дней' },
  { value: 90, label: '90 дней' },
  { value: 180, label: '180 дней' },
  { value: 365, label: '1 год' },
]

const THEMES: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'system', label: 'Системная', icon: Monitor },
]

export function SettingsPage() {
  const state = useSession()
  const data = state.data
  const backupState = useBackup()
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()

  const [changeMasterOpen, setChangeMasterOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [legacyOpen, setLegacyOpen] = useState(false)

  if (!data) return null

  const settings = data.settings

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    session.mutate((draft) => {
      draft.settings[key] = value
    })
  }

  const lockNow = async () => {
    const locked = await session.lock('manual')
    if (!locked) toast.push('Не удалось сохранить изменения', 'error')
  }

  const connectBackup = async () => {
    const saved = await session.saveNow()
    if (!saved) {
      toast.push('Сначала нужно сохранить изменения', 'error')
      return
    }
    const ok = await backupStore.connect(session.getRecord())
    toast.push(ok ? 'Автобэкап подключён' : 'Автобэкап не подключён', ok ? 'success' : 'error')
  }

  const resumeBackup = async () => {
    const saved = await session.saveNow()
    if (!saved) {
      toast.push('Сначала нужно сохранить изменения', 'error')
      return
    }
    const ok = await backupStore.resume(session.getRecord())
    toast.push(ok ? 'Автобэкап возобновлён' : 'Разрешение не выдано', ok ? 'success' : 'error')
  }

  const disconnectBackup = async () => {
    await backupStore.disconnect()
    toast.push('Автобэкап отключён')
  }

  const exportEncrypted = async () => {
    const saved = await session.saveNow()
    if (!saved) {
      toast.push('Не удалось сохранить данные', 'error')
      return
    }
    const record = session.getRecord()
    if (!record) return
    downloadJSON(record, `BlackBox-backup-${todayStamp()}.json`)
    session.mutate((draft) => {
      draft.settings.lastBackupAt = Date.now()
    })
    toast.push('Шифрованная копия сохранена')
  }

  const exportPlain = async () => {
    const ok = await confirm({
      title: 'Экспорт в открытом виде?',
      message: 'Пароли будут записаны в JSON без шифрования.',
      details: 'Храните файл только в защищённом месте и удалите его после использования.',
      danger: true,
      confirmLabel: 'Экспортировать',
    })
    if (!ok) return
    downloadJSON(data, `BlackBox-plain-${todayStamp()}.json`)
    toast.push('Открытый JSON сохранён', 'warning')
  }

  const exportCsv = () => {
    const esc = (value: unknown) => {
      const text = String(value ?? '')
      // Защита от формул Excel/Calc: ячейка, начинающаяся с =, +, - или @,
      // не должна выполняться как формула при открытии CSV.
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const header = [
      'Категория',
      'Раздел',
      'Ресурс',
      'Тип',
      'Логин',
      'Пароль',
      'Роль',
      'Привязка',
      'Адреса ресурса',
      '2FA',
      'Заметка',
    ]
    const rows = allAccounts(data).map(({ group, asset, account }) => [
      CATEGORY_LABELS[group.category],
      group.name,
      asset.name,
      ASSET_TYPE_LABELS[asset.type],
      account.login,
      account.password,
      account.role,
      account.targetHosts === 'all' ? 'все адреса' : account.targetHosts.join(', '),
      asset.hosts.join(', '),
      account.totpSecret,
      account.note,
    ])
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(esc).join(';')).join('\r\n')}`
    downloadText(csv, `BlackBox-accounts-${todayStamp()}.csv`, 'text/csv;charset=utf-8')
    toast.push('CSV сохранён', 'warning')
  }

  const exportNotes = () => {
    const parts: string[] = ['# BlackBox — заметки', '']
    for (const notebook of data.notebooks) {
      const notes = data.notes.filter((note) => note.notebookId === notebook.id)
      if (notes.length === 0) continue
      parts.push(`## ${notebook.name}`, '')
      for (const note of notes) {
        parts.push(`### ${note.title || 'Без названия'}`, '', note.content, '', '---', '')
      }
    }
    const orphaned = data.notes.filter((note) => !note.notebookId)
    if (orphaned.length > 0) {
      parts.push('## Без блокнота', '')
      for (const note of orphaned) {
        parts.push(`### ${note.title || 'Без названия'}`, '', note.content, '', '---', '')
      }
    }
    downloadText(parts.join('\n'), `BlackBox-notes-${todayStamp()}.md`, 'text/markdown;charset=utf-8')
    toast.push('Markdown с заметками сохранён')
  }

  const wipeVault = async () => {
    const ok = await confirm({
      title: 'Удалить хранилище?',
      message: 'Все пароли, заметки и настройки будут удалены с этого устройства.',
      details: 'Резервные копии в файлах останутся, но открыть их можно только старым паролем.',
      requireText: 'УДАЛИТЬ',
      danger: true,
      confirmLabel: 'Удалить навсегда',
    })
    if (!ok) return
    await session.wipe()
    toast.push('Хранилище удалено')
  }

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Настройки"
        title="Хранилище и безопасность"
        description="Параметры блокировки, резервные копии, импорт и экспорт. Всё применяется локально."
      />

      <div className="settings-grid">
        <section className="card">
          <header className="card__head">
            <div>
              <h2>Безопасность</h2>
              <p>Поведение хранилища и мастер-пароль</p>
            </div>
            <ShieldCheck size={18} aria-hidden />
          </header>

          <div className="settings-rows">
            <div className="setting-row">
              <div className="setting-row__text">
                <strong>
                  <Timer size={15} aria-hidden /> Автоблокировка
                </strong>
                <span>Через сколько минут бездействия закрывать хранилище.</span>
              </div>
              <Select
                value={settings.autoLockMinutes}
                onChange={(event) => setSetting('autoLockMinutes', Number(event.target.value))}
                aria-label="Автоблокировка"
              >
                {AUTO_LOCK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="setting-row">
              <div className="setting-row__text">
                <strong>
                  <Clipboard size={15} aria-hidden /> Очистка буфера
                </strong>
                <span>Через сколько секунд стирать скопированный пароль.</span>
              </div>
              <Select
                value={settings.clipboardClearSeconds}
                onChange={(event) =>
                  setSetting('clipboardClearSeconds', Number(event.target.value))
                }
                aria-label="Очистка буфера обмена"
              >
                {CLIPBOARD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="setting-row">
              <div className="setting-row__text">
                <strong>
                  <ShieldAlert size={15} aria-hidden /> Срок жизни пароля
                </strong>
                <span>После этого срока пароль помечается как устаревший.</span>
              </div>
              <Select
                value={settings.oldPasswordDays}
                onChange={(event) => setSetting('oldPasswordDays', Number(event.target.value))}
                aria-label="Срок жизни пароля"
              >
                {OLD_PASSWORD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="settings-actions">
            <Button
              variant="secondary"
              icon={<KeyRound size={15} />}
              onClick={() => setChangeMasterOpen(true)}
            >
              Сменить мастер-пароль
            </Button>
            <Button variant="ghost" icon={<Lock size={15} />} onClick={() => void lockNow()}>
              Заблокировать сейчас
            </Button>
          </div>

          <p className="security-note">
            <ShieldCheck size={14} aria-hidden />
            AES-256-GCM · PBKDF2 SHA-256, {PBKDF2_ITERATIONS.toLocaleString('ru-RU')}{' '}
            итераций. Ключ живёт только в памяти вкладки.
          </p>
        </section>

        <section className="card">
          <header className="card__head">
            <div>
              <h2>Интерфейс</h2>
              <p>Тема оформления</p>
            </div>
            <Sun size={18} aria-hidden />
          </header>

          <div className="theme-picker">
            {THEMES.map((theme) => {
              const Icon = theme.icon
              return (
                <button
                  key={theme.value}
                  type="button"
                  className={cx('theme-option', settings.theme === theme.value && 'is-active')}
                  onClick={() => setSetting('theme', theme.value)}
                  aria-pressed={settings.theme === theme.value}
                >
                  <Icon size={18} aria-hidden />
                  <span>{theme.label}</span>
                  {settings.theme === theme.value && <Check size={14} aria-hidden />}
                </button>
              )
            })}
          </div>

          <div className="appearance-note">
            <p>
              Системная тема подстраивается под настройки Windows. Смена темы не влияет на
              шифрование.
            </p>
            <button type="button" className="link-btn" onClick={() => navigate('/notes')}>
              Перейти к заметкам
            </button>
          </div>
        </section>

        <section className="card settings-card--wide">
          <header className="card__head">
            <div>
              <h2>Резервные копии и данные</h2>
              <p>Автобэкап, экспорт и импорт</p>
            </div>
            <HardDrive size={18} aria-hidden />
          </header>

          <div className={cx('backup-panel', backupState.enabled && 'is-on')}>
            <div className="backup-panel__icon">
              <HardDrive size={22} aria-hidden />
            </div>
            <div className="backup-panel__text">
              <strong>
                {backupState.enabled
                  ? 'Автобэкап включён'
                  : backupState.needsPermission
                    ? 'Нужно разрешение на файл'
                    : 'Автобэкап выключен'}
              </strong>
              <p>
                {backupState.enabled
                  ? `${backupState.fileName ?? 'Файл на диске'} · ${backupState.lastAt ? `обновлён ${formatRelative(backupState.lastAt)}` : 'ожидает первой записи'}`
                  : backupState.supported
                    ? 'Выберите файл на диске — копия будет обновляться при каждом изменении.'
                    : 'Браузер не поддерживает File System Access. Используйте ручной экспорт.'}
              </p>
              {backupState.error && <span className="backup-panel__error">{backupState.error}</span>}
            </div>
            <div className="backup-panel__actions">
              {backupState.enabled ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    onClick={() => void resumeBackup()}
                    disabled={backupState.busy}
                  >
                    Обновить файл
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<X size={14} />}
                    onClick={() => void disconnectBackup()}
                  >
                    Отключить
                  </Button>
                </>
              ) : backupState.needsPermission ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  onClick={() => void resumeBackup()}
                  disabled={backupState.busy}
                >
                  Разрешить
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<HardDrive size={14} />}
                  onClick={() => void connectBackup()}
                  disabled={!backupState.supported || backupState.busy}
                >
                  Подключить файл
                </Button>
              )}
            </div>
          </div>

          <div className="settings-subhead">
            <h3>Экспорт</h3>
            <p>Для переноса или дополнительной копии</p>
          </div>
          <div className="settings-button-grid">
            <Button variant="secondary" icon={<FileJson size={15} />} onClick={() => void exportEncrypted()}>
              Шифрованный JSON
            </Button>
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportPlain()}>
              Открытый JSON
            </Button>
            <Button variant="secondary" icon={<FileSpreadsheet size={15} />} onClick={exportCsv}>
              CSV с паролями
            </Button>
            <Button variant="secondary" icon={<FileText size={15} />} onClick={exportNotes}>
              Заметки в Markdown
            </Button>
          </div>

          <div className="settings-subhead">
            <h3>Импорт</h3>
            <p>Заменяет текущее содержимое хранилища</p>
          </div>
          <div className="settings-button-grid">
            <Button variant="secondary" icon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
              Импорт бэкапа
            </Button>
            {state.hasLegacy && (
              <Button variant="secondary" icon={<History size={15} />} onClick={() => setLegacyOpen(true)}>
                Из первой версии
              </Button>
            )}
          </div>

          {settings.lastBackupAt && (
            <p className="muted small">
              Последний ручной экспорт: {formatDateTime(settings.lastBackupAt)}
            </p>
          )}
        </section>

        <section className="card">
          <header className="card__head">
            <div>
              <h2>О приложении</h2>
              <p>Локальный менеджер паролей и заметок</p>
            </div>
            <Info size={18} aria-hidden />
          </header>

          <div className="about-grid">
            <div>
              <span>Версия</span>
              <strong>{APP_VERSION}</strong>
            </div>
            <div>
              <span>Хранилище</span>
              <strong>IndexedDB</strong>
            </div>
            <div>
              <span>Шифрование</span>
              <strong>AES-256-GCM</strong>
            </div>
            <div>
              <span>Ключ</span>
              <strong>PBKDF2 · 600k</strong>
            </div>
          </div>

          <div className="hotkeys">
            <div>
              <Keyboard size={15} aria-hidden />
              <span>Быстрый поиск</span>
              <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
            </div>
            <div>
              <Lock size={15} aria-hidden />
              <span>Закрыть модальное окно</span>
              <Kbd>Esc</Kbd>
            </div>
          </div>

          <p className="about-note">
            <Database size={14} aria-hidden />
            База хранится в IndexedDB этого браузера и привязана к адресу приложения.
            Открывайте его по одному и тому же адресу.
          </p>
        </section>

        <section className="card card--danger">
          <header className="card__head">
            <div>
              <h2>Опасная зона</h2>
              <p>Необратимые действия</p>
            </div>
            <ShieldAlert size={18} aria-hidden />
          </header>
          <p className="muted">
            Удаление стирает зашифрованную базу из этого браузера. Перед этим убедитесь, что
            у вас есть резервная копия.
          </p>
          <div className="settings-actions">
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => void exportEncrypted()}>
              Сначала сделать бэкап
            </Button>
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => void wipeVault()}>
              Удалить хранилище
            </Button>
          </div>
        </section>
      </div>

      <ChangeMasterModal
        open={changeMasterOpen}
        onClose={() => setChangeMasterOpen(false)}
      />
      <ImportBackupModal open={importOpen} onClose={() => setImportOpen(false)} mode="replace" />
      <LegacyMigrationModal
        open={legacyOpen}
        onClose={() => setLegacyOpen(false)}
        mode="replace"
      />
    </div>
  )
}

function ChangeMasterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirmValue('')
    setError('')
    setBusy(false)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (next.length < 5) {
      setError('Новый пароль должен быть не короче 5 символов.')
      return
    }
    if (next !== confirmValue) {
      setError('Новые пароли не совпадают.')
      return
    }

    setBusy(true)
    try {
      await session.changeMasterPassword(current, next)
      toast.push('Мастер-пароль изменён')
      reset()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось изменить пароль')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Смена мастер-пароля"
      subtitle="Данные будут перешифрованы новым ключом"
      icon={<KeyRound size={20} />}
      size="sm"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" form="change-master-form" variant="primary" loading={busy}>
            Сменить пароль
          </Button>
        </div>
      }
    >
      <form id="change-master-form" className="form-stack" onSubmit={(event) => void submit(event)}>
        <Field label="Текущий мастер-пароль" required>
          <TextInput
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            data-autofocus
          />
        </Field>

        <Field label="Новый мастер-пароль" hint="Минимум 5 символов" required>
          <TextInput
            type="password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {next && <StrengthMeter password={next} />}

        <Field label="Повторите новый пароль" required>
          <TextInput
            type="password"
            value={confirmValue}
            onChange={(event) => setConfirmValue(event.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <p className="notice notice--warning">
          Старые резервные копии останутся зашифрованными прежним паролем. Новые копии будут
          использовать новый.
        </p>

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}
