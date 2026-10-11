from pathlib import Path

from core.config import PROJECT_ROOT
from rag.parsers import PARSERS, parse_document
from rag.parsers.base import ParsedDocument


def load_knowledge_documents(
    knowledge_dir: Path | None = None,
) -> list[ParsedDocument]:
    """读取 knowledge 目录中所有已登记格式的文件。"""

    root = knowledge_dir or PROJECT_ROOT / "knowledge"
    if not root.exists():
        raise FileNotFoundError(f"知识库目录不存在：{root}")

    documents: list[ParsedDocument] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in PARSERS:
            continue
        content = path.read_bytes()
        if not content.strip():
            continue

        documents.append(
            parse_document(content, path.name, path.parent.name, str(path))
        )

    return documents
