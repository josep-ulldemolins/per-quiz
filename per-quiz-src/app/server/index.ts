import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import bankData from '../../web/data/questions.json'
import { grade, PAPERS, type Bank, type PaperId, type AttemptKind } from '../shared/exam.ts'

const SESSION_DAYS = 30
const LANGS = ['es', 'ca']
const THEMES = ['system', 'light', 'dark']
const KINDS: AttemptKind[] = ['simulation', 'real', 'custom', 'mistakes']
// Workers caps PBKDF2 at 100k iterations; also keeps a login inside the free plan's CPU budget.
const PBKDF2_ITERATIONS = 100_000

const bank = bankData as Bank
const questionById = new Map(bank.questions.map((q) => [q.id, q]))
let bankJson: string | undefined
let bankEtag: string | undefined

type Row = Record<string, any>
type Env = { Bindings: { DB: D1Database }; Variables: { userId: number } }
type Ctx = Context<Env>

// ---------- encoding helpers ----------

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0))
const toBase64Url = (bytes: Uint8Array) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

// ---------- auth helpers ----------

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return new Uint8Array(bits)
}

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split('$')
  if (scheme !== 'pbkdf2') return false
  const expected = fromBase64(hash)
  const actual = await pbkdf2(password, fromBase64(salt), Number(iterations))
  return expected.length === actual.length && crypto.subtle.timingSafeEqual(expected, actual)
}

async function startSession(c: Ctx, userId: number) {
  const token = toBase64Url(randomBytes(32))
  const expires = Date.now() + SESSION_DAYS * 864e5
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, expires).run()
  setCookie(c, 'sid', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  })
}

function publicUser(u: Row) {
  return { id: u.id, name: u.name, email: u.email, lang: u.lang, qLang: u.q_lang, theme: u.theme, createdAt: u.created_at }
}

// Brake on password guessing: 8 failures per email per 15 minutes.
async function tooManyFailures(db: D1Database, email: string) {
  const f = await db.prepare('SELECT count, until FROM login_failures WHERE email = ?').bind(email).first<Row>()
  return !!f && f.until > Date.now() && f.count >= 8
}
async function noteFailure(db: D1Database, email: string) {
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO login_failures (email, count, until) VALUES (?1, 1, ?2)
       ON CONFLICT (email) DO UPDATE SET
         count = CASE WHEN until < ?3 THEN 1 ELSE count + 1 END,
         until = CASE WHEN until < ?3 THEN excluded.until ELSE until END`,
    )
    .bind(email, now + 15 * 6e4, now)
    .run()
}

const isEmail = (s: unknown): s is string => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200

// ---------- app ----------

const app = new Hono<Env>()
const api = new Hono<Env>()

api.post('/auth/register', async (c) => {
  const db = c.env.DB
  const body = await c.req.json().catch(() => ({}))
  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const lang = LANGS.includes(body.lang) ? body.lang : 'es'
  if (!name || name.length > 60) return c.json({ error: 'name' }, 400)
  if (!isEmail(email)) return c.json({ error: 'email' }, 400)
  if (password.length < 8 || password.length > 200) return c.json({ error: 'password' }, 400)
  if (await db.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) return c.json({ error: 'email_taken' }, 409)
  const user = (await db
    .prepare('INSERT INTO users (email, name, pass_hash, lang, q_lang, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(email, name, await hashPassword(password), lang, lang, Date.now())
    .first<Row>())!
  await startSession(c, user.id)
  return c.json({ user: publicUser(user) })
})

api.post('/auth/login', async (c) => {
  const db = c.env.DB
  const body = await c.req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  if (await tooManyFailures(db, email)) return c.json({ error: 'too_many' }, 429)
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<Row>()
  if (!user || !(await verifyPassword(password, user.pass_hash))) {
    await noteFailure(db, email)
    return c.json({ error: 'credentials' }, 401)
  }
  await db.prepare('DELETE FROM login_failures WHERE email = ?').bind(email).run()
  await startSession(c, user.id)
  return c.json({ user: publicUser(user) })
})

api.post('/auth/logout', async (c) => {
  const token = getCookie(c, 'sid')
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  deleteCookie(c, 'sid', { path: '/' })
  return c.json({ ok: true })
})

api.get('/health', async (c) => {
  await c.env.DB.prepare('SELECT 1').first()
  return c.json({ ok: true })
})

// Revalidated on every load, so a regenerated bank reaches people at once.
api.get('/bank', async (c) => {
  bankJson ??= JSON.stringify(bank)
  bankEtag ??= `"${toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(bankJson))))}"`
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
    ? await c.env.DB.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').bind(token).first<Row>()
    : null
  if (!s || s.expires_at < Date.now()) return c.json({ error: 'unauthorized' }, 401)
  c.set('userId', s.user_id)
  await next()
})

api.get('/me', async (c) => {
  const user = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first<Row>())!
  return c.json({ user: publicUser(user) })
})

api.patch('/me', async (c) => {
  const db = c.env.DB
  const body = await c.req.json().catch(() => ({}))
  const id = c.get('userId')
  const updates: D1PreparedStatement[] = []
  if (typeof body.name === 'string' && body.name.trim() && body.name.length <= 60)
    updates.push(db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(body.name.trim(), id))
  if (LANGS.includes(body.lang)) updates.push(db.prepare('UPDATE users SET lang = ? WHERE id = ?').bind(body.lang, id))
  if (LANGS.includes(body.qLang)) updates.push(db.prepare('UPDATE users SET q_lang = ? WHERE id = ?').bind(body.qLang, id))
  if (THEMES.includes(body.theme)) updates.push(db.prepare('UPDATE users SET theme = ? WHERE id = ?').bind(body.theme, id))
  if (updates.length) await db.batch(updates)
  const user = (await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<Row>())!
  return c.json({ user: publicUser(user) })
})

api.delete('/me/progress', async (c) => {
  await c.env.DB.prepare('DELETE FROM attempts WHERE user_id = ?').bind(c.get('userId')).run()
  return c.json({ ok: true })
})

/** Per-question history for this user: [times answered, times correct, last answer correct, last answered at]. */
api.get('/progress', async (c) => {
  const db = c.env.DB
  const id = c.get('userId')
  const [rows, marks] = await db.batch<Row>([
    db
      .prepare(
        `SELECT question_id, COUNT(*) n, SUM(correct) ok, MAX(answered_at) last_at,
                (SELECT a2.correct FROM answers a2 WHERE a2.user_id = a.user_id AND a2.question_id = a.question_id
                 ORDER BY a2.answered_at DESC LIMIT 1) last_ok
         FROM answers a WHERE user_id = ? GROUP BY question_id`,
      )
      .bind(id),
    db.prepare('SELECT question_id FROM bookmarks WHERE user_id = ?').bind(id),
  ])
  const questions: Record<string, [number, number, number, number]> = {}
  for (const r of rows.results) questions[r.question_id] = [r.n, r.ok, r.last_ok, r.last_at]
  const bookmarks = marks.results.map((r) => r.question_id)
  return c.json({ questions, bookmarks })
})

/** How often everybody gets each question wrong: [answers, wrong]. Drives the difficulty filter. */
api.get('/difficulty', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT question_id, COUNT(*) n, COUNT(*) - SUM(correct) wrong FROM answers GROUP BY question_id',
  ).all<Row>()
  const out: Record<string, [number, number]> = {}
  for (const r of results) out[r.question_id] = [r.n, r.wrong]
  return c.json(out)
})

api.put('/bookmarks/:qid', async (c) => {
  const qid = c.req.param('qid')
  if (!questionById.has(qid)) return c.json({ error: 'not_found' }, 404)
  await c.env.DB.prepare('INSERT OR IGNORE INTO bookmarks (user_id, question_id, created_at) VALUES (?, ?, ?)')
    .bind(c.get('userId'), qid, Date.now())
    .run()
  return c.json({ ok: true })
})

api.delete('/bookmarks/:qid', async (c) => {
  await c.env.DB.prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?')
    .bind(c.get('userId'), c.req.param('qid'))
    .run()
  return c.json({ ok: true })
})

// Every attempt row is read with its answer count, so a list costs one query.
const ATTEMPT_COLUMNS = '*, (SELECT COUNT(*) FROM answers WHERE attempt_id = attempts.id) answered'

function attemptOut(r: Row, answers?: Row[]) {
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
    answered: r.answered,
  }
  if (answers) out.answers = Object.fromEntries(answers.map((a) => [a.question_id, a.choice]))
  return out
}

function ownAttempt(c: Ctx) {
  return c.env.DB.prepare(`SELECT ${ATTEMPT_COLUMNS} FROM attempts WHERE id = ? AND user_id = ?`)
    .bind(c.req.param('id') ?? '', c.get('userId'))
    .first<Row>()
}

async function attemptAnswers(db: D1Database, attemptId: string) {
  const { results } = await db.prepare('SELECT question_id, choice FROM answers WHERE attempt_id = ?').bind(attemptId).all<Row>()
  return results
}

api.get('/attempts', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${ATTEMPT_COLUMNS} FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT 200`,
  )
    .bind(c.get('userId'))
    .all<Row>()
  return c.json(results.map((r) => attemptOut(r)))
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
  const row = (await c.env.DB.prepare(
    `INSERT INTO attempts (id, user_id, kind, paper, title, mode, config, question_ids, time_limit, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *, 0 AS answered`,
  )
    .bind(crypto.randomUUID(), c.get('userId'), body.kind, paper, title, mode, JSON.stringify(body.config ?? {}), JSON.stringify(ids), timeLimit, Date.now())
    .first<Row>())!
  return c.json(attemptOut(row, []))
})

api.get('/attempts/:id', async (c) => {
  const r = await ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  return c.json(attemptOut(r, await attemptAnswers(c.env.DB, r.id)))
})

api.put('/attempts/:id/answers/:qid', async (c) => {
  const db = c.env.DB
  const r = await ownAttempt(c)
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
  const writes = [db.prepare(sql).bind(r.id, c.get('userId'), qid, choice, choice === q.answer ? 1 : 0, Date.now())]
  if (Number.isInteger(body.elapsed)) writes.push(db.prepare('UPDATE attempts SET elapsed = ? WHERE id = ?').bind(body.elapsed, r.id))
  await db.batch(writes)
  return c.json({ correct: choice === q.answer })
})

api.post('/attempts/:id/finish', async (c) => {
  const db = c.env.DB
  const r = await ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  if (!r.finished_at) {
    const body = await c.req.json().catch(() => ({}))
    const ids: string[] = JSON.parse(r.question_ids)
    const answers: Record<string, string> = {}
    for (const a of await attemptAnswers(db, r.id)) answers[a.question_id] = a.choice
    const result = grade(ids.map((id) => questionById.get(id)!), answers, r.paper)
    const elapsed = Number.isInteger(body.elapsed) ? body.elapsed : r.elapsed
    await db.prepare('UPDATE attempts SET finished_at = ?, elapsed = ?, result = ? WHERE id = ?')
      .bind(Date.now(), elapsed, JSON.stringify(result), r.id)
      .run()
  }
  const done = (await ownAttempt(c))!
  return c.json(attemptOut(done, await attemptAnswers(db, done.id)))
})

api.delete('/attempts/:id', async (c) => {
  const r = await ownAttempt(c)
  if (!r) return c.json({ error: 'not_found' }, 404)
  await c.env.DB.prepare('DELETE FROM attempts WHERE id = ?').bind(r.id).run()
  return c.json({ ok: true })
})

app.route('/api', api)

// The web and /img/* are static assets; wrangler.jsonc sends only /api/* here.
export default app
