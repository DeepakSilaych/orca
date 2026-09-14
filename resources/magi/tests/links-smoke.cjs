const { _electron } = require('playwright'),
  { expect } = require('playwright/test')
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  { execFileSync } = require('node:child_process')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'magi-links-qa-'))
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
  const p = await app.firstWindow()
  const request = (op, args = {}) =>
    p.evaluate(({ op, args }) => window.magi.request('local', op, args), { op, args })
  try {
    await p.waitForFunction(() =>
      document.activeElement?.classList.contains('xterm-helper-textarea')
    )
    await app.evaluate(({ shell }) => {
      global.urls = []
      shell.openExternal = async (url) => {
        global.urls.push(url)
      }
    })
    const ws = (await request('snapshot')).workspaces.find((w) => w.id === 'genral'),
      t = ws.terminals[0]
    fs.writeFileSync(path.join(ws.path, 'notes.md'), '# General notes\nSecond line\n')
    fs.writeFileSync(path.join(ws.path, 'other.txt'), 'Other file')
    await p.getByRole('button', { name: 'Refresh repositories', exact: true }).click()
    const key = JSON.stringify(['local', 'genral', t.id])
    await p.evaluate(
      ({ key }) =>
        window.magi.write(key, "printf '\\nhttps://example.com/magi\\nnotes.md:2:1\\n'\r"),
      { key }
    )
    const rowFor = (text) => p.locator('.xterm-rows > div').filter({ hasText: text }).last()
    await expect
      .poll(async () => (await rowFor('https://example.com/magi').innerText()).trim())
      .toBe('https://example.com/magi')
    const point = async (text) => {
      const row = rowFor(text),
        box = await row.boundingBox(),
        content = await row.innerText()
      const cols = Number(
        execFileSync('tmux', [
          'display-message',
          '-p',
          '-t',
          `=magi-${t.id}:`,
          '#{pane_width}'
        ]).toString()
      )
      const screen = await p.locator('.xterm-screen').boundingBox()
      return {
        x: screen.x + ((content.indexOf(text) + 2) * screen.width) / cols,
        y: box.y + box.height / 2
      }
    }
    let pos = await point('https://example.com/magi')
    await p.mouse.click(pos.x, pos.y)
    expect(await app.evaluate(() => global.urls)).toEqual([])
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
    await p.keyboard.down(mod)
    await p.mouse.move(pos.x, pos.y)
    await expect.poll(() => p.locator('.xterm-cursor-pointer').count()).toBe(1)
    await p.mouse.click(pos.x, pos.y)
    await p.keyboard.up(mod)
    await expect.poll(() => app.evaluate(() => global.urls)).toEqual(['https://example.com/magi'])
    pos = await point('notes.md:2:1')
    await p.keyboard.down(mod)
    await p.mouse.move(pos.x, pos.y)
    await expect.poll(() => p.locator('.xterm-cursor-pointer').count()).toBe(1)
    await p.mouse.click(pos.x, pos.y)
    await p.keyboard.up(mod)
    await p.locator('main').getByRole('button', { name: 'notes.md', exact: true }).waitFor()
    await expect(p.locator('.monaco-editor').first()).toBeVisible()
    await p.getByRole('button', { name: 'other.txt', exact: true }).click()
    await p.getByRole('button', { name: 'Close other.txt', exact: true }).waitFor()
    await p.locator('main').getByRole('button', { name: 'notes.md', exact: true }).click()
    await app.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents
      const modifiers = [process.platform === 'darwin' ? 'meta' : 'control']
      contents.sendInputEvent({ type: 'keyDown', keyCode: 'w', modifiers })
      contents.sendInputEvent({ type: 'keyUp', keyCode: 'w', modifiers })
    })
    await expect(p.getByRole('button', { name: 'Close notes.md', exact: true })).toHaveCount(0)
    await expect(p.getByRole('button', { name: 'Close other.txt', exact: true })).toBeVisible()
    console.log(
      'PASS: Cmd-click URL browser routing, file link validation and file tab, Genral file browser, independent file tab switching and closing.'
    )
  } finally {
    for (const w of (await request('snapshot')).workspaces) {
      for (const t of w.terminals) {
        await request('terminal_remove', { workspace: w.id, terminal: t.id })
      }
    }
    await app.close()
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
