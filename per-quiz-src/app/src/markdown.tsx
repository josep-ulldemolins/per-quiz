import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { theoryImage } from './theory.ts'

// A small Markdown reader for the theory files: headings (##–####), paragraphs, lists, block quotes,
// tables, rules, images and inline bold/italic/code/links. It builds React elements, never raw HTML.

export interface Heading {
  id: string
  level: number
  text: string
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const stripInline = (s: string) => s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '')

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`([^`]+)`|!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)/g

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}-${n++}`
    if (m[1] != null) out.push(<strong key={k}>{inline(m[1], k)}</strong>)
    else if (m[2] != null || m[3] != null) out.push(<em key={k}>{inline((m[2] ?? m[3])!, k)}</em>)
    else if (m[4] != null) out.push(<code key={k}>{m[4]}</code>)
    else if (m[6] != null) out.push(<img key={k} src={theoryImage(m[6])} alt={m[5]} loading="lazy" />)
    else if (m[8] != null) {
      const href = m[8]
      out.push(
        href.startsWith('/') ? (
          <Link key={k} to={href}>{inline(m[7], k)}</Link>
        ) : (
          <a key={k} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">
            {inline(m[7], k)}
          </a>
        ),
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableRule = (s: string | undefined) => !!s && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(s)
const cells = (s: string) => s.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
const BULLET = /^\s*[-*+]\s+/
const NUMBER = /^\s*\d+[.)]\s+/

function startsBlock(line: string, next: string | undefined) {
  return /^#{1,4}\s/.test(line) || /^>/.test(line) || BULLET.test(line) || NUMBER.test(line) ||
    /^(-{3,}|\*{3,})\s*$/.test(line) || (line.startsWith('|') && isTableRule(next))
}

function blocks(lines: string[], headings: Heading[], ids: Map<string, number>, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const k = `${key}-${i}`
    if (!line.trim()) {
      i++
      continue
    }
    const h = /^(#{1,4})\s+(.*?)\s*#*$/.exec(line)
    if (h) {
      const level = Math.max(2, h[1].length)
      const text = stripInline(h[2])
      const base = slug(text) || 'seccion'
      const seen = ids.get(base) ?? 0
      ids.set(base, seen + 1)
      const id = seen ? `${base}-${seen + 1}` : base
      headings.push({ id, level, text })
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4'
      out.push(<Tag key={k} id={id}>{inline(h[2], k)}</Tag>)
      i++
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={k} />)
      i++
    } else if (/^>/.test(line)) {
      const inner: string[] = []
      while (i < lines.length && /^>/.test(lines[i])) inner.push(lines[i++].replace(/^>\s?/, ''))
      out.push(<blockquote key={k}>{blocks(inner, headings, ids, k)}</blockquote>)
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const marker = BULLET.test(line) ? BULLET : NUMBER
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        if (marker.test(l)) items.push(l.replace(marker, ''))
        else if (l.trim() && /^\s{2,}/.test(l) && items.length) items[items.length - 1] += ' ' + l.trim()
        else break
        i++
      }
      const List = marker === BULLET ? 'ul' : 'ol'
      out.push(<List key={k}>{items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}</List>)
    } else if (line.startsWith('|') && isTableRule(lines[i + 1])) {
      const head = cells(line)
      const align = cells(lines[i + 1]).map((c) => (c.endsWith(':') ? (c.startsWith(':') ? 'center' : 'right') : undefined))
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      out.push(
        <div key={k} className="table-wrap">
          <table>
            <thead>
              <tr>{head.map((c, j) => <th key={j} style={{ textAlign: align[j] }}>{inline(c, `${k}-h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{head.map((_, j) => <td key={j} style={{ textAlign: align[j] }}>{inline(r[j] ?? '', `${k}-${ri}-${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else {
      const para: string[] = []
      while (i < lines.length && lines[i].trim() && (!para.length || !startsBlock(lines[i], lines[i + 1]))) para.push(lines[i++].trim())
      const text = para.join(' ')
      const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(text)
      out.push(
        img ? (
          <figure key={k}>
            <img src={theoryImage(img[2])} alt={img[1]} loading="lazy" />
            {img[1] && <figcaption>{img[1]}</figcaption>}
          </figure>
        ) : (
          <p key={k}>{inline(text, k)}</p>
        ),
      )
    }
  }
  return out
}

export function renderMarkdown(source: string) {
  const headings: Heading[] = []
  const nodes = blocks(source.replace(/\r\n?/g, '\n').split('\n'), headings, new Map(), 'b')
  return { nodes, headings }
}
