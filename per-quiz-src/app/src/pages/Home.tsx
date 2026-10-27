import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Lock, Play, RotateCcw, Shuffle, FileCheck2 } from 'lucide-react'
import { useApp } from '../store.tsx'
import { ExamSheet, Loading, Meter, useFree } from '../components.tsx'
import { buildSimulation, customPool, formatDate, overallStats, pct, topicStats } from '../lib.ts'
import { useStartTest } from '../useStartTest.ts'

export function Home() {
  const { bank, user, progress, attempts, difficulty, access, t, topicName, prefs } = useApp()
  const free = useFree()
  const { start, busy } = useStartTest()
  const navigate = useNavigate()
  if (!bank || !user) return <Loading />

  const stats = topicStats(bank, progress)
  const all = overallStats(progress, attempts)
  const firstName = user.name.split(' ')[0]
  const hour = new Date().getHours()
  const greet = hour < 14 ? 'greet.morning' : hour < 21 ? 'greet.afternoon' : 'greet.evening'

  // The one finding: the weakest topic that has enough answers to mean something.
  const rated = stats.filter((s) => s.answers >= 5 && s.accuracy != null).sort((a, b) => a.accuracy! - b.accuracy!)
  let finding = <>{t('home.finding.none')}</>
  if (rated.length && rated[0].accuracy! < 0.8) {
    const [before, after] = t('home.finding.weak', { topic: '\u0000', pct: pct(rated[0].accuracy) }).split('\u0000')
    finding = (
      <>
        {before}
        <strong>{topicName(rated[0].id)}</strong>
        {after}
      </>
    )
  } else if (rated.length) {
    finding = <>{t('home.finding.strong', { pct: pct(all.accuracy), min: pct(rated[0].accuracy) })}</>
  }

  const open = attempts.find((a) => !a.finishedAt)
  const finished = attempts.filter((a) => a.finishedAt).slice(0, 5)
  const reviewIds = customPool(bank, progress, difficulty, [], 'wrong').map((q) => q.id)

  const practiceTopic = (topicId: string) =>
    start({
      kind: 'custom',
      paper: null,
      title: topicName(topicId),
      mode: 'practice',
      timeLimit: null,
      questionIds: customPool(bank, progress, difficulty, [topicId], 'all').slice(0, 20).map((q) => q.id),
      config: { topics: [topicId], pool: 'all', count: 20 },
    })

  return (
    <div className="fade-in">
      <h1 className="greeting">{t(greet, { name: firstName })}</h1>
      <p className="finding">{finding}</p>

      <div className="grid" style={{ marginTop: 44 }}>
        <div className="panel tile span-3">
          <span className="tile-label">{t('home.tile.seen')}</span>
          <span className="tile-value">{all.seen}</span>
          <span className="tile-caption">{t('home.tile.seenCaption', { total: bank.questions.length })}</span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('home.tile.accuracy')}</span>
          <span className="tile-value">
            {pct(all.accuracy)}
            {all.accuracy != null && <span className="unit">%</span>}
          </span>
          <span className="tile-caption">
            {all.answers ? t('home.tile.accuracyCaption', { n: all.answers }) : t('home.tile.accuracyEmpty')}
          </span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('home.tile.sims')}</span>
          <span className="tile-value">{all.simsPassed}</span>
          <span className="tile-caption">
            {all.simsDone ? t('home.tile.simsCaption', { n: all.simsDone }) : t('home.tile.simsEmpty')}
          </span>
        </div>
        <div className="panel tile span-3">
          <span className="tile-label">{t('home.tile.review')}</span>
          <span className="tile-value">{all.review}</span>
          <span className="tile-caption">{all.review ? t('home.tile.reviewCaption') : t('home.tile.reviewEmpty')}</span>
        </div>

        <section className="panel span-9">
          <div className="panel-head">
            <h2 className="section-title">{t('home.sheet.title')}</h2>
          </div>
          <p className="small muted" style={{ marginTop: -8, marginBottom: 18, maxWidth: '64ch' }}>
            {t('home.sheet.caption')}
          </p>
          <ExamSheet bank={bank} stats={stats} onPick={practiceTopic} />
        </section>

        <section className="panel span-3 side">
          <div className="panel-head">
            <h2 className="section-title">{t('home.next.title')}</h2>
          </div>
          <div className="rows">
            {open && (
              <Link to={`/test/${open.id}`} className="row-card">
                <Play className="row-icon" style={{ color: 'var(--accent)' }} />
                <span className="row-main">
                  <div className="row-title">{t('home.next.resume', { title: open.title })}</div>
                  <div className="row-meta">
                    {t('home.next.resumeMeta', { done: open.answered, total: open.questionIds.length })}
                  </div>
                </span>
              </Link>
            )}
            <button
              className="row-card"
              disabled={busy}
              onClick={() =>
                start({
                  kind: 'simulation',
                  paper: 'per',
                  title: t('kind.simulation') + ' · ' + t('paper.per'),
                  mode: 'exam',
                  timeLimit: null,
                  questionIds: buildSimulation(bank, 'per'),
                  config: { paper: 'per' },
                })
              }
            >
              <FileCheck2 className="row-icon" />
              <span className="row-main">
                <div className="row-title">{t('home.next.sim')}</div>
                <div className="row-meta">
                  {free && access
                    ? t('quota.left', { n: Math.max(0, access.examsPerDay - access.examsToday), max: access.examsPerDay })
                    : t('home.next.simMeta')}
                </div>
              </span>
            </button>
            <button
              className="row-card"
              disabled={busy || !reviewIds.length}
              onClick={() =>
                start({
                  kind: 'mistakes',
                  paper: null,
                  title: t('kind.mistakes'),
                  mode: 'practice',
                  timeLimit: null,
                  questionIds: reviewIds.slice(0, 30),
                  config: { pool: 'wrong' },
                })
              }
            >
              <RotateCcw className="row-icon" />
              <span className="row-main">
                <div className="row-title">{t('home.next.review')}</div>
                <div className="row-meta">
                  {reviewIds.length ? t('home.next.reviewMeta', { n: Math.min(30, reviewIds.length) }) : t('home.next.reviewEmpty')}
                </div>
              </span>
              {free && <Lock className="lock-icon" aria-label={t('lock.badge')} />}
            </button>
            <button
              className="row-card"
              disabled={busy}
              onClick={() =>
                start({
                  kind: 'custom',
                  paper: null,
                  title: t('home.next.quick'),
                  mode: 'practice',
                  timeLimit: null,
                  questionIds: customPool(bank, progress, difficulty, [], 'all').slice(0, 20).map((q) => q.id),
                  config: { pool: 'all', count: 20 },
                })
              }
            >
              <Shuffle className="row-icon" />
              <span className="row-main">
                <div className="row-title">{t('home.next.quick')}</div>
                <div className="row-meta">{t('home.next.quickMeta')}</div>
              </span>
              {free && <Lock className="lock-icon" aria-label={t('lock.badge')} />}
            </button>
          </div>
        </section>

        <section className="panel span-6">
          <div className="panel-head">
            <h2 className="section-title">{t('home.topics.title')}</h2>
            <span className="chip">{bank.topics.length}</span>
            <Link to="/estadisticas">{t('common.viewAll')}</Link>
          </div>
          <div className="rows">
            {[...stats]
              .sort((a, b) => (a.accuracy ?? 2) - (b.accuracy ?? 2))
              .slice(0, 5)
              .map((s) => (
                <button key={s.id} className="row-card" onClick={() => practiceTopic(s.id)} disabled={busy}>
                  <span className="row-main">
                    <div className="row-title">{topicName(s.id)}</div>
                    <div className="row-meta num">
                      {s.seen} / {s.total} · {s.review ? `${s.review} ${t('home.tile.review').toLowerCase()}` : t('home.tile.reviewEmpty')}
                    </div>
                  </span>
                  <span className="row-end stack gap-4" style={{ alignItems: 'flex-end' }}>
                    <span className="num">{s.accuracy == null ? '–' : `${pct(s.accuracy)} %`}</span>
                    <span style={{ width: 72 }}>
                      <Meter value={s.accuracy} />
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </section>

        <section className="panel span-6">
          <div className="panel-head">
            <h2 className="section-title">{t('home.recent.title')}</h2>
            {finished.length > 0 && <span className="chip">{attempts.filter((a) => a.finishedAt).length}</span>}
            <Link to="/estadisticas#historial">{t('common.viewAll')}</Link>
          </div>
          {finished.length === 0 ? (
            <p className="empty">{t('home.recent.empty')}</p>
          ) : (
            <div className="rows">
              {finished.map((a) => {
                const r = a.result!
                return (
                  <button key={a.id} className="row-card" onClick={() => navigate(`/test/${a.id}/resultado`)}>
                    <span className="row-main">
                      <div className="row-title">{a.title}</div>
                      <div className="row-meta">{formatDate(a.finishedAt!, prefs.lang, true)}</div>
                    </span>
                    <span className="row-end row">
                      <span className="num muted">
                        {r.correct}/{r.total}
                      </span>
                      {r.passed === true && <span className="pill pill-positive">{t('res.passed')}</span>}
                      {r.passed === false && <span className="pill pill-negative">{t('res.failed')}</span>}
                      <ChevronRight className="row-icon" />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
