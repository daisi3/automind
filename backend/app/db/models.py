from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


# Mapped[X] 只是类型注解（给 IDE 看）；mapped_column(类型, 约束) 才真正定义数据库列。
class Document(Base):
    """一份上传的原始文档。"""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)  # 主键 = 每行的唯一身份证。
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False  # 时间由数据库生成（NOW()），不是 Python 传的。
    )

    chunks: Mapped[list["Chunk"]] = relationship(
        # 声明"跳转通道"：doc.chunks 自动查 document_id=doc.id 的所有切片（数据库里只有外键列，没有这个字段）。
        back_populates="document",  # 和 Chunk.document 是同一对关系的两端，互相指认、保持同步。
        cascade="all, delete-orphan",  # 删文档时连带删它的切片。
    )


class Chunk(Base):
    """文档切分后的文本片段和它对应的向量。"""

    __tablename__ = "chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False  # 外键：存"我属于哪个文档"；CASCADE = 文档被删时数据库自动删我。
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 暂不限制向量维度，等选定 Embedding 模型后再加索引和维度约束。
    embedding = mapped_column(Vector(), nullable=True)  # 向量列（存数字数组），先允许为空（还没算向量）。
    metadata_json: Mapped[dict] = mapped_column(
        "metadata", JSON, nullable=False, default=dict  # 第一个参数是数据库列名；default=dict 传函数本身，保证每个对象独立空字典。
    )

    document: Mapped[Document] = relationship(back_populates="chunks")  # 反向通道：chunk.document 自动查它属于的文档。

