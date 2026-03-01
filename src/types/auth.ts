export type AuthUser = {
  id: string
  email: string
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
  user: AuthUser
}

export type AppUserProfile = {
  id: string
  authUserId: string
  email: string
  displayName: string
  avatarUrl: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}
