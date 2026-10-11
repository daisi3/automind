import type { ChatMode } from "./types";

export const agentToolLabels: Record<string, string> = {
  vehicle_recognize: "车辆识别（Mock）",
  rag_search: "知识库检索",
};

export const quickPromptsByMode: Record<ChatMode, string[]> = {
  general: [
    "这辆车的推荐胎压是多少？",
    "常规保养时需要检查哪些项目？",
    "仪表盘警告灯亮起时应该怎么办？",
  ],
  agent: [
    "识别 https://example.com/camry-front.jpg，然后查询这款车的保养注意事项。",
    "识别 https://example.com/model3-front.jpg，然后查询这款车的充电安全注意事项。",
    "识别 https://example.com/accord-front.jpg，然后查询这款车的保养注意事项。",
  ],
  knowledge: [
    "充电口蓝色常亮说明什么？",
    "请说明轮胎保养的注意事项。",
    "知识库中有哪些与充电安全相关的资料？",
  ],
};

export const modeCopy: Record<
  ChatMode,
  { label: string; description: string; welcome: string; detail: string }
> = {
  general: {
    label: "普通聊天",
    description: "基于当前对话历史进行回答",
    welcome: "你好，我是 AutoMind",
    detail: "为你解答用车、保养、故障与汽车知识问题。",
  },
  agent: {
    label: "Agent 多工具",
    description: "模型自主调用工具 · 每次独立执行",
    welcome: "让 AutoMind 帮你完成任务",
    detail: "提供车辆测试图片 URL 和任务要求，Agent 会自主选择工具并给出答案。车辆识别当前为 Mock，支持 URL 中含 camry、model3、accord。",
  },
  knowledge: {
    label: "知识库问答",
    description: "检索已上传资料并附上来源",
    welcome: "从知识库中查找答案",
    detail: "每次提问会独立检索已上传资料，并在回答中标注参考来源。",
  },
};
