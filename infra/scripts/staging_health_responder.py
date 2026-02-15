#!/usr/bin/env python3
"""Temporary health-responder for ingress validation on CT110 (staging).

Starts lightweight HTTP servers on the three Cerniq app ports (64000/64010/64012)
so that the full ingress path can be validated end-to-end:

  Internet -> Traefik (orchestrator) -> HAProxy VIP (hz.247) -> CT110 ports

Each server responds with 200 OK + JSON on any path (including /health which
Traefik health-checks use).

Usage (on CT110):
    python3 staging_health_responder.py                # foreground
    python3 staging_health_responder.py --daemon        # background (writes PID file)
    python3 staging_health_responder.py --stop          # kill background process

NOTE: This is a TEMPORARY tool for infrastructure validation only.
      It is uploaded, executed, and cleaned up by staging_validate_ingress.py.
"""
import argparse
import http.server
import json
import os
import signal
import socketserver
import sys
import threading
import time

PID_FILE = "/tmp/cerniq_health_responder.pid"

SERVICES = [
    (64000, "cerniq-web"),
    (64010, "cerniq-api"),
    (64012, "cerniq-admin"),
]


class HealthHandler(http.server.BaseHTTPRequestHandler):
    """Simple handler returning JSON health response on every path."""

    service_name = "unknown"

    def do_GET(self):
        body = json.dumps(
            {
                "status": "healthy",
                "service": self.service_name,
                "placeholder": True,
                "port": self.server.server_address[1],
                "path": self.path,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        )
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode())

    # Also handle HEAD (Traefik may use it for health checks).
    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    # Suppress request logging to keep output clean.
    def log_message(self, format, *args):
        pass


def make_handler(service_name: str):
    """Factory: creates a handler subclass bound to a service name."""

    class BoundHandler(HealthHandler):
        pass

    BoundHandler.service_name = service_name
    return BoundHandler


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    allow_reuse_port = True


def serve(port: int, service_name: str):
    handler = make_handler(service_name)
    with ReusableTCPServer(("0.0.0.0", port), handler) as httpd:
        httpd.serve_forever()


def start_servers():
    threads = []
    for port, name in SERVICES:
        t = threading.Thread(target=serve, args=(port, name), daemon=True)
        t.start()
        threads.append(t)
        print(f"  [OK] {name} listening on 0.0.0.0:{port}")
    return threads


def write_pid():
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))


def stop_daemon():
    if not os.path.exists(PID_FILE):
        print(f"No PID file ({PID_FILE}), nothing to stop.", file=sys.stderr)
        return 1
    with open(PID_FILE) as f:
        pid = int(f.read().strip())
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Sent SIGTERM to PID {pid}")
    except ProcessLookupError:
        print(f"Process {pid} already gone.")
    try:
        os.remove(PID_FILE)
    except FileNotFoundError:
        pass
    return 0


def main():
    ap = argparse.ArgumentParser(description="Cerniq staging health responder")
    ap.add_argument("--daemon", action="store_true", help="Run in background (fork)")
    ap.add_argument("--stop", action="store_true", help="Stop a running daemon")
    args = ap.parse_args()

    if args.stop:
        return stop_daemon()

    if args.daemon:
        # Fork BEFORE starting threads (os.fork + threads = deadlock).
        pid = os.fork()
        if pid > 0:
            # Parent: wait briefly for child to start, then report.
            time.sleep(1)
            print(f"Daemonized — PID {pid} (PID file: {PID_FILE})")
            return 0
        # Child continues: set up daemon environment.
        os.setsid()
        write_pid()
        # Redirect stdio to /dev/null.
        devnull = os.open(os.devnull, os.O_RDWR)
        os.dup2(devnull, 0)
        os.dup2(devnull, 1)
        os.dup2(devnull, 2)
        signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
        # Now start servers in the daemon process.
        start_servers()
        while True:
            time.sleep(3600)
    else:
        print("Starting Cerniq health responders (temporary, for ingress validation):")
        start_servers()
        write_pid()
        print(f"\nHealth responders running (PID {os.getpid()}). Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping...")
        finally:
            try:
                os.remove(PID_FILE)
            except FileNotFoundError:
                pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
