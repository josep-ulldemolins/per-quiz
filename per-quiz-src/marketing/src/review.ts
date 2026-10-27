// npm run review -> http://localhost:8790
// Web local para revisar la cola: ver carrusel y vídeo, corregir textos, volver a dibujar y aprobar o rechazar.
import "./env.ts";
import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { questionById, topicName, examLabel } from "./bank.ts";
import { loadPosts, loadPost, savePost, fullCaption, postDir, type Post, type PostStatus } from "./posts.ts";
import { buildPost } from "./build.ts";
import { writeCopy } from "./ai.ts";
import { QUEUE_DIR, ROOT } from "./paths.ts";
import { config } from "./config.ts";

const PORT = Number(process.env.REVIEW_PORT ?? 8790);
const app = new Hono();

function view(post: Post) {
  const q = questionById(post.questionId);
  return {
    ...post,
    topicName: topicName(post.topic, post.lang),
    exam: examLabel(q, post.lang),
    question: q[post.lang],
    options: q.options.map((o) => ({ id: o.id, text: o[post.lang] })),
    answer: q.answer,
    captions: { instagram: fullCaption(post, "instagram"), tiktok: fullCaption(post, "tiktok") },
  };
}

function exists(id: string): boolean {
  return /^[\w-]+$/.test(id) && existsSync(join(postDir(id), "post.json"));
}

app.get("/", (c) => c.html(readFileSync(join(ROOT, "review", "index.html"), "utf8")));

app.use("/files/*", serveStatic({ root: relative(process.cwd(), QUEUE_DIR), rewriteRequestPath: (p) => p.replace(/^\/files/, "") }));

app.get("/api/posts", (c) => c.json(loadPosts().map(view)));

const STATUSES: PostStatus[] = ["pending", "approved", "rejected", "published"];

app.patch("/api/posts/:id", async (c) => {
  const id = c.req.param("id");
  if (!exists(id)) return c.json({ error: "No existe" }, 404);
  const post = loadPost(id);
  const body = await c.req.json<Partial<Post["copy"]> & { status?: PostStatus; reviewNote?: string; scheduledFor?: string }>();

  for (const key of ["hook", "explanation", "instagramCaption", "tiktokCaption"] as const) {
    if (typeof body[key] === "string") post.copy[key] = body[key].trim();
  }
  if (Array.isArray(body.hashtags)) post.copy.hashtags = body.hashtags.map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean);
  if (typeof body.reviewNote === "string") post.reviewNote = body.reviewNote;
  if (typeof body.scheduledFor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(body.scheduledFor)) post.scheduledFor = body.scheduledFor;
  if (body.status) {
    if (!STATUSES.includes(body.status)) return c.json({ error: "Estado no válido" }, 400);
    if (body.status === "approved" && !post.copy.explanation) {
      return c.json({ error: "Escribe la explicación antes de aprobar" }, 400);
    }
    post.status = body.status;
  }
  savePost(post);
  return c.json(view(post));
});

// Vuelve a dibujar slides y vídeo con los textos actuales (gancho y explicación salen en las imágenes).
app.post("/api/posts/:id/render", async (c) => {
  const id = c.req.param("id");
  if (!exists(id)) return c.json({ error: "No existe" }, 404);
  return c.json(view(await buildPost(loadPost(id))));
});

// Pide a Claude textos nuevos y vuelve a dibujar.
app.post("/api/posts/:id/regenerate", async (c) => {
  const id = c.req.param("id");
  if (!exists(id)) return c.json({ error: "No existe" }, 404);
  const post = loadPost(id);
  try {
    post.copy = await writeCopy(questionById(post.questionId), post.lang);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
  post.ai = { model: config.model, generatedAt: new Date().toISOString() };
  post.status = "pending";
  return c.json(view(await buildPost(post)));
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Revisión de la campaña en http://localhost:${PORT}`);
