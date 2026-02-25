import { useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'

const THEME_STORAGE_KEY = 'pokemonsleep-theme-preference'

function resolveSystemTheme(): ThemeMode {
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const lightQuery = window.matchMedia('(prefers-color-scheme: light)')

  if (darkQuery.matches) {
    return 'dark'
  }

  if (lightQuery.matches) {
    return 'light'
  }

  return 'light'
}

function getInitialPreference(): ThemePreference {
  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'system') {
    return storedPreference
  }

  return 'system'
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => getInitialPreference())
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(() => resolveSystemTheme())

  useEffect(() => {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const lightQuery = window.matchMedia('(prefers-color-scheme: light)')

    const syncSystemTheme = () => {
      if (darkQuery.matches) {
        setSystemTheme('dark')
        return
      }

      if (lightQuery.matches) {
        setSystemTheme('light')
        return
      }

      setSystemTheme('light')
    }

    // Some browsers only update media query state after tab focus.
    const handleVisibilityOrFocus = () => syncSystemTheme()

    syncSystemTheme()

    const subscribe = (query: MediaQueryList) => {
      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', syncSystemTheme)
        return
      }

      // Safari fallback
      ;(query as MediaQueryList & { addListener?: (listener: () => void) => void }).addListener?.(
        syncSystemTheme,
      )
    }

    const unsubscribe = (query: MediaQueryList) => {
      if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', syncSystemTheme)
        return
      }

      ;(
        query as MediaQueryList & {
          removeListener?: (listener: () => void) => void
        }
      ).removeListener?.(syncSystemTheme)
    }

    subscribe(darkQuery)
    subscribe(lightQuery)

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      unsubscribe(darkQuery)
      unsubscribe(lightQuery)

      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [])

  const activeTheme = useMemo<ThemeMode>(
    () => (preference === 'system' ? systemTheme : preference),
    [preference, systemTheme],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme
  }, [activeTheme])

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  }, [preference])

  return {
    preference,
    activeTheme,
    systemTheme,
    setPreference,
  }
}
