import { useEffect, useState } from 'react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TEMAS, TEMA_SLUGS, type TemaSlug } from '@per-quiz/shared'
import { useLocaleStore } from '@/stores/localeStore'
import { Play, BookOpen } from 'lucide-react'
import { getPreguntasByTema } from '@/lib/supabase'

const COUNT_OPTIONS = [10, 20, 30, 45] as const

export function TemaSelector() {
  const t = useT()
  const { locale } = useLocaleStore()
  const [counts, setCounts] = useState<Record<TemaSlug, number>>({} as any)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all(
      TEMA_SLUGS.map(slug =>
        getPreguntasByTema(slug).then(questions => ({ slug, count: questions.length }))
      )
    ).then(results => {
      const newCounts: any = {}
      results.forEach(r => { newCounts[r.slug] = r.count })
      setCounts(newCounts)
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t.selectors.loading}
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          {t.home.modes.tema.title}
        </h1>
        <p className="text-muted-foreground">
          {t.home.modes.tema.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMA_SLUGS.map(slug => {
          const tema = TEMAS[slug]
          const total = counts[slug] || 0
          return (
            <Card key={slug} className="border-border/50 hover:border-border transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{tema.icon}</div>
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {locale === 'ca' ? tema.nombre_ca : tema.nombre_es}
                    </CardTitle>
                    <CardDescription className="text-xs">{total} preguntes disponibles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">{t.selectors.numQuestions}:</p>
                <div className="flex flex-wrap gap-2">
                  {COUNT_OPTIONS.map(count => {
                    const actual = Math.min(count, total)
                    const disabled = actual === 0
                    return (
                      <Button
                        key={count}
                        asChild={!disabled}
                        size="sm"
                        variant="outline"
                        disabled={disabled}
                      >
                        {!disabled ? (
                          <a href={`/test/tema/${slug}?n=${count}`}>
                            <Play className="h-3 w-3 mr-1" />
                            {actual}
                          </a>
                        ) : (
                          <span>{count}</span>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
