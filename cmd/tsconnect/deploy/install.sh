#!/usr/bin/env bash
# Build the themed tsconnect + sshfunnel, install systemd user units, start them.
set -euo pipefail
ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
OUT="${OUT:-$(dirname "$ROOT")}"   # binaries go next to the repo (~/dev/tsconnect-themed)
cd "$ROOT"
./tool/go run ./cmd/tsconnect build
./tool/go build -o "$OUT/tsconnect" ./cmd/tsconnect
./tool/go build -o "$OUT/sshfunnel" ./cmd/tsconnect/deploy/sshfunnel
mkdir -p ~/.config/systemd/user
for u in tsconnect-themed tsconnect-sshfunnel; do
  sed "s|%h/dev/tsconnect-themed|$OUT|g" "cmd/tsconnect/deploy/$u.service" > ~/.config/systemd/user/$u.service
done
systemctl --user daemon-reload
systemctl --user enable --now tsconnect-themed tsconnect-sshfunnel
systemctl --user restart tsconnect-themed tsconnect-sshfunnel
echo "Installed. First run of sshfunnel needs a login: journalctl --user -u tsconnect-sshfunnel | grep login.tailscale"
echo "Public URL: https://ssh.<tailnet>.ts.net/  (needs Funnel enabled for the tailnet)"
echo "Alternative without the extra node: tailscale funnel --bg 9091   (serves on https://<this-host>.<tailnet>.ts.net/)"
