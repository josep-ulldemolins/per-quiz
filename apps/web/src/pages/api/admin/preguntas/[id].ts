// apps/web/src/pages/api/admin/preguntas/[id].ts
// GET: Obtener una pregunta por ID
// PUT: Actualizar pregunta
// DELETE: Eliminar pregunta

import type { APIRoute } from 'astro'
import {
  getPreguntaById,
  updatePregunta,
  deletePregunta,
  createBackup,
  logChange,
} from '../../../../lib/admin/jsonStore'
import { PreguntaUpdateSchema } from '../../../../lib/admin/validation'

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

  const pregunta = getPreguntaById(id)
  if (!pregunta) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(pregunta), {
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
    const data = PreguntaUpdateSchema.parse(body)
    createBackup('pre-update')
    const updated = updatePregunta(id, data)
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    logChange('UPDATE pregunta', `id=${id} campos=${Object.keys(data).join(',')}`)
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

  const deleted = deletePregunta(id)
  if (!deleted) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  logChange('DELETE pregunta', `id=${id} examen_id=${deleted.examen_id} numero=${deleted.numero}`)
  return new Response(JSON.stringify({ success: true, deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
