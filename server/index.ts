import * as readline from "readline";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { AgentV2 } from "./agent";
import { config } from "./config";

const execAsync = promisify(exec);

// ── ANSI Colors ───────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
};

// ── Filtrera LM Studio SDK-varningar ─────────────────────────────────────────
const NOISE = [
  "channelSend for unknown channel",
  "communication warning from the server",
  "communication protocol incompatibility",
];

const originalStdout = process.stdout.write.bind(process.stdout);
const originalStderr = process.stderr.write.bind(process.stderr);
(process.stdout.write as any) = (chunk: any, ...args: any[]) => {
  if (typeof chunk === "string" && NOISE.some((n) => chunk.includes(n))) return true;
  return originalStdout(chunk, ...args);
};
(process.stderr.write as any) = (chunk: any, ...args: any[]) => {
  if (typeof chunk === "string" && NOISE.some((n) => chunk.includes(n))) return true;
  return originalStderr(chunk, ...args);
};

// ── Banner ─────────────────────────────────────────────────────────────────────
function banner(cwd: string, mcpServers: string[]) {
  const mcpStatus =
    mcpServers.length > 0
      ? `${C.green}✓${C.reset} ${mcpServers.join(", ")}`
      : `${C.yellow}(inga MCP-servrar konfigurerade)${C.reset}`;

  console.log(`
${C.cyan}${C.bold}╔══════════════════════════════════════════════════╗
║       🤖  Lelle Agent v2 — Native REST API        ║
║     Stateful Chat + MCP Host Architecture         ║
╚══════════════════════════════════════════════════╝${C.reset}

${C.green}🌐 Web-UI:${C.reset}  ${C.bold}http://localhost:5174${C.reset}
${C.blue}📂 Projekt:${C.reset} ${cwd}
${C.magenta}🔌 MCP:${C.reset}    ${mcpStatus}
${C.gray}Kommandon: exit | clear | mcp${C.reset}
`);
}

function prompt() {
  process.stdout.write(`\n${C.green}${C.bold}Du${C.reset}${C.green} ›${C.reset} `);
}

// ── Huvudfunktion ─────────────────────────────────────────────────────────────
async function main() {
  const PORT = config.serverPort;
  const agent = new AgentV2();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Servera frontend dist om det finns (production mode)
  const frontendDist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendDist));

  // ── REST Endpoints ───────────────────────────────────────────────────────

  app.get("/api/config", (_req, res) => {
    res.json({
      modelId: config.modelId,
      workingDirectory: config.workingDirectory,
      baseUrl: config.baseUrl,
      hasMcp: config.configuredMcpServers.length > 0,
      mcpServers: config.configuredMcpServers,
      conversationId: agent.getConversationId(),
    });
  });

  app.get("/api/settings", (_req, res) => {
    res.json(config.allSettings);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      config.saveSettings(req.body);
      io.emit("settings-updated", req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/lm-studio-status", (_req, res) => {
    const net = require("net");
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on("connect", () => { socket.destroy(); res.json({ running: true }); });
    socket.on("timeout", () => { socket.destroy(); res.json({ running: false }); });
    socket.on("error", () => res.json({ running: false }));
    socket.connect(1234, "127.0.0.1");
  });

  app.get("/api/lm-studio-models", async (_req, res) => {
    try {
      const response = await fetch(`${config.baseUrl}/api/v1/models`, {
        headers: config.apiToken
          ? { Authorization: `Bearer ${config.apiToken}` }
          : {},
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: "Kunde inte hämta modeller: " + err.message });
    }
  });

  app.post("/api/browse", async (_req, res) => {
    try {
      const psCmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Välj projektmapp för Lelle Agent v2'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"`;
      const { stdout } = await execAsync(psCmd);
      const newPath = stdout.trim();
      if (newPath) {
        config.workingDirectory = newPath;
        io.emit("config-updated", { workingDirectory: newPath });
        console.log(`\n${C.yellow}📂 Mapp ändrad:${C.reset} ${newPath}`);
        prompt();
        res.json({ success: true, path: newPath });
      } else {
        res.json({ success: false });
      }
    } catch {
      res.status(500).json({ error: "Kunde inte öppna mappväljaren" });
    }
  });

  app.get("/api/mcp-status", (_req, res) => {
    res.json({
      configPath: config.mcpPath,
      servers: config.configuredMcpServers,
      count: config.configuredMcpServers.length,
    });
  });

  app.post("/api/upload-file", async (req, res) => {
    try {
      const { base64, extension } = req.body;
      if (!base64) return res.status(400).json({ error: "Ingen fildata" });
      const fs = await import("fs/promises");
      const buffer = Buffer.from(base64, "base64");
      const filename = `upload_${Date.now()}.${extension || "bin"}`;
      const absPath = path.join(config.workingDirectory, filename);
      await fs.writeFile(absPath, buffer);
      console.log(`\n${C.yellow}📎 Fil uppladdad:${C.reset} ${filename}`);
      res.json({ success: true, filename });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Socket.io ────────────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`${C.gray}[Web] Klient ansluten${C.reset}`);
    prompt();

    socket.on("chat-message", async (message: string) => {
      await agent.chat(message);
      prompt();
    });

    socket.on("clear-history", () => {
      agent.clearHistory();
      console.log(`\n${C.yellow}🗑️ Historik rensad${C.reset}`);
    });

    socket.on("grant-permission", (allowed: boolean) => {
      agent.grantPermission(allowed);
    });
  });

  // ── Agent → Socket + Terminal Sync ───────────────────────────────────────
  let thoughtLineStarted = false;

  agent.on("user-message", (msg: string) => {
    io.emit("user-message", msg);
  });

  agent.on("start", () => {
    io.emit("start");
  });

  agent.on("token", (token: string) => {
    process.stdout.write(token);
    io.emit("token", token);
  });

  agent.on("thought-token", (token: string) => {
    const lines = token.split("\n");
    lines.forEach((line, i) => {
      if (i > 0 || !thoughtLineStarted) {
        process.stdout.write(i > 0 ? `\n${C.gray}│ ${C.reset}` : `${C.gray}│ ${C.reset}`);
        thoughtLineStarted = true;
      }
      process.stdout.write(`${C.gray}${C.dim}${line}${C.reset}`);
    });
    io.emit("thought-token", token);
  });

  agent.on("thought-start", () => {
    thoughtLineStarted = false;
    process.stdout.write(`\n${C.gray}╭─ 💭 Resonerar...${C.reset}\n`);
    io.emit("thought-start");
  });

  agent.on("thought-end", (data: { duration: number; thought: string }) => {
    thoughtLineStarted = false;
    const d = data?.duration ? ` (${data.duration}s)` : "";
    process.stdout.write(`\n${C.gray}╰─ Thought${d}${C.reset}\n`);
    io.emit("thought-end", data);
  });

  agent.on("round", (num: number) => {
    console.log(`\n\n${C.magenta}⚡ Runda ${num}...${C.reset}`);
    io.emit("round", num);
  });

  agent.on("tool-call", (call: any) => {
    const server = call.mcpServer ? `${C.gray}[${call.mcpServer}]${C.reset} ` : "";
    console.log(`\n${C.blue}🔧 ${server}${call.name}${C.reset}`);
    io.emit("tool-call", call);
  });

  agent.on("complete", (msg: string) => {
    console.log(`\n\n${C.green}✨ Agenten är klar.${C.reset}\n`);
    io.emit("complete", { message: msg });
  });

  agent.on("error", (err: string) => {
    console.error(`\n${C.red}❌ Fel: ${err}${C.reset}`);
    io.emit("error", err);
  });

  agent.on("warning", (msg: string) => {
    console.warn(`\n${C.yellow}⚠️ ${msg}${C.reset}`);
    io.emit("warning", msg);
  });

  agent.on("request-start", (info: any) => {
    const mcpStr = info.hasMcp ? `${C.green}MCP✓${C.reset}` : `${C.gray}No MCP${C.reset}`;
    const stateStr = info.conversationId
      ? `${C.cyan}Stateful${C.reset}`
      : `${C.yellow}New Session${C.reset}`;
    console.log(`${C.gray}[${mcpStr} | ${stateStr}]${C.reset}`);
  });

  agent.on("history-cleared", () => {
    io.emit("history-cleared");
  });

  // ── Terminal Interface ────────────────────────────────────────────────────
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const SHELL_CMDS = ["npm", "node", "npx", "yarn", "pnpm", "git", "ls", "dir", "type", "echo", "tsc", "python", "pip", "code"];

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) { prompt(); return; }

    if (input === "exit" || input === "quit") { process.exit(0); }

    if (input === "clear") {
      agent.clearHistory();
      console.clear();
      banner(config.workingDirectory, config.configuredMcpServers);
      prompt();
      return;
    }

    if (input === "mcp") {
      const servers = config.configuredMcpServers;
      if (servers.length === 0) {
        console.log(`\n${C.yellow}Inga MCP-servrar konfigurerade.${C.reset}`);
        console.log(`${C.gray}Kopiera mcp-config-example.json till ${config.mcpPath}${C.reset}`);
      } else {
        console.log(`\n${C.green}Aktiva MCP-servrar:${C.reset} ${servers.join(", ")}`);
      }
      prompt();
      return;
    }

    // Shell pass-through
    const firstWord = input.split(" ")[0].toLowerCase();
    const isShell = input.startsWith("!") || SHELL_CMDS.includes(firstWord);
    const isForcedAI = input.startsWith("?");

    if (!isForcedAI && isShell) {
      const cmd = input.startsWith("!") ? input.slice(1).trim() : input;
      console.log(`${C.gray}> ${cmd}${C.reset}`);
      const child = spawn(cmd, { shell: true, stdio: "inherit" });
      child.on("close", () => prompt());
      child.on("error", (e) => { console.error(`${C.red}Fel: ${e.message}${C.reset}`); prompt(); });
      return;
    }

    const aiInput = isForcedAI ? input.slice(1).trim() : input;
    process.stdout.write(`\n${C.blue}${C.bold}Assistent${C.reset}${C.blue} ›${C.reset} `);
    await agent.chat(aiInput);
    prompt();
  });

  // ── Starta server ─────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    banner(config.workingDirectory, config.configuredMcpServers);
    prompt();
  });
}

main().catch((err) => {
  console.error("Startfel:", err);
  process.exit(1);
});
