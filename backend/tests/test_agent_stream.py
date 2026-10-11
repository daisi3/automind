import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from agent.events import (
    AgentStartEvent,
    FinalEvent,
    RetrievalEvent,
    TokenEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from agent.react_agent import ReactAgent
from main import app
from rag.retriever import SearchResult
from tools.registry import ToolRegistry
from tools.rag_search import RagSearchTool
from tools.vehicle_recognize import VehicleRecognizeTool


class AgentStreamTests(unittest.TestCase):
    def test_agent_emits_retrieval_summary(self):
        registry = ToolRegistry()
        registry.register(RagSearchTool())
        registry.execute = AsyncMock(
            return_value={
                "query": "Camry 保养",
                "retrieved_count": 10,
                "reranked_count": 3,
                "results": [],
            }
        )
        agent = ReactAgent(
            registry,
            max_steps=3,
            settings=SimpleNamespace(llm_api_key="test"),
        )

        async def fake_stream_chat(messages, settings):
            yield "检索完成"

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("查询保养")]

        decisions = [
            '{"tool_name":"rag_search","arguments":{"query":"Camry 保养"}}',
            '{"tool_name":null,"answer":"准备回答"}',
        ]
        with patch(
            "agent.react_agent.complete_chat", side_effect=decisions
        ), patch("agent.react_agent.stream_chat", side_effect=fake_stream_chat):
            events = asyncio.run(collect_events())

        self.assertEqual(
            [event["type"] for event in events],
            [
                "agent_start",
                "phase",
                "tool_call",
                "tool_result",
                "retrieval",
                "phase",
                "phase",
                "token",
                "final",
            ],
        )
        self.assertEqual(events[4]["retrieved_count"], 10)
        self.assertEqual(events[4]["reranked_count"], 3)

    def test_agent_returns_fallback_after_max_steps(self):
        agent = ReactAgent(
            ToolRegistry(),
            max_steps=2,
            settings=SimpleNamespace(llm_api_key="test"),
        )

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("你好")]

        with patch(
            "agent.react_agent.complete_chat",
            side_effect=["非法输出一", "非法输出二"],
        ), patch("agent.react_agent.stream_chat") as final_stream:
            events = asyncio.run(collect_events())

        final_stream.assert_not_called()
        self.assertEqual(
            [event["type"] for event in events],
            ["agent_start", "phase", "error", "phase", "error", "token", "final"],
        )
        self.assertIn("2 个决策步骤内仍未完成", events[-2]["token"])
        self.assertIn("避免无限循环", events[-2]["token"])
        self.assertTrue(events[-1]["fallback"])

    def test_agent_stops_third_identical_tool_call(self):
        registry = ToolRegistry()
        registry.register(VehicleRecognizeTool())
        registry.execute = AsyncMock(return_value={"model": "Camry"})
        agent = ReactAgent(
            registry,
            max_steps=5,
            settings=SimpleNamespace(llm_api_key="test"),
        )
        repeated_decision = (
            '{"tool_name":"vehicle_recognize",'
            '"arguments":{"image_url":"https://example.com/camry.jpg"}}'
        )

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("识别车辆")]

        with patch(
            "agent.react_agent.complete_chat",
            side_effect=[repeated_decision, repeated_decision, repeated_decision],
        ), patch("agent.react_agent.stream_chat") as final_stream:
            events = asyncio.run(collect_events())

        self.assertEqual(registry.execute.await_count, 2)
        final_stream.assert_not_called()
        self.assertEqual(
            [event["type"] for event in events],
            [
                "agent_start",
                "phase",
                "tool_call",
                "tool_result",
                "phase",
                "tool_call",
                "tool_result",
                "phase",
                "tool_call",
                "tool_result",
                "token",
                "final",
            ],
        )
        self.assertTrue(events[9]["result"]["repeated_call"])
        self.assertIn("多次重复调用 vehicle_recognize", events[-2]["token"])

    def test_agent_can_correct_unknown_tool(self):
        agent = ReactAgent(
            ToolRegistry(),
            max_steps=3,
            settings=SimpleNamespace(llm_api_key="test"),
        )

        async def fake_stream_chat(messages, settings):
            yield "已改用直接回答"

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("查询资料")]

        decisions = [
            '{"tool_name":"google_search","arguments":{"query":"汽车"}}',
            '{"tool_name":null,"answer":"准备回答"}',
        ]
        with patch(
            "agent.react_agent.complete_chat", side_effect=decisions
        ), patch("agent.react_agent.stream_chat", side_effect=fake_stream_chat):
            events = asyncio.run(collect_events())

        self.assertIn("未找到工具：google_search", events[3]["result"]["error"])
        self.assertEqual(events[-2], {"type": "token", "token": "已改用直接回答"})
        self.assertEqual(events[-1]["type"], "final")

    def test_agent_can_correct_invalid_tool_arguments(self):
        registry = ToolRegistry()
        registry.register(VehicleRecognizeTool())
        agent = ReactAgent(
            registry,
            max_steps=4,
            settings=SimpleNamespace(llm_api_key="test"),
        )

        async def fake_stream_chat(messages, settings):
            yield "参数修正成功"

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("识别车辆")]

        decisions = [
            '{"tool_name":"vehicle_recognize","arguments":{"image":"camry.jpg"}}',
            (
                '{"tool_name":"vehicle_recognize",'
                '"arguments":{"image_url":"https://example.com/camry.jpg"}}'
            ),
            '{"tool_name":null,"answer":"准备回答"}',
        ]
        with patch(
            "agent.react_agent.complete_chat", side_effect=decisions
        ), patch("agent.react_agent.stream_chat", side_effect=fake_stream_chat):
            events = asyncio.run(collect_events())

        first_error = events[3]["result"]["error"]
        self.assertIn("缺少必填参数 image_url", first_error)
        self.assertIn("不支持参数 image", first_error)
        self.assertEqual(events[6]["result"]["model"], "Camry")
        self.assertEqual(events[-2], {"type": "token", "token": "参数修正成功"})

    def test_agent_retries_after_invalid_json_decision(self):
        registry = ToolRegistry()
        agent = ReactAgent(
            registry,
            max_steps=3,
            settings=SimpleNamespace(llm_api_key="test"),
        )
        decision_calls = []
        decisions = iter(
            [
                "这不是 JSON",
                '{"tool_name":null,"answer":"准备回答"}',
            ]
        )

        async def fake_complete_chat(messages, settings):
            decision_calls.append([message.copy() for message in messages])
            return next(decisions)

        async def fake_stream_chat(messages, settings):
            yield "已恢复回答"

        async def collect_events():
            return [event.model_dump() async for event in agent.stream_events("你好")]

        with patch(
            "agent.react_agent.complete_chat", side_effect=fake_complete_chat
        ), patch("agent.react_agent.stream_chat", side_effect=fake_stream_chat):
            events = asyncio.run(collect_events())

        self.assertEqual(len(decision_calls), 2)
        self.assertIn("上一步决策格式错误", decision_calls[1][-1]["content"])
        self.assertEqual(
            [event["type"] for event in events],
            ["agent_start", "phase", "error", "phase", "phase", "token", "final"],
        )
        self.assertTrue(events[2]["recoverable"])
        self.assertEqual(events[5]["token"], "已恢复回答")

    def test_chat_endpoints_keep_their_sse_event_order(self):
        async def fake_stream_chat(messages, settings):
            yield "你"
            yield "好"

        async def fake_search(question, candidate_limit, limit):
            return [
                SearchResult(
                    content="保养资料",
                    score=0.8,
                    source="camry.md",
                    page=None,
                    chunk_index=0,
                    rerank_score=0.9,
                )
            ]

        with patch("main.get_settings", return_value=SimpleNamespace(llm_api_key="test")), patch(
            "main.stream_chat", side_effect=fake_stream_chat
        ), patch("main.search_and_rerank", side_effect=fake_search):
            client = TestClient(app)
            chat_response = client.post(
                "/api/chat", json={"messages": [{"role": "user", "content": "你好"}]}
            )
            rag_response = client.post("/api/rag/chat", json={"question": "保养"})

        def event_types(response):
            data = [line[6:] for line in response.text.splitlines() if line.startswith("data: ")]
            return [event if event == "[DONE]" else json.loads(event).get("type", "delta") for event in data]

        self.assertEqual(event_types(chat_response), ["delta", "delta", "[DONE]"])
        self.assertEqual(event_types(rag_response), ["sources", "delta", "delta", "[DONE]"])

    def test_agent_streams_real_answer_chunks_after_tool_decision(self):
        registry = ToolRegistry()
        registry.register(VehicleRecognizeTool())
        agent = ReactAgent(
            registry,
            max_steps=3,
            settings=SimpleNamespace(llm_api_key="test"),
        )

        async def fake_stream_chat(messages, settings):
            self.assertIn("工具执行结果", messages[1]["content"])
            yield "这辆车"
            yield "是 Camry。"

        async def collect_events():
            return [
                event.model_dump()
                async for event in agent.stream_events(
                    "识别这张车图 https://example.com/camry.jpg"
                )
            ]

        decisions = [
            '{"tool_name":"vehicle_recognize","arguments":{"image_url":"https://example.com/camry.jpg"}}',
            '{"tool_name":null,"answer":"准备回答"}',
        ]
        with patch("agent.react_agent.complete_chat", side_effect=decisions), patch(
            "agent.react_agent.stream_chat", side_effect=fake_stream_chat
        ):
            events = asyncio.run(collect_events())

        self.assertEqual(
            [event["type"] for event in events],
            ["agent_start", "phase", "tool_call", "tool_result", "phase", "phase", "token", "token", "final"],
        )
        self.assertEqual(events[2]["tool_name"], "vehicle_recognize")
        self.assertEqual(events[1]["phase"], "decision")
        self.assertEqual(events[5]["phase"], "generation")
        self.assertEqual(
            "".join(event["token"] for event in events if event["type"] == "token"),
            "这辆车是 Camry。",
        )

    def test_endpoint_sends_sources_after_answer(self):
        async def fake_events(agent, user_input):
            yield AgentStartEvent(max_steps=5)
            yield ToolCallEvent(
                step=1,
                tool_name="rag_search",
                arguments={"query": user_input},
            )
            yield ToolResultEvent(
                step=1,
                tool_name="rag_search",
                result={
                    "query": user_input,
                    "retrieved_count": 10,
                    "reranked_count": 1,
                    "results": [
                        {
                            "content": "保养资料内容",
                            "source": "camry.md",
                            "page": None,
                            "chunk_index": 0,
                            "score": 0.8,
                            "rerank_score": 0.9,
                        }
                    ],
                },
            )
            yield RetrievalEvent(
                step=1,
                query=user_input,
                retrieved_count=10,
                reranked_count=1,
            )
            yield TokenEvent(token="保养")
            yield TokenEvent(token="建议")
            yield FinalEvent(answer="保养建议")

        with patch("main.get_settings", return_value=SimpleNamespace(llm_api_key="test")), patch.object(
            ReactAgent, "stream_events", fake_events
        ):
            response = TestClient(app).post("/api/agent/chat", json={"message": "保养"})

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])
        events = [line.removeprefix("data: ") for line in response.text.splitlines() if line.startswith("data: ")]
        self.assertEqual(events[-1], "[DONE]")
        parsed = [json.loads(event) for event in events[:-1]]
        self.assertEqual(
            [event["type"] for event in parsed],
            [
                "agent_start",
                "tool_call",
                "tool_result",
                "retrieval",
                "token",
                "token",
                "final",
                "sources",
            ],
        )
        self.assertEqual(parsed[-1]["sources"][0]["source"], "camry.md")
        self.assertEqual(parsed[-1]["sources"][0]["chunk_index"], 0)


if __name__ == "__main__":
    unittest.main()
