import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

interface CollapsibleCardProps {
  title: ReactNode;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  trailing?: ReactNode;
  className?: string;
}

// 统一 Chat 页面信息卡片的边框、标题、箭头和折叠行为。
function CollapsibleCard({
  title,
  icon,
  children,
  defaultOpen = false,
  trailing,
  className,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={cn(
        "w-full rounded-lg border border-zinc-200 bg-white text-sm",
        className,
      )}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-zinc-400 transition-transform",
            isOpen && "rotate-90",
          )}
          aria-hidden="true"
        />
        <span className="shrink-0 text-emerald-700" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1">{title}</span>
        {trailing && (
          <span className="shrink-0 text-xs font-normal text-zinc-400">
            {trailing}
          </span>
        )}
      </summary>
      <div className="border-t border-zinc-100 px-3 py-3">{children}</div>
    </details>
  );
}

export default CollapsibleCard;
