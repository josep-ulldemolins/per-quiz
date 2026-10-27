import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Minus } from 'lucide-react'
import type { PlanId } from '../../shared/plans.ts'
import { api } from '../api.ts'
import { useApp } from '../store.tsx'
import { Loading } from '../components.tsx'
import { formatDate } from '../lib.ts'
import type { Key } from '../i18n.ts'

type Column = 'free' | PlanId

export function Plans() {
  const { access, setAccess, bank, prefs, t } = useApp()
  const [params, setParams] = useSearchParams()
  const [buying, setBuying] = useState<PlanId | null>(null)
  const [payError, setPayError] = useState(false)
  const [paid, setPaid] = useState<'ok' | 'pending' | null>(null)
  const confirmed = useRef(false)

  // Back from Stripe: confirm the session at once instead of waiting for the webhook.
  const session = params.get('session')
  useEffect(() => {
    if (params.get('pago') !== 'ok' || !session || confirmed.current) return
    confirmed.current = true
    api
      .confirmPayment(session)
      .then((a) => {
        setAccess(a)
        setPaid(a.premium ? 'ok' : 'pending')
      })
      .catch(() => setPaid('pending'))
      .finally(() => setParams({}, { replace: true }))
  }, [session, params, setParams, setAccess])

  if (!access || !bank) return <Loading />

  const money = (cents: number) =>
    new Intl.NumberFormat(prefs.lang === 'ca' ? 'ca-ES' : 'es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents % 100 ? 2 : 0,
    }).format(cents / 100)
  const reason = params.get('motivo')
  const current: Column = access.plan ?? 'free'

  const buy = async (plan: PlanId) => {
    setBuying(plan)
    setPayError(false)
    try {
      window.location.href = (await api.checkout(plan)).url
    } catch {
      setPayError(true)
      setBuying(null)
    }
  }

  const free: [string, boolean][] = [
    [t('plans.feat.exams', { n: access.examsPerDay }), true],
    [t('plans.feat.latestExam'), true],
    [t('plans.feat.review'), true],
    [t('plans.feat.theoryPartial'), true],
    [t('plans.feat.custom'), false],
    [t('plans.feat.mistakes'), false],
    [t('plans.feat.bank', { n: bank.questions.length }), false],
  ]
  const paidFeatures: [string, boolean][] = [
    [t('plans.feat.examsUnlimited'), true],
    [t('plans.feat.allExams', { n: bank.exams.length }), true],
    [t('plans.feat.review'), true],
    [t('plans.feat.theoryFull'), true],
    [t('plans.feat.custom'), true],
    [t('plans.feat.mistakes'), true],
    [t('plans.feat.bank', { n: bank.questions.length }), true],
  ]
  const columns: { id: Column; price: string; features: [string, boolean][] }[] = [
    { id: 'free', price: money(0), features: free },
    { id: 'semester', price: money(access.prices.semester), features: paidFeatures },
    { id: 'lifetime', price: money(access.prices.lifetime), features: paidFeatures },
  ]

  const action = (id: Column) => {
    if (id === 'free' || access.plan === 'lifetime') return null
    // A running semester can be extended; buying lifetime over it is an upgrade.
    const label = id === 'semester' && access.plan === 'semester' ? t('plans.extend') : t('plans.buy')
    return (
      <button
        className={`btn ${id === 'lifetime' ? 'btn-primary' : 'btn-outline'}`}
        disabled={!access.billing || buying !== null}
        onClick={() => buy(id)}
      >
        {buying === id ? t('plans.buying') : label}
      </button>
    )
  }

  return (
    <div className="fade-in">
      <h1 className="page-title">{t('plans.title')}</h1>
      <p className="lead">{t('plans.lead')}</p>

      <div className="stack gap-8 mt-24">
        {paid === 'ok' && <p className="notice">{t('plans.paid')}</p>}
        {paid === 'pending' && <p className="notice warning">{t('plans.paidPending')}</p>}
        {params.get('pago') === 'cancelado' && <p className="notice">{t('plans.cancelled')}</p>}
        {!paid && reason === 'premium' && !access.premium && <p className="notice warning">{t('plans.reason.premium')}</p>}
        {!paid && reason === 'limite' && !access.premium && (
          <p className="notice warning">{t('plans.reason.limite', { n: access.examsPerDay })}</p>
        )}
        {payError && <p className="notice error">{t('plans.payError')}</p>}
        {!access.billing && <p className="notice">{t('plans.billingOff')}</p>}
      </div>

      <div className="grid mt-24">
        {columns.map((col) => (
          <section key={col.id} className={`panel span-4 plan ${current === col.id ? 'current' : ''}`}>
            <div className="stack gap-8">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 className="section-title">{t(`plans.${col.id}` as Key)}</h2>
                {current === col.id && <span className="pill pill-positive">{t('plans.current')}</span>}
              </div>
              <span className="plan-price">{col.price}</span>
              <span className="small muted">
                {current === col.id && access.premium
                  ? access.expiresAt
                    ? t('plans.until', { date: formatDate(access.expiresAt, prefs.lang) })
                    : t('plans.forever')
                  : t(`plans.${col.id}.meta` as Key)}
              </span>
            </div>
            <ul>
              {col.features.map(([text, on]) => (
                <li key={text} className={on ? '' : 'off'}>
                  {on ? <Check /> : <Minus />}
                  {text}
                </li>
              ))}
            </ul>
            {action(col.id)}
          </section>
        ))}
      </div>

      <p className="small faint mt-16">{t('plans.secure')}</p>
    </div>
  )
}
