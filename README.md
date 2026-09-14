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

## First release

**v0.2.0 is an unsigned, unnotarized macOS Apple Silicon build.** Open the DMG and drag Magi into Applications. macOS may require approval in System Settings → Privacy & Security on first launch. This build provides a Releases link for manual updates; automatic installation is disabled until a signed build is available. Replacing the app preserves workspace data and sess sessions.

Execution hosts require Python 3, Git and tmux. Install `gh` for GitHub cloning and PR status, and your preferred coding-agent CLI separately. SSH hosts must already be reachable through your SSH config. Native Windows sessions are not supported in this release. Intel Mac and Linux desktop packages are not included in this first build.

## Development

```sh
pnpm install
pnpm dev
# Host Apple Silicon release:
pnpm release:magi:mac
```

Release packaging stages only Magi's compiled app and node-pty. Upstream mobile, task, automation and account UI is excluded from the active build. Run `pnpm run ensure:electron-runtime` before packaging if native dependencies were rebuilt for Node.

See [the architecture guide](docs/magi/lite-v1.md) for host paths, CLI usage and verification. Magi is an MIT-licensed fork of [Orca](https://github.com/stablyai/orca); upstream code and attribution remain in the repository. The bundled sess license is in `resources/magi/backend/SESS-LICENSE`.
