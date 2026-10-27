// Claude redacta la explicación de la respuesta y los textos de Instagram y TikTok de cada pregunta.
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { examLabel, imagePath, theory, topicName, type Lang, type Question } from "./bank.ts";
import { config } from "./config.ts";
import type { PostCopy } from "./posts.ts";

const CopySchema = z.object({
  answerCheck: z.object({
    agrees: z.boolean().describe("true si la respuesta oficial es correcta según la normativa vigente"),
    note: z.string().describe("Si no estás de acuerdo o hay matices, explica por qué en una o dos frases; si no, cadena vacía"),
  }),
  hook: z.string().describe("Gancho para el vídeo, máximo 45 caracteres"),
  explanation: z.string().describe("Por qué la respuesta oficial es la correcta, máximo 260 caracteres"),
  instagramCaption: z.string(),
  tiktokCaption: z.string(),
  hashtags: z.array(z.string()).describe("Entre 6 y 10 hashtags sin el símbolo #"),
});

const LANG_NAME: Record<Lang, string> = { es: "castellano", ca: "catalán" };

function system(lang: Lang): string {
  return `Eres el community manager de PER Quiz, una web para preparar el examen teórico del PER (Patrón de Embarcaciones de Recreo) con preguntas reales de los exámenes oficiales de Cataluña.

Cada día se publica una pregunta real del examen en Instagram (carrusel) y TikTok (vídeo corto). Tu trabajo es escribir los textos de una publicación, en ${LANG_NAME[lang]}.

Público: gente que se está sacando el PER o el PNB, o que se lo plantea; amantes del mar y la vela en España. Tono cercano y claro, como un buen instructor de escuela náutica: nada de jerga de marketing ni exceso de emojis (como mucho dos o tres por texto).

Reglas:
- La respuesta correcta es la oficial que te doy. Primero compruébala: si según el RIPA, el sistema de balizamiento IALA región A o la normativa española vigente no es correcta o es discutible, indícalo en answerCheck (la publicación la revisará una persona).
- La explicación tiene que enseñar algo: la regla o el truco para recordarla, no repetir el enunciado. Máximo 260 caracteres. Nada de inventar datos, porcentajes de aprobados ni artículos de la ley que no sepas con seguridad.
- El gancho del vídeo es una frase corta que invite a responder (máximo 45 caracteres).
- Caption de Instagram: empieza con un gancho que invite a deslizar o a comentar la letra, sin revelar la respuesta en la primera línea; después la explicación en dos o tres frases, y termina invitando a guardar el post para repasar. Sin enlaces (el enlace está en la bio). Máximo 900 caracteres.
- Caption de TikTok: una o dos frases que inviten a comentar la letra antes de que salga la respuesta. Máximo 150 caracteres.
- Hashtags relevantes para el público español del PER (por ejemplo PER, PNB, patrondeembarcaciones, nautica, vela, examenPER), mezclando generales y del tema.`;
}

function prompt(q: Question, lang: Lang): string {
  const options = q.options.map((o) => `${o.id.toUpperCase()}) ${o[lang]}`).join("\n");
  const notes = theory(q.topic, lang);
  return [
    `Tema: ${topicName(q.topic, lang)}`,
    `Origen: ${examLabel(q, lang)}`,
    q.image ? "La pregunta incluye la figura adjunta." : "",
    "",
    `Pregunta: ${q[lang]}`,
    options,
    "",
    `Respuesta oficial: ${q.answer.toUpperCase()}`,
    notes ? `\nTeoría del tema en la web (úsala como referencia):\n${notes}` : "",
  ].filter((line) => line !== "").join("\n");
}

let client: Anthropic | null = null;

export async function writeCopy(q: Question, lang: Lang): Promise<PostCopy> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  const img = imagePath(q);
  if (img) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/webp", data: readFileSync(img).toString("base64") },
    });
  }
  content.push({ type: "text", text: prompt(q, lang) });

  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: config.model,
    max_tokens: 16000,
    // Si un clasificador de seguridad rechaza la petición, la API la repite con otro modelo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(CopySchema) },
    system: system(lang),
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude rechazó la pregunta ${q.id}: ${response.stop_details?.explanation ?? "sin detalle"}`);
  }
  if (!response.parsed_output) {
    throw new Error(`Respuesta sin JSON válido para ${q.id} (stop_reason: ${response.stop_reason})`);
  }
  const copy = response.parsed_output;
  return { ...copy, hashtags: copy.hashtags.map((t) => t.replace(/^#/, "")) };
}

/** Textos de plantilla para generar sin IA: la explicación queda vacía para escribirla en la revisión. */
export function templateCopy(q: Question, lang: Lang): PostCopy {
  const es = lang === "es";
  return {
    hook: es ? "¿Aprobarías esta del PER?" : "Aprovaries aquesta del PER?",
    explanation: "",
    instagramCaption: es
      ? `Pregunta real del ${examLabel(q, lang).replace(/^E/, "e")} 🧭\n\n¿A, B, C o D? Deja tu respuesta en comentarios y desliza para ver la correcta.\n\nGuárdalo para repasar antes del examen.`
      : `Pregunta real de l’${examLabel(q, lang).replace(/^E/, "e")} 🧭\n\nA, B, C o D? Deixa la teva resposta als comentaris i llisca per veure la correcta.\n\nDesa-ho per repassar abans de l’examen.`,
    tiktokCaption: es ? "¿A, B, C o D? Comenta antes de que salga la respuesta 👇" : "A, B, C o D? Comenta abans que surti la resposta 👇",
    hashtags: ["PER", "PNB", "patrondeembarcaciones", "examenPER", "nautica", "vela", topicName(q.topic, "es").toLowerCase().replace(/[^a-záéíóúñ]/g, "")],
    answerCheck: { agrees: true, note: "" },
  };
}
