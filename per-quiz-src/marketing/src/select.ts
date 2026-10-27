// Elige preguntas para la campaña: sin repetir, sin anuladas, que quepan en un slide y repartidas por tema.
import { bank, isAnnulled, type Question } from "./bank.ts";
import { config } from "./config.ts";
import { loadPosts } from "./posts.ts";

/**
 * Preguntas que se pueden publicar tal cual: cortas para leerlas en un slide o en 5 segundos de vídeo,
 * con las cuatro opciones completas y sin la conjunción catalana «i» colada en el texto castellano.
 */
function fitsSocial(q: Question): boolean {
  return (
    (config.topicWeights[q.topic] ?? 1) > 0 &&
    q.es.length <= 240 &&
    q.options.every((o) => o.es.trim() !== "" && o.es.length <= 110 && !/ i [a-záéíóú]/.test(o.es))
  );
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function pickQuestions(count: number): Question[] {
  const used = new Set(loadPosts().map((p) => p.questionId).filter(Boolean));
  const pool = bank().questions.filter((q) => !used.has(q.id) && !isAnnulled(q) && fitsSocial(q));
  const picked: Question[] = [];
  let lastTopic = loadPosts().filter((p) => p.kind !== "promo").at(-1)?.topic;

  while (picked.length < count) {
    const remaining = pool.filter((q) => !picked.includes(q));
    if (remaining.length === 0) break;
    const topics = [...new Set(remaining.map((q) => q.topic))];
    // Dos días seguidos del mismo tema solo si no queda otro.
    const candidates = topics.length > 1 ? topics.filter((t) => t !== lastTopic) : topics;
    const topic = weightedPick(candidates, (t) => config.topicWeights[t] ?? 1);
    const inTopic = remaining.filter((q) => q.topic === topic);
    const q = inTopic[Math.floor(Math.random() * inTopic.length)];
    picked.push(q);
    lastTopic = topic;
  }
  return picked;
}
