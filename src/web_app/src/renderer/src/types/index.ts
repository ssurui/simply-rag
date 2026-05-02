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

export interface Chunk {
  id: string
  content: string
  source: string
  score: number
}

export interface DbStatus {
  count: number
  ready: boolean
}

export interface IndexProgress {
  current: number
  total: number
  file: string
}

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>
      selectDirectory: () => Promise<string | null>
      indexDocuments: (payload: { paths: string[]; mode: 'append' | 'rebuild' }) => Promise<void>
      query: (payload: { question: string; systemPrompt: string; topK: number }) => Promise<void>
      getDbStatus: () => Promise<DbStatus>
      getConfig: () => Promise<AppConfig>
      saveConfig: (config: AppConfig) => Promise<void>
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      off: (channel: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
