// npm run redraw -- [id ...]
// Vuelve a dibujar slides y vídeo de los posts indicados (o de todos los pendientes) con los textos de su post.json.
import { loadPost, loadPosts } from "./posts.ts";
import { buildPost } from "./build.ts";

const ids = process.argv.slice(2);
const posts = ids.length ? ids.map(loadPost) : loadPosts().filter((p) => p.status === "pending");

for (const post of posts) {
  await buildPost(post);
  console.log(`✓ ${post.id}${post.kind === "promo" || post.copy.explanation ? "" : "  (sin explicación)"}`);
}
