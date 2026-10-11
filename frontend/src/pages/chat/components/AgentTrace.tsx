import { Workflow } from "lucide-react";
import type { AgentStep } from "../types";
import { getAgentToolLabel, summarizeToolResult } from "../utils";
import CollapsibleCard from "./CollapsibleCard";

// 按后端返回顺序展示工具记录，参数与原始结果按需展开。
function AgentTrace({ steps }: { steps: AgentStep[] }) {
  return (
    <CollapsibleCard
      className="mt-4"
      icon={<Workflow className="size-4" />}
      title={`工具调用记录（${steps.length} 次）`}
    >
      {steps.length === 0 ? (
        <p className="text-zinc-500">本次 Agent 直接回答，未调用工具。</p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${step.step}-${index}`}>
              <p className="font-medium text-zinc-800">
                第 {step.step} 步 · {getAgentToolLabel(step.tool_name)}
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-zinc-500">
                {summarizeToolResult(step.tool_name, step.observation)}
              </p>
              <details className="mt-2 text-xs text-zinc-500">
                <summary className="cursor-pointer">参数与工具结果</summary>
                <p className="mt-2">工具：{step.tool_name}</p>
                <p className="mt-2">调用参数</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-50 p-2">
                  {JSON.stringify(step.arguments, null, 2)}
                </pre>
                <p className="mt-2">Observation</p>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-50 p-2">
                  {JSON.stringify(step.observation, null, 2)}
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </CollapsibleCard>
  );
}

export default AgentTrace;
