# Themed tsconnect (fork branch `themed-console`)

A self-hosted Tailscale browser SSH client (Tailscale Connect / `cmd/tsconnect`)
with an Alacritty-like dark theme, exposed publicly via Tailscale Funnel.

## Changes vs upstream
- xterm.js theme: bg `#282828`, fg `#dcdcdc`, 16 ANSI colors from Alacritty/gruvbox-ish; minimumContrastRatio 4.5; Menlo/DejaVu mono font (`src/lib/ssh.ts`). Page/PWA theme-color and `.ts-term` match.
- PTY requests `TERM=xterm-256color` instead of `xterm` (`wasm/wasm_js.go`).
- No header bar; terminal fills the viewport, no scrollbars; window-resize refit.
- Logout: tiny ⏻ icon top-right, visible on hover/focus, once connected. Status label in the corner before that.
- PWA: `pwa/` (manifest, icons, network-first service worker that never caches the wasm), served by `serve.go`.
- `deploy/sshfunnel`: tiny tsnet node (hostname `ssh-arch`, set via `SSHFUNNEL_HOSTNAME` in the unit) that reverse-proxies to the local server over Funnel → `https://ssh-arch.<tailnet>.ts.net/`.

## Build & run
    ./tool/go run ./cmd/tsconnect build          # static assets into cmd/tsconnect/dist
    ./tool/go build -o ../tsconnect ./cmd/tsconnect
    ../tsconnect -addr 127.0.0.1:9091 serve      # flags go before the subcommand

Or just `cmd/tsconnect/deploy/install.sh` (builds both binaries next to the repo, installs and starts
`deploy/tsconnect-themed.service` and `deploy/tsconnect-sshfunnel.service` as systemd user units).
First start of `sshfunnel` prints a login URL in `journalctl --user -u tsconnect-sshfunnel`.
Funnel must be enabled for the tailnet. Disable key expiry for the `ssh-arch` node in the admin console.

## Update to a new upstream release
    cmd/tsconnect/deploy/update.sh

Fetches upstream tags, picks the newest stable `v1.<even>.<patch>`, rebases this branch onto it,
rebuilds, restarts the services and `git push --force-with-lease origin themed-console`.

## Stop / remove
    systemctl --user disable --now tsconnect-sshfunnel tsconnect-themed
