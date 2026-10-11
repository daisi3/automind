from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AgentEvent(BaseModel):
    """所有 Agent 运行事件的共同基类。"""

    model_config = ConfigDict(extra="forbid")
    type: str


class AgentStartEvent(AgentEvent):
    type: Literal["agent_start"] = "agent_start"
    max_steps: int = Field(gt=0)


class AgentPhaseEvent(AgentEvent):
    type: Literal["phase"] = "phase"
    phase: Literal["decision", "generation"]
    step: int | None = Field(default=None, gt=0)


class ToolCallEvent(AgentEvent):
    type: Literal["tool_call"] = "tool_call"
    step: int = Field(gt=0)
    tool_name: str
    arguments: dict[str, Any]


class ToolResultEvent(AgentEvent):
    type: Literal["tool_result"] = "tool_result"
    step: int = Field(gt=0)
    tool_name: str
    result: dict[str, Any]


class RetrievalEvent(AgentEvent):
    type: Literal["retrieval"] = "retrieval"
    step: int = Field(gt=0)
    query: str
    retrieved_count: int = Field(ge=0)
    reranked_count: int = Field(ge=0)


class TokenEvent(AgentEvent):
    type: Literal["token"] = "token"
    token: str


class FinalEvent(AgentEvent):
    type: Literal["final"] = "final"
    answer: str
    fallback: bool = False


class AgentErrorEvent(AgentEvent):
    type: Literal["error"] = "error"
    message: str
    recoverable: bool = False
    step: int | None = Field(default=None, gt=0)
