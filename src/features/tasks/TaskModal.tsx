import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type Task,
  type TaskPriority,
} from '../../core/types'
import { Button, Checkbox, Field, Select, TextArea, TextInput } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'
import { createTask, updateTask } from './tasksActions'
import { dateInputValue, parseDateInput } from './taskUtils'

export function TaskModal({
  open,
  task,
  defaultDate,
  onClose,
}: {
  open: boolean
  task: Task | null
  defaultDate: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setDate(task ? dateInputValue(task.dueAt) : (defaultDate ?? ''))
    setPriority(task?.priority ?? 'normal')
    setDone(task?.done ?? false)
    setError('')
  }, [open, task, defaultDate])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Введите название задачи.')
      return
    }

    const input = {
      title,
      description,
      dueAt: parseDateInput(date),
      priority,
      done,
    }

    if (task) {
      updateTask(task.id, input)
      toast.push('Задача обновлена')
    } else {
      createTask(input)
      toast.push('Задача создана')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Редактирование задачи' : 'Новая задача'}
      subtitle="Срок и приоритет помогают не потерять важное"
      icon={<CalendarDays size={20} />}
      size="md"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="task-form" variant="primary">
            {task ? 'Сохранить' : 'Создать задачу'}
          </Button>
        </div>
      }
    >
      <form id="task-form" className="form-stack" onSubmit={submit}>
        <Field label="Название" required>
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Что нужно сделать?"
            maxLength={160}
            data-autofocus
          />
        </Field>

        <Field label="Описание" hint="Необязательно: детали, ссылки, критерии готовности.">
          <TextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Подробности задачи"
          />
        </Field>

        <div className="form-grid form-grid--2">
          <Field label="Срок">
            <TextInput
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          <Field label="Приоритет">
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {TASK_PRIORITY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Checkbox
          label="Задача выполнена"
          checked={done}
          onChange={(event) => setDone(event.target.checked)}
        />

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}
