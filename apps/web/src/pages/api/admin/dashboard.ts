// apps/web/src/pages/api/admin/dashboard.ts
// GET: Información del dashboard admin

import type { APIRoute } from 'astro'
import { readDatabase, backupExists, getRecentChanges } from '../../../lib/admin/jsonStore'

export const prerender = false

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const db = readDatabase()
    return new Response(
      JSON.stringify({
        total_examenes: db.examenes.length,
        total_preguntas: db.preguntas.length,
        recent_changes: getRecentChanges(20),
        backup_exists: backupExists(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
