<p align="center"><img src="resources/magi/brand/icon.png" width="96" alt="Magi" /></p>
<h1 align="center">Magi</h1>
<p align="center">Multi-repo terminal workspaces for coding agents.</p>

[Download Magi](https://github.com/DeepakSilaych/orca/releases) · [Architecture and CLI](docs/magi/lite-v1.md)

Magi builds on Orca's UI with sess-owned local and SSH sessions. Each workspace groups worktrees from several repositories, terminal tabs and nested splits, with files, diffs, Git status, PRs and attached Linear tickets in one window. Closing the app leaves sessions running on their execution host.

- Workspaces on the left, terminal tabs above, files and source control on the right.
- A permanent **Genral** workspace on each host, with a file browser and multiple file tabs.
- Cmd-click HTTP or HTTPS terminal URLs to open your browser, or existing file paths to open a file tab. Hold Cmd to underline available links; relative paths resolve against the terminal’s current directory on its execution host. File links support line and column numbers.
- New or existing branches across selected repos, or blank workspaces that agents can attach repos to later.
- GitHub cloning through `gh`; shared utility repositories without worktrees.
- Drag anywhere on a workspace row or terminal tab to reorder it. Click to select; click its selected name again, double-click the name, press F2, or use Rename in its context menu.
- Right-click workspaces, terminal tabs, file tabs, panes, files, and Git changes for context actions. Each terminal tab has its own explicit End session control; file tabs close independently.
- Tab overflow stays navigable with All tabs and automatic scrolling; New terminal stays visible.
- Host/workspace/terminal selection, open file tabs, editor scroll positions, and expanded file folders restore across restarts. File tabs deduplicate by canonical host path while keeping staged/working diffs separate.
- Opening a file keeps terminal views attached. The cache retains at most three terminal groups, limited to twelve panes across cached groups (a larger active group remains intact).
- File tabs support Reveal in file tree and Close other files; the tree highlights the active file and preserves expanded folders on refresh. Read-only previews and diff tabs are labeled explicitly.
- Double-click split dividers to equalize panes. PRs use a compact menu; the changes count opens source control and an attached Linear ticket opens its URL.
- Agent logos replace generic terminal icons for Claude Code, Codex, Gemini CLI, OpenCode, Aider, Amp, Droid, GitHub Copilot, Cursor Agent, and Pi. Detection uses foreground processes on the execution host, refreshes with workspace status, and falls back to the terminal icon when identity is unavailable. Logos are bundled locally.
- Settings contains theme, terminal font size, compact rows and release updates.

VM terminal selection uses the local clipboard: drag to select, then Cmd+C on macOS (Ctrl+Shift+C on Linux). Ctrl+C remains a terminal interrupt. Magi disables inherited tmux mouse capture only for its own sessions; Shift-drag forces local selection when an agent itself captures the mouse. Copy-path actions also use the native clipboard.

## Keyboard shortcuts

Use Cmd on macOS; Ctrl on Linux.

| Shortcut         | Action                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Cmd+Up / Down    | Previous / next workspace                                           |
| Cmd+Left / Right | Previous / next terminal tab                                        |
| Cmd+N            | New workspace                                                       |
| Cmd+T            | New terminal tab                                                    |
| Cmd+D            | Split the focused pane side by side                                 |
| Cmd+Shift+D      | Split the focused pane above/below                                  |
| Cmd+W            | Close the file or focused terminal pane; archive an empty workspace |

Splits can nest. Drag their dividers to resize; layouts and order survive restart. Closing an individual pane ends that session. Archiving an empty workspace retains its worktrees; Genral cannot be archived.

## Install with Homebrew

```sh
brew install --cask deepaksilaych/tap/magi
```

Or run `brew tap deepaksilaych/tap`, then `brew install --cask magi`. Update with `brew update && brew upgrade --cask magi`.

The cask installs Git, gh, tmux and Python for local sessions. Install your coding-agent CLI separately; remote hosts need their own tools and must be reachable through SSH.

## macOS release

**v0.2.4 supports Apple Silicon on macOS 12+.** It uses an ad-hoc signature with strict verification during packaging. It is **not Developer ID-signed or notarized**: macOS may still block first launch and require approval in System Settings → Privacy & Security. The tap does not disable Gatekeeper or remove quarantine.

If a manual copy already exists in Applications, move that app aside before Homebrew installation. Workspace data is separate and retained. Direct DMG and ZIP downloads are also available from Releases. Automatic in-app installation remains disabled until signed updates are available.

Both sidebars resize by dragging their inner edges; the top-right buttons hide or restore them. Widths and visibility persist. Shift+Enter uses Orca's non-submit terminal encoding.

Native Windows sessions are not supported. Intel Mac and Linux desktop installers are not included in this release.

## Development

```sh
pnpm install
pnpm dev
# Host Apple Silicon release:
pnpm release:magi:mac
```

Release packaging stages only Magi's compiled app and node-pty. Upstream mobile, task, automation and account UI is excluded from the active build. Run `pnpm run ensure:electron-runtime` before packaging if native dependencies were rebuilt for Node.

See [the architecture guide](docs/magi/lite-v1.md) for host paths, CLI usage and verification. Magi is an MIT-licensed fork of [Orca](https://github.com/stablyai/orca); upstream code and attribution remain in the repository. The bundled sess license is in `resources/magi/backend/SESS-LICENSE`.
