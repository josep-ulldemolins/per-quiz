import { Edit2, Trash2, Loader2 } from 'lucide-react'
import { TEMAS, type Pregunta } from '@per-quiz/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PreguntaTableProps {
  preguntas: Pregunta[]
  examenes: Map<number, { nombre: string; version: number }>
  loading: boolean
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

export function PreguntaTable({ preguntas, examenes, loading, onEdit, onDelete }: PreguntaTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (preguntas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No s'han trobat preguntes amb aquests filtres.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left font-medium w-12">ID</th>
            <th className="px-3 py-2 text-left font-medium w-32">Examen</th>
            <th className="px-3 py-2 text-left font-medium w-12">N°</th>
            <th className="px-3 py-2 text-left font-medium w-40">Tema</th>
            <th className="px-3 py-2 text-left font-medium">Pregunta</th>
            <th className="px-3 py-2 text-left font-medium w-12">Resp.</th>
            <th className="px-3 py-2 text-right font-medium w-24">Accions</th>
          </tr>
        </thead>
        <tbody>
          {preguntas.map((p) => {
            const examen = examenes.get(p.examen_id)
            const tema = TEMAS[p.tema as keyof typeof TEMAS]
            return (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-muted-foreground">{p.id}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {examen ? `${examen.nombre} v${examen.version}` : '?'}
                </td>
                <td className="px-3 py-2 font-mono">{p.numero}</td>
                <td className="px-3 py-2">
                  {tema ? (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {tema.icon} {tema.nombre_ca}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">{p.tema}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs leading-relaxed">
                  <div className="line-clamp-2 max-w-2xl">{p.enunciado_ca}</div>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="default" className="font-mono uppercase">
                    {p.respuesta_correcta}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit(p.id)}
                      className="h-7 w-7"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(p.id)}
                      className="h-7 w-7 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
