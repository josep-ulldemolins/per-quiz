import { useDeferredValue, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Search } from 'lucide-react'
import { useApp } from '../store.tsx'
import { Loading } from '../components.tsx'
import { examLabel, LETTERS, MIN_GLOBAL_ANSWERS, sortByTopic } from '../lib.ts'
import { parseSource } from '../../shared/exam.ts'
import { useStartTest } from '../useStartTest.ts'

type Status = 'all' | 'unseen' | 'right' | 'wrong' | 'bookmarked'
const STATUSES: Status[] = ['all', 'unseen', 'right', 'wrong', 'bookmarked']
const PAGE = 40

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function Questions() {
  const { bank, progress, difficulty, prefs, t, topicName, toggleBookmark } = useApp()
  const [query, setQuery] = useState('')
  // The topic filter lives in the URL (?tema=ripa) so other pages can link to one topic's questions.
  const [params, setParams] = useSearchParams()
  const rawTopic = params.get('tema') ?? ''
  const topic = bank?.topics.some((tp) => tp.id === rawTopic) ? rawTopic : ''
  const setTopic = (id: string) => setParams(id ? { tema: id } : {}, { replace: true })
  const [status, setStatus] = useState<Status>('all')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const deferred = useDeferredValue(query)
  const { start, busy } = useStartTest()
  const lang = prefs.qLang

  const filtered = useMemo(() => {
    if (!bank) return []
    const words = normalize(deferred).split(/\s+/).filter(Boolean)
    const p = progress.questions
    return sortByTopic(
      bank,
      bank.questions.filter((q) => {
        if (topic && q.topic !== topic) return false
        if (status === 'unseen' && p[q.id]) return false
        if (status === 'right' && !(p[q.id] && p[q.id][2])) return false
        if (status === 'wrong' && !(p[q.id] && !p[q.id][2])) return false
        if (status === 'bookmarked' && !progress.bookmarks.includes(q.id)) return false
        if (!words.length) return true
        const hay = normalize([q.es, q.ca, ...q.options.flatMap((o) => [o.es, o.ca])].join(' '))
        return words.every((w) => hay.includes(w))
      }),
    )
  }, [bank, deferred, topic, status, progress])

  if (!bank) return <Loading />

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="fade-in">
      <h1 className="page-title">{t('q.title')}</h1>
      <p className="lead">{t('q.lead', { n: bank.questions.length })}</p>

      <div className="toolbar mt-24">
        <label className="search">
          <Search />
          <span className="sr-only">{t('q.search')}</span>
          <input
            className="input"
            type="search"
            placeholder={t('q.search')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
          />
        </label>
        <select
          className="select"
          value={topic}
          aria-label={t('q.topic')}
          onChange={(e) => {
            setTopic(e.target.value)
            setLimit(PAGE)
          }}
        >
          <option value="">{t('new.custom.allTopics')}</option>
          {bank.topics.map((tp) => (
            <option key={tp.id} value={tp.id}>{topicName(tp.id)}</option>
          ))}
        </select>
      </div>
      <div className="row wrap mt-16">
        <div className="segmented" role="group" aria-label={t('q.status')}>
          {STATUSES.map((s) => (
            <button
              key={s}
              aria-pressed={status === s}
              onClick={() => {
                setStatus(s)
                setLimit(PAGE)
              }}
            >
              {t(`q.status.${s}`)}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="small muted num">{t('q.count', { n: filtered.length })}</span>
      </div>

      <section className="panel mt-16" style={{ paddingTop: 6, paddingBottom: 6 }}>
        {filtered.length === 0 && <p className="empty" style={{ paddingBottom: 18 }}>{t('q.empty')}</p>}
        <div className="qlist">
          {filtered.slice(0, limit).map((q) => {
            const p = progress.questions[q.id]
            const d = difficulty[q.id]
            const isOpen = open === q.id
            const bookmarked = progress.bookmarks.includes(q.id)
            return (
              <div key={q.id} className="qrow">
                <div className="qrow-head">
                  <input
                    type="checkbox"
                    className="check"
                    checked={selected.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    aria-label={t('q.select')}
                  />
                  <button className="qrow-toggle" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)}>
                    <span className="qt">{q[lang]}</span>
                    <span className="qm">
                      <span>{topicName(q.topic)}</span>
                      {!p && <span className="faint">{t('q.never')}</span>}
                      {p && (
                        <span className={`pill ${p[2] ? 'pill-positive' : 'pill-negative'}`}>
                          {p[2] ? t('q.lastRight') : t('q.lastWrong')} · <span className="num">{t('q.times', { ok: p[1], n: p[0] })}</span>
                        </span>
                      )}
                      {d && d[0] >= MIN_GLOBAL_ANSWERS && (
                        <span className="faint num">{t('q.globalErr', { pct: Math.round((d[1] / d[0]) * 100) })}</span>
                      )}
                    </span>
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => toggleBookmark(q.id)}
                    aria-pressed={bookmarked}
                    title={bookmarked ? t('quiz.unbookmark') : t('quiz.bookmark')}
                    aria-label={bookmarked ? t('quiz.unbookmark') : t('quiz.bookmark')}
                  >
                    {bookmarked ? <BookmarkCheck style={{ color: 'var(--accent)' }} /> : <Bookmark />}
                  </button>
                </div>
                {isOpen && (
                  <div className="qrow-body fade-in">
                    {q.image && (
                      <figure className="q-figure">
                        <img src={`/img/${q.image}`} alt="" loading="lazy" style={{ maxHeight: 240 }} />
                      </figure>
                    )}
                    <div className="review-opts">
                      {q.options.map((o, i) => (
                        <div key={o.id} className={`review-opt ${o.id === q.answer ? 'right' : ''}`}>
                          <b>{LETTERS[i]}</b>
                          <span>{o[lang]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="small faint mt-8">
                      {t('quiz.source', {
                        list: q.sources
                          .map((s) => {
                            const { exam, position } = parseSource(s)
                            return `${examLabel(bank, exam, prefs.lang)} (${position})`
                          })
                          .join(', '),
                      })}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {filtered.length > limit && (
          <div style={{ padding: '12px 0 14px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
              {t('q.more', { n: Math.min(PAGE, filtered.length - limit) })}
            </button>
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <div className="selection-bar">
          <span className="num">{t('q.selected', { n: selected.length })}</span>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>{t('q.clear')}</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() =>
              start({
                kind: 'custom',
                paper: null,
                title: t('kind.custom'),
                mode: 'practice',
                timeLimit: null,
                questionIds: selected,
                config: { picked: true },
              })
            }
          >
            {t('q.makeTest')}
          </button>
        </div>
      )}
    </div>
  )
}
