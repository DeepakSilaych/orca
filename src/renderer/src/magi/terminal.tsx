import { shiftEnterInput } from '../components/terminal-pane/terminal-shift-enter-input'
import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Button } from '@/components/ui/button'
export function SessionTerminal({
  host,
  workspace,
  terminal,
  fontSize,
  theme,
  active = true
}: {
  host: string
  workspace: string
  terminal: string
  fontSize: number
  theme: string
  active?: boolean
}) {
  const focused = useRef(active)
  focused.current = active
  const instance = useRef<Terminal | null>(null)
  useEffect(() => {
    if (active && !document.querySelector('[data-magi-renaming]')) {
      instance.current?.focus()
    }
  }, [active])
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!container.current) {
      return
    }
    let cancelled = false
    const key = JSON.stringify([host, workspace, terminal])
    const style = getComputedStyle(document.documentElement)
    const term = new Terminal({
      fontSize,
      fontFamily: 'Menlo, Monaco, monospace',
      cursorBlink: true,
      scrollback: 10000,
      theme: {
        background: style.getPropertyValue('--background').trim(),
        foreground: style.getPropertyValue('--foreground').trim()
      }
    })
    term.attachCustomKeyEventHandler((event) => {
      if (
        event.key !== 'Enter' ||
        !event.shiftKey ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.isComposing ||
        event.keyCode === 229
      ) {
        return true
      }
      if (event.type === 'keydown') {
        event.preventDefault()
        window.magi.write(key, shiftEnterInput(false))
      }
      return false
    })
    instance.current = term
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(container.current)
    let frame = requestAnimationFrame(() => fit.fit())
    const off = window.magi.onTerminal((event) => {
      if (event.key !== key || cancelled) {
        return
      }
      if (event.data) {
        term.write(event.data)
      }
      if (event.state === 'unverifiable') {
        setError('Connection lost. The session may still be running. Reconnect to check.')
      }
    })
    const input = term.onData((data) => window.magi.write(key, data))
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (cancelled) {
          return
        }
        fit.fit()
        window.magi.resize(key, term.cols, term.rows)
      })
    })
    resize.observe(container.current)
    setError('')
    window.magi
      .attach(host, workspace, terminal, term.cols, term.rows)
      .then(() => {
        if (!cancelled) {
          fit.fit()
          window.magi.resize(key, term.cols, term.rows)
          if (focused.current && !document.querySelector('[data-magi-renaming]')) {
            term.focus()
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(String(error))
        }
      })
    return () => {
      cancelled = true
      off()
      input.dispose()
      resize.disconnect()
      cancelAnimationFrame(frame)
      window.magi.detach(key)
      instance.current = null
      term.dispose()
    }
  }, [host, workspace, terminal, fontSize, theme, attempt])
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div ref={container} className="magi-terminal min-h-0 flex-1 p-3" />
      {error && (
        <div
          role="alert"
          className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-md border bg-popover p-3 text-sm"
        >
          <span className="flex-1">{error}</span>
          <Button size="sm" onClick={() => setAttempt(attempt + 1)}>
            Reconnect
          </Button>
        </div>
      )}
    </div>
  )
}
