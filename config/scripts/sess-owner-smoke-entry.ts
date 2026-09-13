import { SessSessionOwner } from '../../src/main/daemon/sess/sess-session-owner'
import { quotePosixShell } from '../../src/shared/wsl-login-shell-command'
import { join } from 'node:path'

const [root, operation] = process.argv.slice(2)
if (!root || !operation) {
  throw new Error('Expected test root and operation')
}
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  )
)
const owner = new SessSessionOwner(root, 'ssh-smoke', env)
if (operation === 'ensure') {
  const result = await owner.ensure({
    cwd: root,
    shell: '/bin/bash',
    cols: 80,
    rows: 24,
    command: `printf 'started\\n' >> ${quotePosixShell(join(root, 'starts'))}`
  })
  console.log(JSON.stringify({ ...result, name: owner.name }))
} else if (operation === 'observe') {
  console.log(JSON.stringify(await owner.observe()))
} else if (operation === 'end') {
  owner.end()
  console.log(JSON.stringify(await owner.observe()))
} else {
  throw new Error('Unknown operation')
}
