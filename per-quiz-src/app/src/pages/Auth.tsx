import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api, ApiError } from '../api.ts'
import { useApp } from '../store.tsx'
import { Brand, ExamSheet, LangSwitch, ThemeToggle } from '../components.tsx'
import type { Key } from '../i18n.ts'

export function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { user, bank, prefs, setUser, t } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />
  const register = mode === 'register'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { user } = register
        ? await api.register(name, email, password, prefs.lang)
        : await api.login(email, password)
      setUser(user)
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'generic')
    } finally {
      setBusy(false)
    }
  }

  const errKey = (error ? `auth.err.${error}` : null) as Key | null

  return (
    <div className="auth">
      <div className="auth-side">
        <Brand />
        <div>
          <h1 className="greeting">{register ? t('auth.registerTitle') : t('auth.loginTitle')}</h1>
          <p className="finding">{register ? t('auth.registerLead') : t('auth.loginLead')}</p>
          {bank && (
            <>
              <div className="sheet-preview">
                <ExamSheet bank={bank} stats={[]} compact />
              </div>
              <p className="small muted mt-16">
                {t('auth.facts', { questions: bank.questions.length, exams: bank.exams.length })}
              </p>
            </>
          )}
        </div>
        <span />
      </div>

      <div className="auth-form-wrap" style={{ position: 'relative' }}>
        <div className="auth-prefs">
          <LangSwitch />
          <ThemeToggle />
        </div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <h2 className="page-title">{register ? t('auth.register') : t('auth.login')}</h2>
          {register && (
            <div className="field">
              <label htmlFor="name">{t('auth.name')}</label>
              <input
                id="name"
                className="input"
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={error === 'name'}
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error === 'email' || error === 'email_taken'}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error === 'password' || error === 'credentials'}
              required
            />
            {register && <span className="hint">{t('auth.passwordHint')}</span>}
          </div>
          {errKey && (
            <p className="notice error" role="alert">
              {t(errKey) === errKey ? t('auth.err.generic') : t(errKey)}
            </p>
          )}
          <button className="btn btn-primary" style={{ height: 42 }} disabled={busy}>
            {register ? t('auth.register') : t('auth.login')}
          </button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {register ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <Link to={register ? '/entrar' : '/registro'} style={{ color: 'var(--text)', fontWeight: 500 }}>
              {register ? t('auth.login') : t('auth.register')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
