import { useEffect, useRef, useState } from 'react'
import { IconEditDeletePill } from './IconEditDeletePill'
import { MaterialIcon } from './MaterialIcon'

type ImageDropzoneFieldProps = {
  label: string
  imageUrl: string
  file: File | null
  onPickFile: (file: File) => void
  onClear: () => void
  hint?: string
  disabled?: boolean
}

export function ImageDropzoneField({
  label,
  imageUrl,
  file,
  onPickFile,
  onClear,
  hint = '拖入图片到这里，或点击区域上传新图片。',
  disabled = false,
}: ImageDropzoneFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isBroken, setIsBroken] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    setIsBroken(false)

    return () => {
      URL.revokeObjectURL(localUrl)
    }
  }, [file])

  const displayedUrl = previewUrl || imageUrl.trim()
  const hasImage = Boolean(displayedUrl) && !isBroken
  const canInteract = !disabled

  const handlePick = () => {
    if (!canInteract) {
      return
    }
    inputRef.current?.click()
  }

  const handleDrop: React.DragEventHandler<HTMLElement> = (event) => {
    if (!canInteract) {
      return
    }
    event.preventDefault()
    setIsDragActive(false)
    const picked = event.dataTransfer.files?.[0]
    if (picked) {
      onPickFile(picked)
      setIsConfirmingClear(false)
    }
  }

  return (
    <section className={`image-dropzone-field ${disabled ? 'is-disabled' : ''} ${hasImage ? 'has-image' : 'empty-image'}`.trim()}>
      <p className="image-dropzone-label">{label}</p>
      {hasImage ? (
        <div className="image-preview-shell">
          <div
            className={`image-preview-box ${isDragActive ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              if (!canInteract) {
                return
              }
              event.preventDefault()
              setIsDragActive(true)
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return
              }
              setIsDragActive(false)
            }}
            onDrop={handleDrop}
          >
            <img
              src={displayedUrl}
              alt={`${label}预览`}
              className="image-preview"
              onError={() => {
                setIsBroken(true)
              }}
            />
            {!isConfirmingClear ? (
              <IconEditDeletePill
                className="image-preview-actions"
                editLabel="重新选择图片"
                deleteLabel="删除图片"
                disabled={!canInteract}
                onEdit={handlePick}
                onDelete={() => {
                  setIsConfirmingClear(true)
                }}
              />
            ) : (
              <div className="image-preview-actions">
                <>
                  <button
                    type="button"
                    className="image-overlay-btn danger"
                    disabled={!canInteract}
                    onClick={() => {
                      onClear()
                      setIsConfirmingClear(false)
                      setIsBroken(false)
                    }}
                  >
                    确认
                  </button>
                  <button type="button" className="image-overlay-btn" disabled={!canInteract} onClick={() => setIsConfirmingClear(false)}>
                    取消
                  </button>
                </>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`image-dropzone-placeholder ${isDragActive ? 'is-dragging' : ''}`}
          onClick={handlePick}
          onDragOver={(event) => {
            if (!canInteract) {
              return
            }
            event.preventDefault()
            setIsDragActive(true)
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return
            }
            setIsDragActive(false)
          }}
          onDrop={handleDrop}
        >
          <MaterialIcon name="photo" className="image-dropzone-fallback-icon" size={48} decorative />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="image-dropzone-input"
        disabled={!canInteract}
        onChange={(event) => {
          const picked = event.target.files?.[0]
          if (picked) {
            onPickFile(picked)
            setIsConfirmingClear(false)
          }
          event.currentTarget.value = ''
        }}
      />

      {!hasImage && <p className="image-dropzone-hint">{hint}</p>}
    </section>
  )
}
