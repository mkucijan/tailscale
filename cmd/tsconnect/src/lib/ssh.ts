// Copyright (c) Tailscale Inc & contributors
// SPDX-License-Identifier: BSD-3-Clause

import { Terminal, ITerminalOptions } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"

export type SSHSessionDef = {
  username: string
  hostname: string
  /** Defaults to 5 seconds */
  timeoutSeconds?: number
}

export type SSHSessionCallbacks = {
  onConnectionProgress: (messsage: string) => void
  onConnected: () => void
  onDone: () => void
  onError?: (err: string) => void
}

export function runSSHSession(
  termContainerNode: HTMLDivElement,
  def: SSHSessionDef,
  ipn: IPN,
  callbacks: SSHSessionCallbacks,
  terminalOptions?: ITerminalOptions
) {
  const parentWindow = termContainerNode.ownerDocument.defaultView ?? window
  const term = new Terminal({
    cursorBlink: true,
    allowProposedApi: true,
    theme: {
      // Catppuccin Mocha
      background: "#1e1e2e", foreground: "#cdd6f4", cursor: "#f5e0dc", cursorAccent: "#1e1e2e",
      selectionBackground: "#585b70",
      black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
      blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
      brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1", brightYellow: "#f9e2af",
      brightBlue: "#89b4fa", brightMagenta: "#f5c2e7", brightCyan: "#94e2d5", brightWhite: "#a6adc8",
    },
    fontFamily: "Menlo for Powerline, Menlo, DejaVu Sans Mono, monospace",
    ...terminalOptions,
  })

  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(termContainerNode)
  fitAddon.fit()

  const webLinksAddon = new WebLinksAddon((event, uri) =>
    event.view?.open(uri, "_blank", "noopener")
  )
  term.loadAddon(webLinksAddon)

  let onDataHook: ((data: string) => void) | undefined
  term.onData((e) => {
    onDataHook?.(e)
  })

  term.focus()

  let resizeObserver: ResizeObserver | undefined
  let handleUnload: ((e: Event) => void) | undefined

  const sshSession = ipn.ssh(def.hostname, def.username, {
    writeFn(input) {
      term.write(input)
    },
    writeErrorFn(err) {
      callbacks.onError?.(err)
      term.write(err)
    },
    setReadFn(hook) {
      onDataHook = hook
    },
    rows: term.rows,
    cols: term.cols,
    onConnectionProgress: callbacks.onConnectionProgress,
    onConnected: callbacks.onConnected,
    onDone() {
      resizeObserver?.disconnect()
      term.dispose()
      if (handleUnload) {
        parentWindow.removeEventListener("unload", handleUnload)
      }
      callbacks.onDone()
    },
    timeoutSeconds: def.timeoutSeconds,
  })

  // Make terminal and SSH session track the size of the containing DOM node.
  resizeObserver = new parentWindow.ResizeObserver(() => fitAddon.fit())
  resizeObserver.observe(termContainerNode)
  parentWindow.addEventListener("resize", () => fitAddon.fit())
  term.onResize(({ rows, cols }) => sshSession.resize(rows, cols))

  // Close the session if the user closes the window without an explicit
  // exit.
  handleUnload = () => sshSession.close()
  parentWindow.addEventListener("unload", handleUnload)
}
