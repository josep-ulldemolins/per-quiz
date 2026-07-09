# 🚀 Deploy a Vercel - Guía Completa

Tu proyecto está listo para desplegar. Tienes **3 métodos** para hacerlo.

## ✅ Estado actual del proyecto
- ✅ Repositorio Git inicializado y conectado a GitHub
- ✅ Código pusheado a `https://github.com/josep-ulldemolins/per-quiz`
- ✅ `vercel.json` configurado para monorepo
- ✅ Build de producción verificado funcionando
- ✅ `.npmrc` configurado para evitar problemas de symlinks

---

## 🎯 Método 1: Conectar GitHub con Vercel (RECOMENDADO - 2 minutos)

Este es el método más fácil y permite **auto-deploy** en cada push.

### Pasos:

1. **Ve a** [vercel.com/new](https://vercel.com/new)

2. **Click "Import Git Repository"**

3. **Busca `josep-ulldemolins/per-quiz`** y click "Import"

4. **Configuración del proyecto** (Vercel debería detectarlo automáticamente):
   - **Framework Preset**: Astro
   - **Root Directory**: `./` (raíz del proyecto)
   - **Build Command**: `pnpm build` (detectado automáticamente)
   - **Output Directory**: `apps/web/.vercel/output` (detectado automáticamente)
   - **Install Command**: `pnpm install --frozen-lockfile` (detectado automáticamente)

5. **Variables de entorno** (opcional, sección "Environment Variables"):
   - Si quieres usar Supabase más adelante:
     - `PUBLIC_SUPABASE_URL` = tu URL de Supabase
     - `PUBLIC_SUPABASE_ANON_KEY` = tu clave anon
   - Si NO las pones, la app usará el JSON local (1.257 preguntas)

6. **Click "Deploy"** 🚀

7. **Espera 2-3 minutos** mientras Vercel:
   - Clona el repo
   - Instala dependencias con pnpm
   - Ejecuta el build
   - Despliega la serverless function
   - Te asigna una URL tipo `https://per-quiz-xxxx.vercel.app`

8. **¡Listo!** Tu app está en producción

### Auto-deploy
Después del primer deploy, cada `git push` a `master` desplegará automáticamente.

---

## 🎯 Método 2: Vercel CLI con token (5 minutos)

Si prefieres desplegar desde la terminal sin conectar GitHub.

### Pasos:

1. **Crear un token en Vercel**:
   - Ve a [vercel.com/account/tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Nombre: "per-quiz-cli" (o el que prefieras)
   - Scope: Full Access (o el que necesites)
   - Click "Create"
   - **Copia el token** (solo se muestra una vez)

2. **Ejecutar el script de deploy**:
   ```bash
   cd C:\Users\34610\Downloads\PER\per-quiz
   node scripts/deploy-vercel.mjs TU_TOKEN_AQUI
   ```

   O usando variable de entorno:
   ```bash
   set VERCEL_TOKEN=tu_token_aqui
   node scripts/deploy-vercel.mjs
   ```

3. **El script automáticamente**:
   - ✅ Verifica que el build funciona
   - ✅ Despliega a producción con `vercel deploy --prod`
   - ✅ Te muestra la URL

### Para deploys futuros:
```bash
vercel deploy --prod --token TU_TOKEN
```

---

## 🎯 Método 3: Deploy manual (drag & drop)

Si las otras opciones no funcionan:

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Click "Browse" o arrastra la carpeta `.vercel/output` 
3. Vercel subirá y desplegará los archivos

**Nota**: Este método puede tener problemas con el adapter de Vercel. Los métodos 1 o 2 son preferibles.

---

## 📋 Después del deploy

### Verificar que funciona:
```bash
# Tu URL será algo como: https://per-quiz-josep-ulldemolins.vercel.app
curl https://TU-URL.vercel.app/
curl https://TU-URL.vercel.app/test/examen
curl https://TU-URL.vercel.app/data/per_data.json | head -c 200
```

### Configurar dominio personalizado (opcional):
1. Ve a Settings → Domains en tu proyecto en Vercel
2. Añade tu dominio (ej: `perquiz.com`)
3. Configura los DNS según las instrucciones

### Habilitar analytics (opcional):
1. Settings → Analytics
2. Click "Enable"

---

## 🔍 Troubleshooting

### Si el build falla en Vercel:

1. **Error de symlinks en Windows**:
   - Ya está mitigado con `.npmrc` (node-linker=hoisted)
   - En Vercel (Linux) no debería pasar

2. **Error de pnpm version**:
   - Vercel usa una versión específica de pnpm
   - El `pnpm-lock.yaml` debería forzar la versión correcta
   - Si falla, contacta soporte

3. **Variables de entorno faltantes**:
   - El proyecto funciona sin Supabase
   - Solo necesitas las env vars si quieres usar Supabase

### Si el admin no carga:
- Es **normal** en producción (dev-only)
- En Vercel verás 403 Forbidden en `/admin` (correcto)

### Si las preguntas no cargan:
- Verifica que `apps/web/public/data/per_data.json` está en el repo
- Debe pesar ~1.13 MB
- Si falta, ejecuta: `node scripts/split-locales.mjs` y haz commit

---

## 📊 URLs después del deploy

Una vez desplegado, tu app tendrá estas rutas:

| URL | Descripción |
|-----|-------------|
| `/` | Home con 3 modos de test |
| `/test/examen` | Lista de 28 exámenes |
| `/test/examen/1` | Examen 25ABRIL-BCN v1 |
| `/test/tema` | Lista de 11 temas |
| `/test/tema/nomenclatura_nautica` | Test del tema |
| `/test/aleatori` | Test aleatorio |
| `/estadistiques` | Estadísticas (vacías sin Supabase) |
| `/data/per_data.json` | 1.13 MB de preguntas |
| `/admin` | 403 Forbidden (solo dev) |

---

## 💡 Recomendación

**Empieza con el Método 1** (conectar GitHub). Es el más rápido y te da auto-deploy gratis.

Si tienes problemas, prueba el **Método 2** (CLI con token).

**¿Necesitas ayuda con algún paso específico?**
