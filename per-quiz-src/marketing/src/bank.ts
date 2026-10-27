// Banco de preguntas y temario de la app, leídos tal cual desde el repo.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./paths.ts";

export type Lang = "es" | "ca";

export interface Option { id: string; es: string; ca: string }
export interface Question {
  id: string;
  topic: string;
  es: string;
  ca: string;
  options: Option[];
  answer: string;
  image: string | null;
  sources: string[];
}
export interface Topic { id: string; name: string; from: number; to: number }
export interface Exam { id: string; year: number; month: number; place: string; version: number; annulled: number[] }

interface BankFile { topics: Topic[]; exams: Exam[]; questions: Question[] }

export const BANK_DIR = join(ROOT, "..", "web", "data");
const TEMARIO_DIR = join(ROOT, "..", "app", "content", "temario");

let cached: BankFile | null = null;
export function bank(): BankFile {
  cached ??= JSON.parse(readFileSync(join(BANK_DIR, "questions.json"), "utf8")) as BankFile;
  return cached;
}

export function questionById(id: string): Question {
  const q = bank().questions.find((q) => q.id === id);
  if (!q) throw new Error(`Pregunta ${id} no encontrada en el banco`);
  return q;
}

export function imagePath(q: Question): string | null {
  return q.image ? join(BANK_DIR, "img", q.image) : null;
}

const TOPIC_CA: Record<string, string> = {
  nomenclatura: "Nomenclatura nàutica",
  amarre: "Amarratge i fondeig",
  seguridad: "Seguretat",
  legislacion: "Legislació",
  balizamiento: "Abalisament",
  ripa: "Reglament (RIPA)",
  maniobra: "Maniobra",
  emergencias: "Emergències",
  meteorologia: "Meteorologia",
  navegacion: "Navegació",
  carta: "Carta nàutica",
};

export function topicName(id: string, lang: Lang): string {
  if (lang === "ca") return TOPIC_CA[id] ?? id;
  return bank().topics.find((t) => t.id === id)?.name ?? id;
}

const MONTHS: Record<Lang, string[]> = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  ca: ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"],
};

// "2025-02-bcn-1#8" -> examen y número de pregunta
function parseSource(source: string): { exam: Exam | undefined; number: number } {
  const [examId, n] = source.split("#");
  return { exam: bank().exams.find((e) => e.id === examId), number: Number(n) };
}

/** «Examen de abril de 2025 · Barcelona» de la primera convocatoria en que salió. */
export function examLabel(q: Question, lang: Lang): string {
  const { exam } = parseSource(q.sources[0]);
  if (!exam) return "Examen oficial";
  const month = MONTHS[lang][exam.month - 1];
  const of = lang === "ca" && /^[aeiou]/.test(month) ? "d’" : "de ";
  return `Examen ${of}${month} de ${exam.year} · ${exam.place}`;
}

/** Anulada en alguna de las convocatorias en que salió: mejor no publicarla. */
export function isAnnulled(q: Question): boolean {
  return q.sources.some((s) => {
    const { exam, number } = parseSource(s);
    return exam?.annulled.includes(number) ?? false;
  });
}

/** Texto del temario del tema si ya no es un esquema vacío (status placeholder). */
export function theory(topic: string, lang: Lang): string | null {
  const file = join(TEMARIO_DIR, `${topic}.${lang}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  if (/^status:\s*placeholder/m.test(text)) return null;
  return text;
}
