import { formatDate } from '../../core/format'
import type { Task } from '../../core/types'

const DAY = 24 * 60 * 60 * 1000

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export type TaskGroupKey = 'overdue' | 'today' | 'tomorrow' | 'later' | 'none' | 'done'

export const TASK_GROUP_LABELS: Record<TaskGroupKey, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  later: 'Позже',
  none: 'Без срока',
  done: 'Выполнено',
}

export function startOfDay(value: number | Date = Date.now()): number {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function addDays(value: number | Date, days: number): number {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  date.setDate(date.getDate() + days)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function dateKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function dateFromKey(key: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date.getTime()
}

export function dateInputValue(dueAt: number | null): string {
  return dueAt === null ? '' : dateKey(dueAt)
}

export function parseDateInput(value: string): number | null {
  return value ? dateFromKey(value) : null
}

export function isToday(value: number | null): boolean {
  return value !== null && startOfDay(value) === startOfDay()
}

export function isOverdue(task: Task, now = Date.now()): boolean {
  return task.dueAt !== null && !task.done && task.dueAt < startOfDay(now)
}

export function dueLabel(dueAt: number | null): string {
  if (dueAt === null) return 'Без срока'
  const today = startOfDay()
  if (dueAt === today) return 'Сегодня'
  if (dueAt === addDays(today, 1)) return 'Завтра'
  if (dueAt === addDays(today, -1)) return 'Вчера'
  return formatDate(dueAt)
}

export function dueTone(task: Task): 'overdue' | 'today' | 'soon' | 'done' | 'normal' | 'none' {
  if (task.done) return 'done'
  if (task.dueAt === null) return 'none'
  if (isOverdue(task)) return 'overdue'
  if (task.dueAt === startOfDay()) return 'today'
  if (task.dueAt === addDays(startOfDay(), 1)) return 'soon'
  return 'normal'
}

export function priorityRank(priority: Task['priority']): number {
  if (priority === 'high') return 0
  if (priority === 'normal') return 1
  return 2
}

export function sortTasks(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.dueAt !== b.dueAt) {
    if (a.dueAt === null) return 1
    if (b.dueAt === null) return -1
    return a.dueAt - b.dueAt
  }
  return priorityRank(a.priority) - priorityRank(b.priority)
}

export function groupTasks(tasks: Task[]): Array<{ key: TaskGroupKey; tasks: Task[] }> {
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const groups: Record<Exclude<TaskGroupKey, 'done'>, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    later: [],
    none: [],
  }

  for (const task of tasks) {
    if (task.done) continue
    if (task.dueAt === null) groups.none.push(task)
    else if (task.dueAt < today) groups.overdue.push(task)
    else if (task.dueAt === today) groups.today.push(task)
    else if (task.dueAt === tomorrow) groups.tomorrow.push(task)
    else groups.later.push(task)
  }

  return (Object.keys(groups) as Array<Exclude<TaskGroupKey, 'done'>>)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, tasks: groups[key].slice().sort(sortTasks) }))
}

export function taskStats(tasks: Task[]): {
  total: number
  active: number
  done: number
  today: number
  overdue: number
} {
  const today = startOfDay()
  return {
    total: tasks.length,
    active: tasks.filter((task) => !task.done).length,
    done: tasks.filter((task) => task.done).length,
    today: tasks.filter(
      (task) => !task.done && task.dueAt !== null && task.dueAt === today,
    ).length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
  }
}

export function tasksForDay(tasks: Task[], day: number): Task[] {
  const key = dateKey(day)
  return tasks
    .filter((task) => task.dueAt !== null && dateKey(task.dueAt) === key)
    .slice()
    .sort(sortTasks)
}

export interface CalendarDay {
  ts: number
  day: number
  inMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

export function buildCalendar(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    date.setHours(0, 0, 0, 0)
    return {
      ts: date.getTime(),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: date.getTime() === startOfDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    }
  })
}

export function monthTitle(value: Date): string {
  const text = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(value)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function monthShort(value: number): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(
    new Date(value),
  )
}

export function taskCountsByDay(tasks: Task[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    if (task.dueAt === null) continue
    const key = dateKey(task.dueAt)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export function nextSevenDays(): number[] {
  const today = startOfDay()
  return Array.from({ length: 7 }, (_, index) => addDays(today, index))
}

export { DAY }
