import { DropdownMenu } from './DropdownMenu'
import type { ThemeMode, ThemePreference } from '../hooks/useTheme'

type ThemeToggleProps = {
  preference: ThemePreference
  activeTheme: ThemeMode
  systemTheme: ThemeMode
  onSelect: (nextPreference: ThemePreference) => void
}

type ThemeOption = {
  key: ThemePreference
  label: string
  hint: string
  icon: string
}

const options: ThemeOption[] = [
  { key: 'light', label: '浅色模式', hint: '始终使用浅色主题', icon: '☀' },
  { key: 'dark', label: '深色模式', hint: '始终使用深色主题', icon: '🌙' },
  { key: 'system', label: '跟随系统', hint: '自动匹配设备主题', icon: '🖥' },
]

function getModeText(preference: ThemePreference, activeTheme: ThemeMode) {
  if (preference === 'system') {
    return `跟随系统（当前${activeTheme === 'dark' ? '深色' : '浅色'}）`
  }

  return preference === 'dark' ? '深色模式' : '浅色模式'
}

function getTriggerIcon(preference: ThemePreference, activeTheme: ThemeMode) {
  if (preference === 'system') {
    return activeTheme === 'dark' ? '🌙' : '☀'
  }

  return preference === 'dark' ? '🌙' : '☀'
}

export function ThemeToggle({ preference, activeTheme, systemTheme, onSelect }: ThemeToggleProps) {
  const triggerLabel = getModeText(preference, activeTheme)
  const triggerIcon = getTriggerIcon(preference, activeTheme)

  return (
    <DropdownMenu
      placement="top"
      align="right"
      className="theme-menu"
      panelClassName="theme-popover"
      trigger={({ isOpen, toggle }) => (
        <button
          type="button"
          className="theme-trigger"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`当前主题：${triggerLabel}`}
        >
          <span className="theme-trigger-icon" aria-hidden="true">
            {triggerIcon}
          </span>
          <span className="theme-trigger-text">{triggerLabel}</span>
          <span className="theme-trigger-caret" aria-hidden="true">
            ▾
          </span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <p className="theme-popover-title">主题模式</p>
          <p className="theme-popover-note">
            系统当前为：<strong>{systemTheme === 'dark' ? '深色' : '浅色'}</strong>
          </p>

          <div className="theme-option-list">
            {options.map((option) => {
              const isSelected = option.key === preference

              return (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`theme-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelect(option.key)
                    close()
                  }}
                >
                  <span className="theme-option-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="theme-option-content">
                    <span className="theme-option-label">{option.label}</span>
                    <span className="theme-option-hint">{option.hint}</span>
                  </span>
                  <span className="theme-option-check" aria-hidden="true">
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </DropdownMenu>
  )
}
