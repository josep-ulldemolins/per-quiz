import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { api, type Attempt } from '../api.ts'
import { useApp } from '../store.tsx'
import { Loading, Meter, useFree } from '../components.tsx'
import { formatDate, formatDuration, LETTERS, pct } from '../lib.ts'
import { useStartTest } from '../useStartTest.ts'

export function Results() {
  const { id } = useParams()
  const { bank, questionById, prefs, t, topicName } = useApp()
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [missing, setMissing] = useState(false)
  const [onlyWrong, setOnlyWrong] = useState(true)
  const { start, busy } = useStartTest()
  const free = useFree()

  useEffect(() => {
    api.attempt(id!).then(setAttempt).catch(() => setMissing(true))
  }, [id])

  if (missing) return <Navigate to="/" replace />
  if (!attempt || !bank) return <Loading />
  if (!attempt.finishedAt || !attempt.result) return <Navigate to={`/test/${attempt.id}`} replace />

  const r = attempt.result
  const answers = attempt.answers ?? {}
  const lang = prefs.qLang
  const wrongIds = attempt.questionIds.filter((q) => answers[q] !== questionById.get(q)?.answer)
  const shown = onlyWrong ? wrongIds : attempt.questionIds
  const failed = r.checks.filter((c) => !c.ok)
  const checkName = (key: string) => (key === 'total' ? t('res.check.total') : topicName(key))

  return (
    <div className="fade-in">
      <div className="header-row">
        <div>
          <p className="muted">
            {attempt.title} · {formatDate(attempt.finishedAt, prefs.lang, true)}
          </p>
          <h1 className={`verdict mt-8 ${r.passed === true ? 'pass' : r.passed === false ? 'fail' : ''}`}>
            {r.passed === true ? t('res.passed') : r.passed === false ? t('res.failed') : t('res.done')}
          </h1>
          <p className="finding">
            {t('res.summary', { correct: r.correct, wrong: r.wrong, blank: r.unanswered, total: r.total })}{' '}
            {failed.length > 0 &&
              failed
                .map((c) =>
                  t('res.failedBecause', {
                    n: c.errors - c.max,
                    where: c.key === 'total' ? t('res.total') : topicName(c.key),
                  }),
                )
                .join(' ')}
          </p>
        </div>
        <div className="row wrap">
          {wrongIds.length > 0 && (
            <button
              className="btn"
              disabled={busy}
              onClick={() =>
                start({
                  kind: 'mistakes',
                  paper: null,
                  title: `${t('kind.mistakes')} · ${attempt.title}`,
                  mode: 'practice',
                  timeLimit: null,
                  questionIds: wrongIds,
                  config: { from: attempt.id },
                })
              }
            >
              <RotateCcw />
              {t('res.retryWrong')}
            </button>
          )}
          <Link to="/test/nuevo" className="btn btn-primary">
            {t('res.newTest')}
          </Link>
        </div>
      </div>

      {free && (
        <p className="notice mt-24">
          {t('res.upsell')}{' '}
          <Link to="/planes" className="link-strong">{t('lock.see')}</Link>
        </p>
      )}

      <div className="grid mt-32">
        {r.checks.length > 0 && (
          <section className="panel span-4 side" style={{ alignSelf: 'start' }}>
            <div className="panel-head">
              <h2 className="section-title">{t('res.checks')}</h2>
            </div>
            <div>
              {r.checks.map((c) => (
                <div key={c.key} className="check-row">
                  <span className="check-dot" style={{ background: c.ok ? 'var(--positive)' : 'var(--negative)' }} />
                  <span className="name">{checkName(c.key)}</span>
                  <span className="num muted">{t('res.errors', { n: c.errors, max: c.max })}</span>
                </div>
              ))}
            </div>
            <p className="small faint mt-16">{t('res.time', { t: formatDuration(attempt.elapsed) })}</p>
          </section>
        )}

        <section className={`panel ${r.checks.length ? 'span-8' : 'span-12'}`}>
          <div className="panel-head">
            <h2 className="section-title">{t('res.byTopic')}</h2>
          </div>
          <div className="table-wrap">
            <table>
              <tbody>
                {bank.topics
                  .filter((tp) => r.byTopic[tp.id])
                  .map((tp) => {
                    const s = r.byTopic[tp.id]
                    return (
                      <tr key={tp.id}>
                        <td>{topicName(tp.id)}</td>
                        <td className="r num muted">
                          {s.correct}/{s.total}
                        </td>
                        <td className="r num" style={{ width: 160 }}>
                          {pct(s.correct / s.total)} %
                          <Meter value={s.correct / s.total} />
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {!r.checks.length && <p className="small faint mt-16">{t('res.time', { t: formatDuration(attempt.elapsed) })}</p>}
        </section>

        <section className="panel span-12">
          <div className="panel-head">
            <h2 className="section-title">{t('res.review')}</h2>
            <span className="chip">{shown.length}</span>
            <div className="segmented sm">
              <button aria-pressed={onlyWrong} onClick={() => setOnlyWrong(true)}>{t('res.onlyWrong')}</button>
              <button aria-pressed={!onlyWrong} onClick={() => setOnlyWrong(false)}>{t('res.all')}</button>
            </div>
          </div>
          {shown.length === 0 && <p className="empty">{t('res.noneWrong')}</p>}
          <div className="card-inner" style={{ padding: shown.length ? '4px 20px' : 0, border: shown.length ? undefined : 0 }}>
            {shown.map((qid) => {
              const q = questionById.get(qid)
              if (!q) return null
              const mine = answers[qid]
              const n = attempt.questionIds.indexOf(qid) + 1
              return (
                <div key={qid} className="review-item">
                  <div className="q-meta" style={{ marginBottom: 6 }}>
                    <span className="num">{n}</span>
                    <span className="faint">·</span>
                    <span>{topicName(q.topic)}</span>
                    {!mine && <span className="pill pill-warning">{t('res.blank')}</span>}
                  </div>
                  <p className="review-q">{q[lang]}</p>
                  {q.image && (
                    <figure className="q-figure" style={{ marginTop: 10 }}>
                      <img src={`/img/${q.image}`} alt="" loading="lazy" style={{ maxHeight: 200 }} />
                    </figure>
                  )}
                  <div className="review-opts">
                    {q.options.map((o, i) => (
                      <div
                        key={o.id}
                        className={`review-opt ${o.id === q.answer ? 'right' : o.id === mine ? 'wrong' : ''}`}
                      >
                        <b>{LETTERS[i]}</b>
                        <span>
                          {o[lang]}
                          {o.id === mine && o.id !== q.answer && <span className="sr-only"> ({t('res.yourAnswer')})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
