import { useEffect, useState } from 'react'
import { Edit2, Loader2, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Examen } from '@per-quiz/shared'

export function ExamenesList() {
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Examen>>({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/examenes')
      const data = await res.json()
      setExamenes(data.examenes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const startEdit = (e: Examen) => {
    setEditingId(e.id)
    setEditForm({
      nombre: e.nombre,
      version: e.version,
      fecha: e.fecha,
      lugar: e.lugar,
      clave: e.clave,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/examenes/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Error guardant')
      await load()
      cancelEdit()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {examenes.map(e => (
        <Card key={e.id}>
          <CardContent className="p-4">
            {editingId === e.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nom</label>
                    <input
                      value={editForm.nombre || ''}
                      onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Versió</label>
                    <select
                      value={editForm.version}
                      onChange={(e) => setEditForm({ ...editForm, version: Number(e.target.value) as 1 | 2 })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Data</label>
                    <input
                      value={editForm.fecha || ''}
                      onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Lloc</label>
                    <input
                      value={editForm.lugar || ''}
                      onChange={(e) => setEditForm({ ...editForm, lugar: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Clau</label>
                    <input
                      value={editForm.clave || ''}
                      onChange={(e) => setEditForm({ ...editForm, clave: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-1" /> Cancel·lar
                  </Button>
                  <Button variant="gradient" size="sm" onClick={saveEdit} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? 'Desant...' : 'Desar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-mono font-bold">{e.nombre} v{e.version}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {e.fecha} · {e.lugar} · Clau: {e.clave}
                    </div>
                  </div>
                  <Badge variant="secondary">{e.total_preguntas} Q</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => startEdit(e)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
