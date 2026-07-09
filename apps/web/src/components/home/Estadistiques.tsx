import { useEffect, useState } from 'react'
import { TrendingUp, Award, Target, Clock, BarChart3 } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getResultadosRecientes, type ResultadoTest } from '@/lib/supabase'
import { TEMAS } from '@per-quiz/shared'
import { useLocaleStore } from '@/stores/localeStore'
import { formatTime } from '@/lib/utils'

export function Estadistiques() {
  const t = useT()
  const { locale } = useLocaleStore()
  const [resultados, setResultados] = useState<ResultadoTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getResultadosRecientes(50)
      .then(setResultados)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Carregant...</div>
  }

  if (resultados.length === 0) {
    return (
      <div className="container max-w-2xl py-20">
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Encara no tens resultats</h2>
            <p className="text-muted-foreground mb-6">
              Comença a fer tests per veure les teves estadístiques aquí.
            </p>
            <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
              Tornar a inici
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate stats
  const totalTests = resultados.length
  const totalPreguntas = resultados.reduce((acc, r) => acc + r.num_preguntas, 0)
  const totalCorrectas = resultados.reduce((acc, r) => acc + r.correctas, 0)
  const promedioAciertos = totalPreguntas > 0 ? (totalCorrectas / totalPreguntas) * 100 : 0
  const totalTiempo = resultados.reduce((acc, r) => acc + r.tiempo_segundos, 0)
  const promedioTiempo = totalTiempo / totalTests
  const aprobados = resultados.filter(r => (r.correctas / r.num_preguntas) >= 0.5).length
  const tasaAprobados = (aprobados / totalTests) * 100

  // Group by mode
  const porModo = resultados.reduce((acc, r) => {
    if (!acc[r.modo]) acc[r.modo] = { count: 0, correctas: 0, total: 0 }
    acc[r.modo].count++
    acc[r.modo].correctas += r.correctas
    acc[r.modo].total += r.num_preguntas
    return acc
  }, {} as Record<string, { count: number; correctas: number; total: number }>)

  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Estadístiques</h1>
        <p className="text-muted-foreground">El teu progrés en la preparació del PER</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <Target className="h-5 w-5 text-sky-500 mb-2" />
            <div className="text-2xl font-bold">{totalTests}</div>
            <div className="text-xs text-muted-foreground">Tests realitzats</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
            <div className="text-2xl font-bold">{Math.round(promedioAciertos)}%</div>
            <div className="text-xs text-muted-foreground">Precisió mitjana</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <Award className="h-5 w-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold">{Math.round(tasaAprobados)}%</div>
            <div className="text-xs text-muted-foreground">Taxa d'aprovats</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <Clock className="h-5 w-5 text-cyan-500 mb-2" />
            <div className="text-2xl font-bold font-mono">{formatTime(Math.round(promedioTiempo))}</div>
            <div className="text-xs text-muted-foreground">Temps mitjà</div>
          </CardContent>
        </Card>
      </div>

      {/* By mode */}
      <Card className="border-border/50 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Resultats per mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(porModo).map(([modo, stats]) => {
            const pct = (stats.correctas / stats.total) * 100
            return (
              <div key={modo}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-medium capitalize">
                    {modo === 'examen' ? 'Examen complet' : modo === 'tema' ? 'Per tema' : 'Aleatori'}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {stats.count} tests · {Math.round(pct)}% precisió
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Recent tests */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Tests recents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {resultados.slice(0, 10).map((r, i) => {
              const pct = (r.correctas / r.num_preguntas) * 100
              const aprobado = pct >= 50
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={aprobado ? 'success' : 'destructive'}>
                        {Math.round(pct)}%
                      </Badge>
                      <span className="text-sm font-medium">
                        {r.examen_nombre ? `${r.examen_nombre} v${r.examen_version}` :
                         r.tema_filtro ? TEMAS[r.tema_filtro as keyof typeof TEMAS]?.nombre_ca || r.tema_filtro :
                         'Aleatori'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.correctas}/{r.num_preguntas} correctes · {formatTime(r.tiempo_segundos)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at || '').toLocaleDateString(locale === 'ca' ? 'ca-ES' : 'es-ES')}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
