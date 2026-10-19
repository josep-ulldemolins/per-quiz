import { useNavigate } from 'react-router-dom'
import { PAPERS } from '../../shared/exam.ts'
import type { Attempt } from '../api.ts'
import { useApp } from '../store.tsx'
import { Loading, Meter } from '../components.tsx'
import { customPool, formatDate, formatDuration, overallStats, pct, topicStats } from '../lib.ts'
import { useStartTest } from '../useStartTest.ts'

const PASS = (PAPERS.per.to - PAPERS.per.maxErrors) / PAPERS.per.to

function TrendChart({ attempts }: { attempts: Attempt[] }) {
  const navigate = useNavigate()
  const { prefs } = useApp()
  const W = 720
  const H = 200
  const left = 34
  const top = 8
  const bottom = 22
  const plotH = H - top - bottom
  const n = attempts.length
  const slot = (W - left) / Math.max(n, 12)
  const barW = Math.min(28, slot * 0.62)
  const y = (v: number) => top + plotH * (1 - v)
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line className="grid-line" x1={left} x2={W} y1={y(v)} y2={y(v)} />
            <text className="axis" x={left - 8} y={y(v) + 4} textAnchor="end">
              {v * 100}
            </text>
          </g>
        ))}
        <line className="pass-line" x1={left} x2={W} y1={y(PASS)} y2={y(PASS)} />
        {attempts.map((a, i) => {
          const r = a.result!
          const v = r.correct / r.total
          const x = left + slot * i + (slot - barW) / 2
          return (
            <g key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/test/${a.id}/resultado`)}>
              <title>{`${a.title} · ${formatDate(a.finishedAt!, prefs.lang, true)} · ${Math.round(v * 100)} %`}</title>
              <rect
                className={`bar ${r.passed === true ? 'passed' : r.passed === false ? 'failed' : ''}`}
                x={x}
                y={y(v)}
                width={barW}
                height={Math.max(1, plotH * v)}
                rx={4}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function Stats() {
  const { bank, progress, attempts, difficulty, prefs, t, topicName } = useApp()
  const navigate = useNavigate()
  const { start, busy } = useStartTest()
  if (!bank) return <Loading />

  const stats = topicStats(bank, progress)
  const all = overallStats(progress, attempts)
  const finished = attempts.filter((a) => a.finishedAt && a.result)
  const trend = finished.slice(0, 24).reverse()

  return (
    <div className="fade-in">
      <h1 className="page-title">{t('stats.title')}</h1>
      <p className="lead">{t('stats.lead')}</p>

      <div className="grid mt-32">
        <div className="panel tile span-3">
          <span className="tile-label">{t('stats.answers')}</span>
          <span className="tile-value">{all.answers}</span>
          <span className="tile-caption">{t('stats.answersCaption', { n: all.seen })}</span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('stats.accuracy')}</span>
          <span className="tile-value">
            {pct(all.accuracy)}
            {all.accuracy != null && <span className="unit">%</span>}
          </span>
          <span className="tile-caption">{all.answers ? t('home.tile.accuracyCaption', { n: all.answers }) : t('home.tile.accuracyEmpty')}</span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('stats.time')}</span>
          <span className="tile-value" style={{ fontSize: 28 }}>{formatDuration(all.timeSpent)}</span>
          <span className="tile-caption">{t('stats.timeCaption', { n: finished.length })}</span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('stats.sims')}</span>
          <span className="tile-value">{all.simsPassed}</span>
          <span className="tile-caption">{all.simsDone ? t('home.tile.simsCaption', { n: all.simsDone }) : t('home.tile.simsEmpty')}</span>
        </div>

        <section className="panel span-12">
          <div className="panel-head">
            <h2 className="section-title">{t('stats.trend')}</h2>
            {trend.length > 0 && <span className="chip">{trend.length}</span>}
          </div>
          <p className="small muted" style={{ marginTop: -8, marginBottom: 16 }}>{t('stats.trendCaption')}</p>
          {trend.length ? (
            <div className="card-inner" style={{ padding: '18px 20px 12px' }}>
              <TrendChart attempts={trend} />
            </div>
          ) : (
            <p className="empty">{t('stats.trendEmpty')}</p>
          )}
        </section>

        <section className="panel span-12">
          <div className="panel-head">
            <h2 className="section-title">{t('stats.topics')}</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('stats.col.topic')}</th>
                  <th className="r">{t('stats.col.bank')}</th>
                  <th className="r">{t('stats.col.seen')}</th>
                  <th className="r">{t('stats.col.accuracy')}</th>
                  <th className="r">{t('stats.col.mastered')}</th>
                  <th className="r">{t('stats.col.review')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id}>
                    <td>{topicName(s.id)}</td>
                    <td className="r num muted">{s.total}</td>
                    <td className="r num">{s.seen}</td>
                    <td className="r num" style={{ whiteSpace: 'nowrap' }}>
                      {s.accuracy == null ? <span className="faint">–</span> : `${pct(s.accuracy)} %`}
                      <Meter value={s.accuracy} />
                    </td>
                    <td className="r num">{s.mastered}</td>
                    <td className="r num">{s.review || <span className="faint">0</span>}</td>
                    <td className="r">
                      <button
                        className="btn btn-sm btn-outline"
                        disabled={busy}
                        onClick={() =>
                          start({
                            kind: s.review ? 'mistakes' : 'custom',
                            paper: null,
                            title: topicName(s.id),
                            mode: 'practice',
                            timeLimit: null,
                            questionIds: (s.review
                              ? customPool(bank, progress, difficulty, [s.id], 'wrong')
                              : customPool(bank, progress, difficulty, [s.id], 'all')
                            )
                              .slice(0, 20)
                              .map((q) => q.id),
                            config: { topics: [s.id], pool: s.review ? 'wrong' : 'all', count: 20 },
                          })
                        }
                      >
                        {t('common.practice')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel span-12" id="historial">
          <div className="panel-head">
            <h2 className="section-title">{t('stats.history')}</h2>
            {attempts.length > 0 && <span className="chip">{attempts.length}</span>}
          </div>
          {attempts.length === 0 ? (
            <p className="empty">{t('stats.historyEmpty')}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('stats.col.date')}</th>
                    <th>{t('stats.col.test')}</th>
                    <th className="r">{t('stats.col.score')}</th>
                    <th>{t('stats.col.result')}</th>
                    <th className="r">{t('stats.col.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr
                      key={a.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(a.finishedAt ? `/test/${a.id}/resultado` : `/test/${a.id}`)}
                    >
                      <td className="num muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(a.startedAt, prefs.lang, true)}</td>
                      <td>
                        {a.title}
                        <div className="small faint">{t(`kind.${a.kind}`)}</div>
                      </td>
                      <td className="r num">
                        {a.result ? `${a.result.correct}/${a.result.total}` : <span className="faint">{a.answered}/{a.questionIds.length}</span>}
                      </td>
                      <td>
                        {!a.finishedAt && <span className="pill pill-warning">{t('stats.inProgress')}</span>}
                        {a.result?.passed === true && <span className="pill pill-positive">{t('res.passed')}</span>}
                        {a.result?.passed === false && <span className="pill pill-negative">{t('res.failed')}</span>}
                        {a.result && a.result.passed === null && <span className="muted">{pct(a.result.correct / a.result.total)} %</span>}
                      </td>
                      <td className="r num muted">{formatDuration(a.elapsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
