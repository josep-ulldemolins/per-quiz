import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useT } from '@/stores/localeStore'
import { useTestStore } from '@/stores/testStore'
import { formatTime, cn } from '@/lib/utils'
import type { PreguntaParaTest, TestEnCurso } from '@per-quiz/shared'
import { TEMAS, PER_APPROVAL_THRESHOLD, PER_EXAM_DURATION_MINUTES } from '@per-quiz/shared'
import { saveResultado } from '@/lib/supabase'
import { useLocaleStore } from '@/stores/localeStore'

interface TestRunnerProps {
  onFinish: (result: { test: TestEnCurso; correctas: number; tiempoSegundos: number }) => void
  onCancel?: () => void
  timeLimitSeconds?: number
}

export function TestRunner({ onFinish, onCancel, timeLimitSeconds }: TestRunnerProps) {
  const t = useT()
  const { locale } = useLocaleStore()
  const { currentTest, setRespuesta, finalizarTest } = useTestStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showConfirmFinish, setShowConfirmFinish] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const questionStartTime = useRef(Date.now())

  useEffect(() => {
    if (!currentTest) return
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - currentTest.tiempo_inicio) / 1000)
      setElapsedSeconds(elapsed)
      if (timeLimitSeconds && elapsed >= timeLimitSeconds) {
        handleFinish()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [currentTest, timeLimitSeconds])

  useEffect(() => {
    questionStartTime.current = Date.now()
  }, [currentIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showConfirmFinish) {
        if (e.key === 'Escape') setShowConfirmFinish(false)
        if (e.key === 'Enter') handleFinish()
        return
      }
      if (e.key === 'ArrowLeft') goPrevious()
      if (e.key === 'ArrowRight') goNext()
      if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        selectOption(e.key.toLowerCase() as 'a' | 'b' | 'c' | 'd')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentIndex, showConfirmFinish, currentTest])

  if (!currentTest) {
    return <div>{t.selectors.loading}</div>
  }

  const pregunta = currentTest.preguntas[currentIndex]
  const respuestaActual = currentTest.respuestas[pregunta.id]?.respuesta
  const totalPreguntas = currentTest.preguntas.length
  const respondidas = Object.keys(currentTest.respuestas).length
  const progress = (respondidas / totalPreguntas) * 100
  const timeRemaining = timeLimitSeconds ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null

  const selectOption = (letra: 'a' | 'b' | 'c' | 'd') => {
    const tiempoPregunta = Math.floor((Date.now() - questionStartTime.current) / 1000)
    setRespuesta(pregunta.id, letra, tiempoPregunta)
  }

  const goNext = () => {
    if (currentIndex < totalPreguntas - 1) setCurrentIndex(currentIndex + 1)
  }

  const goPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const goToQuestion = (index: number) => {
    setCurrentIndex(index)
    setShowNav(false)
  }

  const handleFinish = useCallback(async () => {
    if (!currentTest) return
    const correctas = currentTest.preguntas.filter(p => {
      const r = currentTest.respuestas[p.id]
      return r && p.respuesta_correcta && r.respuesta === p.respuesta_correcta
    }).length
    const tiempoSegundos = Math.floor((Date.now() - currentTest.tiempo_inicio) / 1000)

    const result = finalizarTest()
    if (result) {
      onFinish({ test: result, correctas, tiempoSegundos })
      await saveResultado({
        modo: result.modo,
        examen_id: result.examen_id,
        tema_filtro: result.tema_filtro,
        num_preguntas: result.preguntas.length,
        correctas,
        tiempo_segundos: tiempoSegundos,
      })
    }
  }, [currentTest, finalizarTest, onFinish])

  const temaInfo = TEMAS[pregunta.tema]
  const timeColor = timeRemaining !== null && timeRemaining < 300 ? 'text-destructive animate-pulse-soft' : 'text-foreground'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/20">
      <div className="container max-w-7xl py-6">
        {/* Header */}
        <div className="sticky top-4 z-40 mb-6">
          <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="font-mono">
                    {t.test.question} {currentIndex + 1} {t.test.of} {totalPreguntas}
                  </Badge>
                  <Badge className={cn(temaInfo.color && `bg-${temaInfo.color}-500/10 text-${temaInfo.color}-700`)}>
                    {locale === 'ca' ? temaInfo.nombre_ca : temaInfo.nombre_es}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {timeRemaining !== null && (
                    <div className={cn('flex items-center gap-1.5 font-mono text-sm font-bold', timeColor)}>
                      <Clock className="h-4 w-4" />
                      {formatTime(timeRemaining)}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNav(!showNav)}
                    className="lg:hidden"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={progress} className="h-1.5" />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{respondidas} {t.test.answered} · {totalPreguntas - respondidas} {t.test.unanswered}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmFinish(true)}
                  className="h-7 text-xs"
                >
                  {t.test.finish}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main question area */}
          <div className="min-h-[60vh]">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 text-white flex items-center justify-center font-bold">
                    {pregunta.numero}
                  </div>
                  <div className="flex-1">
                    <p className="text-base md:text-lg leading-relaxed">
                      {pregunta.enunciado}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 font-mono">
                      {pregunta.examen_nombre} v{pregunta.examen_version}
                    </p>
                  </div>
                </div>

                <RadioGroup
                  value={respuestaActual}
                  onValueChange={(v) => selectOption(v as 'a' | 'b' | 'c' | 'd')}
                  className="space-y-3"
                >
                  {(['a', 'b', 'c', 'd'] as const).map(letra => (
                    <RadioGroupItem
                      key={letra}
                      value={letra}
                      className={cn(
                        'p-4 md:p-5',
                        respuestaActual === letra && 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all',
                          respuestaActual === letra
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground'
                        )}>
                          {letra.toUpperCase()}
                        </div>
                        <span className="text-sm md:text-base">{pregunta.opciones[letra]}</span>
                      </div>
                      {respuestaActual === letra && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </RadioGroupItem>
                  ))}
                </RadioGroup>

                <div className="mt-8 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goPrevious}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t.test.previous}
                  </Button>
                  <Button
                    onClick={goNext}
                    disabled={currentIndex === totalPreguntas - 1}
                    variant={respuestaActual ? 'default' : 'outline'}
                  >
                    {t.test.next}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar navigation */}
          <aside className={cn(
            'lg:block',
            showNav ? 'fixed inset-0 z-50 bg-background p-4 overflow-auto' : 'hidden'
          )}>
            <Card className="border-border/50 lg:sticky lg:top-32">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  {t.test.navigation}
                </h3>
                <div className="grid grid-cols-5 lg:grid-cols-5 gap-1.5">
                  {currentTest.preguntas.map((p, i) => {
                    const respondida = !!currentTest.respuestas[p.id]
                    const isCurrent = i === currentIndex
                    return (
                      <button
                        key={p.id}
                        onClick={() => goToQuestion(i)}
                        className={cn(
                          'aspect-square rounded text-xs font-medium border transition-all',
                          isCurrent && 'ring-2 ring-primary ring-offset-1',
                          respondida
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-secondary border-border text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {i + 1}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40" />
                    <span className="text-muted-foreground">{t.test.answered}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-secondary border border-border" />
                    <span className="text-muted-foreground">{t.test.unanswered}</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowConfirmFinish(true)}
                  className="w-full mt-4"
                  variant="gradient"
                >
                  {t.test.finish}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Confirm finish dialog */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card className="max-w-md w-full animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t.test.confirmFinish}</h3>
                  <p className="text-sm text-muted-foreground">{t.test.confirmFinishDescription}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmFinish(false)}
                  className="flex-1"
                >
                  {t.test.confirmNo}
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleFinish}
                  className="flex-1"
                >
                  {t.test.confirmYes}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
