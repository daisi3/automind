from agent.react_agent import ReactAgent
from core.config import Settings
from tools.rag_search import RagSearchTool
from tools.registry import ToolRegistry
from tools.vehicle_recognize import VehicleRecognizeTool


def create_agent(settings: Settings) -> ReactAgent:
    """创建带有项目默认工具的 Agent。"""

    registry = ToolRegistry()
    registry.register(VehicleRecognizeTool())
    registry.register(RagSearchTool())
    return ReactAgent(registry, settings=settings)
