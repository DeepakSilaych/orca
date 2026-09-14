import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, GitBranch, Plus, Minus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getFileTypeIcon } from '@/lib/file-type-icons'
import type { FileEntry, RepoStatus, Workspace } from '../../../shared/magi/types'
import type { OpenFile } from './editor'
type Props = {
  host: string
  workspace: Workspace
  statuses: RepoStatus[]
  openFile: (file: OpenFile) => void
  refresh: () => void
  report: (error: unknown) => void
}
function Directory({
  host,
  workspace,
  repo,
  directory = '',
  depth = 0,
  openFile
}: {
  host: string
  workspace: string
  repo: string
  directory?: string
  depth?: number
  openFile: Props['openFile']
}) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [error, setError] = useState('')
  const [limited, setLimited] = useState(false)
  useEffect(() => {
    let active = true
    window.magi
      .request<{ entries: FileEntry[]; limited: boolean }>(host, 'files', {
        workspace,
        repo,
        directory
      })
      .then((result) => {
        if (active) {
          setEntries(result.entries)
          setLimited(result.limited)
        }
      })
      .catch((e) => {
        if (active) {
          setError(String(e))
        }
      })
    return () => {
      active = false
    }
  }, [host, workspace, repo, directory])
  return (
    <>
      {error && (
        <p role="alert" className="px-3 text-xs text-destructive">
          {error}
        </p>
      )}
      {entries.map((entry) => {
        const Icon = entry.directory ? Folder : getFileTypeIcon(entry.name)
        const open = expanded.includes(entry.path)
        return (
          <div key={entry.path}>
            <button
              className="magi-row text-xs"
              style={{ paddingLeft: 12 + depth * 12 }}
              onClick={() =>
                entry.directory
                  ? setExpanded(
                      open ? expanded.filter((p) => p !== entry.path) : [...expanded, entry.path]
                    )
                  : openFile({ repo, path: entry.path })
              }
            >
              {entry.directory ? (
                open ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )
              ) : (
                <span className="w-3" />
              )}
              <Icon className="size-4 text-muted-foreground" />
              <span className="truncate">{entry.name}</span>
            </button>
            {open && (
              <Directory
                host={host}
                workspace={workspace}
                repo={repo}
                directory={entry.path}
                depth={depth + 1}
                openFile={openFile}
              />
            )}
          </div>
        )
      })}
      {limited && <p className="p-3 text-xs text-muted-foreground">First 2,000 entries shown.</p>}
    </>
  )
}
function Repository({ repo, props, view }: { repo: RepoStatus; props: Props; view: string }) {
  const [expanded, setExpanded] = useState(props.statuses.length === 1)
  const [visibleCount, setVisibleCount] = useState(100)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const action = async (action: string, path = '') => {
    setBusy(true)
    try {
      await window.magi.request(props.host, 'git_action', {
        workspace: props.workspace.id,
        repo: repo.id,
        action,
        path,
        message
      })
      if (action === 'commit') {
        setMessage('')
      }
      props.refresh()
    } catch (e) {
      props.report(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="border-b pb-2">
      <button
        className="magi-row rounded-none py-2 text-xs font-medium"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span className="flex-1 truncate">{repo.name}</span>
        <span className="text-muted-foreground">
          {repo.utility ? 'shared' : repo.files.length || ''}
        </span>
      </button>
      {expanded && (
        <>
          <div className="flex items-center gap-1 px-3 pb-2 text-xs text-muted-foreground">
            <GitBranch className="size-3" />
            <span className="truncate">{repo.branch || 'Repository'}</span>
            {repo.ahead > 0 && <span>↑{repo.ahead}</span>}
            {repo.behind > 0 && <span>↓{repo.behind}</span>}
          </div>
          {repo.error ? (
            <p className="px-3 text-xs text-destructive">{repo.error}</p>
          ) : view === 'files' ? (
            <Directory
              host={props.host}
              workspace={props.workspace.id}
              repo={repo.id}
              openFile={props.openFile}
            />
          ) : (
            <>
              {(['staged', 'working'] as const).map((scope) => {
                const rows = repo.files
                  .filter((f) =>
                    scope === 'staged'
                      ? !['.', '?'].includes(f.index)
                      : f.worktree !== '.' || f.untracked
                  )
                  .sort((a, b) => Number(a.untracked) - Number(b.untracked))
                return (
                  rows.length > 0 && (
                    <div key={scope}>
                      <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
                        {scope === 'staged' ? 'Staged changes' : 'Changes'}{' '}
                        <span>{rows.length}</span>
                      </p>
                      {rows.slice(0, visibleCount).map((file) => {
                        const code = scope === 'staged' ? file.index : file.worktree
                        const Icon = getFileTypeIcon(file.path)
                        const color = file.conflict
                          ? 'var(--destructive)'
                          : code === 'D'
                            ? 'var(--git-decoration-deleted)'
                            : file.untracked || code === 'A'
                              ? 'var(--git-decoration-added)'
                              : 'var(--git-decoration-modified)'
                        return (
                          <div key={file.path} className="group flex items-center px-2">
                            <button
                              className="magi-row min-w-0 flex-1 text-xs"
                              onClick={() =>
                                props.openFile({ repo: repo.id, path: file.path, scope })
                              }
                            >
                              <Icon className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate" title={file.path}>
                                {file.path}
                              </span>
                              <span className="ml-auto" style={{ color }}>
                                {file.conflict ? '!' : code}
                              </span>
                            </button>
                            <Button
                              disabled={busy || file.conflict}
                              aria-label={`${scope === 'staged' ? 'Unstage' : 'Stage'} ${file.path}`}
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                void action(scope === 'staged' ? 'unstage' : 'stage', file.path)
                              }
                            >
                              {scope === 'staged' ? <Minus /> : <Plus />}
                            </Button>
                          </div>
                        )
                      })}
                      {rows.length > visibleCount && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mx-2"
                          onClick={() => setVisibleCount((count) => count + 100)}
                        >
                          Show next {Math.min(100, rows.length - visibleCount)} of{' '}
                          {rows.length - visibleCount} remaining
                        </Button>
                      )}
                    </div>
                  )
                )
              })}
              {repo.files.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Working tree clean</p>
              )}
              {repo.files.some((f) => !['.', '?'].includes(f.index)) && (
                <form
                  className="space-y-2 p-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void action('commit')
                  }}
                >
                  <Input
                    aria-label={`Commit message for ${repo.name}`}
                    placeholder="Commit message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button className="w-full" size="sm" disabled={busy || !message.trim()}>
                    Commit staged
                  </Button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
export function Repositories(props: Props) {
  const [view, setView] = useState('git')
  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-sidebar">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-2">
        <Tabs value={view} onValueChange={setView}>
          <TabsList variant="line">
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="git">Source control</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          aria-label="Refresh repositories"
          variant="ghost"
          size="icon-xs"
          onClick={props.refresh}
        >
          <RefreshCw />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-sleek">
        {props.statuses.map((repo) => (
          <Repository key={repo.id} repo={repo} props={props} view={view} />
        ))}
        {props.statuses.length === 0 && (
          <p className="p-4 text-xs leading-relaxed text-muted-foreground">
            Attach repositories to browse files and changes. Blank workspaces can attach worktrees
            later through the Magi CLI.
          </p>
        )}
      </div>
    </aside>
  )
}
