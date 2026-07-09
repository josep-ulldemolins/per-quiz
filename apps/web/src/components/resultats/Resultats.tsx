import { CheckCircle2, XCircle, AlertCircle, ArrowRight, Home, RotateCcw, BookOpen } from 'lucide-react'
import { useT } from '@/stores/localeStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TEMAS, PER_APPROVAL_THRESHOLD, type PreguntaParaTest, type TestEnCurso, type RespuestaUsuario } from '@per-quiz/shared'
import { useLocaleStore } from '@/stores/localeStore'
import { cn, formatTime } from '@/lib/utils'

interface ResultatsProps {
  test: TestEnCurso
  correctas: number
  tiempoSegundos: number
  onRetry?: () => void
  onHome?: () => void
}

export function Resultats({ test, correctas, tiempoSegundos, onRetry, onHome }: ResultatsProps) {
  const t = useT()
  const { locale } = useLocaleStore()
  const totalPreguntas = test.preguntas.length
  const incorrectas = test.preguntas.filter(p => {
    const r = test.respuestas[p.id]
    return r && p.respuesta_correcta && r.respuesta !== p.respuesta_correcta
  }).length
  const sinResponder = totalPreguntas - correctas - incorrectas
  const porcentaje = correctas / totalPreguntas
  const apto = porcentaje >= PER_APPROVAL_THRESHOLD

  // Group by topic
  const porTema = test.preguntas.reduce((acc, p) => {
    if (!acc[p.tema]) acc[p.tema] = { total: 0, correctas: 0 }
    acc[p.tema].total++
    const r = test.respuestas[p.id]
    if (r && p.respuesta_correcta && r.respuesta === p.respuesta_correcta) {
      acc[p.tema].correctas++
    }
    return acc
  }, {} as Record<string, { total: number; correctas: number }>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/20">
      <div className="container max-w-4xl py-8">
        {/* Hero score */}
        <Card className="border-border/50 overflow-hidden mb-6">
          <div className={cn(
            'h-2',
            apto ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-red-500'
          )} />
          <CardContent className="p-8 text-center">
            <div className={cn(
              'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4',
              apto ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
            )}>
              {apto ? <CheckCircle2 className="h-10 w-10" /> : <AlertCircle className="h-10 w-10" />}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {apto ? t.results.congratulations : t.results.needsWork}
            </h1>
            <p className="text-muted-foreground mb-6">
              {test.modo === 'examen' && `${test.examen_nombre} v${test.examen_version}`}
              {test.modo === 'tema' && test.tema_filtro && (locale === 'ca' ? TEMAS[test.tema_filtro].nombre_ca : TEMAS[test.tema_filtro].nombre_es)}
              {test.modo === 'aleatori' && t.test.mode.aleatori}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="glass rounded-xl p-4">
                <div className={cn(
                  'text-4xl font-bold',
                  apto ? 'text-emerald-500' : 'text-orange-500'
                )}>
                  {Math.round(porcentaje * 100)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">{apto ? t.results.apto : t.results.noApto}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-4xl font-bold text-foreground">{correctas}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.results.correct}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-4xl font-bold text-foreground">{totalPreguntas}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.results.of}</div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-2xl md:text-3xl font-bold font-mono text-foreground">{formatTime(tiempoSegundos)}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.results.time}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={onHome} variant="outline">
                <Home className="h-4 w-4 mr-2" />
                {t.results.home}
              </Button>
              {onRetry && (
                <Button onClick={onRetry} variant="gradient">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t.results.retry}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* By topic */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t.results.byTopic}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(porTema).map(([tema, stats]) => {
              const info = TEMAS[tema as keyof typeof TEMAS]
              const pct = (stats.correctas / stats.total) * 100
              return (
                <div key={tema}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium">
                      {locale === 'ca' ? info.nombre_ca : info.nombre_es}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {stats.correctas}/{stats.total}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{correctas}</div>
              <div className="text-xs text-muted-foreground">{t.results.correct2}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{incorrectas}</div>
              <div className="text-xs text-muted-foreground">{t.results.error}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <div className="text-2xl font-bold">{sinResponder}</div>
              <div className="text-xs text-muted-foreground">{t.results.unanswered}</div>
            </CardContent>
          </Card>
        </div>

        {/* Review section */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t.results.reviewAll}
            </CardTitle>
            <CardDescription>
              {t.results.questions}: {totalPreguntas}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {test.preguntas.map((p, i) => {
              const respuestaUsuario = test.respuestas[p.id]
              const esCorrecta = respuestaUsuario?.respuesta === p.respuesta_correcta
              const sinR = !respuestaUsuario
              return (
                <div key={p.id} className={cn(
                  'p-4 rounded-lg border',
                  sinR ? 'border-amber-500/30 bg-amber-500/5'
                    : esCorrecta ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                )}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn(
                      'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                      sinR ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        : esCorrecta ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-500/20 text-red-700 dark:text-red-300'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed mb-3">{p.enunciado}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {(['a', 'b', 'c', 'd'] as const).map(letra => {
                          const esCorrectaOpcion = p.respuesta_correcta === letra
                          const esUsuario = respuestaUsuario?.respuesta === letra
                          return (
                            <div
                              key={letra}
                              className={cn(
                                'p-2 rounded border flex items-center gap-2',
                                esCorrectaOpcion
                                  ? 'border-emerald-500/40 bg-emerald-500/10 font-medium'
                                  : esUsuario
                                  ? 'border-red-500/40 bg-red-500/10'
                                  : 'border-border bg-card/50'
                              )}
                            >
                              <span className="font-mono font-bold">{letra.toUpperCase()})</span>
                              <span className="flex-1">{p.opciones[letra]}</span>
                              {esCorrectaOpcion && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                              {esUsuario && !esCorrectaOpcion && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {respuestaUsuario ? (
                          <>{t.results.yourAnswer}: <span className="font-mono font-bold uppercase">{respuestaUsuario.respuesta}</span></>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">{t.results.unanswered}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
