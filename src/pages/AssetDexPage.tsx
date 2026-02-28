import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchAssetDexEntries, fetchMainSkillLevels } from '../services/catalogDex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCard, AssetDexCatalog, MainSkillLevel } from '../types/catalog'

type AssetDexPageProps = {
  catalog: AssetDexCatalog
  title: string
  description: string
}

type LoadState = 'loading' | 'ready' | 'error'
type ModalLoadState = 'idle' | 'loading' | 'ready' | 'error'
type ExtraEffectsTable = {
  columns: string[]
  rows: string[][]
}
type ExtraEffectsPopoverState = {
  table: ExtraEffectsTable | null
  left: number
  top: number
  placeAbove: boolean
}

function formatValue(value: number | string | null): string {
  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return '—'
}

function formatExtraEffectCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    const text = value.trim()
    return text.length > 0 ? text : '—'
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return '—'
  }
}

function flattenNamedExtraEffectsField(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'object' || value === null) {
    return [value]
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) {
    return []
  }

  const allPrimitiveValues = entries.every(([, cell]) => {
    const type = typeof cell
    return cell === null || type === 'string' || type === 'number' || type === 'boolean'
  })

  if (allPrimitiveValues) {
    return entries.map(([key, cell]) => ({ level: key, value: cell }))
  }

  const allNumericKeys = entries.every(([key]) => /^\d+$/.test(key))
  if (allNumericKeys) {
    return entries.map(([, cell]) => cell)
  }

  return [value]
}

function normalizeExtraEffectsSource(source: unknown): unknown {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return source
  }

  const record = source as Record<string, unknown>
  const stackEnergy = record.stack_energy ?? record.stackEnergy
  const items = record.items
  const hasNamedFields = stackEnergy !== undefined || items !== undefined

  if (hasNamedFields) {
    const flattenedRows = [
      ...flattenNamedExtraEffectsField(stackEnergy),
      ...flattenNamedExtraEffectsField(items),
    ].filter((entry) => entry !== undefined)

    if (flattenedRows.length === 0) {
      return null
    }

    if (flattenedRows.length === 1) {
      return flattenedRows[0]
    }

    return flattenedRows
  }

  return source
}

function toExtraEffectsTable(extraEffects: unknown): ExtraEffectsTable | null {
  let source = extraEffects

  if (typeof source === 'string') {
    const trimmed = source.trim()
    if (!trimmed) {
      return null
    }

    try {
      source = JSON.parse(trimmed) as unknown
    } catch {
      return {
        columns: ['extra_effects'],
        rows: [[trimmed]],
      }
    }
  }

  if (source === null || source === undefined) {
    return null
  }

  source = normalizeExtraEffectsSource(source)

  if (Array.isArray(source)) {
    if (source.length === 0) {
      return {
        columns: ['extra_effects'],
        rows: [['—']],
      }
    }

    const allObjectRows = source.every(
      (item) => typeof item === 'object' && item !== null && !Array.isArray(item),
    )

    if (!allObjectRows) {
      return {
        columns: ['extra_effects'],
        rows: source.map((item) => [formatExtraEffectCell(item)]),
      }
    }

    const columns: string[] = []
    for (const row of source) {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        if (!columns.includes(key)) {
          columns.push(key)
        }
      }
    }

    if (columns.length === 0) {
      return {
        columns: ['extra_effects'],
        rows: [['—']],
      }
    }

    const rows = source.map((row) => {
      const record = row as Record<string, unknown>
      return columns.map((column) => formatExtraEffectCell(record[column]))
    })

    return { columns, rows }
  }

  if (typeof source === 'object') {
    const entries = Object.entries(source as Record<string, unknown>)
    if (entries.length === 0) {
      return {
        columns: ['key', 'value'],
        rows: [['—', '—']],
      }
    }

    return {
      columns: ['key', 'value'],
      rows: entries.map(([key, value]) => [key, formatExtraEffectCell(value)]),
    }
  }

  return {
    columns: ['extra_effects'],
    rows: [[formatExtraEffectCell(source)]],
  }
}

function renderMetaRows(catalog: AssetDexCatalog, item: AssetDexCard) {
  switch (catalog) {
    case 'ingredients':
      return (
        <>
          <div>
            <dt>ID</dt>
            <dd>{item.id}</dd>
          </div>
          <div>
            <dt>chinese_name</dt>
            <dd>{formatValue(item.chineseName)}</dd>
          </div>
          <div>
            <dt>energy</dt>
            <dd>{formatValue(item.energy)}</dd>
          </div>
          <div>
            <dt>price</dt>
            <dd>{formatValue(item.price)}</dd>
          </div>
        </>
      )

    case 'mainskills':
      return (
        <>
          <div>
            <dt>ID</dt>
            <dd>{item.id}</dd>
          </div>
          <div>
            <dt>chinese_name</dt>
            <dd>{formatValue(item.chineseName)}</dd>
          </div>
          <div>
            <dt>description</dt>
            <dd>{formatValue(item.description)}</dd>
          </div>
        </>
      )

    case 'subskills':
      return (
        <>
          <div>
            <dt>ID</dt>
            <dd>{item.id}</dd>
          </div>
          <div>
            <dt>name</dt>
            <dd>{formatValue(item.name)}</dd>
          </div>
          <div>
            <dt>description</dt>
            <dd>{formatValue(item.description)}</dd>
          </div>
          <div>
            <dt>value</dt>
            <dd>{formatValue(item.value)}</dd>
          </div>
        </>
      )

    case 'berries':
    default:
      return (
        <>
          <div>
            <dt>ID</dt>
            <dd>{item.id}</dd>
          </div>
          <div>
            <dt>chinese_name</dt>
            <dd>{formatValue(item.chineseName)}</dd>
          </div>
          <div>
            <dt>attribute</dt>
            <dd>{formatValue(item.attribute)}</dd>
          </div>
          <div>
            <dt>enery_min</dt>
            <dd>{formatValue(item.eneryMin)}</dd>
          </div>
          <div>
            <dt>enery_max</dt>
            <dd>{formatValue(item.eneryMax)}</dd>
          </div>
        </>
      )
  }
}

function AssetCard({
  item,
  catalog,
  onClick,
}: {
  item: AssetDexCard
  catalog: AssetDexCatalog
  onClick?: (item: AssetDexCard) => void
}) {
  const effectClass = catalog === 'subskills' ? `subskill-effect-${item.effectType}` : ''
  const altText = item.chineseName ?? item.name ?? `ID ${item.id}`
  const clickable = catalog === 'mainskills' && typeof onClick === 'function'

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!clickable) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick(item)
    }
  }

  return (
    <article
      className={`dex-card asset-dex-card ${effectClass} ${clickable ? 'asset-dex-card-clickable' : ''}`.trim()}
      onClick={clickable ? () => onClick(item) : undefined}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="asset-dex-image-wrap">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={altText} className="asset-dex-image" loading="lazy" />
        ) : (
          <div className="asset-dex-image-fallback">无图片</div>
        )}
      </div>

      <dl className="asset-dex-meta">{renderMetaRows(catalog, item)}</dl>
    </article>
  )
}

export function AssetDexPage({ catalog, title, description }: AssetDexPageProps) {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<AssetDexCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [selectedMainSkill, setSelectedMainSkill] = useState<AssetDexCard | null>(null)
  const [mainSkillLevels, setMainSkillLevels] = useState<MainSkillLevel[]>([])
  const [modalLoadState, setModalLoadState] = useState<ModalLoadState>('idle')
  const [modalMessage, setModalMessage] = useState('')
  const [extraEffectsPopover, setExtraEffectsPopover] = useState<ExtraEffectsPopoverState | null>(null)
  const modalLoadSeqRef = useRef(0)
  const closeExtraEffectsTimerRef = useRef<number | null>(null)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)

  useEffect(() => {
    let cancelled = false
    const loadingToastId = `catalog-loading-${catalog}`

    const run = async () => {
      setLoadState('loading')
      showToast({
        id: loadingToastId,
        message: `正在加载${title}数据...`,
        variant: 'info',
        durationMs: null,
      })

      const result = await fetchAssetDexEntries(catalog)

      if (cancelled) {
        return
      }

      dismissToast(loadingToastId)

      if (result.source === 'supabase') {
        setEntries(result.data)
        setLoadState('ready')
        showToast({
          id: `catalog-loaded-${catalog}`,
          message: `${title}已就绪：${result.total} 条。`,
          variant: 'success',
          durationMs: 3800,
        })
      } else {
        setEntries([])
        setLoadState('error')
        showToast({
          id: `catalog-failed-${catalog}`,
          message: result.message ?? `${title}加载失败，请稍后重试。`,
          variant: 'warning',
          durationMs: 5200,
        })
      }
    }

    void run()

    return () => {
      cancelled = true
      dismissToast(loadingToastId)
    }
  }, [catalog, dismissToast, showToast, title])

  useEffect(() => {
    if (!selectedMainSkill) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMainSkill(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedMainSkill])

  const closeMainSkillModal = () => {
    if (closeExtraEffectsTimerRef.current !== null) {
      window.clearTimeout(closeExtraEffectsTimerRef.current)
      closeExtraEffectsTimerRef.current = null
    }

    setSelectedMainSkill(null)
    setMainSkillLevels([])
    setModalLoadState('idle')
    setModalMessage('')
    setExtraEffectsPopover(null)
  }

  const openMainSkillModal = async (item: AssetDexCard) => {
    if (catalog !== 'mainskills') {
      return
    }

    setSelectedMainSkill(item)
    setMainSkillLevels([])
    setModalLoadState('loading')
    setModalMessage('')
    modalLoadSeqRef.current += 1
    const currentSeq = modalLoadSeqRef.current

    const result = await fetchMainSkillLevels(item.id)
    if (currentSeq !== modalLoadSeqRef.current) {
      return
    }

    if (result.source === 'supabase') {
      setMainSkillLevels(result.data)
      setModalLoadState('ready')
    } else {
      setMainSkillLevels([])
      setModalLoadState('error')
      setModalMessage(result.message ?? '主技能等级数据加载失败，请稍后重试。')
    }
  }

  const closeExtraEffectsPopoverNow = () => {
    if (closeExtraEffectsTimerRef.current !== null) {
      window.clearTimeout(closeExtraEffectsTimerRef.current)
      closeExtraEffectsTimerRef.current = null
    }
    setExtraEffectsPopover(null)
  }

  const scheduleCloseExtraEffectsPopover = () => {
    if (closeExtraEffectsTimerRef.current !== null) {
      window.clearTimeout(closeExtraEffectsTimerRef.current)
    }

    closeExtraEffectsTimerRef.current = window.setTimeout(() => {
      setExtraEffectsPopover(null)
      closeExtraEffectsTimerRef.current = null
    }, 180)
  }

  const cancelCloseExtraEffectsPopover = () => {
    if (closeExtraEffectsTimerRef.current !== null) {
      window.clearTimeout(closeExtraEffectsTimerRef.current)
      closeExtraEffectsTimerRef.current = null
    }
  }

  const openExtraEffectsPopover = (extraEffects: unknown, target: HTMLElement) => {
    const tableData = toExtraEffectsTable(extraEffects)
    const rect = target.getBoundingClientRect()
    const gap = 12
    const estimatedHeight = 300
    const viewportPadding = 10
    const placeAbove = rect.bottom + estimatedHeight > window.innerHeight - viewportPadding
    const top = placeAbove ? rect.top - gap : rect.bottom + gap
    const left = rect.left + rect.width / 2

    cancelCloseExtraEffectsPopover()
    setExtraEffectsPopover({
      table: tableData,
      left,
      top,
      placeAbove,
    })
  }

  useEffect(() => {
    return () => {
      if (closeExtraEffectsTimerRef.current !== null) {
        window.clearTimeout(closeExtraEffectsTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!extraEffectsPopover) {
      return
    }

    const hidePopover = () => {
      closeExtraEffectsPopoverNow()
    }

    window.addEventListener('resize', hidePopover)
    window.addEventListener('scroll', hidePopover, true)

    return () => {
      window.removeEventListener('resize', hidePopover)
      window.removeEventListener('scroll', hidePopover, true)
    }
  }, [extraEffectsPopover])

  return (
    <section className="page">
      <header className="section-header asset-dex-header">
        <div>
          <p className="eyebrow">Dex</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {catalog === 'mainskills' && profile?.isAdmin && (
          <Link to="/dex/main-skills/new" className="button primary asset-dex-add-btn">
            add
          </Link>
        )}
      </header>

      {loadState === 'error' && <p className="page-status warning">加载失败，请检查 Supabase 配置后重试。</p>}

      {loadState === 'ready' && entries.length === 0 && <p className="page-status info">暂无可展示的数据。</p>}

      <div className="dex-grid asset-dex-grid">
        {entries.map((entry) => (
          <AssetCard key={`${catalog}-${entry.id}`} item={entry} catalog={catalog} onClick={openMainSkillModal} />
        ))}
      </div>

      {catalog === 'mainskills' && selectedMainSkill && (
        <div
          className="asset-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMainSkillModal()
            }
          }}
        >
          <section
            className="asset-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMainSkill.chineseName ?? selectedMainSkill.name ?? `主技能 ID ${selectedMainSkill.id}`} 等级表`}
          >
            <header className="asset-modal-header">
              <p className="asset-modal-eyebrow">主技能等级</p>
              <h3>{selectedMainSkill.chineseName ?? selectedMainSkill.name ?? `主技能 ID ${selectedMainSkill.id}`}</h3>
            </header>

            {modalLoadState === 'loading' && <p className="page-status inline info">正在加载等级数据...</p>}

            {modalLoadState === 'error' && <p className="page-status warning">{modalMessage}</p>}

            {modalLoadState === 'ready' && mainSkillLevels.length === 0 && (
              <p className="page-status inline info">暂无等级数据。</p>
            )}

            {modalLoadState === 'ready' && mainSkillLevels.length > 0 && (
              <div className="asset-modal-table-wrap">
                <table className="asset-modal-table">
                  <thead>
                    <tr>
                      <th scope="col">level</th>
                      <th scope="col">value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mainSkillLevels.map((row) => (
                      <tr key={`level-${row.level}`}>
                        <td>{row.level}</td>
                        <td>
                          <span className="asset-level-value">
                            <span>{formatValue(row.value)}</span>
                            {row.extraEffects !== null && (
                              <button
                                type="button"
                                className="asset-extra-effects-trigger"
                                aria-label="查看额外效果"
                                aria-haspopup="dialog"
                                onMouseEnter={(event) => {
                                  openExtraEffectsPopover(row.extraEffects, event.currentTarget)
                                }}
                                onMouseLeave={() => {
                                  scheduleCloseExtraEffectsPopover()
                                }}
                                onFocus={(event) => {
                                  openExtraEffectsPopover(row.extraEffects, event.currentTarget)
                                }}
                                onBlur={() => {
                                  scheduleCloseExtraEffectsPopover()
                                }}
                              >
                                !
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {extraEffectsPopover && (
              <section
                className={`asset-extra-effects-popover-floating ${extraEffectsPopover.placeAbove ? 'above' : 'below'}`}
                style={{
                  left: `${extraEffectsPopover.left}px`,
                  top: `${extraEffectsPopover.top}px`,
                }}
                role="dialog"
                aria-label="额外效果详情"
                onMouseEnter={cancelCloseExtraEffectsPopover}
                onMouseLeave={scheduleCloseExtraEffectsPopover}
              >
                {extraEffectsPopover.table ? (
                  <div className="asset-extra-effects-table-wrap">
                    <table className="asset-extra-effects-table">
                      <thead>
                        <tr>
                          {extraEffectsPopover.table.columns.map((column) => (
                            <th key={`extra-popover-col-${column}`} scope="col">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {extraEffectsPopover.table.rows.map((cells, rowIndex) => (
                          <tr key={`extra-popover-row-${rowIndex}`}>
                            {cells.map((cell, cellIndex) => (
                              <td key={`extra-popover-cell-${rowIndex}-${cellIndex}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="asset-extra-effects-empty">无额外效果数据。</p>
                )}
              </section>
            )}
          </section>
        </div>
      )}
    </section>
  )
}
