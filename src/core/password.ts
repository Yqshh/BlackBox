export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
}

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/|~',
}

const AMBIGUOUS = new Set(['I', 'l', '1', 'O', '0', 'o', '|'])

/** Криптостойкое целое в диапазоне [0, max) без смещения. */
function randomInt(max: number): number {
  if (max <= 0) return 0
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buffer = new Uint32Array(1)

  for (;;) {
    crypto.getRandomValues(buffer)
    const value = buffer[0] ?? 0
    if (value < limit) return value % max
  }
}

function pickAlphabet(source: string, excludeAmbiguous: boolean): string {
  if (!excludeAmbiguous) return source
  return [...source].filter((char) => !AMBIGUOUS.has(char)).join('')
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    const a = chars[i]
    const b = chars[j]
    chars[i] = b ?? ''
    chars[j] = a ?? ''
  }
  return chars
}

export function generatePassword(options: PasswordOptions = DEFAULT_PASSWORD_OPTIONS): string {
  const length = Math.max(4, Math.min(128, Math.round(options.length)))
  const groups: string[] = []

  if (options.lowercase) groups.push(pickAlphabet(SETS.lowercase, options.excludeAmbiguous))
  if (options.uppercase) groups.push(pickAlphabet(SETS.uppercase, options.excludeAmbiguous))
  if (options.digits) groups.push(pickAlphabet(SETS.digits, options.excludeAmbiguous))
  if (options.symbols) groups.push(pickAlphabet(SETS.symbols, options.excludeAmbiguous))

  const usable = groups.filter((group) => group.length > 0)
  if (usable.length === 0) usable.push(SETS.lowercase)

  const all = usable.join('')
  const result: string[] = []

  // Гарантируем хотя бы по одному символу из каждой выбранной категории.
  for (const alphabet of usable) {
    if (result.length >= length) break
    result.push(alphabet.charAt(randomInt(alphabet.length)))
  }

  while (result.length < length) {
    result.push(all.charAt(randomInt(all.length)))
  }

  return shuffle(result).slice(0, length).join('')
}

/** Сколько бит энтропии примерно содержит пароль. */
export function estimateEntropyBits(password: string): number {
  if (!password) return 0

  let alphabet = 0
  if (/[a-z]/.test(password)) alphabet += 26
  if (/[а-яё]/.test(password)) alphabet += 33
  if (/[A-Z]/.test(password)) alphabet += 26
  if (/[А-ЯЁ]/.test(password)) alphabet += 33
  if (/\d/.test(password)) alphabet += 10
  if (/[^A-Za-zА-Яа-яЁё0-9]/.test(password)) alphabet += 33
  if (alphabet === 0) alphabet = 1

  return Math.round(password.length * Math.log2(alphabet))
}
