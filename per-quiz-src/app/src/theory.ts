import type { Lang } from '../shared/exam.ts'

// Theory lives in content/temario/<topic>.<lang>.md. Vite picks up every file that matches, so adding a
// topic's text needs no code change. Each file is its own chunk and only loads when its page opens.
const files = import.meta.glob<string>('../content/temario/*.md', { query: '?raw', import: 'default' })
const images = import.meta.glob<string>('../content/temario/img/*', { query: '?url', import: 'default', eager: true })

/** General pages shown before the topics: what the PER is and how to study for it. */
export const GUIDES = ['per', 'plan'] as const

/** placeholder: outline only, not for studying · draft: written, not yet checked · reviewed: checked against its sources */
export type TheoryStatus = 'placeholder' | 'draft' | 'reviewed'

export interface TheoryDoc {
  status: TheoryStatus
  /** ISO date of the last review, when given */
  updated: string | null
  sources: string[]
  body: string
  /** language the text is in; differs from the one asked for when it falls back */
  lang: Lang
}

const STATUSES: TheoryStatus[] = ['placeholder', 'draft', 'reviewed']

/** Front matter is a block of `key: value` lines between `---` fences; `source` may repeat and ` # …` is a comment. */
export function parseTheory(raw: string, lang: Lang): TheoryDoc {
  const text = raw.replace(/\r\n?/g, '\n')
  const doc: TheoryDoc = { status: 'draft', updated: null, sources: [], body: text, lang }
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return doc
  doc.body = text.slice(m[0].length)
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    const value = line.slice(i + 1).replace(/\s+#.*$/, '').trim()
    if (key === 'status' && STATUSES.includes(value as TheoryStatus)) doc.status = value as TheoryStatus
    else if (key === 'updated' && value) doc.updated = value
    else if (key === 'source' && value) doc.sources.push(value)
  }
  return doc
}

/** The topic in the language asked for, else in the other one; null when neither file exists. */
export async function loadTheory(topic: string, lang: Lang): Promise<TheoryDoc | null> {
  for (const l of [lang, lang === 'es' ? 'ca' : 'es'] as Lang[]) {
    const load = files[`../content/temario/${topic}.${l}.md`]
    if (load) return parseTheory(await load(), l)
  }
  return null
}

/** `img/foo.webp` points into content/temario/img/; absolute paths and URLs pass through (e.g. /img/<bank figure>). */
export function theoryImage(src: string) {
  if (/^(https?:|data:|\/)/.test(src)) return src
  return images[`../content/temario/${src.replace(/^\.\//, '')}`] ?? src
}
