// Carga marketing/.env (ANTHROPIC_API_KEY=...) si existe; las variables ya exportadas tienen prioridad.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./paths.ts";

const file = join(ROOT, ".env");
if (existsSync(file)) process.loadEnvFile(file);
