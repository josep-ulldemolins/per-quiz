// Dibuja los slides del carrusel y los fotogramas del vídeo con Satori (layout flex -> SVG) y resvg (SVG -> PNG).
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { examLabel, imagePath, topicName, type Lang, type Question } from "./bank.ts";
import { config } from "./config.ts";

const require = createRequire(import.meta.url);
export const FFMPEG: string = require("ffmpeg-static");

// Colores de la web (app/src/styles.css).
const C = {
  ground: "#ffffff",
  surface: "#f2f5f6",
  border: "#e2e8ea",
  text: "#182022",
  muted: "#5a6569",
  faint: "#8a9599",
  accent: "#1b6e66",
  accentSoft: "#e2f0ee",
  deep: "#0f3d39",
};

function font(pkg: string, file: string): Buffer {
  return readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`));
}
const FONTS = [
  { name: "Sans", data: font("instrument-sans", "instrument-sans-latin-400-normal.woff"), weight: 400 as const },
  { name: "Sans", data: font("instrument-sans", "instrument-sans-latin-500-normal.woff"), weight: 500 as const },
  { name: "Sans", data: font("instrument-sans", "instrument-sans-latin-600-normal.woff"), weight: 600 as const },
  { name: "Serif", data: font("instrument-serif", "instrument-serif-latin-400-normal.woff"), weight: 400 as const },
];

// Nodo mínimo al estilo de React que entiende Satori, para no necesitar JSX.
type Style = Record<string, string | number>;
interface El { type: string; props: { style?: Style; children?: Child | Child[]; src?: string; width?: number; height?: number } }
type Child = El | string | null | false;
function h(type: string, style: Style, ...children: Child[]): El {
  return { type, props: { style: { display: "flex", boxSizing: "border-box", ...style }, children: children.filter((c) => c !== null && c !== false) } };
}

async function toPng(node: El, width: number, height: number): Promise<Buffer> {
  const svg = await satori(node as never, { width, height, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
}

// Las figuras del banco son WebP; Satori solo dibuja PNG/JPEG, así que se convierten con ffmpeg.
const figureCache = new Map<string, { src: string; width: number; height: number }>();
function figure(q: Question): { src: string; width: number; height: number } | null {
  const file = imagePath(q);
  if (!file) return null;
  const hit = figureCache.get(file);
  if (hit) return hit;
  const dir = mkdtempSync(join(tmpdir(), "perquiz-"));
  try {
    const out = join(dir, "fig.png");
    execFileSync(FFMPEG, ["-loglevel", "error", "-i", file, out]);
    const png = readFileSync(out);
    // Ancho y alto en la cabecera IHDR del PNG.
    const result = { src: `data:image/png;base64,${png.toString("base64")}`, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    figureCache.set(file, result);
    return result;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const UI = {
  es: { real: "Pregunta real", swipe: "¿Cuál es la correcta? Desliza para verla", why: "Por qué", answer: "Respuesta correcta", comment: "Comenta tu respuesta", pending: "Explicación pendiente de escribir" },
  ca: { real: "Pregunta real", swipe: "Quina és la correcta? Llisca per veure-la", why: "Per què", answer: "Resposta correcta", comment: "Comenta la teva resposta", pending: "Explicació pendent d’escriure" },
};

/** Tamaño de letra del enunciado según lo largo que es y el espacio que queda. */
function questionSize(q: Question, lang: Lang, roomy: boolean, hasFigure: boolean): number {
  const len = q[lang].length;
  let size = len < 90 ? 60 : len < 150 ? 52 : len < 200 ? 46 : 42;
  if (hasFigure) size -= 8;
  return roomy ? size + 6 : size;
}

interface CardOptions {
  lang: Lang;
  width: number;
  height: number;
  /** Marca la respuesta correcta y apaga el resto. */
  reveal: boolean;
  explanation?: string;
  /** Segundos que quedan en la cuenta atrás del vídeo. */
  countdown?: number;
  /** Frase grande arriba (vídeo). */
  hook?: string;
  footer?: string;
}

function card(q: Question, o: CardOptions): El {
  const ui = UI[o.lang];
  const vertical = o.height > o.width * 1.5;
  const withWhy = o.reveal && o.explanation !== undefined;
  // En el vídeo la pregunta ya se ha visto: el fotograma de la explicación deja solo la respuesta correcta para que quepa.
  const compact = vertical && withWhy;
  const fig = compact ? null : figure(q);
  const pad = 72;
  const qSize = questionSize(q, o.lang, vertical, !!fig) - (withWhy && !vertical ? 6 : 0);
  const optSize = Math.round(qSize * (vertical ? 0.78 : 0.62));
  const figMaxH = vertical ? (withWhy ? 360 : 520) : withWhy ? 220 : 340;
  const figMaxW = o.width - pad * 2;
  const figScale = fig ? Math.min(figMaxW / fig.width, figMaxH / fig.height, 2.5) : 0;

  const option = (opt: Question["options"][number]) => {
    const correct = opt.id === q.answer;
    const lit = o.reveal && correct;
    const dim = o.reveal && !correct;
    return h(
      "div",
      {
        alignItems: "center",
        gap: 24,
        padding: withWhy && !vertical ? "14px 24px" : "20px 28px",
        borderRadius: 22,
        background: lit ? C.accent : C.ground,
        border: `2px solid ${lit ? C.accent : C.border}`,
        opacity: dim ? 0.45 : 1,
      },
      h(
        "div",
        {
          width: optSize * 1.7,
          height: optSize * 1.7,
          flexShrink: 0,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          background: lit ? "#ffffff" : C.accentSoft,
          color: C.accent,
          fontSize: optSize,
          fontWeight: 600,
        },
        opt.id.toUpperCase(),
      ),
      h("div", { flex: 1, fontSize: optSize, lineHeight: 1.3, fontWeight: 500, color: lit ? "#ffffff" : C.text }, opt[o.lang]),
    );
  };

  return h(
    "div",
    { width: o.width, height: o.height, flexDirection: "column", background: C.surface, padding: pad, fontFamily: "Sans", color: C.text },
    // Cabecera: cuenta y tema
    h(
      "div",
      { justifyContent: "space-between", alignItems: "center" },
      h("div", { fontSize: 30, fontWeight: 600, color: C.accent }, config.handle),
      h("div", { fontSize: 26, fontWeight: 600, color: C.accent, background: C.accentSoft, padding: "10px 24px", borderRadius: 999 }, topicName(q.topic, o.lang)),
    ),
    o.hook ? h("div", { marginTop: 56, fontFamily: "Serif", fontSize: 92, lineHeight: 1.05, color: C.deep }, o.hook) : null,
    h("div", { marginTop: o.hook ? 36 : 48, fontSize: 26, color: C.muted, fontWeight: 500 }, `${ui.real} · ${examLabel(q, o.lang)}`),
    h("div", { marginTop: 18, fontSize: qSize, lineHeight: 1.18, fontWeight: 600, letterSpacing: "-0.01em" }, q[o.lang]),
    fig
      ? h(
          "div",
          { marginTop: 28, justifyContent: "center" },
          { type: "img", props: { src: fig.src, width: Math.round(fig.width * figScale), height: Math.round(fig.height * figScale), style: { borderRadius: 16 } } },
        )
      : null,
    h(
      "div",
      { flexDirection: "column", gap: withWhy ? 12 : 16, marginTop: withWhy ? 28 : 36 },
      ...q.options.filter((opt) => !compact || opt.id === q.answer).map(option),
    ),
    withWhy
      ? h(
          "div",
          { marginTop: 28, flexDirection: "column", gap: 8, padding: "24px 28px", borderRadius: 22, background: C.ground, borderLeft: `8px solid ${C.accent}` },
          h("div", { fontFamily: "Serif", fontSize: compact ? 60 : 40, color: C.accent }, ui.why),
          h("div", { fontSize: compact ? 50 : 30, lineHeight: 1.35, color: o.explanation ? C.text : C.faint }, o.explanation || ui.pending),
        )
      : null,
    h("div", { flex: 1 }),
    o.countdown !== undefined
      ? h(
          "div",
          { justifyContent: "center", marginBottom: 40 },
          h(
            "div",
            { width: 200, height: 200, borderRadius: 999, border: `10px solid ${C.accent}`, alignItems: "center", justifyContent: "center", fontSize: 110, fontWeight: 600, color: C.accent },
            String(o.countdown),
          ),
        )
      : null,
    o.footer ? h("div", { justifyContent: "center", fontSize: 32, fontWeight: 600, color: C.accent }, o.footer) : null,
  );
}

function ctaCard(lang: Lang, width: number, height: number): El {
  const cta = config.cta[lang];
  return h(
    "div",
    { width, height, flexDirection: "column", justifyContent: "center", padding: 96, background: C.deep, color: "#ffffff", fontFamily: "Sans" },
    h("div", { fontSize: 34, fontWeight: 600, color: "#9fcdc6" }, config.handle),
    h("div", { marginTop: 40, fontFamily: "Serif", fontSize: 104, lineHeight: 1.02 }, cta.title),
    h("div", { marginTop: 36, fontSize: 40, lineHeight: 1.35, color: "#cfe3e0" }, cta.subtitle),
    h(
      "div",
      { marginTop: 64 },
      h("div", { fontSize: 36, fontWeight: 600, background: "#ffffff", color: C.deep, padding: "22px 40px", borderRadius: 999 }, cta.action),
    ),
  );
}

const FEED = { width: 1080, height: 1350 };
export const STORY = { width: 1080, height: 1920 };

/** Carrusel de Instagram: pregunta, respuesta con explicación y llamada a la acción. */
export async function renderSlides(q: Question, lang: Lang, explanation: string): Promise<Buffer[]> {
  const ui = UI[lang];
  return Promise.all([
    toPng(card(q, { lang, ...FEED, reveal: false, footer: ui.swipe }), FEED.width, FEED.height),
    toPng(card(q, { lang, ...FEED, reveal: true, explanation }), FEED.width, FEED.height),
    toPng(ctaCard(lang, FEED.width, FEED.height), FEED.width, FEED.height),
  ]);
}

export interface VideoFrame { png: Buffer; seconds: number }

/** Fotogramas del vídeo vertical: pregunta con cuenta atrás, respuesta, explicación y llamada a la acción. */
export async function renderVideoFrames(q: Question, lang: Lang, hook: string, explanation: string): Promise<VideoFrame[]> {
  const ui = UI[lang];
  const { width, height } = STORY;
  const frames: VideoFrame[] = [];
  // Primer segundo y medio para leer el enunciado antes de que empiece la cuenta atrás.
  frames.push({ png: await toPng(card(q, { lang, width, height, reveal: false, hook, footer: ui.comment }), width, height), seconds: 2 });
  for (let n = 5; n >= 1; n--) {
    frames.push({ png: await toPng(card(q, { lang, width, height, reveal: false, hook, countdown: n }), width, height), seconds: 1 });
  }
  frames.push({ png: await toPng(card(q, { lang, width, height, reveal: true, hook: ui.answer }), width, height), seconds: 2 });
  if (explanation) {
    frames.push({ png: await toPng(card(q, { lang, width, height, reveal: true, hook: ui.answer, explanation }), width, height), seconds: 6 });
  }
  frames.push({ png: await toPng(ctaCard(lang, width, height), width, height), seconds: 3 });
  return frames;
}
