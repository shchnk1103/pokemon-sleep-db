import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPokemonNews } from '../services/news'
import { useToastStore } from '../stores/toastStore'
import type { PokemonNews } from '../types/news'

type LoadState = 'loading' | 'ready' | 'error'

function formatPublishedAt(dateText: string): string {
  if (!dateText) {
    return '未知时间'
  }

  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) {
    return dateText
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NewsPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [allNews, setAllNews] = useState<PokemonNews[]>([])
  const [activeCategory, setActiveCategory] = useState('全部')
  const [isForceRefreshing, setIsForceRefreshing] = useState(false)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)
  const isRevalidatingRef = useRef(false)

  const loadNews = useCallback(
    async (params: { force?: boolean; background?: boolean } = {}) => {
      const { force = false, background = false } = params
      const loadingId = force ? 'news-force-loading' : 'news-loading'

      if (!background && !force) {
        setLoadState('loading')
      }

      if (!background) {
        showToast({
          id: loadingId,
          message: force ? '正在强制刷新新闻数据...' : '正在加载新闻数据...',
          variant: 'info',
          durationMs: null,
        })
      }

      const result = await fetchPokemonNews({ force })

      if (!background) {
        dismissToast(loadingId)
      }

      if (result.source === 'supabase') {
        setAllNews(result.data)
        setLoadState('ready')
        if (!background) {
          showToast({
            id: force ? 'news-force-done' : 'news-loaded',
            message: result.message ?? `已加载 ${result.total} 条新闻。`,
            variant: 'success',
            durationMs: 3200,
          })
        }

        if (result.fromCache && !background && !isRevalidatingRef.current) {
          isRevalidatingRef.current = true
          void loadNews({ force: true, background: true }).finally(() => {
            isRevalidatingRef.current = false
          })
        }
      } else if (!background) {
        setAllNews([])
        setLoadState('error')
        showToast({
          id: 'news-load-failed',
          message: result.message ?? '新闻加载失败，请稍后重试。',
          variant: 'warning',
          durationMs: 5200,
        })
      }
    },
    [dismissToast, showToast],
  )

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      await loadNews()
      if (cancelled) {
        return
      }
    }

    void run()

    return () => {
      cancelled = true
      dismissToast('news-loading')
      dismissToast('news-force-loading')
    }
  }, [dismissToast, loadNews])

  const handleForceRefresh = async () => {
    if (isForceRefreshing) {
      return
    }

    setIsForceRefreshing(true)
    await loadNews({ force: true })
    setIsForceRefreshing(false)
  }

  const categories = useMemo(() => {
    const items = new Set<string>()
    for (const news of allNews) {
      if (news.category) {
        items.add(news.category)
      }
    }
    return ['全部', ...Array.from(items)]
  }, [allNews])

  const filteredNews = useMemo(() => {
    if (activeCategory === '全部') {
      return allNews
    }
    return allNews.filter((news) => news.category === activeCategory)
  }, [activeCategory, allNews])

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">News</p>
        <h2>新闻</h2>
        <p>展示 Pokemon Sleep 官网相关资讯，支持分类筛选与详情阅读。</p>
      </header>

      <div className="news-category-bar">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`news-category-chip ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {loadState === 'error' && <p className="page-status warning">新闻加载失败，请检查 Supabase 配置后重试。</p>}

      {loadState === 'ready' && filteredNews.length === 0 && <p className="page-status info">当前分类下暂无新闻。</p>}

      <div className="news-grid">
        {filteredNews.map((news) => (
          <Link key={news.id} to={`/news/${encodeURIComponent(news.id)}`} className="news-card-link">
            <article className="dex-card news-card">
              <div className="news-cover-wrap">
                {news.coverImageUrl ? (
                  <img src={news.coverImageUrl} alt={news.title} className="news-cover-image" loading="lazy" />
                ) : (
                  <div className="news-cover-fallback">无封面</div>
                )}
              </div>

              <h3 className="news-title">{news.title}</h3>
              <p className="news-meta">
                <span>{news.category}</span>
                <span>{formatPublishedAt(news.publishedAt)}</span>
              </p>
            </article>
          </Link>
        ))}
      </div>

      <button
        type="button"
        className="news-force-refresh-btn"
        onClick={() => {
          void handleForceRefresh()
        }}
        disabled={isForceRefreshing || loadState === 'loading'}
      >
        {isForceRefreshing || loadState === 'loading' ? '刷新中...' : '强制刷新'}
      </button>
    </section>
  )
}
