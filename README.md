# 🤖 Lelle Agent v2

**Lokal AI-kodassistent byggd på LM Studio REST API v1 — Stateful Chat + MCP Host**

> Den här versionen ersätter det gamla `../local-code-assistant`-projektet och bygger på modern arkitektur utan LM Studio SDK-beroende.

---

## Snabbstart

```cmd
:: Dubbelklicka eller kör från terminalen:
Starta_Lelle_v2.cmd

:: Med projektmapp:
Starta_Lelle_v2.cmd "H:\LM_Studio_projekt\mitt-projekt"
```

| Service | URL |
|:--|:--|
| Web Dashboard | http://localhost:5174 |
| Backend API | http://localhost:3001 |
| LM Studio | http://localhost:1234 |

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────┐
│                  Lelle Agent v2                         │
│                                                         │
│  ┌──────────────┐     socket.io     ┌───────────────┐  │
│  │   Terminal   │ ◄───────────────► │  React UI     │  │
│  │  (readline)  │                   │  :5174        │  │
│  └──────┬───────┘                   └───────────────┘  │
│         │                                               │
│  ┌──────▼───────────────────────────────────────────┐  │
│  │  Express Server :3001  (server/index.ts)         │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  AgentV2  (server/agent.ts)                │ │  │
│  │  │  POST /api/v1/chat  ──►  LM Studio :1234   │ │  │
│  │  │  conversation_id  (stateful!)              │ │  │
│  │  │  integrations: [mcp_server: filesystem]    │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Varför inte `@lmstudio/sdk`?

v1 använde SDK:n som kräver att man hanterar hela chatthistoriken manuellt och definierar alla
verktyg i TypeScript-kod. v2 utnyttjar istället LM Studios egna REST API v1 som erbjuder:

- **Stateful chat** — LM Studio håller historiken server-side via `conversation_id`
- **MCP Host** — verktyg delegeras till MCP-servrar, inga tool-defs i vår kod
- **Streamad SSE** — realtids-tokens direkt från API:t

---

## MCP-setup

Agenten kan svara på frågor utan MCP, men **kan inte hantera filer eller köra kommandon**.

### 1. Uppdatera `~/.lmstudio/mcp.json`

Öppna `mcp-config-example.json` i projektroten och lägg in `mcpServers`-blocket i:
```
C:\Users\<ditt-namn>\.lmstudio\mcp.json
```

### 2. Aktivera i LM Studio

Settings → Developer → Server Settings → ✅ *Allow calling servers from mcp.json*

### 3. Verifiera

Starta agenten och skriv `mcp` i terminalen.

> 📖 Se lokala docs: [`../LM_studio_docs/1_developer/0_core/mcp.md`](../LM_studio_docs/1_developer/0_core/mcp.md)

---

## Konfiguration

### API Token & Autentisering (krävs för MCP från mcp.json)

> 📖 Docs: [`../LM_studio_docs/1_developer/0_core/authentication.md`](../LM_studio_docs/1_developer/0_core/authentication.md)

**Varför?** LM Studio kräver autentisering aktivt *innan* "Allow calling servers from mcp.json" går att slå på — som säkerhetsskydd för filsystemåtkomst.

**Steg:**

1. LM Studio → **Developer** (vänster sidebar) → **Server Settings**
2. Slå på ✅ **Require Authentication**
3. Klicka **Manage Tokens** → **New Token**
4. Namnge den (t.ex. `lelle-v2`)
5. Under **Permissions**, sätt båda till **Allow**:
   - ✅ Allow per-request remote MCP servers
   - ✅ Allow calling servers from mcp.json
6. Klicka **Create token** → kopiera strängen
7. Gå tillbaka till Server Settings → slå på ✅ **Allow calling servers from mcp.json**

**Lägg in token i `.env`:**
```env
LM_API_TOKEN=lm-abc123din-token-här
```

### Övrig `.env`-konfiguration

```env
LM_API_TOKEN=          # Din token från stegen ovan
LM_BASE_URL=http://localhost:1234
MODEL_ID=gemma-4-e4b-it
AGENT_CWD=H:\LM_Studio_projekt
SERVER_PORT=3001
LM_STUDIO_DOCS_PATH=H:\LM_Studio_projekt\LM_studio_docs
```

### `settings.json`

| Parameter | Standard | Beskrivning |
|:--|:--|:--|
| `persona` | `senior_partner` | Agentens personlighet |
| `modelId` | `gemma-4-e4b-it` | LM Studio modell-ID |
| `theme` | `dark` | `dark` eller `light` |
| `showThoughts` | `true` | Visa modellens resonemang |
| `autoExecute` | `false` | Kör MCP-kommandon utan bekräftelse |
| `maxHistoryMessages` | `100` | Lokalt minnedjup (backup) |

---

## REST API — `/api/v1/chat`

Agenten kommunicerar med LM Studio via native v1 REST API:n:

```typescript
// Första meddelandet — ny konversation
POST http://localhost:1234/api/v1/chat
{
  "model": "gemma-4-e4b-it",
  "messages": [{ "role": "user", "content": "Hej!" }],
  "stream": true,
  "integrations": [{ "type": "mcp_server", "name": "filesystem" }]
}
// Svar innehåller: conversation_id

// Uppföljning — stateful!
{
  "model": "gemma-4-e4b-it",
  "messages": [{ "role": "user", "content": "Fortsätt" }],
  "previous_conversation_id": "conv_abc123",   // ← stateful
  "stream": true
}
```

> 📖 Se lokala docs:
> - [`../LM_studio_docs/1_developer/2_rest/chat.md`](../LM_studio_docs/1_developer/2_rest/chat.md) — Chat API
> - [`../LM_studio_docs/1_developer/2_rest/stateful-chats.md`](../LM_studio_docs/1_developer/2_rest/stateful-chats.md) — Stateful Chat
> - [`../LM_studio_docs/1_developer/2_rest/streaming-events.md`](../LM_studio_docs/1_developer/2_rest/streaming-events.md) — SSE Streaming

---

## Projektstruktur

```
local-code-assistant-lelle/
├── .env                          # Konfiguration (token, portar, etc.)
├── settings.json                 # Agentinställningar
├── mcp-config-example.json       # Mall för ~/.lmstudio/mcp.json
├── Starta_Lelle_v2.cmd           # Launcher-skript
├── package.json                  # Backend-beroenden
├── tsconfig.json
│
├── server/
│   ├── agent.ts                  # ⭐ Kärna — REST API + stateful chat
│   ├── config.ts                 # Config, system prompt, MCP-läsning
│   ├── index.ts                  # Express + Socket.io + terminal
│   └── types.ts                  # Delade TypeScript-typer
│
└── frontend/
    ├── vite.config.ts            # Proxy → :3001, port 5174
    └── src/
        ├── App.tsx
        ├── index.css             # Design system (dark/light themes)
        ├── components/
        │   ├── ChatPanel.tsx     # Meddelanden + streaming
        │   ├── InputBar.tsx      # Input + drag-drop uppladdning
        │   ├── Sidebar.tsx       # Nav + statusindikatorer
        │   ├── SystemCheck.tsx   # Onboarding-overlay
        │   ├── SettingsModal.tsx # Inställningspanel
        │   ├── ThoughtBlock.tsx  # Modellens tankeprocess
        │   └── ToolCallBadge.tsx # MCP verktygs-badges
        └── lib/
            ├── socket.ts         # Socket.io klient
            └── api.ts            # REST helpers
```

---

## Skillnader mot v1

| | v1 (`local-code-assistant`) | v2 (detta projekt) |
|:--|:--|:--|
| AI SDK | `@lmstudio/sdk` | Native `fetch()` → REST API |
| Historik | Manuell `Chat[]`-array | `conversation_id` — server-side |
| Verktyg | 13 TS-implementationer | MCP-delegering |
| Verktygs-routing | Hanteras av agenten | Hanteras av LM Studio |
| Backend-port | 3000 | 3001 |
| Frontend-port | 5173 | 5174 |
| Bundle-storlek (deps) | ~25 MB | ~4 MB |

---

## Lokala LM Studio Docs

Alla LM Studio-dokument finns lokalt i `../LM_studio_docs/` (klonat från GitHub).

| Ämne | Lokal fil |
|:--|:--|
| REST API Quickstart | [`1_developer/2_rest/quickstart.md`](../LM_studio_docs/1_developer/2_rest/quickstart.md) |
| Chat API | [`1_developer/2_rest/chat.md`](../LM_studio_docs/1_developer/2_rest/chat.md) |
| Stateful Chats | [`1_developer/2_rest/stateful-chats.md`](../LM_studio_docs/1_developer/2_rest/stateful-chats.md) |
| Streaming Events (SSE) | [`1_developer/2_rest/streaming-events.md`](../LM_studio_docs/1_developer/2_rest/streaming-events.md) |
| MCP Host | [`1_developer/0_core/mcp.md`](../LM_studio_docs/1_developer/0_core/mcp.md) |
| Autentisering | [`1_developer/0_core/authentication.md`](../LM_studio_docs/1_developer/0_core/authentication.md) |
| TypeScript SDK | [`2_typescript/index.md`](../LM_studio_docs/2_typescript/index.md) |
| API Changelog | [`1_developer/api-changelog.md`](../LM_studio_docs/1_developer/api-changelog.md) |

> Originalkälla: https://github.com/lmstudio-ai/lmstudio-docs

---

## Felsökning

**"Kan inte ansluta till LM Studio"**
→ Kontrollera att LM Studio är igång och att modellen är laddad.
→ Docs: [`1_developer/2_rest/quickstart.md`](../LM_studio_docs/1_developer/2_rest/quickstart.md)

**"Inga MCP-servrar konfigurerade"**
→ Kopiera `mcp-config-example.json` → `~/.lmstudio/mcp.json`
→ Docs: [`1_developer/0_core/mcp.md`](../LM_studio_docs/1_developer/0_core/mcp.md)

**"401 Unauthorized"**
→ Sätt `LM_API_TOKEN=` i `.env` eller inaktivera autentisering i LM Studio.
→ Docs: [`1_developer/0_core/authentication.md`](../LM_studio_docs/1_developer/0_core/authentication.md)
