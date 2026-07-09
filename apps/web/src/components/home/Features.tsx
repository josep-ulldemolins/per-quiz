import { CheckCircle2, Zap, Smartphone, Globe } from 'lucide-react'
import { useT } from '@/stores/localeStore'

export function Features() {
  const t = useT()
  const features = [
    {
      icon: CheckCircle2,
      title: t.home.features.real.title,
      description: t.home.features.real.description,
      color: 'text-emerald-500',
    },
    {
      icon: Zap,
      title: t.home.features.instant.title,
      description: t.home.features.instant.description,
      color: 'text-amber-500',
    },
    {
      icon: Smartphone,
      title: t.home.features.mobile.title,
      description: t.home.features.mobile.description,
      color: 'text-sky-500',
    },
    {
      icon: Globe,
      title: t.home.features.bilingual.title,
      description: t.home.features.bilingual.description,
      color: 'text-cyan-500',
    },
  ]

  return (
    <section className="container py-20 border-t border-border/40">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          {t.home.featuresTitle}
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {features.map((feature, i) => {
          const Icon = feature.icon
          return (
            <div
              key={i}
              className="relative p-6 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-border transition-colors"
            >
              <Icon className={`h-8 w-8 ${feature.color} mb-3`} />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
