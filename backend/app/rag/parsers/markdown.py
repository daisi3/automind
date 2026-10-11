from rag.parsers.base import DocumentSection, ParsedDocument


def parse_markdown(content: bytes, filename: str, category: str, path: str) -> ParsedDocument:
    """把 UTF-8 Markdown 解析成统一文档结构。"""

    try:
        text = content.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ValueError("Markdown 文件必须使用 UTF-8 编码") from exc

    if not text:
        raise ValueError("Markdown 文件内容不能为空")

    return ParsedDocument(
        filename=filename,
        path=path,
        category=category,
        sections=[DocumentSection(content=text)],
    )
