import { useState } from 'react'
import { File, X } from 'lucide-react'
import type { OpenFile } from './editor'
export const fileKey = (file: OpenFile) => JSON.stringify([file.repo, file.path, file.scope])
export function useFileTabs(context: string) {
  const [groups, setGroups] = useState<Record<string, { files: OpenFile[]; active?: OpenFile }>>({})
  const current = groups[context] || { files: [] }
  const select = (file?: OpenFile) =>
    setGroups((all) => {
      const group = all[context] || { files: [] }
      return {
        ...all,
        [context]: {
          files:
            file && !group.files.some((f) => fileKey(f) === fileKey(file))
              ? [...group.files, file]
              : group.files,
          active: file
        }
      }
    })
  const close = (file = current.active) => {
    if (!file) {
      return
    }
    setGroups((all) => {
      const group = all[context] || { files: [] }
      return {
        ...all,
        [context]: {
          files: group.files.filter((f) => fileKey(f) !== fileKey(file)),
          active: group.active && fileKey(group.active) === fileKey(file) ? undefined : group.active
        }
      }
    })
  }
  return { files: current.files, file: current.active, select, close }
}
export function FileTabs({
  files,
  active,
  select,
  close
}: {
  files: OpenFile[]
  active?: OpenFile
  select: (file: OpenFile) => void
  close: (file: OpenFile) => void
}) {
  return files.map((file) => (
    <div
      key={fileKey(file)}
      className={`flex h-full shrink-0 items-center border-r ${active && fileKey(active) === fileKey(file) ? 'border-b-2 border-b-foreground bg-accent' : ''}`}
    >
      <button
        title={file.path}
        aria-selected={!!active && fileKey(active) === fileKey(file)}
        className="flex h-full items-center gap-2 px-3 text-xs"
        onClick={() => select(file)}
      >
        <File className="size-3.5" />
        <span className="max-w-48 truncate">
          {file.path.split('/').pop()}
          {file.scope && ` · ${file.scope}`}
        </span>
      </button>
      <button
        className="p-2 text-muted-foreground hover:text-foreground"
        aria-label={`Close ${file.path.split('/').pop()}`}
        onClick={() => close(file)}
      >
        <X className="size-3" />
      </button>
    </div>
  ))
}
