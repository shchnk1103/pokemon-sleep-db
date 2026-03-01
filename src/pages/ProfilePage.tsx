import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ImageDropzoneField } from '../components/ImageDropzoneField'
import { useAuth } from '../context/AuthContext'
import { deletePublicImageByUrl, uploadPublicImage } from '../services/mediaStorage'
import { MaterialIcon } from '../components/MaterialIcon'

function formatDate(value: string): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN')
}

export function ProfilePage() {
  const { isReady, isAuthenticated, session, profile, saveProfile, reloadProfile } = useAuth()
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [avatarUrlInput, setAvatarUrlInput] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [initialAvatarUrl, setInitialAvatarUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const displayNameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    void reloadProfile()
  }, [isAuthenticated, reloadProfile])

  useEffect(() => {
    setDisplayNameInput(profile?.displayName ?? '')
    const avatar = profile?.avatarUrl ?? ''
    setAvatarUrlInput(avatar)
    setInitialAvatarUrl(avatar)
    setAvatarFile(null)
  }, [profile?.avatarUrl, profile?.displayName])

  useEffect(() => {
    if (!isEditorOpen) {
      return
    }

    const timerId = window.setTimeout(() => {
      displayNameInputRef.current?.focus()
      displayNameInputRef.current?.select()
    }, 120)

    return () => window.clearTimeout(timerId)
  }, [isEditorOpen])

  if (isReady && !isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) {
      return
    }

    setErrorText('')
    setIsSaving(true)
    try {
      if (!session) {
        throw new Error('当前未登录。')
      }

      let nextAvatarUrl = avatarUrlInput.trim()
      if (avatarFile) {
        nextAvatarUrl = await uploadPublicImage(session, avatarFile, 'avatars')
      }

      await saveProfile({
        displayName: displayNameInput,
        avatarUrl: nextAvatarUrl,
      })

      if (initialAvatarUrl && initialAvatarUrl !== nextAvatarUrl) {
        await deletePublicImageByUrl(session, initialAvatarUrl).catch(() => null)
      }
      setAvatarUrlInput(nextAvatarUrl)
      setInitialAvatarUrl(nextAvatarUrl)
      setAvatarFile(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : '资料更新失败。'
      setErrorText(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Profile</p>
        <h2>个人中心</h2>
        <p>这里展示当前登录账号和 users 表中的资料信息。</p>
      </header>

      <article className="dex-card profile-card">
        <div className="profile-avatar-header">
          <div className="profile-avatar-frame" aria-label="当前头像">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="当前头像" className="profile-avatar-image" />
            ) : (
              <span className="profile-avatar-fallback" aria-hidden="true">
                <MaterialIcon name="person" className="profile-avatar-fallback-icon" size={36} />
              </span>
            )}
          </div>
        </div>
        <dl>
          <div>
            <dt>邮箱</dt>
            <dd>{session?.user.email ?? '—'}</dd>
          </div>
          <div>
            <dt>昵称</dt>
            <dd>{profile?.displayName || session?.user.email?.split('@')[0] || '—'}</dd>
          </div>
          <div>
            <dt>管理员</dt>
            <dd>{profile?.isAdmin ? '是' : '否'}</dd>
          </div>
          <div>
            <dt>Auth User ID</dt>
            <dd>{session?.user.id ?? '—'}</dd>
          </div>
          <div>
            <dt>Profile ID</dt>
            <dd>{profile?.id ?? '—'}</dd>
          </div>
          <div>
            <dt>创建时间</dt>
            <dd>{formatDate(profile?.createdAt ?? '')}</dd>
          </div>
          <div>
            <dt>更新时间</dt>
            <dd>{formatDate(profile?.updatedAt ?? '')}</dd>
          </div>
        </dl>
      </article>

      <article className="dex-card profile-edit-card">
        <div className="profile-edit-header">
          <h3>编辑资料</h3>
          <button
            type="button"
            className="button ghost profile-edit-toggle-btn"
            onClick={() => {
              setIsEditorOpen((current) => !current)
            }}
          >
            {isEditorOpen ? '收起编辑' : '编辑资料'}
          </button>
        </div>

        <div className={`profile-edit-body ${isEditorOpen ? 'is-open' : ''}`}>
          <form className="profile-edit-form" onSubmit={submit}>
            <label className="auth-field">
              <span>昵称</span>
              <input
                ref={displayNameInputRef}
                type="text"
                value={displayNameInput}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder="请输入昵称"
                maxLength={48}
                required
              />
            </label>
            <ImageDropzoneField
              label="头像"
              imageUrl={avatarUrlInput}
              file={avatarFile}
              onPickFile={(file) => {
                setAvatarFile(file)
                setErrorText('')
              }}
              onClear={() => {
                setAvatarFile(null)
                setAvatarUrlInput('')
              }}
              hint="拖入图片到这里，或点击区域上传头像。"
              disabled={isSaving}
            />
            <p className="profile-edit-hint">为安全起见，仅允许修改当前登录账号自身资料。</p>
            {errorText && <p className="auth-error-text">{errorText}</p>}
            <button type="submit" className="button primary auth-submit-btn" disabled={isSaving}>
              {isSaving ? '保存中...' : '保存资料'}
            </button>
          </form>
        </div>
      </article>
    </section>
  )
}
