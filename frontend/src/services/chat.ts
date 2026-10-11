import { streamSse } from "./api/client";
import { extractSources, extractText } from "./api/events";
import type { ChatInputMessage, RagSource } from "./types";

// 将聊天消息转换成接口参数并消费助手的流式文本。
export async function streamChat(
  messages: ChatInputMessage[],
  onChunk: (chunk: string) => void,
): Promise<void> {
  const body = {
    // 剥掉 id：大模型接口只需要 role/content 就能理解对话上下文。
    messages: messages.map(({ role, content }) => ({ role, content })),
  };
  await streamSse("/api/chat", body, (payload) => {
    const text = extractText(payload);
    if (text) onChunk(text); // 空块（如 [DONE]）不回调，避免追加空白。
  });
}

interface RagStreamHandlers {
  onChunk: (chunk: string) => void;
  onSources: (sources: RagSource[]) => void;
}

// 请求当前问题的知识库检索问答，并分别处理来源与文本流事件。
export async function streamRagChat(
  question: string,
  { onChunk, onSources }: RagStreamHandlers,
): Promise<void> {
  const body = { question };

  await streamSse("/api/rag/chat", body, (payload) => {
    const sources = extractSources(payload);
    if (sources) {
      onSources(sources);
      return;
    }

    const text = extractText(payload);
    if (text) onChunk(text);
  });
}
