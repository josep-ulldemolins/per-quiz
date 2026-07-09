export type TemaSlug =
  | 'nomenclatura_nautica'
  | 'amarraje_fondeo'
  | 'seguridad'
  | 'legislacion'
  | 'balizamiento'
  | 'RIPA'
  | 'maniobra'
  | 'emergencias'
  | 'meteorologia'
  | 'teoria_navegacion'
  | 'carta_navegacion'

export type Lugar = 'Barcelona' | 'Girona' | 'Tarragona'

export interface Examen {
  id: number
  nombre: string
  version: 1 | 2
  fecha: string | null
  lugar: Lugar
  clave: string | null
  total_preguntas: number
  total_respondidas?: number
}

export interface Pregunta {
  id: number
  examen_id: number
  numero: number
  tema: TemaSlug
  enunciado_ca: string
  enunciado_es: string | null
  opcion_a_ca: string
  opcion_a_es: string | null
  opcion_b_ca: string
  opcion_b_es: string | null
  opcion_c_ca: string
  opcion_c_es: string | null
  opcion_d_ca: string
  opcion_d_es: string | null
  respuesta_correcta: 'a' | 'b' | 'c' | 'd' | null
}

export type ModoTest = 'examen' | 'tema' | 'aleatori' | 'repas'

export interface ResultadoTest {
  id?: number
  modo: ModoTest
  examen_id: number | null
  examen_nombre?: string
  examen_version?: number
  tema_filtro: TemaSlug | null
  num_preguntas: number
  correctas: number
  tiempo_segundos: number
  created_at?: string
}

export interface TemaInfo {
  slug: TemaSlug
  nombre_ca: string
  nombre_es: string
  color: string
  icon: string
}

export interface PreguntaParaTest {
  id: number
  examen_id: number
  examen_nombre: string
  examen_version: number
  numero: number
  tema: TemaSlug
  enunciado: string
  opciones: {
    a: string
    b: string
    c: string
    d: string
  }
  respuesta_correcta: 'a' | 'b' | 'c' | 'd' | null
}

export interface RespuestaUsuario {
  pregunta_id: number
  respuesta: 'a' | 'b' | 'c' | 'd'
  tiempo_segundos: number
}

export interface TestEnCurso {
  id: string
  modo: ModoTest
  examen_id: number | null
  examen_nombre: string | null
  examen_version: number | null
  tema_filtro: TemaSlug | null
  preguntas: PreguntaParaTest[]
  respuestas: Record<number, RespuestaUsuario>
  started_at: number
  tiempo_inicio: number
}
