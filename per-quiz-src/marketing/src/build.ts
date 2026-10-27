// Genera en disco los ficheros de un post (slides y vídeo) a partir de su post.json.
import { writeFileSync, mkdtempSync, rmSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { questionById } from "./bank.ts";
import { postDir, savePost, type Post } from "./posts.ts";
import { FFMPEG, STORY, renderSlides, renderVideoFrames, type VideoFrame } from "./render.ts";
import { renderPromoFrames, renderPromoSlides } from "./render-promo.ts";

function encodeVideo(frames: VideoFrame[], out: string): void {
  const dir = mkdtempSync(join(tmpdir(), "perquiz-video-"));
  try {
    const list: string[] = [];
    frames.forEach((frame, i) => {
      const file = join(dir, `f${i}.png`);
      writeFileSync(file, frame.png);
      list.push(`file '${file}'`, `duration ${frame.seconds}`);
    });
    // El demuxer concat ignora la duración del último fichero si no se repite.
    list.push(`file '${join(dir, `f${frames.length - 1}.png`)}'`);
    writeFileSync(join(dir, "list.txt"), list.join("\n"));
    execFileSync(FFMPEG, [
      "-loglevel", "error", "-y",
      "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
      // Pista de audio en silencio: Instagram y TikTok aceptan mejor un MP4 con audio, y así se le puede poner música al subirlo.
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-vf", `scale=${STORY.width}:${STORY.height},fps=30,format=yuv420p`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "20",
      "-c:a", "aac", "-b:a", "96k", "-shortest",
      "-movflags", "+faststart",
      out,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function buildPost(post: Post): Promise<Post> {
  const dir = postDir(post.id);
  savePost(post);
  for (const f of readdirSync(dir)) if (/\.(png|mp4)$/.test(f)) unlinkSync(join(dir, f));

  const promo = post.kind === "promo" ? post.promo?.slides : undefined;
  const q = promo ? null : questionById(post.questionId);
  const slides = promo ? await renderPromoSlides(promo, post.lang) : await renderSlides(q!, post.lang, post.copy.explanation);
  post.files.slides = slides.map((png, i) => {
    const name = `slide-${i + 1}.png`;
    writeFileSync(join(dir, name), png);
    return name;
  });

  const frames = promo ? await renderPromoFrames(promo, post.lang) : await renderVideoFrames(q!, post.lang, post.copy.hook, post.copy.explanation);
  encodeVideo(frames, join(dir, "video.mp4"));
  post.files.video = "video.mp4";

  savePost(post);
  return post;
}
