export interface ChatInputMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagSource {
  source: string;
  page: number | null;
  chunkIndex: number | null;
  snippet: string;
  score: number;
  rerankScore: number;
}

export interface AgentStep {
  step: number;
  tool_name: string;
  arguments: Record<string, unknown>;
  observation: Record<string, unknown>;
}

export interface AgentStartEvent {
  type: "agent_start";
  max_steps: number;
}

export interface AgentPhaseEvent {
  type: "phase";
  phase: "decision" | "generation";
  step: number | null;
}

export interface AgentToolCallEvent {
  type: "tool_call";
  step: number;
  tool_name: string;
  arguments: Record<string, unknown>;
}

export interface AgentToolResultEvent {
  type: "tool_result";
  step: number;
  tool_name: string;
  result: Record<string, unknown>;
}

export interface AgentRetrievalEvent {
  type: "retrieval";
  step: number;
  query: string;
  retrieved_count: number;
  reranked_count: number;
}

export interface AgentFinalEvent {
  type: "final";
  answer: string;
  fallback: boolean;
}

export interface AgentErrorEvent {
  type: "error";
  message: string;
  recoverable: boolean;
  step: number | null;
}

export type AgentProgressEvent =
  | AgentStartEvent
  | AgentPhaseEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentRetrievalEvent
  | AgentFinalEvent
  | AgentErrorEvent;
