import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BarChart3, ChevronRight, ListChecks, Play } from 'lucide-react'
import type { Lang } from '../../shared/exam.ts'
import { useApp } from '../store.tsx'
import { Loading, Meter } from '../components.tsx'
import { customPool, formatDate, pct, topicStats } from '../lib.ts'
import { renderMarkdown } from '../markdown.tsx'
import { loadTheory, type TheoryDoc, type TheoryStatus } from '../theory.ts'
import { useStartTest } from '../useStartTest.ts'

const PRACTICE_COUNT = 20

/** Loads the theory files of the given topics; undefined while loading, null when a topic has none. */
function useTheory(topics: string[], lang: Lang) {
  const [docs, setDocs] = useState<Record<string, TheoryDoc | null | undefined>>({})
  const [error, setError] = useState(false)
  const key = `${lang}:${topics.join(',')}`
  useEffect(() => {
    let live = true
    setDocs({})
    setError(false)
    Promise.all(topics.map(async (id) => [id, await loadTheory(id, lang)] as const))
      .then((pairs) => live && setDocs(Object.fromEntries(pairs)))
      .catch(() => live && setError(true))
    return () => {
      live = false
    }
  }, [key])
  return { docs, error }
}

function StatusPill({ status }: { status: TheoryStatus | undefined }) {
  const { t } = useApp()
  if (!status || status === 'reviewed') return null
  return (
    <span className={`pill ${status === 'placeholder' ? 'pill-neutral' : 'pill-warning'}`}>
      {t(`theory.status.${status}`)}
    </span>
  )
}

export function TheoryIndex() {
  const { bank, progress, prefs, t, topicName } = useApp()
  const ids = useMemo(() => bank?.topics.map((tp) => tp.id) ?? [], [bank])
  const { docs } = useTheory(ids, prefs.lang)
  if (!bank) return <Loading />
  const stats = new Map(topicStats(bank, progress).map((s) => [s.id, s]))

  return (
    <div className="fade-in">
      <h1 className="page-title">{t('theory.title')}</h1>
      <p className="lead">{t('theory.lead', { n: bank.topics.length })}</p>

      <section className="panel mt-32">
        <div className="theory-list">
          {bank.topics.map((tp) => {
            const s = stats.get(tp.id)
            return (
              <Link key={tp.id} to={`/temario/${tp.id}`} className="row-card">
                <span className="row-main">
                  <div className="row-title">{topicName(tp.id)}</div>
                  <div className="row-meta num">
                    {t('theory.range', { from: tp.from, to: tp.to })} · {t('theory.seen', { seen: s?.seen ?? 0, total: s?.total ?? 0 })}
                  </div>
                </span>
                <span className="row-end row">
                  <StatusPill status={docs[tp.id]?.status} />
                  <span className="stack gap-4" style={{ alignItems: 'flex-end', width: 56 }}>
                    <span className="num small">{s?.accuracy == null ? '–' : `${pct(s.accuracy)} %`}</span>
                    <Meter value={s?.accuracy ?? null} />
                  </span>
                  <ChevronRight className="row-icon" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function TheoryTopic() {
  const { topic = '' } = useParams()
  const { bank, progress, difficulty, prefs, t, topicName } = useApp()
  const topics = useMemo(() => [topic], [topic])
  const { docs, error } = useTheory(topics, prefs.lang)
  const { start, busy } = useStartTest()
  const doc = docs[topic]
  const rendered = useMemo(() => (doc ? renderMarkdown(doc.body) : null), [doc])

  if (!bank) return <Loading />
  const index = bank.topics.findIndex((tp) => tp.id === topic)
  if (index < 0) return <Navigate to="/temario" replace />
  const tp = bank.topics[index]
  const s = topicStats(bank, progress).find((x) => x.id === topic)!
  const prev = bank.topics[index - 1]
  const next = bank.topics[index + 1]
  const contents = rendered?.headings.filter((h) => h.level === 2) ?? []

  const practice = () =>
    start({
      kind: 'custom',
      paper: null,
      title: topicName(topic),
      mode: 'practice',
      timeLimit: null,
      questionIds: customPool(bank, progress, difficulty, [topic], 'all').slice(0, PRACTICE_COUNT).map((q) => q.id),
      config: { topics: [topic], pool: 'all', count: PRACTICE_COUNT },
    })

  return (
    <div className="fade-in">
      <Link to="/temario" className="link row" style={{ gap: 6, width: 'fit-content' }}>
        <ArrowLeft className="row-icon" style={{ width: 16, height: 16 }} />
        {t('theory.title')}
      </Link>
      <h1 className="page-title mt-16">{topicName(topic)}</h1>
      <p className="lead num">
        {t('theory.range', { from: tp.from, to: tp.to })} · {t('theory.bank', { n: s.total })}
      </p>

      <div className="theory-layout mt-32">
        <article className="prose" lang={doc?.lang ?? prefs.lang}>
          {error && <p className="notice error">{t('theory.loadError')}</p>}
          {!error && doc === undefined && <div className="skeleton" style={{ minHeight: 240 }} aria-busy="true" />}
          {doc === null && <p className="empty">{t('theory.missing')}</p>}
          {doc && rendered && (
            <>
              {doc.status !== 'reviewed' && <p className="notice warning">{t(`theory.notice.${doc.status}`)}</p>}
              {doc.lang !== prefs.lang && <p className="notice">{t('theory.notice.fallback')}</p>}
              {rendered.nodes}
              {(doc.sources.length > 0 || doc.updated) && (
                <footer className="theory-sources">
                  {doc.sources.length > 0 && (
                    <>
                      <h2 className="section-title">{t('theory.sources')}</h2>
                      <ul>{doc.sources.map((src) => <li key={src}>{src}</li>)}</ul>
                    </>
                  )}
                  {doc.updated && !Number.isNaN(Date.parse(doc.updated)) && (
                    <p className="small faint">{t('theory.updated', { date: formatDate(Date.parse(doc.updated), prefs.lang) })}</p>
                  )}
                </footer>
              )}
            </>
          )}

        </article>

        <aside className="theory-aside">
          <section className="panel">
            <h2 className="section-title">{t('theory.progress')}</h2>
            <div className="theory-score">
              <span className="tile-value">
                {pct(s.accuracy)}
                {s.accuracy != null && <span className="unit">%</span>}
              </span>
              <span className="tile-caption">
                {s.answers ? t('home.tile.accuracyCaption', { n: s.answers }) : t('home.tile.accuracyEmpty')}
              </span>
            </div>
            <Meter value={s.accuracy} />
            <dl className="theory-facts">
              <div><dt>{t('stats.col.seen')}</dt><dd className="num">{t('theory.seen', { seen: s.seen, total: s.total })}</dd></div>
              <div><dt>{t('theory.mastered')}</dt><dd className="num">{s.mastered}</dd></div>
              <div><dt>{t('theory.review')}</dt><dd className="num">{s.review}</dd></div>
            </dl>
            <div className="stack gap-8 mt-16">
              <button className="btn btn-primary" onClick={practice} disabled={busy || !s.total}>
                <Play />
                {t('theory.practice')}
              </button>
              <Link to={`/preguntas?tema=${topic}`} className="btn btn-outline">
                <ListChecks />
                {t('theory.questions')}
              </Link>
              <Link to="/estadisticas" className="btn btn-ghost">
                <BarChart3 />
                {t('theory.stats')}
              </Link>
            </div>
            <p className="small faint mt-8" style={{ textAlign: 'center' }}>{t('theory.practiceMeta')}</p>
          </section>

          {contents.length > 1 && (
            <nav className="theory-toc">
              <h2 className="section-title">{t('theory.contents')}</h2>
              <ol>
                {contents.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>
                ))}
              </ol>
            </nav>
          )}
        </aside>
      </div>

      <nav className="theory-pager">
        {prev ? (
          <Link to={`/temario/${prev.id}`} className="row-card">
            <ArrowLeft className="row-icon" />
            <span className="row-main">
              <div className="row-meta">{t('theory.prev')}</div>
              <div className="row-title">{topicName(prev.id)}</div>
            </span>
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/temario/${next.id}`} className="row-card" style={{ textAlign: 'right' }}>
            <span className="row-main">
              <div className="row-meta">{t('theory.next')}</div>
              <div className="row-title">{topicName(next.id)}</div>
            </span>
            <ArrowRight className="row-icon" />
          </Link>
        )}
      </nav>
    </div>
  )
}
