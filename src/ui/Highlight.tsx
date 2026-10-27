import type { ReactNode } from 'react'

export function Highlight({
  text,
  query,
  className,
}: {
  text: string
  query: string
  className?: string
}) {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (tokens.length === 0) return <span className={className}>{text}</span>

  const pattern = new RegExp(`(${tokens.join('|')})`, 'gi')
  const parts = text.split(pattern)
  const nodes: ReactNode[] = parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>,
  )

  return <span className={className}>{nodes}</span>
}
