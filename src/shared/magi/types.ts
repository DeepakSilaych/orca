export type Host = { name: string; ssh: string; root: string }
export type Repo = {
  id: string
  name: string
  path: string
  utility: boolean
  branch?: string
  base?: string
}
export type Session = { id: string; name: string; cwd: string }
export type Workspace = {
  id: string
  name: string
  path: string
  repos: Repo[]
  terminals: Session[]
  ticket: string | null
  permanent?: boolean
}
export type Snapshot = {
  root: string
  hosts: Host[]
  sessRemotes: Host[]
  repos: Repo[]
  workspaces: Workspace[]
  tools: Record<string, boolean>
  errors: string[]
}
export type Change = {
  path: string
  original?: string
  index: string
  worktree: string
  untracked: boolean
  conflict: boolean
}
export type RepoStatus = Repo & {
  files: Change[]
  branch: string
  ahead: number
  behind: number
  error: string | null
}
export type FileEntry = { name: string; path: string; directory: boolean; symlink: boolean }
export type Integrations = {
  prs: {
    repo: string
    error: string | null
    prs: { number: number; state: string; url: string; title: string }[]
  }[]
  ticket: {
    id?: string
    error?: string
    issue?: { identifier: string; title: string; url: string; state: { name: string } }
  }
}
export type TerminalEvent = {
  key: string
  data?: string
  state?: 'live' | 'unverifiable' | 'exited'
}
export type MagiApi = {
  request: <T>(host: string, op: string, args?: Record<string, unknown>) => Promise<T>
  attach: (
    host: string,
    workspace: string,
    terminal: string,
    cols: number,
    rows: number
  ) => Promise<string>
  write: (key: string, data: string) => void
  resize: (key: string, cols: number, rows: number) => void
  detach: (key: string) => void
  onTerminal: (listener: (event: TerminalEvent) => void) => () => void
  chooseDirectory: () => Promise<string | null>
  openExternal: (url: string) => Promise<void>
}
declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Browser globals require interface declaration merging.
  interface Window {
    magi: MagiApi
  }
}
