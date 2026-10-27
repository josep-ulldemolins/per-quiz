// Packs content/temario/*.md into server/theory.gen.json, so the Worker serves the theory and can hold part of it
// back for free accounts. Pass --watch to rebuild on every change (npm run dev does).
import { readdirSync, readFileSync, writeFileSync, watch } from 'node:fs'

const dir = new URL('../content/temario/', import.meta.url)
const out = new URL('../server/theory.gen.json', import.meta.url)

function build() {
  const files = {}
  for (const name of readdirSync(dir).sort()) {
    const m = /^(.+)\.(es|ca)\.md$/.exec(name)
    if (m) files[`${m[1]}.${m[2]}`] = readFileSync(new URL(name, dir), 'utf8')
  }
  const json = JSON.stringify(files)
  let old = null
  try { old = readFileSync(out, 'utf8') } catch {}
  if (json !== old) writeFileSync(out, json)
}

build()
if (process.argv.includes('--watch')) {
  let timer
  watch(dir, () => {
    clearTimeout(timer)
    timer = setTimeout(build, 100)
  })
}
