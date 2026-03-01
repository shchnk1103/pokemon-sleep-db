import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type AuthMode = 'login' | 'register'
const REMEMBERED_EMAIL_KEY = 'pokesleep:remembered-email'

export function AuthPage() {
  const { isAuthenticated, isReady, login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim() ?? ''
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberEmail(true)
    }
  }, [])

  if (isReady && isAuthenticated) {
    return <Navigate to="/profile" replace />
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setErrorText('')
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ email, password })
        if (typeof window !== 'undefined') {
          if (rememberEmail) {
            window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim())
          } else {
            window.localStorage.removeItem(REMEMBERED_EMAIL_KEY)
          }
        }
      } else {
        await register({ email, password, displayName })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请稍后重试。'
      setErrorText(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Account</p>
        <h2>登录 / 注册</h2>
        <p>使用邮箱账号登录，注册后会自动同步用户资料到 users 表。</p>
      </header>

      <article className="dex-card auth-card">
        <div className="auth-mode-switch">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
            disabled={isSubmitting}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
            disabled={isSubmitting}
          >
            注册
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <label className="auth-field">
              <span>昵称</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="例如：PokeSleeper"
                autoComplete="nickname"
              />
            </label>
          )}

          <label className="auth-field">
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
              minLength={6}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'login' && (
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>记住邮箱账号</span>
            </label>
          )}

          {errorText && <p className="auth-error-text">{errorText}</p>}

          <button className="button primary auth-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </article>
    </section>
  )
}
