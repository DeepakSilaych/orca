import { TerminalTabs } from './terminal-tabs'
import { SessionConfirmation } from './session-confirmation'
import { WorkspaceSidebar } from './sidebar'
import { StatusBar } from './status-bar'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { TerminalSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { Host, Snapshot, RepoStatus, Integrations } from '../../../shared/magi/types'
import { WorkspaceForm, type FormKind } from './forms'
import { AppearanceSettings, type Appearance } from './settings'
import { SessionTerminal } from './terminal'
import { Repositories } from './repositories'
import type { OpenFile } from './editor'
const FileViewer = lazy(() => import('./editor').then((module) => ({ default: module.FileViewer })))
function readAppearance(): Appearance {
  try {
    const saved = JSON.parse(localStorage.getItem('magi.appearance') || '{}')
    return {
      theme: saved.theme === 'light' ? 'light' : 'dark',
      fontSize: Math.max(10, Math.min(22, Number(saved.fontSize) || 13)),
      compact: saved.compact === true
    }
  } catch {
    return { theme: 'dark', fontSize: 13, compact: false }
  }
}
export function MagiShell() {
  const [host, setHost] = useState('local')
  const [hosts, setHosts] = useState<Host[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [workspaceId, setWorkspaceId] = useState('genral')
  const [terminalId, setTerminalId] = useState('')
  const [statuses, setStatuses] = useState<RepoStatus[]>([])
  const [integrations, setIntegrations] = useState<Integrations>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState<FormKind>()
  const [settings, setSettings] = useState(false)
  const [appearance, setAppearance] = useState(readAppearance)
  const [query, setQuery] = useState('')
  const [file, setFile] = useState<OpenFile>()
  const [confirm, setConfirm] = useState<'archive' | 'terminal'>()
  const [busy, setBusy] = useState(false)
  const workspace = snapshot?.workspaces.find((w) => w.id === workspaceId)
  const terminal = workspace?.terminals.find((t) => t.id === terminalId) || workspace?.terminals[0]
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const report = useCallback((error: unknown) => setError(String(error)), [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', appearance.theme === 'dark')
    localStorage.setItem('magi.appearance', JSON.stringify(appearance))
  }, [appearance])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    window.magi
      .request<Snapshot>('local', 'snapshot')
      .then((result) => {
        if (active) {
          setHosts([
            ...result.hosts,
            ...result.sessRemotes.filter((h) => !result.hosts.some((r) => r.name === h.name))
          ])
        }
      })
      .catch(report)
    window.magi
      .request<Snapshot>(host, 'snapshot')
      .then((result) => {
        if (active) {
          setSnapshot(result)
          setLoading(false)
        }
      })
      .catch((error) => {
        if (active) {
          setError(String(error))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [host, revision, report])
  useEffect(() => {
    if (!workspace) {
      return
    }
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try {
        const result = await window.magi.request<{ repos: RepoStatus[] }>(host, 'status', {
          workspace: workspace.id
        })
        if (active) {
          setStatuses(result.repos)
        }
      } catch (e) {
        if (active) {
          report(e)
        }
      } finally {
        if (active) {
          timer = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              void poll()
            } else {
              timer = setTimeout(poll, 5000)
            }
          }, 5000)
        }
      }
    }
    void poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [host, workspace, revision, report])
  useEffect(() => {
    if (!workspace) {
      return
    }
    let active = true
    const load = () =>
      window.magi
        .request<Integrations>(host, 'integrations', { workspace: workspace.id })
        .then((value) => {
          if (active) {
            setIntegrations(value)
          }
        })
        .catch(() => {
          if (active) {
            setIntegrations(undefined)
          }
        })
    void load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load()
      }
    }, 60000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [host, workspace])
  const selectWorkspace = (id: string) => {
    setWorkspaceId(id)
    setTerminalId('')
    setFile(undefined)
    setStatuses([])
    setIntegrations(undefined)
  }
  const mutate = async (op: string, args: Record<string, unknown> = {}) => {
    setBusy(true)
    try {
      await window.magi.request(host, op, { workspace: workspaceId, ...args })
      refresh()
      return true
    } catch (e) {
      report(e)
      return false
    } finally {
      setBusy(false)
    }
  }
  const terminalNew = async () => {
    setBusy(true)
    try {
      const result = await window.magi.request<{ id: string }>(host, 'terminal_new', {
        workspace: workspaceId
      })
      setTerminalId(result.id)
      setFile(undefined)
      refresh()
    } catch (e) {
      report(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <TooltipProvider>
      <div
        className={`magi-shell bg-background text-foreground ${appearance.compact ? 'magi-compact' : ''}`}
      >
        <header className="magi-drag flex h-10 shrink-0 items-center border-b px-4">
          <span
            className={
              navigator.platform.includes('Mac')
                ? 'ml-20 text-sm font-semibold'
                : 'text-sm font-semibold'
            }
          >
            Magi
          </span>
          <span className="ml-3 text-xs text-muted-foreground">
            {host === 'local' ? 'Local' : host}
            {workspace && ` / ${workspace.name}`}
          </span>
        </header>
        <div className="flex min-h-0 flex-1">
          <WorkspaceSidebar
            host={host}
            hosts={hosts}
            snapshot={snapshot}
            workspaceId={workspaceId}
            query={query}
            setQuery={setQuery}
            selectHost={(value) => {
              setHost(value)
              setSnapshot(undefined)
              selectWorkspace('genral')
            }}
            selectWorkspace={selectWorkspace}
            setForm={setForm}
            openSettings={() => setSettings(true)}
          />
          <main className="flex min-w-0 flex-1 flex-col">
            <TerminalTabs
              workspace={workspace}
              terminal={terminal}
              file={file}
              busy={busy}
              setTerminalId={setTerminalId}
              setFile={setFile}
              terminalNew={terminalNew}
              setForm={setForm}
              setConfirm={setConfirm}
            />
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 border-b px-4 py-2 text-xs text-destructive"
              >
                <span className="flex-1">{error}</span>
                <Button size="xs" variant="outline" onClick={refresh}>
                  Retry
                </Button>
                <Button
                  aria-label="Dismiss error"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setError('')}
                >
                  <X />
                </Button>
              </div>
            )}
            <div className="relative min-h-0 flex-1">
              {file && workspace ? (
                <Suspense
                  fallback={<p className="p-4 text-sm text-muted-foreground">Loading editor…</p>}
                >
                  <FileViewer
                    host={host}
                    workspace={workspace.id}
                    file={file}
                    close={() => setFile(undefined)}
                    theme={appearance.theme}
                  />
                </Suspense>
              ) : terminal && workspace ? (
                <SessionTerminal
                  host={host}
                  workspace={workspace.id}
                  terminal={terminal.id}
                  fontSize={appearance.fontSize}
                  theme={appearance.theme}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                  <TerminalSquare className="size-8" />
                  <p className="text-sm">
                    {loading
                      ? 'Connecting to host…'
                      : workspace
                        ? 'Start a terminal in this workspace.'
                        : 'Select a workspace to start.'}
                  </p>
                  {workspace && (
                    <Button size="sm" onClick={() => void terminalNew()}>
                      New terminal
                    </Button>
                  )}
                </div>
              )}
            </div>
          </main>
          <div className="w-80 shrink-0">
            {workspace && (
              <Repositories
                host={host}
                workspace={workspace}
                statuses={statuses}
                openFile={setFile}
                refresh={refresh}
                report={report}
              />
            )}
          </div>
        </div>
        <StatusBar
          host={host}
          loading={loading}
          snapshot={snapshot}
          statuses={statuses}
          integrations={integrations}
          workspace={workspace}
          attachTicket={() => setForm('ticket')}
        />
        {form && snapshot && (
          <WorkspaceForm
            key={form}
            kind={form}
            host={host}
            snapshot={snapshot}
            workspace={workspace}
            close={() => setForm(undefined)}
            done={(id) => {
              if (id) {
                selectWorkspace(id)
              }
              refresh()
            }}
          />
        )}
        {settings && (
          <AppearanceSettings
            value={appearance}
            update={setAppearance}
            close={() => setSettings(false)}
          />
        )}
        {confirm && (
          <SessionConfirmation
            kind={confirm}
            busy={busy}
            close={() => setConfirm(undefined)}
            confirm={async () => {
              const ok =
                confirm === 'archive'
                  ? await mutate('workspace_archive')
                  : await mutate('terminal_remove', { terminal: terminal?.id })
              if (ok) {
                if (confirm === 'archive') {
                  selectWorkspace('genral')
                }
                setConfirm(undefined)
              }
            }}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
