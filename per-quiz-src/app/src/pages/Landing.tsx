import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, BookOpen, Check, FileCheck2, Languages, Minus, RotateCcw, Timer } from 'lucide-react'
import type { Pricing } from '../../shared/plans.ts'
import { api } from '../api.ts'
import { useApp } from '../store.tsx'
import { Brand, ExamSheet, LangSwitch, ThemeToggle } from '../components.tsx'
import type { TopicStat } from '../lib.ts'
import type { Key } from '../i18n.ts'

// Shown until /api/pricing answers, so the plans never render empty.
const FALLBACK: Pricing = { prices: { semester: 999, lifetime: 1999 }, examsPerDay: 3 }

/** A believable mid-preparation sheet: a few topics mastered, a couple still weak. */
const DEMO_ACCURACY = [0.92, 0.84, 0.71, 0.45, 0.88, 0.63, 0.38, 0.81, 0.56, 0.9, 0.74]

export function Landing() {
  const { bank, prefs, t } = useApp()
  const [pricing, setPricing] = useState<Pricing>(FALLBACK)

  useEffect(() => {
    api.pricing().then(setPricing).catch(() => {})
  }, [])

  const money = (cents: number) =>
    new Intl.NumberFormat(prefs.lang === 'ca' ? 'ca-ES' : 'es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: cents % 100 ? 2 : 0,
    }).format(cents / 100)

  const questions = bank?.questions.length
  const exams = bank?.exams.length
  const demo: TopicStat[] =
    bank?.topics.map((topic, i) => {
      const accuracy = DEMO_ACCURACY[i % DEMO_ACCURACY.length]
      return { id: topic.id, total: 0, seen: 1, answers: 1, correct: 0, mastered: 0, review: 0, accuracy }
    }) ?? []

  const features = [
    { icon: FileCheck2, key: 'real' },
    { icon: Timer, key: 'sim' },
    { icon: RotateCcw, key: 'review' },
    { icon: BookOpen, key: 'theory' },
    { icon: BarChart3, key: 'stats' },
    { icon: Languages, key: 'lang' },
  ] as const

  const n = pricing.examsPerDay
  const free: [string, boolean][] = [
    [t('plans.feat.exams', { n }), true],
    [t('plans.feat.latestExam'), true],
    [t('plans.feat.review'), true],
    [t('plans.feat.theoryPartial'), true],
    [t('plans.feat.custom'), false],
    [t('plans.feat.mistakes'), false],
    [t('plans.feat.bank', { n: questions ?? '' }), false],
  ]
  const paid: [string, boolean][] = [
    [t('plans.feat.examsUnlimited'), true],
    [t('plans.feat.allExams', { n: exams ?? '' }), true],
    [t('plans.feat.review'), true],
    [t('plans.feat.theoryFull'), true],
    [t('plans.feat.custom'), true],
    [t('plans.feat.mistakes'), true],
    [t('plans.feat.bank', { n: questions ?? '' }), true],
  ]
  const plans = [
    { id: 'free', price: money(0), features: free },
    { id: 'semester', price: money(pricing.prices.semester), features: paid },
    { id: 'lifetime', price: money(pricing.prices.lifetime), features: paid },
  ] as const

  return (
    <div className="landing">
      <header className="landing-top">
        <Brand />
        <div className="row">
          <LangSwitch />
          <ThemeToggle />
          <Link to="/entrar" className="btn btn-ghost btn-sm landing-login">{t('auth.login')}</Link>
          <Link to="/registro" className="btn btn-primary btn-sm">{t('auth.register')}</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div>
          <h1 className="greeting">{t('landing.hero.title')}</h1>
          <p className="finding">{t('landing.hero.lead')}</p>
          <div className="row wrap mt-24">
            <Link to="/registro" className="btn btn-primary landing-cta">
              {t('landing.cta')} <ArrowRight />
            </Link>
            <Link to="/entrar" className="btn btn-outline landing-cta">{t('landing.haveAccount')}</Link>
          </div>
          <p className="small muted mt-16">{t('landing.hero.note', { n })}</p>
        </div>
        {bank && (
          <figure className="landing-sheet panel">
            <ExamSheet bank={bank} stats={demo} compact />
            <figcaption className="small muted mt-16">{t('landing.sheet.caption')}</figcaption>
          </figure>
        )}
      </section>

      {bank && (
        <section className="landing-stats">
          <div><span className="num">{questions}</span><span className="muted">{t('landing.stat.questions')}</span></div>
          <div><span className="num">{exams}</span><span className="muted">{t('landing.stat.exams')}</span></div>
          <div><span className="num">{bank.topics.length}</span><span className="muted">{t('landing.stat.topics')}</span></div>
        </section>
      )}

      <section className="landing-section">
        <h2 className="page-title">{t('landing.features.title')}</h2>
        <p className="lead">{t('landing.features.lead')}</p>
        <div className="grid mt-24">
          {features.map(({ icon: Icon, key }) => (
            <article key={key} className="panel span-4 landing-feature">
              <span className="landing-icon"><Icon /></span>
              <h3 className="section-title">{t(`landing.f.${key}.title` as Key)}</h3>
              <p className="muted">{t(`landing.f.${key}.text` as Key, { exams: exams ?? '' })}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2 className="page-title">{t('landing.how.title')}</h2>
        <ol className="landing-steps mt-24">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <span className="landing-step-num">{i}</span>
              <h3 className="section-title">{t(`landing.how.${i}.title` as Key)}</h3>
              <p className="muted">{t(`landing.how.${i}.text` as Key)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" id="planes">
        <h2 className="page-title">{t('landing.plans.title')}</h2>
        <p className="lead">{t('landing.plans.lead')}</p>
        <div className="grid mt-24">
          {plans.map((plan) => (
            <section key={plan.id} className={`panel span-4 plan ${plan.id === 'lifetime' ? 'current' : ''}`}>
              <div className="stack gap-8">
                <h3 className="section-title">{t(`plans.${plan.id}` as Key)}</h3>
                <span className="plan-price">{plan.price}</span>
                <span className="small muted">{t(`plans.${plan.id}.meta` as Key)}</span>
              </div>
              <ul>
                {plan.features.map(([text, on]) => (
                  <li key={text} className={on ? '' : 'off'}>
                    {on ? <Check /> : <Minus />}
                    {text}
                  </li>
                ))}
              </ul>
              <Link to="/registro" className={`btn ${plan.id === 'lifetime' ? 'btn-primary' : 'btn-outline'}`}>
                {t('landing.cta')}
              </Link>
            </section>
          ))}
        </div>
        <p className="small faint mt-16">{t('plans.secure')}</p>
      </section>

      <section className="landing-section landing-faq">
        <h2 className="page-title">{t('landing.faq.title')}</h2>
        <div className="mt-24">
          {[1, 2, 3, 4].map((i) => (
            <details key={i}>
              <summary>{t(`landing.faq.${i}.q` as Key)}</summary>
              <p className="muted">{t(`landing.faq.${i}.a` as Key, { n })}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final panel">
        <h2 className="greeting">{t('landing.final.title')}</h2>
        <p className="finding">{t('landing.final.lead')}</p>
        <Link to="/registro" className="btn btn-primary landing-cta mt-24">
          {t('landing.cta')} <ArrowRight />
        </Link>
      </section>

      <footer className="landing-footer small faint">
        <span>{t('app.name')} · {t('landing.footer')}</span>
        <Link to="/entrar" className="link">{t('auth.login')}</Link>
      </footer>
    </div>
  )
}
