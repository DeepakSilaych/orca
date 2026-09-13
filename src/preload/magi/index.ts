import { contextBridge, ipcRenderer } from 'electron'
import type { MagiApi, TerminalEvent } from '../../shared/magi/types'
const api: MagiApi = {
  request: (host, op, args) => ipcRenderer.invoke('magi:request', host, op, args),
  attach: (host, workspace, terminal, cols, rows) =>
    ipcRenderer.invoke('magi:attach', host, workspace, terminal, cols, rows),
  write: (key, data) => ipcRenderer.send('magi:write', key, data),
  resize: (key, cols, rows) => ipcRenderer.send('magi:resize', key, cols, rows),
  detach: (key) => ipcRenderer.send('magi:detach', key),
  onTerminal: (listener) => {
    const callback = (_event: Electron.IpcRendererEvent, event: TerminalEvent): void =>
      listener(event)
    ipcRenderer.on('magi:terminal', callback)
    return () => ipcRenderer.removeListener('magi:terminal', callback)
  },
  chooseDirectory: () => ipcRenderer.invoke('magi:directory'),
  openExternal: (url) => ipcRenderer.invoke('magi:external', url)
}
contextBridge.exposeInMainWorld('magi', api)
