import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import type { Lang } from '../../shared/exam.ts'
import { api, type Theme } from '../api.ts'
import { useApp } from '../store.tsx'
import { formatDate } from '../lib.ts'

export function Settings() {
  const { user, access, prefs, setPrefs, setUser, refresh, t } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  if (!user) return null

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const { user: u } = await api.updateMe({ name: name.trim() })
    setUser(u)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const logout = async () => {
    await api.logout().catch(() => {})
    setUser(null)
    navigate('/entrar', { replace: true })
  }

  const reset = async () => {
    await api.resetProgress()
    await refresh()
    setConfirmReset(false)
    setResetDone(true)
  }

  const langs: Lang[] = ['es', 'ca']
  const themes: Theme[] = ['system', 'light', 'dark']

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <h1 className="page-title">{t('set.title')}</h1>

      <section className="panel mt-24 stack gap-16">
        <h2 className="section-title">{t('set.profile')}</h2>
        <form className="row wrap" style={{ alignItems: 'flex-end', gap: 10 }} onSubmit={saveName}>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label htmlFor="name">{t('auth.name')}</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <button className="btn" disabled={!name.trim() || name.trim() === user.name}>
            {saved ? t('common.saved') : t('common.save')}
          </button>
        </form>
        <p className="small muted">
          {user.email} · {t('set.memberSince', { date: formatDate(user.createdAt, prefs.lang) })}
        </p>
      </section>

      {access && (
        <section className="panel mt-16 row wrap" style={{ gap: 12 }}>
          <div className="stack gap-4" style={{ flex: '1 1 260px' }}>
            <h2 className="section-title">{t('set.plan')}</h2>
            <span className="small muted">
              {!access.plan
                ? t('set.plan.free', { n: access.examsPerDay })
                : `${t(access.plan === 'lifetime' ? 'plans.lifetime' : 'plans.semester')} · ${
                    access.expiresAt ? t('plans.until', { date: formatDate(access.expiresAt, prefs.lang) }) : t('plans.forever')
                  }`}
            </span>
          </div>
          <Link to="/planes" className="btn btn-outline btn-sm">{t('lock.see')}</Link>
        </section>
      )}

      <section className="panel mt-16 stack gap-24">
        <h2 className="section-title">{t('set.appearance')}</h2>
        <div className="field">
          <span className="label">{t('set.uiLang')}</span>
          <div>
            <div className="segmented">
              {langs.map((l) => (
                <button key={l} aria-pressed={prefs.lang === l} onClick={() => setPrefs({ lang: l })}>
                  {t(`lang.${l}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="field">
          <span className="label">{t('set.qLang')}</span>
          <div>
            <div className="segmented">
              {langs.map((l) => (
                <button key={l} aria-pressed={prefs.qLang === l} onClick={() => setPrefs({ qLang: l })}>
                  {t(`lang.${l}`)}
                </button>
              ))}
            </div>
          </div>
          <span className="hint">{t('set.qLangHint')}</span>
        </div>
        <div className="field">
          <span className="label">{t('set.theme')}</span>
          <div>
            <div className="segmented">
              {themes.map((th) => (
                <button key={th} aria-pressed={prefs.theme === th} onClick={() => setPrefs({ theme: th })}>
                  {t(`theme.${th}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel mt-16 stack gap-16">
        <h2 className="section-title">{t('set.account')}</h2>
        <div className="row wrap" style={{ gap: 12 }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontWeight: 500 }}>{t('set.reset')}</div>
            <div className="small muted">{t('set.resetHint')}</div>
          </div>
          {confirmReset ? (
            <div className="row">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>{t('common.cancel')}</button>
              <button className="btn btn-danger btn-sm" onClick={reset}>{t('set.resetConfirm')}</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => { setConfirmReset(true); setResetDone(false) }}>
              {t('set.reset')}
            </button>
          )}
        </div>
        {resetDone && <p className="small muted" role="status">{t('set.resetDone')}</p>}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <button className="btn btn-outline" onClick={logout}>
            <LogOut />
            {t('auth.logout')}
          </button>
        </div>
      </section>
    </div>
  )
}
