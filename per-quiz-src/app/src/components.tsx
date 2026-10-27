import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, Home, ListChecks, Menu, Moon, PlusCircle, Settings, Sun, X } from 'lucide-react'
import { PAPERS, paperTopics, type Bank, type Lang } from '../shared/exam.ts'
import { useApp } from './store.tsx'
import type { TopicStat } from './lib.ts'
import type { Theme } from './api.ts'

/** The mark: a signal flag on its halyard, split like the code flags every candidate learns. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="0" y="0" width="28" height="28" rx="8" fill="var(--accent)" />
      <path d="M8 6.5v15" stroke="var(--accent-ink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 7h11.5v8.5H9z" fill="var(--accent-ink)" />
      <path d="M9 7h11.5L9 15.5z" fill="var(--accent)" opacity="0.55" />
    </svg>
  )
}

export function Brand() {
  const { t } = useApp()
  return (
    <Link to="/" className="brand">
      <Logo />
      <div>
        <div className="brand-name">{t('app.name')}</div>
        <div className="brand-sub">{t('app.tagline')}</div>
      </div>
    </Link>
  )
}

export function ThemeToggle() {
  const { prefs, setPrefs, t } = useApp()
  const dark =
    prefs.theme === 'dark' || (prefs.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const next: Theme = dark ? 'light' : 'dark'
  return (
    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPrefs({ theme: next })} title={t('theme.toggle')} aria-label={t('theme.toggle')}>
      {dark ? <Sun /> : <Moon />}
    </button>
  )
}

export function LangSwitch() {
  const { prefs, setPrefs } = useApp()
  const langs: Lang[] = ['es', 'ca']
  return (
    <div className="segmented sm" role="group" aria-label="Idioma">
      {langs.map((l) => (
        <button key={l} aria-pressed={prefs.lang === l} onClick={() => setPrefs({ lang: l, qLang: l })}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useApp()
  const items = [
    { to: '/', icon: Home, label: t('nav.home'), end: true },
    { to: '/temario', icon: BookOpen, label: t('nav.theory') },
    { to: '/test/nuevo', icon: PlusCircle, label: t('nav.newTest') },
    { to: '/preguntas', icon: ListChecks, label: t('nav.questions') },
    { to: '/estadisticas', icon: BarChart3, label: t('nav.stats') },
  ]
  return (
    <nav className="nav-group">
      <div className="nav-label">{t('nav.study')}</div>
      {items.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-item" onClick={onNavigate}>
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserRow({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useApp()
  if (!user) return null
  return (
    <Link to="/ajustes" className="user-row" onClick={onNavigate}>
      <span className="avatar">{user.name.trim()[0]?.toUpperCase()}</span>
      <span className="who">
        <div>{user.name}</div>
        <div className="small muted">{user.email}</div>
      </span>
      <Settings className="row-icon" style={{ marginLeft: 'auto' }} />
    </Link>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false) }, [loc.pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <NavItems />
        <div className="sidebar-foot">
          <div className="prefs-row">
            <LangSwitch />
            <span className="spacer" />
            <ThemeToggle />
          </div>
          <UserRow />
        </div>
      </aside>

      <header className="topbar">
        <Link to="/" className="row" style={{ textDecoration: 'none' }}>
          <Logo size={24} />
          <span className="topbar-title">{t('app.name')}</span>
        </Link>
        <div className="row">
          <ThemeToggle />
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(true)} aria-label={t('nav.menu')}>
            <Menu />
          </button>
        </div>
      </header>
      <div className={`sheet-nav ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Brand />
          <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} aria-label={t('nav.close')}>
            <X />
          </button>
        </div>
        <NavItems onNavigate={() => setOpen(false)} />
        <div className="sidebar-foot">
          <div className="prefs-row">
            <LangSwitch />
          </div>
          <UserRow onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <main className="main">
        <div className="canvas">{children}</div>
      </main>
    </div>
  )
}

export function mastery(s: TopicStat | undefined): 'none' | 'low' | 'mid' | 'high' {
  if (!s || s.accuracy == null) return 'none'
  if (s.accuracy < 0.5) return 'low'
  if (s.accuracy < 0.8) return 'mid'
  return 'high'
}

/**
 * The official answer sheet: 45 positions in topic blocks. Each block is coloured by how well
 * the candidate knows that topic, and carries the topic's error limit when the exam has one.
 */
export function ExamSheet({
  bank,
  stats,
  onPick,
  compact = false,
}: {
  bank: Bank
  stats: TopicStat[]
  onPick?: (topicId: string) => void
  compact?: boolean
}) {
  const { t, topicName } = useApp()
  const byId = new Map(stats.map((s) => [s.id, s]))
  const limits = PAPERS.per.topicMaxErrors
  return (
    <div>
      <div className="exam-sheet">
        {paperTopics(bank.topics, PAPERS.per).map(({ topic }) => {
          const s = byId.get(topic.id)
          const m = mastery(s)
          const cells = []
          for (let i = topic.from; i <= topic.to; i++)
            cells.push(
              <span key={i} className="sheet-cell" data-m={m}>
                {i}
              </span>,
            )
          const label = (
            <>
              <span className="sheet-cells">{cells}</span>
              {!compact && (
                <span className="sheet-name">
                  {topicName(topic.id)}
                  <br />
                  <span className="num">{s?.accuracy == null ? '–' : `${Math.round(s.accuracy * 100)} %`}</span>
                  {limits[topic.id] != null && <span className="faint"> · {t('home.sheet.limit', { n: limits[topic.id] })}</span>}
                </span>
              )}
            </>
          )
          return onPick ? (
            <button key={topic.id} className="sheet-block" onClick={() => onPick(topic.id)} title={topicName(topic.id)}>
              {label}
            </button>
          ) : (
            <div key={topic.id} className="sheet-block" style={{ cursor: 'default' }}>
              {label}
            </div>
          )
        })}
      </div>
      {!compact && (
        <div className="sheet-legend">
          <span><i style={{ background: 'var(--m-none)' }} />{t('home.sheet.legend.none')}</span>
          <span><i style={{ background: 'var(--m-low)' }} />{t('home.sheet.legend.low')}</span>
          <span><i style={{ background: 'var(--m-mid)' }} />{t('home.sheet.legend.mid')}</span>
          <span><i style={{ background: 'var(--m-high)' }} />{t('home.sheet.legend.high')}</span>
        </div>
      )}
    </div>
  )
}

export function Meter({ value, ink = false }: { value: number | null; ink?: boolean }) {
  return (
    <span className={`meter ${ink ? 'ink' : ''}`} role="presentation">
      <span style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
    </span>
  )
}

export function Loading() {
  return (
    <div className="grid" aria-busy="true">
      <div className="skeleton span-12" style={{ minHeight: 64 }} />
      <div className="skeleton span-3" />
      <div className="skeleton span-3" />
      <div className="skeleton span-3" />
      <div className="skeleton span-3" />
      <div className="skeleton span-9" style={{ minHeight: 220 }} />
      <div className="skeleton span-3" style={{ minHeight: 220 }} />
    </div>
  )
}
