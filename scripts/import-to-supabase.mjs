#!/usr/bin/env node
// scripts/import-to-supabase.mjs
// Imports the processed JSON into Supabase

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// Load env from apps/web/.env
config({ path: path.resolve(ROOT, 'apps', 'web', '.env') })

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder')) {
  console.error('❌ Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in apps/web/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const DATA_PATH = path.resolve(ROOT, 'apps', 'web', 'public', 'data', 'per_data.json')

if (!fs.existsSync(DATA_PATH)) {
  console.error('❌ Run split-locales first: pnpm split-locales')
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))

console.log(`Importing ${data.examenes.length} exams and ${data.preguntas.length} questions...`)

// Clear existing data
console.log('Clearing existing data...')
await supabase.from('preguntas').delete().neq('id', 0)
await supabase.from('examenes').delete().neq('id', 0)

// Insert examenes in batches
console.log('Inserting examenes...')
const examenesBatchSize = 50
for (let i = 0; i < data.examenes.length; i += examenesBatchSize) {
  const batch = data.examenes.slice(i, i + examenesBatchSize)
  const { error } = await supabase.from('examenes').insert(batch)
  if (error) {
    console.error('Error inserting examenes batch:', error)
    process.exit(1)
  }
  console.log(`  Inserted ${Math.min(i + examenesBatchSize, data.examenes.length)}/${data.examenes.length} exams`)
}

// Get inserted examenes with their new IDs
const { data: insertedExamenes, error: exErr } = await supabase
  .from('examenes')
  .select('id, nombre, version')

if (exErr) {
  console.error('Error fetching examenes:', exErr)
  process.exit(1)
}

const examenIdMap = new Map()
insertedExamenes.forEach(e => {
  examenIdMap.set(`${e.nombre}-${e.version}`, e.id)
})

// Map pregunta examen_id from local to actual
const preguntas = data.preguntas.map(p => {
  const localExamen = data.examenes[p.examen_id - 1]
  const realId = examenIdMap.get(`${localExamen.nombre}-${localExamen.version}`)
  return { ...p, examen_id: realId }
}).filter(p => p.examen_id)

// Insert preguntas in batches
console.log('Inserting preguntas...')
const preguntasBatchSize = 100
for (let i = 0; i < preguntas.length; i += preguntasBatchSize) {
  const batch = preguntas.slice(i, i + preguntasBatchSize)
  const { error } = await supabase.from('preguntas').insert(batch)
  if (error) {
    console.error('Error inserting preguntas batch:', error)
    process.exit(1)
  }
  console.log(`  Inserted ${Math.min(i + preguntasBatchSize, preguntas.length)}/${preguntas.length} questions`)
}

console.log('✅ Import completed!')
console.log(`Stats: ${insertedExamenes.length} exams, ${preguntas.length} questions`)
