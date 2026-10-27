// npm run screenshots   (con la app en marcha: cd app && npm run dev)
// Capturas de la app en formato móvil para los posts de presentación, con un usuario de prueba propio en la
// base de datos local de desarrollo. Usa el Chrome instalado (puppeteer-core no descarga navegadores).
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { bank, type Question } from "./bank.ts";
import { ROOT } from "./paths.ts";

const APP = process.env.APP_URL ?? "http://localhost:5173";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const SCREENS_DIR = join(ROOT, "assets", "screens");

// Cuenta de prueba solo para la base de datos local de desarrollo.
const USER = { name: "Laura", email: "marketing@per-quiz.test", password: "marketing-per-2026", lang: "es" };

let cookie = "";
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${APP}/api${path}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function shuffle<T>(items: T[]): T[] {
  return items.map((v) => [Math.random(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

/** Preguntas de un simulacro de PER con el reparto oficial por temas. */
function simulation(): Question[] {
  const { topics, questions } = bank();
  return topics.flatMap((t) => shuffle(questions.filter((q) => q.topic === t.id)).slice(0, t.to - t.from + 1));
}

/** Responde bien la proporción pedida (y mal el resto) y, si se pide, termina el test. */
async function play(kind: string, title: string, qs: Question[], rightRate: number, finish: boolean, paper: string | null = "per") {
  const attempt = await api<{ id: string }>("POST", "/attempts", {
    kind, paper, title, mode: "practice", questionIds: qs.map((q) => q.id), config: paper ? { paper } : {},
  });
  for (const q of qs) {
    const right = Math.random() < rightRate;
    const choice = right ? q.answer : q.options.find((o) => o.id !== q.answer)!.id;
    await api("PUT", `/attempts/${attempt.id}/answers/${q.id}`, { choice, elapsed: 60 });
  }
  if (finish) await api("POST", `/attempts/${attempt.id}/finish`, { elapsed: 45 * 60 * 0.8 });
  return attempt.id;
}

async function seed(): Promise<{ resultId: string; quizId: string }> {
  try {
    await api("POST", "/auth/login", { email: USER.email, password: USER.password });
  } catch {
    await api("POST", "/auth/register", USER);
  }
  await api("PATCH", "/me", { lang: "es", qLang: "es", theme: "light" });
  // Historial creíble: un simulacro suspendido, práctica por temas y un simulacro aprobado al final.
  const attempts = await api<{ id: string; kind: string }[]>("GET", "/attempts");
  if (attempts.length === 0) {
    await play("simulation", "Simulacro · PER", simulation(), 0.62, true);
    const { questions } = bank();
    for (const topic of ["balizamiento", "ripa", "meteorologia", "seguridad", "nomenclatura"]) {
      await play("custom", `Práctica · ${topic}`, shuffle(questions.filter((q) => q.topic === topic)).slice(0, 20), 0.8, true, null);
    }
  }
  const resultId = await play("simulation", "Simulacro · PER", simulation(), 0.9, true);
  // Test a medio hacer con una pregunta de balizamiento con figura como siguiente pregunta.
  const withFigure = bank().questions.filter((q) => q.topic === "balizamiento" && q.image);
  const quizQs = [...shuffle(bank().questions.filter((q) => q.topic === "balizamiento" && !q.image)).slice(0, 6), ...shuffle(withFigure).slice(0, 4)];
  const quizId = await play("custom", "Práctica · Balizamiento", quizQs.slice(0, 6), 0.85, false, null);
  return { resultId, quizId };
}

const { resultId, quizId } = await seed();
mkdirSync(SCREENS_DIR, { recursive: true });

if (!existsSync(CHROME)) throw new Error(`No encuentro Chrome en ${CHROME} (usa CHROME_PATH)`);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  const [name, value] = cookie.split("=");
  await page.setCookie({ name, value, url: APP });

  const shots: [string, string][] = [
    ["inicio", "/"],
    ["test", `/test/${quizId}`],
    ["resultado", `/test/${resultId}/resultado`],
    ["estadisticas", "/estadisticas"],
    ["nuevo-test", "/test/nuevo"],
  ];
  for (const [file, path] of shots) {
    await page.goto(`${APP}${path}`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: join(SCREENS_DIR, `${file}.png`) as `${string}.png` });
    console.log(`✓ assets/screens/${file}.png`);
  }
} finally {
  await browser.close();
}
