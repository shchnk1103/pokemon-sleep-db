import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ImageDropzoneField } from '../components/ImageDropzoneField'
import { MaterialIcon } from '../components/MaterialIcon'
import { useAuth } from '../context/AuthContext'
import { invalidateAssetDexCache } from '../services/catalogDex'
import { createMainSkillWithLevels, fetchMainSkillDraft, updateMainSkillWithLevels } from '../services/mainSkillsAdmin'
import { useToastStore } from '../stores/toastStore'

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
  const { skillId } = useParams<{ skillId: string }>()
  const isEditMode = Boolean(skillId)
  const parsedSkillId = Number(skillId)
  const navigate = useNavigate()
  const { isReady, isAuthenticated, profile, session } = useAuth()
  const shouldRedirect = isReady && (!isAuthenticated || !profile?.isAdmin)
  const [name, setName] = useState('')
  const [chineseName, setChineseName] = useState('')
  const [description, setDescription] = useState('')
  const [manualSkillId, setManualSkillId] = useState(isEditMode && Number.isInteger(parsedSkillId) ? String(parsedSkillId) : '')
  const [resolvedExistingSkillId, setResolvedExistingSkillId] = useState<number | null>(
    isEditMode && Number.isInteger(parsedSkillId) ? parsedSkillId : null,
  )
  const [imageUrl, setImageUrl] = useState('')
  const [localImageFile, setLocalImageFile] = useState<File | null>(null)
  const [levels, setLevels] = useState<DraftLevel[]>([createDraftLevel(1, '1')])
  const [nextLevelId, setNextLevelId] = useState(2)
  const [editingExtraEffectsLevelId, setEditingExtraEffectsLevelId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [isResolvingSkillId, setIsResolvingSkillId] = useState(false)
  const [lastCheckedSkillId, setLastCheckedSkillId] = useState<number | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const resolveRequestSeqRef = useRef(0)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)
  const isFormLocked = isSubmitting || isPrefilling

  const applyDraftToForm = (draft: Awaited<ReturnType<typeof fetchMainSkillDraft>>) => {
    setName(draft.name)
    setChineseName(draft.chineseName)
    setDescription(draft.description)
    setImageUrl(draft.imageUrl)
    setLevels(
      draft.levels.length > 0
        ? draft.levels.map((item, index) => ({
            id: index + 1,
            level: String(item.level),
            value: String(item.value),
            extraEffects: item.extraEffectsText,
          }))
        : [createDraftLevel(1, '1')],
    )
    setNextLevelId(Math.max(2, draft.levels.length + 1))
  }

  const resetToNewDraft = () => {
    setName('')
    setChineseName('')
    setDescription('')
    setImageUrl('')
    setLocalImageFile(null)
    setLevels([createDraftLevel(1, '1')])
    setNextLevelId(2)
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
      }
      resolveRequestSeqRef.current += 1
      dismissToast('mainskill-id-resolving')
    }
  }, [dismissToast])

  useEffect(() => {
    if (!isEditMode || !session || !Number.isInteger(parsedSkillId) || parsedSkillId <= 0) {
      return
    }

    let cancelled = false
    const run = async () => {
      setIsPrefilling(true)

      try {
        const draft = await fetchMainSkillDraft(session, parsedSkillId)
        if (cancelled) {
          return
        }

        applyDraftToForm(draft)
        setManualSkillId(String(parsedSkillId))
        setResolvedExistingSkillId(parsedSkillId)
        setLastCheckedSkillId(parsedSkillId)
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : '读取主技能数据失败。'
        showToast({
          id: `mainskill-edit-prefill-failed-${parsedSkillId}`,
          message: `加载待编辑主技能失败：${message}`,
          variant: 'warning',
          durationMs: 4200,
        })
      } finally {
        if (!cancelled) {
          setIsPrefilling(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [isEditMode, parsedSkillId, session, showToast])

  const resolveExistingSkillById = useCallback(
    async (skillIdToResolve: number, requestSeq: number) => {
      if (!session || isEditMode || !Number.isInteger(skillIdToResolve) || skillIdToResolve <= 0) {
        return
      }

      setIsResolvingSkillId(true)
      showToast({
        id: 'mainskill-id-resolving',
        message: `正在检查主技能 ID ${skillIdToResolve}...`,
        variant: 'info',
        durationMs: null,
      })
      try {
        const draft = await fetchMainSkillDraft(session, skillIdToResolve)
        if (requestSeq !== resolveRequestSeqRef.current) {
          return
        }
        applyDraftToForm(draft)
        setResolvedExistingSkillId(skillIdToResolve)
        setLastCheckedSkillId(skillIdToResolve)
        showToast({
          id: `mainskill-id-resolved-${skillIdToResolve}`,
          message: `检测到主技能 ID ${skillIdToResolve} 已存在，已自动加载其数据。提交时将执行更新。`,
          variant: 'info',
          durationMs: 3600,
        })
      } catch (error) {
        if (requestSeq !== resolveRequestSeqRef.current) {
          return
        }
        const message = error instanceof Error ? error.message : '读取主技能数据失败。'
        if (message.includes('未找到主技能 ID')) {
          setResolvedExistingSkillId(null)
          setLastCheckedSkillId(skillIdToResolve)
          resetToNewDraft()
          showToast({
            id: `mainskill-id-missing-${skillIdToResolve}`,
            message: `主技能 ID ${skillIdToResolve} 不存在，已切换为新增模式。`,
            variant: 'info',
            durationMs: 3200,
          })
        } else {
          showToast({
            id: `mainskill-id-resolve-failed-${skillIdToResolve}`,
            message: `检测主技能 ID 失败：${message}`,
            variant: 'warning',
            durationMs: 4200,
          })
        }
      } finally {
        if (requestSeq === resolveRequestSeqRef.current) {
          dismissToast('mainskill-id-resolving')
          setIsResolvingSkillId(false)
        }
      }
    },
    [dismissToast, isEditMode, session, showToast],
  )

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

  useEffect(() => {
    if (isEditMode || !session || isSubmitting || isPrefilling || isResolvingSkillId) {
      return
    }

    const rawId = manualSkillId.trim()
    if (!rawId) {
      setResolvedExistingSkillId(null)
      resetToNewDraft()
      return
    }

    const candidate = Number(rawId)
    if (
      !Number.isInteger(candidate) ||
      candidate <= 0 ||
      resolvedExistingSkillId === candidate ||
      lastCheckedSkillId === candidate
    ) {
      return
    }

    const requestSeq = resolveRequestSeqRef.current + 1
    resolveRequestSeqRef.current = requestSeq
    debounceTimerRef.current = window.setTimeout(() => {
      void resolveExistingSkillById(candidate, requestSeq)
    }, 500)

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [
    isEditMode,
    isPrefilling,
    isResolvingSkillId,
    isSubmitting,
    lastCheckedSkillId,
    manualSkillId,
    resolveExistingSkillById,
    resolvedExistingSkillId,
    session,
  ])

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

  const parseExtraEffectsInput = (text: string): unknown | null => {
    const trimmed = text.trim()
    if (!trimmed) {
      return null
    }

    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return trimmed
    }
  }

  const applyLocalImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({
        id: 'mainskill-image-invalid-type',
        message: '请选择图片文件。',
        variant: 'warning',
        durationMs: 3000,
      })
      return
    }

    const wasAlreadySelected = Boolean(localImageFile)
    setLocalImageFile(file)

    if (wasAlreadySelected) {
      showToast({
        id: 'mainskill-image-replaced',
        message: '已替换为新图片（仅支持 1 张）。',
        variant: 'info',
        durationMs: 2600,
      })
    }
  }

  const clearLocalImage = () => {
    setLocalImageFile(null)
    setImageUrl('')
  }

  const submitDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isFormLocked) {
      return
    }

    if (!session) {
      showToast({
        message: '当前未登录，无法提交主技能。',
        variant: 'warning',
        durationMs: 3200,
      })
      return
    }

    const nameValue = name.trim()
    const chineseNameValue = chineseName.trim()
    const descriptionValue = description.trim()
    const imageUrlValue = imageUrl.trim()
    const skillIdValue = isEditMode ? parsedSkillId : Number(manualSkillId.trim())

    if (!Number.isInteger(skillIdValue) || skillIdValue <= 0) {
      showToast({
        message: '请填写有效的主技能 ID（正整数）。',
        variant: 'warning',
        durationMs: 3200,
      })
      return
    }

    if (!nameValue || !chineseNameValue) {
      showToast({
        message: '请先填写 name 与 chinese_name。',
        variant: 'warning',
        durationMs: 3000,
      })
      return
    }

    if (!localImageFile && !imageUrlValue) {
      showToast({
        message: '请填写 image_url 或选择本地图片（仅支持 1 张）。',
        variant: 'warning',
        durationMs: 3200,
      })
      return
    }

    const parsedLevels = levels.map((item) => {
      const levelNumber = Number(item.level)
      const rawValue = item.value.trim()
      const numericValue = Number(rawValue)
      const parsedValue = rawValue.length > 0 && Number.isFinite(numericValue) ? numericValue : rawValue

      return {
        level: levelNumber,
        value: parsedValue,
        extraEffects: parseExtraEffectsInput(item.extraEffects),
      }
    })

    const hasInvalidLevel = parsedLevels.some((item) => !Number.isInteger(item.level) || item.level <= 0)
    if (hasInvalidLevel) {
      showToast({
        message: 'level 需为大于 0 的整数。',
        variant: 'warning',
        durationMs: 3000,
      })
      return
    }

    const hasInvalidValue = parsedLevels.some((item) => typeof item.value === 'string' && item.value.trim().length === 0)
    if (hasInvalidValue) {
      showToast({
        message: '每一行都需要填写 value。',
        variant: 'warning',
        durationMs: 3000,
      })
      return
    }

    const run = async () => {
      setIsSubmitting(true)

      try {
        let shouldUpdate = isEditMode || resolvedExistingSkillId === skillIdValue
        if (!isEditMode && !shouldUpdate) {
          try {
            const existingDraft = await fetchMainSkillDraft(session, skillIdValue)
            applyDraftToForm(existingDraft)
            setResolvedExistingSkillId(skillIdValue)
            shouldUpdate = true
            showToast({
              id: `mainskill-id-autoresolve-${skillIdValue}`,
              message: `检测到主技能 ID ${skillIdValue} 已存在，已切换为更新模式。`,
              variant: 'info',
              durationMs: 3000,
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : ''
            if (!message.includes('未找到主技能 ID')) {
              throw error
            }
          }
        }

        const result = shouldUpdate
          ? await updateMainSkillWithLevels({
              session,
              skillId: skillIdValue,
              name: nameValue,
              chineseName: chineseNameValue,
              description: descriptionValue,
              imageUrl: imageUrlValue,
              imageFile: localImageFile,
              levels: parsedLevels,
            })
          : await createMainSkillWithLevels({
              session,
              skillId: skillIdValue,
              name: nameValue,
              chineseName: chineseNameValue,
              description: descriptionValue,
              imageUrl: imageUrlValue,
              imageFile: localImageFile,
              levels: parsedLevels,
            })

        setImageUrl(result.imageUrl)
        clearLocalImage()
        invalidateAssetDexCache('mainskills')
        showToast({
          id: shouldUpdate
            ? `mainskill-update-success-${result.mainSkillId}`
            : `mainskill-create-success-${result.mainSkillId}`,
          message: `${shouldUpdate ? '主技能更新成功' : '主技能创建成功'}：ID ${result.mainSkillId}，已写入 ${result.levelCount} 条等级数据。`,
          variant: 'success',
          durationMs: 3200,
        })

        if (shouldUpdate) {
          void navigate('/dex/main-skills')
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '提交失败，请稍后重试。'
        showToast({
          id: isEditMode || resolvedExistingSkillId === skillIdValue ? 'mainskill-update-failed' : 'mainskill-create-failed',
          message: `${isEditMode || resolvedExistingSkillId === skillIdValue ? '主技能更新失败' : '主技能创建失败'}：${message}`,
          variant: 'warning',
          durationMs: 4200,
        })
      } finally {
        setIsSubmitting(false)
      }
    }

    void run()
  }

  const activeExtraEffectsLevel = levels.find((item) => item.id === editingExtraEffectsLevelId) ?? null

  if (shouldRedirect) {
    return <Navigate to="/dex/main-skills" replace />
  }

  if (isEditMode && (!Number.isInteger(parsedSkillId) || parsedSkillId <= 0)) {
    return <Navigate to="/dex/main-skills" replace />
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Dex Admin</p>
        <h2>{isEditMode ? '编辑主技能' : '新增主技能'}</h2>
        <p>
          {isEditMode ? '修改主技能与等级数据。' : '仅管理员可见。填写主技能 ID；若 ID 已存在将自动载入并在提交时更新。'}
        </p>
      </header>

      <article className="dex-card mainskill-create-card">
        <form className="mainskill-create-form" onSubmit={submitDraft}>
          <div className="mainskill-create-head">
            <Link to="/dex/main-skills" className="button ghost mainskill-create-back-btn">
              <MaterialIcon name="chevron_left" className="button-icon" size={18} />
              <span>返回主技能图鉴</span>
            </Link>
            <button type="submit" className="button primary" disabled={isFormLocked}>
              {isPrefilling ? '加载中...' : isSubmitting ? '提交中...' : isEditMode ? '保存修改' : '创建'}
            </button>
          </div>

          <div className="mainskill-create-grid">
            <label className="auth-field">
              <span>id</span>
              <div className="mainskill-id-input-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualSkillId}
                  onChange={(event) => {
                    setManualSkillId(event.target.value.replace(/[^\d]/g, ''))
                    if (!isEditMode) {
                      resolveRequestSeqRef.current += 1
                      dismissToast('mainskill-id-resolving')
                      setIsResolvingSkillId(false)
                      setResolvedExistingSkillId(null)
                      setLastCheckedSkillId(null)
                    }
                  }}
                  placeholder="例如: 1"
                  disabled={isEditMode || isSubmitting || isPrefilling}
                />
                {isEditMode && <small className="profile-edit-hint">编辑模式下 ID 固定，不会触发自动检测。</small>}
              </div>
            </label>

            <label className="auth-field">
              <span>name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如: Charge Strength S"
                disabled={isFormLocked}
              />
            </label>

            <label className="auth-field">
              <span>chinese_name</span>
              <input
                type="text"
                value={chineseName}
                onChange={(event) => setChineseName(event.target.value)}
                placeholder="例如: 能量填充S"
                disabled={isFormLocked}
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
              disabled={isFormLocked}
            />
          </label>

          <label className="auth-field">
            <span>image_url（可留空，若已选择本地图片）</span>
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              disabled={isFormLocked}
            />
          </label>

          <div className="mainskill-image-upload-block">
            <ImageDropzoneField
              label="主技能图片"
              imageUrl={imageUrl}
              file={localImageFile}
              disabled={isFormLocked}
              onPickFile={applyLocalImageFile}
              onClear={clearLocalImage}
            />
          </div>

          <div className="mainskill-levels-header">
            <h3>等级数据</h3>
            <button type="button" className="button ghost mainskill-level-add-row-btn" onClick={addLevelRow} disabled={isFormLocked}>
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
                        disabled={isFormLocked}
                      />
                    </td>
                    <td>
                      <input
                        className="mainskill-level-cell-input"
                        type="text"
                        value={item.value}
                        onChange={(event) => updateLevel(item.id, 'value', event.target.value)}
                        placeholder="1020"
                        disabled={isFormLocked}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mainskill-extra-effects-preview"
                        onClick={() => setEditingExtraEffectsLevelId(item.id)}
                        title={item.extraEffects.trim() || '点击编辑 extra_effects'}
                        disabled={isFormLocked}
                      >
                        {item.extraEffects.trim() || '点击编辑 extra_effects (JSON / text)'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button ghost mainskill-level-remove-row-btn"
                        onClick={() => removeLevelRow(item.id)}
                        disabled={isFormLocked || levels.length <= 1}
                        aria-label="删除该等级行"
                        title="删除该等级行"
                      >
                        <MaterialIcon name="delete" className="mainskill-level-remove-icon" size={16} />
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
              disabled={isFormLocked}
            />
          </section>
        </div>
      )}
    </section>
  )
}
