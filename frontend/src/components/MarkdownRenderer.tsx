import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

// 将 SSE 返回的 Markdown 渲染为紧凑、可阅读的回答内容。
function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 mt-7 text-2xl font-semibold tracking-tight first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-6 text-xl font-semibold tracking-tight first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-5 text-lg font-semibold first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 text-base">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0 text-base">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0 text-base">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-0.5 text-base">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-zinc-300 pl-4 text-zinc-600 last:mb-0 text-base">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800 text-base"
            href={href}
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => (
          <code
            className={
              className
                ? "block overflow-x-auto rounded-lg bg-zinc-950 p-3 text-sm leading-6 text-zinc-100"
                : "rounded bg-zinc-100 px-1.5 py-0.5 text-[0.95em] text-zinc-800"
            }
          >
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto last:mb-0 text-base">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-left text-base">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-zinc-200 bg-zinc-50 px-3 py-2 font-medium text-base">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-zinc-200 px-3 py-2 align-top text-base">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
