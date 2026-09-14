<p align="center"><img src="resources/magi/brand/icon.png" width="96" alt="Magi" /></p>
<h1 align="center">Magi</h1>
<p align="center">Multi-repo terminal workspaces for coding agents.</p>

[Download Magi](https://github.com/DeepakSilaych/orca/releases) · [Architecture and CLI](docs/magi/lite-v1.md)

Magi builds on Orca's UI with sess-owned local and SSH sessions. Each workspace groups worktrees from several repositories, terminal tabs and nested splits, with files, diffs, Git status, PRs and attached Linear tickets in one window. Closing the app leaves sessions running on their execution host.

- Workspaces on the left, terminal tabs above, files and source control on the right.
- A permanent **Genral** workspace on each host.
- New or existing branches across selected repos, or blank workspaces that agents can attach repos to later.
- GitHub cloning through `gh`; shared utility repositories without worktrees.
- Drag the grip beside a workspace or terminal tab to reorder it. Click to select; click its selected name again, double-click, or press F2 to rename.
- Settings contains theme, terminal font size, compact rows and release updates.

## Keyboard shortcuts

Use Cmd on macOS; Ctrl on Linux.

| Shortcut | Action |
| --- | --- |
| Cmd+Up / Down | Previous / next workspace |
| Cmd+Left / Right | Previous / next terminal tab |
| Cmd+N | New workspace |
| Cmd+T | New terminal tab |
| Cmd+D | Split the focused pane side by side |
| Cmd+Shift+D | Split the focused pane above/below |
| Cmd+W | Close the file or focused terminal pane; archive an empty workspace |

Splits can nest. Drag their dividers to resize; layouts and order survive restart. Closing an individual pane ends that session. Archiving an empty workspace retains its worktrees; Genral cannot be archived.

## Install with Homebrew

```sh
brew install --cask deepaksilaych/tap/magi
```

Or run `brew tap deepaksilaych/tap`, then `brew install --cask magi`. Update with `brew update && brew upgrade --cask magi`.

The cask installs Git, gh, tmux and Python for local sessions. Install your coding-agent CLI separately; remote hosts need their own tools and must be reachable through SSH.

## macOS release

**v0.2.1 supports Apple Silicon on macOS 12+.** It repairs v0.2.0's invalid bundle signature using an ad-hoc signature with strict verification during packaging. It is **not Developer ID-signed or notarized**: macOS may still block first launch and require approval in System Settings → Privacy & Security. The tap does not disable Gatekeeper or remove quarantine.

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
