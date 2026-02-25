import { useEffect } from 'react'
import { useToastStore } from '../stores/toastStore'

/**
 * Shared toast viewport rendered once at app root.
 * Handles auto-dismiss behavior for timed toasts.
 */
export function GlobalToastViewport() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  useEffect(() => {
    const timers = toasts
      .filter((toast) => typeof toast.durationMs === 'number' && toast.durationMs > 0)
      .map((toast) =>
        window.setTimeout(() => {
          dismissToast(toast.id)
        }, toast.durationMs as number),
      )

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [dismissToast, toasts])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="app-toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`app-toast ${toast.variant}`} role="status">
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="关闭消息"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
