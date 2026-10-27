import { AlertOctagon, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Controls'
import { Brand } from '../ui/Brand'
import { Spinner } from '../ui/Badge'

export function BootScreen() {
  return (
    <div className="status-screen">
      <div className="status-screen__glow" aria-hidden />
      <Brand size="lg" />
      <Spinner label="Открываем хранилище" />
      <p className="muted">Проверяем локальное хранилище…</p>
    </div>
  )
}

export function FatalScreen({ message }: { message: string | null }) {
  return (
    <div className="status-screen">
      <div className="status-screen__glow status-screen__glow--danger" aria-hidden />
      <div className="status-screen__icon status-screen__icon--danger">
        <AlertOctagon size={30} aria-hidden />
      </div>
      <h1 className="status-screen__title">Хранилище не открылось</h1>
      <p className="status-screen__text">{message ?? 'Неизвестная ошибка'}</p>
      <div className="status-screen__hint">
        <ShieldCheck size={16} aria-hidden />
        <span>
          Попробуйте открыть приложение на <code>localhost</code> или через сборку
          <code> build:single</code>. Web Crypto не работает на некоторых адресах.
        </span>
      </div>
      <Button
        variant="primary"
        icon={<RefreshCw size={16} />}
        onClick={() => window.location.reload()}
      >
        Перезагрузить
      </Button>
    </div>
  )
}
