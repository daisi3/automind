from abc import ABC, abstractmethod
from functools import cached_property
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError, create_model


JSON_TYPE_TO_PYTHON: dict[str, type[Any]] = {
    "string": str,
    "integer": int,
    "number": float,
    "boolean": bool,
    "array": list,
    "object": dict,
}


class ToolParameterError(ValueError):
    """LLM 给出的工具参数不符合工具说明书。"""


class Tool(ABC):
    """所有 Agent 工具都必须遵守的统一约定。"""

    # 子类负责填写这三项“工具说明书”。
    name: str
    description: str
    parameter_schema: dict[str, Any]

    @abstractmethod
    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """接收 Agent 给出的参数，执行工具，并返回可继续交给 LLM 的结果。"""

    @cached_property
    def argument_model(self) -> type[BaseModel]:
        """把工具的 JSON 参数说明书转换成统一的 Pydantic 校验模型。"""

        if self.parameter_schema.get("type") != "object":
            raise ValueError(f"工具 {self.name} 的 parameter_schema.type 必须是 object")

        properties = self.parameter_schema.get("properties", {})
        required = set(self.parameter_schema.get("required", []))
        fields: dict[str, tuple[type[Any], Any]] = {}

        for field_name, field_schema in properties.items():
            field_type = JSON_TYPE_TO_PYTHON.get(field_schema.get("type"))
            if field_type is None:
                raise ValueError(
                    f"工具 {self.name} 的参数 {field_name} 使用了不支持的类型"
                )

            field_options: dict[str, Any] = {
                "description": field_schema.get("description")
            }
            if field_type is str and "minLength" in field_schema:
                field_options["min_length"] = field_schema["minLength"]

            default = ... if field_name in required else None
            fields[field_name] = (field_type, Field(default, **field_options))

        unknown_required = required - properties.keys()
        if unknown_required:
            names = ", ".join(sorted(unknown_required))
            raise ValueError(f"工具 {self.name} 的 required 包含未定义参数：{names}")

        return create_model(
            f"{self.__class__.__name__}Arguments",
            __config__=ConfigDict(
                extra="forbid",
                strict=True,
                str_strip_whitespace=True,
            ),
            **fields,
        )

    def validate_arguments(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """统一校验参数，成功后返回只包含说明书字段的普通字典。"""

        if not isinstance(arguments, dict):
            raise ToolParameterError("工具参数必须是 JSON 对象")

        try:
            validated = self.argument_model.model_validate(arguments)
        except ValidationError as exc:
            problems = [self._format_validation_error(error) for error in exc.errors()]
            raise ToolParameterError("；".join(problems)) from exc

        return validated.model_dump(exclude_none=True)

    @staticmethod
    def _format_validation_error(error: dict[str, Any]) -> str:
        """把 Pydantic 错误转换成 Agent 能理解并自行修正的短句。"""

        field_name = ".".join(str(part) for part in error["loc"])
        error_type = error["type"]
        if error_type == "missing":
            return f"缺少必填参数 {field_name}"
        if error_type == "extra_forbidden":
            return f"不支持参数 {field_name}"
        if error_type == "string_type":
            return f"参数 {field_name} 必须是字符串"
        if error_type == "string_too_short":
            return f"参数 {field_name} 不能为空"
        if error_type == "int_type":
            return f"参数 {field_name} 必须是整数"
        if error_type == "float_type":
            return f"参数 {field_name} 必须是数字"
        if error_type == "bool_type":
            return f"参数 {field_name} 必须是布尔值"
        return f"参数 {field_name} 不合法：{error['msg']}"

    def definition(self) -> dict[str, Any]:
        """整理成 LLM 和 ToolRegistry 都能读取的工具描述。"""

        return {
            "name": self.name,
            "description": self.description,
            "parameter_schema": self.parameter_schema,
        }
