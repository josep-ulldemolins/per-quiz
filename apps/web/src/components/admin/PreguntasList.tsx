import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/router'
import { Plus } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { PreguntaTable } from './PreguntaTable'
import { ConfirmDialog } from './ConfirmDialog'
import { Button } from '@/components/ui/button'
import type { Pregunta, Examen } from '@per-quiz/shared'

export function PreguntasList() {
  const router = useRouter()
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [examenesMap, setExamenesMap] = useState<Map<number, Examen>>(new Map())
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [examenId, setExamenId] = useState('')
  const [tema, setTema] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const limit = 20

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (examenId) params.set('examen_id', examenId)
      if (tema) params.set('tema', tema)
      params.set('limit', String(limit))
      params.set('offset', String(offset))

      const [preguntasRes, examenesRes] = await Promise.all([
        fetch(`/api/admin/preguntas?${params}`),
        fetch('/api/admin/examenes'),
      ])
      const preguntasData = await preguntasRes.json()
      const examenesData = await examenesRes.json()
      setPreguntas(preguntasData.preguntas || [])
      setTotal(preguntasData.total || 0)
      setHasMore(preguntasData.hasMore || false)
      setExamenes(examenesData.examenes || [])
      setExamenesMap(new Map((examenesData.examenes || []).map((e: Examen) => [e.id, e])))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [offset])

  const handleSubmit = () => {
    setOffset(0)
    load()
  }

  const handleEdit = (id: number) => {
    router.push(`/admin/editor/pregunta/${id}`)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/preguntas/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminant')
      await load()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {total} preguntes trobades
        </p>
        <Button variant="gradient" onClick={() => router.push('/')}>
          <Plus className="h-4 w-4 mr-2" />
          Tornar
        </Button>
      </div>

      <SearchBar
        search={search}
        examenId={examenId}
        tema={tema}
        examenes={examenes}
        onSearchChange={setSearch}
        onExamenChange={setExamenId}
        onTemaChange={setTema}
        onSubmit={handleSubmit}
      />

      <PreguntaTable
        preguntas={preguntas}
        examenes={examenesMap}
        loading={loading}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteId(id)}
      />

      {total > limit && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrant {offset + 1}-{Math.min(offset + limit, total)} de {total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              ← Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setOffset(offset + limit)}
            >
              Següent →
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar pregunta?"
        description="Aquesta acció no es pot desfer. Es pot restaurar des del backup."
        confirmText="Eliminar"
        cancelText="Cancel·lar"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
