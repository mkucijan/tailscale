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
      // VS Code Dark+ / Dark Modern integrated terminal
      background: "#1f1f1f", foreground: "#cccccc", cursor: "#ffffff", cursorAccent: "#1f1f1f",
      selectionBackground: "#264f78",
      black: "#000000", red: "#cd3131", green: "#0dbc79", yellow: "#e5e510",
      blue: "#2472c8", magenta: "#bc3fbc", cyan: "#11a8cd", white: "#e5e5e5",
      brightBlack: "#666666", brightRed: "#f14c4c", brightGreen: "#23d18b", brightYellow: "#f5f543",
      brightBlue: "#3b8eea", brightMagenta: "#d670d6", brightCyan: "#29b8db", brightWhite: "#ffffff",
    },
    fontFamily: "Menlo for Powerline, Menlo, DejaVu Sans Mono, monospace",
    minimumContrastRatio: 4.5,
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
