import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { fetchPokemonNews, fetchPokemonNewsById } from '../services/news'
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

export function NewsDetailPage() {
  const { newsId } = useParams()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [item, setItem] = useState<PokemonNews | null>(null)
  const [isCoverLoading, setIsCoverLoading] = useState(true)
  const [isCoverError, setIsCoverError] = useState(false)
  const showToast = useToastStore((state) => state.showToast)
  const dismissToast = useToastStore((state) => state.dismissToast)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [newsId])

  useEffect(() => {
    if (item?.coverImageUrl) {
      setIsCoverLoading(true)
      setIsCoverError(false)
      return
    }

    setIsCoverLoading(false)
    setIsCoverError(false)
  }, [item?.coverImageUrl])

  useEffect(() => {
    let cancelled = false
    const loadingId = 'news-detail-loading'
    const resolvedId = decodeURIComponent(newsId ?? '')

    const run = async () => {
      if (!resolvedId) {
        setLoadState('error')
        return
      }

      setLoadState('loading')
      showToast({
        id: loadingId,
        message: '正在加载新闻详情...',
        variant: 'info',
        durationMs: null,
      })

      const exactItem = await fetchPokemonNewsById(resolvedId)
      if (cancelled) {
        return
      }
      dismissToast(loadingId)

      if (exactItem) {
        setItem(exactItem)
        setLoadState('ready')
        return
      }

      const result = await fetchPokemonNews()
      if (cancelled) {
        return
      }

      if (result.source !== 'supabase') {
        setItem(null)
        setLoadState('error')
        showToast({
          id: 'news-detail-failed',
          message: result.message ?? '新闻详情加载失败。',
          variant: 'warning',
          durationMs: 5200,
        })
        return
      }

      const matched = result.data.find((news) => news.id === resolvedId) ?? null
      setItem(matched)
      setLoadState(matched ? 'ready' : 'error')
    }

    void run()

    return () => {
      cancelled = true
      dismissToast(loadingId)
    }
  }, [dismissToast, newsId, showToast])

  const contentText = useMemo(() => item?.content ?? '', [item?.content])

  if (loadState === 'error') {
    return (
      <section className="page">
        <p className="page-status warning">未找到对应新闻或加载失败。</p>
        <Link to="/news" className="button ghost news-back-btn">
          返回新闻列表
        </Link>
      </section>
    )
  }

  if (!item) {
    return (
      <section className="page">
        <p className="page-status info">新闻加载中...</p>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="section-header">
        <p className="eyebrow">News Detail</p>
        <h2>{item.title}</h2>
        <p>
          <span>{item.category}</span> · <span>{formatPublishedAt(item.publishedAt)}</span>
        </p>
      </header>

      <Link to="/news" className="button ghost news-back-btn">
        返回新闻列表
      </Link>

      <article className="dex-card news-detail-card">
        {item.coverImageUrl && (
          <div className="news-detail-cover-wrap">
            {isCoverLoading && (
              <div className="news-detail-cover-loading" aria-live="polite">
                <span className="loading-spinner" />
                <span>封面加载中...</span>
              </div>
            )}
            {isCoverError && !isCoverLoading && <div className="news-detail-cover-fallback">封面加载失败</div>}
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className={`news-detail-cover ${isCoverLoading ? 'is-hidden' : ''}`}
              onLoad={() => {
                setIsCoverLoading(false)
                setIsCoverError(false)
              }}
              onError={() => {
                setIsCoverLoading(false)
                setIsCoverError(true)
              }}
            />
          </div>
        )}

        <MarkdownRenderer content={contentText} className="news-detail-content news-markdown-content" />
      </article>
    </section>
  )
}
