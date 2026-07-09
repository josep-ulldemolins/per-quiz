import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/router'
import { Loader2 } from 'lucide-react'
import { PreguntaEditor } from './PreguntaEditor'
import type { Pregunta, Examen } from '@per-quiz/shared'

interface PreguntaEditorPageProps {
  preguntaId: number
}

export function PreguntaEditorPage({ preguntaId }: PreguntaEditorPageProps) {
  const router = useRouter()
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [pregRes, exRes] = await Promise.all([
          fetch(`/api/admin/preguntas/${preguntaId}`),
          fetch('/api/admin/examenes'),
        ])
        if (!pregRes.ok) {
          if (pregRes.status === 404) {
            setError('Pregunta no trobada')
            return
          }
          throw new Error('Error carregant pregunta')
        }
        const preg = await pregRes.json()
        const ex = await exRes.json()
        setPregunta(preg)
        setExamenes(ex.examenes || [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [preguntaId])

  const handleSave = async (data: Partial<Pregunta>) => {
    const res = await fetch(`/api/admin/preguntas/${preguntaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.details || err.error || 'Error guardant')
    }
    const updated = await res.json()
    setPregunta(updated)
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/admin/preguntas/${preguntaId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error eliminant')
    }
    router.push('/admin/preguntas')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (error || !pregunta) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error || 'Error desconegut'}</p>
        <button onClick={() => router.push('/admin/preguntas')} className="text-primary underline">
          Tornar a la llista
        </button>
      </div>
    )
  }

  return (
    <PreguntaEditor
      pregunta={pregunta}
      examenes={examenes}
      onSave={handleSave}
      onDelete={handleDelete}
      onBack={() => router.push('/admin/preguntas')}
    />
  )
}
