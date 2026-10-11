from dataclasses import dataclass
from typing import Iterable

from rag.parsers.base import ParsedDocument


@dataclass
class DocumentChunk:
    """文档切分后得到的一小段文本。"""

    source: str
    category: str
    chunk_index: int
    content: str
    page: int | None = None

    @property
    def metadata(self) -> dict[str, str | int]:
        metadata: dict[str, str | int] = {
            "source": self.source,
            "category": self.category,
            "chunk_index": self.chunk_index,
        }
        if self.page is not None:
            metadata["page"] = self.page
        return metadata


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list[str]:
    """按字符切分文本，相邻片段保留 overlap 个字符的重叠。"""

    if chunk_size <= 0:
        raise ValueError("chunk_size 必须大于 0")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap 必须大于等于 0 且小于 chunk_size")

    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    step = chunk_size - overlap
    chunks: list[str] = []
    for start in range(0, len(normalized), step):
        chunk = normalized[start : start + chunk_size].strip()
        if chunk:
            chunks.append(chunk)
        if start + chunk_size >= len(normalized):
            break
    return chunks


def chunk_documents(
    documents: Iterable[ParsedDocument],
    chunk_size: int = 800,
    overlap: int = 150,
) -> list[DocumentChunk]:
    """把读取后的文档转换成带来源信息的文本片段。"""

    result: list[DocumentChunk] = []
    for document in documents:
        document_chunk_index = 0
        for section in document.sections:
            chunks = chunk_text(section.content, chunk_size, overlap)
            for content in chunks:
                result.append(
                    DocumentChunk(
                        source=document.filename,
                        category=document.category,
                        chunk_index=document_chunk_index,
                        content=content,
                        page=section.page,
                    )
                )
                document_chunk_index += 1
    return result
