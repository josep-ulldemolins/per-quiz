// apps/web/src/pages/api/admin/examenes/index.ts
// GET: Listar todos los exámenes
// POST: Crear nuevo examen

import type { APIRoute } from 'astro'
import { readDatabase, createExamen, createBackup, logChange } from '../../../../lib/admin/jsonStore'
import { ExamenSchema } from '../../../../lib/admin/validation'

export const prerender = false

function isDev(): boolean {
  return import.meta.env.DEV
}

export const GET: APIRoute = async () => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  const db = readDatabase()
  return new Response(JSON.stringify({ examenes: db.examenes }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const body = await request.json()
    const data = ExamenSchema.parse(body)
    createBackup('pre-create-examen')
    const created = createExamen({ ...data, total_preguntas: data.total_preguntas || 0 })
    logChange('CREATE examen', `id=${created.id} nombre=${created.nombre} v${created.version}`)
    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Validation error', details: e.errors || e.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
