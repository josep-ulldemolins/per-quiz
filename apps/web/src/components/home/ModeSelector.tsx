import { FileText, BookOpen, Shuffle, ArrowRight } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ModeSelector() {
  const t = useT()
  const modes = [
    {
      icon: FileText,
      title: t.home.modes.examen.title,
      description: t.home.modes.examen.description,
      action: t.home.modes.examen.action,
      href: '/test/examen',
      gradient: 'from-sky-500 to-cyan-500',
      bgGlow: 'before:bg-sky-500/10',
    },
    {
      icon: BookOpen,
      title: t.home.modes.tema.title,
      description: t.home.modes.tema.description,
      action: t.home.modes.tema.action,
      href: '/test/tema',
      gradient: 'from-cyan-500 to-teal-500',
      bgGlow: 'before:bg-cyan-500/10',
    },
    {
      icon: Shuffle,
      title: t.home.modes.aleatori.title,
      description: t.home.modes.aleatori.description,
      action: t.home.modes.aleatori.action,
      href: '/test/aleatori',
      gradient: 'from-teal-500 to-emerald-500',
      bgGlow: 'before:bg-teal-500/10',
    },
  ]

  return (
    <section id="modes" className="container py-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t.home.modesTitle}
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          {t.home.modesSubtitle}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {modes.map((mode, i) => {
          const Icon = mode.icon
          return (
            <a
              key={i}
              href={mode.href}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-1 transition-all hover:border-transparent hover:shadow-2xl hover:-translate-y-1"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${mode.gradient}`} />
              <div className="relative bg-card rounded-[14px] p-6 h-full">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${mode.gradient} text-white mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{mode.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {mode.description}
                </p>
                <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  {mode.action}
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}
