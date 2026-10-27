import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Bank, Lang, Question } from '../shared/exam.ts'
import type { Access } from '../shared/plans.ts'
import { api, ApiError, type Attempt, type Progress, type Theme, type User } from './api.ts'
import { translator, TOPIC_NAMES, type T } from './i18n.ts'

interface Prefs {
  lang: Lang
  qLang: Lang
  theme: Theme
}

interface AppState {
  user: User | null
  /** false until the session check has answered */
  ready: boolean
  bank: Bank | null
  questionById: Map<string, Question>
  progress: Progress
  difficulty: Record<string, [number, number]>
  attempts: Attempt[]
  /** null until loaded */
  access: Access | null
  setAccess: (a: Access) => void
  prefs: Prefs
  t: T
  topicName: (id: string) => string
  setUser: (u: User | null) => void
  setPrefs: (p: Partial<Prefs>) => void
  refresh: () => Promise<void>
  noteAnswer: (qid: string, correct: boolean) => void
  toggleBookmark: (qid: string) => void
}

const Ctx = createContext<AppState | null>(null)

const EMPTY_PROGRESS: Progress = { questions: {}, bookmarks: [] }

function readLocalPrefs(): Prefs {
  const fallback: Prefs = { lang: navigator.language.startsWith('ca') ? 'ca' : 'es', qLang: 'es', theme: 'system' }
  try {
    const saved = JSON.parse(localStorage.getItem('perquiz.prefs') ?? 'null')
    return saved ? { ...fallback, ...saved } : { ...fallback, qLang: fallback.lang }
  } catch {
    return fallback
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [bank, setBank] = useState<Bank | null>(null)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [difficulty, setDifficulty] = useState<Record<string, [number, number]>>({})
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [access, setAccess] = useState<Access | null>(null)
  const [prefs, setPrefsState] = useState<Prefs>(readLocalPrefs)

  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    if (u) setPrefsState({ lang: u.lang, qLang: u.qLang, theme: u.theme })
    else {
      setProgress(EMPTY_PROGRESS)
      setAttempts([])
      setAccess(null)
    }
  }, [])

  const setPrefs = useCallback(
    (p: Partial<Prefs>) => {
      setPrefsState((prev) => {
        const next = { ...prev, ...p }
        try {
          localStorage.setItem('perquiz.prefs', JSON.stringify(next))
        } catch {
          /* private mode: prefs still apply for this visit */
        }
        return next
      })
      if (user) api.updateMe(p).catch(() => {})
    },
    [user],
  )

  useEffect(() => { applyTheme(prefs.theme) }, [prefs.theme])
  useEffect(() => {
    document.documentElement.lang = prefs.lang
  }, [prefs.lang])

  useEffect(() => {
    api.bank().then(setBank)
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e)
      })
      .finally(() => setReady(true))
  }, [setUser])

  const refresh = useCallback(async () => {
    const [p, d, a, x] = await Promise.all([api.progress(), api.difficulty(), api.attempts(), api.access()])
    setProgress(p)
    setDifficulty(d)
    setAttempts(a)
    setAccess(x)
  }, [])

  useEffect(() => {
    if (user) refresh().catch(console.error)
  }, [user?.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const noteAnswer = useCallback((qid: string, correct: boolean) => {
    setProgress((p) => {
      const [n, ok] = p.questions[qid] ?? [0, 0, 0, 0]
      return {
        ...p,
        questions: { ...p.questions, [qid]: [n + 1, ok + (correct ? 1 : 0), correct ? 1 : 0, Date.now()] },
      }
    })
  }, [])

  const toggleBookmark = useCallback((qid: string) => {
    setProgress((p) => {
      const on = !p.bookmarks.includes(qid)
      api.bookmark(qid, on).catch(console.error)
      return { ...p, bookmarks: on ? [...p.bookmarks, qid] : p.bookmarks.filter((b) => b !== qid) }
    })
  }, [])

  const questionById = useMemo(() => new Map(bank?.questions.map((q) => [q.id, q]) ?? []), [bank])

  const value = useMemo<AppState>(() => {
    const t = translator(prefs.lang)
    return {
      user,
      ready,
      bank,
      questionById,
      progress,
      difficulty,
      attempts,
      access,
      setAccess,
      prefs,
      t,
      topicName: (id) => TOPIC_NAMES[prefs.lang][id] ?? id,
      setUser,
      setPrefs,
      refresh,
      noteAnswer,
      toggleBookmark,
    }
  }, [user, ready, bank, questionById, progress, difficulty, attempts, access, prefs, setUser, setPrefs, refresh, noteAnswer, toggleBookmark])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside AppProvider')
  return v
}
