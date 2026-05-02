import type { SearchResult } from '../db/lancedb'

export interface GeneratorCallbacks {
  onDelta: (delta: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export async function streamGenerate(
  question: string,
  chunks: SearchResult[],
  systemPrompt: string,
  baseUrl: string,
  model: string,
  callbacks: GeneratorCallbacks
): Promise<void> {
  const context = chunks
    .map((c, i) => `片段${i + 1}【来源：${c.source}，相关度：${c.score}】\n${c.content}`)
    .join('\n\n')

  const userMessage = `【开始上下文】
${context}
【结束上下文】

请回答以下问题：${question}`

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true
      })
    })
  } catch (e) {
    callbacks.onError(`无法连接 Ollama：${String(e)}`)
    return
  }

  if (!response.ok) {
    callbacks.onError(`Ollama 请求失败：${response.status}`)
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const chunk = JSON.parse(line)
        const delta: string = chunk.message?.content ?? ''
        if (delta) callbacks.onDelta(delta)
        if (chunk.done) {
          callbacks.onDone()
          return
        }
      } catch {
        // 忽略非 JSON 行
      }
    }
  }
  callbacks.onDone()
}
