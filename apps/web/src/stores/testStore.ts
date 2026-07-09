import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TestEnCurso, RespuestaUsuario, ModoTest, PreguntaParaTest, TemaSlug } from '@per-quiz/shared'
import { generateId } from '@/lib/utils'

interface TestStore {
  currentTest: TestEnCurso | null
  startTest: (data: {
    modo: ModoTest
    examen_id: number | null
    examen_nombre: string | null
    examen_version: number | null
    tema_filtro: TemaSlug | null
    preguntas: PreguntaParaTest[]
    timeLimitSeconds?: number
  }) => void
  setRespuesta: (preguntaId: number, respuesta: 'a' | 'b' | 'c' | 'd', tiempoSegundos: number) => void
  clearRespuesta: (preguntaId: number) => void
  finalizarTest: () => TestEnCurso | null
  cancelTest: () => void
  getElapsedTime: () => number
}

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      currentTest: null,
      startTest: (data) => {
        set({
          currentTest: {
            id: generateId(),
            modo: data.modo,
            examen_id: data.examen_id,
            examen_nombre: data.examen_nombre,
            examen_version: data.examen_version,
            tema_filtro: data.tema_filtro,
            preguntas: data.preguntas,
            respuestas: {},
            started_at: Date.now(),
            tiempo_inicio: Date.now(),
          },
        })
      },
      setRespuesta: (preguntaId, respuesta, tiempoSegundos) => {
        const current = get().currentTest
        if (!current) return
        set({
          currentTest: {
            ...current,
            respuestas: {
              ...current.respuestas,
              [preguntaId]: { pregunta_id: preguntaId, respuesta, tiempo_segundos: tiempoSegundos },
            },
          },
        })
      },
      clearRespuesta: (preguntaId) => {
        const current = get().currentTest
        if (!current) return
        const { [preguntaId]: _, ...rest } = current.respuestas
        set({ currentTest: { ...current, respuestas: rest } })
      },
      finalizarTest: () => {
        const current = get().currentTest
        if (!current) return null
        set({ currentTest: null })
        return current
      },
      cancelTest: () => set({ currentTest: null }),
      getElapsedTime: () => {
        const current = get().currentTest
        if (!current) return 0
        return Math.floor((Date.now() - current.tiempo_inicio) / 1000)
      },
    }),
    {
      name: 'per-quiz-current-test',
    }
  )
)
