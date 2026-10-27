/**
 * Небольшой реестр отложенных изменений интерфейса.
 *
 * Редактор заметок обновляет хранилище с задержкой, чтобы не перерисовывать
 * всё приложение на каждый символ. Перед блокировкой или закрытием вкладки
 * нужно принудительно сбросить эти изменения, иначе последние полсекунды
 * набора могут не попасть в сохраняемый снимок.
 */

const flushers = new Set<() => void>()

export function registerPendingFlush(flush: () => void): () => void {
  flushers.add(flush)
  return () => {
    flushers.delete(flush)
  }
}

export function flushPendingChanges(): void {
  for (const flush of [...flushers]) {
    try {
      flush()
    } catch {
      // один сломанный редактор не должен мешать блокировке
    }
  }
}
