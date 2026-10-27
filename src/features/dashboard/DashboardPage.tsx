import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FolderPlus,
  HardDrive,
  KeyRound,
  ListTodo,
  NotebookPen,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Star,
  Wand2,
} from 'lucide-react'
import { useSession } from '../../hooks/useSession'
import { useBackup } from '../../hooks/useBackup'
import {
  formatCount,
  formatRelative,
  greetingForHour,
  pluralNotes,
  stripMarkdown,
  todayLong,
  truncate,
} from '../../core/format'
import { isWeakPassword } from '../../core/strength'
import {
  type AccountRef,
  healthLabel,
  healthTone,
  oldAccounts,
  reusedAccounts,
  vaultHealth,
  weakAccounts,
} from '../vault/vaultStats'
import { createNote } from '../notes/notesActions'
import { toggleTask } from '../tasks/tasksActions'
import { dueLabel, isOverdue, sortTasks, startOfDay, taskStats } from '../tasks/taskUtils'
import { Button } from '../../ui/Controls'
import { PageHeader, Stat } from '../../ui/Layout'
import { PasswordGeneratorModal } from '../generator/PasswordGenerator'
import { cx } from '../../ui/cx'

export function DashboardPage() {
  const state = useSession()
  const backup = useBackup()
  const data = state.data
  const navigate = useNavigate()
  const [generatorOpen, setGeneratorOpen] = useState(false)

  const health = useMemo(() => (data ? vaultHealth(data) : null), [data])

  const attention = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { ref: AccountRef; reasons: Set<string> }>()
    const add = (ref: AccountRef, reason: string) => {
      const existing = map.get(ref.account.id) ?? { ref, reasons: new Set<string>() }
      existing.reasons.add(reason)
      map.set(ref.account.id, existing)
    }

    for (const ref of weakAccounts(data)) add(ref, 'слабый')
    for (const ref of oldAccounts(data)) add(ref, 'старый')
    for (const ref of reusedAccounts(data)) add(ref, 'повторяется')

    return [...map.values()].slice(0, 5)
  }, [data])

  const recentNotes = useMemo(() => {
    if (!data) return []
    return [...data.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4)
  }, [data])

  const pinnedAssets = useMemo(() => {
    if (!data) return []
    return data.groups
      .flatMap((group) =>
        group.assets.filter((asset) => asset.pinned).map((asset) => ({ group, asset })),
      )
      .slice(0, 4)
  }, [data])

  const tasksSummary = useMemo(() => taskStats(data?.tasks ?? []), [data])

  const todayTasks = useMemo(() => {
    if (!data) return []
    const today = startOfDay()
    return data.tasks
      .filter((task) => !task.done && task.dueAt !== null && task.dueAt <= today)
      .sort(sortTasks)
      .slice(0, 4)
  }, [data])

  const pinnedNotes = useMemo(
    () => (data ? data.notes.filter((note) => note.pinned).slice(0, 4) : []),
    [data],
  )

  if (!data || !health) return null

  const showOnboarding = health.groups === 0 && health.notes <= 1
  const tone = healthTone(health.score)
  const backupText = backup.enabled
    ? backup.lastAt
      ? `Последняя запись ${formatRelative(backup.lastAt)}`
      : 'Файл подключён'
    : 'Резервная копия не настроена'

  const openAccount = (ref: AccountRef) => {
    navigate(
      `/vault?group=${ref.group.id}&asset=${ref.asset.id}&account=${ref.account.id}`,
    )
  }

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow={todayLong()}
        title={greetingForHour()}
        description="Коротко о том, что происходит в вашем локальном хранилище."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Wand2 size={16} />}
              onClick={() => setGeneratorOpen(true)}
            >
              Генератор
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                const id = createNote()
                navigate(`/notes/${id}`)
              }}
            >
              Новая заметка
            </Button>
          </>
        }
      />

      <div className="dashboard-stats">
        <Stat
          label="Учётные записи"
          value={health.accounts}
          hint={formatCount(health.groups, 'раздел', 'раздела', 'разделов')}
          icon={<KeyRound size={20} />}
          tone="sky"
          onClick={() => navigate('/vault')}
        />
        <Stat
          label="Заметки"
          value={health.notes}
          hint={formatCount(data.notebooks.length, 'блокнот', 'блокнота', 'блокнотов')}
          icon={<NotebookPen size={20} />}
          tone="violet"
          onClick={() => navigate('/notes')}
        />
        <Stat
          label="Задачи"
          value={tasksSummary.active}
          hint={
            tasksSummary.today + tasksSummary.overdue > 0
              ? `${tasksSummary.today + tasksSummary.overdue} на сегодня`
              : 'на сегодня свободно'
          }
          icon={<ListTodo size={20} />}
          tone="amber"
          onClick={() => navigate('/tasks')}
        />
        <Stat
          label="Безопасность"
          value={`${health.score}%`}
          hint={healthLabel(health.score)}
          icon={health.score >= 70 ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          tone={tone}
          onClick={() => navigate('/vault')}
        />
      </div>

      {tasksSummary.total > 0 && (
        <section className="today-strip card">
          <header className="today-strip__head">
            <div>
              <span className="pill">
                <CalendarDays size={13} aria-hidden />
                Сегодня
              </span>
              <h2>Задачи на сегодня</h2>
              <p>
                {todayTasks.length > 0
                  ? 'Срок подошёл или уже прошёл — проверьте, всё ли под контролем.'
                  : 'На сегодня задач нет. Можно заглянуть в календарь и спланировать день.'}
              </p>
            </div>
            <button type="button" className="link-btn" onClick={() => navigate('/tasks')}>
              Все задачи <ArrowRight size={14} aria-hidden />
            </button>
          </header>

          <div className="today-strip__list">
            {todayTasks.length === 0 ? (
              <button
                type="button"
                className="today-strip__empty"
                onClick={() => navigate('/tasks?new=1')}
              >
                <Plus size={15} aria-hidden />
                Добавить задачу на сегодня
              </button>
            ) : (
              todayTasks.map((task) => (
                <div
                  className={cx('today-task', isOverdue(task) && 'is-overdue')}
                  key={task.id}
                >
                  <button
                    type="button"
                    className="task-check"
                    onClick={() => toggleTask(task.id)}
                    aria-label={`Отметить «${task.title}» выполненной`}
                    aria-pressed={task.done}
                  >
                    {task.done && <Check size={13} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    className="today-task__body"
                    onClick={() => navigate(`/tasks?task=${task.id}`)}
                  >
                    <span className="today-task__title">{task.title}</span>
                    <span className="today-task__meta">
                      {isOverdue(task) ? 'Просрочено' : dueLabel(task.dueAt)}
                      {task.priority === 'high' && ' · высокий приоритет'}
                    </span>
                  </button>
                  <ArrowRight size={14} aria-hidden />
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {showOnboarding && (
        <section className="onboarding card">
          <div className="onboarding__head">
            <span className="pill">
              <Star size={13} aria-hidden />
              Первый запуск
            </span>
            <h2>Три шага, чтобы всё завести</h2>
            <p>Хранилище пустое — это нормально. Начните с любого шага.</p>
          </div>
          <div className="onboarding__steps">
            <button
              type="button"
              className="onboarding-step"
              onClick={() => navigate('/vault?new=group')}
            >
              <span>01</span>
              <strong>Создайте раздел</strong>
              <small>Например, «Работа» или «Серверы»</small>
              <ArrowRight size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="onboarding-step"
              onClick={() => {
                const id = createNote()
                navigate(`/notes/${id}`)
              }}
            >
              <span>02</span>
              <strong>Запишите заметку</strong>
              <small>Идеи, инструкции, важные мелочи</small>
              <ArrowRight size={16} aria-hidden />
            </button>
            <button
              type="button"
              className="onboarding-step"
              onClick={() => navigate('/settings')}
            >
              <span>03</span>
              <strong>Подключите бэкап</strong>
              <small>Шифрованная копия на диск</small>
              <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </section>
      )}

      <div className="dashboard-grid">
        <section className="card security-card">
          <header className="card__head">
            <div>
              <h2>Требует внимания</h2>
              <p>Слабые, старые и повторяющиеся пароли</p>
            </div>
            <span className={cx('badge', `badge--${tone}`)}>{healthLabel(health.score)}</span>
          </header>

          <div className="security-summary">
            <div
              className={cx('security-ring', `security-ring--${tone}`)}
              style={{ '--score': health.score } as CSSProperties}
              role="img"
              aria-label={`Оценка безопасности ${health.score} из 100`}
            >
              <div className="security-ring__inner">
                <strong>{health.score}</strong>
                <span>из 100</span>
              </div>
            </div>

            <div className="security-counts">
              <div>
                <span className="security-counts__value">{health.weak}</span>
                <span className="security-counts__label">слабых</span>
              </div>
              <div>
                <span className="security-counts__value">{health.old}</span>
                <span className="security-counts__label">старше {data.settings.oldPasswordDays} дн.</span>
              </div>
              <div>
                <span className="security-counts__value">{health.reused}</span>
                <span className="security-counts__label">повторяются</span>
              </div>
            </div>
          </div>

          {attention.length === 0 ? (
            <div className="security-ok">
              <CheckCircle2 size={18} aria-hidden />
              <div>
                <strong>Всё в порядке</strong>
                <span>Слабых, старых и повторяющихся паролей не найдено.</span>
              </div>
            </div>
          ) : (
            <ul className="attention-list">
              {attention.map(({ ref, reasons }) => (
                <li key={ref.account.id}>
                  <button type="button" onClick={() => openAccount(ref)}>
                    <span className="attention-list__icon">
                      {isWeakPassword(ref.account.password) ? (
                        <AlertTriangle size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                    </span>
                    <span className="attention-list__text">
                      <strong>{ref.account.login}</strong>
                      <small>
                        {ref.asset.name} · {ref.group.name}
                      </small>
                    </span>
                    <span className="attention-list__reasons">
                      {[...reasons].map((reason) => (
                        <span key={reason} className="badge badge--amber">
                          {reason}
                        </span>
                      ))}
                    </span>
                    <ArrowRight size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="card__link" onClick={() => navigate('/vault')}>
            Перейти в пароли <ArrowRight size={14} aria-hidden />
          </button>
        </section>

        <section className="card">
          <header className="card__head">
            <div>
              <h2>Последние заметки</h2>
              <p>{formatCount(health.notes, 'заметка', 'заметки', 'заметок')} в хранилище</p>
            </div>
            <button type="button" className="link-btn" onClick={() => navigate('/notes')}>
              Все
            </button>
          </header>

          {recentNotes.length === 0 ? (
            <div className="mini-empty">
              <NotebookPen size={22} aria-hidden />
              <p>Заметок пока нет</p>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  const id = createNote()
                  navigate(`/notes/${id}`)
                }}
              >
                Создать
              </Button>
            </div>
          ) : (
            <div className="recent-notes">
              {recentNotes.map((note) => {
                const notebook = data.notebooks.find((item) => item.id === note.notebookId)
                return (
                  <button
                    key={note.id}
                    type="button"
                    className="recent-note"
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <span className="recent-note__dot" data-accent={notebook?.color ?? 'slate'} />
                    <span className="recent-note__body">
                      <strong>{note.title || 'Без названия'}</strong>
                      <small>
                        {truncate(stripMarkdown(note.content), 80) || 'Пустая заметка'}
                      </small>
                    </span>
                    <span className="recent-note__time">{formatRelative(note.updatedAt)}</span>
                  </button>
                )
              })}
            </div>
          )}

          <button type="button" className="card__link" onClick={() => navigate('/notes')}>
            Открыть заметки <ArrowRight size={14} aria-hidden />
          </button>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--bottom">
        <section className="card">
          <header className="card__head">
            <div>
              <h2>Быстрый доступ</h2>
              <p>Закреплённые ресурсы и заметки</p>
            </div>
            <Star size={16} aria-hidden />
          </header>

          {pinnedAssets.length === 0 && pinnedNotes.length === 0 ? (
            <div className="mini-empty">
              <Star size={22} aria-hidden />
              <p>Пока ничего не закреплено</p>
              <span className="muted small">
                Нажмите звёздочку у ресурса или заметки, чтобы они были здесь.
              </span>
            </div>
          ) : (
            <div className="quick-list">
              {pinnedAssets.map(({ group, asset }) => (
                <button
                  key={asset.id}
                  type="button"
                  className="quick-item"
                  onClick={() => navigate(`/vault?group=${group.id}&asset=${asset.id}`)}
                >
                  <span className="quick-item__icon quick-item__icon--asset">
                    <KeyRound size={15} />
                  </span>
                  <span className="quick-item__text">
                    <strong>{asset.name}</strong>
                    <small>
                      {group.name} · {asset.accounts.length} учёт.
                    </small>
                  </span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              ))}
              {pinnedNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="quick-item"
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <span className="quick-item__icon quick-item__icon--note">
                    <NotebookPen size={15} />
                  </span>
                  <span className="quick-item__text">
                    <strong>{note.title || 'Без названия'}</strong>
                    <small>{formatRelative(note.updatedAt)}</small>
                  </span>
                  <ArrowRight size={14} aria-hidden />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <header className="card__head">
            <div>
              <h2>Резервная копия</h2>
              <p>{backupText}</p>
            </div>
            <span className={cx('dot', backup.enabled ? 'dot--green' : 'dot--amber')} />
          </header>

          <div className="backup-summary">
            <div className="backup-summary__icon">
              <HardDrive size={22} aria-hidden />
            </div>
            <div>
              <strong>
                {backup.enabled ? 'Автобэкап включён' : 'Защитите данные'}
              </strong>
              <p>
                {backup.enabled
                  ? `Шифрованная копия записывается в ${backup.fileName ?? 'файл на диске'}.`
                  : 'Подключите файл на диске — копия будет обновляться при каждом изменении.'}
              </p>
            </div>
          </div>

          <div className="backup-actions">
            <Button
              variant={backup.enabled ? 'secondary' : 'primary'}
              icon={<HardDrive size={15} />}
              onClick={() => navigate('/settings')}
            >
              {backup.enabled ? 'Настроить' : 'Подключить бэкап'}
            </Button>
            <Button
              variant="ghost"
              icon={<FolderPlus size={15} />}
              onClick={() => navigate('/vault?new=group')}
            >
              Новый раздел
            </Button>
          </div>

          <div className="security-tip">
            <ShieldCheck size={16} aria-hidden />
            <span>
              Данные шифруются AES-256-GCM и не покидают устройство. Резервная копия тоже
              зашифрована.
            </span>
          </div>
        </section>
      </div>

      <p className="dashboard-footnote">
        <KeyRound size={13} aria-hidden />
        {formatCount(data.groups.length, 'раздел', 'раздела', 'разделов')} ·{' '}
        {formatCount(health.assets, 'ресурс', 'ресурса', 'ресурсов')} ·{' '}
        {pluralNotes(health.notes)}
        <button type="button" className="link-btn" onClick={() => navigate('/settings')}>
          Настроить хранилище
        </button>
      </p>

      <PasswordGeneratorModal open={generatorOpen} onClose={() => setGeneratorOpen(false)} />
    </div>
  )
}
