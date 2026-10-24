// Copyright (c) Tailscale Inc & contributors
// SPDX-License-Identifier: BSD-3-Clause

// sshfunnel is a tiny tsnet node (default hostname "ssh-arch") that exposes the
// locally running themed tsconnect server over Tailscale Funnel, giving it its
// own URL: https://<hostname>.<tailnet>.ts.net/
package main

import (
	"flag"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"

	"tailscale.com/tsnet"
)

var (
	hostname = flag.String("hostname", "ssh-arch", "tailnet hostname for this node")
	backend  = flag.String("backend", "http://127.0.0.1:9091", "local tsconnect server")
	stateDir = flag.String("state", "", "state dir (default ~/.local/state/tsconnect-sshfunnel)")
)

func main() {
	flag.Parse()
	dir := *stateDir
	if dir == "" {
		home, _ := os.UserHomeDir()
		dir = filepath.Join(home, ".local/state/tsconnect-sshfunnel")
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		log.Fatal(err)
	}
	s := &tsnet.Server{Hostname: *hostname, Dir: dir}
	defer s.Close()
	ln, err := s.ListenFunnel("tcp", ":443")
	if err != nil {
		log.Fatal(err)
	}
	u, err := url.Parse(*backend)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("serving %s on Funnel :443 as %q", *backend, *hostname)
	log.Fatal(http.Serve(ln, httputil.NewSingleHostReverseProxy(u)))
}
