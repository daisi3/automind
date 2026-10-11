// 显示助手尚未返回文字时的轻量流式状态。
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2" aria-label="正在生成">
      <i className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
      <i className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
      <i className="size-1.5 animate-bounce rounded-full bg-zinc-400" />
    </span>
  );
}

export default LoadingDots;
