import type { TemaInfo, TemaSlug } from './types'

export const TEMAS: Record<TemaSlug, TemaInfo> = {
  nomenclatura_nautica: {
    slug: 'nomenclatura_nautica',
    nombre_ca: 'Nomenclatura nàutica',
    nombre_es: 'Nomenclatura náutica',
    color: 'sky',
    icon: '⛵',
  },
  amarraje_fondeo: {
    slug: 'amarraje_fondeo',
    nombre_ca: 'Amarratge i fondeig',
    nombre_es: 'Amarre y fondeo',
    color: 'cyan',
    icon: '⚓',
  },
  seguridad: {
    slug: 'seguridad',
    nombre_ca: 'Seguretat',
    nombre_es: 'Seguridad',
    color: 'emerald',
    icon: '🛟',
  },
  legislacion: {
    slug: 'legislacion',
    nombre_ca: 'Legislació',
    nombre_es: 'Legislación',
    color: 'indigo',
    icon: '📜',
  },
  balizamiento: {
    slug: 'balizamiento',
    nombre_ca: 'Abalisament',
    nombre_es: 'Balizamiento',
    color: 'amber',
    icon: '🚧',
  },
  RIPA: {
    slug: 'RIPA',
    nombre_ca: 'RIPA',
    nombre_es: 'RIPA',
    color: 'orange',
    icon: '⚖️',
  },
  maniobra: {
    slug: 'maniobra',
    nombre_ca: 'Maniobra',
    nombre_es: 'Maniobra',
    color: 'rose',
    icon: '🔄',
  },
  emergencias: {
    slug: 'emergencias',
    nombre_ca: 'Emergències',
    nombre_es: 'Emergencias',
    color: 'red',
    icon: '🚨',
  },
  meteorologia: {
    slug: 'meteorologia',
    nombre_ca: 'Meteorologia',
    nombre_es: 'Meteorología',
    color: 'blue',
    icon: '⛅',
  },
  teoria_navegacion: {
    slug: 'teoria_navegacion',
    nombre_ca: 'Teoria de navegació',
    nombre_es: 'Teoría de navegación',
    color: 'violet',
    icon: '🧭',
  },
  carta_navegacion: {
    slug: 'carta_navegacion',
    nombre_ca: 'Carta de navegació',
    nombre_es: 'Carta de navegación',
    color: 'teal',
    icon: '🗺️',
  },
}

export const TEMA_SLUGS: TemaSlug[] = Object.keys(TEMAS) as TemaSlug[]

export const TEMA_COLORS: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500/30', ring: 'ring-sky-500/40' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500/30', ring: 'ring-cyan-500/40' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', ring: 'ring-emerald-500/40' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/30', ring: 'ring-indigo-500/40' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30', ring: 'ring-amber-500/40' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/30', ring: 'ring-orange-500/40' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/30', ring: 'ring-rose-500/40' },
  red: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300', border: 'border-red-500/30', ring: 'ring-red-500/40' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/30', ring: 'ring-blue-500/40' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-500/30', ring: 'ring-violet-500/40' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-500/30', ring: 'ring-teal-500/40' },
}

export const PER_APPROVAL_THRESHOLD = 0.5

export const PER_EXAM_DURATION_MINUTES = 60
