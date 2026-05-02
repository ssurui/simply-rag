import { ipcMain } from 'electron'
import { getConfig, saveConfig, getDbPath, AppConfig } from '../config'
import { getDocCount } from '../db/lancedb'

export function registerStatusHandlers(): void {
  ipcMain.handle('get-db-status', async () => {
    const dbPath = getDbPath()
    const count = await getDocCount(dbPath)
    return { count, ready: count > 0 }
  })

  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  ipcMain.handle('save-config', (_event, config: AppConfig) => {
    saveConfig(config)
  })
}
