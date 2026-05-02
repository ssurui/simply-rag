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

    console.log(`\n${'='.repeat(60)}`)
    console.log('[query] 问题：', payload.question)
    console.log('[query] topK：', payload.topK)
    console.log('[query] 模型：', config.ollama.chatModel)

    try {
      // 1. 问题向量化
      const queryVector = await embedOne(
        payload.question,
        config.ollama.baseUrl,
        config.ollama.embedModel
      )
      console.log('[query] 问题向量化完成，维度：', queryVector.length)

      // 2. 向量检索
      const chunks = await search(dbPath, queryVector, payload.topK)
      console.log(`[query] 检索到 ${chunks.length} 个片段：`)
      chunks.forEach((c, i) => {
        console.log(`  片段${i + 1}  相关度=${c.score}  来源=${c.source}`)
        console.log(`  内容前100字：${c.content.slice(0, 100).replace(/\n/g, ' ')}`)
      })
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
