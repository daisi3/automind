from pathlib import Path
from typing import Callable

from rag.parsers.base import ParsedDocument
from rag.parsers.markdown import parse_markdown
from rag.parsers.pdf import parse_pdf


Parser = Callable[[bytes, str, str, str], ParsedDocument]

# 新增文件类型时，在这里登记对应解析函数。
PARSERS: dict[str, Parser] = {
    ".md": parse_markdown,
    ".pdf": parse_pdf,
}


def parse_document(content: bytes, filename: str, category: str, path: str) -> ParsedDocument:
    """按扩展名选择解析器，再返回统一文档结构。"""

    parser = PARSERS.get(Path(filename).suffix.lower())
    if parser is None:
        raise ValueError("目前只支持 .md 或 .pdf 文件")
    return parser(content, filename, category, path)
