// Chat 页面使用的消息角色。
export type ChatRole = "user" | "assistant";

// Chat 页面可切换的后端问答模式。
export type ChatMode = "general" | "knowledge" | "agent";

import type { AgentStep, RagSource } from "../../services/types";

export type {
  AgentProgressEvent,
  AgentStep,
  RagSource,
} from "../../services/types";

// Chat 页面展示和更新消息时使用的统一结构。
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sources?: RagSource[];
  agentSteps?: AgentStep[];
  agentTimeline?: AgentTimelineItem[];
  agentActivity?: string;
  status?: "pending" | "complete" | "failed";
}


export interface AgentTimelineItem {
  id: string;
  label: string;
  detail?: string;
  status: "pending" | "complete" | "warning" | "error";
}
