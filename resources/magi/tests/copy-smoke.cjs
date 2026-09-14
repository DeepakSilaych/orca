const { _electron } = require('playwright'),
  { expect } = require('playwright/test')
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'magi-copy-qa-')),
  remoteRoot = `/tmp/${path.basename(fixture)}`
;(async () => {
  const app = await _electron.launch({
    executablePath: process.env.MAGI_EXECUTABLE || require('electron'),
    args: process.env.MAGI_EXECUTABLE ? [] : ['.'],
    env: {
      ...process.env,
      ORCA_BACKGROUND_LAUNCH: '1',
      MAGI_ROOT: `${fixture}/root`,
      MAGI_USER_DATA_PATH: `${fixture}/profile`
    }
  })
  const p = await app.firstWindow(),
    remote = 'Copy-VM'
  const request = (host, op, args = {}) =>
    p.evaluate(({ host, op, args }) => window.magi.request(host, op, args), { host, op, args })
  const ssh = (...args) =>
    execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', 'local-vm', ...args], {
      encoding: 'utf8'
    })
  const key = (key, modifiers) =>
    app.evaluate(
      ({ BrowserWindow }, { key, modifiers }) => {
        const w = BrowserWindow.getAllWindows()[0]
        w.webContents.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers })
        w.webContents.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers })
      },
      { key, modifiers }
    )
  let remoteReady = false
  try {
    await p.getByRole('combobox', { name: 'Execution host' }).waitFor()
    await app.evaluate(({ clipboard, ipcMain }) => {
      global.copies = []
      global.input = []
      clipboard.writeText = (text) => global.copies.push(text)
      ipcMain.on('magi:write', (_e, _key, data) => global.input.push(data))
    })
    await request('local', 'host_add', { name: remote, ssh: 'local-vm', root: remoteRoot })
    await p.reload()
    await p.getByRole('combobox', { name: 'Execution host' }).click()
    await p.getByRole('option', { name: remote, exact: true }).click()
    await p.locator('.xterm-helper-textarea:visible').waitFor()
    remoteReady = true
    const ws = (await request(remote, 'snapshot')).workspaces[0],
      t = ws.terminals[0]
    await expect
      .poll(async () => (await request(remote, 'snapshot')).workspaces[0].terminals[0].started)
      .toBe(true)
    await expect
      .poll(() => {
        try {
          return ssh(`tmux show-options -v -t 'magi-${t.id}' mouse`).trim()
        } catch {
          return 'starting'
        }
      })
      .toBe('off')
    const session = JSON.stringify([remote, ws.id, t.id]),
      sample = 'VM_COPY_SELECTION_123'
    await p.evaluate(
      ({ session, sample }) => window.magi.write(session, `printf '\\n${sample}\\n'\r`),
      { session, sample }
    )
    const row = p.locator('.xterm-rows > div').filter({ hasText: sample }).last()
    await expect.poll(async () => (await row.innerText()).trim()).toBe(sample)
    const span = row.locator('span').filter({ hasText: sample }).first(),
      box = await span.boundingBox()
    await p.mouse.move(box.x + 0.5, box.y + box.height / 2)
    await p.mouse.down()
    await p.mouse.move(box.x + box.width + 0.5, box.y + box.height / 2, { steps: 8 })
    await p.mouse.up()
    await key('c', [
      process.platform === 'darwin' ? 'meta' : 'control',
      ...(process.platform === 'darwin' ? [] : ['shift'])
    ])
    await expect.poll(() => app.evaluate(() => global.copies.at(-1))).toBe(sample)
    const count = await app.evaluate(() => global.copies.length)
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.copy())
    await expect.poll(() => app.evaluate(() => global.copies.length)).toBeGreaterThan(count)
    expect(await app.evaluate(() => global.copies.at(-1))).toBe(sample)
    await p.locator('.xterm-helper-textarea:visible').focus()
    await key('c', ['control'])
    await expect.poll(() => app.evaluate(() => global.input.includes('\x03'))).toBe(true)
    await p.getByRole('button', { name: 'Terminal 1', exact: true }).click({ button: 'right' })
    await p.getByRole('menuitem', { name: 'Copy current path', exact: true }).click()
    await expect.poll(() => app.evaluate(() => global.copies.at(-1))).toBe(ws.path)
    console.log(
      'PASS: actual VM drag selection + Cmd-C via native clipboard IPC; Ctrl-C still interrupts; delayed VM Copy current path works.'
    )
  } finally {
    for (const host of ['local', ...(remoteReady ? [remote] : [])]) {
      for (const w of (await request(host, 'snapshot')).workspaces) {
        for (const t of w.terminals) {
          await request(host, 'terminal_remove', { workspace: w.id, terminal: t.id })
        }
      }
    }
    await app.close()
    fs.rmSync(fixture, { recursive: true, force: true })
    ssh(`rm -rf -- '${remoteRoot}'`)
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
