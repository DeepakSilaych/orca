const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { build, Platform, Arch } = require('electron-builder')
const { parse } = require('yaml')
const root = resolve(__dirname, '../..')
const config = parse(readFileSync(resolve(root, 'config/electron-builder.magi.yml'), 'utf8'))
const projectDir = resolve(root, config.directories.app)
config.directories = { app: projectDir, output: resolve(root, config.directories.output) }
config.mac.icon = resolve(root, config.mac.icon)
config.extraResources = config.extraResources.map((resource) => ({
  ...resource,
  from: resolve(root, resource.from)
}))
config.electronVersion = require('electron/package.json').version
build({
  projectDir,
  config,
  targets: Platform.MAC.createTarget(['dmg', 'zip'], Arch.arm64),
  publish: 'never'
}).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
