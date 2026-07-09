// apps/web/src/pages/api/admin/preguntas/index.ts
// GET: Listar preguntas (con filtros)
// POST: Crear nueva pregunta

import type { APIRoute } from 'astro'
import {
  createPregunta,
  createBackup,
  logChange,
  getPreguntasFiltered,
} from '../../../../lib/admin/jsonStore'
import {
  PreguntaSchema,
  PreguntaFilterSchema,
} from '../../../../lib/admin/validation'

export const prerender = false

function isDev(): boolean {
  return import.meta.env.DEV
}

export const GET: APIRoute = async ({ url }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const params = Object.fromEntries(url.searchParams)
    const filters = PreguntaFilterSchema.parse(params)
    const { preguntas, total } = getPreguntasFiltered(filters)
    return new Response(
      JSON.stringify({ preguntas, total, hasMore: filtros_offset_calc(filters, total) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Validation error', details: e.errors || e.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

function filtros_offset_calc(filters: any, total: number): boolean {
  return (filters.offset || 0) + (filters.limit || 20) < total
}

export const POST: APIRoute = async ({ request }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const body = await request.json()
    const data = PreguntaSchema.parse(body)
    createBackup('pre-create')
    const created = createPregunta(data)
    logChange('CREATE pregunta', `id=${created.id} examen_id=${created.examen_id} numero=${created.numero}`)
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
