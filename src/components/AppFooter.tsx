import { ThemeToggle } from './ThemeToggle'
import type { ThemeMode, ThemePreference } from '../hooks/useTheme'

type AppFooterProps = {
  preference: ThemePreference
  activeTheme: ThemeMode
  systemTheme: ThemeMode
  onSelectTheme: (nextPreference: ThemePreference) => void
}

export function AppFooter({ preference, activeTheme, systemTheme, onSelectTheme }: AppFooterProps) {
  return (
    <footer className="app-footer">
      <p className="app-footer-note">PokeSleep Lab · Pokemon Sleep 数据工具站</p>
      <div className="app-footer-right">
        <ThemeToggle
          preference={preference}
          activeTheme={activeTheme}
          systemTheme={systemTheme}
          onSelect={onSelectTheme}
        />
      </div>
    </footer>
  )
}
