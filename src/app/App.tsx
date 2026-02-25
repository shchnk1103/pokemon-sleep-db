import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { GlobalToastViewport } from '../components/GlobalToastViewport'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { AboutPage } from '../pages/AboutPage'
import { AssetDexPage } from '../pages/AssetDexPage'
import { DexPage } from '../pages/DexPage'
import { HomePage } from '../pages/HomePage'
import '../styles/app.css'

function AppLayout() {
  const { preference, activeTheme, systemTheme, setPreference } = useTheme()
  const location = useLocation()
  const [isDexMenuOpen, setIsDexMenuOpen] = useState(false)
  const dexMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsDexMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dexMenuRef.current?.contains(event.target as Node)) {
        setIsDexMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const isDexSectionActive = location.pathname.startsWith('/dex')

  return (
    <>
      <div className="app-shell">
        <header className="top-nav">
          <NavLink to="/" className="brand">
            PokeSleep Lab
          </NavLink>

          <div className="top-nav-right">
            <nav>
              <NavLink to="/" end>
                首页
              </NavLink>

              <div
                ref={dexMenuRef}
                className={`nav-dropdown ${isDexMenuOpen ? 'is-open' : ''}`}
                onMouseEnter={() => setIsDexMenuOpen(true)}
                onMouseLeave={() => setIsDexMenuOpen(false)}
              >
                <button
                  type="button"
                  className={`nav-dropdown-trigger ${isDexSectionActive ? 'active' : ''}`}
                  onClick={() => setIsDexMenuOpen((current) => !current)}
                  aria-expanded={isDexMenuOpen}
                  aria-haspopup="menu"
                >
                  图鉴
                  <span className="nav-dropdown-caret">▾</span>
                </button>

                <div className="nav-dropdown-menu" role="menu" aria-label="图鉴菜单">
                  <NavLink to="/dex">宝可梦图鉴</NavLink>
                  <NavLink to="/dex/berries">树果图鉴</NavLink>
                  <NavLink to="/dex/ingredients">食材图鉴</NavLink>
                  <NavLink to="/dex/main-skills">主技能图鉴</NavLink>
                  <NavLink to="/dex/sub-skills">副技能图鉴</NavLink>
                </div>
              </div>

              <NavLink to="/about">关于我</NavLink>
            </nav>

            <ThemeToggle
              preference={preference}
              activeTheme={activeTheme}
              systemTheme={systemTheme}
              onSelect={setPreference}
            />
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dex" element={<DexPage />} />
            <Route
              path="/dex/berries"
              element={<AssetDexPage catalog="berries" title="树果图鉴" description="展示树果图片与基础数值区间。" />}
            />
            <Route
              path="/dex/ingredients"
              element={<AssetDexPage catalog="ingredients" title="食材图鉴" description="展示食材图片与基础数值区间。" />}
            />
            <Route
              path="/dex/main-skills"
              element={<AssetDexPage catalog="mainskills" title="主技能图鉴" description="展示主技能图片与基础数值区间。" />}
            />
            <Route
              path="/dex/sub-skills"
              element={<AssetDexPage catalog="subskills" title="副技能图鉴" description="展示副技能图片与基础数值区间。" />}
            />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
      <GlobalToastViewport />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
