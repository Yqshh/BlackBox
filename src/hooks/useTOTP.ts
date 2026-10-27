import { useEffect, useState } from 'react'
import { totpRemaining, totpWithRemaining } from '../core/totp'

export interface TotpState {
  code: string
  remaining: number
  progress: number
  error: boolean
}

export function useTOTP(secret: string, period = 30): TotpState {
  const [state, setState] = useState<TotpState>({
    code: '------',
    remaining: period,
    progress: 1,
    error: false,
  })

  useEffect(() => {
    if (!secret) {
      setState({ code: '------', remaining: period, progress: 1, error: false })
      return
    }

    let cancelled = false

    const tick = async () => {
      try {
        const result = await totpWithRemaining(secret, period)
        if (cancelled) return
        setState({
          code: result.code,
          remaining: result.remaining,
          progress: result.remaining / period,
          error: false,
        })
      } catch {
        if (cancelled) return
        setState({
          code: '------',
          remaining: totpRemaining(period),
          progress: 0,
          error: true,
        })
      }
    }

    void tick()
    const timer = setInterval(() => void tick(), 1000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [secret, period])

  return state
}
