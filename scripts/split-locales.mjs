#!/usr/bin/env node
// scripts/split-locales.mjs
// Processes per_preguntas_completo.json into per_data.json with proper structure for Supabase/Local
// The original JSON already has enunciado_ca and enunciado_es separated
// This script just restructures it for the web app

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXAMENS_DIR = path.resolve(ROOT, '..', 'EXAMENS')
const INPUT = path.resolve(EXAMENS_DIR, 'per_preguntas_completo.json')
const OUTPUT = path.resolve(ROOT, 'apps', 'web', 'public', 'data', 'per_data.json')

console.log(`Reading ${INPUT}...`)
const raw = fs.readFileSync(INPUT, 'utf-8')
const data = JSON.parse(raw)

function splitLocale(text) {
  if (!text || typeof text !== 'string') return { ca: text || '', es: null }
  const sep = ' / '
  const lastIdx = text.lastIndexOf(sep)
  if (lastIdx === -1) return { ca: text.trim(), es: null }
  const ca = text.substring(0, lastIdx).trim()
  const es = text.substring(lastIdx + sep.length).trim()
  return { ca, es: es === ca ? null : es }
}

const examenes = []
const preguntas = []

for (const examen of data.examenes) {
  examenes.push({
    id: examenes.length + 1,
    nombre: examen.examen,
    version: examen.version,
    fecha: examen.fecha || null,
    lugar: examen.lugar || null,
    clave: examen.clave || null,
    archivo_origen: examen.archivo_origen || null,
    total_preguntas: examen.preguntas.length,
  })

  for (const p of examen.preguntas) {
    // Use enunciado_ca/es if available, otherwise split enunciado_ca
    let enun_ca = p.enunciado_ca
    let enun_es = p.enunciado_es || null
    if (!enun_es && enun_ca && enun_ca.includes(' / ')) {
      const split = splitLocale(enun_ca)
      enun_ca = split.ca
      enun_es = split.es
    }

    const aSplit = splitLocale(p.opciones?.a || '')
    const bSplit = splitLocale(p.opciones?.b || '')
    const cSplit = splitLocale(p.opciones?.c || '')
    const dSplit = splitLocale(p.opciones?.d || '')

    preguntas.push({
      id: preguntas.length + 1,
      examen_id: examenes.length,
      numero: p.numero,
      tema: p.tema || 'sin_tema',
      enunciado_ca: enun_ca,
      enunciado_es: enun_es,
      opcion_a_ca: aSplit.ca,
      opcion_a_es: aSplit.es,
      opcion_b_ca: bSplit.ca,
      opcion_b_es: bSplit.es,
      opcion_c_ca: cSplit.ca,
      opcion_c_es: cSplit.es,
      opcion_d_ca: dSplit.ca,
      opcion_d_es: dSplit.es,
      respuesta_correcta: p.respuesta_correcta,
    })
  }
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })

const out = {
  metadata: {
    total_examenes: examenes.length,
    total_preguntas: preguntas.length,
    created_at: new Date().toISOString(),
  },
  examenes,
  preguntas,
}

fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf-8')
console.log(`✅ Saved ${examenes.length} exams and ${preguntas.length} questions`)
console.log(`   Examples:`)
console.log(`   Q1 CA: ${preguntas[0]?.enunciado_ca?.substring(0, 80)}...`)
console.log(`   Q1 ES: ${preguntas[0]?.enunciado_es?.substring(0, 80)}...`)
