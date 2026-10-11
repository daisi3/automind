from sqlalchemy import text

from db.base import Base
# 这行 import 没直接用，但必须写：让表模型类被定义、完成"户口登记"，建表才能扫到。
from db.models import Chunk, Document  # noqa: F401 - 注册表模型
from db.session import engine


def init_db() -> None:
    """创建向量扩展和当前阶段需要的两张表。"""

    with engine.begin() as connection:  # 开事务：跑完自动提交，出错自动回滚，用完自动关连接。
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))  # PostgreSQL 默认没有 vector 类型，先装 pgvector 扩展，否则建表会报错。

    Base.metadata.create_all(bind=engine)  # 扫户口本建表：已存在的表不会重建（可反复跑）。


if __name__ == "__main__":  # 只有直接运行（python -m db.init_db）才执行；被 import 时不跑。
    init_db()
    print("数据库初始化完成：documents、chunks")

