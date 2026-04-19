// ── Lelle Agent v2 — Shared Types ──────────────────────────────────────

/** Settings stored in settings.json */
export interface Settings {
  persona: "senior_partner" | "helpful" | "minimalist";
  showThoughts: boolean;
  autoExecute: boolean;
  theme: "dark" | "light";
  modelId: string;
  maxHistoryMessages: number;
}

/** Config snapshot sent to frontend */
export interface AgentConfig {
  modelId: string;
  workingDirectory: string;
  baseUrl: string;
  hasMcp: boolean;
}

/** A single SSE event from LM Studio streaming response */
export interface SSEEvent {
  type: string;
  [key: string]: any;
}

/** LM Studio /api/v1/chat request body */
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  previous_conversation_id?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  context_length?: number;
  integrations?: McpIntegration[];
  tools?: any[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LM Studio /api/v1/chat response */
export interface ChatResponse {
  id: string;
  conversation_id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** SSE chunk for streaming */
export interface ChatChunk {
  id: string;
  conversation_id?: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: any[];
    };
    finish_reason?: string | null;
  }>;
}

/** MCP integration reference */
export interface McpIntegration {
  type: "mcp_server";
  name: string;
}

/** Tool call info emitted to UI */
export interface ToolCallInfo {
  name: string;
  arguments: Record<string, any>;
  round: number;
  mcpServer?: string;
}

/** File modification stats */
export interface FileStat {
  file: string;
  added: number;
  removed: number;
}
