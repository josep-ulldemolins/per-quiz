import { useState } from 'react'
import { Search } from 'lucide-react'
import { TEMAS, TEMA_SLUGS } from '@per-quiz/shared'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  search: string
  examenId: string
  tema: string
  examenes: { id: number; nombre: string; version: number }[]
  onSearchChange: (v: string) => void
  onExamenChange: (v: string) => void
  onTemaChange: (v: string) => void
  onSubmit: () => void
}

export function SearchBar({
  search,
  examenId,
  tema,
  examenes,
  onSearchChange,
  onExamenChange,
  onTemaChange,
  onSubmit,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col sm:flex-row gap-2"
    >
      <div className={cn(
        'flex-1 relative transition-all',
        focused && 'ring-2 ring-primary/30 rounded-md'
      )}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Buscar per text..."
          className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm"
        />
      </div>
      <select
        value={examenId}
        onChange={(e) => onExamenChange(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
      >
        <option value="">Tots els examens</option>
        {examenes.map(e => (
          <option key={e.id} value={e.id}>
            {e.nombre} v{e.version}
          </option>
        ))}
      </select>
      <select
        value={tema}
        onChange={(e) => onTemaChange(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm"
      >
        <option value="">Tots els temes</option>
        {TEMA_SLUGS.map(slug => (
          <option key={slug} value={slug}>
            {TEMAS[slug].nombre_ca}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
      >
        Cercar
      </button>
    </form>
  )
}
