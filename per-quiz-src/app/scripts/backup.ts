// Consistent copy of the SQLite database while the app keeps running, keeping the newest KEEP copies.
//   node scripts/backup.ts                 (BACKUP_DIR defaults to /backups, DB_PATH to data/per-quiz.db)
import { DatabaseSync, backup } from 'node:sqlite'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const DB_PATH = process.env.DB_PATH ?? new URL('../data/per-quiz.db', import.meta.url).pathname
const DIR = process.env.BACKUP_DIR ?? '/backups'
const KEEP = Number(process.env.BACKUP_KEEP ?? 14)

mkdirSync(DIR, { recursive: true })
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')
const target = join(DIR, `per-quiz-${stamp}.db`)

const db = new DatabaseSync(DB_PATH, { readOnly: true })
const pages = await backup(db, target)
db.close()
console.log(`${target} (${pages} pages)`)

const old = readdirSync(DIR)
  .filter((f) => /^per-quiz-\d{8}-\d{4}\.db$/.test(f))
  .sort()
  .reverse()
  .slice(KEEP)
for (const f of old) rmSync(join(DIR, f))
if (old.length) console.log(`removed ${old.length} old backup(s)`)
