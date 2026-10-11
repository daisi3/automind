from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from core.config import get_settings


# engine 是连接池"总闸"；create_engine 只是建闸，第一次真正用才连库（懒连接）。
engine = create_engine(
    get_settings().database_url,
    pool_pre_ping=True,  # 每次拿连接前先 ping 一下，防止拿到断掉的连接。
)
# SessionLocal 是"会话工厂"：以后 SessionLocal() 开一个工作现场；不自动提交，改完要自己 commit()。
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

