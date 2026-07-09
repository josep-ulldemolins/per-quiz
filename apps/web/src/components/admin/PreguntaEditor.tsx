import { useState, useEffect } from 'react'
import { Save, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TEMAS, TEMA_SLUGS, type Pregunta, type Examen } from '@per-quiz/shared'
import { ConfirmDialog } from './ConfirmDialog'

interface PreguntaEditorProps {
  pregunta: Pregunta
  examenes: Examen[]
  onSave: (data: Partial<Pregunta>) => Promise<void>
  onDelete: () => Promise<void>
  onBack: () => void
}

const RESPUESTAS = ['a', 'b', 'c', 'd'] as const

export function PreguntaEditor({ pregunta, examenes, onSave, onDelete, onBack }: PreguntaEditorProps) {
  const [form, setForm] = useState<Pregunta>(pregunta)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setForm(pregunta)
    setHasChanges(false)
  }, [pregunta.id])

  const update = (field: keyof Pregunta, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const updateOpcion = (letra: 'a' | 'b' | 'c' | 'd', lang: 'ca' | 'es', value: string) => {
    const key = `opcion_${letra}_${lang}` as keyof Pregunta
    setForm(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(form)
      setHasChanges(false)
    } catch (e) {
      console.error(e)
      alert('Error guardant: ' + (e as any).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } catch (e) {
      console.error(e)
      alert('Error eliminant: ' + (e as any).message)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tornar
        </Button>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Canvis no desats</span>
          )}
          <Button
            variant="destructive"
            onClick={() => setShowDelete(true)}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </Button>
          <Button
            variant="gradient"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Desar canvis
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Examen</label>
              <select
                value={form.examen_id}
                onChange={(e) => update('examen_id', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {examenes.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} v{e.version}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.numero}
                onChange={(e) => update('numero', Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tema</label>
              <select
                value={form.tema}
                onChange={(e) => update('tema', e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {TEMA_SLUGS.map(slug => (
                  <option key={slug} value={slug}>
                    {TEMAS[slug as keyof typeof TEMAS].nombre_ca}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enunciados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enunciats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enunciat (Català)</label>
            <textarea
              value={form.enunciado_ca || ''}
              onChange={(e) => update('enunciado_ca', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Enunciat (Castellano) <span className="text-muted-foreground font-normal">— opcional, buit = mostrar CA</span>
            </label>
            <textarea
              value={form.enunciado_es || ''}
              onChange={(e) => update('enunciado_es', e.target.value || null)}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Opciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opcions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {RESPUESTAS.map(letra => (
            <div key={letra} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  form.respuesta_correcta === letra
                    ? 'bg-emerald-500 text-white'
                    : 'border-2 border-border text-muted-foreground'
                }`}>
                  {letra.toUpperCase()}
                </div>
                <label className="text-sm font-medium">
                  Opció {letra.toUpperCase()}
                </label>
                {form.respuesta_correcta === letra && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Correcta</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-10">
                <input
                  type="text"
                  value={(form as any)[`opcion_${letra}_ca`] || ''}
                  onChange={(e) => updateOpcion(letra, 'ca', e.target.value)}
                  placeholder={`Opció ${letra.toUpperCase()} (CA)`}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
                <input
                  type="text"
                  value={(form as any)[`opcion_${letra}_es`] || ''}
                  onChange={(e) => updateOpcion(letra, 'es', e.target.value)}
                  placeholder={`Opció ${letra.toUpperCase()} (ES) - opcional`}
                  className="px-3 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Respuesta correcta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resposta correcta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {RESPUESTAS.map(letra => (
              <button
                key={letra}
                onClick={() => update('respuesta_correcta', letra)}
                className={`w-14 h-14 rounded-lg border-2 font-bold text-lg transition-all ${
                  form.respuesta_correcta === letra
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-border hover:border-emerald-500/30 text-muted-foreground'
                }`}
              >
                {letra.toUpperCase()}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Vista prèvia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-card rounded-lg p-4 border border-border">
            <p className="text-sm leading-relaxed mb-4">{form.enunciado_ca}</p>
            <div className="space-y-2">
              {RESPUESTAS.map(letra => (
                <div
                  key={letra}
                  className={`p-3 rounded-lg border ${
                    form.respuesta_correcta === letra
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-border'
                  }`}
                >
                  <span className="font-mono font-bold mr-2">{letra.toUpperCase()})</span>
                  <span className="text-sm">{(form as any)[`opcion_${letra}_ca`] || '...'}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDelete}
        title="Eliminar pregunta?"
        description={`Estàs segur que vols eliminar la pregunta #${form.numero}? Aquesta acció no es pot desfer (però es pot restaurar des del backup).`}
        confirmText="Eliminar"
        cancelText="Cancel·lar"
        variant="destructive"
        onConfirm={() => {
          setShowDelete(false)
          handleDelete()
        }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
