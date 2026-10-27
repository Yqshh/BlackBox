let clearTimer: ReturnType<typeof setTimeout> | null = null

/** Копирует текст с фолбэком для браузеров без Clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // переходим к фолбэку
  }

  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(area)
    return copied
  } catch {
    return false
  }
}

/**
 * Планирует очистку буфера обмена. Таймер общий: новое копирование
 * сбрасывает предыдущий, чтобы не стереть свежие данные раньше времени.
 */
export function scheduleClipboardClear(seconds: number): void {
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }

  if (seconds <= 0) return

  clearTimer = setTimeout(() => {
    clearTimer = null
    void copyText('')
  }, seconds * 1000)
}

export function cancelClipboardClear(): void {
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
}
