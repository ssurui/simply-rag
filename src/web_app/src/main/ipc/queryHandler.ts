import { ipcMain, BrowserWindow } from 'electron'
import { getConfig, getDbPath } from '../config'
import { embedOne } from '../rag/embedder'
import { search } from '../db/lancedb'
import { streamGenerate } from '../rag/generator'

export function registerQueryHandlers(getWin: () => BrowserWindow | null): void {
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
    console.log('[query] 嵌入服务：', config.embed.baseUrl, '生成服务：', config.chat.baseUrl, '模型：', config.chat.model)

    const send = (channel: string, data: unknown): void => {
      getWin()?.webContents.send(channel, data)
    }

    try {
      // 1. 问题向量化
      const queryVector = await embedOne(
        payload.question,
        config.embed.baseUrl,
        config.embed.model
      )
      console.log('[query] 问题向量化完成，维度：', queryVector.length)

      // 2. 向量检索
      const chunks = await search(dbPath, queryVector, payload.topK)
      console.log(`[query] 检索到 ${chunks.length} 个片段：`)
      chunks.forEach((c, i) => {
        console.log(`  片段${i + 1}  相关度=${c.score}  来源=${c.source}`)
        console.log(`  内容前100字：${c.content.slice(0, 100).replace(/\n/g, ' ')}`)
      })
      send('query:context', { chunks })

      if (chunks.length === 0) {
        send('query:delta', { delta: '我不知道。' })
        send('query:done', {})
        return
      }

      // 3. 流式生成
      await streamGenerate(
        payload.question,
        chunks,
        payload.systemPrompt,
        config.chat.baseUrl,
        config.chat.model,
        {
          onDelta: (delta) => send('query:delta', { delta }),
          onDone: () => send('query:done', {}),
          onError: (message) => send('query:error', { message })
        }
      )
    } catch (e) {
      send('query:error', { message: String(e) })
    }
  })
}
