import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  Search,
  X,
} from 'lucide-react'
import type { Task, TaskPriority } from '../../core/types'
import { TASK_PRIORITY_LABELS } from '../../core/types'
import { formatCount, formatDate } from '../../core/format'
import { useSession } from '../../hooks/useSession'
import { useConfirm } from '../../ui/Confirm'
import { useToast } from '../../ui/Toast'
import { Button, IconButton, Select, TextInput } from '../../ui/Controls'
import { EmptyState, PageHeader } from '../../ui/Layout'
import { cx } from '../../ui/cx'
import { TaskModal } from './TaskModal'
import { TaskRow } from './TaskRow'
import { createTask, deleteTask, toggleTask } from './tasksActions'
import {
  TASK_GROUP_LABELS,
  buildCalendar,
  dateFromKey,
  dateKey,
  groupTasks,
  monthTitle,
  parseDateInput,
  startOfDay,
  taskCountsByDay,
  taskStats,
  tasksForDay,
  type TaskGroupKey,
} from './taskUtils'

export function TasksPage() {
  const state = useSession()
  const data = state.data
  const confirm = useConfirm()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const paramKey = searchParams.toString()

  const today = startOfDay()
  const [viewDate, setViewDate] = useState(() => new Date(today))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDate, setQuickDate] = useState(dateKey(today))
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('normal')
  const [modal, setModal] = useState<{ task: Task | null; date: string | null } | null>(null)

  useEffect(() => {
    if (!data) return

    const taskId = searchParams.get('task')
    if (taskId) {
      const task = data.tasks.find((item) => item.id === taskId) ?? null
      if (task) setModal({ task, date: null })
      const next = new URLSearchParams(searchParams)
      next.delete('task')
      setSearchParams(next, { replace: true })
      return
    }

    if (searchParams.get('new') === '1') {
      setModal({ task: null, date: selectedDate })
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
      return
    }

    const dateParam = searchParams.get('date')
    if (dateParam && dateFromKey(dateParam) !== null) {
      setSelectedDate(dateParam)
      setViewDate(new Date(dateParam + 'T00:00:00'))
      const next = new URLSearchParams(searchParams)
      next.delete('date')
      setSearchParams(next, { replace: true })
    }
    // Реагируем на изменение query-параметров, а не на каждый рендер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey])

  useEffect(() => {
    if (selectedDate) setQuickDate(selectedDate)
  }, [selectedDate])

  const filtered = useMemo(() => {
    if (!data) return []
    const tokens = query.toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean)
    return data.tasks.filter((task) => {
      if (selectedDate) {
        if (task.dueAt === null || dateKey(task.dueAt) !== selectedDate) return false
      } else if (task.done && !showDone) {
        return false
      }

      if (tokens.length === 0) return true
      const text = `${task.title} ${task.description}`.toLocaleLowerCase('ru-RU')
      return tokens.every((token) => text.includes(token))
    })
  }, [data, query, selectedDate, showDone])

  if (!data) return null

  const stats = taskStats(data.tasks)
  const calendarDays = buildCalendar(viewDate)
  const dayCounts = taskCountsByDay(data.tasks)

  const selectedTs = selectedDate ? dateFromKey(selectedDate) : null
  const selectedTasks = selectedTs !== null ? tasksForDay(data.tasks, selectedTs) : []

  const groups = selectedDate ? [] : groupTasks(filtered)
  const doneTasks = filtered.filter((task) => task.done)
  const filteredSelected = selectedDate ? filtered : []

  const createFromQuick = (event: FormEvent) => {
    event.preventDefault()
    if (!quickTitle.trim()) return

    createTask({
      title: quickTitle,
      description: '',
      dueAt: parseDateInput(quickDate),
      priority: quickPriority,
    })
    setQuickTitle('')
    toast.push('Задача добавлена')
  }

  const requestDelete = async (task: Task) => {
    const ok = await confirm({
      title: 'Удалить задачу?',
      message: `«${task.title}» будет удалена.`,
      danger: true,
      confirmLabel: 'Удалить',
    })
    if (!ok) return
    deleteTask(task.id)
    toast.push('Задача удалена')
  }

  const selectDay = (day: (typeof calendarDays)[number]) => {
    const key = dateKey(day.ts)
    if (selectedDate === key) {
      setSelectedDate(null)
      return
    }
    setSelectedDate(key)
    if (!day.inMonth) setViewDate(new Date(day.ts))
  }

  const goToday = () => {
    const now = new Date()
    setViewDate(now)
    setSelectedDate(dateKey(now))
  }

  const changeMonth = (delta: number) => {
    setViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    )
  }

  const taskList = (tasks: Task[], key: string) => (
    <div className="task-group" key={key}>
      <div className="task-group__title">
        {key === 'selected'
          ? 'Выбранный день'
          : (TASK_GROUP_LABELS[key as TaskGroupKey] ?? key)}
        <span>{tasks.length}</span>
      </div>
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onToggle={() => toggleTask(task.id)}
          onEdit={() => setModal({ task, date: null })}
          onDelete={() => void requestDelete(task)}
        />
      ))}
    </div>
  )

  return (
    <div className="page tasks-page">
      <PageHeader
        eyebrow="Планирование"
        title="Задачи и календарь"
        description="Держите дела рядом с паролями и заметками: сроки, приоритеты и чек-листы."
        actions={
          <>
            <span className="page-header__stat">
              {stats.active} активных
              <span>·</span>
              {stats.overdue > 0 ? `${stats.overdue} просрочено` : 'без просрочек'}
            </span>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setModal({ task: null, date: selectedDate })}
            >
              Новая задача
            </Button>
          </>
        }
      />

      <div className="tasks-layout">
        <section className="tasks-panel card">
          <header className="tasks-panel__head">
            <div>
              <h2>
                {selectedDate && selectedTs !== null
                  ? `Задачи на ${formatDate(selectedTs)}`
                  : 'Все задачи'}
              </h2>
              <p>
                {selectedDate
                  ? `${formatCount(selectedTasks.length, 'задача', 'задачи', 'задач')} · ${stats.active} активных всего`
                  : `${stats.active} активных · ${stats.today} на сегодня · ${stats.overdue} просрочено`}
              </p>
            </div>
            <div className="tasks-panel__actions">
              {selectedDate && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                  Все задачи
                </Button>
              )}
              <button
                type="button"
                className={cx('tasks-done-toggle', showDone && 'is-active')}
                onClick={() => setShowDone((value) => !value)}
                aria-pressed={showDone}
              >
                <Check size={14} aria-hidden />
                Выполненные
              </button>
            </div>
          </header>

          <form className="task-quick-add" onSubmit={createFromQuick}>
            <div className="task-quick-add__title">
              <Plus size={16} aria-hidden />
              <TextInput
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Быстро добавить задачу…"
                aria-label="Название новой задачи"
              />
            </div>
            <TextInput
              type="date"
              value={quickDate}
              onChange={(event) => setQuickDate(event.target.value)}
              aria-label="Срок новой задачи"
              className="task-quick-add__date"
            />
            <Select
              value={quickPriority}
              onChange={(event) => setQuickPriority(event.target.value as TaskPriority)}
              aria-label="Приоритет новой задачи"
              className="task-quick-add__priority"
            >
              {(['low', 'normal', 'high'] as TaskPriority[]).map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" className="task-quick-add__submit">
              Добавить
            </Button>
          </form>

          <div className="tasks-search">
            <div className="search-field">
              <Search size={15} className="search-field__icon" aria-hidden />
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по задачам…"
                aria-label="Поиск по задачам"
              />
              {query && (
                <button
                  type="button"
                  className="search-field__clear"
                  onClick={() => setQuery('')}
                  aria-label="Очистить поиск"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="tasks-list">
            {selectedDate ? (
              filteredSelected.length === 0 ? (
                <EmptyState
                  compact
                  icon={<CalendarDays size={24} />}
                  title="На этот день задач нет"
                  description="Добавьте задачу на выбранную дату или выберите другой день."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => setModal({ task: null, date: selectedDate })}
                    >
                      Добавить на день
                    </Button>
                  }
                />
              ) : (
                taskList(filteredSelected, 'selected')
              )
            ) : groups.length === 0 && doneTasks.length === 0 ? (
              <EmptyState
                compact
                icon={<ListTodo size={24} />}
                title={query ? 'Ничего не найдено' : 'Пока нет задач'}
                description={
                  query
                    ? 'Попробуйте другой запрос или очистите поиск.'
                    : 'Добавьте первую задачу — она появится в календаре и на обзоре.'
                }
                action={
                  query ? (
                    <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                      Очистить поиск
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Plus size={14} />}
                      onClick={() => setModal({ task: null, date: selectedDate })}
                    >
                      Добавить задачу
                    </Button>
                  )
                }
              />
            ) : (
              <>
                {groups.map((group) => taskList(group.tasks, group.key))}
                {doneTasks.length > 0 && taskList(doneTasks, 'done')}
              </>
            )}
          </div>
        </section>

        <aside className="calendar-panel card">
          <header className="calendar-panel__head">
            <div>
              <h2>{monthTitle(viewDate)}</h2>
              <p>Сроки задач по дням</p>
            </div>
            <div className="calendar-nav">
              <IconButton label="Предыдущий месяц" onClick={() => changeMonth(-1)}>
                <ChevronLeft size={16} />
              </IconButton>
              <Button variant="ghost" size="sm" onClick={goToday}>
                Сегодня
              </Button>
              <IconButton label="Следующий месяц" onClick={() => changeMonth(1)}>
                <ChevronRight size={16} />
              </IconButton>
            </div>
          </header>

          <div className="calendar-weekdays" aria-hidden>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const key = dateKey(day.ts)
              const count = dayCounts.get(key) ?? 0
              const isSelected = selectedDate === key
              return (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    'calendar-day',
                    !day.inMonth && 'is-outside',
                    day.isToday && 'is-today',
                    day.isWeekend && 'is-weekend',
                    isSelected && 'is-selected',
                    count > 0 && 'has-tasks',
                  )}
                  onClick={() => selectDay(day)}
                  aria-label={`${key}: ${formatCount(count, 'задача', 'задачи', 'задач')}`}
                  aria-pressed={isSelected}
                >
                  <span className="calendar-day__num">{day.day}</span>
                  {count > 0 && (
                    <span className="calendar-day__dots" aria-hidden>
                      {Array.from({ length: Math.min(3, count) }, (_, index) => (
                        <span key={index} className="calendar-day__dot" />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="calendar-panel__footer">
            <span>
              <span className="calendar-day__dot" aria-hidden /> есть задачи
            </span>
            {selectedDate ? (
              <button type="button" className="link-btn" onClick={() => setSelectedDate(null)}>
                Показать все дни
              </button>
            ) : (
              <span className="muted small">Нажмите день, чтобы отфильтровать</span>
            )}
          </div>
        </aside>
      </div>

      {modal && (
        <TaskModal
          open
          task={modal.task}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
