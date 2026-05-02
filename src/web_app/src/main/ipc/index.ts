import { registerIndexHandlers } from './indexHandler'
import { registerQueryHandlers } from './queryHandler'
import { registerStatusHandlers } from './statusHandler'
import type { BrowserWindow } from 'electron'

export function registerIpcHandlers(getWin: () => BrowserWindow | null): void {
  registerIndexHandlers(getWin)
  registerQueryHandlers(getWin)
  registerStatusHandlers()
}
