import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const { isAuthenticated, isReady, login, register } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

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

          {errorText && <p className="auth-error-text">{errorText}</p>}

          <button className="button primary auth-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </article>
    </section>
  )
}
