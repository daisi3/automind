import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Workflow,
} from "lucide-react";
import { memo } from "react";
import type { AgentTimelineItem } from "../types";
import CollapsibleCard from "./CollapsibleCard";

function TimelineIcon({ status }: Pick<AgentTimelineItem, "status">) {
  if (status === "pending") {
    return <LoaderCircle className="size-4 motion-safe:animate-spin text-emerald-700" />;
  }
  if (status === "error") {
    return <AlertCircle className="size-4 text-red-600" />;
  }
  if (status === "warning") {
    return <CircleAlert className="size-4 text-amber-600" />;
  }
  return <CheckCircle2 className="size-4 text-emerald-700" />;
}

// 实时展示公开的执行状态，不展示模型内部思考过程。
function AgentTimeline({
  items,
  isRunning,
  activity,
}: {
  items: AgentTimelineItem[];
  isRunning: boolean;
  activity?: string;
}) {
  return (
    <CollapsibleCard
      className="mb-4"
      defaultOpen
      icon={<Workflow className="size-4" />}
      title="Agent 执行过程"
      trailing={
        <span className="inline-flex items-center gap-1.5">
          {isRunning && (
            <LoaderCircle
              className="size-3 motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}
          {isRunning ? activity ?? "执行中" : "已结束"}
        </span>
      }
    >
      <ol className="space-y-2.5">
        {items.map((item) => (
          <li
            className="flex gap-2.5 motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:starting:translate-y-1 motion-safe:starting:opacity-0"
            key={item.id}
          >
            <span className="mt-1 shrink-0" aria-hidden="true">
              <TimelineIcon status={item.status} />
            </span>
            <div className="min-w-0">
              <p className="leading-6 text-zinc-700">{item.label}</p>
              {item.detail && (
                <p className="break-words text-xs leading-5 text-zinc-500">
                  {item.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </CollapsibleCard>
  );
}

export default memo(AgentTimeline);
