import asyncio
import unittest

from tools.base import ToolParameterError
from tools.registry import ToolRegistry
from tools.vehicle_recognize import VehicleRecognizeTool


class ToolRegistryValidationTests(unittest.TestCase):
    def setUp(self):
        self.registry = ToolRegistry()
        self.registry.register(VehicleRecognizeTool())

    def execute(self, arguments):
        return asyncio.run(self.registry.execute("vehicle_recognize", arguments))

    def test_valid_arguments_reach_tool(self):
        result = self.execute({"image_url": " https://example.com/camry.jpg "})

        self.assertEqual(result["model"], "Camry")
        self.assertEqual(result["image_url"], "https://example.com/camry.jpg")

    def test_missing_required_argument_is_rejected(self):
        with self.assertRaisesRegex(ToolParameterError, "缺少必填参数 image_url"):
            self.execute({})

    def test_unknown_argument_is_rejected(self):
        with self.assertRaisesRegex(ToolParameterError, "不支持参数 image"):
            self.execute({"image": "https://example.com/camry.jpg"})

    def test_wrong_argument_type_is_rejected(self):
        with self.assertRaisesRegex(ToolParameterError, "参数 image_url 必须是字符串"):
            self.execute({"image_url": 123})

    def test_empty_argument_is_rejected(self):
        with self.assertRaisesRegex(ToolParameterError, "参数 image_url 不能为空"):
            self.execute({"image_url": ""})

        with self.assertRaisesRegex(ToolParameterError, "参数 image_url 不能为空"):
            self.execute({"image_url": "   "})


if __name__ == "__main__":
    unittest.main()
