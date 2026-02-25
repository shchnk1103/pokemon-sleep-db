import { useEffect, useState } from 'react'
import { fetchAssetDexEntries } from '../services/catalogDex'
import { useToastStore } from '../stores/toastStore'
import type { AssetDexCard, AssetDexCatalog } from '../types/catalog'

type AssetDexPageProps = {
  catalog: AssetDexCatalog
  title: string
  description: string
}

type LoadState = 'loading' | 'ready' | 'error'

function formatValue(value: number | string | null): string {
  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return '—'
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

function AssetCard({ item, catalog }: { item: AssetDexCard; catalog: AssetDexCatalog }) {
  const effectClass = catalog === 'subskills' ? `subskill-effect-${item.effectType}` : ''
  const altText = item.chineseName ?? item.name ?? `ID ${item.id}`

  return (
    <article className={`dex-card asset-dex-card ${effectClass}`.trim()}>
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
  const [entries, setEntries] = useState<AssetDexCard[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
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

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">Dex</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      {loadState === 'error' && <p className="page-status warning">加载失败，请检查 Supabase 配置后重试。</p>}

      {loadState === 'ready' && entries.length === 0 && <p className="page-status info">暂无可展示的数据。</p>}

      <div className="dex-grid asset-dex-grid">
        {entries.map((entry) => (
          <AssetCard key={`${catalog}-${entry.id}`} item={entry} catalog={catalog} />
        ))}
      </div>
    </section>
  )
}
