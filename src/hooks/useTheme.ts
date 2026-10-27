import { useEffect } from 'react'
import { useSession } from './useSession'

type Theme = 'dark' | 'light'

function resolveTheme(mode: 'dark' | 'light' | 'system', prefersLight: boolean): Theme {
  if (mode === 'system') return prefersLight ? 'light' : 'dark'
  return mode
}

export function useTheme(): void {
  const { data } = useSession()
  const mode = data?.settings.theme ?? 'system'

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')

    const apply = () => {
      const theme = resolveTheme(mode, media.matches)
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme
    }

    apply()

    if (mode !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])
}
