import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

type DexSearchDockProps = {
  query: string
  onQueryChange: (value: string) => void
  enabled: boolean
  placeholder: string
  ariaLabel: string
  inputId: string
}

export function DexSearchDock({
  query,
  onQueryChange,
  enabled,
  placeholder,
  ariaLabel,
  inputId,
}: DexSearchDockProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasQuery = query.trim().length > 0
  const showExpanded = isExpanded || hasQuery

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hasQuery) {
        return
      }

      if (!wrapRef.current?.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [hasQuery])

  return (
    <div
      ref={wrapRef}
      className={`search-dock ${showExpanded ? 'expanded' : ''} ${enabled ? '' : 'disabled'}`}
      onMouseEnter={() => enabled && setIsExpanded(true)}
      onMouseLeave={() => {
        if (enabled && !hasQuery) {
          setIsExpanded(false)
        }
      }}
    >
      <button
        type="button"
        className="search-trigger"
        onClick={() => {
          if (!enabled) {
            return
          }

          if (showExpanded) {
            inputRef.current?.focus()
            return
          }

          setIsExpanded(true)
          window.requestAnimationFrame(() => {
            inputRef.current?.focus()
          })
        }}
        disabled={!enabled}
        aria-expanded={showExpanded}
        aria-controls={inputId}
        aria-label="打开搜索"
        title="搜索"
      >
        <MaterialIcon name="search" className="search-trigger-icon" size={18} />
      </button>

      <input
        id={inputId}
        ref={inputRef}
        className="pokedex-search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => enabled && setIsExpanded(true)}
        placeholder={placeholder}
        disabled={!enabled}
        aria-label={ariaLabel}
      />
    </div>
  )
}
