// apps/web/src/pages/api/admin/restore-backup.ts
// POST: Restaurar el último backup

import type { APIRoute } from 'astro'
import { restoreBackup, logChange } from '../../../lib/admin/jsonStore'

export const prerender = false

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const success = restoreBackup()
    if (!success) {
      return new Response(
        JSON.stringify({ error: 'No hi ha cap backup disponible' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    logChange('RESTORE backup', 'from per_data.json.bak')
    return new Response(
      JSON.stringify({ success: true, message: 'Backup restaurat correctament' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
