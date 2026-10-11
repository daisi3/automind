import { streamSse } from "./api/client";
import { extractSources } from "./api/events";
import type {
  AgentErrorEvent,
  AgentProgressEvent,
  AgentStep,
  AgentToolCallEvent,
  AgentToolResultEvent,
  RagSource,
} from "./types";

interface AgentStreamHandlers {
  onStep: (step: AgentStep) => void;
  onChunk: (chunk: string) => void;
  onSources: (sources: RagSource[]) => void;
  onEvent: (event: AgentProgressEvent) => void;
}

// 将分开的 tool_call/tool_result 事件合并成页面现有的工具记录。
export function streamAgent(
  message: string,
  { onStep, onChunk, onSources, onEvent }: AgentStreamHandlers,
): Promise<void> {
  const pendingCalls = new Map<number, AgentToolCallEvent>();

  return streamSse("/api/agent/chat", { message }, (payload) => {
    if (payload === "[DONE]") return;

    const event = JSON.parse(payload) as Record<string, unknown>;
    if (
      event.type === "phase" &&
      (event.phase === "decision" || event.phase === "generation")
    ) {
      onEvent({
        type: "phase",
        phase: event.phase,
        step: typeof event.step === "number" ? event.step : null,
      });
      return;
    }
    if (event.type === "error") {
      const errorEvent: AgentErrorEvent = {
        type: "error",
        message: typeof event.message === "string" ? event.message : "Agent 执行失败",
        recoverable: event.recoverable === true,
        step: typeof event.step === "number" ? event.step : null,
      };
      onEvent(errorEvent);
      if (errorEvent.recoverable) return;
      throw new Error(errorEvent.message);
    }
    if (event.type === "agent_start" && typeof event.max_steps === "number") {
      onEvent({
        type: "agent_start",
        max_steps: event.max_steps,
      });
      return;
    }
    if (
      event.type === "tool_call" &&
      typeof event.step === "number" &&
      typeof event.tool_name === "string" &&
      event.arguments !== null &&
      typeof event.arguments === "object"
    ) {
      const toolCall: AgentToolCallEvent = {
        type: "tool_call",
        step: event.step,
        tool_name: event.tool_name,
        arguments: event.arguments as Record<string, unknown>,
      };
      pendingCalls.set(event.step, toolCall);
      onEvent(toolCall);
      return;
    }
    if (
      event.type === "tool_result" &&
      typeof event.step === "number" &&
      event.result !== null &&
      typeof event.result === "object"
    ) {
      const call = pendingCalls.get(event.step);
      const toolResult: AgentToolResultEvent = {
        type: "tool_result",
        step: event.step,
        tool_name:
          typeof event.tool_name === "string"
            ? event.tool_name
            : call?.tool_name ?? "unknown",
        result: event.result as Record<string, unknown>,
      };
      onEvent(toolResult);
      if (call) {
        onStep({
          step: call.step,
          tool_name: call.tool_name,
          arguments: call.arguments,
          observation: toolResult.result,
        });
        pendingCalls.delete(event.step);
      }
      return;
    }
    if (
      event.type === "retrieval" &&
      typeof event.step === "number" &&
      typeof event.query === "string" &&
      typeof event.retrieved_count === "number" &&
      typeof event.reranked_count === "number"
    ) {
      onEvent({
        type: "retrieval",
        step: event.step,
        query: event.query,
        retrieved_count: event.retrieved_count,
        reranked_count: event.reranked_count,
      });
      return;
    }
    if (
      event.type === "final" &&
      typeof event.answer === "string" &&
      typeof event.fallback === "boolean"
    ) {
      onEvent({
        type: "final",
        answer: event.answer,
        fallback: event.fallback,
      });
      return;
    }
    if (event.type === "sources") {
      const sources = extractSources(payload);
      if (sources) onSources(sources);
      return;
    }
    if (event.type === "token" && typeof event.token === "string") {
      onChunk(event.token);
    }
  });
}
