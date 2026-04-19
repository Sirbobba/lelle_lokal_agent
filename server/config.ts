import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import type { Settings, McpIntegration } from "./types.js";

// Ladda .env från projektets rot
dotenv.config({ path: path.join(process.cwd(), ".env") });

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const MEMORY_FILE = path.join(process.cwd(), "lelle_memory.json");
const ACADEMY_FILE = path.join(process.cwd(), "LELLE_ACADEMY.md");
// Lokal kopia av LM Studio-dokumentation (klonad från GitHub)
const LM_DOCS_PATH = process.env.LM_STUDIO_DOCS_PATH || "H:\\LM_Studio_projekt\\LM_studio_docs";

const DEFAULT_SETTINGS: Settings = {
  persona: "senior_partner",
  showThoughts: true,
  autoExecute: false,
  theme: "dark",
  modelId: process.env.MODEL_ID || "google/gemma-4-e4b",
  maxHistoryMessages: 100,
};

function readFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
  } catch {}
  return null;
}

function getSettings(): Settings {
  const raw = readFile(SETTINGS_FILE);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getMemory(): string {
  const raw = readFile(MEMORY_FILE);
  if (!raw) return "";
  try {
    const data = JSON.parse(raw);
    let out = "";
    for (const [cat, entries] of Object.entries(data)) {
      out += `\n**${cat}:**\n`;
      if (Array.isArray(entries)) {
        entries.forEach((e: any) => (out += `- ${e.content || e}\n`));
      } else {
        out += `- ${entries}\n`;
      }
    }
    return out;
  } catch {
    return "";
  }
}

function buildSystemPrompt(): string {
  const s = getSettings();
  const workDir = process.env.AGENT_CWD || "H:\\LM_Studio_projekt";

  let persona = "";
  if (s.persona === "senior_partner") {
    persona = `Du är en Senior Partner och avancerad lokal kodassistent. Ditt mål är att proaktivt hjälpa användaren att driva projektet framåt.
### VIKTIGASTE REGLER FÖR AGERANDE:
1. INITIATIV OCH HANDLING: Du är en utförare. UTFÖR direkt med dina MCP-verktyg.
2. INGET SK skitsnack: Om du behöver läsa en mapp eller köra ett kommando, gör **bara** verktygsanropet. Skriv ALDRIG "Jag tänker nu lista mappen" och sedan stanna.
3. KÖR VERKTYG DIREKT: Om du saknar kontext, använd list_directory eller read_file omedelbart. Prata inte om att du ska göra det.`;
  } else if (s.persona === "helpful") {
    persona = `Du är en hjälpsam, vänlig och pedagogisk kodassistent. Du förklarar gärna dina steg och ger tips på hur koden kan förbättras.`;
  } else {
    persona = `Du är en minimalistisk expert-assistent. Svara med så lite text som möjligt. Gå direkt till handling utan kommentarer.`;
  }

  const memory = getMemory();
  const memPrompt = memory
    ? `\n\n### MINNE FRÅN TIDIGARE SESSIONER\n${memory}`
    : "";

  const academy = readFile(ACADEMY_FILE);
  const academyPrompt = academy
    ? `\n\n### LELLES AKADEMI (FÖLJ DESSA REGLER)\n${academy}`
    : "";

  return `${persona}${academyPrompt}

### REGLER FÖR AGENTEN:
1. ARBETSKATALOG: Din bas är ${workDir}.
2. PROAKTIVITET: Kör GASEN I BOTTEN. Gör så många steg du kan i en och samma svar-cykel.
3. GE ALDRIG UPP: Pröva minst 3 angreppssätt om något misslyckas.
4. AVSLUT: Avsluta alltid med en tydlig sammanfattning av vad du gjort.
5. LM STUDIO DOCS: Lokala LM Studio-dokument finns i ${LM_DOCS_PATH}. Åberkalla dem när du behöver exakt API-info om /api/v1/chat, MCP, autentisering, streaming-events eller TypeScript SDK.${memPrompt}`;
}

// ── MCP Integration Helper ────────────────────────────────────────────────────
// Vilka MCP-servrar finns konfigurerade i LM Studios mcp.json?
const LM_MCP_PATH =
  process.env.LM_MCP_PATH ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".lmstudio",
    "mcp.json"
  );

function getConfiguredMcpServers(): string[] {
  const raw = readFile(LM_MCP_PATH);
  if (!raw) return [];
  try {
    const mcpConfig = JSON.parse(raw);
    return Object.keys(mcpConfig.mcpServers || {});
  } catch {
    return [];
  }
}

// Bygg integrations-lista baserat på tillgängliga MCP-servrar
function buildIntegrations(): string[] {
  const servers = getConfiguredMcpServers();
  // Native LM Studio API förväntar sig sträng-shorthand för mcp.json relaterade servrar: "mcp/<server_label>"
  return servers.map((name) => `mcp/${name}`);
}

// ── Exporterad Config ─────────────────────────────────────────────────────────
export const config = {
  get modelId() {
    return getSettings().modelId || process.env.MODEL_ID || "google/gemma-4-e4b";
  },
  get baseUrl() {
    return process.env.LM_BASE_URL || "http://localhost:1234";
  },
  get apiToken() {
    return process.env.LM_API_TOKEN || "";
  },
  get serverPort() {
    return parseInt(process.env.SERVER_PORT || "3001", 10);
  },
  get workingDirectory() {
    return process.env.AGENT_CWD || "H:\\LM_Studio_projekt";
  },
  set workingDirectory(dir: string) {
    process.env.AGENT_CWD = dir;
  },
  get systemPrompt() {
    return buildSystemPrompt();
  },
  get integrations() {
    return buildIntegrations();
  },
  get configuredMcpServers() {
    return getConfiguredMcpServers();
  },
  get allSettings() {
    return getSettings();
  },
  get mcpPath() {
    return LM_MCP_PATH;
  },
  saveSettings(newSettings: Partial<Settings>): void {
    const current = getSettings();
    const merged = { ...current, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
  },
};
