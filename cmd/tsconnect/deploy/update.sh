#!/usr/bin/env bash
# Move the themed-console branch onto the newest upstream STABLE tag
# (Tailscale: even minor = stable, odd minor = unstable), rebuild, restart, push.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
BRANCH=themed-console
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "working tree dirty, commit first"; exit 1; }
git fetch --quiet upstream "+refs/tags/v1.*:refs/tags/v1.*"
LATEST=$(git tag -l "v1.*" | grep -E "^v1\.[0-9]*[02468]\.[0-9]+$" | sort -V | tail -1)
BASE=$(git describe --tags --abbrev=0 --match "v1.*" "$BRANCH" 2>/dev/null || true)
echo "current base: ${BASE:-?}  latest stable: $LATEST"
if [ "$BASE" = "$LATEST" ] && [ "${FORCE:-}" != 1 ]; then echo "already up to date"; exit 0; fi
git switch "$BRANCH"
git rebase --onto "$LATEST" "$BASE" "$BRANCH" || { echo "rebase conflict: resolve, git rebase --continue, then rerun with FORCE=1"; exit 1; }
"$(dirname "$0")/install.sh"
git push --force-with-lease origin "$BRANCH"
echo "updated to $LATEST"
