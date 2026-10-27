import { Hono, type Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import bankData from '../../web/data/questions.json'
import theoryFiles from './theory.gen.json'
import { buildRealExam, grade, isSimulation, PAPERS, type Bank, type Lang, type PaperId, type AttemptKind } from '../shared/exam.ts'
import { freeExamId, PLAN_IDS, SEMESTER_MONTHS, type Access, type PlanId } from '../shared/plans.ts'
import { firstSection, GUIDES, parseTheory } from '../shared/theory.ts'

const SESSION_DAYS = 30
const LANGS = ['es', 'ca']
const THEMES = ['system', 'light', 'dark']
const KINDS: AttemptKind[] = ['simulation', 'real', 'custom', 'mistakes']
// Workers caps PBKDF2 at 100k iterations; also keeps a login inside the free plan's CPU budget.
const PBKDF2_ITERATIONS = 100_000

const bank = bankData as Bank
const questionById = new Map(bank.questions.map((q) => [q.id, q]))
const theory = theoryFiles as Record<string, string>
const FREE_EXAM = freeExamId(bank)
const FREE_EXAM_IDS = FREE_EXAM ? buildRealExam(bank, FREE_EXAM) : []
// Free accounts may only start these; custom and mistakes tests need a plan.
const EXAM_KINDS: AttemptKind[] = ['simulation', 'real']
let bankJson: string | undefined
let bankEtag: string | undefined

type Row = Record<string, any>
type Env = {
  Bindings: {
    DB: D1Database
    /** wrangler.jsonc vars: change them there and deploy */
    FREE_DAILY_EXAMS: string
    PRICE_SEMESTER_CENTS: string
    PRICE_LIFETIME_CENTS: string
    /** secrets: `wrangler secret put`, or .dev.vars locally */
    STRIPE_SECRET_KEY?: string
    STRIPE_WEBHOOK_SECRET?: string
  }
  Variables: { userId: number }
}
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

// ---------- plans ----------

/** Midnight in Madrid today, as a timestamp: the free daily quota starts again then. */
function madridMidnight(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  )
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  const offset = Math.round((wall - now) / 6e4) * 6e4
  return Date.UTC(parts.year, parts.month - 1, parts.day) - offset
}

function prices(c: Ctx): Record<PlanId, number> {
  return { semester: Number(c.env.PRICE_SEMESTER_CENTS), lifetime: Number(c.env.PRICE_LIFETIME_CENTS) }
}

/** The plan that is active now; a lifetime plan wins over any semester one. */
async function activePlan(db: D1Database, userId: number) {
  return db
    .prepare(
      `SELECT plan, expires_at FROM entitlements WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY expires_at IS NULL DESC, expires_at DESC LIMIT 1`,
    )
    .bind(userId, Date.now())
    .first<Row>()
}

async function examsToday(db: D1Database, userId: number) {
  const r = await db
    .prepare('SELECT COUNT(*) n FROM exam_starts WHERE user_id = ? AND started_at >= ?')
    .bind(userId, madridMidnight())
    .first<Row>()
  return r?.n ?? 0
}

async function access(c: Ctx): Promise<Access> {
  const id = c.get('userId')
  const [plan, today] = await Promise.all([activePlan(c.env.DB, id), examsToday(c.env.DB, id)])
  return {
    premium: !!plan,
    plan: plan?.plan ?? null,
    expiresAt: plan?.expires_at ?? null,
    examsToday: today,
    examsPerDay: Number(c.env.FREE_DAILY_EXAMS),
    freeExam: FREE_EXAM,
    prices: prices(c),
    billing: !!c.env.STRIPE_SECRET_KEY,
  }
}

// ---------- Stripe ----------

/** Form-encodes nested params the way Stripe expects: a[b][0]=c. */
function stripeForm(params: Record<string, unknown>, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v != null && typeof v === 'object') stripeForm(v as Record<string, unknown>, key, out)
    else if (v != null) out.append(key, String(v))
  }
  return out
}

async function stripe(c: Ctx, method: 'GET' | 'POST', path: string, params?: Record<string, unknown>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params ? stripeForm(params) : undefined,
  })
  const data = await res.json<Row>()
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message ?? res.status}`)
  return data
}

/** Checks the Stripe-Signature header: HMAC-SHA256 of "<t>.<body>", at most 5 minutes old. */
async function verifyStripeSignature(secret: string, header: string, body: string) {
  const parts = header.split(',').map((p) => p.split('='))
  const t = parts.find(([k]) => k === 't')?.[1]
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v)
  if (!t || !signatures.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)))
  const expected = new TextEncoder().encode([...mac].map((b) => b.toString(16).padStart(2, '0')).join(''))
  return signatures.some((s) => {
    const got = new TextEncoder().encode(s)
    return got.length === expected.length && crypto.subtle.timingSafeEqual(got, expected)
  })
}

/**
 * Turns a paid Checkout Session into a plan. Both the webhook and the return page call it, so it is idempotent:
 * the session id is the row's key. A semester bought while one is running starts when that one ends.
 */
async function grantSession(db: D1Database, session: Row) {
  if (session.payment_status !== 'paid') return false
  const userId = Number(session.metadata?.user_id)
  const plan = session.metadata?.plan as PlanId
  if (!userId || !PLAN_IDS.includes(plan)) return false
  let expires: number | null = null
  if (plan === 'semester') {
    const current = await db
      .prepare(`SELECT MAX(expires_at) e FROM entitlements WHERE user_id = ? AND plan = 'semester'`)
      .bind(userId)
      .first<Row>()
    const from = new Date(Math.max(Date.now(), current?.e ?? 0))
    from.setUTCMonth(from.getUTCMonth() + SEMESTER_MONTHS)
    expires = from.getTime()
  }
  await db
    .prepare(
      `INSERT OR IGNORE INTO entitlements (id, user_id, plan, expires_at, payment_intent, amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(session.id, userId, plan, expires, session.payment_intent ?? null, session.amount_total ?? 0, Date.now())
    .run()
  return true
}

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

// Stripe calls this after a payment or a refund; it signs the body instead of sending a session cookie.
api.post('/billing/webhook', async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET
  const body = await c.req.text()
  if (!secret || !(await verifyStripeSignature(secret, c.req.header('Stripe-Signature') ?? '', body)))
    return c.json({ error: 'signature' }, 400)
  const event = JSON.parse(body)
  const obj = event.data?.object ?? {}
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded')
    await grantSession(c.env.DB, obj)
  else if (event.type === 'charge.refunded' && obj.refunded && obj.payment_intent)
    await c.env.DB.prepare('DELETE FROM entitlements WHERE payment_intent = ?').bind(obj.payment_intent).run()
  return c.json({ received: true })
})

// Prices and the free quota for the public landing page.
api.get('/pricing', (c) => c.json({ prices: prices(c), examsPerDay: Number(c.env.FREE_DAILY_EXAMS) }))

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

api.get('/access', async (c) => c.json(await access(c)))

api.post('/billing/checkout', async (c) => {
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: 'billing_off' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const plan = body.plan as PlanId
  if (!PLAN_IDS.includes(plan)) return c.json({ error: 'plan' }, 400)
  const id = c.get('userId')
  const user = (await c.env.DB.prepare('SELECT email, lang FROM users WHERE id = ?').bind(id).first<Row>())!
  const origin = new URL(c.req.url).origin
  const session = await stripe(c, 'POST', 'checkout/sessions', {
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: prices(c)[plan],
          product_data: { name: plan === 'lifetime' ? 'PER Quiz · Para siempre' : `PER Quiz · ${SEMESTER_MONTHS} meses` },
        },
      },
    ],
    customer_email: user.email,
    client_reference_id: id,
    metadata: { user_id: id, plan },
    payment_intent_data: { metadata: { user_id: id, plan } },
    locale: user.lang === 'ca' ? 'auto' : 'es',
    success_url: `${origin}/planes?pago=ok&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/planes?pago=cancelado`,
  })
  return c.json({ url: session.url })
})

// The return page asks for its session at once, so the plan works even before the webhook arrives.
api.post('/billing/confirm', async (c) => {
  if (!c.env.STRIPE_SECRET_KEY) return c.json({ error: 'billing_off' }, 503)
  const body = await c.req.json().catch(() => ({}))
  const sessionId = String(body.session ?? '')
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return c.json({ error: 'session' }, 400)
  const session = await stripe(c, 'GET', `checkout/sessions/${sessionId}`)
  if (Number(session.metadata?.user_id) !== c.get('userId')) return c.json({ error: 'session' }, 403)
  await grantSession(c.env.DB, session)
  return c.json(await access(c))
})

/** Status of every theory file, for the index. */
api.get('/theory', (c) => {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(theory)) {
    const [id, lang] = key.split('.')
    if (lang === 'es' || !(id in out)) out[id] = parseTheory(raw, lang as Lang).status
  }
  return c.json(out)
})

/** One topic in the language asked for, else in the other; free accounts get the first section of each topic. */
api.get('/theory/:id/:lang', async (c) => {
  const id = c.req.param('id')
  const lang: Lang = c.req.param('lang') === 'ca' ? 'ca' : 'es'
  for (const l of [lang, lang === 'es' ? 'ca' : 'es'] as Lang[]) {
    const raw = theory[`${id}.${l}`]
    if (!raw) continue
    const doc = parseTheory(raw, l)
    if (!(GUIDES as readonly string[]).includes(id) && !(await activePlan(c.env.DB, c.get('userId')))) {
      const cut = firstSection(doc.body)
      doc.locked = cut.length < doc.body.length
      doc.body = cut
    }
    return c.json(doc)
  }
  return c.json({ error: 'not_found' }, 404)
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
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || !ids.every((q): q is string => questionById.has(q)))
    return c.json({ error: 'questions' }, 400)
  if (!KINDS.includes(body.kind)) return c.json({ error: 'kind' }, 400)
  const paper: PaperId | null = body.paper && body.paper in PAPERS ? body.paper : null
  const mode = body.mode === 'exam' ? 'exam' : 'practice'
  const timeLimit = Number.isInteger(body.timeLimit) && body.timeLimit > 0 ? body.timeLimit : null
  const title = String(body.title ?? '').slice(0, 120) || 'Test'
  const id = c.get('userId')
  const db = c.env.DB
  const config = body.config ?? {}
  // Free accounts: official simulations and the latest real paper, a few a day.
  const premium = !!(await activePlan(db, id))
  if (!premium) {
    if (!EXAM_KINDS.includes(body.kind)) return c.json({ error: 'premium' }, 402)
    if (body.kind === 'simulation' && !(paper && isSimulation(bank, paper, ids.map((q) => questionById.get(q)!))))
      return c.json({ error: 'premium' }, 402)
    if (body.kind === 'real' && (config.exam !== FREE_EXAM || ids.join() !== FREE_EXAM_IDS.join()))
      return c.json({ error: 'premium' }, 402)
    if ((await examsToday(db, id)) >= Number(c.env.FREE_DAILY_EXAMS)) return c.json({ error: 'daily_limit' }, 429)
    await db.prepare('INSERT INTO exam_starts (user_id, started_at) VALUES (?, ?)').bind(id, Date.now()).run()
  }
  const row = (await db.prepare(
    `INSERT INTO attempts (id, user_id, kind, paper, title, mode, config, question_ids, time_limit, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *, 0 AS answered`,
  )
    .bind(crypto.randomUUID(), id, body.kind, paper, title, mode, JSON.stringify(config), JSON.stringify(ids), timeLimit, Date.now())
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
