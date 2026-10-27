import { uid } from '../../core/ids'
import { session } from '../../core/session'
import type { Accent, Note } from '../../core/types'

export interface NoteInput {
  title: string
  content: string
  notebookId: string | null
  tags: string[]
}

export function createNote(notebookId: string | null = null, tags: string[] = []): string {
  const id = uid('note')
  const now = Date.now()

  session.mutate((draft) => {
    draft.notes.unshift({
      id,
      notebookId:
        notebookId ?? (draft.notebooks.length > 0 ? (draft.notebooks[0]?.id ?? null) : null),
      title: '',
      content: '',
      tags,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })
  })

  return id
}

export function updateNote(
  noteId: string,
  patch: Partial<Pick<Note, 'title' | 'content' | 'notebookId' | 'tags'>>,
): void {
  session.mutate((draft) => {
    const note = draft.notes.find((item) => item.id === noteId)
    if (!note) return

    if (patch.title !== undefined) note.title = patch.title
    if (patch.content !== undefined) note.content = patch.content
    if (patch.notebookId !== undefined) note.notebookId = patch.notebookId
    if (patch.tags !== undefined) note.tags = patch.tags
    note.updatedAt = Date.now()
  }, 450)
}

export function deleteNote(noteId: string): void {
  session.mutate((draft) => {
    draft.notes = draft.notes.filter((note) => note.id !== noteId)
  })
}

export function toggleNotePin(noteId: string): void {
  session.mutate((draft) => {
    const note = draft.notes.find((item) => item.id === noteId)
    if (!note) return
    note.pinned = !note.pinned
    note.updatedAt = Date.now()
  })
}

export function createNotebook(name: string, color: Accent): string {
  const id = uid('nb')
  session.mutate((draft) => {
    draft.notebooks.push({ id, name: name.trim() || 'Новый блокнот', color, createdAt: Date.now() })
  })
  return id
}

export function updateNotebook(notebookId: string, name: string, color: Accent): void {
  session.mutate((draft) => {
    const notebook = draft.notebooks.find((item) => item.id === notebookId)
    if (!notebook) return
    notebook.name = name.trim() || notebook.name
    notebook.color = color
  })
}

export function deleteNotebook(notebookId: string): void {
  session.mutate((draft) => {
    draft.notebooks = draft.notebooks.filter((notebook) => notebook.id !== notebookId)
    for (const note of draft.notes) {
      if (note.notebookId === notebookId) note.notebookId = null
    }
  })
}

export function noteTags(notes: Note[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ru'))
}
