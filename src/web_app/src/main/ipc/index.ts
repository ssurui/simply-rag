import { BrowserWindow } from 'electron'
import { registerIndexHandlers } from './indexHandler'
import { registerQueryHandlers } from './queryHandler'
import { registerStatusHandlers } from './statusHandler'

export function registerIpcHandlers(win: BrowserWindow): void {
  registerIndexHandlers(win)
  registerQueryHandlers(win)
  registerStatusHandlers()
}
