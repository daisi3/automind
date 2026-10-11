import json
import re
from typing import Any

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)


CODE_FENCE_PATTERN = re.compile(
    r"^```(?:json)?\s*(.*?)\s*```$",
    flags=re.IGNORECASE | re.DOTALL,
)
DECISION_FIELDS = {"tool_name", "arguments", "answer"}


class AgentDecision(BaseModel):
    """LLM 在 ReAct 每一步输出的唯一决策格式。"""

    # extra="forbid"：模型多输出未定义字段时立即报错，避免程序默默误解。
    model_config = ConfigDict(extra="forbid")

    tool_name: str | None = None
    arguments: dict[str, Any] = Field(default_factory=dict)
    answer: str | None = None

    @field_validator("tool_name", "answer", mode="before")
    @classmethod
    def strip_text(cls, value: Any) -> Any:
        """清理模型输出两端空白，空字符串按空处理。"""

        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_decision_type(self) -> "AgentDecision":
        """一次决定只能是“调用工具”或“最终回答”其中之一。"""

        if self.tool_name:
            if self.answer is not None:
                raise ValueError("调用工具时不能同时提供 answer")
            return self

        if not self.answer:
            raise ValueError("最终回答时必须提供非空 answer")
        if self.arguments:
            raise ValueError("最终回答时不能提供 arguments")
        return self

    @property
    def is_final(self) -> bool:
        """True 代表 Agent 已经决定结束并回答用户。"""

        return self.tool_name is None


def parse_agent_decision(raw_content: str) -> AgentDecision:
    """把 LLM 返回的 JSON 字符串转换并校验为 AgentDecision。"""

    cleaned = raw_content.strip()
    fence_match = CODE_FENCE_PATTERN.fullmatch(cleaned)
    if fence_match:
        cleaned = fence_match.group(1).strip()

    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        payload = _extract_json_object(cleaned)

    if not isinstance(payload, dict):
        raise ValueError("LLM 决策必须是 JSON 对象")

    try:
        return AgentDecision.model_validate(payload)
    except ValidationError as exc:
        problems = []
        for error in exc.errors(include_url=False, include_input=False):
            location = ".".join(str(part) for part in error["loc"]) or "决策"
            problems.append(f"{location}：{error['msg']}")
        raise ValueError("LLM 决策字段不合法：" + "；".join(problems)) from exc


def _extract_json_object(content: str) -> dict[str, Any]:
    """从解释文字或代码围栏中找到第一个完整 JSON 对象。"""

    decoder = json.JSONDecoder()
    for index, character in enumerate(content):
        if character != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(content[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and DECISION_FIELDS.intersection(payload):
            return payload

    raise ValueError("LLM 决策不是合法 JSON")
