import {
  ArrowUp,
  BookOpen,
  MessageCircle,
  Sparkles,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import LoadingDots from "../../components/LoadingDots";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { Button } from "../../components/ui/button";
import AgentTimeline from "./components/AgentTimeline";
import AgentTrace from "./components/AgentTrace";
import RagSources from "./components/RagSources";
import { modeCopy, quickPromptsByMode } from "./constants";
import { useChat } from "./hooks";
import type { ChatMode } from "./types";

const chatModes = [
  { value: "general", icon: MessageCircle },
  { value: "knowledge", icon: BookOpen },
  { value: "agent", icon: Workflow },
] satisfies Array<{ value: ChatMode; icon: typeof MessageCircle }>;

// 组合 Chat 页面三种模式的输入区、回答与工具执行记录。
function ChatPage() {
  const {
    input,
    setInput,
    mode,
    messages,
    isRequesting,
    error,
    canSubmit,
    handleModeChange,
    handleSubmit,
  } = useChat();
  const isKnowledgeMode = mode === "knowledge";
  const modeInfo = modeCopy[mode];
  const quickPrompts = quickPromptsByMode[mode];
  const messageScrollRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldFollowLatestRef = useRef(true);
  const latestMessage = messages.at(-1);

  // 将消息末尾滚入视口，兼容桌面内部滚动和移动端页面滚动。
  const scrollToLatest = useCallback((behavior: ScrollBehavior) => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  // 新消息加入或切换模式时，主动定位到该模式的最新对话。
  useEffect(() => {
    if (messages.length === 0) return;

    shouldFollowLatestRef.current = true;
    const frameId = requestAnimationFrame(() => scrollToLatest("smooth"));
    return () => cancelAnimationFrame(frameId);
  }, [messages.length, mode, scrollToLatest]);

  // 流式事件更新最后一条消息时，仅在用户没有向上翻阅时跟随。
  useEffect(() => {
    if (!latestMessage || !shouldFollowLatestRef.current) return;

    const frameId = requestAnimationFrame(() => scrollToLatest("auto"));
    return () => cancelAnimationFrame(frameId);
  }, [latestMessage, scrollToLatest]);

  // 用户离开底部后暂停流式跟随，回到底部时自动恢复。
  function handleMessageScroll() {
    const container = messageScrollRef.current;
    if (!container) return;

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldFollowLatestRef.current = distanceToBottom <= 96;
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#fafafa] md:h-[100dvh]">
      <section
        className="min-h-0 flex-1 overflow-y-auto px-5 py-8 md:px-10 md:py-10"
        aria-live="polite"
        ref={messageScrollRef}
        onScroll={handleMessageScroll}
      >
        {messages.length === 0 ? (
          <div className="@container mx-auto w-full max-w-3xl py-12 md:py-20">
            <div className="inline-flex items-center gap-2 text-base font-medium text-zinc-500">
              {mode === "agent" ? (
                <Workflow className="size-4 text-emerald-700" />
              ) : isKnowledgeMode ? (
                <BookOpen className="size-4 text-emerald-700" />
              ) : (
                <Sparkles className="size-4 text-emerald-700" />
              )}
              {mode === "agent"
                ? "AUTOMIND AGENT"
                : isKnowledgeMode
                  ? "KNOWLEDGE-BASED ANSWERING"
                  : "AUTOMOTIVE AI ASSISTANT"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-zinc-950 md:text-4xl">
              {modeInfo.welcome}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-500">
              {modeInfo.detail}
            </p>

            <div className="mt-10 grid grid-cols-1 gap-2 @lg:grid-cols-2 @2xl:grid-cols-3">
              {quickPrompts.map((prompt) => (
                <button
                  className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 text-left text-base leading-6 text-zinc-700 [overflow-wrap:anywhere] transition-colors hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl py-3 md:py-6">
            {messages.map((message) => (
              <article
                className={`mb-8 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                key={message.id}
              >
                <div
                  className={`text-[15px] leading-7 ${
                    message.role === "user"
                      ? "max-w-[88%] rounded-2xl rounded-br-md bg-zinc-200 px-4 py-2.5 text-zinc-900 md:max-w-[82%]"
                      : "w-full max-w-[88%] text-zinc-800 md:max-w-[82%]"
                  }`}
                >
                  {message.role === "assistant" &&
                    message.agentTimeline &&
                    message.agentTimeline.length > 0 && (
                      <AgentTimeline
                        items={message.agentTimeline}
                        isRunning={message.status === "pending"}
                        activity={message.agentActivity}
                      />
                    )}

                  {message.content ? (
                    message.role === "assistant" ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p>{message.content}</p>
                    )
                  ) : message.status === "pending" ? (
                    message.agentTimeline?.length ? null : <LoadingDots />
                  ) : (
                    <p className="text-sm text-zinc-500">
                      {message.status === "failed"
                        ? "本次请求未完成，请重试。"
                        : "本次没有返回回答文本。"}
                    </p>
                  )}

                  {message.role === "assistant" &&
                    message.status !== "pending" && (
                      <>
                        {message.agentSteps && (
                          <AgentTrace steps={message.agentSteps} />
                        )}
                        {message.sources && message.sources.length > 0 && (
                          <RagSources sources={message.sources} />
                        )}
                      </>
                    )}
                  {message.content && message.status === "failed" && (
                    <p className="mt-2 text-xs text-red-600">
                      回答中断，已保留收到的内容。
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </section>

      <div className="border-t border-zinc-200/80 bg-[#fafafa] px-5 pb-5 pt-4 md:px-10 md:pb-7">
        <div className="mx-auto w-full max-w-3xl">
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

          <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
            <div
              className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"
              role="group"
              aria-label="选择对话模式"
            >
              {chatModes.map(({ value, icon: Icon }) => (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${mode === value ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}
                  key={value}
                  aria-pressed={mode === value}
                  disabled={isRequesting}
                  type="button"
                  onClick={() => handleModeChange(value)}
                >
                  <Icon className="size-3.5" />
                  <span>{modeCopy[value].label}</span>
                </button>
              ))}
            </div>
            <span className="text-xs text-zinc-400">
              {modeInfo.description}
            </span>
          </div>

          <form
            className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm transition-shadow focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="chat-input">
              输入问题
            </label>
            <textarea
              className="min-h-11 max-h-44 flex-1 resize-y border-0 bg-transparent px-3 py-2 text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
              id="chat-input"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  // 回车和发送按钮共用同一个表单提交入口。
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                mode === "agent"
                  ? "输入任务，可在问题中附上测试图片 URL…"
                  : isKnowledgeMode
                    ? "输入要从知识库检索的问题…"
                    : "输入你的汽车问题…"
              }
              rows={2}
              value={input}
            />
            <Button
              className="mb-0.5 rounded-xl"
              size="icon"
              type="submit"
              disabled={!canSubmit}
              aria-label="发送"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </Button>
          </form>
          <p className="mt-2 px-1 text-center text-[11px] text-zinc-400">
            Enter 发送 · Shift + Enter 换行
          </p>
        </div>
      </div>
    </main>
  );
}

export default ChatPage;
