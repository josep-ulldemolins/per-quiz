// Ajustes de la campaña. Cámbialos aquí; no hace falta tocar el resto del código.
import type { Lang } from "./bank.ts";

export const config = {
  lang: "es" as Lang,
  /** Hora local a la que se programa cada post (una publicación al día). */
  postTime: "19:00",
  /** Cuenta que aparece en las imágenes y en el último slide. */
  handle: "@perquiz",
  /** Llamada a la acción del último slide y del final del vídeo. Mientras la web no esté publicada, lista de espera. */
  cta: {
    es: { title: "Practica con las 921 preguntas reales del PER", subtitle: "Simulacros, exámenes oficiales y estadísticas por tema", action: "Muy pronto · Apúntate en el enlace de la bio" },
    ca: { title: "Practica amb les 921 preguntes reals del PER", subtitle: "Simulacres, exàmens oficials i estadístiques per tema", action: "Molt aviat · Apunta’t a l’enllaç de la bio" },
  },
  /**
   * Peso de cada tema al elegir preguntas. Balizamiento, RIPA y carta tienen mínimos propios en el examen
   * (y son los más visuales), así que salen más a menudo. Peso 0 = no sale nunca: las de carta necesitan la carta
   * náutica del Estrecho o el anuario de mareas y no se pueden responder desde el móvil.
   */
  topicWeights: {
    nomenclatura: 1,
    amarre: 1,
    seguridad: 1,
    legislacion: 1,
    balizamiento: 3,
    ripa: 3,
    maniobra: 1,
    emergencias: 1,
    meteorologia: 1.5,
    navegacion: 1,
    carta: 0,
  } as Record<string, number>,
  /** Modelo de Claude que escribe la explicación y los textos. */
  model: "claude-opus-5-5",
};
