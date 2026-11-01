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
      background: "#282828", foreground: "#dcdcdc", cursor: "#dcdcdc", cursorAccent: "#282828",
      selectionBackground: "#456578",
      black: "#282828", red: "#8f040d", green: "#38874a", yellow: "#f7a921",
      blue: "#456578", magenta: "#b16286", cyan: "#78ad9a", white: "#dcdcdc",
      brightBlack: "#928374", brightRed: "#fb4934", brightGreen: "#b8bb26", brightYellow: "#fabd2f",
      brightBlue: "#83a598", brightMagenta: "#d3869b", brightCyan: "#8ec07c", brightWhite: "#ebdbb2",
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
