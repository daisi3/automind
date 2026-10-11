from dataclasses import replace

import httpx

from core.config import Settings, get_settings
from rag.retriever import SearchResult, search_chunks


class RerankError(RuntimeError):
    """千问 Reranker 调用失败时抛出的错误。"""


async def rerank_results(
    query: str,
    candidates: list[SearchResult],
    limit: int = 3,
    settings: Settings | None = None,
) -> list[SearchResult]:
    """把向量检索出的候选文本交给 Reranker，并返回重新排序后的前几条。"""

    if not candidates:
        return []
    if limit <= 0:
        raise ValueError("limit 必须大于 0")

    config = settings or get_settings()
    if not config.llm_api_key:
        raise RerankError("请先在 .env 中配置 LLM_API_KEY")

    # Reranker 不负责找资料，只比较已有候选文本哪一段最能回答问题。
    payload = {
        "model": config.rerank_model,
        "query": query,
        "documents": [candidate.content for candidate in candidates],
        "top_n": min(limit, len(candidates)),
        "instruct": "Given a question, rank passages by how well they directly answer it.",
    }
    headers = {
        "Authorization": f"Bearer {config.llm_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(config.rerank_base_url, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RerankError(f"Reranker 请求失败：{exc}") from exc

    data = response.json()
    if data.get("code"):
        raise RerankError(data.get("message", "Reranker 返回错误"))

    # qwen3-rerank 的 results 在顶层；也兼容其他千问 Reranker 的 output.results 格式。
    ranked_items = data.get("results") or data.get("output", {}).get("results")
    if not isinstance(ranked_items, list):
        raise RerankError("Reranker 返回格式不符合预期")

    ranked_results: list[SearchResult] = []
    for item in ranked_items:
        index = item.get("index")
        relevance_score = item.get("relevance_score")
        if not isinstance(index, int) or not 0 <= index < len(candidates):
            continue
        if not isinstance(relevance_score, (int, float)):
            continue
        ranked_results.append(
            replace(candidates[index], rerank_score=round(float(relevance_score), 4))
        )

    return ranked_results


async def search_and_rerank(
    query: str,
    candidate_limit: int = 10,
    limit: int = 3,
) -> list[SearchResult]:
    """完整的两阶段检索：向量搜索 Top-K，再用 Reranker 保留更相关的结果。"""

    candidates = await search_chunks(query, limit=candidate_limit)
    return await rerank_results(query, candidates, limit=limit)
