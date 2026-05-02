import { ipcMain, BrowserWindow, dialog } from 'electron'
import { getConfig, getDbPath } from '../config'
import { splitDocuments } from '../rag/splitter'
import { embedTexts } from '../rag/embedder'
import { addDocuments } from '../db/lancedb'

const BATCH_SIZE = 16 // 每次批量向 Ollama 请求的文本数

export function registerIndexHandlers(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('select-files', async () => {
    const win = getWin()
    const { filePaths } = await dialog.showOpenDialog(win ?? undefined as never, {
      title: '选择 Markdown 文件',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      properties: ['openFile', 'multiSelections']
    })
    return filePaths
  })

  ipcMain.handle('select-directory', async () => {
    const win = getWin()
    const { filePaths } = await dialog.showOpenDialog(win ?? undefined as never, {
      title: '选择文档目录',
      properties: ['openDirectory']
    })
    return filePaths[0] ?? null
  })

  ipcMain.handle('index-documents', async (_event, payload: {
    paths: string[]
    mode: 'append' | 'rebuild'
  }) => {
    const config = getConfig()
    const dbPath = getDbPath()

    console.log('[index] 开始入库，路径：', payload.paths, '模式：', payload.mode)
    console.log('[index] 嵌入服务：', config.embed.baseUrl, '模型：', config.embed.model)
    console.log('[index] 向量库路径：', dbPath)

    try {
      // 1. 分块
      console.log('[index] 正在读取并分块文档...')
      const chunks = await splitDocuments(
        payload.paths,
        config.rag.chunkSize,
        config.rag.chunkOverlap
      )
      const total = chunks.length
      console.log(`[index] 分块完成，共 ${total} 个片段`)
      getWin()?.webContents.send('index:progress', { current: 0, total, file: '正在准备...' })

      // 2. 批量向量化并写入
      const records: { id: string; content: string; source: string; vector: number[] }[] = []

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        const texts = batch.map((c) => c.content)
        console.log(`[index] 向量化 batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(total / BATCH_SIZE)}，片段 ${i + 1}-${Math.min(i + BATCH_SIZE, total)}`)
        const vectors = await embedTexts(texts, config.embed.baseUrl, config.embed.model)
        console.log(`[index] batch 向量化完成，向量维度：${vectors[0]?.length ?? 0}`)

        for (let j = 0; j < batch.length; j++) {
          records.push({
            id: `${batch[j].source}::${i + j}`,
            content: batch[j].content,
            source: batch[j].source,
            vector: vectors[j]
          })
          getWin()?.webContents.send('index:progress', {
            current: i + j + 1,
            total,
            file: batch[j].source
          })
        }
      }

      // 3. 写入向量库
      console.log(`[index] 所有向量化完成，共 ${records.length} 条，正在写入 LanceDB...`)
      await addDocuments(dbPath, records, payload.mode)
      console.log('[index] 写入完成')
      getWin()?.webContents.send('index:done', { total })
    } catch (e) {
      console.error('[index] 入库失败：', e)
      getWin()?.webContents.send('index:error', { message: String(e) })
    }
  })
}
