// 统一读取后端地址，便于开发和部署环境切换。
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    details?: unknown,
  ) {
    // 保留 HTTP 状态和后端详情，方便页面展示可读错误。
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

// 拼接相对接口路径并保留绝对 URL 的调用能力。
function buildUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`
}

// 按响应头选择 JSON 或文本方式读取响应体。
async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

// 执行统一的 fetch 请求并转换网络或 HTTP 错误。
async function fetchResponse(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  // 拆出 body/headers 单独处理，method 等其余选项透传给 fetch。
  const { body, headers, ...requestInit } = options
  const requestHeaders = new Headers(headers) // 统一请求头容器（没传也有兜底）。

  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json') // JSON 请求自动补类型；FormData 必须由浏览器补 boundary。
  }

  try {
    const response = await fetch(buildUrl(path), {
      ...requestInit,
      headers: requestHeaders,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body), // FormData 原样发送，其余请求体序列化为 JSON。
    })

    if (!response.ok) {
      const details = await parseResponseBody(response)
      const message =
        typeof details === 'object' && details !== null && 'detail' in details
          ? String(details.detail) // FastAPI 约定：错误响应带 detail 字段。
          : `后端返回异常（${response.status}）`
      throw new ApiError(message, response.status, details)
    }

    return response
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('无法连接后端服务，请确认 FastAPI 已启动', 0, error) // 网络层失败统一包装成可读错误。
  }
}

// 提供可复用的 JSON 与 FormData 请求入口。
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetchResponse(path, options)
  return (await parseResponseBody(response)) as T
}

// 建立 SSE 请求并处理跨网络分片的事件边界。
export async function streamSse(
  path: string,
  body: unknown,
  onData: (data: string) => void,
): Promise<void> {
  const response = await fetchResponse(path, { method: 'POST', body })

  if (!response.body) {
    throw new ApiError('浏览器未接收到流式响应', response.status) // 流式响应必须带可读流。
  }

  const reader = response.body.getReader() // 获取流的读取器，逐块读字节。
  const decoder = new TextDecoder() // 字节 → 文字的翻译器。
  let buffer = '' // 水池：网络分块可能切到半个事件，先攒着再切。

  const consumeEvent = (event: string) => {
    const data = event
      .split(/\r?\n/) // 按行切分事件内容。
      .filter((line) => line.startsWith('data:')) // 只保留 data: 行，忽略 event:/id: 等。
      .map((line) => line.slice(5).trimStart()) // 去掉 "data:" 前缀和冒号后空格。
      .join('\n') // 多行 data 拼回完整内容。

    if (data) onData(data)
  }

  while (true) {
    const { done, value } = await reader.read() // 读一块原始字节；done=true 表示流结束。
    buffer += decoder.decode(value, { stream: !done }) // 解码并攒进水池；stream 模式容忍半截字符。

    const events = buffer.split(/\r?\n\r?\n/) // SSE 事件以两个换行分隔，切出完整事件。
    buffer = events.pop() ?? '' // 最后一段可能不完整，留回水池等下一轮拼接。
    events.forEach(consumeEvent)

    if (done) break
  }

  if (buffer) consumeEvent(buffer) // 兜底：流结束时水池残留也处理一次。
}

