import { useEffect, useMemo, useRef, useState } from 'react'

type DropdownPlacement = 'bottom' | 'top'
type DropdownAlign = 'left' | 'right'

type DropdownMenuProps = {
  trigger: (args: { isOpen: boolean; toggle: () => void; close: () => void }) => React.ReactNode
  children: React.ReactNode | ((args: { close: () => void }) => React.ReactNode)
  placement?: DropdownPlacement
  align?: DropdownAlign
  hoverable?: boolean
  className?: string
  panelClassName?: string
}

export function DropdownMenu({
  trigger,
  children,
  placement = 'bottom',
  align = 'left',
  hoverable = false,
  className = '',
  panelClassName = '',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [])

  const toggle = () => setIsOpen((current) => !current)
  const close = () => setIsOpen(false)

  const shouldHover = useMemo(
    () => hoverable && typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    [hoverable],
  )

  return (
    <div
      ref={rootRef}
      className={`dropdown ${isOpen ? 'is-open' : ''} place-${placement} align-${align} ${className}`.trim()}
      onMouseEnter={() => {
        if (shouldHover) {
          setIsOpen(true)
        }
      }}
      onMouseLeave={() => {
        if (shouldHover) {
          setIsOpen(false)
        }
      }}
    >
      {trigger({ isOpen, toggle, close })}
      <div className={`dropdown-panel ${panelClassName}`.trim()} role="menu">
        {typeof children === 'function' ? children({ close }) : children}
      </div>
    </div>
  )
}
