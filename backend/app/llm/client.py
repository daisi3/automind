from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from core.config import Settings, get_settings


async def complete_chat(
    messages: list[dict[str, str]],
    settings: Settings | None = None,
) -> str:
    """一次性获取完整回答，供 Agent 读取结构化 JSON 决策。"""

    config = settings or get_settings()
    client = AsyncOpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url,
    )

    response = await client.chat.completions.create(
        model=config.llm_model,
        messages=messages,
        stream=False,
        extra_body={"enable_thinking": config.llm_enable_thinking},
    )

    if not response.choices or not response.choices[0].message.content:
        raise RuntimeError("LLM 没有返回可用内容")
    return response.choices[0].message.content


async def stream_chat(
    messages: list[dict[str, str]],
    settings: Settings | None = None,  # 外部传配置；不传就用全局配置兜底。
) -> AsyncIterator[str]:
    config = settings or get_settings()
    client = AsyncOpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url,
    )

    stream = await client.chat.completions.create(
        model=config.llm_model,
        messages=messages,
        stream=True,  # 让模型"边想边说"，而不是一次性给完整答案。
        extra_body={"enable_thinking": config.llm_enable_thinking},
    )

    async for chunk in stream:  # 模型吐一块，这里接一块。
        # 千问偶尔会先发不带 choices 的状态事件，跳过它，别让整个 SSE 连接中断。
        if not chunk.choices:
            continue
        content = chunk.choices[0].delta.content  # delta = 这一块新增的文本。
        if content:
            yield content  # 接一块就交给调用方一块。
