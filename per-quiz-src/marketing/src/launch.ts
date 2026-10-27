// npm run launch -- [--start 2026-10-28]
// Crea en queue/ los posts de presentación de la app (uno al día) a partir de las capturas de assets/screens/.
import { parseArgs } from "node:util";
import { config } from "./config.ts";
import { loadPosts, type Post, type PostCopy, type PromoSlide } from "./posts.ts";
import { buildPost } from "./build.ts";

interface Launch {
  key: string;
  slides: PromoSlide[];
  copy: Omit<PostCopy, "explanation" | "answerCheck">;
}

const TAGS = ["PER", "PNB", "patrondeembarcaciones", "examenPER", "nautica", "vela", "titulacionnautica"];

const LAUNCH: Launch[] = [
  {
    key: "presentacion",
    slides: [
      {
        type: "cover",
        eyebrow: "Muy pronto",
        title: "Prepara el PER con las preguntas reales del examen",
        subtitle: "921 preguntas de los exámenes de Catalunya de 2025 y 2026, para estudiar desde el móvil.",
        screen: "inicio",
      },
      {
        type: "screen",
        eyebrow: "Practica",
        title: "Como en el examen, pregunta a pregunta",
        text: "Con las figuras originales, en castellano o en catalán, y corrección al momento o al final.",
        screen: "test",
      },
      {
        type: "screen",
        eyebrow: "Simulacros",
        title: "Sabrás si hoy aprobarías",
        text: "45 preguntas con el reparto oficial por temas y los mismos límites de fallos.",
        screen: "resultado",
      },
      {
        type: "screen",
        eyebrow: "Estadísticas",
        title: "Ve directo a lo que te falla",
        text: "Tu acierto por tema, tu historial y tests con las preguntas que fallaste.",
        screen: "estadisticas",
      },
      { type: "cta" },
    ],
    copy: {
      hook: "Así es PER Quiz",
      instagramCaption:
        "¿Te vas a sacar el PER? Te presentamos PER Quiz ⚓\n\nUna web para preparar el examen teórico con las 921 preguntas reales que han salido en los exámenes de Catalunya de 2025 y 2026: simulacros con los criterios de aprobado oficiales, los exámenes tal como salieron, tests a medida con lo que fallas y estadísticas por tema. En castellano o en catalán.\n\nMuy pronto. Apúntate en el enlace de la bio para ser de los primeros en probarla, y síguenos: cada día subimos una pregunta real del examen.\n\nPER Quiz no es una web oficial: es una herramienta de estudio independiente.",
      tiktokCaption: "Te presentamos PER Quiz: las preguntas reales del examen del PER, para estudiar desde el móvil ⚓",
      hashtags: [...TAGS, "estudiar"],
    },
  },
  {
    key: "examen",
    slides: [
      {
        type: "cover",
        eyebrow: "El examen",
        title: "Así es el examen teórico del PER",
        subtitle: "Lo que conviene saber antes de presentarte: cuántas preguntas hay, cuántos fallos se permiten y dónde suspende la mayoría.",
      },
      {
        type: "points",
        eyebrow: "El examen",
        title: "45 preguntas tipo test",
        points: [
          { value: "45", label: "preguntas con cuatro opciones y una sola correcta" },
          { value: "11", label: "temas, de nomenclatura náutica a carta" },
          { value: "13", label: "fallos como máximo para aprobar" },
        ],
        note: "Las preguntas que dejes sin responder cuentan como fallo.",
      },
      {
        type: "points",
        eyebrow: "Ojo con esto",
        title: "Los mínimos que más suspenden",
        points: [
          { value: "2", label: "fallos como máximo en balizamiento (5 preguntas)" },
          { value: "5", label: "en el reglamento RIPA (10 preguntas)" },
          { value: "2", label: "en carta náutica (4 preguntas)" },
        ],
        note: "Puedes tener solo 3 fallos en todo el examen y suspender si los tres son de balizamiento.",
      },
      {
        type: "points",
        eyebrow: "PNB y complementaria",
        title: "¿Te presentas a una parte?",
        points: [
          { value: "27", label: "preguntas en el PNB (de la 1 a la 27), con 10 fallos como máximo" },
          { value: "18", label: "en la parte complementaria (de la 28 a la 45), con 3 fallos como máximo" },
        ],
        note: "El PNB mantiene los mínimos de balizamiento y RIPA, y la complementaria el de carta.",
      },
      {
        type: "screen",
        eyebrow: "PER Quiz",
        title: "Simulacros corregidos con estos criterios",
        text: "Elige PER, PNB o complementaria y sabrás al momento si habrías aprobado.",
        screen: "nuevo-test",
      },
      { type: "cta" },
    ],
    copy: {
      hook: "Así es el examen del PER",
      instagramCaption:
        "¿Sabes cuántos fallos te permite el examen del PER? 📋\n\nSon 45 preguntas tipo test y puedes fallar 13, pero hay mínimos por tema que suspenden a mucha gente: como mucho 2 fallos en balizamiento, 5 en RIPA y 2 en carta náutica. Y las preguntas en blanco cuentan como fallo.\n\nDesliza para ver también los criterios del PNB y de la parte complementaria (según las hojas de respuestas de los exámenes de Catalunya).\n\nGuárdalo y compártelo con quien se esté preparando el PER.",
      tiktokCaption: "45 preguntas, 13 fallos… y los mínimos que suspenden a casi todos. Así es el examen del PER 📋",
      hashtags: [...TAGS, "balizamiento", "RIPA"],
    },
  },
  {
    key: "a-medida",
    slides: [
      {
        type: "cover",
        eyebrow: "Estudia mejor",
        title: "No repitas lo que ya sabes",
        subtitle: "Tests a medida para dedicar el tiempo a las preguntas que de verdad te cuestan.",
        screen: "test",
      },
      {
        type: "points",
        eyebrow: "Tests a medida",
        title: "Elige qué practicar",
        points: [
          { value: "Temas", label: "los 11 del temario, juntos o por separado" },
          { value: "Falladas", label: "las que fallaste la última vez o las que más fallas" },
          { value: "Difíciles", label: "las que más falla todo el mundo" },
          { value: "Nuevas", label: "solo las que todavía no has visto" },
        ],
        note: "Con corrección al momento o al final, y con tiempo o sin él.",
      },
      {
        type: "screen",
        eyebrow: "Tu progreso",
        title: "Y mira cómo avanzas",
        text: "Aciertos por tema, tiempo de estudio y la nota de tus últimos tests frente al aprobado.",
        screen: "estadisticas",
      },
      { type: "cta" },
    ],
    copy: {
      hook: "Estudia lo que te falla",
      instagramCaption:
        "Hacer tests al azar una y otra vez no es la forma más rápida de aprobar el PER 🧭\n\nEn PER Quiz eliges qué practicar: un tema concreto, las preguntas que has fallado, las que más falla todo el mundo o solo las que aún no has visto. Y las estadísticas te dicen en qué tema estás flojo antes de que te lo diga el examen.\n\nMuy pronto. Apúntate en el enlace de la bio para probarla de los primeros.",
      tiktokCaption: "Deja de repetir las que ya sabes: tests con tus falladas, por tema o las más difíciles 🧭",
      hashtags: [...TAGS, "estudiar", "oposiciones"],
    },
  },
];

const { values } = parseArgs({ options: { start: { type: "string" } } });

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const day = values.start ? new Date(`${values.start}T12:00`) : new Date();
if (!values.start) day.setDate(day.getDate() + 1);
const existing = new Set(loadPosts().map((p) => p.id.replace(/^\d{4}-\d{2}-\d{2}-/, "")));

for (const item of LAUNCH) {
  if (existing.has(`app-${item.key}`)) {
    console.log(`· app-${item.key} ya está en la cola`);
    continue;
  }
  const date = isoDay(day);
  const post: Post = {
    id: `${date}-app-${item.key}`,
    kind: "promo",
    questionId: "",
    topic: "app",
    promo: { slides: item.slides },
    lang: "es",
    scheduledFor: `${date}T${config.postTime}`,
    status: "pending",
    copy: { ...item.copy, explanation: "", answerCheck: { agrees: true, note: "" } },
    ai: null,
    files: { slides: [], video: null },
    reviewNote: "",
    updatedAt: "",
  };
  await buildPost(post);
  console.log(`✓ ${post.id}`);
  day.setDate(day.getDate() + 1);
}
