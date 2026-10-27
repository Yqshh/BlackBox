import { useState } from 'react'
import { Copy, KeyRound, RefreshCw, Wand2 } from 'lucide-react'
import {
  DEFAULT_PASSWORD_OPTIONS,
  generatePassword,
  type PasswordOptions,
} from '../../core/password'
import { useCopy } from '../../hooks/useCopy'
import { Button, Checkbox } from '../../ui/Controls'
import { Modal } from '../../ui/Modal'
import { StrengthMeter } from '../../ui/StrengthMeter'

export function PasswordGeneratorPanel({ onUse }: { onUse?: (password: string) => void }) {
  const copy = useCopy()
  const [options, setOptions] = useState<PasswordOptions>({ ...DEFAULT_PASSWORD_OPTIONS })
  const [password, setPassword] = useState(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))

  const generate = (next = options) => {
    setPassword(generatePassword(next))
  }

  const patch = (next: Partial<PasswordOptions>) => {
    const merged = { ...options, ...next }
    setOptions(merged)
    generate(merged)
  }

  const noClasses =
    !options.uppercase && !options.lowercase && !options.digits && !options.symbols

  return (
    <div className="generator">
      <div className="generator__result">
        <code className="generator__value">{password || '—'}</code>
        <div className="generator__actions">
          <Button
            variant="ghost"
            size="sm"
            icon={<Copy size={15} />}
            onClick={() => void copy(password, 'Пароль', true)}
            aria-label="Скопировать пароль"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={15} />}
            onClick={() => generate()}
            aria-label="Сгенерировать заново"
          />
        </div>
      </div>

      <StrengthMeter password={password} />

      <div className="generator__length">
        <div className="generator__length-head">
          <span>Длина</span>
          <strong>{options.length}</strong>
        </div>
        <input
          type="range"
          min={8}
          max={64}
          value={options.length}
          onChange={(event) => patch({ length: Number(event.target.value) })}
          className="range"
          aria-label="Длина пароля"
        />
      </div>

      <div className="generator__grid">
        <Checkbox
          label="Заглавные"
          checked={options.uppercase}
          onChange={(event) => patch({ uppercase: event.target.checked })}
        />
        <Checkbox
          label="Строчные"
          checked={options.lowercase}
          onChange={(event) => patch({ lowercase: event.target.checked })}
        />
        <Checkbox
          label="Цифры"
          checked={options.digits}
          onChange={(event) => patch({ digits: event.target.checked })}
        />
        <Checkbox
          label="Символы"
          checked={options.symbols}
          onChange={(event) => patch({ symbols: event.target.checked })}
        />
        <Checkbox
          label="Без похожих символов"
          description="Исключить 0, O, l, 1, I"
          checked={options.excludeAmbiguous}
          onChange={(event) => patch({ excludeAmbiguous: event.target.checked })}
        />
      </div>

      {noClasses && (
        <p className="notice notice--warning">Выберите хотя бы один набор символов.</p>
      )}

      <div className="generator__footer">
        {onUse && (
          <Button
            variant="primary"
            icon={<Wand2 size={16} />}
            disabled={!password}
            onClick={() => onUse(password)}
          >
            Использовать
          </Button>
        )}
        <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => generate()}>
          Новый пароль
        </Button>
      </div>
    </div>
  )
}

export function PasswordGeneratorModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Генератор паролей"
      subtitle="Криптостойкая случайность, без запросов в сеть"
      icon={<KeyRound size={20} />}
      size="md"
    >
      <PasswordGeneratorPanel />
    </Modal>
  )
}
