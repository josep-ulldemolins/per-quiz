import { PAPERS, paperTopics, parseSource, type Bank, type Lang, type PaperId, type Question } from '../shared/exam.ts'
import type { Attempt, Progress } from './api.ts'
import { monthName } from './i18n.ts'

// ---------- stats ----------

export interface TopicStat {
  id: string
  total: number
  seen: number
  answers: number
  correct: number
  /** questions whose last answer was right */
  mastered: number
  /** questions whose last answer was wrong */
  review: number
  /** correct / answers, null without answers */
  accuracy: number | null
}

export function topicStats(bank: Bank, progress: Progress): TopicStat[] {
  const by = new Map<string, TopicStat>(
    bank.topics.map((t) => [t.id, { id: t.id, total: 0, seen: 0, answers: 0, correct: 0, mastered: 0, review: 0, accuracy: null }]),
  )
  for (const q of bank.questions) {
    const s = by.get(q.topic)
    if (!s) continue
    s.total++
    const p = progress.questions[q.id]
    if (!p) continue
    s.seen++
    s.answers += p[0]
    s.correct += p[1]
    if (p[2]) s.mastered++
    else s.review++
  }
  for (const s of by.values()) s.accuracy = s.answers ? s.correct / s.answers : null
  return [...by.values()]
}

export function overallStats(progress: Progress, attempts: Attempt[]) {
  let seen = 0
  let answers = 0
  let correct = 0
  let review = 0
  for (const p of Object.values(progress.questions)) {
    seen++
    answers += p[0]
    correct += p[1]
    if (!p[2]) review++
  }
  const sims = attempts.filter((a) => a.finishedAt && a.result?.passed !== null && a.result?.paper)
  return {
    seen,
    answers,
    correct,
    review,
    accuracy: answers ? correct / answers : null,
    simsDone: sims.length,
    simsPassed: sims.filter((a) => a.result?.passed).length,
    timeSpent: attempts.reduce((s, a) => s + a.elapsed, 0),
  }
}

export const pct = (x: number | null | undefined) => (x == null ? '–' : String(Math.round(x * 100)))

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`
  if (m) return `${m} min ${String(s).padStart(2, '0')} s`
  return `${s} s`
}

export function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(ts: number, lang: Lang, withTime = false) {
  return new Intl.DateTimeFormat(lang === 'ca' ? 'ca-ES' : 'es-ES', {
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : { year: 'numeric' }),
  }).format(ts)
}

export function examLabel(bank: Bank, examId: string, lang: Lang) {
  const e = bank.exams.find((x) => x.id === examId)
  if (!e) return examId
  const m = monthName(lang, e.month)
  return `${m[0].toUpperCase()}${m.slice(1)} ${e.year} · ${e.place}`
}

// ---------- building tests ----------

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Random questions with the official distribution: each topic keeps its block of positions on the sheet. */
export function buildSimulation(bank: Bank, paperId: PaperId): string[] {
  const ids: string[] = []
  for (const { topic, count } of paperTopics(bank.topics, PAPERS[paperId])) {
    const pool = bank.questions.filter((q) => q.topic === topic.id)
    ids.push(...shuffle(pool).slice(0, count).map((q) => q.id))
  }
  return ids
}

/** The questions of one sitting, in the order they were printed. */
export function buildRealExam(bank: Bank, examId: string): string[] {
  const found: { id: string; position: number }[] = []
  for (const q of bank.questions) {
    for (const s of q.sources) {
      const { exam, position } = parseSource(s)
      if (exam === examId) found.push({ id: q.id, position })
    }
  }
  return found.sort((a, b) => a.position - b.position).map((f) => f.id)
}

export type Pool = 'all' | 'unseen' | 'wrong' | 'weak' | 'hard' | 'bookmarked'

export const MIN_GLOBAL_ANSWERS = 3

/** Filters for a custom test. Ordered pools (weak, hard) come back worst first; the rest are shuffled. */
export function customPool(
  bank: Bank,
  progress: Progress,
  difficulty: Record<string, [number, number]>,
  topics: string[],
  pool: Pool,
): Question[] {
  const inTopics = bank.questions.filter((q) => !topics.length || topics.includes(q.topic))
  const p = progress.questions
  switch (pool) {
    case 'all':
      return shuffle(inTopics)
    case 'unseen':
      return shuffle(inTopics.filter((q) => !p[q.id]))
    case 'wrong':
      return shuffle(inTopics.filter((q) => p[q.id] && !p[q.id][2]))
    case 'bookmarked':
      return shuffle(inTopics.filter((q) => progress.bookmarks.includes(q.id)))
    case 'weak':
      return inTopics
        .filter((q) => p[q.id] && p[q.id][1] < p[q.id][0])
        .sort((a, b) => {
          const ra = 1 - p[a.id][1] / p[a.id][0]
          const rb = 1 - p[b.id][1] / p[b.id][0]
          return rb - ra || p[b.id][0] - p[a.id][0]
        })
    case 'hard':
      return inTopics
        .filter((q) => (difficulty[q.id]?.[0] ?? 0) >= MIN_GLOBAL_ANSWERS && difficulty[q.id][1] > 0)
        .sort((a, b) => difficulty[b.id][1] / difficulty[b.id][0] - difficulty[a.id][1] / difficulty[a.id][0])
  }
}

/** Questions grouped by topic order, so a mixed test still reads like the exam sheet. */
export function sortByTopic(bank: Bank, questions: Question[]) {
  const order = new Map(bank.topics.map((t, i) => [t.id, i]))
  return [...questions].sort((a, b) => (order.get(a.topic) ?? 0) - (order.get(b.topic) ?? 0))
}

export const LETTERS = ['A', 'B', 'C', 'D']
