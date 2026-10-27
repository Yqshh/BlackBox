import { estimateEntropyBits } from './password'

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  entropy: number
  hints: string[]
}

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'qwerty',
  'qwerty123',
  '123456',
  '12345678',
  '123456789',
  '111111',
  '123123',
  'admin',
  'admin123',
  'root',
  'letmein',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'master',
  'superman',
  'trustno1',
  'abc123',
  'qwertyuiop',
  '1q2w3e4r',
  'qazwsx',
  'password123',
  '1234567890',
  '000000',
  '654321',
  'пароль',
  'йцукен',
  'йцукенг',
])

const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'йцукенгшщзхъ',
  'фывапролджэ',
  'ячсмитьбю',
]

export function assessPassword(password: string): PasswordStrength {
  const hints: string[] = []
  const entropy = estimateEntropyBits(password)
  let score: 0 | 1 | 2 | 3 | 4 = 0

  if (!password) {
    return { score: 0, label: 'Пустой', entropy: 0, hints: ['Введите пароль'] }
  }

  const length = password.length
  const hasLower = /[a-zа-я]/.test(password)
  const hasUpper = /[A-ZА-Я]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-zА-Яа-я0-9]/.test(password)
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length

  if (length < 8) hints.push('Слишком короткий — нужно минимум 12 символов')
  else if (length < 12) hints.push('Лучше увеличить длину до 12–16 символов')

  if (classes < 3) hints.push('Добавьте заглавные буквы, цифры или символы')

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    hints.push('Этот пароль есть в списке самых популярных')
    return { score: 0, label: 'Очень слабый', entropy, hints }
  }

  if (/(.)\1{2,}/.test(password)) hints.push('Есть повторяющиеся символы')
  if (SEQUENCES.some((sequence) => password.toLowerCase().includes(sequence.slice(0, 5)))) {
    hints.push('Есть последовательность вроде abcde или 12345')
  }
  if (/^\d+$/.test(password)) hints.push('Только цифры — легко подобрать')
  if (/^(19|20)\d{2}$/.test(password)) hints.push('Похоже на год — легко подобрать')

  const heavilyRepeated = /(.)\1{3,}/.test(password)
  const penalized =
    COMMON_PASSWORDS.has(password.toLowerCase()) ||
    heavilyRepeated ||
    /^\d+$/.test(password)

  if (length >= 20 && classes >= 3 && !penalized) score = 4
  else if (length >= 16 && classes >= 3 && !penalized) score = 4
  else if (length >= 12 && classes >= 3 && !penalized) score = 3
  else if (length >= 10 && classes >= 2) score = 2
  else if (length >= 8) score = 1
  else score = 0

  if (heavilyRepeated || /^\d+$/.test(password)) score = 0

  const labels: Record<number, string> = {
    0: 'Очень слабый',
    1: 'Слабый',
    2: 'Средний',
    3: 'Надёжный',
    4: 'Отличный',
  }

  return { score, label: labels[score] ?? 'Слабый', entropy, hints: hints.slice(0, 3) }
}

/** Пароль, который стоит показать в аудите безопасности. */
export function isWeakPassword(password: string): boolean {
  const result = assessPassword(password)
  return result.score <= 2 || password.length < 10
}
