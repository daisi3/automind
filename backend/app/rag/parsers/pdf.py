from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError, PdfStreamError

from rag.parsers.base import DocumentSection, ParsedDocument


def parse_pdf(content: bytes, filename: str, category: str, path: str) -> ParsedDocument:
    """按页提取 PDF 文字，并保留原始页码。"""

    try:
        reader = PdfReader(BytesIO(content))
        sections = [
            DocumentSection(content=text, page=page_number)
            for page_number, page in enumerate(reader.pages, start=1)
            if (text := (page.extract_text() or "").strip())
        ]
    except (PdfReadError, PdfStreamError, OSError) as exc:
        raise ValueError(f"PDF 解析失败：{exc}") from exc

    if not sections:
        raise ValueError("PDF 中没有提取到可用文字，可能是扫描图片 PDF")

    return ParsedDocument(
        filename=filename,
        path=path,
        category=category,
        sections=sections,
    )
