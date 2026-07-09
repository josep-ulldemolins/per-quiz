import { useEffect, useState } from 'react'
import { Calendar, MapPin, FileText, Play, ArrowRight } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getExamenes, type Examen } from '@/lib/supabase'

export function ExamenSelector() {
  const t = useT()
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAno, setFiltroAno] = useState<'all' | '2025' | '2026'>('all')

  useEffect(() => {
    getExamenes()
      .then(setExamenes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = examenes.filter(e => {
    if (filtroAno === 'all') return true
    return e.fecha?.startsWith(filtroAno)
  })

  // Group by base name (e.g. 25ABRIL-BCN)
  const grouped = filtered.reduce((acc, e) => {
    const base = e.nombre
    if (!acc[base]) acc[base] = []
    acc[base].push(e)
    return acc
  }, {} as Record<string, Examen[]>)

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t.selectors.loading}
      </div>
    )
  }

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          {t.home.modes.examen.title}
        </h1>
        <p className="text-muted-foreground">
          {t.home.modes.examen.description}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', '2025', '2026'] as const).map(ano => (
          <Button
            key={ano}
            variant={filtroAno === ano ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltroAno(ano)}
          >
            {ano === 'all' ? 'Tots' : ano}
          </Button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {t.selectors.noExams}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([baseName, versions]) => (
            <Card key={baseName} className="border-border/50 hover:border-border transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono">{baseName}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3 text-xs">
                      {versions[0].fecha && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {versions[0].fecha}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {versions[0].lugar}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{versions[0].total_preguntas} Q</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {versions.map(v => (
                    <Button
                      key={v.id}
                      asChild
                      size="sm"
                      variant="default"
                    >
                      <a href={`/test/examen/${v.id}`}>
                        <Play className="h-3 w-3 mr-1" />
                        v{v.version}
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
