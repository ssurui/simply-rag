import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

export interface AppConfig {
  ollama: {
    baseUrl: string
    embedModel: string
    chatModel: string
  }
  rag: {
    chunkSize: number
    chunkOverlap: number
    topK: number
    systemPrompt: string
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    embedModel: 'bge-m3',
    chatModel: 'qwen3:8b'
  },
  rag: {
    chunkSize: 500,
    chunkOverlap: 0,
    topK: 5,
    systemPrompt: `你是一个阅读理解助手，专门帮助用户基于给定的上下文内容回答问题。
你的任务是：
- 只能依据用户提供的上下文内容进行回答；
- 每个答案中如果有信息来源于上下文，必须标注对应的引用标号（例如：[1]，也可以是多个标号，例如：[1][3]）；
- 如果问题的信息在上下文中找不到，请直接回复："我不知道。"
- 不得使用自己的知识库或常识来回答问题；
- 回答应简洁明了，不添加额外解释或发挥。

请严格按照用户的指示进行判断和回答。`
  }
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'lancedb')
}

export function getConfig(): AppConfig {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) return DEFAULT_CONFIG
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'))
    return {
      ollama: { ...DEFAULT_CONFIG.ollama, ...raw.ollama },
      rag: { ...DEFAULT_CONFIG.rag, ...raw.rag }
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: AppConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}
