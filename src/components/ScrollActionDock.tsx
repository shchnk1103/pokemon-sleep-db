import { useEffect, useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

const VISIBLE_OFFSET = 260

export function ScrollActionDock() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const syncVisibility = () => {
      setIsVisible(window.scrollY > VISIBLE_OFFSET)
    }

    syncVisibility()
    window.addEventListener('scroll', syncVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', syncVisibility)
    }
  }, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="scroll-action-dock is-visible">
      <button
        type="button"
        className="scroll-action-btn"
        onClick={() => {
          window.location.reload()
        }}
        aria-label="刷新当前页面"
        title="刷新当前页面"
      >
        <MaterialIcon name="restart_alt" className="scroll-action-btn-icon" size={22} />
      </button>
      <button
        type="button"
        className="scroll-action-btn"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        aria-label="返回顶部"
        title="返回顶部"
      >
        <MaterialIcon name="arrow_drop_up" className="scroll-action-btn-icon is-bobbing" size={24} />
      </button>
    </div>
  )
}
