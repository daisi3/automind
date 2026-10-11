from typing import Any

from tools.base import Tool


class ToolRegistry:
    """集中管理 Agent 可调用的全部工具。"""

    def __init__(self) -> None:
        # 字典的 key 是工具名，value 是工具对象；查找工具不需要遍历整个列表。
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """登记一个新工具，工具名不能重复。"""

        if not tool.name.strip():
            raise ValueError("工具 name 不能为空")
        if tool.name in self._tools:
            raise ValueError(f"工具已注册：{tool.name}")

        # 注册时就检查参数说明书，避免运行到一半才发现工具定义有问题。
        tool.argument_model
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool:
        """根据工具名取出工具；Agent 请求不存在的工具时给出明确错误。"""

        try:
            return self._tools[name]
        except KeyError as exc:
            raise ValueError(f"未找到工具：{name}") from exc

    def list_tools(self) -> list[dict[str, Any]]:
        """返回所有工具的说明书，后续会作为 LLM 的可用工具清单。"""

        return [tool.definition() for tool in self._tools.values()]

    async def execute(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """找到指定工具并执行；Registry 不关心工具内部如何完成工作。"""

        tool = self.get(name)
        validated_arguments = tool.validate_arguments(arguments)
        return await tool.execute(validated_arguments)
