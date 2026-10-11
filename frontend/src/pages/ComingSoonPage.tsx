import { Link } from "react-router-dom";

interface ComingSoonPageProps {
  title: string;
}

// 展示尚未进入开发阶段的页面占位内容。
function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <main className="flex min-h-0 flex-1 items-center px-5 py-8 md:h-[100dvh] md:px-10 md:py-10">
      <section
        className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 md:p-12"
        aria-labelledby="page-title"
      >
        <span className="text-xs font-semibold tracking-[0.12em] text-emerald-700">
          AUTOMIND WORKSPACE
        </span>
        <h1
          className="mt-3 text-3xl font-semibold tracking-tight"
          id="page-title"
        >
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-zinc-500">
          这个页面将在后续阶段开发，当前先保留路由入口。
        </p>
        <Link
          className="mt-6 text-sm font-medium text-emerald-700 hover:text-emerald-800"
          to="/chat"
        >
          返回 Agent 对话
        </Link>
      </section>
    </main>
  );
}

export default ComingSoonPage;
