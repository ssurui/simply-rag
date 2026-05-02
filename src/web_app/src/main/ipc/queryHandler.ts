import { ipcMain, BrowserWindow } from 'electron'
import { getConfig, getDbPath } from '../config'
import { embedOne } from '../rag/embedder'
import { search } from '../db/lancedb'
import { streamGenerate } from '../rag/generator'

export function registerQueryHandlers(win: BrowserWindow): void {
  ipcMain.handle('query', async (_event, payload: {
    question: string
    systemPrompt: string
    topK: number
  }) => {
    const config = getConfig()
    const dbPath = getDbPath()

    try {
      // 1. 问题向量化
      const queryVector = await embedOne(
        payload.question,
        config.ollama.baseUrl,
        config.ollama.embedModel
      )

      // 2. 向量检索
      const chunks = await search(dbPath, queryVector, payload.topK)
      win.webContents.send('query:context', { chunks })

      if (chunks.length === 0) {
        win.webContents.send('query:delta', { delta: '我不知道。' })
        win.webContents.send('query:done', {})
        return
      }

      // 3. 流式生成
      await streamGenerate(
        payload.question,
        chunks,
        payload.systemPrompt,
        config.ollama.baseUrl,
        config.ollama.chatModel,
        {
          onDelta: (delta) => win.webContents.send('query:delta', { delta }),
          onDone: () => win.webContents.send('query:done', {}),
          onError: (message) => win.webContents.send('query:error', { message })
        }
      )
    } catch (e) {
      win.webContents.send('query:error', { message: String(e) })
    }
  })
}
