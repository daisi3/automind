import type { RagSource } from "../types";

// 兼容普通聊天接口的纯文本和常见 JSON 文本事件。
export function extractText(payload: string): string {
  if (!payload || payload === "[DONE]") return "";

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const value =
      parsed.delta ?? parsed.content ?? parsed.text ?? parsed.message ?? "";
    return typeof value === "string" ? value : "";
  } catch {
    return payload;
  }
}

// 校验来源事件并转换为前端字段命名。
export function extractSources(payload: string): RagSource[] | null {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.type !== "sources" || !Array.isArray(parsed.sources)) {
      return null;
    }

    return parsed.sources.flatMap((item) => {
      if (!item || typeof item !== "object") return [];

      const source = item as Record<string, unknown>;
      if (
        typeof source.source !== "string" ||
        typeof source.snippet !== "string" ||
        typeof source.score !== "number" ||
        typeof source.rerank_score !== "number" ||
        (source.page !== null && typeof source.page !== "number")
      ) {
        return [];
      }

      return [
        {
          source: source.source,
          page: source.page,
          chunkIndex:
            typeof source.chunk_index === "number" ? source.chunk_index : null,
          snippet: source.snippet,
          score: source.score,
          rerankScore: source.rerank_score,
        },
      ];
    });
  } catch {
    return null;
  }
}
