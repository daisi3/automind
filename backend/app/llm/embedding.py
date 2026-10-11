from openai import AsyncOpenAI

from core.config import Settings, get_settings


async def embed_texts(
    texts: list[str],
    settings: Settings | None = None,
) -> list[list[float]]:
    """调用 Embedding 模型，把多段文本转换成向量。"""

    if not texts:
        return []

    config = settings or get_settings()
    if not config.llm_api_key:
        raise RuntimeError("请先在 .env 中配置 LLM_API_KEY")

    client = AsyncOpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url,
    )
    response = await client.embeddings.create(
        model=config.embedding_model,
        input=texts,
    )

    # API 可能不按输入顺序返回，按 index 恢复对应关系。
    ordered = sorted(response.data, key=lambda item: item.index)
    return [item.embedding for item in ordered]
