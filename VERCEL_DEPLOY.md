# 🚀 Deploy a Vercel

Aquest projecte està preparat per desplegar-se a Vercel.

## Mètode 1: Des de la web de Vercel (recomanat)

1. **Puja el codi a GitHub/GitLab/Bitbucket**

2. **Importa'l a Vercel**:
   - Ves a [vercel.com/new](https://vercel.com/new)
   - Selecciona el repositori
   - Vercel detectarà automàticament que és un projecte Astro

3. **Configura el projecte**:
   - **Framework Preset**: Astro
   - **Root Directory**: deixa-ho buit (Vercel ho detecta)
   - **Build Command**: `cd ../.. && pnpm build` (Vercel ho posarà automàticament si detecta monorepo)
   - **Output Directory**: `apps/web/.vercel/output`
   - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`

4. **Variables d'entorn** (opcional):
   Si vols usar Supabase, afegeix:
   - `PUBLIC_SUPABASE_URL`: URL del teu projecte
   - `PUBLIC_SUPABASE_ANON_KEY`: Clau anon
   
   Si NO les poses, l'app usarà el fitxer local `per_data.json`.

5. **Deploy!**

## Mètode 2: Des de CLI

```bash
# Instal·la Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplega (des del directori per-quiz)
cd per-quiz
vercel

# Per producció
vercel --prod
```

## Mètode 3: Amb GitHub Actions (CI/CD)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm i -g pnpm
      - run: pnpm install
      - run: pnpm build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
```

## Estructura del desplegament

Vercel generarà:

```
.vercel/output/
├── config.json              # Rutes i config
├── static/                  # Assets estàtics
│   ├── _astro/              # JS/CSS optimitzats
│   ├── data/
│   │   └── per_data.json   # 1.13 MB de preguntes
│   └── favicon.svg
└── functions/
    └── _render.func/        # Serverless function
        └── ...
```

## URLs després del desplegament

- `https://[el-teu-domini].vercel.app/` - Home
- `https://[el-teu-domini].vercel.app/test/examen` - Llista d'exàmens
- `https://[el-teu-domini].vercel.app/test/aleatori` - Test aleatori
- `https://[el-teu-domini].vercel.app/admin` - **403 Forbidden** (només dev)

## Configuració important

### Variables d'entorn

| Variable | Descripció | Obligatori |
|----------|------------|------------|
| `PUBLIC_SUPABASE_URL` | URL del projecte Supabase | No (usa local si no) |
| `PUBLIC_SUPABASE_ANON_KEY` | Clau pública anon | No (usa local si no) |

### Per habilitar Supabase

1. Crea un projecte a [supabase.com](https://supabase.com)
2. Executa `supabase/migrations/001_schema.sql` al SQL Editor
3. Importa les dades: `pnpm seed` (des de local)
4. Configura les variables a Vercel
5. Redeploy

### Personalització de domini

Vercel et permet:
- Subdomini gratis: `https://perquiz.vercel.app`
- Domini personalitzat: configura'l a Settings → Domains

## Verificació post-deploy

1. ✅ Home carrega correctament
2. ✅ Tests funcionen (per ID, tema, aleatori)
3. ✅ Preguntes es mostren en CA/ES
4. ✅ LocalStorage guarda el progrés
5. ⚠️ Admin retorna 403 (correcte, només dev)

## Troubleshooting

### Build falla amb "EPERM: symlink"
- Això passa localment a Windows amb pnpm
- A Vercel (Linux) no passa
- Solució: `.npmrc` amb `node-linker=hoisted` (ja afegit)

### Les dades no es carreguen
- Comprova que `public/data/per_data.json` està al repo
- Comprova les variables d'entorn
- Mira els logs de la serverless function

### Cold starts lents
- Vercel escala automàticament
- Considera Vercel Pro per a millor rendiment

## Cost

- **Hobby (gratis)**: 100 GB bandwidth, 100 GB-h serverless execution
- **Pro ($20/mes)**: 1 TB bandwidth, 1000 GB-h serverless
- Per aquest projecte (~1.1 MB d'estàtics + algunes funcions), el pla gratuït és més que suficient.
