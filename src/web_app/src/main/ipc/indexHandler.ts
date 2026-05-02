import { ipcMain, BrowserWindow, dialog } from 'electron'
import { getConfig, getDbPath } from '../config'
import { splitDocuments } from '../rag/splitter'
import { embedTexts } from '../rag/embedder'
import { addDocuments } from '../db/lancedb'

const BATCH_SIZE = 16 // 每次批量向 Ollama 请求的文本数

export function registerIndexHandlers(win: BrowserWindow): void {
  ipcMain.handle('select-files', async () => {
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: '选择 Markdown 文件',
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      properties: ['openFile', 'multiSelections']
    })
    return filePaths
  })

  ipcMain.handle('select-directory', async () => {
    const { filePaths } = await dialog.showOpenDialog(win, {
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

    try {
      // 1. 分块
      const chunks = await splitDocuments(
        payload.paths,
        config.rag.chunkSize,
        config.rag.chunkOverlap
      )
      const total = chunks.length
      win.webContents.send('index:progress', { current: 0, total, file: '正在准备...' })

      // 2. 批量向量化并写入
      const records: { id: string; content: string; source: string; vector: number[] }[] = []

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        const texts = batch.map((c) => c.content)
        const vectors = await embedTexts(texts, config.ollama.baseUrl, config.ollama.embedModel)

        for (let j = 0; j < batch.length; j++) {
          records.push({
            id: `${batch[j].source}::${i + j}`,
            content: batch[j].content,
            source: batch[j].source,
            vector: vectors[j]
          })
          win.webContents.send('index:progress', {
            current: i + j + 1,
            total,
            file: batch[j].source
          })
        }
      }

      // 3. 写入向量库
      await addDocuments(dbPath, records, payload.mode)
      win.webContents.send('index:done', { total })
    } catch (e) {
      win.webContents.send('index:error', { message: String(e) })
    }
  })
}
