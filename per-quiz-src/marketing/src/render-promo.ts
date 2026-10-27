// Slides y fotogramas de los posts de presentación de la app: portada, pantallas en un móvil y datos clave.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Lang } from "./bank.ts";
import { config } from "./config.ts";
import type { PromoSlide } from "./posts.ts";
import { C, FEED, STORY, ctaCard, h, toPng, type El, type VideoFrame } from "./render.ts";
import { ROOT } from "./paths.ts";

const SCREENS = join(ROOT, "assets", "screens");

function screenImage(name: string): { src: string; width: number; height: number } {
  const file = join(SCREENS, `${name}.png`);
  if (!existsSync(file)) throw new Error(`Falta la captura assets/screens/${name}.png: ejecuta npm run screenshots con la app en marcha`);
  const png = readFileSync(file);
  return { src: `data:image/png;base64,${png.toString("base64")}`, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** Móvil con la captura, anclado al borde inferior del slide y cortado por él. */
function phone(name: string, width: number, visible: number): El {
  const img = screenImage(name);
  const bezel = Math.round(width * 0.035);
  const inner = width - bezel * 2;
  return h(
    "div",
    {
      position: "absolute",
      bottom: 0,
      left: "50%",
      width,
      height: visible,
      marginLeft: -width / 2,
      padding: `${bezel}px ${bezel}px 0`,
      background: C.text,
      borderRadius: `${bezel * 3.2}px ${bezel * 3.2}px 0 0`,
      overflow: "hidden",
    },
    {
      type: "img",
      props: { src: img.src, width: inner, height: Math.round((inner * img.height) / img.width), style: { borderRadius: `${bezel * 2.2}px ${bezel * 2.2}px 0 0` } },
    },
  );
}

function header(eyebrow: string, size: number, pill: string = C.accentSoft): El {
  return h(
    "div",
    { justifyContent: "space-between", alignItems: "center" },
    h("div", { fontSize: size, fontWeight: 600, color: C.accent }, config.handle),
    h("div", { fontSize: size * 0.87, fontWeight: 600, color: C.accent, background: pill, padding: "10px 24px", borderRadius: 999 }, eyebrow),
  );
}

function slide(s: Exclude<PromoSlide, { type: "cta" }>, width: number, height: number): El {
  const vertical = height > width * 1.5;
  const pad = 72;
  const titleSize = s.type === "cover" ? (vertical ? 116 : 100) : vertical ? 96 : 80;
  const textSize = vertical ? 42 : 36;
  const base = { width, height, flexDirection: "column", background: C.surface, padding: pad, fontFamily: "Sans", color: C.text, position: "relative", overflow: "hidden" } as const;

  if (s.type === "points") {
    const valueSize = vertical ? 104 : 88;
    // Columna de valores del ancho del más largo, para que las etiquetas queden alineadas.
    const valueWidth = Math.max(...s.points.map((p) => p.value.length)) * valueSize * 0.42 + 8;
    return h(
      "div",
      base,
      header(s.eyebrow, 30),
      h("div", { flex: 1 }),
      h("div", { fontFamily: "Serif", fontSize: titleSize * 1.1, lineHeight: 1.02, color: C.deep }, s.title),
      h(
        "div",
        { flexDirection: "column", marginTop: vertical ? 72 : 48, gap: vertical ? 28 : 22 },
        ...s.points.map((p) =>
          h(
            "div",
            { alignItems: "center", gap: 36, padding: vertical ? "34px 40px" : "28px 36px", background: C.ground, borderRadius: 22, border: `2px solid ${C.border}` },
            h("div", { width: valueWidth, flexShrink: 0, fontFamily: "Serif", fontSize: valueSize, lineHeight: 1, color: C.accent }, p.value),
            h("div", { flex: 1, fontSize: textSize * 1.12, lineHeight: 1.3, fontWeight: 500 }, p.label),
          ),
        ),
      ),
      s.note ? h("div", { marginTop: vertical ? 48 : 36, fontSize: textSize, lineHeight: 1.4, color: C.muted }, s.note) : null,
      h("div", { flex: 1.2 }),
    );
  }

  const text = s.type === "cover" ? s.subtitle : s.text;
  const phoneWidth = vertical ? 720 : 600;
  if (!s.screen) {
    // Portada sin captura: título grande centrado en vertical.
    return h(
      "div",
      { ...base, background: C.accentSoft },
      header(s.eyebrow, 30, C.ground),
      h("div", { flex: 1 }),
      h("div", { fontFamily: "Serif", fontSize: titleSize * 1.25, lineHeight: 0.98, color: C.deep }, s.title),
      h("div", { marginTop: 40, fontSize: textSize * 1.1, lineHeight: 1.35, color: C.muted }, text),
      h("div", { flex: 1.3 }),
    );
  }
  return h(
    "div",
    base,
    header(s.eyebrow, 30),
    h("div", { marginTop: vertical ? 96 : 48, fontFamily: "Serif", fontSize: titleSize, lineHeight: 1.02, color: C.deep }, s.title),
    h("div", { marginTop: 28, fontSize: textSize, lineHeight: 1.35, color: C.muted }, text),
    s.screen ? phone(s.screen, phoneWidth, vertical ? 1060 : s.type === "cover" ? 640 : 700) : null,
  );
}

/** Carrusel de un post de presentación. */
export async function renderPromoSlides(slides: PromoSlide[], lang: Lang): Promise<Buffer[]> {
  const { width, height } = FEED;
  return Promise.all(slides.map((s) => toPng(s.type === "cta" ? ctaCard(lang, width, height) : slide(s, width, height), width, height)));
}

/** Vídeo vertical: los mismos slides en 1080×1920, unos segundos cada uno según lo que hay que leer. */
export async function renderPromoFrames(slides: PromoSlide[], lang: Lang): Promise<VideoFrame[]> {
  const { width, height } = STORY;
  return Promise.all(
    slides.map(async (s) => ({
      png: await toPng(s.type === "cta" ? ctaCard(lang, width, height) : slide(s, width, height), width, height),
      seconds: s.type === "points" ? 5 : s.type === "cta" ? 3 : 3.5,
    })),
  );
}
