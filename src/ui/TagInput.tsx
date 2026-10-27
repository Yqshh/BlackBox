import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cx } from './cx'

const MAX_TAGS = 20
const MAX_TAG_LENGTH = 28

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Добавить тег и нажать Enter',
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    setDraft('')
  }, [value.length])

  const addTag = (raw: string) => {
    const tag = raw
      .trim()
      .replace(/^#/, '')
      .replace(/\s+/g, ' ')
      .slice(0, MAX_TAG_LENGTH)

    if (!tag) return
    if (value.length >= MAX_TAGS) return
    if (value.some((existing) => existing.toLocaleLowerCase('ru') === tag.toLocaleLowerCase('ru'))) {
      setDraft('')
      return
    }

    onChange([...value, tag])
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(draft)
      return
    }

    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="tag-input" onClick={() => inputRef.current?.focus()}>
      {value.map((tag) => (
        <span key={tag} className="tag-input__chip">
          #{tag}
          <button
            type="button"
            className="tag-input__remove"
            aria-label={`Удалить тег ${tag}`}
            onClick={(event) => {
              event.stopPropagation()
              onChange(value.filter((item) => item !== tag))
            }}
          >
            <X size={11} aria-hidden />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        className="tag-input__field"
        value={draft}
        list={suggestions.length > 0 ? listId : undefined}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => addTag(draft)}
      />

      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions
            .filter((tag) => !value.includes(tag))
            .map((tag) => (
              <option key={tag} value={tag} />
            ))}
        </datalist>
      )}
    </div>
  )
}

export function TagList({
  tags,
  onClick,
  active,
}: {
  tags: string[]
  onClick?: (tag: string) => void
  active?: string | null
}) {
  if (tags.length === 0) return null

  return (
    <div className="tag-list">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={cx('tag', active === tag && 'is-active')}
          onClick={() => onClick?.(tag)}
          disabled={!onClick}
        >
          #{tag}
        </button>
      ))}
    </div>
  )
}
