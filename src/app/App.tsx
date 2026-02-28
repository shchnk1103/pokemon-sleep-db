import { useEffect } from 'react'
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { DropdownMenu } from '../components/DropdownMenu'
import { GlobalToastViewport } from '../components/GlobalToastViewport'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { AboutPage } from '../pages/AboutPage'
import { AssetDexPage } from '../pages/AssetDexPage'
import { AuthPage } from '../pages/AuthPage'
import { DexPage } from '../pages/DexPage'
import { HomePage } from '../pages/HomePage'
import { NewsDetailPage } from '../pages/NewsDetailPage'
import { NewsPage } from '../pages/NewsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { MainSkillCreatePage } from '../pages/MainSkillCreatePage'
import '../styles/app.css'

function AppLayout() {
  const { preference, activeTheme, systemTheme, setPreference } = useTheme()
  const { isAuthenticated, logout, profile, session } = useAuth()
  const location = useLocation()

  const isDexSectionActive = location.pathname.startsWith('/dex')
  const baseName = profile?.displayName?.trim() || session?.user.email?.split('@')[0] || '用户'
  const userDisplayName = baseName.length > 12 ? `${baseName.slice(0, 12)}…` : baseName

  useEffect(() => {
    const scrollingClass = 'is-scrolling'
    let hideTimer: number | null = null

    const markScrolling = () => {
      document.documentElement.classList.add(scrollingClass)

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer)
      }

      hideTimer = window.setTimeout(() => {
        document.documentElement.classList.remove(scrollingClass)
      }, 720)
    }

    markScrolling()

    document.addEventListener('scroll', markScrolling, { capture: true, passive: true })
    window.addEventListener('wheel', markScrolling, { passive: true })
    window.addEventListener('touchmove', markScrolling, { passive: true })

    return () => {
      document.removeEventListener('scroll', markScrolling, true)
      window.removeEventListener('wheel', markScrolling)
      window.removeEventListener('touchmove', markScrolling)

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer)
      }

      document.documentElement.classList.remove(scrollingClass)
    }
  }, [])

  return (
    <>
      <div className="app-shell">
        <header className="top-nav">
          <NavLink to="/" className="brand">
            PokeSleep Lab
          </NavLink>

          <div className="top-nav-right">
            <nav className="top-nav-links">
              <NavLink to="/" end>
                首页
              </NavLink>
              <NavLink to="/news">新闻</NavLink>
              <DropdownMenu
                hoverable
                className="nav-dropdown"
                panelClassName="nav-dropdown-menu"
                trigger={({ isOpen, toggle }) => (
                  <button
                    type="button"
                    className={`nav-dropdown-trigger ${isDexSectionActive ? 'active' : ''}`}
                    onClick={toggle}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                  >
                    图鉴
                    <span className="nav-dropdown-caret">▾</span>
                  </button>
                )}
              >
                <NavLink to="/dex" end>
                  宝可梦图鉴
                </NavLink>
                <NavLink to="/dex/berries">树果图鉴</NavLink>
                <NavLink to="/dex/ingredients">食材图鉴</NavLink>
                <NavLink to="/dex/main-skills">主技能图鉴</NavLink>
                <NavLink to="/dex/sub-skills">副技能图鉴</NavLink>
              </DropdownMenu>

              <NavLink to="/about">关于我</NavLink>
            </nav>

            <div className="top-nav-auth">
              {isAuthenticated ? (
                <DropdownMenu
                  hoverable
                  align="right"
                  className="user-menu"
                  panelClassName="user-menu-panel"
                  trigger={({ isOpen, toggle }) => (
                    <button
                      type="button"
                      className={`user-menu-trigger ${isOpen ? 'active' : ''}`}
                      onClick={toggle}
                      aria-expanded={isOpen}
                      aria-haspopup="menu"
                      title={profile?.displayName || session?.user.email || '用户'}
                    >
                      <span className="user-menu-name">{userDisplayName}</span>
                      <span className="user-menu-caret">▾</span>
                    </button>
                  )}
                >
                  {({ close }) => (
                    <>
                      <NavLink
                        to="/profile"
                        onClick={() => {
                          close()
                        }}
                      >
                        个人中心
                      </NavLink>
                      <button
                        type="button"
                        className="user-menu-action"
                        onClick={() => {
                          close()
                          void logout()
                        }}
                      >
                        退出
                      </button>
                    </>
                  )}
                </DropdownMenu>
              ) : (
                <NavLink to="/auth" className="auth-entry-link">
                  登录/注册
                </NavLink>
              )}
            </div>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:newsId" element={<NewsDetailPage />} />
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
            <Route path="/dex/main-skills/new" element={<MainSkillCreatePage />} />
            <Route
              path="/dex/sub-skills"
              element={<AssetDexPage catalog="subskills" title="副技能图鉴" description="展示副技能图片与基础数值区间。" />}
            />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>

        <AppFooter
          preference={preference}
          activeTheme={activeTheme}
          systemTheme={systemTheme}
          onSelectTheme={setPreference}
        />
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
