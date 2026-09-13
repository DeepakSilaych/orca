import { Server, GitBranch, Link2 } from 'lucide-react'
import type { Snapshot, RepoStatus, Integrations, Workspace } from '../../../shared/magi/types'
export function StatusBar({
  host,
  loading,
  snapshot,
  statuses,
  integrations,
  workspace,
  attachTicket
}: {
  host: string
  loading: boolean
  snapshot?: Snapshot
  statuses: RepoStatus[]
  integrations?: Integrations
  workspace?: Workspace
  attachTicket: () => void
}) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-4 overflow-hidden border-t px-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Server className="size-3" />
        {loading ? 'Connecting' : snapshot ? host : 'Unverifiable'}
      </span>
      <span className="flex items-center gap-1">
        <GitBranch className="size-3" />
        {statuses.length} repos · {statuses.reduce((sum, r) => sum + r.files.length, 0)} changes
      </span>
      {integrations?.prs.flatMap((r) =>
        r.prs.map((pr) => (
          <button
            key={r.repo + pr.number}
            title={pr.title}
            className="hover:text-foreground"
            onClick={() => void window.magi.openExternal(pr.url)}
          >
            {r.repo} #{pr.number} · {pr.state.toLowerCase()}
          </button>
        ))
      )}
      <span className="flex-1" />
      {workspace && (
        <button
          title={integrations?.ticket.error || 'Attach Linear ticket'}
          className="flex items-center gap-1 hover:text-foreground"
          onClick={attachTicket}
        >
          <Link2 className="size-3" />
          {integrations?.ticket.issue
            ? `${integrations.ticket.issue.identifier} · ${integrations.ticket.issue.state.name}`
            : workspace.ticket || 'Attach ticket'}
        </button>
      )}
    </footer>
  )
}
