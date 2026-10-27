import { uid } from '../../core/ids'
import { session } from '../../core/session'
import type { Task, TaskPriority } from '../../core/types'

export interface TaskInput {
  title: string
  description: string
  dueAt: number | null
  priority: TaskPriority
  done?: boolean
}

export function createTask(input: TaskInput): string {
  const id = uid('task')
  const now = Date.now()

  session.mutate((draft) => {
    draft.tasks.push({
      id,
      title: input.title.trim() || 'Новая задача',
      description: input.description.trim(),
      dueAt: input.dueAt,
      done: input.done ?? false,
      priority: input.priority,
      createdAt: now,
      updatedAt: now,
      completedAt: input.done ? now : null,
    })
  })

  return id
}

export function updateTask(taskId: string, input: TaskInput): void {
  session.mutate((draft) => {
    const task = draft.tasks.find((item) => item.id === taskId)
    if (!task) return

    const nextDone = input.done ?? task.done
    task.title = input.title.trim() || task.title
    task.description = input.description.trim()
    task.dueAt = input.dueAt
    task.priority = input.priority
    task.updatedAt = Date.now()

    if (nextDone !== task.done) {
      task.done = nextDone
      task.completedAt = nextDone ? Date.now() : null
    }
  })
}

export function toggleTask(taskId: string): void {
  session.mutate((draft) => {
    const task = draft.tasks.find((item) => item.id === taskId)
    if (!task) return
    task.done = !task.done
    task.completedAt = task.done ? Date.now() : null
    task.updatedAt = Date.now()
  })
}

export function deleteTask(taskId: string): void {
  session.mutate((draft) => {
    draft.tasks = draft.tasks.filter((task) => task.id !== taskId)
  })
}

export function rescheduleTask(taskId: string, dueAt: number | null): void {
  session.mutate((draft) => {
    const task = draft.tasks.find((item) => item.id === taskId)
    if (!task) return
    task.dueAt = dueAt
    task.updatedAt = Date.now()
  })
}

export function activeTaskCount(tasks: Task[]): number {
  return tasks.filter((task) => !task.done).length
}
