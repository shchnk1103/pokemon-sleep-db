import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type DraftLevel = {
  id: number
  level: string
  value: string
  extraEffects: string
}

function createDraftLevel(id: number, level = ''): DraftLevel {
  return {
    id,
    level,
    value: '',
    extraEffects: '',
  }
}

export function MainSkillCreatePage() {
  const { isReady, isAuthenticated, profile } = useAuth()
  const shouldRedirect = isReady && (!isAuthenticated || !profile?.isAdmin)
  const [name, setName] = useState('')
  const [chineseName, setChineseName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState('')
  const [localImageFileName, setLocalImageFileName] = useState('')
  const [isImageDragActive, setIsImageDragActive] = useState(false)
  const [levels, setLevels] = useState<DraftLevel[]>([
    createDraftLevel(1, '1'),
    createDraftLevel(2, '2'),
  ])
  const [nextLevelId, setNextLevelId] = useState(3)
  const [editingExtraEffectsLevelId, setEditingExtraEffectsLevelId] = useState<number | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewObjectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (editingExtraEffectsLevelId === null) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingExtraEffectsLevelId(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [editingExtraEffectsLevelId])

  const addLevelRow = () => {
    setLevels((current) => [...current, createDraftLevel(nextLevelId)])
    setNextLevelId((current) => current + 1)
  }

  const removeLevelRow = (id: number) => {
    setLevels((current) => current.filter((item) => item.id !== id))
  }

  const updateLevel = (id: number, key: keyof DraftLevel, value: string) => {
    setLevels((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item
        }
        return {
          ...item,
          [key]: value,
        }
      }),
    )
  }

  const submitDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitMessage('新增主技能页面已完成。当前为界面预览模式，数据库存储将在下一步接入。')
  }

  const applyLocalImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
    }

    const objectUrl = URL.createObjectURL(file)
    previewObjectUrlRef.current = objectUrl
    setLocalImagePreviewUrl(objectUrl)
    setLocalImageFileName(file.name)
  }

  const clearLocalImage = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    setLocalImagePreviewUrl('')
    setLocalImageFileName('')
  }

  const activeExtraEffectsLevel = levels.find((item) => item.id === editingExtraEffectsLevelId) ?? null

  if (shouldRedirect) {
    return <Navigate to="/dex/main-skills" replace />
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Dex Admin</p>
        <h2>新增主技能</h2>
        <p>仅管理员可见。当前用于填写主技能草稿与等级结构，暂不写入数据库。</p>
      </header>

      <article className="dex-card mainskill-create-card">
        <form className="mainskill-create-form" onSubmit={submitDraft}>
          <div className="mainskill-create-head">
            <Link to="/dex/main-skills" className="button ghost mainskill-create-back-btn">
              返回主技能图鉴
            </Link>
            <button type="submit" className="button primary">
              创建（预览）
            </button>
          </div>

          <div className="mainskill-create-grid">
            <label className="auth-field">
              <span>name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如: Charge Strength S"
              />
            </label>

            <label className="auth-field">
              <span>chinese_name</span>
              <input
                type="text"
                value={chineseName}
                onChange={(event) => setChineseName(event.target.value)}
                placeholder="例如: 能量填充S"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>description</span>
            <textarea
              className="mainskill-create-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="填写主技能描述"
              rows={3}
            />
          </label>

          <label className="auth-field">
            <span>image_url</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="mainskill-image-upload-block">
            <div
              className={`mainskill-image-dropzone ${isImageDragActive ? 'is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsImageDragActive(true)
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  return
                }
                setIsImageDragActive(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setIsImageDragActive(false)
                const file = event.dataTransfer.files?.[0]
                if (file) {
                  applyLocalImageFile(file)
                }
              }}
            >
              <p>拖入图片到这里，或点击按钮选择本地图片</p>
              <div className="mainskill-image-dropzone-actions">
                <button
                  type="button"
                  className="button ghost mainskill-image-pick-btn"
                  onClick={() => {
                    fileInputRef.current?.click()
                  }}
                >
                  选择图片
                </button>
                {localImagePreviewUrl && (
                  <button type="button" className="button ghost mainskill-image-clear-btn" onClick={clearLocalImage}>
                    清除本地图片
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="mainskill-image-hidden-input"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    applyLocalImageFile(file)
                  }
                  event.currentTarget.value = ''
                }}
              />
            </div>

            {(localImagePreviewUrl || imageUrl) && (
              <div className="mainskill-image-preview-card">
                <img
                  src={localImagePreviewUrl || imageUrl}
                  alt="主技能图片预览"
                  className="mainskill-image-preview"
                  onError={() => {
                    if (!localImagePreviewUrl) {
                      setImageUrl('')
                    }
                  }}
                />
                {localImageFileName && <p className="mainskill-image-file-name">本地文件：{localImageFileName}</p>}
              </div>
            )}
          </div>

          <div className="mainskill-levels-header">
            <h3>等级数据</h3>
            <button type="button" className="button ghost mainskill-level-add-row-btn" onClick={addLevelRow}>
              add level
            </button>
          </div>

          <div className="mainskill-level-editor-wrap">
            <table className="mainskill-level-editor-table">
              <thead>
                <tr>
                  <th scope="col">level</th>
                  <th scope="col">value</th>
                  <th scope="col">extra_effects</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((item) => (
                  <tr key={`draft-level-${item.id}`}>
                    <td>
                      <input
                        className="mainskill-level-cell-input"
                        type="text"
                        value={item.level}
                        onChange={(event) => updateLevel(item.id, 'level', event.target.value)}
                        placeholder="1"
                      />
                    </td>
                    <td>
                      <input
                        className="mainskill-level-cell-input"
                        type="text"
                        value={item.value}
                        onChange={(event) => updateLevel(item.id, 'value', event.target.value)}
                        placeholder="1020"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mainskill-extra-effects-preview"
                        onClick={() => setEditingExtraEffectsLevelId(item.id)}
                        title={item.extraEffects.trim() || '点击编辑 extra_effects'}
                      >
                        {item.extraEffects.trim() || '点击编辑 extra_effects (JSON / text)'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button ghost mainskill-level-remove-row-btn"
                        onClick={() => removeLevelRow(item.id)}
                        disabled={levels.length <= 1}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      </article>

      {activeExtraEffectsLevel && (
        <div
          className="mainskill-extra-effects-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditingExtraEffectsLevelId(null)
            }
          }}
        >
          <section className="mainskill-extra-effects-editor-panel" role="dialog" aria-modal="true" aria-label="编辑 extra_effects">
            <p className="mainskill-extra-effects-editor-title">
              编辑 level {activeExtraEffectsLevel.level || '-'} 的 extra_effects
            </p>
            <textarea
              className="mainskill-extra-effects-editor-textarea"
              rows={12}
              value={activeExtraEffectsLevel.extraEffects}
              onChange={(event) => updateLevel(activeExtraEffectsLevel.id, 'extraEffects', event.target.value)}
              placeholder='例如: {"stack_energy":{"0":600,"1":1020},"items":[{"name":"能量","value":300}]}'
              autoFocus
            />
          </section>
        </div>
      )}

      {submitMessage && <p className="page-status info">{submitMessage}</p>}
    </section>
  )
}
