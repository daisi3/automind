import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { streamChat, streamRagChat } from "../../services/chat";
import { streamAgent } from "../../services/agent";
import type {
  AgentProgressEvent,
  AgentTimelineItem,
  ChatMessage,
  ChatMode,
  RagSource,
} from "./types";
import { getAgentToolLabel, summarizeToolResult } from "./utils";

function upsertTimelineItem(
  items: AgentTimelineItem[],
  nextItem: AgentTimelineItem,
): AgentTimelineItem[] {
  const exists = items.some((item) => item.id === nextItem.id);
  return exists
    ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...items, nextItem];
}

// 把后端运行事件转换为页面只负责展示的简短状态。
function applyAgentEvent(
  message: ChatMessage,
  event: AgentProgressEvent,
): Partial<ChatMessage> {
  let timeline = message.agentTimeline ?? [];
  let activity = message.agentActivity;

  if (event.type === "agent_start") {
    timeline = upsertTimelineItem(timeline, {
      id: "agent-start",
      label: "Agent 已启动",
      detail: `最多执行 ${event.max_steps} 个决策步骤`,
      status: "complete",
    });
  } else if (event.type === "phase") {
    if (event.phase === "decision") {
      return { agentActivity: "正在决定下一步" };
    }
    activity = "正在生成回答";
    timeline = upsertTimelineItem(timeline, {
      id: "generation",
      label: "正在生成回答",
      status: "pending",
    });
  } else if (event.type === "tool_call") {
    activity = "正在执行工具";
    timeline = upsertTimelineItem(timeline, {
      id: `tool-${event.step}`,
      label: `正在调用 ${getAgentToolLabel(event.tool_name)}`,
      status: "pending",
    });
  } else if (event.type === "tool_result") {
    activity = "正在处理结果";
    const failed = typeof event.result.error === "string";
    timeline = upsertTimelineItem(timeline, {
      id: `tool-${event.step}`,
      label: `${getAgentToolLabel(event.tool_name)}${failed ? "调用失败" : "调用完成"}`,
      detail: summarizeToolResult(event.tool_name, event.result),
      status: failed ? "warning" : "complete",
    });
  } else if (event.type === "retrieval") {
    timeline = upsertTimelineItem(timeline, {
      id: `tool-${event.step}`,
      label: "知识库检索完成",
      detail: `召回 ${event.retrieved_count} 条 → 重排保留 ${event.reranked_count} 条`,
      status: "complete",
    });
  } else if (event.type === "error") {
    activity = event.recoverable ? "正在重新尝试" : "执行失败";
    timeline = timeline.map((item) =>
      item.status === "pending"
        ? { ...item, status: event.recoverable ? "warning" : "error" }
        : item,
    );
    timeline = upsertTimelineItem(timeline, {
      id: `error-${event.step ?? "agent"}-${timeline.length}`,
      label: event.recoverable ? "Agent 已处理一次决策错误" : "Agent 执行失败",
      detail: event.message,
      status: event.recoverable ? "warning" : "error",
    });
  } else if (event.type === "final") {
    activity = undefined;
    timeline = upsertTimelineItem(timeline, {
      id: "generation",
      label: event.fallback ? "任务已安全结束，已生成降级说明" : "最终回答已完成",
      status: event.fallback ? "warning" : "complete",
    });
  }

  return { agentTimeline: timeline, agentActivity: activity };
}

// 管理三个模式的独立记录与请求状态；Agent 和 RAG 当前仅提交本轮输入。
export function useChat() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("general");
  const [messagesByMode, setMessagesByMode] = useState<
    Record<ChatMode, ChatMessage[]>
  >({
    general: [],
    knowledge: [],
    agent: [],
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const requestLock = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const messages = messagesByMode[mode];

  const canSubmit = input.trim().length > 0 && !isRequesting;

  // 切换模式时保留各自的展示记录，避免普通消息与知识库回答混杂。
  function handleModeChange(nextMode: ChatMode) {
    if (nextMode === mode || requestLock.current) return;

    setMode(nextMode);
    setInput("");
    setError(null);
  }

  // 按模式提交消息；三个模式都按 SSE 事件更新助手消息。
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // 阻止表单默认刷新页面。
    const content = input.trim();
    if (!content || requestLock.current) return; // 同步锁防止 React 状态更新前重复提交。
    requestLock.current = true;

    const requestMode = mode; // 固定本次请求的模式，避免异步期间状态变化。
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), // id 同时用于列表 key 和流式更新定位。
      role: "user",
      content,
    };
    const assistantId = crypto.randomUUID(); // 预留助手消息 id，后续按事件更新它。
    const nextMessages = [...messagesByMode[requestMode], userMessage];

    setMessagesByMode((current) => ({
      ...current,
      [requestMode]: [
        ...nextMessages,
        { id: assistantId, role: "assistant", content: "", status: "pending" }, // 空占位用于显示来源或输入中状态。
      ],
    }));
    setInput("");
    setError(null);
    setIsRequesting(true); // 请求期间禁用重复发送和模式切换。

    // 本轮回调共用定位信息，连续事件始终基于最新消息更新。
    const updateAssistant = (update: (message: ChatMessage) => Partial<ChatMessage>) => {
      setMessagesByMode((current) => ({
        ...current,
        [requestMode]: current[requestMode].map((message) =>
          message.id === assistantId ? { ...message, ...update(message) } : message,
        ),
      }));
    };

    // 三种模式收到文本时都追加到同一条助手消息；有来源的模式共用保存逻辑。
    const onChunk = (chunk: string) => {
      updateAssistant((message) => ({ content: message.content + chunk }));
    };
    const onSources = (sources: RagSource[]) => {
      updateAssistant(() => ({ sources }));
    };

    try {
      if (requestMode === "agent") {
        await streamAgent(content, {
          onStep: (step) => {
            updateAssistant(
              (message) => ({ agentSteps: [...(message.agentSteps ?? []), step] }),
            );
          },
          onChunk,
          onSources,
          onEvent: (agentEvent) => {
            updateAssistant((message) => applyAgentEvent(message, agentEvent));
          },
        });
      } else if (requestMode === "knowledge") {
        await streamRagChat(content, { onSources, onChunk });
      } else {
        await streamChat(nextMessages.filter((message) => message.content.trim()), onChunk);
      }
      updateAssistant(() => ({ status: "complete" }));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "请求失败";
      setError(message);
      updateAssistant((current) => ({
        status: "failed",
        agentTimeline: current.agentTimeline?.map((item) =>
          item.status === "pending"
            ? { ...item, label: "执行已中断", status: "error" }
            : item,
        ),
      }));
    } finally {
      requestLock.current = false;
      setIsRequesting(false); // 无论成功或失败，都恢复发送状态。
    }
  }
  return {
    input,
    setInput,
    mode,
    messages,
    isRequesting,
    error,
    canSubmit,
    handleModeChange,
    handleSubmit,
  };
}
