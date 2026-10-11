from dataclasses import dataclass

from sqlalchemy import select

from db.models import Chunk, Document
from db.session import SessionLocal
from llm.embedding import embed_texts


@dataclass
class SearchResult:
    """一次向量检索找到的文本片段。"""

    content: str
    score: float
    source: str
    page: int | None
    chunk_index: int | None
    rerank_score: float | None = None

    def to_dict(self) -> dict:
        """转换为 API 可以直接返回的普通字典。"""

        return {
            "content": self.content,
            "score": self.score,
            "source": self.source,
            "page": self.page,
            "chunk_index": self.chunk_index,
            "rerank_score": self.rerank_score,
        }


async def search_chunks(query: str, limit: int = 5) -> list[SearchResult]:
    """把用户问题转成向量，并找出最相近的 Top-K 文本片段。"""

    normalized_query = query.strip()
    if not normalized_query:
        raise ValueError("检索问题不能为空")
    if limit <= 0:
        raise ValueError("limit 必须大于 0")

    # 问题和文档必须使用同一个 Embedding 模型，两个向量才可以比较距离。
    query_vector = (await embed_texts([normalized_query]))[0]

    # cosine_distance 越小表示越接近；1 - distance 转成更直观的相似度分数。
    distance = Chunk.embedding.cosine_distance(query_vector)
    statement = (
        select(Chunk, Document.filename, distance.label("distance"))
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.embedding.is_not(None))
        .order_by(distance)
        .limit(limit)
    )

    with SessionLocal() as session:
        rows = session.execute(statement).all()

    results: list[SearchResult] = []
    for chunk, filename, chunk_distance in rows:
        metadata = chunk.metadata_json or {}
        results.append(
            SearchResult(
                content=chunk.content,
                score=round(1 - float(chunk_distance), 4),
                # 先使用 metadata 的 source；旧数据没有时，退回到 documents.filename。
                source=str(metadata.get("source", filename)),
                page=metadata.get("page"),
                chunk_index=metadata.get("chunk_index"),
            )
        )

    return results
