import { useEffect, useState, useRef } from 'react'
import { TestRunner } from './TestRunner'
import { Resultats } from '@/components/resultats/Resultats'
import { useTestStore } from '@/stores/testStore'
import { useLocaleStore } from '@/stores/localeStore'
import { getExamenes, getExamenById, getPreguntasByExamen, getPreguntasByTema, getRandomPreguntas, preparePreguntasParaTest, saveResultado } from '@/lib/supabase'
import type { Examen, Pregunta, TestEnCurso } from '@per-quiz/shared'
import { PER_EXAM_DURATION_MINUTES } from '@per-quiz/shared'

type Status = 'loading' | 'ready' | 'running' | 'finished' | 'error'

interface TestPageProps {
  modo: 'examen' | 'tema' | 'aleatori'
  examenId?: number
  tema?: string
  numPreguntas?: number
  withTimer?: boolean
}

export function TestPage({ modo, examenId, tema, numPreguntas = 20, withTimer = true }: TestPageProps) {
  const { locale } = useLocaleStore()
  const { startTest, finalizarTest, currentTest } = useTestStore()
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ test: TestEnCurso; correctas: number; tiempoSegundos: number } | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    loadTest()
  }, [])

  const loadTest = async () => {
    try {
      setStatus('loading')
      let examenes = await getExamenes()
      let preguntas: Pregunta[] = []
      let examenInfo: Examen | null = null

      if (modo === 'examen' && examenId) {
        examenInfo = await getExamenById(examenId)
        if (!examenInfo) throw new Error('Examen no trobat')
        preguntas = await getPreguntasByExamen(examenId)
      } else if (modo === 'tema' && tema) {
        preguntas = await getPreguntasByTema(tema as any, numPreguntas)
      } else if (modo === 'aleatori') {
        preguntas = await getRandomPreguntas(numPreguntas)
      }

      if (preguntas.length === 0) {
        throw new Error('No s\'han trobat preguntes')
      }

      // Build examenes map
      const examenesMap = new Map<number, Examen>()
      examenes.forEach(e => examenesMap.set(e.id, e))

      // Get unique exam IDs needed
      const neededExamIds = [...new Set(preguntas.map(p => p.examen_id))]
      for (const id of neededExamIds) {
        if (!examenesMap.has(id)) {
          const e = await getExamenById(id)
          if (e) examenesMap.set(id, e)
        }
      }

      const preguntasTest = preparePreguntasParaTest(preguntas, examenesMap, locale)

      startTest({
        modo,
        examen_id: examenInfo?.id || null,
        examen_nombre: examenInfo?.nombre || null,
        examen_version: examenInfo?.version || null,
        tema_filtro: (tema as any) || null,
        preguntas: preguntasTest,
        timeLimitSeconds: withTimer ? PER_EXAM_DURATION_MINUTES * 60 : undefined,
      })

      setStatus('ready')
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Error desconegut')
      setStatus('error')
    }
  }

  const handleFinish = (data: { test: TestEnCurso; correctas: number; tiempoSegundos: number }) => {
    setResult(data)
    setStatus('finished')
  }

  const handleRetry = () => {
    startedRef.current = false
    setResult(null)
    setStatus('loading')
    loadTest()
  }

  const handleHome = () => {
    window.location.href = '/'
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (status === 'loading' || (status === 'ready' && !currentTest)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Carregant preguntes...</p>
        </div>
      </div>
    )
  }

  if (status === 'finished' && result) {
    return (
      <Resultats
        test={result.test}
        correctas={result.correctas}
        tiempoSegundos={result.tiempoSegundos}
        onRetry={handleRetry}
        onHome={handleHome}
      />
    )
  }

  return (
    <TestRunner
      onFinish={handleFinish}
      timeLimitSeconds={withTimer ? PER_EXAM_DURATION_MINUTES * 60 : undefined}
    />
  )
}
