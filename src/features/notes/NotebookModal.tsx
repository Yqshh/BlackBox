import { useEffect, useState, type FormEvent } from 'react'
import { Check, NotebookPen } from 'lucide-react'
import { ACCENTS, ACCENT_LABELS, type Accent, type Notebook } from '../../core/types'
import { createNotebook, updateNotebook } from './notesActions'
import { Button, Field, TextInput } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { useToast } from '../../ui/Toast'
import { cx } from '../../ui/cx'

export function NotebookModal({
  open,
  notebook,
  onClose,
}: {
  open: boolean
  notebook: Notebook | null
  onClose: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState<Accent>('sky')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(notebook?.name ?? '')
    setColor(notebook?.color ?? 'sky')
    setError('')
  }, [open, notebook])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Введите название блокнота.')
      return
    }

    if (notebook) {
      updateNotebook(notebook.id, name, color)
      toast.push('Блокнот обновлён')
    } else {
      createNotebook(name, color)
      toast.push('Блокнот создан')
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={notebook ? 'Редактирование блокнота' : 'Новый блокнот'}
      subtitle="Блокноты группируют заметки по темам"
      icon={<NotebookPen size={20} />}
      size="sm"
      footer={
        <div className="modal__actions">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="notebook-form" variant="primary">
            {notebook ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      }
    >
      <form id="notebook-form" className="form-stack" onSubmit={submit}>
        <Field label="Название" required>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, «Работа» или «Идеи»"
            maxLength={60}
            data-autofocus
          />
        </Field>

        <Field label="Цвет">
          <div className="color-picker">
            {ACCENTS.map((accent) => (
              <button
                key={accent}
                type="button"
                className={cx('color-swatch', `color-swatch--${accent}`, color === accent && 'is-active')}
                onClick={() => setColor(accent)}
                aria-label={ACCENT_LABELS[accent]}
                aria-pressed={color === accent}
                title={ACCENT_LABELS[accent]}
              >
                {color === accent && <Check size={13} aria-hidden />}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="notice notice--danger">{error}</p>}
      </form>
    </Modal>
  )
}
