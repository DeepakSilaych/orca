import type { useFileTabs } from './file-tabs'
import { FileTabs } from './file-tabs'
import { ReorderList } from './reorder-list'
import { terminalTabs } from '../../../shared/magi/types'
import { RenameItem } from './rename-item'
import { Archive, FolderGit2, Plus, TerminalSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Workspace, Session } from '../../../shared/magi/types'
import type { OpenFile } from './editor'
import type { FormKind } from './forms'
export function TerminalTabs({
  fileTabs,
  host,
  refresh,
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
  fileTabs: ReturnType<typeof useFileTabs>
  host: string
  refresh: () => void
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
  const tabs = terminalTabs(workspace?.terminals || [])
  return (
    <div className="flex h-11 shrink-0 items-center overflow-hidden border-b">
      <div className="flex h-full min-w-0 flex-1 items-center overflow-x-auto scrollbar-sleek">
        <ReorderList
          items={tabs}
          horizontal
          disabled={busy}
          reorder={async (ids) => {
            await window.magi.request(host, 'terminal_reorder', {
              workspace: workspace?.id,
              ids: ids.map((id) => {
                const t = tabs.find((t) => t.id === id)!
                return t.tab_id || t.id
              })
            })
            refresh()
          }}
        >
          {(t) => (
            <RenameItem
              key={t.id}
              name={t.name}
              kind="terminal"
              selected={(terminal?.tab_id || terminal?.id) === (t.tab_id || t.id) && !file}
              enabled={!busy}
              select={() => {
                setTerminalId(t.id)
                setFile(undefined)
              }}
              rename={async (name) => {
                await window.magi.request(host, 'terminal_rename', {
                  workspace: workspace?.id,
                  terminal: t.id,
                  name
                })
                refresh()
              }}
              className={`flex h-full shrink-0 items-center gap-2 border-r px-4 text-xs ${(terminal?.tab_id || terminal?.id) === (t.tab_id || t.id) && !file ? 'border-b-2 border-b-foreground bg-accent' : 'text-muted-foreground hover:bg-accent'}`}
              leading={<TerminalSquare className="size-3.5" />}
            />
          )}
        </ReorderList>
        <FileTabs files={fileTabs.files} active={file} select={setFile} close={fileTabs.close} />
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
        <div className="flex h-full shrink-0 items-center border-l bg-background px-1">
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
        </div>
      )}
    </div>
  )
}
