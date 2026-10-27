// npm run generate -- [--count 7] [--start 2026-11-03] [--lang es|ca] [--question <id>] [--no-ai]
// Elige preguntas, pide los textos a Claude, dibuja carrusel y vídeo y deja cada post en queue/ pendiente de revisión.
import "./env.ts";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { questionById, type Lang, type Question } from "./bank.ts";
import { config } from "./config.ts";
import { loadPosts, type Post } from "./posts.ts";
import { pickQuestions } from "./select.ts";
import { templateCopy, writeCopy } from "./ai.ts";
import { buildPost } from "./build.ts";

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "7" },
    start: { type: "string" },
    lang: { type: "string", default: config.lang },
    question: { type: "string", multiple: true },
    "no-ai": { type: "boolean", default: false },
  },
});

const lang = values.lang as Lang;
if (lang !== "es" && lang !== "ca") throw new Error("--lang tiene que ser es o ca");
const useAi = !values["no-ai"];

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Primer día libre: el que se pida, o el siguiente al último post programado, o mañana. */
function firstDay(): Date {
  if (values.start) return new Date(`${values.start}T12:00`);
  const last = loadPosts().filter((p) => p.status !== "rejected").at(-1);
  const d = last ? new Date(`${last.scheduledFor.slice(0, 10)}T12:00`) : new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

const questions: Question[] = values.question?.length ? values.question.map(questionById) : pickQuestions(Number(values.count));
const day = firstDay();
let failed = 0;

for (const q of questions) {
  const date = isoDay(day);
  const label = `${date}  ${q.id} (${q.topic})`;
  try {
    const copy = useAi ? await writeCopy(q, lang) : templateCopy(q, lang);
    const post: Post = {
      id: `${date}-${q.id}`,
      questionId: q.id,
      topic: q.topic,
      lang,
      scheduledFor: `${date}T${config.postTime}`,
      status: "pending",
      copy,
      ai: useAi ? { model: config.model, generatedAt: new Date().toISOString() } : null,
      files: { slides: [], video: null },
      reviewNote: "",
      updatedAt: "",
    };
    await buildPost(post);
    const flag = copy.answerCheck.agrees ? "" : "  ⚠ la IA duda de la respuesta oficial";
    console.log(`✓ ${label}${flag}`);
    day.setDate(day.getDate() + 1);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || (err instanceof Error && /api key|apiKey|authToken/i.test(err.message))) {
      console.error("Sin credenciales de Claude: pon ANTHROPIC_API_KEY en el entorno o genera sin IA con --no-ai.");
      process.exit(1);
    }
    if (err instanceof Error && /credit balance/i.test(err.message)) {
      console.error("La cuenta de la API de Anthropic no tiene saldo: compra créditos en console.anthropic.com (Plans & Billing) o genera sin IA con --no-ai.");
      process.exit(1);
    }
    failed++;
    console.error(`✗ ${label}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${questions.length - failed} posts en queue/. Revísalos con: npm run review`);
if (failed) process.exitCode = 1;
