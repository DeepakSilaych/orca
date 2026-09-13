import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { spawn, type IPty } from 'node-pty'
import { Hosts, quote, sshOptions } from './host-client'
import type { TerminalEvent } from '../../shared/magi/types'

const profile = process.env.MAGI_USER_DATA_PATH || join(app.getPath('appData'), 'magi-orca')
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
app.setName('Magi')
const ownsLock = app.requestSingleInstanceLock()
if (!ownsLock) {
  app.quit()
}
const root = process.env.MAGI_ROOT || join(app.getPath('documents'), 'Magi')
const resources = app.isPackaged
  ? join(process.resourcesPath, 'magi', 'backend')
  : resolve(__dirname, '../../../resources/magi/backend')
const hosts = new Hosts(root, resources)
const terminals = new Map<string, IPty>()
const generations = new Map<string, number>()
let window: BrowserWindow | undefined
const size = (value: number, maximum: number): number =>
  Math.min(maximum, Math.max(2, Math.floor(value) || 80))
const emit = (event: TerminalEvent): void => {
  if (window && !window.isDestroyed()) {
    window.webContents.send('magi:terminal', event)
  }
}
function detach(key: string): void {
  generations.set(key, (generations.get(key) || 0) + 1)
  const pty = terminals.get(key)
  terminals.delete(key)
  pty?.kill()
}
function authorize(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): void {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  ) {
    throw new Error('Untrusted IPC sender')
  }
}
const operations = new Set([
  'snapshot',
  'host_add',
  'repo_register',
  'branches',
  'workspace_create',
  'repo_attach',
  'workspace_archive',
  'terminal_new',
  'terminal_remove',
  'status',
  'files',
  'file',
  'diff',
  'diff_content',
  'git_action',
  'ticket_attach',
  'integrations',
  'install_cli'
])
if (ownsLock) {
  ipcMain.handle(
    'magi:request',
    (event, host: string, op: string, args?: Record<string, unknown>) => {
      authorize(event)
      if (!operations.has(op)) {
        throw new Error('Unsupported operation')
      }
      return hosts.request(host, op, args)
    }
  )
  ipcMain.handle(
    'magi:attach',
    async (
      event,
      hostName: string,
      workspace: string,
      terminal: string,
      cols: number,
      rows: number
    ) => {
      authorize(event)
      if (process.platform === 'win32') {
        throw new Error('Magi sess terminals currently require macOS or Linux.')
      }
      const key = JSON.stringify([hostName, workspace, terminal])
      detach(key)
      const generation = generations.get(key)
      const prepared = await hosts.request<{
        program: string
        args: string[]
        env: Record<string, string>
        cwd: string
      }>(hostName, 'terminal_prepare', { workspace, terminal })
      const host = await hosts.resolve(hostName)
      const command = [
        'env',
        ...Object.entries(prepared.env).map(([k, v]) => `${k}=${v}`),
        prepared.program,
        ...prepared.args
      ]
        .map(quote)
        .join(' ')
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
      delete env.TMUX
      delete env.TMUX_PANE
      if (generation !== generations.get(key)) {
        throw new Error('Attachment cancelled')
      }
      const pty = spawn(
        host ? 'ssh' : prepared.program,
        host ? ['-tt', ...sshOptions, '--', host.ssh, command] : prepared.args,
        {
          name: 'xterm-256color',
          cols: size(cols, 500),
          rows: size(rows, 300),
          cwd: host ? app.getPath('home') : prepared.cwd,
          env: { ...env, ...(host ? {} : prepared.env), TERM: 'xterm-256color' }
        }
      )
      terminals.set(key, pty)
      pty.onData((data) => emit({ key, data }))
      pty.onExit(() => {
        if (terminals.get(key) === pty) {
          terminals.delete(key)
          emit({ key, state: 'unverifiable' })
        }
      })
      emit({ key, state: 'live' })
      return key
    }
  )
  ipcMain.on('magi:write', (event, key: string, data: string) => {
    authorize(event)
    if (typeof data === 'string' && data.length <= 1024 * 1024) {
      terminals.get(key)?.write(data)
    }
  })
  ipcMain.on('magi:resize', (event, key: string, cols: number, rows: number) => {
    authorize(event)
    terminals.get(key)?.resize(size(cols, 500), size(rows, 300))
  })
  ipcMain.on('magi:detach', (event, key: string) => {
    authorize(event)
    detach(key)
  })
  ipcMain.handle('magi:directory', async (event) => {
    authorize(event)
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle('magi:external', (event, url: string) => {
    authorize(event)
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS links are supported')
    }
    return shell.openExternal(url)
  })
  app.on('second-instance', () => {
    if (process.env.ORCA_BACKGROUND_LAUNCH !== '1') {
      window?.show()
      window?.focus()
    }
  })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { label: 'Magi', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
        { role: 'editMenu' },
        {
          label: 'View',
          submenu: [
            { role: 'reload' },
            { role: 'toggleDevTools' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { role: 'togglefullscreen' }
          ]
        },
        { role: 'windowMenu' }
      ])
    )
    window = new BrowserWindow({
      width: 1440,
      height: 920,
      minWidth: 900,
      minHeight: 560,
      title: 'Magi',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    window.once('ready-to-show', () => {
      if (process.env.ORCA_BACKGROUND_LAUNCH !== '1') {
        window?.show()
      }
    })
    if (process.env.ELECTRON_RENDERER_URL) {
      void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/magi.html`)
    } else {
      void window.loadFile(join(__dirname, '../renderer/magi.html'))
    }
  })
  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', () => {
    for (const key of terminals.keys()) {
      detach(key)
    }
    hosts.close()
  })
}
