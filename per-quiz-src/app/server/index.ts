import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { compress } from 'hono/compress'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db } from './db.ts'
import { grade, PAPERS, type Bank, type PaperId, type AttemptKind } from '../shared/exam.ts'

const PROD = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.API_PORT ?? 8787)
const DATA_DIR = fileURLToPath(new URL('../../web/data/', import.meta.url))
const DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url))
const SESSION_DAYS = 30
const LANGS = ['es', 'ca']
const THEMES = ['system', 'light', 'dark']
const KINDS: AttemptKind[] = ['simulation', 'real', 'custom', 'mistakes']

const bankJson = readFileSync(DATA_DIR + 'questions.json', 'utf8')
const bank: Bank = JSON.parse(bankJson)
const questionById = new Map(bank.questions.map((q) => [q.id, q]))
const bankEtag = `"${createHash('sha1').update(bankJson).digest('base64url')}"`

type Row = Record<string, any>
type Env = { Variables: { userId: number } }

// ---------- auth helpers ----------

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(expected, actual)
}

function startSession(c: Context, userId: number) {
  const token = randomBytes(32).toString('base64url')
  const expires = Date.now() + SESSION_DAYS * 864e5
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  setCookie(c, 'sid', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: PROD,
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
}

function publicUser(u: Row) {
  return { id: u.id, name: u.name, email: u.email, lang: u.lang, qLang: u.q_lang, theme: u.theme, createdAt: u.created_at }
}

// Small in-memory brake on password guessing: 8 failures per email per 15 minutes.
const failures = new Map<string, { count: number; until: number }>()
function tooManyFailures(email: string) {
  const f = failures.get(email)
  return !!f && f.until > Date.now() && f.count >= 8
}
function noteFailure(email: string) {
  const f = failures.get(email)
  if (!f || f.until < Date.now()) failures.set(email, { count: 1, until: Date.now() + 15 * 6e4 })
  else f.count++
}

const isEmail = (s: unknown): s is string => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200

// ---------- app ----------

const app = new Hono<Env>()
const api = new Hono<Env>()

api.post('/auth/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const lang = LANGS.includes(body.lang) ? body.lang : 'es'
  if (!name || name.length > 60) return c.json({ error: 'name' }, 400)
  if (!isEmail(email)) return c.json({ error: 'email' }, 400)
  if (password.length < 8 || password.length > 200) return c.json({ error: 'password' }, 400)
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return c.json({ error: 'email_taken' }, 409)
  const res = db
    .prepare('INSERT INTO users (email, name, pass_hash, lang, q_lang, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(email, name, hashPassword(password), lang, lang, Date.now())
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid) as Row
  startSession(c, user.id)
  return c.json({ user: publicUser(user) })
})

api.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (tooManyFailures(email)) return c.json({ error: 'too_many' }, 429)
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Row | undefined
  if (!user || !verifyPassword(password, user.pass_hash)) {
    noteFailure(email)
    return c.json({ error: 'credentials' }, 401)
  }
  failures.delete(email)
  startSession(c, user.id)
  return c.json({ user: publicUser(user) })
})

api.post('/auth/logout', (c) => {
  const token = getCookie(c, 'sid')
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  deleteCookie(c, 'sid', { path: '/' })
  return c.json({ ok: true })
})

// Revalidated on every load, so a regenerated bank reaches people at once.
api.get('/bank', compress(), (c) => {
  c.header('Cache-Control', 'no-cache')
  c.header('ETag', bankEtag)
  if (c.req.header('If-None-Match')?.replace(/^W\//, '') === bankEtag) return c.body(null, 304)
  c.header('Content-Type', 'application/json; charset=utf-8')
  return c.body(bankJson)
})

// Everything below needs a session.
api.use('*', async (c, next) => {
  const token = getCookie(c, 'sid')
  const s = token
    ? (db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as Row | undefined)
    : undefined
  if (!s || s.expires_at < Date.now()) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', s.user_id)
  await next()
})

api.get('/me', (c) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(c.get('userId')) as Row
  return c.json({ user: publicUser(user) })
})

api.patch('/me', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const id = c.get('userId')
  if (typeof body.name === 'string' && body.name.trim() && body.name.length <= 60)
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(body.name.trim(), id)
  if (LANGS.includes(body.lang)) db.prepare('UPDATE users SET lang = ? WHERE id = ?').run(body.lang, id)
  if (LANGS.includes(body.qLang)) db.prepare('UPDATE users SET q_lang = ? WHERE id = ?').run(body.qLang, id)
  if (THEMES.includes(body.theme)) db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(body.theme, id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row
  return c.json({ user: publicUser(user) })
})

api.delete('/me/progress', (c) => {
  db.prepare('DELETE FROM attempts WHERE user_id = ?').run(c.get('userId'))
  return c.json({ ok: true })
})

/** Per-question history for this user: [times answered, times correct, last answer correct, last answered at]. */
api.get('/progress', (c) => {
  const id = c.get('userId')
  const rows = db
    .prepare(
      `SELECT question_id, COUNT(*) n, SUM(correct) ok, MAX(answered_at) last_at,
              (SELECT a2.correct FROM answers a2 WHERE a2.user_id = a.user_id AND a2.question_id = a.question_id
               ORDER BY a2.answered_at DESC LIMIT 1) last_ok
       FROM answers a WHERE user_id = ? GROUP BY question_id`,
    )
    .all(id) as Row[]
  const questions: Record<string, [number, number, number, number]> = {}
  for (const r of rows) questions[r.question_id] = [r.n, r.ok, r.last_ok, r.last_at]
  const bookmarks = (db.prepare('SELECT question_id FROM bookmarks WHERE user_id = ?').all(id) as Row[]).map(
    (r) => r.question_id,
  )
  return c.json({ questions, bookmarks })
})

/** How often everybody gets each question wrong: [answers, wrong]. Drives the difficulty filter. */
api.get('/difficulty', (c) => {
  const rows = db
    .prepare('SELECT question_id, COUNT(*) n, COUNT(*) - SUM(correct) wrong FROM answers GROUP BY question_id')
    .all() as Row[]
  const out: Record<string, [number, number]> = {}
  for (const r of rows) out[r.question_id] = [r.n, r.wrong]
  return c.json(out)
})

api.put('/bookmarks/:qid', (c) => {
  const qid = c.req.param('qid')
  if (!questionById.has(qid)) return c.json({ error: 'not_found' }, 404)
  db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, question_id, created_at) VALUES (?, ?, ?)').run(
    c.get('userId'),
    qid,
    Date.now(),
  )
  return c.json({ ok: true })
})

api.delete('/bookmarks/:qid', (c) => {
  db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?').run(c.get('userId'), c.req.param('qid'))
  return c.json({ ok: true })
})

function attemptOut(r: Row, withAnswers = false) {
  const out: Row = {
    id: r.id,
    kind: r.kind,
    paper: r.paper,
    title: r.title,
    mode: r.mode,
    config: JSON.parse(r.config),
    questionIds: JSON.parse(r.question_ids),
    timeLimit: r.time_limit,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    elapsed: r.elapsed,
    result: r.result ? JSON.parse(r.result) : null,
    answered: (db.prepare('SELECT COUNT(*) n FROM answers WHERE attempt_id = ?').get(r.id) as Row).n,
  }
  if (withAnswers) {
    const answers: Record<string, string> = {}
    for (const a of db.prepare('SELECT question_id, choice FROM answers WHERE attempt_id = ?').all(r.id) as Row[])
      answers[a.question_id] = a.choice
    out.answers = answers
  }
  return out
}

function ownAttempt(c: Context<Env>) {
  return db.prepare('SELECT * FROM attempts WHERE id = ? AND user_id = ?').get(c.req.param('id') ?? '', c.get('userId')) as
    | Row
    | undefined
}

api.get('/attempts', (c) => {
  const rows = db
    .prepare('SELECT * FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 200')
    .all(c.get('userId')) as Row[]
  return c.json(rows.map((r) => attemptOut(r)))
})

api.post('/attempts', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const ids: unknown = body.questionIds
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || !ids.every((q) => questionById.has(q)))
    return c.json({ error: 'questions' }, 400)
  if (!KINDS.includes(body.kind)) return c.json({ error: 'kind' }, 400)
  const paper: PaperId | null = body.paper && body.paper in PAPERS ? body.paper : null
  const mode = body.mode === 'exam' ? 'exam' : 'practice'
  const timeLimit = Number.isInteger(body.timeLimit) && body.timeLimit > 0 ? body.timeLimit : null
  const title = String(body.title ?? '').slice(0, 120) || 'Test'
  const id = randomUUID()
  db.prepare(
    `INSERT INTO attempts (id, user_id, kind, paper, title, mode, config, question_ids, time_limit, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, c.get('userId'), body.kind, paper, title, mode, JSON.stringify(body.config ?? {}), JSON.stringify(ids), timeLimit, Date.now())
  const row = db.prepare('SELECT * FROM attempts WHERE id = ?').get(id) as Row
  return c.json(attemptOut(row, true))
})

api.get('/attempts/:id', (c) => {
  const r = ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  return c.json(attemptOut(r, true))
})

api.put('/attempts/:id/answers/:qid', async (c) => {
  const r = ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  if (r.finished_at) return c.json({ error: 'finished' }, 409)
  const qid = c.req.param('qid')
  const q = questionById.get(qid)
  if (!q || !JSON.parse(r.question_ids).includes(qid)) return c.json({ error: 'question' }, 400)
  const body = await c.req.json().catch(() => ({}))
  const choice = String(body.choice ?? '')
  if (!q.options.some((o) => o.id === choice)) return c.json({ error: 'choice' }, 400)
  // Practice mode reveals the answer, so the first choice is final there.
  const sql =
    r.mode === 'practice'
      ? `INSERT OR IGNORE INTO answers (attempt_id, user_id, question_id, choice, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?)`
      : `INSERT INTO answers (attempt_id, user_id, question_id, choice, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (attempt_id, question_id) DO UPDATE SET choice = excluded.choice, correct = excluded.correct, answered_at = excluded.answered_at`
  db.prepare(sql).run(r.id, c.get('userId'), qid, choice, choice === q.answer ? 1 : 0, Date.now())
  if (Number.isInteger(body.elapsed)) db.prepare('UPDATE attempts SET elapsed = ? WHERE id = ?').run(body.elapsed, r.id)
  return c.json({ correct: choice === q.answer })
})

api.post('/attempts/:id/finish', async (c) => {
  const r = ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  if (!r.finished_at) {
    const body = await c.req.json().catch(() => ({}))
    const ids: string[] = JSON.parse(r.question_ids)
    const answers: Record<string, string> = {}
    for (const a of db.prepare('SELECT question_id, choice FROM answers WHERE attempt_id = ?').all(r.id) as Row[])
      answers[a.question_id] = a.choice
    const result = grade(ids.map((id) => questionById.get(id)!), answers, r.paper)
    const elapsed = Number.isInteger(body.elapsed) ? body.elapsed : r.elapsed
    db.prepare('UPDATE attempts SET finished_at = ?, elapsed = ?, result = ? WHERE id = ?').run(
      Date.now(),
      elapsed,
      JSON.stringify(result),
      r.id,
    )
  }
  return c.json(attemptOut(ownAttempt(c)!, true))
})

api.delete('/attempts/:id', (c) => {
  const r = ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  db.prepare('DELETE FROM attempts WHERE id = ?').run(r.id)
  return c.json({ ok: true })
})

app.route('/api', api)

app.use(
  '/img/*',
  serveStatic({
    root: DATA_DIR,
    onFound: (_p, c) => {
      c.header('Cache-Control', 'public, max-age=86400')
    },
  }),
)

if (PROD) {
  app.use('/*', serveStatic({ root: DIST_DIR }))
  app.get('*', serveStatic({ path: DIST_DIR + 'index.html' }))
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`PER Quiz API on http://localhost:${info.port}`)
})
