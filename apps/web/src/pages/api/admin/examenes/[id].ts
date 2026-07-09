// apps/web/src/pages/api/admin/examenes/[id].ts
// GET, PUT, DELETE para un examen específico

import type { APIRoute } from 'astro'
import {
  getExamenById,
  updateExamen,
  deleteExamen,
  createBackup,
  logChange,
} from '../../../../lib/admin/jsonStore'
import { ExamenUpdateSchema } from '../../../../lib/admin/validation'

export const prerender = false

function isDev(): boolean {
  return import.meta.env.DEV
}

export const GET: APIRoute = async ({ params }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const examen = getExamenById(id)
  if (!examen) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(examen), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const PUT: APIRoute = async ({ params, request }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const data = ExamenUpdateSchema.parse(body)
    createBackup('pre-update-examen')
    const updated = updateExamen(id, data)
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    logChange('UPDATE examen', `id=${id} campos=${Object.keys(data).join(',')}`)
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: 'Validation error', details: e.errors || e.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const DELETE: APIRoute = async ({ params }) => {
  if (!isDev()) {
    return new Response('Forbidden', { status: 403 })
  }

  const id = Number(params.id)
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const deleted = deleteExamen(id)
  if (!deleted) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  logChange('DELETE examen', `id=${id} nombre=${deleted.nombre} v${deleted.version} (con todas sus preguntas)`)
  return new Response(JSON.stringify({ success: true, deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
