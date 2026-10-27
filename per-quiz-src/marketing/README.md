# Campaña en redes (fase 1)

Genera publicaciones diarias para Instagram y TikTok a partir del banco de preguntas: elige una pregunta real,
Claude escribe la explicación y los textos, y se dibujan un carrusel (1080×1350) y un vídeo vertical (1080×1920).
Nada se publica solo: cada post queda en `queue/` pendiente de revisión.

```bash
cd marketing
npm install
echo 'ANTHROPIC_API_KEY=...' > .env # o exportarla, o `ant auth login`; .env no se sube a git
npm run generate                    # 7 posts, uno al día desde el siguiente día libre
npm run review                      # http://localhost:8790
```

## Generar

`npm run generate -- [opciones]`

| Opción | |
|---|---|
| `--count 14` | número de posts (por defecto 7) |
| `--start 2026-11-03` | primer día; si no, el siguiente al último post programado |
| `--lang ca` | idioma de la campaña (por defecto el de `src/config.ts`) |
| `--question <id>` | pregunta concreta del banco (se puede repetir) |
| `--no-ai` | sin Claude: textos de plantilla y explicación vacía, para escribirla en la revisión |

La selección no repite preguntas, descarta las anuladas y las demasiado largas para un slide, evita dos días
seguidos del mismo tema y da más peso a balizamiento, RIPA, carta y meteorología (`topicWeights` en `src/config.ts`).

Claude (`claude-opus-5-5`, con reintento automático en otro modelo si un filtro de seguridad rechaza la petición)
recibe la pregunta, las opciones, la respuesta oficial, la figura si la hay y el temario del tema cuando deja de
ser un esquema. Devuelve gancho, explicación, textos de Instagram y TikTok, hashtags y su opinión sobre la
respuesta oficial: si no está de acuerdo, el post aparece marcado en la revisión.

### Sin créditos de API: textos escritos en una sesión de Claude Code

La suscripción Pro de Claude no da saldo para la API. Mientras tanto, cada semana:

1. `npm run generate -- --no-ai` genera los posts con imágenes y textos de plantilla.
2. En una sesión de Claude Code se le pide que escriba el `copy` de cada `queue/<id>/post.json` (mismos campos y límites que pide `src/ai.ts`) y que compruebe la respuesta oficial.
3. `npm run redraw` vuelve a dibujar los pendientes con esos textos (o `npm run redraw -- <id>` uno concreto).
4. Revisión normal con `npm run review`.

## Revisar

En `npm run review` cada post muestra los tres slides, el vídeo y los textos editables:

- **Guardar y volver a dibujar**: el gancho y la explicación salen en las imágenes, así que hay que redibujar al cambiarlos (al aprobar se hace solo si han cambiado).
- **Regenerar con IA**: textos nuevos de Claude.
- **Guardar y aprobar** / **Rechazar**. No se puede aprobar sin explicación.
- **Copiar con hashtags**: texto listo para pegar al subir el post a mano.

## Ficheros

```
config.ts   cuenta, hora de publicación, llamada a la acción, pesos por tema, modelo
select.ts   elección de preguntas
ai.ts       textos con Claude (y plantilla sin IA)
render.ts   slides y fotogramas (Satori + resvg, colores y fuentes de la web)
build.ts    escribe los PNG y codifica el MP4 con ffmpeg (ffmpeg-static, sin instalar nada)
review.ts   servidor de la revisión; la página está en review/index.html
queue/      un directorio por post: post.json, slide-1..3.png, video.mp4 (no se sube a git)
```

El vídeo lleva una pista de audio en silencio para poder añadirle música de la propia red al subirlo.

## Siguiente fase

Publicar automáticamente los posts aprobados: API de Instagram (cuenta profesional + app de Meta; las imágenes
tienen que estar en una URL pública) y Content Posting API de TikTok (publica solo en privado hasta que TikTok
audita la app). Hasta entonces, se suben a mano o con Metricool/Buffer desde los ficheros de `queue/`.
