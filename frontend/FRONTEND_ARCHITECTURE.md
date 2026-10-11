# AutoMind 前端架构与开发规范

本文档是 AutoMind 前端后续开发的统一约定。当前已实现 Chat 和知识库导入页面；文档管理、检索调试等页面先保留路由入口和占位内容，功能开发时再扩展各自模块。

## 1. 技术栈

- React + TypeScript + Vite
- React Router：页面路由
- Tailwind CSS：默认样式方案
- `react-markdown` + `remark-gfm`：助手回答的 Markdown 渲染
- `lucide-react`：图标
- `class-variance-authority`、`clsx`、`tailwind-merge`：项目内 shadcn 风格基础组件
- shadcn/ui Sidebar：桌面导航折叠与移动端导航抽屉

不引入 Ant Design、Material UI 等带有完整视觉体系的大型组件库，避免和 AutoMind 的简洁界面风格冲突。

## 2. 视觉方向

页面参考 Perplexity 一类的 AI 工作台体验，但不复制其品牌设计。

- 浅灰页面背景、白色表面、细边框
- 以黑灰文字为主，绿色只作为小范围强调色
- 控制内容最大宽度，优先保证阅读体验
- 减少渐变、重阴影、过多卡片和装饰性标签
- Assistant 消息直接呈现 Markdown；用户消息使用轻量右侧气泡
- 桌面端侧栏可折叠为图标栏，只有内容区域滚动
- 移动端侧栏使用遮罩抽屉，不占用正文宽度

## 3. 目录结构

```text
src/
├── app/
│   └── router.tsx                 # 路由集中配置
├── components/
│   ├── ui/                        # 可跨页面复用的基础 UI 组件
│   │   ├── button.tsx
│   │   └── sidebar.tsx            # shadcn Sidebar，本地维护并按项目需要裁剪
│   ├── BrandLogo.tsx
│   ├── LoadingDots.tsx
│   └── MarkdownRenderer.tsx
├── layouts/
│   └── AppLayout.tsx              # 共享应用壳：侧栏、移动端顶部栏、内容出口
├── lib/
│   └── utils.ts                   # cn 等通用工具函数
├── hooks/
│   └── use-mobile.ts              # 共享移动端断点状态
├── pages/
│   ├── chat/
│   │   ├── ChatPage.tsx
│   │   ├── constants.ts
│   │   ├── hooks.ts
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── components/
│   │       ├── AgentTimeline.tsx
│   │       ├── AgentTrace.tsx
│   │       ├── CollapsibleCard.tsx
│   │       └── RagSources.tsx
│   ├── knowledge/
│   │   ├── KnowledgePage.tsx
│   │   ├── constants.ts
│   │   └── types.ts
│   └── ComingSoonPage.tsx
├── services/
│   ├── api/
│   │   └── client.ts              # fetch、HTTP 错误与 SSE 读取的统一封装
│   ├── agent.ts                   # Agent 接口与事件封装
│   ├── chat.ts                    # 普通聊天与 RAG 问答封装
│   └── documents.ts               # 文档上传封装
├── styles/
│   ├── globals.css                # Tailwind 引入和极少量全局基础规则
│   └── tokens.css                 # 全局设计变量
├── App.tsx                        # RouterProvider 入口
└── main.tsx                       # React 挂载与全局样式入口
```

## 4. 页面模块约定

每个页面的内容应收拢到自己的目录，不要将页面专属类型、常量和 Hook 放入全局目录。

推荐结构：

```text
pages/feature-name/
├── FeaturePage.tsx                # 页面容器和页面组合
├── types.ts                       # 仅该功能使用的类型
├── constants.ts                   # 仅该功能使用的静态配置
├── hooks.ts                       # 仅该功能使用的状态/请求逻辑
└── components/                    # 仅该功能内部复用的子组件（按需创建）
```

页面目录已经表达所属模块，因此模块内文件不再重复加 `chat.`、`knowledge.` 等前缀。页面组件仍使用功能名，例如 `ChatPage.tsx`。`ChatMessage` 放在 `pages/chat/types.ts`，而不是全局的 `src/types/`。

以下情况才提升到 `src/components/`：

- 至少两个页面会使用
- 组件具有独立交互或明确的通用职责
- 组件的业务语义不属于某一个页面

## 5. 样式规范：Tailwind-first

### 5.1 默认规则

页面、业务组件和普通交互组件直接使用 Tailwind 工具类。布局、间距、颜色、响应式、状态样式应优先写在 JSX 的 `className` 中。

```tsx
<section className="mx-auto w-full max-w-3xl px-5 py-8 md:px-10">
  ...
</section>
```

不要为每个页面或组件默认创建 CSS Module。

### 5.2 CSS 文件职责

| 文件 | 用途 |
| --- | --- |
| `styles/globals.css` | Tailwind 引入、字体、`body`、基础重置等真正全局规则 |
| `styles/tokens.css` | 项目颜色、表面色、边框等设计变量 |
| `*.module.css` | 仅用于 Tailwind 难以清晰表达的复杂嵌套选择器、伪元素、动画或第三方样式覆盖 |

使用 CSS Module 前先判断：该样式能否在 JSX 中用少量 Tailwind 类清晰表达？可以则不创建 CSS Module。

### 5.3 组件变体

公共基础组件使用 `cva` 管理有限的 `variant` 与 `size`，使用 `cn()` 合并外部 `className`。

```tsx
<Button size="icon" aria-label="发送">
  <ArrowUp />
</Button>
```

不要为一次性的页面按钮过早抽象组件；先使用原生 `button` 加 Tailwind 类即可。

## 6. 路由规范

所有路由只在 `src/app/router.tsx` 中注册。

- 页面组件不创建路由配置
- 首页 `/` 重定向到 `/chat`
- 未匹配路径重定向到 `/chat`
- 尚未开发的页面复用 `ComingSoonPage` 占位
- 新页面开发时，在路由注册后再补充侧栏导航项（如有必要）

当前路由：

| 路径 | 页面 | 状态 |
| --- | --- | --- |
| `/chat` | `ChatPage` | 开发中 |
| `/knowledge` | `KnowledgePage` | Markdown 导入与入库 |
| `/documents` | `ComingSoonPage` | 占位 |
| `/retrieval` | `ComingSoonPage` | 占位 |

## 7. API 与 SSE 规范

### 7.1 分层

```text
页面 / Hook
   ↓
services/chat.ts                  # 将 Chat 状态转换为接口请求
   ↓
services/api/client.ts            # URL、fetch、HTTP 错误、SSE 数据块解析
   ↓
FastAPI
```

页面不能直接调用 `fetch`。新的业务接口应在 `services/` 下创建对应模块，并复用 `services/api/client.ts`。

### 7.2 后端地址

前端通过 `VITE_API_BASE_URL` 配置后端地址；未配置时默认使用 `http://localhost:8000`。

```env
VITE_API_BASE_URL=http://localhost:8000
```

环境变量变化后需要重启 Vite 开发服务。

### 7.3 SSE 错误处理

`fetch` 成功并不等于 SSE 一定完整结束。流式响应可能在读取过程中因模型服务、网络、配置或后端异常而中断。

- 首次无法连接后端：由 API 客户端转换为明确的连接错误
- HTTP 非 2xx：读取后端 `detail` 并显示可读错误
- SSE 中途断开：前端保留已收到的文本，并显示流读取错误
- 后端应捕获上游 LLM 异常，尽可能返回结构化 SSE 错误事件，而不是直接断开连接

排查 `network error` 时按顺序检查：

1. `http://localhost:8000/health` 是否返回 200
2. FastAPI 运行终端是否出现异常堆栈
3. `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL` 是否正确
4. 上游模型服务是否可访问、模型是否可用、账户是否有配额

### 7.4 Chat 模式与 RAG 事件

Agent 对话页提供三种后端模式，使用独立的页面内消息记录。

| 模式 | 接口 | 上下文能力 | SSE 事件 |
| --- | --- | --- | --- |
| 普通聊天 | `POST /api/chat` | 当前页面内传递完整消息历史 | `delta`、`[DONE]` |
| 知识库问答 | `POST /api/rag/chat` | 当前仅传一条 `question`，每次独立检索 | `sources`、`delta`、`[DONE]` |
| Agent 多工具 | `POST /api/agent/chat` | 当前仅传一条 `message`，每次独立执行 | `agent_start`、`phase`、`tool_call`、`tool_result`、`retrieval`、`token`、`final`、`error`、`sources`、`[DONE]` |

- 知识库问答的 `sources` 事件先于 `delta` 到达，应绑定到当前助手消息。
- 前端展示来源时优先显示文件名与页码；检索分数仅在后续调试功能中展示。
- 当前 RAG 接口未接收历史消息，页面必须明确提示“每次提问独立检索”，不能暗示它具备多轮上下文。
- Agent 通过 `services/agent.ts` 消费 SSE，前端只发送原始用户请求；工具选择和顺序由后端模型决定。
- Agent 执行期间使用 `AgentTimeline` 实时展示公开运行状态，并始终位于正文上方；完整工具记录和参考来源排在正文下方。
- Timeline、工具记录和参考来源复用统一折叠卡片；Timeline 默认展开，其余两项默认折叠。
- `phase` 在模型决策和正文生成开始前发送；决策等待仅显示在卡片标题右侧，不加入 Timeline 历史列表。检索统计更新原工具行，正文 token 只更新正文。
- Timeline 只展示工具调用、检索数量、生成状态和可恢复错误，不展示或推测模型内部思维过程。
- 车辆识别 V1 为图片 URL Mock，使用包含 `camry`、`model3` 或 `accord` 的测试 URL；当前不提供本地图片上传。
- Chat 的模式配置保存在 `pages/chat/constants.ts`，请求和状态维护在 `pages/chat/hooks.ts`，来源与 Agent 轨迹组件放在 `pages/chat/components/`。

## 8. Markdown 规范

所有助手消息统一通过 `components/MarkdownRenderer.tsx` 渲染。

- 保持段落、列表和标题的紧凑间距
- 支持 GFM 表格、列表、代码块等常用格式
- 不在页面内重复配置 Markdown 标签样式
- 需要增加 Markdown 能力时优先在 `MarkdownRenderer` 中集中修改

## 9. 固定布局与滚动规范

桌面端工作台必须满足：

- `AppLayout` 固定为视口高度（`100dvh`）
- 侧栏固定在左侧，不随对话内容移动
- 侧栏展开宽度为 `300px`，折叠后保留 `72px` 图标栏
- Sidebar 开关必须提供 `aria-label`、`aria-expanded`，并支持 `Ctrl+B`
- Chat 页面本身为纵向 Flex 容器
- 消息列表区域使用 `flex-1 min-h-0 overflow-y-auto`
- 输入框区域位于 Chat 容器底部，不参与消息列表滚动

移动端不强制固定高度，保留自然页面滚动，以避免键盘弹出或较小屏幕造成内容裁切。
移动端导航由顶部按钮打开抽屉，选择导航项、点击遮罩或按 `Escape` 后关闭。

## 10. 代码注释规范

- 使用简短行注释 `//`，不写大段块注释
- 函数只需一句话说明职责
- 注释解释“为什么这样处理”，不要复述明显的代码行为
- 对 SSE、不可变状态更新、错误恢复等容易误改的逻辑保留关键注释

## 11. 浏览器翻译与第三方 DOM 修改

React 管理的应用节点不能被浏览器翻译、翻译扩展等第三方脚本直接替换或移动；否则在流式消息、上传状态等重新渲染时，可能出现 `insertBefore` 的 `NotFoundError`。

- `index.html` 的 `html` 使用正确页面语言 `zh-CN`
- `head` 保留 `google notranslate` meta
- React 根节点和 `AppLayout` 保留 `class="notranslate"`、`translate="no"`
- 不要移除这些属性；AutoMind 当前以中文界面为主，优先保证动态界面稳定

## 12. 新功能开发流程

1. 在 `pages/` 下创建功能目录和页面组件
2. 仅在该功能需要时新增 `types`、`constants`、`hooks` 或内部子组件
3. 在 `app/router.tsx` 注册路由
4. 需要后端请求时，在 `services/` 新增业务模块并复用 API 客户端
5. 优先使用 Tailwind；只有符合例外条件时才添加 CSS Module
6. 需要跨页面复用时再抽到 `components/`
7. 完成后执行：

```bash
npm run lint
npm run build
```

## 13. 当前阶段不提前开发的内容

在 Chat 功能稳定前，不提前实现以下功能的完整数据架构：

- 会话历史和多会话管理
- 知识库的文档列表与索引管理
- 文档管理
- 检索调试
- 用户体系、权限和设置中心

这些页面当前只保留路由入口；开始各自功能开发时，再按本文档的模块约定建立对应架构。
