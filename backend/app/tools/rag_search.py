from typing import Any

from rag.retriever import search_chunks
from rag.reranker import rerank_results
from tools.base import Tool


class RagSearchTool(Tool):
    """把现有 RAG 检索能力包装成 Agent 可调用工具。"""

    name = "rag_search"
    description = "从汽车知识库中检索能够回答问题的资料，并返回文本、来源和页码。"
    parameter_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "minLength": 1,
                "description": "要在汽车知识库中查找的问题，例如：Toyota Camry 保养注意事项。",
            }
        },
        "required": ["query"],
        "additionalProperties": False,
    }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        query = arguments["query"].strip()

        # 工具内部复用完整检索链路：向量检索 Top 10 → Reranker Top 3。
        candidates = await search_chunks(query, limit=10)
        results = await rerank_results(query, candidates, limit=3)

        return {
            "query": query,
            "retrieved_count": len(candidates),
            "reranked_count": len(results),
            "results": [result.to_dict() for result in results],
        }
