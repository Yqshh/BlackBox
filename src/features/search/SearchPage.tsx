import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Boxes,
  Folder,
  KeyRound,
  ListTodo,
  NotebookPen,
  Search,
  SearchX,
  X,
} from 'lucide-react'
import { useSession } from '../../hooks/useSession'
import { countSearchHits, searchAll, type SearchHit, type SearchKind } from '../../core/search'
import { formatCount } from '../../core/format'
import { EmptyState, PageHeader } from '../../ui/Layout'
import { Highlight } from '../../ui/Highlight'
import { TextInput } from '../../ui/Controls'
import { Kbd } from '../../ui/Badge'
import { cx } from '../../ui/cx'

const KIND_META: Record<
  SearchKind,
  { label: string; icon: typeof KeyRound; tone: string }
> = {
  account: { label: 'Учётная запись', icon: KeyRound, tone: 'sky' },
  asset: { label: 'Ресурс', icon: Boxes, tone: 'violet' },
  note: { label: 'Заметка', icon: NotebookPen, tone: 'amber' },
  group: { label: 'Раздел', icon: Folder, tone: 'emerald' },
  task: { label: 'Задача', icon: ListTodo, tone: 'rose' },
}

export function SearchPage() {
  const state = useSession()
  const data = state.data
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<SearchKind | 'all'>('all')

  const results = useMemo(() => {
    if (!data || query.trim().length === 0) return []
    return searchAll(data, query, 120)
  }, [data, query])

  const counts = useMemo(() => countSearchHits(results), [results])
  const filtered = kind === 'all' ? results : results.filter((hit) => hit.kind === kind)

  if (!data) return null

  const openHit = (hit: SearchHit) => {
    if (hit.kind === 'note' && hit.noteId) {
      navigate(`/notes/${hit.noteId}`)
      return
    }

    if (hit.kind === 'task' && hit.taskId) {
      navigate(`/tasks?task=${hit.taskId}`)
      return
    }

    const params = new URLSearchParams()
    if (hit.groupId) params.set('group', hit.groupId)
    if (hit.assetId) params.set('asset', hit.assetId)
    if (hit.accountId) params.set('account', hit.accountId)
    navigate(`/vault?${params.toString()}`)
  }

  const hasQuery = query.trim().length > 0

  return (
    <div className="page search-page">
      <PageHeader
        eyebrow="Поиск"
        title="Найти всё"
        description="Учётные записи, ресурсы, заметки и разделы — в одном запросе. Пароли не индексируются."
        actions={
          <span className="page-header__stat">
            <Kbd>Ctrl</Kbd> <Kbd>K</Kbd> из любого экрана
          </span>
        }
      />

      <div className="search-hero card">
        <div className="search-field search-field--large">
          <Search size={20} className="search-field__icon" aria-hidden />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Логин, сервер, заметка, тег, раздел…"
            aria-label="Поисковый запрос"
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="search-field__clear"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="search-kinds">
          <button
            type="button"
            className={cx('search-kind', kind === 'all' && 'is-active')}
            onClick={() => setKind('all')}
          >
            Все
            <span>{results.length}</span>
          </button>
          {(Object.keys(KIND_META) as SearchKind[]).map((value) => {
            const meta = KIND_META[value]
            const Icon = meta.icon
            return (
              <button
                key={value}
                type="button"
                className={cx('search-kind', kind === value && 'is-active')}
                onClick={() => setKind(value)}
                disabled={counts[value] === 0}
              >
                <Icon size={14} aria-hidden />
                {meta.label}
                <span>{counts[value]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {!hasQuery ? (
        <section className="search-hint card">
          <div className="search-hint__icon">
            <Search size={24} aria-hidden />
          </div>
          <div>
            <h2>Начните вводить запрос</h2>
            <p>
              Поиск работает офлайн по названиям, логинам, адресам, описаниям, тегам и
              текстам заметок. Сами пароли в индекс не попадают.
            </p>
            <div className="search-suggestions">
              {['VPN', '1С', 'сервер', 'работа', 'идеи'].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="tag-chip"
                  onClick={() => setQuery(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={28} />}
          title="Ничего не найдено"
          description={
            kind === 'all'
              ? 'Попробуйте другой запрос или проверьте раскладку клавиатуры.'
              : 'В этой категории совпадений нет. Выберите другой тип или «Все».'
          }
          action={
            <button type="button" className="btn btn--secondary" onClick={() => setQuery('')}>
              Очистить запрос
            </button>
          }
        />
      ) : (
        <div className="search-results card">
          <div className="card__head">
            <div>
              <h2>
                {formatCount(filtered.length, 'результат', 'результата', 'результатов')}
              </h2>
              <p>
                Запрос: <strong>{query}</strong>
              </p>
            </div>
          </div>

          <div className="search-result-list">
            {filtered.map((hit) => {
              const meta = KIND_META[hit.kind]
              const Icon = meta.icon
              return (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  type="button"
                  className="search-result"
                  onClick={() => openHit(hit)}
                >
                  <span className={cx('search-result__icon', `search-result__icon--${meta.tone}`)}>
                    <Icon size={17} />
                  </span>
                  <span className="search-result__body">
                    <span className="search-result__title">
                      <Highlight text={hit.title} query={query} />
                      <span className="badge badge--slate">{meta.label}</span>
                    </span>
                    <span className="search-result__subtitle">
                      <Highlight text={hit.subtitle} query={query} />
                    </span>
                    {hit.meta && hit.kind === 'note' && (
                      <span className="search-result__meta">{hit.meta}</span>
                    )}
                  </span>
                  <span className="search-result__aside">
                    <span>{hit.meta}</span>
                    <span className="search-result__open">Открыть</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
