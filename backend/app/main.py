import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.events import AgentErrorEvent, AgentEvent, ToolResultEvent
from agent.factory import create_agent
from core.config import Settings, get_settings
from llm.client import stream_chat
from rag.ingest import ingest_documents
from rag.parsers import parse_document
from rag.prompt import build_rag_messages
from rag.retriever import search_chunks
from rag.reranker import RerankError, search_and_rerank


app = FastAPI(title="AutoMind Backend")

# 跨域：前端(3000)和后端(8000)端口不同，浏览器会拦请求，这里声明"允许 3000 访问"。
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    # BaseModel 定义请求体的"形状"，FastAPI 收到请求自动校验，不合法直接返回 422。
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class RagSearchRequest(BaseModel):
    """前端传来的知识库检索请求。"""

    query: str
    limit: int = Field(default=5, ge=1, le=10)
    rerank: bool = False


class RagChatRequest(BaseModel):
    """知识库问答接口只需要一条用户问题。"""

    question: str


class AgentChatRequest(BaseModel):
    """Agent 根据这段用户请求自行选择工具。"""

    message: str = Field(min_length=1)


MAX_UPLOAD_SIZE = 5 * 1024 * 1024
LLM_API_KEY_ERROR = "请先在 .env 中配置 LLM_API_KEY"


def require_llm_settings() -> Settings:
    """返回已配置模型密钥的设置。"""

    settings = get_settings()
    if not settings.llm_api_key:
        raise HTTPException(status_code=500, detail=LLM_API_KEY_ERROR)
    return settings


def build_snippet(content: str, max_length: int = 80) -> str:
    """把一个切片压成适合来源列表展示的短预览。"""

    normalized = " ".join(content.split())
    if len(normalized) <= max_length:
        return normalized
    return f"{normalized[:max_length]}…"


def build_source_payload(
    *,
    source: str,
    page: int | None,
    chunk_index: int,
    content: str,
    score: float,
    rerank_score: float,
) -> dict[str, Any]:
    """把检索结果转换成统一的前端来源结构。"""

    return {
        "source": source,
        "page": page,
        "chunk_index": chunk_index,
        "snippet": build_snippet(content),
        "score": score,
        "rerank_score": rerank_score,
    }


async def llm_events(
    messages: list[dict[str, str]], settings: Settings
) -> AsyncIterator[dict[str, Any]]:
    """把 LLM 的文本分块转换成各聊天接口共用的 delta 事件。"""

    async for chunk in stream_chat(messages, settings):
        yield {"delta": chunk}


async def sse_events(
    events: AsyncIterator[dict[str, Any] | AgentEvent],
) -> AsyncIterator[str]:
    """统一包装 SSE 格式，并在正常结束时发送结束标记。"""

    async for event in events:
        payload = event.model_dump() if isinstance(event, BaseModel) else event
        yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    settings = require_llm_settings()

    messages = [message.model_dump() for message in request.messages]  # Pydantic 对象 → 普通字典。

    # StreamingResponse = 告诉 FastAPI"这是流，边生成边发，别等全部算完"。
    return StreamingResponse(
        sse_events(llm_events(messages, settings)), media_type="text/event-stream"
    )


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...), category: str = "uploaded"):
    """上传一份 Markdown 或 PDF 文档，并完成切分、向量化和入库。"""

    filename = file.filename or ""
    content_bytes = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="文件不能超过 5 MB")

    try:
        document = parse_document(
            content_bytes, filename, category or "uploaded", f"uploaded/{filename}"
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        document_count, chunk_count = await ingest_documents([document])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"文档入库失败：{exc}") from exc

    return {
        "filename": filename,
        "category": document.category,
        "documents": document_count,
        "chunks": chunk_count,
    }


@app.post("/api/rag/search")
async def rag_search(request: RagSearchRequest):
    """只检索知识库，方便确认 RAG 找到的资料是否正确。"""

    try:
        if request.rerank:
            # 固定先取向量检索 Top 10，再由 Reranker 选出 request.limit 条。
            results = await search_and_rerank(
                request.query, candidate_limit=10, limit=request.limit
            )
        else:
            results = await search_chunks(request.query, request.limit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RerankError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"知识库检索失败：{exc}") from exc

    return {
        "query": request.query,
        "mode": "vector_rerank" if request.rerank else "vector_only",
        "results": [result.to_dict() for result in results],
    }


@app.post("/api/rag/chat")
async def rag_chat(request: RagChatRequest):
    """先检索知识库，再依据检索结果生成流式回答。"""

    settings = require_llm_settings()

    try:
        # 这里固定执行 RAG 的完整检索阶段：向量 Top 10 → Reranker Top 3。
        contexts = await search_and_rerank(request.question, candidate_limit=10, limit=3)
        messages = build_rag_messages(request.question, contexts)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RerankError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"知识库问答准备失败：{exc}") from exc

    sources = [
        build_source_payload(
            source=context.source,
            page=context.page,
            chunk_index=context.chunk_index,
            content=context.content,
            score=context.score,
            rerank_score=context.rerank_score,
        )
        for context in contexts
    ]

    async def event_stream():
        # 先把来源发给前端；之后继续沿用普通聊天的 delta + [DONE] 流式格式。
        yield {"type": "sources", "sources": sources}
        async for event in llm_events(messages, settings):
            yield event

    return StreamingResponse(sse_events(event_stream()), media_type="text/event-stream")


@app.post("/api/agent/chat")
async def agent_chat(request: AgentChatRequest):
    """运行手写 ReAct Agent，并用 SSE 发送工具步骤、回答及来源。"""

    settings = require_llm_settings()
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="用户问题不能为空")

    agent = create_agent(settings)

    async def event_stream():
        sources = []
        seen_sources = set()
        try:
            async for event in agent.stream_events(request.message):
                if isinstance(event, ToolResultEvent):
                    if event.tool_name == "rag_search":
                        for result in event.result.get("results", []):
                            key = (
                                result["source"],
                                result["page"],
                                result["chunk_index"],
                            )
                            if key in seen_sources:
                                continue
                            seen_sources.add(key)
                            sources.append(
                                build_source_payload(
                                    source=result["source"],
                                    page=result["page"],
                                    chunk_index=result["chunk_index"],
                                    content=result["content"],
                                    score=result["score"],
                                    rerank_score=result["rerank_score"],
                                )
                            )
                yield event

            if sources:
                yield {"type": "sources", "sources": sources}
        except Exception as exc:
            yield AgentErrorEvent(message=str(exc))

    return StreamingResponse(sse_events(event_stream()), media_type="text/event-stream")
