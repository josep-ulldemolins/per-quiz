// Runs the Worker (API + local D1, reloading on changes) and the Vite dev server together.
// The local database lives in .wrangler/; the first run creates its tables and the demo user.
import { spawn, spawnSync } from 'node:child_process'

for (const args of [
  ['d1', 'migrations', 'apply', 'per-quiz', '--local'],
  ['d1', 'execute', 'per-quiz', '--local', '--file', 'scripts/seed.dev.sql'],
]) {
  const r = spawnSync('npx', ['wrangler', ...args], { stdio: 'inherit' })
  if (r.status) process.exit(r.status)
}

const procs = [
  spawn('npx', ['wrangler', 'dev', '--port', '8787'], { stdio: 'inherit' }),
  spawn('npx', ['vite', '--port', '5173', '--strictPort'], { stdio: 'inherit' }),
]
const stop = () => procs.forEach((p) => p.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
procs.forEach((p) => p.on('exit', (code) => { stop(); process.exit(code ?? 0) }))
