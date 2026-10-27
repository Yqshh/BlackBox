import { useEffect, useState, type FormEvent } from 'react'
import {
  Check,
  Folder,
  KeyRound,
  Laptop,
  Lock,
  NotebookPen,
  Package,
  Plus,
  Server,
  Shield,
  Terminal,
  Trash2,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  ACCENTS,
  ACCENT_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_ICONS,
  ASSET_TYPE_LABELS,
  CATEGORY_LABELS,
  type Account,
  type Accent,
  type Asset,
  type AssetType,
  type AssetVisibility,
  type Category,
  type CustomField,
  type Group,
} from '../../core/types'
import { DEFAULT_VISIBILITY } from '../../core/defaults'
import { generatePassword, DEFAULT_PASSWORD_OPTIONS } from '../../core/password'
import { base32Decode, normalizeTotpSecret } from '../../core/totp'
import { formatDateTime, pluralRu } from '../../core/format'
import type { AssetInput, GroupInput } from './vaultActions'
import { createAccount, createAsset, createGroup, updateAccount, updateAsset, updateGroup } from './vaultActions'
import { Button, Checkbox, Field, Select, TextArea, TextInput } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { StrengthMeter } from '../../ui/StrengthMeter'
import { useCopy } from '../../hooks/useCopy'
import { useToast } from '../../ui/Toast'
import { cx } from '../../ui/cx'

const ASSET_ICONS: Record<AssetType, LucideIcon> = {
  rdp: Laptop,
  '1c': Package,
  vpn: Shield,
  web: Lock,
  db: Server,
  ssh: Terminal,
  note: NotebookPen,
}

export function GroupModal({
  open,
  group,
  defaultCategory,
  onClose,
}: {
  open: boolean
  group: Group | null
  defaultCategory: Category
  onClose: () => void
}) {
  const toast = useToast()
  const [category, setCategory] = useState<Category>(defaultCategory)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<Accent>('sky')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCategory(group?.category ?? defaultCategory)
    setName(group?.name ?? '')
    setDescription(group?.description ?? '')
    setColor(group?.color ?? (defaultCategory === 'work' ? 'sky' : 'emerald'))
    setError('')
  }, [open, group, defaultCategory])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Введите название раздела.')
      return
    }

    const input: GroupInput = { category, name, description, color }
    if (group) {
      updateGroup(group.id, input)
      toast.push('Раздел обновлён')
    } else {
      createGroup(input)
      toast.push('Раздел создан')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? 'Редактирование раздела' : 'Новый раздел'}
      subtitle="Разделы помогают разделить работу, проекты и личные доступы"
      icon={<Folder size={20} />}
      size="md"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="group-form" variant="primary">
            {group ? 'Сохранить' : 'Создать раздел'}
          </Button>
        </div>
      }
    >
      <form id="group-form" className="form-stack" onSubmit={submit}>
        <Field label="Категория">
          <div className="segmented segmented--full">
            {(['work', 'personal'] as Category[]).map((value) => (
              <button
                key={value}
                type="button"
                className={cx('segmented__item', category === value && 'is-active')}
                onClick={() => setCategory(value)}
                aria-pressed={category === value}
              >
                {CATEGORY_LABELS[value]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Название" required>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, «Инфраструктура» или «Клиенты»"
            maxLength={80}
            data-autofocus
          />
        </Field>

        <Field label="Описание" hint="Необязательно. Поможет вспомнить, что лежит внутри.">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Коротко о разделе"
          />
        </Field>

        <Field label="Цвет">
          <div className="color-picker">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                className={cx('color-swatch', `color-swatch--${accent}`, color === accent && 'is-active')}
                onClick={() => setColor(accent)}
                aria-label={ACCENT_LABELS[accent]}
                aria-pressed={color === accent}
                title={ACCENT_LABELS[accent]}
              >
                {color === accent && <Check size={13} aria-hidden />}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}

interface AssetFormState {
  type: AssetType
  name: string
  titleNote: string
  hosts: string[]
  customFields: CustomField[]
  oneC: { dbName: string; server: string; mode: string }
  vpn: { protocol: string; server: string }
  webUrl: string
  notes: string
  visibility: AssetVisibility
}

function emptyAsset(type: AssetType = 'web'): AssetFormState {
  return {
    type,
    name: '',
    titleNote: '',
    hosts: [''],
    customFields: [],
    oneC: { dbName: '', server: '', mode: 'Серверный (клиент-сервер)' },
    vpn: { protocol: '', server: '' },
    webUrl: '',
    notes: '',
    visibility: { ...DEFAULT_VISIBILITY },
  }
}

export function AssetModal({
  open,
  group,
  asset,
  onClose,
}: {
  open: boolean
  group: Group
  asset: Asset | null
  onClose: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<AssetFormState>(() => emptyAsset())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (asset) {
      setForm({
        type: asset.type,
        name: asset.name,
        titleNote: asset.titleNote,
        hosts: asset.hosts.length > 0 ? [...asset.hosts] : [''],
        customFields: asset.customFields.map((field) => ({ ...field })),
        oneC: { ...asset.oneC },
        vpn: { ...asset.vpn },
        webUrl: asset.webUrl,
        notes: asset.notes,
        visibility: { ...asset.visibility },
      })
    } else {
      setForm(emptyAsset())
    }
    setError('')
  }, [open, asset])

  const patch = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const patchVisibility = (key: keyof AssetVisibility, value: boolean) => {
    setForm((current) => ({
      ...current,
      visibility: { ...current.visibility, [key]: value },
    }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Введите название ресурса.')
      return
    }

    const input: AssetInput = {
      type: form.type,
      name: form.name,
      titleNote: form.titleNote,
      hosts: form.hosts,
      customFields: form.customFields,
      oneC: form.oneC,
      vpn: form.vpn,
      webUrl: form.webUrl,
      notes: form.notes,
      visibility: form.visibility,
    }

    if (asset) {
      updateAsset(group.id, asset.id, input)
      toast.push('Ресурс обновлён')
    } else {
      createAsset(group.id, input)
      toast.push('Ресурс добавлен')
    }
    onClose()
  }

  const Icon = ASSET_ICONS[form.type]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={asset ? 'Редактирование ресурса' : 'Новый ресурс'}
      subtitle={`Раздел «${group.name}»`}
      icon={<Icon size={20} />}
      size="xl"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="asset-form" variant="primary">
            {asset ? 'Сохранить' : 'Добавить ресурс'}
          </Button>
        </div>
      }
    >
      <form id="asset-form" className="form-stack" onSubmit={submit}>
        <div className="form-grid form-grid--2">
          <Field label="Тип ресурса" required>
            <Select
              value={form.type}
              onChange={(event) => patch('type', event.target.value as AssetType)}
              data-autofocus
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_ICONS[type]} {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Название" required>
            <TextInput
              value={form.name}
              onChange={(event) => patch('name', event.target.value)}
              placeholder="Например, «Продовый сервер» или «Личный кабинет»"
              maxLength={120}
            />
          </Field>
        </div>

        <Field
          label="Короткая пометка"
          hint="Бейдж рядом с названием: «прод», «через VPN», «не трогать»."
        >
          <TextInput
            value={form.titleNote}
            onChange={(event) => patch('titleNote', event.target.value)}
            maxLength={40}
            placeholder="Необязательно"
          />
        </Field>

        <section className="form-section">
          <div className="form-section__head">
            <h3>Адреса и хосты</h3>
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => patch('hosts', [...form.hosts, ''])}
            >
              Добавить
            </Button>
          </div>
          <div className="form-stack form-stack--tight">
            {form.hosts.map((host, index) => (
              <div className="repeat-row" key={index}>
                <TextInput
                  value={host}
                  onChange={(event) => {
                    const next = [...form.hosts]
                    next[index] = event.target.value
                    patch('hosts', next)
                  }}
                  placeholder="10.0.0.5, server.local, https://…"
                  className="mono"
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => patch('hosts', form.hosts.filter((_, i) => i !== index))}
                  aria-label="Удалить адрес"
                  disabled={form.hosts.length === 1}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {form.type === '1c' && (
          <section className="form-section">
            <div className="form-section__head">
              <h3>Параметры базы 1С</h3>
            </div>
            <div className="form-grid form-grid--3">
              <Field label="Имя базы">
                <TextInput
                  value={form.oneC.dbName}
                  onChange={(event) =>
                    patch('oneC', { ...form.oneC, dbName: event.target.value })
                  }
                  placeholder="bu_hr"
                  className="mono"
                />
              </Field>
              <Field label="Сервер / кластер">
                <TextInput
                  value={form.oneC.server}
                  onChange={(event) =>
                    patch('oneC', { ...form.oneC, server: event.target.value })
                  }
                  placeholder="srv-1c:1541"
                  className="mono"
                />
              </Field>
              <Field label="Режим">
                <Select
                  value={form.oneC.mode}
                  onChange={(event) =>
                    patch('oneC', { ...form.oneC, mode: event.target.value })
                  }
                >
                  <option value="Серверный (клиент-сервер)">Серверный</option>
                  <option value="Файловый">Файловый</option>
                </Select>
              </Field>
            </div>
          </section>
        )}

        {form.type === 'vpn' && (
          <section className="form-section">
            <div className="form-section__head">
              <h3>Параметры VPN</h3>
            </div>
            <div className="form-grid form-grid--2">
              <Field label="Протокол">
                <TextInput
                  value={form.vpn.protocol}
                  onChange={(event) =>
                    patch('vpn', { ...form.vpn, protocol: event.target.value })
                  }
                  placeholder="WireGuard / OpenVPN / IPSec"
                />
              </Field>
              <Field label="Сервер / конфиг">
                <TextInput
                  value={form.vpn.server}
                  onChange={(event) =>
                    patch('vpn', { ...form.vpn, server: event.target.value })
                  }
                  placeholder="vpn.example.com"
                  className="mono"
                />
              </Field>
            </div>
          </section>
        )}

        {form.type === 'web' && (
          <section className="form-section">
            <div className="form-section__head">
              <h3>Веб-ссылка</h3>
            </div>
            <Field label="URL">
              <TextInput
                value={form.webUrl}
                onChange={(event) => patch('webUrl', event.target.value)}
                placeholder="https://example.com"
                className="mono"
                inputMode="url"
              />
            </Field>
          </section>
        )}

        <section className="form-section">
          <div className="form-section__head">
            <h3>Произвольные поля</h3>
            <Button
              variant="ghost"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() =>
                patch('customFields', [...form.customFields, { key: '', value: '' }])
              }
            >
              Добавить поле
            </Button>
          </div>
          {form.customFields.length === 0 ? (
            <p className="muted small">
              Например: «Порт», «VLAN», «Контакт администратора» — любая пара ключ-значение.
            </p>
          ) : (
            <div className="form-stack form-stack--tight">
              {form.customFields.map((field, index) => (
                <div className="repeat-row repeat-row--field" key={index}>
                  <TextInput
                    value={field.key}
                    onChange={(event) => {
                      const next = [...form.customFields]
                      next[index] = { ...next[index]!, key: event.target.value }
                      patch('customFields', next)
                    }}
                    placeholder="Ключ"
                  />
                  <TextInput
                    value={field.value}
                    onChange={(event) => {
                      const next = [...form.customFields]
                      next[index] = { ...next[index]!, value: event.target.value }
                      patch('customFields', next)
                    }}
                    placeholder="Значение"
                    className="mono"
                  />
                  <button
                    type="button"
                    className="icon-btn icon-btn--sm"
                    onClick={() =>
                      patch(
                        'customFields',
                        form.customFields.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Удалить поле"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <Field label="Общие заметки" hint="Видно в карточке ресурса.">
          <TextArea
            value={form.notes}
            onChange={(event) => patch('notes', event.target.value)}
            rows={3}
            placeholder="Что важно помнить об этом ресурсе"
          />
        </Field>

        <section className="form-section">
          <div className="form-section__head">
            <h3>Что показывать в карточке</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                patch('visibility', {
                  hosts: true,
                  oneC: true,
                  vpn: true,
                  webUrl: true,
                  customFields: true,
                  notes: true,
                  titleNote: true,
                })
              }
            >
              Показать всё
            </button>
          </div>
          <div className="form-grid form-grid--3">
            <Checkbox
              label="Адреса"
              checked={form.visibility.hosts}
              onChange={(event) => patchVisibility('hosts', event.target.checked)}
            />
            <Checkbox
              label="Параметры 1С"
              checked={form.visibility.oneC}
              onChange={(event) => patchVisibility('oneC', event.target.checked)}
            />
            <Checkbox
              label="Параметры VPN"
              checked={form.visibility.vpn}
              onChange={(event) => patchVisibility('vpn', event.target.checked)}
            />
            <Checkbox
              label="URL"
              checked={form.visibility.webUrl}
              onChange={(event) => patchVisibility('webUrl', event.target.checked)}
            />
            <Checkbox
              label="Произвольные поля"
              checked={form.visibility.customFields}
              onChange={(event) => patchVisibility('customFields', event.target.checked)}
            />
            <Checkbox
              label="Заметки"
              checked={form.visibility.notes}
              onChange={(event) => patchVisibility('notes', event.target.checked)}
            />
            <Checkbox
              label="Короткая пометка"
              checked={form.visibility.titleNote}
              onChange={(event) => patchVisibility('titleNote', event.target.checked)}
            />
          </div>
        </section>

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}

interface AccountFormState {
  login: string
  password: string
  role: string
  note: string
  totpSecret: string
}

export function AccountModal({
  open,
  group,
  asset,
  account,
  onClose,
}: {
  open: boolean
  group: Group
  asset: Asset
  account: Account | null
  onClose: () => void
}) {
  const toast = useToast()
  const copy = useCopy()
  const [form, setForm] = useState<AccountFormState>({
    login: '',
    password: '',
    role: '',
    note: '',
    totpSecret: '',
  })
  const [allHosts, setAllHosts] = useState(true)
  const [selectedHosts, setSelectedHosts] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm({
      login: account?.login ?? '',
      password: account?.password ?? '',
      role: account?.role ?? '',
      note: account?.note ?? '',
      totpSecret: account?.totpSecret ?? '',
    })
    const current = account?.targetHosts ?? 'all'
    setAllHosts(current === 'all')
    setSelectedHosts(Array.isArray(current) ? [...current] : [])
    setShowPassword(false)
    setError('')
  }, [open, account])

  const patch = <K extends keyof AccountFormState>(key: K, value: AccountFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const generate = () => {
    patch('password', generatePassword(DEFAULT_PASSWORD_OPTIONS))
    setShowPassword(true)
    toast.push('Пароль сгенерирован')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()

    if (!form.login.trim()) {
      setError('Введите логин.')
      return
    }
    if (!form.password) {
      setError('Введите пароль.')
      return
    }

    const secret = normalizeTotpSecret(form.totpSecret)
    if (secret && base32Decode(secret).length === 0) {
      setError('TOTP-секрет должен быть в base32.')
      return
    }

    const input = {
      login: form.login,
      password: form.password,
      role: form.role,
      note: form.note,
      totpSecret: secret,
      targetHosts: allHosts
        ? ('all' as const)
        : selectedHosts.filter((host) => asset.hosts.includes(host)),
    }

    if (account) {
      updateAccount(group.id, asset.id, account.id, input)
      toast.push('Учётная запись обновлена')
    } else {
      createAccount(group.id, asset.id, input)
      toast.push('Учётная запись добавлена')
    }
    onClose()
  }

  const historyCount = account?.passwordHistory.length ?? 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Редактирование доступа' : 'Новый доступ'}
      subtitle={`${asset.name} · ${group.name}`}
      icon={<KeyRound size={20} />}
      size="lg"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="account-form" variant="primary">
            {account ? 'Сохранить' : 'Добавить доступ'}
          </Button>
        </div>
      }
    >
      <form id="account-form" className="form-stack" onSubmit={submit}>
        <div className="form-grid form-grid--2">
          <Field label="Логин" required>
            <TextInput
              value={form.login}
              onChange={(event) => patch('login', event.target.value)}
              className="mono"
              autoComplete="off"
              data-autofocus
              placeholder="admin"
            />
          </Field>
          <Field label="Роль" hint="Например: администратор, бухгалтер, только чтение.">
            <TextInput
              value={form.role}
              onChange={(event) => patch('role', event.target.value)}
              placeholder="Необязательно"
            />
          </Field>
        </div>

        <Field label="Пароль" required>
          <div className="input-with-action">
            <TextInput
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => patch('password', event.target.value)}
              className="mono"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? 'Скрыть' : 'Показать'}
            </button>
          </div>
        </Field>

        <div className="account-secret-actions">
          <Button variant="secondary" size="sm" icon={<Wand2 size={14} />} onClick={generate}>
            Сгенерировать надёжный
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void copy(form.password, 'Пароль', true)}
            disabled={!form.password}
          >
            Копировать
          </Button>
        </div>

        {form.password && <StrengthMeter password={form.password} />}

        <section className="form-section">
          <div className="form-section__head">
            <h3>Привязка к адресам</h3>
          </div>
          {asset.hosts.length === 0 ? (
            <p className="muted small">
              У ресурса нет адресов, поэтому учётная запись действует для всего ресурса.
            </p>
          ) : (
            <div className="host-bind">
              <Checkbox
                label="Все адреса ресурса"
                checked={allHosts}
                onChange={(event) => setAllHosts(event.target.checked)}
              />
              <div className={cx('host-bind__list', allHosts && 'is-disabled')}>
                {asset.hosts.map((host) => (
                  <Checkbox
                    key={host}
                    label={<span className="mono">{host}</span>}
                    checked={selectedHosts.includes(host)}
                    disabled={allHosts}
                    onChange={(event) => {
                      setSelectedHosts((current) =>
                        event.target.checked
                          ? [...current, host]
                          : current.filter((item) => item !== host),
                      )
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <h3>Двухфакторная аутентификация</h3>
          </div>
          <Field
            label="TOTP-секрет"
            hint="Base32 из приложения-аутентификатора. Можно вставить otpauth://-ссылку."
          >
            <TextInput
              value={form.totpSecret}
              onChange={(event) => patch('totpSecret', event.target.value)}
              className="mono"
              placeholder="JBSWY3DPEHPK3PXP"
              autoComplete="off"
            />
          </Field>
        </section>

        <Field label="Примечание" hint="Например: «только через VPN», «срок действия 30 дней».">
          <TextArea
            value={form.note}
            onChange={(event) => patch('note', event.target.value)}
            rows={2}
          />
        </Field>

        {account && historyCount > 0 && (
          <p className="notice notice--info">
            В истории сохранено {historyCount}{' '}
            {pluralRu(historyCount, 'предыдущий пароль', 'предыдущих пароля', 'предыдущих паролей')}.
            Она доступна из строки учётной записи.
          </p>
        )}

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}

export function PasswordHistoryModal({
  open,
  account,
  onClose,
}: {
  open: boolean
  account: Account | null
  onClose: () => void
}) {
  const copy = useCopy()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="История паролей"
      subtitle={account ? `Предыдущие пароли · ${account.login}` : undefined}
      icon={<KeyRound size={20} />}
      size="sm"
    >
      {!account || account.passwordHistory.length === 0 ? (
        <p className="muted">История пуста. Она появится после первой смены пароля.</p>
      ) : (
        <div className="history-list">
          <p className="muted small">Текущий пароль здесь не показывается.</p>
          {account.passwordHistory.map((entry, index) => (
            <div className="history-row" key={`${entry.changedAt}-${index}`}>
              <div>
                <code>{entry.password}</code>
                <span>{formatDateTime(entry.changedAt)}</span>
              </div>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => void copy(entry.password, 'Старый пароль', true)}
                aria-label="Скопировать старый пароль"
              >
                <KeyRound size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
