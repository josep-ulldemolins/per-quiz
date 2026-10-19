// Shared by the client and the server: the bank's shape and the official pass rules.

export type Lang = 'es' | 'ca'

export interface Topic {
  id: string
  name: string
  from: number
  to: number
}

export interface ExamMeta {
  id: string
  file: string
  year: number
  month: number
  place: string
  version: number
  annulled: number[]
}

export interface Option {
  id: string
  es: string
  ca: string
}

export interface Question {
  id: string
  topic: string
  es: string
  ca: string
  options: Option[]
  answer: string
  image: string | null
  sources: string[]
  disputed?: boolean
}

export interface Bank {
  generated: string
  topics: Topic[]
  exams: ExamMeta[]
  questions: Question[]
}

/** Official paper: which positions of the 45-question sheet it covers and how many errors it allows. */
export interface Paper {
  id: PaperId
  from: number
  to: number
  maxErrors: number
  topicMaxErrors: Record<string, number>
}

export type PaperId = 'per' | 'pnb' | 'comp'

export const PAPERS: Record<PaperId, Paper> = {
  per: { id: 'per', from: 1, to: 45, maxErrors: 13, topicMaxErrors: { balizamiento: 2, ripa: 5, carta: 2 } },
  pnb: { id: 'pnb', from: 1, to: 27, maxErrors: 10, topicMaxErrors: { balizamiento: 2, ripa: 5 } },
  comp: { id: 'comp', from: 28, to: 45, maxErrors: 3, topicMaxErrors: { carta: 2 } },
}

export type AttemptKind = 'simulation' | 'real' | 'custom' | 'mistakes'

export interface GradeCheck {
  /** 'total' or a topic id */
  key: string
  errors: number
  max: number
  ok: boolean
}

export interface GradeResult {
  total: number
  correct: number
  wrong: number
  unanswered: number
  /** null when the test is not graded against an official paper */
  passed: boolean | null
  paper: PaperId | null
  checks: GradeCheck[]
  byTopic: Record<string, { total: number; correct: number }>
}

/** Topics a paper covers, with how many questions of each it asks. */
export function paperTopics(topics: Topic[], paper: Paper) {
  return topics
    .filter((t) => t.to >= paper.from && t.from <= paper.to)
    .map((t) => ({ topic: t, count: Math.min(t.to, paper.to) - Math.max(t.from, paper.from) + 1 }))
}

/** Unanswered questions count as errors, as on the official answer sheet. */
export function grade(
  questions: Pick<Question, 'id' | 'topic' | 'answer'>[],
  answers: Record<string, string | null | undefined>,
  paperId: PaperId | null,
): GradeResult {
  const byTopic: GradeResult['byTopic'] = {}
  let correct = 0
  let unanswered = 0
  for (const q of questions) {
    const t = (byTopic[q.topic] ??= { total: 0, correct: 0 })
    t.total++
    const a = answers[q.id]
    if (!a) unanswered++
    else if (a === q.answer) {
      correct++
      t.correct++
    }
  }
  const total = questions.length
  const errors = total - correct
  const result: GradeResult = {
    total,
    correct,
    wrong: errors - unanswered,
    unanswered,
    passed: null,
    paper: paperId,
    checks: [],
    byTopic,
  }
  if (paperId) {
    const paper = PAPERS[paperId]
    result.checks.push({ key: 'total', errors, max: paper.maxErrors, ok: errors <= paper.maxErrors })
    for (const [topic, max] of Object.entries(paper.topicMaxErrors)) {
      const t = byTopic[topic] ?? { total: 0, correct: 0 }
      const e = t.total - t.correct
      result.checks.push({ key: topic, errors: e, max, ok: e <= max })
    }
    result.passed = result.checks.every((c) => c.ok)
  }
  return result
}

/** "2026-06-bcn-1#18" → { exam: "2026-06-bcn-1", position: 18 } */
export function parseSource(source: string) {
  const [exam, pos] = source.split('#')
  return { exam, position: Number(pos) }
}
