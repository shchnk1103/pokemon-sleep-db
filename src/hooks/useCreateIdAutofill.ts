import { useEffect, useRef, useState } from 'react'

type UseCreateIdAutofillOptions<T> = {
  enabled: boolean
  manualId: string
  debounceMs?: number
  isBusy?: boolean
  resolveById: (id: number) => Promise<T | null>
  onFound: (id: number, entry: T) => void
  onMissing: (id: number) => void
  onError?: (id: number, error: unknown) => void
}

type UseCreateIdAutofillResult = {
  isResolving: boolean
  resolvedExistingId: number | null
  lastCheckedId: number | null
  reset: () => void
}

export function useCreateIdAutofill<T>({
  enabled,
  manualId,
  debounceMs = 420,
  isBusy = false,
  resolveById,
  onFound,
  onMissing,
  onError,
}: UseCreateIdAutofillOptions<T>): UseCreateIdAutofillResult {
  const [isResolving, setIsResolving] = useState(false)
  const [resolvedExistingId, setResolvedExistingId] = useState<number | null>(null)
  const [lastCheckedId, setLastCheckedId] = useState<number | null>(null)
  const seqRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const reset = () => {
    seqRef.current += 1
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsResolving(false)
    setResolvedExistingId(null)
    setLastCheckedId(null)
  }

  useEffect(() => {
    return () => {
      seqRef.current += 1
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled || isBusy) {
      return
    }

    const raw = manualId.trim()
    if (!raw) {
      setIsResolving(false)
      if (resolvedExistingId !== null || lastCheckedId !== 0) {
        setResolvedExistingId(null)
        setLastCheckedId(0)
        onMissing(0)
      }
      return
    }

    const candidate = Number(raw)
    if (
      !Number.isInteger(candidate) ||
      candidate <= 0 ||
      resolvedExistingId === candidate ||
      lastCheckedId === candidate
    ) {
      return
    }

    const requestSeq = seqRef.current + 1
    seqRef.current = requestSeq
    setIsResolving(true)

    timerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const found = await resolveById(candidate)
          if (requestSeq !== seqRef.current) {
            return
          }

          if (found) {
            setResolvedExistingId(candidate)
            setLastCheckedId(candidate)
            onFound(candidate, found)
          } else {
            setResolvedExistingId(null)
            setLastCheckedId(candidate)
            onMissing(candidate)
          }
        } catch (error) {
          if (requestSeq !== seqRef.current) {
            return
          }
          onError?.(candidate, error)
        } finally {
          if (requestSeq === seqRef.current) {
            setIsResolving(false)
          }
        }
      })()
    }, debounceMs)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [
    debounceMs,
    enabled,
    isBusy,
    lastCheckedId,
    manualId,
    onError,
    onFound,
    onMissing,
    resolveById,
    resolvedExistingId,
  ])

  return {
    isResolving,
    resolvedExistingId,
    lastCheckedId,
    reset,
  }
}
