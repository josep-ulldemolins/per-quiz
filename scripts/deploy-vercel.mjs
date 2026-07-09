#!/usr/bin/env node
// scripts/deploy-vercel.mjs
// Script para automatizar el deploy a Vercel
// Uso: node scripts/deploy-vercel.mjs [token]

import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(process.cwd())
const token = process.argv[2] || process.env.VERCEL_TOKEN

if (!token) {
  console.log('❌ No Vercel token provided.')
  console.log('')
  console.log('Opciones:')
  console.log('  1. node scripts/deploy-vercel.mjs <your-token>')
  console.log('  2. set VERCEL_TOKEN=<your-token> && node scripts/deploy-vercel.mjs')
  console.log('  3. vercel login (interactivo)')
  console.log('')
  console.log('Para crear un token:')
  console.log('  1. Ve a https://vercel.com/account/tokens')
  console.log('  2. Click "Create Token"')
  console.log('  3. Dale un nombre y scope')
  console.log('  4. Copia el token')
  process.exit(1)
}

console.log('🚀 Desplegant a Vercel...')
console.log('')

// Verificar que el build funciona primero
console.log('1. Verificant build...')
try {
  execSync('pnpm build', { stdio: 'inherit', cwd: projectRoot })
  console.log('✅ Build correcte')
} catch (e) {
  console.error('❌ Build ha fallat')
  process.exit(1)
}

console.log('')
console.log('2. Desplegant a Vercel...')
console.log('')

try {
  execSync(`vercel deploy --prod --yes --token ${token}`, {
    stdio: 'inherit',
    cwd: projectRoot,
  })
  console.log('')
  console.log('✅ Deploy complet!')
  console.log('')
  console.log('Propera vegada pots fer:')
  console.log('  vercel --prod --token ' + token)
} catch (e) {
  console.error('❌ Deploy ha fallat')
  console.error(e.message)
  process.exit(1)
}
