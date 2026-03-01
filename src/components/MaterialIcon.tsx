import type { CSSProperties } from 'react'

type MaterialIconProps = {
  name: string
  className?: string
  size?: number
  alt?: string
  decorative?: boolean
}

export function MaterialIcon({ name, className = '', size = 20, alt, decorative = true }: MaterialIconProps) {
  const resolvedLabel = alt ?? name
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    '--icon-url': `url("/icons/material/${name}.svg")`,
  } as CSSProperties

  return (
    <span
      className={`material-icon ${className}`.trim()}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : resolvedLabel}
      aria-hidden={decorative}
    />
  )
}
