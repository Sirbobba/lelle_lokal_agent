import { EventEmitter } from "events";
import { config } from "./config.js";
import type { ChatRequest, ChatChunk, ChatMessage } from "./types.js";

// ══════════════════════════════════════════════════════════════════════════════
// Lelle Agent v2 — Native LM Studio REST API
// Nyckelskillnader vs v1:
//  • Ingen @lmstudio/sdk — ren fetch() mot /api/v1/chat
//  • Stateful via conversation_id (LM Studio håller historiken)
//  • MCP-verktyg delegeras till LM Studio (inga TypeScript tool-definitioner)
//  • SSE-streaming för realtids-tokens
// ══════════════════════════════════════════════════════════════════════════════

const MAX_NUDGES = 3;

export class AgentV2 extends EventEmitter {
  /** LM Studio håller states server-side. Vi håller bara kvar ID:t. */
  private conversationId: string | null = null;

  /** Lokal spegelbild för terminal-display och fallback */
  private localHistory: ChatMessage[] = [];

  /** Räknar nudges för att undvika eviga loopar */
  private nudgeCount = 0;

  /** Pending permission resolver */
  private permissionResolver: ((allowed: boolean) => void) | null = null;

  constructor() {
    super();
  }

  // ── Hjälpfunktion: bygg headers ──────────────────────────────────────────
  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = config.apiToken;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // ── Permission system ────────────────────────────────────────────────────
  public grantPermission(allowed: boolean): void {
    if (this.permissionResolver) {
      this.permissionResolver(allowed);
      this.permissionResolver = null;
    }
  }

  // ── Rensa historik ───────────────────────────────────────────────────────
  public clearHistory(): void {
    this.conversationId = null;
    this.localHistory = [];
    this.nudgeCount = 0;
    this.emit("history-cleared");
  }

  // ── Hämta aktiv konversations-ID ────────────────────────────────────────
  public getConversationId(): string | null {
    return this.conversationId;
  }

  // ── Huvud chat-metod ─────────────────────────────────────────────────────
  async chat(userMessage: string): Promise<void> {
    this.nudgeCount = 0;
    this.emit("user-message", userMessage);
    this.emit("start");

    // Lägg till i lokal spegel
    this.localHistory.push({ role: "user", content: userMessage });

    await this.runTurn(userMessage);
  }

  // ── En turn i agent-loopen ───────────────────────────────────────────────
  private async runTurn(message: string): Promise<void> {
    const integrations = config.integrations;
    const hasMcp = integrations.length > 0;

    const body: Record<string, any> = {
      model: config.modelId,
      system_prompt: config.systemPrompt,
      input: message,
      stream: true,
      temperature: 0.7,
      store: true,
    };

    // Stateful: lägg till previous_response_id om vi har ett
    if (this.conversationId) {
      body.previous_response_id = this.conversationId;
    } else if (this.localHistory.length > 1) {
      // Om LM Studio förlorat vår session, kan vi i Native API inte enkelt skicka all 
      // historik i 'input' om vi inte har response_id, men låt oss bara skicka det aktuella.
      // Den avancerade lösningen vore att återskapa historiken med tool_calls etc, 
      // men LM Studio:s native API använder stateful_chats!
    }

    // MCP: lägg till integrations om konfigurerade
    if (hasMcp) {
      body.integrations = integrations;
    }

    this.emit("request-start", { hasMcp, conversationId: this.conversationId });

    try {
      const response = await fetch(`${config.baseUrl}/api/v1/chat`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      if (!response.ok) {
        let errText = "";
        try { errText = await response.text(); } catch {}
        throw new Error(`LM Studio API ${response.status}: ${errText}`);
      }

      if (!response.body) {
        throw new Error("Inget svar-body från LM Studio.");
      }

      // ── Native SSE Stream Parser ─────────────────────────────────────────
      let fullContent = "";
      let round = 1;
      let hasToolCall = false;
      let inThought = false;
      let thoughtBuffer = "";
      let thoughtStartTime = 0;

      this.emit("round", round);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        
        // SSE blocks are separated by double newline
        const blocks = sseBuffer.split(/\r?\n\r?\n/);
        sseBuffer = blocks.pop() || "";

        for (const block of blocks) {
          let dataStr = "";
          for (const line of block.split(/\r?\n/)) {
            if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim();
            }
          }
          if (!dataStr || dataStr === "[DONE]") continue;

          let chunk: any;
          try {
            chunk = JSON.parse(dataStr);
          } catch {
            continue;
          }

          const type = chunk.type;

          if (type === "reasoning.start") {
             inThought = true;
             thoughtBuffer = "";
             thoughtStartTime = Date.now();
             this.emit("thought-start");
          } 
          else if (type === "reasoning.delta") {
             const content = chunk.content || "";
             thoughtBuffer += content;
             this.emit("thought-token", content);
          }
          else if (type === "reasoning.end") {
             const duration = Math.round((Date.now() - thoughtStartTime) / 1000);
             this.emit("thought-end", { duration, thought: thoughtBuffer });
             inThought = false;
          }
          else if (type === "message.delta") {
             const content = chunk.content || "";
             if (!content) continue;

             const START_TAG = "<|channel>thought";
             const END_TAG = "<channel|>";

             // Om vi inte bygger en thought-buffer
             if (!inThought) {
                if (content.includes(START_TAG)) {
                   const parts = content.split(START_TAG);
                   if (parts[0]) {
                      fullContent += parts[0];
                      this.emit("token", parts[0]);
                   }
                   inThought = true;
                   thoughtBuffer = "";
                   thoughtStartTime = Date.now();
                   this.emit("thought-start");
                   
                   // Om hela tanken tog slut i samma chunk
                   const rest = parts.slice(1).join(START_TAG);
                   if (rest.includes(END_TAG)) {
                      const thoughtParts = rest.split(END_TAG);
                      thoughtBuffer += thoughtParts[0];
                      this.emit("thought-token", thoughtParts[0]);
                      const duration = Math.round((Date.now() - thoughtStartTime) / 1000);
                      this.emit("thought-end", { duration, thought: thoughtBuffer });
                      inThought = false;
                      
                      if (thoughtParts[1]) {
                         fullContent += thoughtParts[1];
                         this.emit("token", thoughtParts[1]);
                      }
                   } else {
                      thoughtBuffer += rest;
                      this.emit("thought-token", rest);
                   }
                } else {
                   fullContent += content;
                   this.emit("token", content);
                }
             } else {
                // Vi ÄR i en thought buffer
                if (content.includes(END_TAG)) {
                   const parts = content.split(END_TAG);
                   thoughtBuffer += parts[0];
                   this.emit("thought-token", parts[0]);
                   const duration = Math.round((Date.now() - thoughtStartTime) / 1000);
                   this.emit("thought-end", { duration, thought: thoughtBuffer });
                   inThought = false;
                   
                   if (parts[1]) {
                      fullContent += parts[1];
                      this.emit("token", parts[1]);
                   }
                } else {
                   thoughtBuffer += content;
                   this.emit("thought-token", content);
                }
             }
          }
          else if (type === "tool_call.start") {
             hasToolCall = true;
             round++;
             
             // Hantera potentiella skillnader i LM Studio API payload
             const toolName = chunk.tool?.name || chunk.tool || chunk.function?.name || "unknown_tool";
             const mcpServer = chunk.provider_info?.server_label || chunk.provider_info?.plugin_id || chunk.provider_info?.id || "mcp";
             
             this.emit("tool-call", {
               name: toolName,
               arguments: {}, 
               round,
               mcpServer,
             });
             this.emit("round", round);
          }
          else if (type === "error") {
            const err = chunk.error?.message || "Unknown stream error";
            this.emit("error", `Stream error: ${err}`);
          }
          else if (type === "chat.end") {
             if (chunk.result?.response_id) {
                // Spara det nya response_id för vår stateful stream
                this.conversationId = chunk.result.response_id;
             }
          }
        }
      }

      // Lägg till i lokal spegel
      if (fullContent) {
        this.localHistory.push({ role: "assistant", content: fullContent });
      }

      // Nudge-logik: om modellen stannar utan att verka vara klar
      const looksIncomplete =
        !fullContent.trim() ||
        (hasToolCall && !fullContent.trim());

      if (looksIncomplete && this.nudgeCount < MAX_NUDGES) {
        this.nudgeCount++;
        this.emit(
          "warning",
          `Modellen stannade i förtid. Ger nudge (${this.nudgeCount}/${MAX_NUDGES})...`
        );
        const nudge = `Fortsätt. Du är inte klar än. (Nudge ${this.nudgeCount}/${MAX_NUDGES})`;
        this.localHistory.push({ role: "user", content: nudge });
        await this.runTurn(nudge);
        return;
      }

      this.emit("complete", fullContent);
    } catch (err: any) {
      if (err.name === "TimeoutError") {
        this.emit("error", "LM Studio svarade inte inom 2 minuter. Är servern igång?");
      } else if (err.message?.includes("ECONNREFUSED")) {
        this.emit("error", "Kan inte ansluta till LM Studio. Säkerställ att servern är igång på port 1234.");
      } else {
        this.emit("error", err.message || "Okänt fel");
      }
      this.emit("complete", "");
    }
  }
}
