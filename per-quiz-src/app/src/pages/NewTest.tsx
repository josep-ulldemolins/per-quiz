import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { PAPERS, type PaperId } from '../../shared/exam.ts'
import { useApp } from '../store.tsx'
import { Loading } from '../components.tsx'
import { buildRealExam, buildSimulation, customPool, examLabel, sortByTopic, type Pool } from '../lib.ts'
import { useStartTest } from '../useStartTest.ts'
import type { Key } from '../i18n.ts'

type Tab = 'simulacro' | 'real' | 'medida'
const TABS: { id: Tab; label: Key }[] = [
  { id: 'simulacro', label: 'new.tab.simulation' },
  { id: 'real', label: 'new.tab.real' },
  { id: 'medida', label: 'new.tab.custom' },
]
const PAPER_IDS: PaperId[] = ['per', 'pnb', 'comp']
const TIMERS = [0, 30, 45, 60, 90]
const POOLS: Pool[] = ['all', 'unseen', 'wrong', 'weak', 'hard', 'bookmarked']
const COUNTS = [10, 20, 30, 45, 0]

export function NewTest() {
  const { bank, progress, difficulty, attempts, t, topicName, prefs } = useApp()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((x) => x.id === params.get('tipo'))?.id ?? 'simulacro') as Tab
  const { start, busy, error } = useStartTest()

  const [paper, setPaper] = useState<PaperId>('per')
  const [timer, setTimer] = useState(0)
  const [mode, setMode] = useState<'practice' | 'exam'>('exam')
  const [topics, setTopics] = useState<string[]>(() => (params.get('tema') ? [params.get('tema')!] : []))
  const [pool, setPool] = useState<Pool>('all')
  const [count, setCount] = useState(20)

  const available = useMemo(
    () => (bank ? customPool(bank, progress, difficulty, topics, pool) : []),
    [bank, progress, difficulty, topics, pool],
  )

  if (!bank) return <Loading />

  const setTab = (id: Tab) => {
    setParams({ tipo: id }, { replace: true })
    setMode(id === 'medida' ? 'practice' : 'exam')
  }
  const timeLimit = timer ? timer * 60 : null

  const bestByExam = new Map<string, number>()
  for (const a of attempts) {
    const exam = a.config?.exam as string | undefined
    if (a.kind !== 'real' || !exam || !a.result) continue
    const errors = a.result.total - a.result.correct
    bestByExam.set(exam, Math.min(bestByExam.get(exam) ?? Infinity, errors))
  }
  const exams = [...bank.exams].sort((a, b) => b.year - a.year || b.month - a.month || a.place.localeCompare(b.place) || a.version - b.version)
  const years = [...new Set(exams.map((e) => e.year))]

  const toggleTopic = (id: string) =>
    setTopics((ts) => (ts.includes(id) ? ts.filter((x) => x !== id) : [...ts, id]))

  const startCustom = () => {
    const chosen = count ? available.slice(0, count) : available
    const ordered = pool === 'weak' || pool === 'hard' ? chosen : sortByTopic(bank, chosen)
    const title =
      topics.length === 1
        ? topicName(topics[0])
        : pool === 'all'
          ? t('kind.custom')
          : t(`new.custom.pool.${pool}` as Key)
    start({
      kind: pool === 'wrong' || pool === 'weak' ? 'mistakes' : 'custom',
      paper: null,
      title,
      mode,
      timeLimit,
      questionIds: ordered.map((q) => q.id),
      config: { topics, pool, count },
    })
  }

  return (
    <div className="fade-in">
      <h1 className="page-title">{t('new.title')}</h1>
      <p className="lead">{t('new.lead')}</p>

      <div className="segmented mt-24" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)}>
            {t(x.label)}
          </button>
        ))}
      </div>

      <div className="grid mt-24">
        <section className="panel span-8">
          {tab === 'simulacro' && (
            <div className="stack gap-24">
              <p className="muted" style={{ maxWidth: '62ch' }}>{t('new.sim.lead')}</p>
              <div className="rows" role="radiogroup" aria-label={t('new.sim.paper')}>
                {PAPER_IDS.map((p) => (
                  <button
                    key={p}
                    role="radio"
                    aria-checked={paper === p}
                    className="row-card"
                    style={paper === p ? { borderColor: 'var(--text)' } : undefined}
                    onClick={() => setPaper(p)}
                  >
                    <span
                      className="check-dot"
                      style={{ width: 14, height: 14, border: '1.5px solid var(--control)', background: paper === p ? 'var(--text)' : 'transparent', boxShadow: paper === p ? 'inset 0 0 0 3px var(--raised)' : 'none' }}
                    />
                    <span className="row-main">
                      <div className="row-title">{t(`paper.${p}` as Key)}</div>
                      <div className="row-meta">{t(`paper.${p}.meta` as Key)}</div>
                    </span>
                  </button>
                ))}
              </div>
              <div>
                <h2 className="section-title">{t('new.sim.rules')}</h2>
                <ul className="muted" style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>{t('new.sim.rule.total', { n: PAPERS[paper].maxErrors })}</li>
                  {Object.entries(PAPERS[paper].topicMaxErrors).map(([topic, n]) => (
                    <li key={topic}>{t('new.sim.rule.topic', { n, topic: topicName(topic) })}</li>
                  ))}
                  <li>{t('new.sim.rule.blank')}</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'real' && (
            <div className="stack gap-24">
              <p className="muted" style={{ maxWidth: '62ch' }}>{t('new.real.lead')}</p>
              {years.map((year) => (
                <div key={year}>
                  <div className="panel-head">
                    <h2 className="section-title">{year}</h2>
                    <span className="chip">{exams.filter((e) => e.year === year).length}</span>
                  </div>
                  <div className="rows">
                    {exams
                      .filter((e) => e.year === year)
                      .map((e) => {
                        const best = bestByExam.get(e.id)
                        const ids = buildRealExam(bank, e.id)
                        return (
                          <button
                            key={e.id}
                            className="row-card"
                            disabled={busy}
                            onClick={() =>
                              start({
                                kind: 'real',
                                paper: 'per',
                                title: `${examLabel(bank, e.id, prefs.lang)} · ${t('new.real.version', { n: e.version })}`,
                                mode,
                                timeLimit,
                                questionIds: ids,
                                config: { exam: e.id },
                              })
                            }
                          >
                            <span className="row-main">
                              <div className="row-title">{examLabel(bank, e.id, prefs.lang)}</div>
                              <div className="row-meta">
                                {t('new.real.version', { n: e.version })} · {t('common.questions', { n: ids.length })}
                              </div>
                            </span>
                            <span className="row-end row">
                              {best == null ? (
                                <span className="small faint">{t('new.real.notTried')}</span>
                              ) : (
                                <span className={`pill ${best <= PAPERS.per.maxErrors ? 'pill-positive' : 'pill-neutral'}`}>
                                  {t('new.real.best', { n: best })}
                                </span>
                              )}
                              <ChevronRight className="row-icon" />
                            </span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'medida' && (
            <div className="stack gap-24">
              <div className="field">
                <span className="label">{t('new.custom.topics')}</span>
                <div className="chips">
                  <button className="chip-toggle" aria-pressed={topics.length === 0} onClick={() => setTopics([])}>
                    {t('new.custom.allTopics')}
                  </button>
                  {bank.topics.map((tp) => (
                    <button key={tp.id} className="chip-toggle" aria-pressed={topics.includes(tp.id)} onClick={() => toggleTopic(tp.id)}>
                      {topicName(tp.id)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">{t('new.custom.pool')}</span>
                <div className="chips">
                  {POOLS.map((p) => (
                    <button key={p} className="chip-toggle" aria-pressed={pool === p} onClick={() => setPool(p)}>
                      {t(`new.custom.pool.${p}` as Key)}
                    </button>
                  ))}
                </div>
                {pool === 'hard' && <span className="hint">{t('new.custom.pool.hardHint')}</span>}
              </div>
              <div className="field">
                <span className="label">{t('new.custom.count')}</span>
                <div>
                  <div className="segmented">
                    {COUNTS.map((n) => (
                      <button key={n} aria-pressed={count === n} onClick={() => setCount(n)}>
                        {n || t('new.custom.countAll')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className={available.length ? 'small muted' : 'notice'}>
                {available.length ? t('new.custom.available', { n: available.length }) : t('new.custom.none')}
              </p>
            </div>
          )}
        </section>

        <aside className="panel span-4 side stack gap-24" style={{ alignSelf: 'start' }}>
          <div className="field">
            <span className="label">{t('new.feedback')}</span>
            <div>
              <div className="segmented">
                <button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>{t('new.feedback.practice')}</button>
                <button aria-pressed={mode === 'exam'} onClick={() => setMode('exam')}>{t('new.feedback.exam')}</button>
              </div>
            </div>
          </div>
          <div className="field">
            <span className="label">{t('new.timer')}</span>
            <select className="select" value={timer} onChange={(e) => setTimer(Number(e.target.value))}>
              {TIMERS.map((m) => (
                <option key={m} value={m}>{m ? t('new.timer.min', { n: m }) : t('new.timer.off')}</option>
              ))}
            </select>
          </div>
          {tab !== 'real' && (
            <button
              className="btn btn-primary"
              disabled={busy || (tab === 'medida' && !available.length)}
              onClick={() =>
                tab === 'simulacro'
                  ? start({
                      kind: 'simulation',
                      paper,
                      title: `${t('kind.simulation')} · ${t(`paper.${paper}` as Key)}`,
                      mode,
                      timeLimit,
                      questionIds: buildSimulation(bank, paper),
                      config: { paper },
                    })
                  : startCustom()
              }
            >
              {busy ? t('new.starting') : t('new.start')}
            </button>
          )}
          {error && <p className="notice error">{t('auth.err.generic')}</p>}
        </aside>
      </div>
    </div>
  )
}
