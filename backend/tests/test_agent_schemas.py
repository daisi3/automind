import unittest

from agent.schemas import parse_agent_decision


TOOL_DECISION = (
    '{"tool_name":"vehicle_recognize",'
    '"arguments":{"image_url":"https://example.com/camry.jpg"}}'
)


class AgentDecisionParsingTests(unittest.TestCase):
    def test_parses_plain_json(self):
        decision = parse_agent_decision(TOOL_DECISION)

        self.assertEqual(decision.tool_name, "vehicle_recognize")

    def test_removes_json_code_fence(self):
        decision = parse_agent_decision(f"```json\n{TOOL_DECISION}\n```")

        self.assertEqual(decision.arguments["image_url"], "https://example.com/camry.jpg")

    def test_removes_plain_code_fence(self):
        decision = parse_agent_decision(f"```\n{TOOL_DECISION}\n```")

        self.assertEqual(decision.tool_name, "vehicle_recognize")

    def test_extracts_json_surrounded_by_explanation(self):
        decision = parse_agent_decision(
            f"我将调用车辆识别工具：\n{TOOL_DECISION}\n请执行。"
        )

        self.assertEqual(decision.tool_name, "vehicle_recognize")

    def test_rejects_invalid_json(self):
        with self.assertRaisesRegex(ValueError, "LLM 决策不是合法 JSON"):
            parse_agent_decision('{"tool_name": }')

    def test_rejects_json_with_invalid_decision_fields(self):
        with self.assertRaisesRegex(ValueError, "LLM 决策字段不合法"):
            parse_agent_decision('{"tool_name": null}')


if __name__ == "__main__":
    unittest.main()
