from typing import Any

from tools.base import Tool


class VehicleRecognizeTool(Tool):
    """第一版车辆识别工具：根据测试图片 URL 返回固定 Mock 结果。"""

    name = "vehicle_recognize"
    description = "根据车辆图片 URL 识别品牌、车型和年份。当前为 Mock，仅支持 Camry、Model 3、Accord 测试图片。"
    parameter_schema = {
        "type": "object",
        "properties": {
            "image_url": {
                "type": "string",
                "minLength": 1,
                "description": "车辆图片 URL，例如：https://example.com/camry-front.jpg。",
            }
        },
        "required": ["image_url"],
        "additionalProperties": False,
    }

    _mock_vehicles = {
        "camry": {"brand": "Toyota", "model": "Camry", "year": "2024", "confidence": 0.94},
        "model3": {"brand": "Tesla", "model": "Model 3", "year": "2024", "confidence": 0.96},
        "model-3": {"brand": "Tesla", "model": "Model 3", "year": "2024", "confidence": 0.96},
        "accord": {"brand": "Honda", "model": "Accord", "year": "2023", "confidence": 0.92},
    }

    async def execute(self, arguments: dict[str, Any]) -> dict[str, Any]:
        image_url = arguments["image_url"].strip()

        normalized_url = image_url.lower()
        for keyword, vehicle in self._mock_vehicles.items():
            if keyword in normalized_url:
                return {"image_url": image_url, **vehicle}

        return {
            "image_url": image_url,
            "brand": None,
            "model": None,
            "year": None,
            "confidence": 0.0,
            "message": "当前 Mock 未识别该图片 URL，请使用包含 camry、model3 或 accord 的测试 URL。",
        }
