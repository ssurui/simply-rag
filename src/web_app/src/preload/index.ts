import { contextBridge, ipcRenderer } from 'electron'

console.log('[preload] 正在注册 electronAPI...')

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('select-files'),
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('select-directory'),

  // 入库
  indexDocuments: (payload: { paths: string[]; mode: 'append' | 'rebuild' }): Promise<void> =>
    ipcRenderer.invoke('index-documents', payload),

  // 查询
  query: (payload: { question: string; systemPrompt: string; topK: number }): Promise<void> =>
    ipcRenderer.invoke('query', payload),

  // 状态 & 配置
  getDbStatus: (): Promise<{ count: number; ready: boolean }> =>
    ipcRenderer.invoke('get-db-status'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: unknown) => ipcRenderer.invoke('save-config', config),

  // 事件监听
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    // 每次注册前先清除该频道的所有旧监听，避免累加
    ipcRenderer.removeAllListeners(channel)
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  off: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})
