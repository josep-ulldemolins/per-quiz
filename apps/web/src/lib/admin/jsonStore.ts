// apps/web/src/lib/admin/jsonStore.ts
// Utilidad para leer/escribir el JSON de preguntas con backup automático

import { readFileSync, writeFileSync, existsSync, copyFileSync, appendFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'

export interface Database {
  metadata: {
    total_examenes: number
    total_preguntas: number
    created_at: string
  }
  examenes: any[]
  preguntas: any[]
}

function findFile(filename: string): string | null {
  const candidates: string[] = []
  const cwd = process.cwd()

  candidates.push(resolve(cwd, 'apps/web/public/data', filename))
  candidates.push(resolve(cwd, 'public/data', filename))

  let dir = cwd
  for (let i = 0; i < 6; i++) {
    candidates.push(resolve(dir, 'apps/web/public/data', filename))
    candidates.push(resolve(dir, 'public/data', filename))
    dir = dirname(dir)
  }

  for (const p of candidates) {
    try {
      if (existsSync(p)) return p
    } catch (e) {
      // ignore
    }
  }
  return null
}

let _dataPath: string | null = null
let _backupPath: string | null = null
let _logPath: string | null = null

function getDataPath(): string {
  if (!_dataPath) {
    const p = findFile('per_data.json')
    if (!p) throw new Error('Data file not found. cwd: ' + process.cwd())
    _dataPath = p
    const dir = dirname(p)
    _backupPath = join(dir, 'per_data.json.bak')
    _logPath = join(dir, 'admin-changes.log')
  }
  return _dataPath
}

function getBackupPath(): string {
  if (!_backupPath) getDataPath()
  return _backupPath!
}

function getLogPath(): string {
  if (!_logPath) getDataPath()
  return _logPath!
}

let writeLock = false

export function readDatabase(): Database {
  return JSON.parse(readFileSync(getDataPath(), 'utf-8'))
}

export function writeDatabase(db: Database): void {
  if (writeLock) throw new Error('Locked')
  writeLock = true
  try {
    db.metadata.total_examenes = db.examenes.length
    db.metadata.total_preguntas = db.preguntas.length
    db.metadata.created_at = new Date().toISOString()
    writeFileSync(getDataPath(), JSON.stringify(db, null, 2), 'utf-8')
  } finally {
    writeLock = false
  }
}

export function createBackup(reason: string = 'auto'): string {
  if (!existsSync(getDataPath())) throw new Error('Not found')
  const bp = getBackupPath()
  copyFileSync(getDataPath(), bp)
  return bp
}

export function restoreBackup(): boolean {
  const bp = getBackupPath()
  if (!existsSync(bp)) return false
  copyFileSync(bp, getDataPath())
  return true
}

export function backupExists(): boolean {
  try {
    return existsSync(getBackupPath())
  } catch {
    return false
  }
}

export function logChange(action: string, details: string): void {
  try {
    const ts = new Date().toISOString()
    appendFileSync(getLogPath(), ts + ' | ' + action + ' | ' + details + '\n', 'utf-8')
  } catch (e) {
    console.warn('Log error:', e)
  }
}

export function getRecentChanges(limit: number = 20): string[] {
  try {
    const lp = getLogPath()
    if (!existsSync(lp)) return []
    const content = readFileSync(lp, 'utf-8')
    return content.split('\n').filter(l => l.trim()).slice(-limit).reverse()
  } catch {
    return []
  }
}

export function getExamenById(id: number): any | null {
  return readDatabase().examenes.find((e: any) => e.id === id) || null
}

export function createExamen(data: any): any {
  const db = readDatabase()
  const maxId = Math.max(0, ...db.examenes.map((e: any) => e.id))
  const newE = { ...data, id: maxId + 1 }
  db.examenes.push(newE)
  writeDatabase(db)
  return newE
}

export function updateExamen(id: number, data: any): any | null {
  const db = readDatabase()
  const idx = db.examenes.findIndex((e: any) => e.id === id)
  if (idx === -1) return null
  db.examenes[idx] = { ...db.examenes[idx], ...data }
  writeDatabase(db)
  return db.examenes[idx]
}

export function deleteExamen(id: number): any | null {
  const db = readDatabase()
  const idx = db.examenes.findIndex((e: any) => e.id === id)
  if (idx === -1) return null
  const deleted = db.examenes.splice(idx, 1)[0]
  db.preguntas = db.preguntas.filter((p: any) => p.examen_id !== id)
  writeDatabase(db)
  return deleted
}

export function getPreguntaById(id: number): any | null {
  return readDatabase().preguntas.find((p: any) => p.id === id) || null
}

export function getPreguntasFiltered(filters: any): { preguntas: any[]; total: number } {
  const db = readDatabase()
  let result = db.preguntas

  if (filters.examen_id) result = result.filter((p: any) => p.examen_id === filters.examen_id)
  if (filters.tema) result = result.filter((p: any) => p.tema === filters.tema)
  if (filters.q) {
    const q = filters.q.toLowerCase()
    result = result.filter((p: any) =>
      (p.enunciado_ca && p.enunciado_ca.toLowerCase().includes(q)) ||
      (p.enunciado_es && p.enunciado_es.toLowerCase().includes(q))
    )
  }

  const total = result.length
  const offset = filters.offset || 0
  const limit = filters.limit || 20
  return { preguntas: result.slice(offset, offset + limit), total }
}

export function createPregunta(data: any): any {
  const db = readDatabase()
  const maxId = Math.max(0, ...db.preguntas.map((p: any) => p.id))
  const newP = { ...data, id: maxId + 1 }
  db.preguntas.push(newP)
  const examen = db.examenes.find((e: any) => e.id === newP.examen_id)
  if (examen) examen.total_preguntas = db.preguntas.filter((p: any) => p.examen_id === examen.id).length
  writeDatabase(db)
  return newP
}

export function updatePregunta(id: number, data: any): any | null {
  const db = readDatabase()
  const idx = db.preguntas.findIndex((p: any) => p.id === id)
  if (idx === -1) return null
  db.preguntas[idx] = { ...db.preguntas[idx], ...data }
  writeDatabase(db)
  return db.preguntas[idx]
}

export function deletePregunta(id: number): any | null {
  const db = readDatabase()
  const idx = db.preguntas.findIndex((p: any) => p.id === id)
  if (idx === -1) return null
  const deleted = db.preguntas.splice(idx, 1)[0]
  const examen = db.examenes.find((e: any) => e.id === deleted.examen_id)
  if (examen) examen.total_preguntas = db.preguntas.filter((p: any) => p.examen_id === examen.id).length
  writeDatabase(db)
  return deleted
}
