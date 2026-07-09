import { createClient } from '@supabase/supabase-js'
import type { Examen, Pregunta, ResultadoTest, TemaSlug, PreguntaParaTest } from '@per-quiz/shared'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Local development fallback - uses local JSON file
const useLocalData = !supabaseUrl || supabaseUrl.includes('placeholder')

let localDataCache: { examenes: Examen[]; preguntas: Pregunta[] } | null = null

async function loadLocalData() {
  if (localDataCache) return localDataCache
  try {
    const response = await fetch('/data/per_data.json')
    if (!response.ok) throw new Error('Local data not found')
    const data = await response.json()
    localDataCache = data
    return data
  } catch (e) {
    console.warn('Failed to load local data:', e)
    return { examenes: [], preguntas: [] }
  }
}

export async function getExamenes(): Promise<Examen[]> {
  if (useLocalData) {
    const data = await loadLocalData()
    return data.examenes
  }
  const { data, error } = await supabase
    .from('examenes')
    .select('*')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getExamenById(id: number): Promise<Examen | null> {
  if (useLocalData) {
    const data = await loadLocalData()
    return data.examenes.find(e => e.id === id) || null
  }
  const { data, error } = await supabase
    .from('examenes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getPreguntasByExamen(examenId: number): Promise<Pregunta[]> {
  if (useLocalData) {
    const data = await loadLocalData()
    return data.preguntas.filter(p => p.examen_id === examenId)
  }
  const { data, error } = await supabase
    .from('preguntas')
    .select('*')
    .eq('examen_id', examenId)
    .order('numero', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getPreguntasByTema(tema: TemaSlug, limit?: number): Promise<Pregunta[]> {
  if (useLocalData) {
    const data = await loadLocalData()
    const filtered = data.preguntas.filter(p => p.tema === tema)
    return limit ? shuffle(filtered).slice(0, limit) : shuffle(filtered)
  }
  let query = supabase
    .from('preguntas')
    .select('*')
    .eq('tema', tema)
  const { data, error } = await query
  if (error) throw error
  const result = data || []
  return limit ? shuffle(result).slice(0, limit) : shuffle(result)
}

export async function getRandomPreguntas(limit: number): Promise<Pregunta[]> {
  if (useLocalData) {
    const data = await loadLocalData()
    return shuffle(data.preguntas).slice(0, limit)
  }
  const { data, error } = await supabase
    .from('preguntas')
    .select('*')
  if (error) throw error
  return shuffle(data || []).slice(0, limit)
}

export async function getPreguntasIncorrectas(examenesIds: number[], limit?: number): Promise<Pregunta[]> {
  // For now, just return random - in future this would filter by errors
  return getRandomPreguntas(limit || 30)
}

export async function saveResultado(resultado: ResultadoTest): Promise<ResultadoTest | null> {
  if (useLocalData) {
    // Store in localStorage
    const key = 'per-quiz-resultados'
    const stored = JSON.parse(localStorage.getItem(key) || '[]')
    const newResult = { ...resultado, id: Date.now(), created_at: new Date().toISOString() }
    stored.push(newResult)
    localStorage.setItem(key, JSON.stringify(stored))
    return newResult
  }
  const { data, error } = await supabase
    .from('resultados_test')
    .insert(resultado)
    .select()
    .single()
  if (error) {
    console.error('Error saving resultado:', error)
    return null
  }
  return data
}

export async function getResultadosRecientes(limit = 10): Promise<ResultadoTest[]> {
  if (useLocalData) {
    const stored = JSON.parse(localStorage.getItem('per-quiz-resultados') || '[]')
    return stored.slice(-limit).reverse()
  }
  const { data, error } = await supabase
    .from('resultados_test')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Convertir preguntas al formato para el test
export function preparePreguntasParaTest(
  preguntas: Pregunta[],
  examenesMap: Map<number, Examen>,
  locale: 'ca' | 'es'
): PreguntaParaTest[] {
  return preguntas.map(p => {
    const examen = examenesMap.get(p.examen_id)
    const localePrefix = locale === 'es' ? '_es' : '_ca'
    return {
      id: p.id,
      examen_id: p.examen_id,
      examen_nombre: examen?.nombre || '',
      examen_version: examen?.version || 1,
      numero: p.numero,
      tema: p.tema,
      enunciado: p[`enunciado${localePrefix}` as keyof Pregunta] as string || p.enunciado_ca,
      opciones: {
        a: (p as any)[`opcion_a${localePrefix}`] || p.opcion_a_ca,
        b: (p as any)[`opcion_b${localePrefix}`] || p.opcion_b_ca,
        c: (p as any)[`opcion_c${localePrefix}`] || p.opcion_c_ca,
        d: (p as any)[`opcion_d${localePrefix}`] || p.opcion_d_ca,
      },
      respuesta_correcta: p.respuesta_correcta,
    }
  })
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
