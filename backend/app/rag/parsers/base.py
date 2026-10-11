from dataclasses import dataclass


@dataclass
class DocumentSection:
    """文档中的一段原始文字；PDF 按页保存，Markdown 只有一段。"""

    content: str
    page: int | None = None


@dataclass
class ParsedDocument:
    """所有文件解析后交给切分和入库流程的统一结构。"""

    filename: str
    path: str
    category: str
    sections: list[DocumentSection]
