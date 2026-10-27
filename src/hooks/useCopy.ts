import { useCallback } from 'react'
import { copyText, scheduleClipboardClear } from '../core/clipboard'
import { session } from '../core/session'
import { useToast } from '../ui/Toast'

export function useCopy() {
  const toast = useToast()

  return useCallback(
    async (value: string, label = 'Текст', secret = false): Promise<boolean> => {
      if (!value) return false

      const ok = await copyText(value)
      if (!ok) {
        toast.push('Не удалось скопировать', 'error')
        return false
      }

      const seconds = session.getSnapshot().data?.settings.clipboardClearSeconds ?? 0
      if (secret && seconds > 0) {
        scheduleClipboardClear(seconds)
        toast.push(`${label} скопирован · буфер очистится через ${seconds} с`)
      } else {
        toast.push(`${label} скопирован`)
      }

      return true
    },
    [toast],
  )
}
