from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# core → app → backend → 项目根目录。
PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    llm_api_key: str = ""
    llm_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    llm_model: str = "qwen3.7-flash"
    llm_enable_thinking: bool = False
    embedding_model: str = "text-embedding-v4"
    rerank_model: str = "qwen3-rerank"
    rerank_base_url: str = "https://dashscope.aliyuncs.com/compatible-api/v1/reranks"
    database_url: str = "postgresql+psycopg://automind:automind_dev_password@127.0.0.1:5432/automind"

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """读取并缓存应用配置。"""

    return Settings()
