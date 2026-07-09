# PER Quiz

Plataforma web per practicar amb preguntes reals d'exàmens oficials del **PER (Patró d'Embarcacions de Recreo)** de la Generalitat de Catalunya.

## Característiques

- 🎯 **1.257 preguntes reals** d'exàmens oficials (2025-2026)
- 📚 **3 modes de pràctica**: Examen complet, per tema, aleatori
- 🌍 **Bilingüe**: Català (per defecte) i Castellà
- 🌙 **Mode fosc/clar** amb auto-detecció del sistema
- ⌨️ **Atajos de teclat** per navegar ràpidament
- 📱 **100% responsive** - funciona en mòbil, tablet i escriptori
- 💾 **Sense registre** - tot es desa localment
- 🆓 **Open source** - 100% gratuït

## Stack tecnològic

- **Astro 4** - Framework web
- **React 18** - Components interactius
- **TailwindCSS** - Estils
- **shadcn/ui** - Components UI
- **Zustand** - Estat global
- **Supabase** - Base de dades (PostgreSQL)
- **TypeScript** - Tipat fort

## Estructura del projecte

```
per-quiz/
├── apps/
│   └── web/                 # Frontend Astro
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── lib/         # Utils + Supabase
│       │   ├── pages/       # Rutes
│       │   ├── stores/      # Zustand stores
│       │   ├── styles/      # CSS
│       │   └── layouts/     # Layouts Astro
│       └── public/          # Static files
├── packages/
│   └── shared/              # Tipus compartits
│       └── src/
│           ├── types.ts     # TypeScript types
│           ├── i18n.ts      # Traduccions
│           └── constants.ts # Constants
├── scripts/
│   ├── split-locales.mjs    # Processa el JSON
│   └── import-to-supabase.mjs # Importa a Supabase
└── supabase/
    └── migrations/
        └── 001_schema.sql   # Schema SQL
```

## Setup

### Prerequisits

- Node.js 18+
- pnpm 9+
- (Opcional) Compte de Supabase

### Instal·lació

```bash
# Clonar el repositori
cd per-quiz

# Instal·lar dependencies
pnpm install

# Configurar variables d'entorn
cp apps/web/.env.example apps/web/.env
# Edita apps/web/.env amb les teves claus de Supabase

# Generar el fitxer de dades local
pnpm split-locales

# Iniciar el dev server
pnpm dev
```

### Configurar Supabase (opcional)

Si vols usar Supabase en lloc del fitxer local:

1. Crea un projecte a [supabase.com](https://supabase.com)
2. Executa `supabase/migrations/001_schema.sql` al SQL Editor
3. Configura les variables d'entorn:
   ```
   PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Importa les dades:
   ```bash
   pnpm seed
   ```

## Desenvolupament

```bash
pnpm dev          # Servidor de desenvolupament
pnpm build        # Build de producció
pnpm preview      # Preview del build
```

## Desplegament

### Vercel (recomanat)

```bash
# Connectar el repo
vercel link

# Configurar variables d'entorn
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY

# Deploy
vercel --prod
```

### Netlify

```bash
netlify deploy --prod
```

## Llicència

MIT - Aquest projecte és open source. Les preguntes provenen d'exàmens oficials de la Generalitat de Catalunya.

## Disclaimer

Aquesta plataforma NO és oficial. Només té finalitats educatives. Per a l'examen oficial, consulta la [Generalitat de Catalunya](https://nautica.gencat.cat).
