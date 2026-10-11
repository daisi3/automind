import { FileText } from "lucide-react";
import type { RagSource } from "../types";
import CollapsibleCard from "./CollapsibleCard";

interface GroupedRagSource {
  source: string;
  chunks: RagSource[];
}

// 同一文件的多个切片合为一条来源；保留每个切片，方便展开查看调试信息。
function groupSourcesByDocument(sources: RagSource[]): GroupedRagSource[] {
  const grouped = new Map<string, GroupedRagSource>();

  for (const source of sources) {
    const current = grouped.get(source.source);
    if (current) {
      current.chunks.push(source);
      continue;
    }

    grouped.set(source.source, {
      source: source.source,
      chunks: [source],
    });
  }

  return [...grouped.values()].map((group) => ({
    ...group,
    chunks: [...group.chunks].sort(
      (left, right) => (left.chunkIndex ?? -1) - (right.chunkIndex ?? -1),
    ),
  }));
}

// 合并同文档来源并展示命中的切片信息。
function RagSources({ sources }: { sources: RagSource[] }) {
  const groupedSources = groupSourcesByDocument(sources);

  return (
    <CollapsibleCard
      className="mt-4"
      icon={<FileText className="size-4" />}
      title={`参考来源（${groupedSources.length} 个文档）`}
    >
      <ul className="space-y-2 text-zinc-500">
        {groupedSources.map((group) => (
          <li key={group.source}>
            <p>
              {group.source} · 命中 {group.chunks.length} 段
            </p>
            <ul className="mt-1.5 space-y-1.5 text-xs text-zinc-400">
              {group.chunks.map((chunk, index) => (
                <li key={`${chunk.chunkIndex ?? "unknown"}-${index}`}>
                  <span>
                    {chunk.page === null ? "" : `第 ${chunk.page} 页 · `}
                    文档第{" "}
                    {chunk.chunkIndex === null
                      ? "未知"
                      : chunk.chunkIndex + 1}{" "}
                    个切片
                  </span>
                  <p>{chunk.snippet}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </CollapsibleCard>
  );
}


export default RagSources;
