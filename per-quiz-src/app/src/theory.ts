import type { Lang } from '../shared/exam.ts'
import { api, ApiError } from './api.ts'
import type { TheoryDoc } from '../shared/theory.ts'

// The theory text comes from the Worker (content/temario/<topic>.<lang>.md, packed by scripts/theory.mjs), which
// holds part of it back for free accounts. Its images are bundled here, so adding one needs no code change.
const images = import.meta.glob<string>('../content/temario/img/*', { query: '?url', import: 'default', eager: true })

export { GUIDES, type TheoryDoc, type TheoryStatus } from '../shared/theory.ts'

/** The topic in the language asked for, else in the other one; null when neither file exists. */
export async function loadTheory(topic: string, lang: Lang): Promise<TheoryDoc | null> {
  try {
    return await api.theory(topic, lang)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

/** `img/foo.webp` points into content/temario/img/; absolute paths and URLs pass through (e.g. /img/<bank figure>). */
export function theoryImage(src: string) {
  if (/^(https?:|data:|\/)/.test(src)) return src
  return images[`../content/temario/${src.replace(/^\.\//, '')}`] ?? src
}
