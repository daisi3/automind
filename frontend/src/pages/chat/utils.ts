import { agentToolLabels } from "./constants";

export function getAgentToolLabel(toolName: string): string {
  return agentToolLabels[toolName] ?? toolName;
}

// 从工具实际返回值生成摘要，Timeline 和完整调用记录共用同一套文字。
export function summarizeToolResult(
  toolName: string,
  result: Record<string, unknown>,
): string {
  if (typeof result.error === "string") return `工具返回错误：${result.error}`;

  if (toolName === "vehicle_recognize") {
    if (typeof result.model !== "string") {
      return typeof result.message === "string" ? result.message : "未识别车型";
    }
    const vehicle = [result.brand, result.model, result.year]
      .filter((value) => typeof value === "string")
      .join(" · ");
    return typeof result.confidence === "number"
      ? `${vehicle} · 置信度 ${(result.confidence * 100).toFixed(0)}%`
      : vehicle;
  }

  if (toolName === "rag_search" && Array.isArray(result.results)) {
    return `命中 ${result.results.length} 个资料切片`;
  }

  return "工具已返回结果";
}
