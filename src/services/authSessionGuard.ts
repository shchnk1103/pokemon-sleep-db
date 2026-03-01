type UnknownRecord = Record<string, unknown>

const AUTH_EXPIRED_PATTERNS = ['jwt expired', 'invalid jwt', 'expired', 'token is expired', 'token has expired']
const AUTH_EXPIRED_EVENT = 'app:auth-session-expired'
let lastNotifyAt = 0

function pickString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function normalizeMessage(input: { payload?: unknown; fallback?: string }) {
  if (typeof input.payload === 'object' && input.payload !== null) {
    const record = input.payload as UnknownRecord
    const message = pickString(record, ['message', 'msg', 'error', 'error_description'])
    if (message) {
      return message
    }
  }
  return input.fallback ?? ''
}

function isLikelyExpiredMessage(message: string) {
  const lower = message.toLowerCase()
  return AUTH_EXPIRED_PATTERNS.some((pattern) => lower.includes(pattern))
}

export function isAuthExpiredError(input: { status?: number; payload?: unknown; fallbackMessage?: string }) {
  const message = normalizeMessage({
    payload: input.payload,
    fallback: input.fallbackMessage,
  })

  if (!message) {
    return input.status === 401
  }

  return input.status === 401 || isLikelyExpiredMessage(message)
}

export function notifyAuthSessionExpired(message = '登录状态已过期，请重新登录。') {
  if (typeof window === 'undefined') {
    return
  }

  const now = Date.now()
  if (now - lastNotifyAt < 2500) {
    return
  }
  lastNotifyAt = now

  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: {
        message,
      },
    }),
  )
}

export function getAuthExpiredEventName() {
  return AUTH_EXPIRED_EVENT
}
