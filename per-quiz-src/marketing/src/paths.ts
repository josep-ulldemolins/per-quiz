import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Carpeta marketing/ */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const QUEUE_DIR = join(ROOT, "queue");
