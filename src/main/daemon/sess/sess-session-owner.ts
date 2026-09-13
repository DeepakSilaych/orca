import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import lockfile from 'proper-lockfile'
import { runProcess, runProcessSync } from '../../../shared/child-process/run-process'
import { quotePosixShell } from '../../../shared/wsl-login-shell-command'

export type SessObservation =
  | { state: 'live'; pid: number; command: string }
  | { state: 'exited' }
  | { state: 'unverifiable' }

export class SessSessionOwner {
  readonly name: string
  readonly directory: string
  constructor(
    readonly root: string,
    readonly id: string,
    readonly env: Record<string, string>
  ) {
    this.name = `orca-${createHash('sha256')
      .update(`${resolve(root)}\0${id}`)
      .digest('hex')
      .slice(0, 32)}`
    this.directory = join(root, 'sessions', this.name)
  }

  async observe(): Promise<SessObservation> {
    try {
      const r = await runProcess({
        program: 'tmux',
        args: [
          'list-panes',
          '-s',
          '-t',
          `=${this.name}:`,
          '-F',
          '#{pane_pid}|#{pane_current_command}'
        ],
        env: this.env,
        timeoutMs: 3000,
        maxOutputBytes: 4096
      })
      if (r.timedOut || r.signal || r.outputTruncated) {
        return { state: 'unverifiable' }
      }
      if (r.code === 0) {
        const [pid, command] = r.stdout.trim().split('\n')[0].split('|')
        if (Number.isSafeInteger(Number(pid)) && Number(pid) > 0 && command) {
          return { state: 'live', pid: Number(pid), command }
        }
      }
      if (
        r.code === 1 &&
        /can't find session|no server running|error connecting .*No such file or directory/.test(
          r.stderr
        )
      ) {
        return { state: 'exited' }
      }
      return { state: 'unverifiable' }
    } catch {
      return { state: 'unverifiable' }
    }
  }

  async ensure(args: {
    cwd: string
    shell: string
    command?: string
    cols: number
    rows: number
  }): Promise<{ pid: number; isNew: boolean }> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 })
    const release = await lockfile.lock(this.directory, {
      retries: { retries: 30, minTimeout: 50, maxTimeout: 100 }
    })
    try {
      const manifest = join(this.directory, 'orca-owner.json')
      const observation = await this.observe()
      let recorded = false
      try {
        recorded = JSON.parse(await readFile(manifest, 'utf8')).id === this.id
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
          throw error
        }
      }
      if (observation.state === 'unverifiable') {
        throw new Error('Cannot verify the sess execution host; refusing to create another session')
      }
      if (observation.state === 'live') {
        if (!recorded) {
          throw new Error('Session name is already owned by another creator')
        }
        return { pid: observation.pid, isNew: false }
      }
      if (recorded) {
        throw new Error('This sess session has exited; create a new terminal to start new work')
      }
      const state = {
        SESS_SESSION: this.name,
        SESS_BRANCH: 'main',
        SESS_CWD: args.cwd,
        SESS_CREATED: new Date().toISOString()
      }
      await writeFile(
        join(this.directory, 'state'),
        `${Object.entries(state)
          .map(([k, v]) => `${k}=${quotePosixShell(v)}`)
          .join('\n')}\n`,
        { mode: 0o600 }
      )
      // Persist intent before launch: an ambiguous create is never permission to replay an agent command.
      await writeFile(
        manifest,
        JSON.stringify({ id: this.id, cwd: args.cwd, session: this.name }),
        { flag: 'wx', mode: 0o600 }
      )
      const launch = args.command
        ? [args.shell, '-lic', `${args.command}\nexec ${quotePosixShell(args.shell)} -l`]
        : [args.shell, '-l']
      const command = launch.map(quotePosixShell).join(' ')
      const envArgs = Object.entries({
        ...this.env,
        SESS_DIR: this.root,
        SESS_SESSION: this.name
      }).flatMap(([k, v]) => ['-e', `${k}=${v}`])
      const result = await runProcess({
        program: 'tmux',
        args: [
          'new-session',
          '-d',
          '-s',
          this.name,
          '-c',
          args.cwd,
          '-x',
          String(args.cols),
          '-y',
          String(args.rows),
          ...envArgs,
          command
        ],
        env: this.env,
        timeoutMs: 10000,
        maxOutputBytes: 4096
      })
      if (result.code !== 0 || result.timedOut) {
        throw new Error(`sess creation was not acknowledged: ${result.stderr}`)
      }
      const live = await this.observe()
      if (live.state !== 'live') {
        throw new Error('sess started but no live shell could be verified')
      }
      return { pid: live.pid, isNew: true }
    } finally {
      await release()
    }
  }

  end(): void {
    const r = runProcessSync({
      program: 'tmux',
      args: ['kill-session', '-t', `=${this.name}`],
      env: this.env,
      timeoutMs: 3000,
      maxOutputBytes: 4096
    })
    if (r.code !== 0 || r.timedOut) {
      throw new Error(`Session stop was not acknowledged: ${r.stderr}`)
    }
  }
}
