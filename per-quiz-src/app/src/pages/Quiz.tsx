import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, Clock, X } from 'lucide-react'
import { parseSource, type Lang, type Question } from '../../shared/exam.ts'
import { api, type Attempt } from '../api.ts'
import { useApp } from '../store.tsx'
import { Loading } from '../components.tsx'
import { examLabel, formatClock, LETTERS } from '../lib.ts'

export function Quiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { bank, questionById, progress, prefs, setPrefs, t, topicName, noteAnswer, toggleBookmark, refresh } = useApp()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [missing, setMissing] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsed

  useEffect(() => {
    api
      .attempt(id!)
      .then((a) => {
        setAttempt(a)
        setAnswers(a.answers ?? {})
        setElapsed(a.elapsed)
        // Resume at the first unanswered question.
        const first = a.questionIds.findIndex((q) => !a.answers?.[q])
        setIndex(first === -1 ? 0 : first)
      })
      .catch(() => setMissing(true))
  }, [id])

  const finish = useCallback(async () => {
    if (!attempt || finishing) return
    setFinishing(true)
    try {
      await api.finish(attempt.id, elapsedRef.current)
      await refresh()
      navigate(`/test/${attempt.id}/resultado`, { replace: true })
    } catch {
      setFinishing(false)
      setSaveError(true)
    }
  }, [attempt, finishing, navigate, refresh])

  // Clock: counts while the tab is visible; a time limit ends the test on its own.
  useEffect(() => {
    if (!attempt || attempt.finishedAt) return
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(tick)
  }, [attempt])
  useEffect(() => {
    if (attempt?.timeLimit && elapsed >= attempt.timeLimit && !finishing) finish()
  }, [elapsed, attempt, finishing, finish])

  const ids = attempt?.questionIds ?? []
  const q: Question | undefined = questionById.get(ids[index])
  const practice = attempt?.mode === 'practice'
  const chosen = q ? answers[q.id] : undefined
  const locked = practice && !!chosen

  const choose = useCallback(
    (optionId: string) => {
      if (!attempt || !q || locked || finishing) return
      setAnswers((a) => ({ ...a, [q.id]: optionId }))
      setConfirming(false)
      api
        .answer(attempt.id, q.id, optionId, elapsedRef.current)
        .then(() => {
          setSaveError(false)
          if (practice) noteAnswer(q.id, optionId === q.answer)
        })
        .catch(() => setSaveError(true))
    },
    [attempt, q, locked, finishing, practice, noteAnswer],
  )

  const go = useCallback((i: number) => setIndex(Math.max(0, Math.min(ids.length - 1, i))), [ids.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest('input, select, textarea')) return
      const k = e.key.toLowerCase()
      const n = ['1', '2', '3', '4'].indexOf(k) !== -1 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k)
      if (n >= 0 && q?.options[n]) {
        e.preventDefault()
        choose(q.options[n].id)
      } else if (k === 'arrowright' || (k === 'enter' && chosen)) {
        e.preventDefault()
        go(index + 1)
      } else if (k === 'arrowleft') {
        e.preventDefault()
        go(index - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, chosen, index, choose, go])

  if (missing) return <Navigate to="/" replace />
  if (!attempt || !bank) return <Loading />
  if (attempt.finishedAt) return <Navigate to={`/test/${attempt.id}/resultado`} replace />
  if (!q) return <Loading />

  const lang: Lang = prefs.qLang
  const answeredCount = ids.filter((x) => answers[x]).length
  const unanswered = ids.length - answeredCount
  const last = index === ids.length - 1
  const remaining = attempt.timeLimit ? Math.max(0, attempt.timeLimit - elapsed) : null
  const bookmarked = progress.bookmarks.includes(q.id)
  const sources = q.sources.map((s) => parseSource(s))

  function optionState(optId: string) {
    if (!chosen) return undefined
    if (practice) {
      if (optId === q!.answer) return 'right'
      if (optId === chosen) return 'wrong'
      return 'dim'
    }
    return optId === chosen ? 'chosen' : undefined
  }

  const requestFinish = () => (unanswered > 0 ? setConfirming(true) : finish())

  return (
    <div className="quiz">
      <div className="quiz-top">
        <span className="title">{attempt.title}</span>
        <span className="spacer" />
        <span className="num muted">{t('quiz.of', { i: index + 1, n: ids.length })}</span>
        <span className={`clock ${remaining != null && remaining < 300 ? 'low' : ''}`} title={remaining != null ? t('quiz.timeLeft') : undefined}>
          <Clock size={15} strokeWidth={1.8} />
          {formatClock(remaining ?? elapsed)}
        </span>
        <div className="segmented sm" role="group" aria-label={t('set.qLang')}>
          {(['es', 'ca'] as Lang[]).map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setPrefs({ qLang: l })}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="btn btn-outline btn-sm" onClick={requestFinish} disabled={finishing}>
          {t('quiz.finish')}
        </button>
      </div>
      <div className="progress-line" aria-hidden="true">
        <span style={{ width: `${(answeredCount / ids.length) * 100}%` }} />
      </div>

      <article key={q.id} className="fade-in">
        <div className="q-meta">
          <span>{topicName(q.topic)}</span>
          <span className="spacer" />
          <span className="faint source">
            {t('quiz.source', {
              list: sources
                .slice(0, 2)
                .map((s) => `${examLabel(bank, s.exam, prefs.lang)} (${s.position})`)
                .join(', ') + (sources.length > 2 ? ` +${sources.length - 2}` : ''),
            })}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => toggleBookmark(q.id)}
            aria-pressed={bookmarked}
            title={bookmarked ? t('quiz.unbookmark') : t('quiz.bookmark')}
          >
            {bookmarked ? <BookmarkCheck style={{ color: 'var(--accent)' }} /> : <Bookmark />}
            <span className="sr-only">{bookmarked ? t('quiz.unbookmark') : t('quiz.bookmark')}</span>
          </button>
        </div>

        <h1 className="q-text">{q[lang]}</h1>
        {q.image && (
          <figure className="q-figure">
            <img src={`/img/${q.image}`} alt="" />
          </figure>
        )}

        <div className="options" role="radiogroup">
          {q.options.map((o, i) => (
            <button
              key={o.id}
              className="option"
              role="radio"
              aria-checked={chosen === o.id}
              data-state={optionState(o.id)}
              disabled={locked}
              onClick={() => choose(o.id)}
            >
              <span className="letter">{LETTERS[i]}</span>
              <span className="opt-text">{o[lang]}</span>
            </button>
          ))}
        </div>

        <div aria-live="polite">
          {practice && chosen && (
            <p className={`feedback ${chosen === q.answer ? 'ok' : 'ko'}`}>
              {chosen === q.answer ? <Check /> : <X />}
              {chosen === q.answer
                ? t('quiz.correct')
                : t('quiz.wrong', { letter: LETTERS[q.options.findIndex((o) => o.id === q.answer)] })}
            </p>
          )}
          {practice && chosen && q.disputed && <p className="small muted">{t('quiz.disputed')}</p>}
          {saveError && <p className="notice error mt-8">{t('quiz.saveError')}</p>}
        </div>
      </article>

      {confirming && (
        <div className="confirm-bar" role="alert">
          <p>{t('quiz.confirmFinish', { n: unanswered })}</p>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>{t('quiz.confirmNo')}</button>
          <button className="btn btn-sm btn-primary" onClick={finish} disabled={finishing}>{t('quiz.confirmYes')}</button>
        </div>
      )}

      <div className="q-actions">
        <button className="btn btn-ghost" onClick={() => go(index - 1)} disabled={index === 0}>
          <ArrowLeft />
          {t('quiz.prev')}
        </button>
        <span className="spacer" />
        {last ? (
          <button className="btn btn-primary" onClick={requestFinish} disabled={finishing}>
            {t('quiz.results')}
          </button>
        ) : (
          <button className={`btn ${chosen ? 'btn-primary' : ''}`} onClick={() => go(index + 1)}>
            {t('quiz.next')}
            <ArrowRight />
          </button>
        )}
      </div>

      <section className="mt-32">
        <div className="row">
          <h2 className="section-title">{t('quiz.map')}</h2>
          <span className="chip">{answeredCount}/{ids.length}</span>
          <span className="spacer" />
          <span className="small faint">{t('quiz.keys')}</span>
        </div>
        <div className="qmap">
          {ids.map((qid, i) => {
            const a = answers[qid]
            const s = !a ? undefined : practice ? (a === questionById.get(qid)?.answer ? 'right' : 'wrong') : 'answered'
            return (
              <button key={qid} data-s={s} aria-current={i === index} onClick={() => go(i)} aria-label={String(i + 1)}>
                {i + 1}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
