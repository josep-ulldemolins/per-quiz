// Shared by the client and the server: the front matter of the theory files and what a free account sees of them.
import type { Lang } from './exam.ts'

/** General pages shown before the topics: what the PER is and how to study for it. Free for everybody. */
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
  /** true when the body was cut short for a free account */
  locked: boolean
}

const STATUSES: TheoryStatus[] = ['placeholder', 'draft', 'reviewed']

/** Front matter is a block of `key: value` lines between `---` fences; `source` may repeat and ` # …` is a comment. */
export function parseTheory(raw: string, lang: Lang): TheoryDoc {
  const text = raw.replace(/\r\n?/g, '\n')
  const doc: TheoryDoc = { status: 'draft', updated: null, sources: [], body: text, lang, locked: false }
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

/** The introduction and the first section: everything before the second `## ` heading outside a code block. */
export function firstSection(body: string) {
  let fenced = false
  let headings = 0
  let offset = 0
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced
    else if (!fenced && line.startsWith('## ') && ++headings === 2) return body.slice(0, offset).trimEnd() + '\n'
    offset += line.length + 1
  }
  return body
}
