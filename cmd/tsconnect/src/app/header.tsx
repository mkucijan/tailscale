// Copyright (c) Tailscale Inc & contributors
// SPDX-License-Identifier: BSD-3-Clause

// Themed: no header bar. Status shows as a small corner label before
// connecting; once Running, logout is a tiny corner icon visible on hover.
export function Header({ state, ipn }: { state: IPNState; ipn?: IPN }) {
  if (state === "Running") {
    return (
      <button
        class="ts-logout"
        title="Log out of Tailscale"
        aria-label="Log out of Tailscale"
        onClick={() => ipn?.logout()}
      >
        ⏻
      </button>
    )
  }
  return <div class="ts-status">{STATE_LABELS[state]}</div>
}

const STATE_LABELS = {
  NoState: "Initializing…",
  InUseOtherUser: "In-use by another user",
  NeedsLogin: "Needs login",
  NeedsMachineAuth: "Needs approval",
  Stopped: "Stopped",
  Starting: "Starting…",
  Running: "Running",
} as const
