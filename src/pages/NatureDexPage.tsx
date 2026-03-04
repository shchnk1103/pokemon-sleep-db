import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CardAdminActions } from '../components/CardAdminActions'
import { DexSearchDock } from '../components/DexSearchDock'
import { MaterialIcon } from '../components/MaterialIcon'
import { useAuth } from '../context/AuthContext'
import {
  deleteNatureDexEntry,
  fetchNatureDexEntries,
  invalidateNatureDexCache,
} from '../services/catalogDex'
import { useToastStore } from '../stores/toastStore'
import type { NatureDexCard } from '../types/catalog'

type LoadState = 'loading' | 'ready' | 'error'

type NatureGroup = {
  belong: string
  items: NatureDexCard[]
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

function sortNatures(a: NatureDexCard, b: NatureDexCard): number {
  if (a.id !== b.id) {
    return a.id - b.id
  }
  return a.name.localeCompare(b.name, 'zh-Hans-CN')
}

function scoreBelongName(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : '未分组'
}

function formatNatureName(value: string): string {
  const text = value.trim()
  if (!text) {
    return '-'
  }

  const lowered = text.toLowerCase()
  if (lowered === 'none' || lowered === 'null') {
    return '-'
  }

  return text
}

function formatNatureValue(value: string): string {
  const text = value.trim()
  if (!text) {
    return '-'
  }

  const lowered = text.toLowerCase()
  if (lowered === 'null' || lowered === 'none') {
    return '-'
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return text.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')
  }

  return text
}

function NatureCard({
  nature,
  showAdminActions,
  onEdit,
  onDelete,
}: {
  nature: NatureDexCard
  showAdminActions: boolean
  onEdit: (nature: NatureDexCard) => void
  onDelete: (nature: NatureDexCard) => void
}) {
  return (
    <article className="dex-card nature-card">
      {showAdminActions && (
        <CardAdminActions
          onEdit={() => onEdit(nature)}
          onDelete={() => onDelete(nature)}
          editLabel={`编辑 ${nature.name}`}
          deleteLabel={`删除 ${nature.name}`}
          className="nature-card-admin-actions"
        />
      )}

      <div className="nature-card-head">
        <h3>{nature.name}</h3>
        <span className="nature-card-id">#{nature.id}</span>
      </div>

      <div className="nature-card-effect nature-card-effect-up">
        <div className="nature-card-effect-label">
          <MaterialIcon name="arrow_drop_up" className="nature-effect-icon" size={18} />
          <span>{formatNatureName(nature.upName)}</span>
        </div>
        <strong>{formatNatureValue(nature.upValue)}</strong>
      </div>

      <div className="nature-card-effect nature-card-effect-down">
        <div className="nature-card-effect-label">
          <MaterialIcon name="arrow_drop_down" className="nature-effect-icon" size={18} />
          <span>{formatNatureName(nature.downName)}</span>
        </div>
        <strong>{formatNatureValue(nature.downValue)}</strong>
      </div>
    </article>
  )
}

export function NatureDexPage() {
  const { profile, session } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<NatureDexCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<NatureDexCard | null>(null)
  const [isDeletingEntry, setIsDeletingEntry] = useState(false)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)

  const canManageCatalog = Boolean(profile?.isAdmin && session)

  useEffect(() => {
    let cancelled = false
    const loadingToastId = 'nature-dex-loading'

    const run = async () => {
      setLoadState('loading')
      showToast({
        id: loadingToastId,
        message: '正在加载性格图鉴数据...',
        variant: 'info',
        durationMs: null,
      })

      const result = await fetchNatureDexEntries()
      if (cancelled) {
        return
      }

      dismissToast(loadingToastId)

      if (result.source === 'supabase') {
        setEntries(result.data)
        setLoadState('ready')
        showToast({
          id: 'nature-dex-loaded',
          message: `性格图鉴已就绪：${result.total} 条。`,
          variant: 'success',
          durationMs: 3800,
        })
        return
      }

      setEntries([])
      setLoadState('error')
      showToast({
        id: 'nature-dex-failed',
        message: result.message ?? '性格图鉴加载失败，请稍后重试。',
        variant: 'warning',
        durationMs: 5200,
      })
    }

    void run()

    return () => {
      cancelled = true
      dismissToast(loadingToastId)
    }
  }, [dismissToast, showToast])

  const filteredEntries = useMemo(() => {
    const query = normalizeText(searchQuery)
    if (!query) {
      return [...entries].sort(sortNatures)
    }

    return entries
      .filter((item) => {
        const source = [
          String(item.id),
          item.name,
          item.belong,
          item.upName,
          item.upValue,
          item.downName,
          item.downValue,
        ]
          .join(' ')
          .toLowerCase()
        return source.includes(query)
      })
      .sort(sortNatures)
  }, [entries, searchQuery])

  const groupedEntries = useMemo<NatureGroup[]>(() => {
    const groupMap = new Map<string, NatureDexCard[]>()

    for (const item of filteredEntries) {
      const key = scoreBelongName(item.belong)
      const bucket = groupMap.get(key)
      if (bucket) {
        bucket.push(item)
      } else {
        groupMap.set(key, [item])
      }
    }

    return [...groupMap.entries()]
      .map(([belong, items]) => ({ belong, items: items.sort(sortNatures) }))
      .sort((a, b) => a.belong.localeCompare(b.belong, 'zh-Hans-CN'))
  }, [filteredEntries])

  const openCatalogEdit = (item: NatureDexCard) => {
    navigate(`/dex/natures/${item.id}/edit`)
  }

  const confirmDeleteEntry = async () => {
    if (!pendingDeleteEntry || !session || isDeletingEntry) {
      return
    }

    setIsDeletingEntry(true)
    try {
      await deleteNatureDexEntry(session, pendingDeleteEntry.id)
      invalidateNatureDexCache()
      setEntries((current) => current.filter((entry) => entry.id !== pendingDeleteEntry.id))
      setPendingDeleteEntry(null)
      showToast({
        id: `nature-delete-success-${pendingDeleteEntry.id}`,
        message: `已删除性格 #${pendingDeleteEntry.id}。`,
        variant: 'success',
        durationMs: 3200,
      })
    } catch (error) {
      showToast({
        id: `nature-delete-failed-${pendingDeleteEntry.id}`,
        message: error instanceof Error ? error.message : '删除失败，请稍后重试。',
        variant: 'warning',
        durationMs: 4200,
      })
    } finally {
      setIsDeletingEntry(false)
    }
  }

  return (
    <section className="page">
      <header className="section-header asset-dex-header">
        <div>
          <p className="eyebrow">Dex</p>
          <h2>性格图鉴</h2>
          <p>按 belong 分区展示所有性格，并标记积极与消极影响。</p>
        </div>
        {canManageCatalog && (
          <Link to="/dex/natures/new" className="button primary asset-dex-add-btn" aria-label="新增性格">
            <MaterialIcon name="add" className="asset-dex-add-icon" size={22} />
          </Link>
        )}
      </header>

      <DexSearchDock
        query={searchQuery}
        onQueryChange={setSearchQuery}
        enabled={loadState === 'ready'}
        inputId="nature-dex-search"
        ariaLabel="搜索性格图鉴"
        placeholder={loadState === 'ready' ? '搜索 ID、名称、分组或增减项...' : '图鉴加载中，搜索暂不可用...'}
      />

      {loadState === 'error' && <p className="page-status warning">加载失败，请检查 Supabase 配置后重试。</p>}

      {loadState === 'ready' && groupedEntries.length === 0 && (
        <p className="page-status info">{searchQuery.trim() ? '没有匹配到结果。' : '暂无可展示的数据。'}</p>
      )}

      <div className="nature-dex-groups">
        {groupedEntries.map((group) => (
          <section key={group.belong} className="nature-dex-group">
            <header className="nature-dex-group-head">
              <h3>{group.belong}</h3>
              <span>{group.items.length} 条</span>
            </header>
            <div className="dex-grid nature-dex-grid">
              {group.items.map((entry) => (
                <NatureCard
                  key={`nature-${entry.id}`}
                  nature={entry}
                  showAdminActions={canManageCatalog}
                  onEdit={openCatalogEdit}
                  onDelete={(item) => {
                    setPendingDeleteEntry(item)
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {canManageCatalog && pendingDeleteEntry && (
        <div
          className="asset-delete-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeletingEntry) {
              setPendingDeleteEntry(null)
            }
          }}
        >
          <section className="asset-delete-confirm-panel" role="dialog" aria-modal="true" aria-label="删除性格确认">
            <p className="asset-delete-confirm-title">确认删除？</p>
            <p className="asset-delete-confirm-text">
              即将删除：
              <strong>{pendingDeleteEntry.name || `ID ${pendingDeleteEntry.id}`}</strong>
              。此操作不可撤销。
            </p>
            <div className="asset-delete-confirm-actions">
              <button
                type="button"
                className="button ghost"
                disabled={isDeletingEntry}
                onClick={() => setPendingDeleteEntry(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="button primary asset-delete-confirm-danger"
                disabled={isDeletingEntry}
                onClick={confirmDeleteEntry}
              >
                {isDeletingEntry ? '删除中...' : '确认删除'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
