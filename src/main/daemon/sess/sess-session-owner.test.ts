import { describe, expect, it, vi } from 'vitest'
import { runProcess } from '../../../shared/child-process/run-process'
import { SessSessionOwner } from './sess-session-owner'

vi.mock('../../../shared/child-process/run-process', () => ({
  runProcess: vi.fn(),
  runProcessSync: vi.fn()
}))

describe('sess liveness evidence', () => {
  const owner = new SessSessionOwner('/test-root', 'test-pane', {})
  it.each([
    { code: 1, stderr: 'permission denied', timedOut: false },
    { code: 1, stderr: "can't find session: test", timedOut: true },
    { code: 0, stdout: 'malformed', stderr: '', timedOut: false }
  ])('keeps failed or malformed probes unverifiable', async (result) => {
    vi.mocked(runProcess).mockResolvedValue({ stdout: '', signal: null, ...result })
    expect(await owner.observe()).toEqual({ state: 'unverifiable' })
  })
  it('accepts only host-proven absence as exited', async () => {
    vi.mocked(runProcess).mockResolvedValue({
      code: 1,
      stdout: '',
      stderr: "can't find session: test",
      signal: null,
      timedOut: false
    })
    expect(await owner.observe()).toEqual({ state: 'exited' })
  })
  it('reads the host pane PID and foreground command', async () => {
    vi.mocked(runProcess).mockResolvedValue({
      code: 0,
      stdout: '123|bash\n',
      stderr: '',
      signal: null,
      timedOut: false
    })
    expect(await owner.observe()).toEqual({ state: 'live', pid: 123, command: 'bash' })
  })
})
