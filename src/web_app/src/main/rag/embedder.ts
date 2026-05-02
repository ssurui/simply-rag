export async function embedTexts(
  texts: string[],
  baseUrl: string,
  model: string
): Promise<number[][]> {
  const url = `${baseUrl}/api/embed`
  console.log(`[embedder] POST ${url} model=${model} texts=${texts.length}`)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input: texts })
    })
  } catch (e) {
    throw new Error(`Ollama 连接失败（${url}）：${String(e)}`)
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Ollama embed 请求失败：${response.status} ${response.statusText}\n${body}`)
  }
  const data = await response.json() as { embeddings: number[][] }
  console.log(`[embedder] 返回 ${data.embeddings?.length ?? 0} 个向量`)
  return data.embeddings
}

export async function embedOne(
  text: string,
  baseUrl: string,
  model: string
): Promise<number[]> {
  const vectors = await embedTexts([text], baseUrl, model)
  return vectors[0]
}
