// Shared by the client and the server: what each plan unlocks.
import { sortExams, type Bank } from './exam.ts'

export type PlanId = 'semester' | 'lifetime'

export const PLAN_IDS: PlanId[] = ['semester', 'lifetime']

/** How long a semester plan lasts, in months. */
export const SEMESTER_MONTHS = 6

export interface Access {
  /** true while a paid plan is active */
  premium: boolean
  plan: PlanId | null
  /** null for the lifetime plan or without a plan */
  expiresAt: number | null
  /** exams (simulations and real papers) started today, Madrid time */
  examsToday: number
  /** exams a free account may start per day */
  examsPerDay: number
  /** the one real paper a free account may sit */
  freeExam: string | null
  /** prices in euro cents */
  prices: Record<PlanId, number>
  /** false when the server has no Stripe keys */
  billing: boolean
}

/** Free accounts can sit only the most recent real paper. */
export function freeExamId(bank: Pick<Bank, 'exams'>) {
  return sortExams(bank.exams)[0]?.id ?? null
}

/** What the landing page shows before anyone signs in. */
export type Pricing = Pick<Access, 'prices' | 'examsPerDay'>
