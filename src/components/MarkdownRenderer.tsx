import type { ReactNode } from 'react'

type MarkdownRendererProps = {
  content: string
  className?: string
}

function sanitizeUrl(raw: string): string {
  const value = raw.trim()
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('#') ||
    value.startsWith('mailto:')
  ) {
    return value
  }
  return '#'
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  const chunks = text.split(tokenRegex).filter((item) => item.length > 0)

  return chunks.map((chunk, index) => {
    const key = `${keyPrefix}-${index}`
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return <strong key={key}>{chunk.slice(2, -2)}</strong>
    }
    if (chunk.startsWith('*') && chunk.endsWith('*')) {
      return <em key={key}>{chunk.slice(1, -1)}</em>
    }
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return <code key={key}>{chunk.slice(1, -1)}</code>
    }

    const linkMatch = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      const [, label, url] = linkMatch
      const href = sanitizeUrl(url)
      return (
        <a key={key} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      )
    }

    return <span key={key}>{chunk}</span>
  })
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0
  let blockId = 0

  while (index < lines.length) {
    const currentLine = lines[index]

    if (!currentLine.trim()) {
      index += 1
      continue
    }

    if (currentLine.startsWith('```')) {
      const fenceLang = currentLine.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) {
        index += 1
      }

      blocks.push(
        <pre key={`code-${blockId++}`} className="markdown-code-block">
          <code data-language={fenceLang || undefined}>{codeLines.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const headingMatch = currentLine.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const contentText = headingMatch[2]
      const inline = parseInline(contentText, `heading-${blockId}`)
      const key = `heading-${blockId++}`

      if (level === 1) blocks.push(<h1 key={key}>{inline}</h1>)
      else if (level === 2) blocks.push(<h2 key={key}>{inline}</h2>)
      else if (level === 3) blocks.push(<h3 key={key}>{inline}</h3>)
      else if (level === 4) blocks.push(<h4 key={key}>{inline}</h4>)
      else if (level === 5) blocks.push(<h5 key={key}>{inline}</h5>)
      else blocks.push(<h6 key={key}>{inline}</h6>)
      index += 1
      continue
    }

    if (currentLine.startsWith('>')) {
      const quoteLines: string[] = []
      while (index < lines.length && lines[index].startsWith('>')) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push(
        <blockquote key={`quote-${blockId++}`}>{parseInline(quoteLines.join(' '), `quote-inline-${blockId}`)}</blockquote>,
      )
      continue
    }

    if (/^[-*+]\s+/.test(currentLine)) {
      const items: ReactNode[] = []
      while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
        const itemText = lines[index].replace(/^[-*+]\s+/, '')
        items.push(<li key={`ul-${blockId}-${items.length}`}>{parseInline(itemText, `ul-inline-${blockId}-${items.length}`)}</li>)
        index += 1
      }
      blocks.push(<ul key={`ul-${blockId++}`}>{items}</ul>)
      continue
    }

    if (/^\d+\.\s+/.test(currentLine)) {
      const items: ReactNode[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        const itemText = lines[index].replace(/^\d+\.\s+/, '')
        items.push(<li key={`ol-${blockId}-${items.length}`}>{parseInline(itemText, `ol-inline-${blockId}-${items.length}`)}</li>)
        index += 1
      }
      blocks.push(<ol key={`ol-${blockId++}`}>{items}</ol>)
      continue
    }

    const paragraphLines: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('```') &&
      !lines[index].startsWith('>') &&
      !/^[-*+]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^(#{1,6})\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim())
      index += 1
    }
    blocks.push(
      <p key={`p-${blockId++}`}>{parseInline(paragraphLines.join(' '), `p-inline-${blockId}`)}</p>,
    )
  }

  return blocks
}

/**
 * Global reusable markdown renderer.
 * Supports headings, lists, quote, fenced code, inline strong/em/code and links.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const rendered = renderMarkdown(content || '')
  if (rendered.length === 0) {
    return <div className={className}>暂无正文</div>
  }

  return <div className={className}>{rendered}</div>
}
