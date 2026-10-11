import asyncio

from sqlalchemy import delete, select

from db.models import Chunk, Document
from db.session import SessionLocal
from llm.embedding import embed_texts
from rag.chunker import chunk_documents
from rag.loader import load_knowledge_documents
from rag.parsers.base import ParsedDocument


async def ingest_documents(documents: list[ParsedDocument]) -> tuple[int, int]:
    """把已读取的文档生成向量，并写入 documents 和 chunks。"""

    chunks = chunk_documents(documents)
    vectors = await embed_texts([chunk.content for chunk in chunks])

    if len(vectors) != len(chunks):
        raise RuntimeError("Embedding 返回数量与文本片段数量不一致")

    with SessionLocal() as session:
        for document in documents:
            old_document = session.scalar(
                select(Document).where(Document.filename == document.filename)
            )
            if old_document is not None:
                session.execute(
                    delete(Chunk).where(Chunk.document_id == old_document.id)
                )
                session.delete(old_document)

        # 同名文件采用整篇替换，flush 后才能安全复用文件名创建新记录。
        session.flush()

        document_rows: dict[str, Document] = {}
        for document in documents:
            row = Document(filename=document.filename)
            session.add(row)
            document_rows[document.filename] = row

        session.flush()

        for chunk, vector in zip(chunks, vectors, strict=True):
            session.add(
                Chunk(
                    document_id=document_rows[chunk.source].id,
                    content=chunk.content,
                    embedding=vector,
                    metadata_json=chunk.metadata,
                )
            )

        session.commit()

    return len(documents), len(chunks)


async def ingest_knowledge() -> tuple[int, int]:
    """读取 knowledge 目录、生成向量，并写入数据库。"""

    return await ingest_documents(load_knowledge_documents())


if __name__ == "__main__":
    document_count, chunk_count = asyncio.run(ingest_knowledge())
    print(f"入库完成：{document_count} 个文档，{chunk_count} 个文本片段")
