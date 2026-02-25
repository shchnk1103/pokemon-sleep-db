import { create } from 'zustand'

export type ToastVariant = 'info' | 'success' | 'warning'

export type AppToast = {
  id: string
  message: string
  variant: ToastVariant
  durationMs: number | null
}

type ShowToastInput = {
  id?: string
  message: string
  variant?: ToastVariant
  durationMs?: number | null
}

type ToastStore = {
  toasts: AppToast[]
  showToast: (input: ShowToastInput) => string
  dismissToast: (id: string) => void
  clearToasts: () => void
}

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Global toast message store.
 *
 * - `showToast` inserts or updates by id (idempotent for progress/loading toasts)
 * - `durationMs: null` means persistent toast until manually dismissed
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: ({ id, message, variant = 'info', durationMs = 4200 }) => {
    const resolvedId = id ?? createToastId()

    set((state) => {
      const nextToast: AppToast = {
        id: resolvedId,
        message,
        variant,
        durationMs,
      }

      const existingIndex = state.toasts.findIndex((toast) => toast.id === resolvedId)
      if (existingIndex >= 0) {
        const nextToasts = [...state.toasts]
        nextToasts[existingIndex] = nextToast
        return { toasts: nextToasts }
      }

      return { toasts: [...state.toasts, nextToast] }
    })

    return resolvedId
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
  clearToasts: () => {
    set({ toasts: [] })
  },
}))
