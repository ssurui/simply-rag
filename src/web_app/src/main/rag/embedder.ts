export async function embedTexts(
  texts: string[],
  baseUrl: string,
  model: string
): Promise<number[][]> {
  const response = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts })
  })
  if (!response.ok) {
    throw new Error(`Ollama embed 请求失败：${response.status} ${response.statusText}`)
  }
  const data = await response.json() as { embeddings: number[][] }
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
