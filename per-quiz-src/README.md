# PER Quiz

Web para practicar el examen teórico del **PER** (Patrón de Embarcaciones de Recreo) con preguntas reales de los exámenes oficiales de la Escola de Capacitació Nauticopesquera de Catalunya, al estilo de los tests del carnet de conducir.

- **921 preguntas únicas** extraídas de 28 exámenes (14 convocatorias de 2025–2026, dos versiones cada una).
- **Simulacros** de PER (45 preguntas), PNB (27) y parte complementaria (18) con el reparto oficial por temas y los criterios de aprobado de la hoja de respuestas.
- **Exámenes reales** tal como salieron en cada convocatoria.
- **Tests a medida**: por temas, no vistas, falladas, las que más fallas, las más difíciles para todos, marcadas o elegidas a mano en el banco; corrección al momento o al final, con o sin tiempo.
- **Cuentas de usuario**: cada respuesta se guarda en el servidor, con estadísticas por tema, historial y tests que se pueden retomar.
- Interfaz y preguntas en **castellano o catalán**, tema **claro u oscuro**, y figuras recortadas del PDF original.

## Criterios de aprobado

| Examen | Preguntas | Errores máx. | Balizamiento | RIPA | Carta |
|---|---|---|---|---|---|
| PER | 1–45 | 13 | 2 | 5 | 2 |
| PNB | 1–27 | 10 | 2 | 5 | – |
| Complementaria | 28–45 | 3 | – | – | 2 |

Las preguntas sin responder cuentan como error.

## Estructura

```
examenes/            PDF originales (la última página es la hoja con las respuestas en rojo)
scripts/
  extract.py         PDF -> build/questions.json + build/img/ (todas las preguntas, por examen)
  build_bank.py      une las repetidas -> web/data/questions.json + web/data/img/
  fix_bank.py        repara cabeceras de tema y etiquetas de color coladas en el texto
web/data/            banco de preguntas generado
app/                 la aplicación
  server/            API (Node + Hono + SQLite de Node): cuentas, tests, respuestas, estadísticas
  shared/exam.ts     forma del banco y criterios oficiales de aprobado (cliente y servidor)
  src/               interfaz (React + Vite), en castellano y catalán, tema claro y oscuro
  content/temario/   teoría de cada tema en Markdown (<tema>.<es|ca>.md) e imágenes en img/
marketing/           campaña en Instagram y TikTok generada desde el banco, con revisión antes de publicar (ver su README)
```

## La aplicación

Necesita Node 24 o superior (usa `node:sqlite` y ejecuta TypeScript sin compilar).

```bash
cd app
npm install
npm run dev          # API en :8787 y web en http://localhost:5173
```

Para producción:

```bash
npm run build
npm start            # sirve la web y la API en :8787 (API_PORT para cambiarlo)
```

Para publicarla en un VPS con Docker y HTTPS, sigue [deploy/README.md](../deploy/README.md).

La base de datos se crea en `app/data/per-quiz.db` (`DB_PATH` para cambiarla). Cada usuario guarda sus tests,
respuestas y preguntas marcadas. La dificultad «para todos» sale del porcentaje de fallo de todos los usuarios
en cada pregunta, a partir de 3 respuestas.

Usuario de prueba de la base de datos local de desarrollo: `demo@per-quiz.test` / `demo-per-2026`.

## Temario

Cada uno de los 11 temas tiene una página de teoría en `/temario/<tema>`, con tu progreso en el tema, un botón
para practicarlo y un enlace a sus preguntas del banco (`/preguntas?tema=<tema>`). El texto vive en
`app/content/temario/` y se añade sin tocar código: Vite recoge todos los ficheros al arrancar o compilar.

- **Un fichero por tema e idioma**: `<tema>.es.md` y `<tema>.ca.md`, con los ids de `web/data/questions.json`
  (`nomenclatura`, `amarre`, `seguridad`, `legislacion`, `balizamiento`, `ripa`, `maniobra`, `emergencias`,
  `meteorologia`, `navegacion`, `carta`). Si falta un idioma se muestra el otro con un aviso.
- **Cabecera** entre `---` con el estado del texto, la fecha de revisión y las fuentes (`source` se puede repetir):

  ```markdown
  ---
  status: draft          # placeholder | draft | reviewed
  updated: 2026-11-02    # opcional, fecha de la última revisión
  source: Nombre de la norma o del manual, artículo o página
  ---
  ```

  `placeholder` es un esquema sin contenido y `draft` un texto sin revisar; los dos se muestran con un aviso
  para que nadie estudie con ellos. Solo `reviewed` se publica sin aviso, y solo cuando el texto está
  contrastado con las fuentes que cita. Hoy todos los temas son `placeholder`.
- **Markdown admitido**: `##`, `###` y `####` (el título de la página es el nombre del tema; cada `##` entra en
  el índice lateral «En este tema»), párrafos, listas `-` y `1.` (un nivel; las líneas sangradas continúan el
  elemento), citas `>` (se ven como un recuadro destacado), tablas con `|`, separadores `---`, **negrita**,
  *cursiva*, `código` y enlaces. Los enlaces que empiezan por `/` navegan dentro de la app
  (p. ej. `[preguntas de RIPA](/preguntas?tema=ripa)`); el resto se abren en otra pestaña. No se admite HTML.
- **Imágenes**: se guardan en `app/content/temario/img/` y se enlazan como `![Pie de figura](img/nombre.webp)`.
  Una imagen sola en un párrafo se muestra como figura con el texto alternativo de pie. También se pueden usar
  las figuras del banco con su ruta absoluta (`/img/<fichero>.webp`).

El lector de Markdown está en `app/src/markdown.tsx` y la carga de ficheros en `app/src/theory.ts`.

## Regenerar las preguntas

Al añadir nuevos PDF a `examenes/` (mismo formato y nombre `AAMES-LUGAR.pdf` / `AAMES-LUGAR2.pdf`):

```bash
pip install -r scripts/requirements.txt
python3 scripts/extract.py      # examenes/ -> build/
python3 scripts/build_bank.py   # build/ -> web/data/
python3 scripts/fix_bank.py     # limpieza final (se puede repetir)
```

`extract.py` muestra al final un informe por examen (preguntas que faltan o con un número de opciones distinto de 4).

### Cómo funciona la extracción

- Se descarta la marca de agua (texto rotado) y la cabecera/pie de cada página.
- Cada pregunta y opción viene en catalán y castellano separadas por `/`; se separan en `ca` y `es`.
- La respuesta correcta es la casilla rellena de rojo en la última página. Si las cuatro están en rojo, la pregunta está **anulada** y se excluye.
- Las figuras (imágenes y dibujos vectoriales en la zona de la pregunta) se recortan sin marca de agua en `.webp`.
- Las preguntas repetidas entre convocatorias (mismo texto, mismas opciones y misma figura) se unen en una sola, guardando en `sources` dónde ha aparecido. Si las plantillas oficiales no coinciden en la respuesta, se toma la mayoritaria y se marca con `disputed`.

## Formato de `web/data/questions.json`

```json
{
  "topics": [{ "id": "ripa", "name": "Reglamento (RIPA)", "from": 18, "to": 27 }],
  "exams":  [{ "id": "2026-06-bcn-1", "file": "26JUNY-BCN.pdf", "year": 2026, "month": 6, "place": "Barcelona", "version": 1, "annulled": [] }],
  "questions": [{
    "id": "2026-06-bcn-1-18", "topic": "ripa",
    "es": "…", "ca": "…",
    "options": [{ "id": "a", "es": "…", "ca": "…" }],
    "answer": "c", "image": null,
    "sources": ["2026-06-bcn-1#18"]
  }]
}
```

Herramienta de estudio no oficial. Los exámenes son propiedad de la Generalitat de Catalunya.
