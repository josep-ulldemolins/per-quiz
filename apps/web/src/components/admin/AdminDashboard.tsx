import { useEffect, useState } from 'react'
import { FileText, BookOpen, Database, History, RotateCcw, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { invalidateLocalCache } from '@/lib/supabase'
import { ConfirmDialog } from './ConfirmDialog'

interface DashboardData {
  total_examenes: number
  total_preguntas: number
  recent_changes: string[]
  backup_exists: boolean
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRestore, setShowRestore] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const res = await fetch('/api/admin/restore-backup', { method: 'POST' })
      if (!res.ok) throw new Error('Restore failed')
      invalidateLocalCache()
      await load()
      alert('Backup restaurat correctament')
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setRestoring(false)
      setShowRestore(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/admin/refresh-cache', { method: 'POST' })
      invalidateLocalCache()
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || !data) {
    return <div className="text-center py-12 text-muted-foreground">Carregant...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <FileText className="h-5 w-5 text-sky-500 mb-2" />
            <div className="text-2xl font-bold">{data.total_preguntas}</div>
            <div className="text-xs text-muted-foreground">Preguntes totals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <BookOpen className="h-5 w-5 text-cyan-500 mb-2" />
            <div className="text-2xl font-bold">{data.total_examenes}</div>
            <div className="text-xs text-muted-foreground">Exàmens</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Database className={`h-5 w-5 mb-2 ${data.backup_exists ? 'text-emerald-500' : 'text-amber-500'}`} />
            <div className="text-2xl font-bold">{data.backup_exists ? '✓' : '✗'}</div>
            <div className="text-xs text-muted-foreground">Backup</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <History className="h-5 w-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold">{data.recent_changes.length}</div>
            <div className="text-xs text-muted-foreground">Canvis recents</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/preguntas">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Editar Preguntes
              </CardTitle>
              <CardDescription>Cerca, edita o elimina preguntes</CardDescription>
            </CardHeader>
          </Card>
        </a>
        <a href="/admin/examenes">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Gestionar Exàmens
              </CardTitle>
              <CardDescription>Edita metadades dels exàmens</CardDescription>
            </CardHeader>
          </Card>
        </a>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accions ràpides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              {refreshing ? 'Refrescant...' : 'Refresca cache'}
            </Button>
            <Button
              onClick={() => setShowRestore(true)}
              disabled={!data.backup_exists || restoring}
              variant="destructive"
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar backup
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent changes log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de canvis</CardTitle>
          <CardDescription>Últims 20 canvis realitzats</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_changes.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Encara no hi ha canvis registrats
            </div>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {data.recent_changes.map((change, i) => (
                <div key={i} className="px-3 py-2 rounded bg-muted/50 border border-border">
                  {change}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRestore}
        title="Restaurar backup?"
        description="Això sobreescriurà totes les dades actuals amb la versió del backup. No es pot desfer."
        confirmText="Restaurar"
        cancelText="Cancel·lar"
        variant="destructive"
        onConfirm={handleRestore}
        onCancel={() => setShowRestore(false)}
      />
    </div>
  )
}
