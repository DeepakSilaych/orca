import { Archive, FolderGit2, Plus, TerminalSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Workspace, Session } from '../../../shared/magi/types'
import type { OpenFile } from './editor'
import type { FormKind } from './forms'
export function TerminalTabs({
  workspace,
  terminal,
  file,
  busy,
  setTerminalId,
  setFile,
  terminalNew,
  setForm,
  setConfirm
}: {
  workspace?: Workspace
  terminal?: Session
  file?: OpenFile
  busy: boolean
  setTerminalId: (id: string) => void
  setFile: (file?: OpenFile) => void
  terminalNew: () => Promise<void>
  setForm: (form: FormKind) => void
  setConfirm: (kind: 'archive' | 'terminal') => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center overflow-x-auto border-b">
      <div className="flex h-full min-w-0 flex-1 items-center">
        {workspace?.terminals.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTerminalId(t.id)
              setFile(undefined)
            }}
            className={`flex h-full shrink-0 items-center gap-2 border-r px-4 text-xs ${terminal?.id === t.id && !file ? 'border-b-2 border-b-foreground bg-accent' : 'text-muted-foreground hover:bg-accent'}`}
          >
            <TerminalSquare className="size-3.5" />
            {t.name}
          </button>
        ))}
        {workspace && (
          <Button
            aria-label="New terminal"
            title="New terminal"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={() => void terminalNew()}
          >
            <Plus />
          </Button>
        )}
      </div>
      {workspace && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setForm('attach')}>
            <FolderGit2 />
            Attach repos
          </Button>
          {!workspace.permanent && (
            <Button
              aria-label="Archive workspace"
              title="Archive workspace"
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirm('archive')}
            >
              <Archive />
            </Button>
          )}
          {terminal && (
            <Button
              aria-label="End terminal session"
              title="End terminal session"
              variant="ghost"
              size="icon-sm"
              onClick={() => setConfirm('terminal')}
            >
              <X />
            </Button>
          )}
        </>
      )}
    </div>
  )
}
