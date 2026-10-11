from sqlalchemy.orm import DeclarativeBase


# 所有表模型继承它 = 登记进"户口本"；Base.metadata 攒着所有表，建表时扫它。
class Base(DeclarativeBase):
    """所有数据库表模型的公共基类。"""

