#!/usr/bin/env node
// apps/web/src/lib/admin/validation.ts
// Esquemas Zod para validación de entrada en la API

import { z } from 'zod'
import { TEMA_SLUGS } from '@per-quiz/shared'

export const TemaEnum = z.enum(TEMA_SLUGS as [string, ...string[]])

export const ExamenSchema = z.object({
  nombre: z.string().min(1).max(50),
  version: z.union([z.literal(1), z.literal(2)]),
  fecha: z.string().nullable().optional(),
  lugar: z.string().max(50).nullable().optional(),
  clave: z.string().max(20).nullable().optional(),
  archivo_origen: z.string().max(100).nullable().optional(),
  total_preguntas: z.number().int().min(0).max(100).optional(),
})

export const ExamenUpdateSchema = ExamenSchema.partial()

export const PreguntaSchema = z.object({
  examen_id: z.number().int().positive(),
  numero: z.number().int().min(1).max(50),
  tema: TemaEnum,
  enunciado_ca: z.string().min(1).max(2000),
  enunciado_es: z.string().max(2000).nullable().optional(),
  opcion_a_ca: z.string().min(1).max(500),
  opcion_a_es: z.string().max(500).nullable().optional(),
  opcion_b_ca: z.string().min(1).max(500),
  opcion_b_es: z.string().max(500).nullable().optional(),
  opcion_c_ca: z.string().min(1).max(500),
  opcion_c_es: z.string().max(500).nullable().optional(),
  opcion_d_ca: z.string().min(1).max(500),
  opcion_d_es: z.string().max(500).nullable().optional(),
  respuesta_correcta: z.enum(['a', 'b', 'c', 'd']),
})

export const PreguntaUpdateSchema = PreguntaSchema.partial()

export const PreguntaFilterSchema = z.object({
  q: z.string().optional(),
  examen_id: z.coerce.number().int().positive().optional(),
  tema: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ExamenInput = z.infer<typeof ExamenSchema>
export type ExamenUpdateInput = z.infer<typeof ExamenUpdateSchema>
export type PreguntaInput = z.infer<typeof PreguntaSchema>
export type PreguntaUpdateInput = z.infer<typeof PreguntaUpdateSchema>
export type PreguntaFilterInput = z.infer<typeof PreguntaFilterSchema>
