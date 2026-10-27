import type { AttemptKind, Bank, GradeResult, Lang, PaperId } from '../shared/exam.ts'
import type { Access, PlanId } from '../shared/plans.ts'
import type { TheoryDoc, TheoryStatus } from '../shared/theory.ts'

export type Theme = 'system' | 'light' | 'dark'

export interface User {
  id: number
  name: string
  email: string
  lang: Lang
  qLang: Lang
  theme: Theme
  createdAt: number
}

export interface Attempt {
  id: string
  kind: AttemptKind
  paper: PaperId | null
  title: string
  mode: 'practice' | 'exam'
  config: Record<string, unknown>
  questionIds: string[]
  timeLimit: number | null
  startedAt: number
  finishedAt: number | null
  elapsed: number
  result: GradeResult | null
  answered: number
  answers?: Record<string, string>
}

/** [times answered, times correct, last answer correct (0/1), last answered at] */
export type QuestionProgress = [number, number, number, number]

export interface Progress {
  questions: Record<string, QuestionProgress>
  bookmarks: string[]
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'generic')
  return data as T
}

export const api = {
  bank: () => request<Bank>('GET', '/bank'),
  me: () => request<{ user: User }>('GET', '/me'),
  login: (email: string, password: string) => request<{ user: User }>('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string, lang: Lang) =>
    request<{ user: User }>('POST', '/auth/register', { name, email, password, lang }),
  logout: () => request('POST', '/auth/logout'),
  updateMe: (patch: Partial<Pick<User, 'name' | 'lang' | 'qLang' | 'theme'>>) => request<{ user: User }>('PATCH', '/me', patch),
  resetProgress: () => request('DELETE', '/me/progress'),
  progress: () => request<Progress>('GET', '/progress'),
  difficulty: () => request<Record<string, [number, number]>>('GET', '/difficulty'),
  bookmark: (qid: string, on: boolean) => request(on ? 'PUT' : 'DELETE', `/bookmarks/${encodeURIComponent(qid)}`),
  attempts: () => request<Attempt[]>('GET', '/attempts'),
  attempt: (id: string) => request<Attempt>('GET', `/attempts/${id}`),
  createAttempt: (a: {
    kind: AttemptKind
    paper: PaperId | null
    title: string
    mode: 'practice' | 'exam'
    questionIds: string[]
    timeLimit: number | null
    config?: Record<string, unknown>
  }) => request<Attempt>('POST', '/attempts', a),
  answer: (id: string, qid: string, choice: string, elapsed: number) =>
    request<{ correct: boolean }>('PUT', `/attempts/${id}/answers/${encodeURIComponent(qid)}`, { choice, elapsed }),
  finish: (id: string, elapsed: number) => request<Attempt>('POST', `/attempts/${id}/finish`, { elapsed }),
  deleteAttempt: (id: string) => request('DELETE', `/attempts/${id}`),
  access: () => request<Access>('GET', '/access'),
  checkout: (plan: PlanId) => request<{ url: string }>('POST', '/billing/checkout', { plan }),
  confirmPayment: (session: string) => request<Access>('POST', '/billing/confirm', { session }),
  theoryIndex: () => request<Record<string, TheoryStatus>>('GET', '/theory'),
  theory: (id: string, lang: Lang) => request<TheoryDoc>('GET', `/theory/${encodeURIComponent(id)}/${lang}`),
}
