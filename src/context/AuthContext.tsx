import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  loadPersistedSession,
  refreshOwnProfile,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateOwnProfile,
} from '../services/auth'
import { useToastStore } from '../stores/toastStore'
import type { AppUserProfile, AuthSession } from '../types/auth'

type AuthContextValue = {
  isReady: boolean
  session: AuthSession | null
  profile: AppUserProfile | null
  isAuthenticated: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: { email: string; password: string; displayName?: string }) => Promise<void>
  logout: () => Promise<void>
  saveProfile: (input: { displayName: string }) => Promise<void>
  reloadProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [profile, setProfile] = useState<AppUserProfile | null>(null)
  const showToast = useToastStore((state) => state.showToast)

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      try {
        const data = await loadPersistedSession()
        if (disposed) {
          return
        }
        setSession(data.session)
        setProfile(data.profile)
      } catch (error) {
        if (!disposed) {
          const message = error instanceof Error ? error.message : '鉴权初始化失败'
          showToast({
            id: 'auth-bootstrap-failed',
            message,
            variant: 'warning',
            durationMs: 5200,
          })
        }
      } finally {
        if (!disposed) {
          setIsReady(true)
        }
      }
    }

    void bootstrap()

    return () => {
      disposed = true
    }
  }, [showToast])

  const login: AuthContextValue['login'] = useCallback(async (input) => {
    const result = await signInWithEmail(input)
    setSession(result.session)
    setProfile(result.profile)
    showToast({
      id: 'auth-login-success',
      message: '登录成功。',
      variant: 'success',
      durationMs: 3000,
    })
  }, [showToast])

  const register: AuthContextValue['register'] = useCallback(async (input) => {
    const result = await signUpWithEmail(input)
    setSession(result.session)
    setProfile(result.profile)

    if (result.needsEmailConfirm) {
      showToast({
        id: 'auth-signup-confirm',
        message: '注册成功，请先到邮箱完成验证后登录。',
        variant: 'info',
        durationMs: 5200,
      })
      return
    }

    showToast({
      id: 'auth-signup-success',
      message: '注册并登录成功。',
      variant: 'success',
      durationMs: 3200,
    })
  }, [showToast])

  const logout: AuthContextValue['logout'] = useCallback(async () => {
    await signOut(session)
    setSession(null)
    setProfile(null)
    showToast({
      id: 'auth-logout-success',
      message: '已退出登录。',
      variant: 'info',
      durationMs: 2800,
    })
  }, [session, showToast])

  const saveProfile: AuthContextValue['saveProfile'] = useCallback(async (input) => {
    if (!session) {
      throw new Error('当前未登录。')
    }

    const nextProfile = await updateOwnProfile(session, input)
    setProfile(nextProfile)
    showToast({
      id: 'auth-profile-updated',
      message: '资料已更新。',
      variant: 'success',
      durationMs: 2600,
    })
  }, [session, showToast])

  const reloadProfile: AuthContextValue['reloadProfile'] = useCallback(async () => {
    if (!session) {
      return
    }
    const nextProfile = await refreshOwnProfile(session)
    setProfile(nextProfile)
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      session,
      profile,
      isAuthenticated: Boolean(session?.user),
      login,
      register,
      logout,
      saveProfile,
      reloadProfile,
    }),
    [isReady, session, profile, login, register, logout, saveProfile, reloadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用。')
  }
  return ctx
}
