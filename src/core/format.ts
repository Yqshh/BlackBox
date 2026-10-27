const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDate(timestamp: number): string {
  return DATE_FORMAT.format(new Date(timestamp))
}

export function formatDateTime(timestamp: number): string {
  return DATE_TIME_FORMAT.format(new Date(timestamp))
}

export function formatTime(timestamp: number): string {
  return TIME_FORMAT.format(new Date(timestamp))
}

export function formatRelative(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < MINUTE) return 'только что'
  if (diff < HOUR) return RELATIVE_FORMAT.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return RELATIVE_FORMAT.format(-Math.floor(diff / HOUR), 'hour')
  if (diff < 7 * DAY) return RELATIVE_FORMAT.format(-Math.floor(diff / DAY), 'day')
  return formatDate(timestamp)
}

export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / DAY)
}

export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(count) % 10
  const mod100 = Math.abs(count) % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

export function formatCount(count: number, one: string, few: string, many: string): string {
  return `${count} ${pluralRu(count, one, few, many)}`
}

export function truncate(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

/** Убирает Markdown-разметку для превью в списке заметок. */
export function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

export function greetingForHour(hour = new Date().getHours()): string {
  if (hour < 5) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function todayLong(): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function pluralAccounts(count: number): string {
  return formatCount(count, 'учётная запись', 'учётные записи', 'учётных записей')
}

export function pluralNotes(count: number): string {
  return formatCount(count, 'заметка', 'заметки', 'заметок')
}

export function pluralAssets(count: number): string {
  return formatCount(count, 'ресурс', 'ресурса', 'ресурсов')
}
