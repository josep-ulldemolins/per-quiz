// Cola de publicaciones: una carpeta por post en queue/ con post.json, los slides y el vídeo.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Lang } from "./bank.ts";
import { QUEUE_DIR } from "./paths.ts";

export type PostStatus = "pending" | "approved" | "rejected" | "published";

export interface PostCopy {
  /** Gancho corto para el vídeo («¿Sabrías qué marca es esta?»). */
  hook: string;
  /** Por qué la respuesta oficial es la correcta; va en el slide 2 y en el vídeo. */
  explanation: string;
  instagramCaption: string;
  tiktokCaption: string;
  hashtags: string[];
  /** La IA comprueba la respuesta oficial; si no está de acuerdo, el post sale marcado para revisar. */
  answerCheck: { agrees: boolean; note: string };
}

export interface Post {
  id: string;
  questionId: string;
  topic: string;
  lang: Lang;
  /** Fecha y hora local, «2026-11-03T19:00». */
  scheduledFor: string;
  status: PostStatus;
  copy: PostCopy;
  /** null si se generó sin IA (--no-ai): hay que escribir la explicación a mano. */
  ai: { model: string; generatedAt: string } | null;
  files: { slides: string[]; video: string | null };
  reviewNote: string;
  updatedAt: string;
}

export function postDir(id: string): string {
  return join(QUEUE_DIR, id);
}

export function loadPosts(): Post[] {
  if (!existsSync(QUEUE_DIR)) return [];
  return readdirSync(QUEUE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(QUEUE_DIR, d.name, "post.json")))
    .map((d) => loadPost(d.name))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export function loadPost(id: string): Post {
  return JSON.parse(readFileSync(join(postDir(id), "post.json"), "utf8")) as Post;
}

export function savePost(post: Post): void {
  mkdirSync(postDir(post.id), { recursive: true });
  post.updatedAt = new Date().toISOString();
  writeFileSync(join(postDir(post.id), "post.json"), JSON.stringify(post, null, 2) + "\n");
}

/** Texto final del post: caption + hashtags. */
export function fullCaption(post: Post, network: "instagram" | "tiktok"): string {
  const caption = network === "instagram" ? post.copy.instagramCaption : post.copy.tiktokCaption;
  const tags = post.copy.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return `${caption}\n\n${tags}`.trim();
}
