import { useEffect, useState } from 'react'
import Editor, { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import { installMonacoDiffEditorDisposalGuard } from '@/lib/monaco-diff-editor-disposal'
import { diffEditorScrollbarOptions } from '@/components/editor/diff-editor-scrollbar-options'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
globalThis.MonacoEnvironment = {
  getWorker: (_id, label) => {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    if (label === 'json') {
      return new jsonWorker()
    }
    if (['css', 'scss', 'less'].includes(label)) {
      return new cssWorker()
    }
    if (['html', 'handlebars', 'razor'].includes(label)) {
      return new htmlWorker()
    }
    return new editorWorker()
  }
}
installMonacoDiffEditorDisposalGuard(monaco)
monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
monaco.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true
})
loader.config({ monaco })
export type OpenFile = {
  repo: string
  path: string
  scope?: 'working' | 'staged'
  line?: number
  column?: number
}
export function FileViewer({
  host,
  workspace,
  file,
  close,
  theme
}: {
  host: string
  workspace: string
  file: OpenFile
  close: () => void
  theme: string
}) {
  const [content, setContent] = useState<{
    text?: string
    original?: string
    modified?: string
    truncated?: boolean
    binary?: boolean
  }>()
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setContent(undefined)
    setError('')
    window.magi
      .request<typeof content>(host, file.scope ? 'diff_content' : 'file', {
        workspace,
        repo: file.repo,
        path: file.path,
        scope: file.scope
      })
      .then((value) => {
        if (active) {
          setContent(value)
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
  }, [host, workspace, file])
  const language =
    {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rs: 'rust',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      sh: 'shell',
      go: 'go'
    }[file.path.split('.').pop() || ''] || 'plaintext'
  const options = {
    readOnly: true,
    scrollbar: diffEditorScrollbarOptions,
    minimap: { enabled: false },
    fontSize: 13,
    automaticLayout: true,
    scrollBeyondLastLine: false
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b px-3 text-xs">
        <span className="flex-1 truncate">
          {file.repo.startsWith('@') ? '' : `${file.repo} / `}
          {file.path}
          {file.scope && ` · ${file.scope} diff`}
        </span>
        <Button aria-label="Close file" variant="ghost" size="icon-xs" onClick={close}>
          <X />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="p-4 text-sm text-destructive">
          {error}
        </p>
      ) : !content ? (
        <p className="p-4 text-sm text-muted-foreground">Loading file…</p>
      ) : content.binary || content.truncated ? (
        <p className="p-4 text-sm text-muted-foreground">
          {content.binary
            ? 'Binary file. Preview unavailable.'
            : 'File exceeds the 2 MB preview limit.'}
        </p>
      ) : file.scope ? (
        <DiffEditor
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          onMount={(editor) => {
            const model = editor.getModel()
            editor.onDidDispose(() => {
              model?.original.dispose()
              model?.modified.dispose()
            })
          }}
          original={content.original}
          modified={content.modified}
          language={language}
          theme={theme === 'light' ? 'vs' : 'vs-dark'}
          options={{ ...options, renderSideBySide: true }}
        />
      ) : (
        <Editor
          onMount={(editor) => {
            if (file.line) {
              editor.revealLineInCenter(file.line)
              editor.setPosition({ lineNumber: file.line, column: file.column || 1 })
            }
          }}
          value={content.text}
          language={language}
          theme={theme === 'light' ? 'vs' : 'vs-dark'}
          options={options}
        />
      )}
    </div>
  )
}
