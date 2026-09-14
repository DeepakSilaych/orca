import { contextBridge, ipcRenderer } from 'electron'
import type {
  MagiApi,
  TerminalEvent,
  WorkspaceShortcut,
  UpdateState
} from '../../shared/magi/types'
const api: MagiApi = {
  copyText: (text) => ipcRenderer.invoke('magi:copy', text),
  getUpdate: () => ipcRenderer.invoke('magi:update:get'),
  runUpdate: () => ipcRenderer.invoke('magi:update:run'),
  onUpdate: (listener) => {
    const callback = (_event: Electron.IpcRendererEvent, state: UpdateState): void =>
      listener(state)
    ipcRenderer.on('magi:update', callback)
    return () => ipcRenderer.removeListener('magi:update', callback)
  },
  onShortcut: (listener) => {
    const callback = (_event: Electron.IpcRendererEvent, shortcut: WorkspaceShortcut): void =>
      listener(shortcut)
    ipcRenderer.on('magi:shortcut', callback)
    return () => ipcRenderer.removeListener('magi:shortcut', callback)
  },
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
