import { Anchor, ArrowRight, Sparkles } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Button } from '@/components/ui/button'
import { Link } from 'lucide-react'

export function Hero() {
  const t = useT()
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-sky-500/10 via-cyan-500/10 to-teal-500/10 rounded-full blur-3xl" />
      </div>
      <div className="container py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-700 dark:text-sky-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            {t.home.badge}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            {t.home.title}{' '}
            <span className="gradient-text inline-block">{t.home.titleHighlight}</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.home.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" variant="gradient" className="text-base">
              <a href="#modes">
                {t.home.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <a href="/estadistiques">{t.home.ctaSecondary}</a>
            </Button>
          </div>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: t.home.stats.examens, value: '28', color: 'from-sky-500 to-cyan-500' },
              { label: t.home.stats.preguntes, value: '1.257', color: 'from-cyan-500 to-teal-500' },
              { label: t.home.stats.temes, value: '11', color: 'from-teal-500 to-emerald-500' },
              { label: t.home.stats.anys, value: '2', color: 'from-emerald-500 to-sky-500' },
            ].map((stat, i) => (
              <div key={i} className="glass rounded-2xl p-4 text-center">
                <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
