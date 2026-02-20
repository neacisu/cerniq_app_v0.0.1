#!/usr/bin/env python3
"""f2-10: Validate staging ingress end-to-end.

This script orchestrates a full ingress validation for Cerniq staging (CT110):

  Layer 1 — Direct:     curl http://10.0.1.110:<port>/health  (from hz.223 node)
  Layer 2 — Gateway:    curl http://10.0.1.10:<gw_port>/health (from orchestrator)
  Layer 3 — Traefik:    curl -k --resolve <host>:443:127.0.0.1 https://<host>/health
                         (from orchestrator — Traefik listens on localhost)

Workflow:
  1. Upload staging_health_responder.py to CT110 via pct push (through hz.223)
  2. Start health responder in daemon mode (ports 64000/64010/64012)
  3. Run curl probes from different vantage points
  4. Stop health responder + cleanup
  5. Print structured results

Requirements:
  - SSH access to hz.223 (Proxmox node hosting CT110)
  - SSH access to orchestrator (for gateway / Traefik tests)
  - CT110 running with Python3 installed

Usage:
    python3 infra/scripts/staging_validate_ingress.py [--skip-cleanup]
"""
import argparse
import base64
import datetime as dt
import json
import os
import shlex
import subprocess
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PROXMOX_NODE = "hz.223"         # Proxmox node hosting CT110
CT_ID = "110"                   # Staging LXC
CT_IP = "10.0.1.110"            # CT110 internal IP
ORCHESTRATOR = "orchestrator"   # SSH alias / hostname for orchestrator
VIP = "10.0.1.10"              # HAProxy gateway VIP on hz.247
TRAEFIK_IP = "77.42.76.185"   # Orchestrator public IP (Traefik)

# Port mapping: (service_name, ct_port, gateway_port, traefik_host)
SERVICES = [
    ("web",   64000, 19000, "staging.cerniq.app"),
    ("api",   64010, 19010, "api.staging.cerniq.app"),
    ("admin", 64012, 19012, "admin.staging.cerniq.app"),
]

RESPONDER_SCRIPT = Path(__file__).with_name("staging_health_responder.py")
REMOTE_SCRIPT = "/tmp/cerniq_staging_health_responder.py"

SSH_OPTS = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "-o", "StrictHostKeyChecking=accept-new"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
class Result:
    def __init__(self, layer: str, target: str, service: str):
        self.layer = layer
        self.target = target
        self.service = service
        self.http_code: str | None = None
        self.body: str = ""
        self.ok: bool = False
        self.error: str = ""

    def __str__(self):
        status = "PASS" if self.ok else "FAIL"
        detail = f"HTTP {self.http_code}" if self.http_code else self.error
        return f"  [{status}] {self.layer:12s} {self.service:8s} {self.target:50s} -> {detail}"


def run_cmd(cmd: list[str], *, check: bool = True, capture: bool = False,
            timeout: int = 30) -> subprocess.CompletedProcess:
    kwargs = {"timeout": timeout}
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    return subprocess.run(cmd, check=check, **kwargs)


def ssh_cmd(host: str, remote_cmd: str) -> list[str]:
    return ["ssh", *SSH_OPTS, host, remote_cmd]


def ssh_run(host: str, remote_cmd: str, *, check: bool = True,
            capture: bool = False, timeout: int = 30) -> subprocess.CompletedProcess:
    return run_cmd(ssh_cmd(host, remote_cmd), check=check, capture=capture, timeout=timeout)


def curl_probe(host_for_ssh: str, curl_args: str, *, timeout: int = 15) -> tuple[str, str]:
    """Run curl on a remote host via SSH, return (http_code, body)."""
    # curl outputs http_code on last line, body before it.
    remote = (
        f"curl -s -o /tmp/_cerniq_probe_body -w '%{{http_code}}' "
        f"--connect-timeout 8 --max-time 12 {curl_args}; "
        f"echo; cat /tmp/_cerniq_probe_body 2>/dev/null; rm -f /tmp/_cerniq_probe_body"
    )
    try:
        p = ssh_run(host_for_ssh, remote, capture=True, check=False, timeout=timeout)
        lines = p.stdout.strip().split("\n", 1)
        code = lines[0].strip() if lines else ""
        body = lines[1].strip() if len(lines) > 1 else ""
        return code, body
    except subprocess.TimeoutExpired:
        return "", ""
    except Exception as e:
        return "", str(e)


def curl_probe_pct(node: str, ct: str, curl_args: str, *, timeout: int = 15) -> tuple[str, str]:
    """Run curl inside a CT via pct exec (through Proxmox node SSH)."""
    inner_cmd = (
        f"curl -s -o /tmp/_probe_body -w '%{{http_code}}' "
        f"--connect-timeout 8 --max-time 12 {curl_args}; "
        f"echo; cat /tmp/_probe_body 2>/dev/null; rm -f /tmp/_probe_body"
    )
    remote = f"pct exec {shlex.quote(ct)} -- bash -c {shlex.quote(inner_cmd)}"
    try:
        p = ssh_run(node, remote, capture=True, check=False, timeout=timeout)
        lines = p.stdout.strip().split("\n", 1)
        code = lines[0].strip() if lines else ""
        body = lines[1].strip() if len(lines) > 1 else ""
        return code, body
    except subprocess.TimeoutExpired:
        return "", ""
    except Exception as e:
        return "", str(e)


# ---------------------------------------------------------------------------
# Phases
# ---------------------------------------------------------------------------
def phase_deploy(ts: str) -> bool:
    """Upload and start health responder on CT110."""
    print("\n=== PHASE 1: Deploy health responder on CT110 ===\n")

    if not RESPONDER_SCRIPT.exists():
        print(f"ERROR: {RESPONDER_SCRIPT} not found", file=sys.stderr)
        return False

    # Encode script for transfer.
    script_bytes = RESPONDER_SCRIPT.read_bytes()
    b64 = base64.b64encode(script_bytes).decode()

    node_tmp = f"/tmp/cerniq-ingress-{ts}"

    # 1. Create temp dir on node + write script.
    print(f"  Uploading to {PROXMOX_NODE}:{node_tmp}/ ...")
    mk_cmd = (
        f"set -euo pipefail; "
        f"mkdir -p {shlex.quote(node_tmp)}; "
        f"python3 -c \"import base64; open('{node_tmp}/responder.py','wb').write(base64.b64decode('{b64}'))\"; "
        f"chmod 0644 {shlex.quote(node_tmp)}/responder.py"
    )
    ssh_run(PROXMOX_NODE, mk_cmd)
    print("  [OK] Script uploaded to node")

    # 2. pct push into CT110.
    print(f"  Pushing into CT {CT_ID} ...")
    push_cmd = (
        f"pct push {CT_ID} {shlex.quote(node_tmp)}/responder.py "
        f"{shlex.quote(REMOTE_SCRIPT)} -perms 0755"
    )
    ssh_run(PROXMOX_NODE, push_cmd)
    print(f"  [OK] Script pushed to CT {CT_ID}:{REMOTE_SCRIPT}")

    # 3. Start health responder in daemon mode.
    print(f"  Starting health responder in daemon mode ...")
    # First, stop any previous instance.
    stop_cmd = f"pct exec {CT_ID} -- python3 {shlex.quote(REMOTE_SCRIPT)} --stop 2>/dev/null || true"
    ssh_run(PROXMOX_NODE, stop_cmd, check=False)
    time.sleep(1)

    start_cmd = f"pct exec {CT_ID} -- python3 {shlex.quote(REMOTE_SCRIPT)} --daemon"
    p = ssh_run(PROXMOX_NODE, start_cmd, capture=True, check=False)
    print(f"  {p.stdout.strip()}")
    if p.returncode != 0:
        print(f"  ERROR: failed to start responder: {p.stderr.strip()}", file=sys.stderr)
        return False
    print("  [OK] Health responder running")

    # 4. Quick self-test: probe from hz.223 node to CT110 IP (avoids pct exec I/O issues).
    print(f"  Self-test (from {PROXMOX_NODE} -> {CT_IP}) ...")
    time.sleep(2)
    for name, port, _, _ in SERVICES:
        code, _ = curl_probe(PROXMOX_NODE, f"http://{CT_IP}:{port}/health")
        status = "OK" if code == "200" else f"FAIL (HTTP {code})"
        print(f"    {name}:{port} -> {status}")
        if code != "200":
            print(f"  ERROR: self-test failed for {name}:{port}", file=sys.stderr)
            return False

    # 5. Cleanup temp dir on node (script already pushed to CT).
    ssh_run(PROXMOX_NODE, f"rm -rf {shlex.quote(node_tmp)} || true", check=False)
    print("  [OK] All self-tests passed\n")
    return True


def phase_test_layer1() -> list[Result]:
    """Layer 1: Direct access to CT110 ports (from hz.223 Proxmox node)."""
    print("=== LAYER 1: Direct to CT110 (from hz.223 node) ===\n")
    results = []
    for name, port, _, _ in SERVICES:
        target = f"http://{CT_IP}:{port}/health"
        r = Result("L1-direct", target, name)
        code, body = curl_probe(PROXMOX_NODE, f"{target}")
        r.http_code = code
        r.body = body
        r.ok = code == "200"
        if not r.ok:
            r.error = f"expected 200, got {code}"
        print(str(r))
        results.append(r)
    print()
    return results


def phase_test_layer2() -> list[Result]:
    """Layer 2: Gateway VIP (HAProxy on hz.247) — tested from orchestrator."""
    print("=== LAYER 2: Gateway VIP (from orchestrator) ===\n")
    results = []
    for name, _, gw_port, _ in SERVICES:
        target = f"http://{VIP}:{gw_port}/health"
        r = Result("L2-gateway", target, name)
        code, body = curl_probe(ORCHESTRATOR, f"{target}")
        r.http_code = code
        r.body = body
        r.ok = code == "200"
        if not r.ok:
            r.error = f"expected 200, got {code}"
        print(str(r))
        results.append(r)
    print()
    return results


def phase_test_layer3() -> list[Result]:
    """Layer 3: Traefik HTTPS routing (from orchestrator, via localhost)."""
    print("=== LAYER 3: Traefik HTTPS (from orchestrator) ===\n")
    results = []

    # Traefik health checks may take up to 30s to detect the new backend.
    # We retry with small delays.
    for name, _, _, host in SERVICES:
        target = f"https://{host}/health"
        r = Result("L3-traefik", target, name)

        # Use --resolve to test against localhost Traefik (avoids DNS/network issues).
        curl_args = (
            f"-k --resolve {host}:443:127.0.0.1 "
            f"https://{host}/health"
        )

        # Retry up to 4 times (Traefik health check interval is 30s).
        for attempt in range(4):
            code, body = curl_probe(ORCHESTRATOR, curl_args)
            r.http_code = code
            r.body = body
            if code == "200":
                r.ok = True
                break
            if attempt < 3:
                wait = 10 * (attempt + 1)
                print(f"    {name}: got HTTP {code}, retrying in {wait}s (Traefik health check propagation)...")
                time.sleep(wait)

        if not r.ok:
            r.error = f"expected 200, got {code} after retries"
        print(str(r))
        results.append(r)

    # Also test public IP with Host header (as in the plan description).
    print()
    print("  --- Additional: Host header against public IP ---")
    for name, _, _, host in SERVICES:
        target = f"https://{TRAEFIK_IP}/health (Host: {host})"
        r = Result("L3-public", target, name)
        curl_args = f"-k -H 'Host: {host}' https://{TRAEFIK_IP}/health"
        code, body = curl_probe(ORCHESTRATOR, curl_args)
        r.http_code = code
        r.body = body
        r.ok = code == "200"
        if not r.ok:
            r.error = f"expected 200, got {code}"
        print(str(r))
        results.append(r)
    print()
    return results


def phase_cleanup() -> None:
    """Stop health responder and remove script from CT110."""
    print("=== CLEANUP ===\n")
    stop_cmd = f"pct exec {CT_ID} -- python3 {shlex.quote(REMOTE_SCRIPT)} --stop 2>/dev/null || true"
    ssh_run(PROXMOX_NODE, stop_cmd, check=False)
    time.sleep(1)
    rm_cmd = f"pct exec {CT_ID} -- rm -f {shlex.quote(REMOTE_SCRIPT)} /tmp/cerniq_health_responder.pid || true"
    ssh_run(PROXMOX_NODE, rm_cmd, check=False)
    print("  [OK] Health responder stopped and cleaned up\n")


def print_summary(all_results: list[Result]) -> int:
    """Print summary and return exit code."""
    print("=" * 72)
    print("INGRESS VALIDATION SUMMARY (f2-10-staging-validate-ingress)")
    print("=" * 72)
    passed = sum(1 for r in all_results if r.ok)
    failed = sum(1 for r in all_results if not r.ok)
    total = len(all_results)

    for r in all_results:
        print(str(r))

    print()
    print(f"Results: {passed}/{total} passed, {failed} failed")
    print(f"Timestamp: {dt.datetime.now(dt.UTC).isoformat()}")

    if failed == 0:
        print("\n✓ ALL INGRESS PATHS VALIDATED SUCCESSFULLY")
        return 0
    else:
        print(f"\n✗ {failed} INGRESS PATH(S) FAILED")
        return 1


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="f2-10: Validate staging ingress end-to-end")
    ap.add_argument("--skip-cleanup", action="store_true", help="Leave health responder running for manual debugging")
    ap.add_argument("--skip-deploy", action="store_true", help="Skip deploying health responder (assume already running)")
    ap.add_argument("--cleanup-only", action="store_true", help="Only cleanup (stop+remove health responder)")
    args = ap.parse_args()

    ts = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")

    print("=" * 72)
    print("f2-10: Staging Ingress Validation")
    print(f"Target: CT{CT_ID} ({CT_IP}) — staging.cerniq.app")
    print(f"Gateway VIP: {VIP} (hz.247 HAProxy)")
    print(f"Traefik: {TRAEFIK_IP} (orchestrator)")
    print(f"Timestamp: {ts}")
    print("=" * 72)

    if args.cleanup_only:
        phase_cleanup()
        return 0

    all_results: list[Result] = []

    # Phase 1: Deploy.
    if not args.skip_deploy:
        ok = phase_deploy(ts)
        if not ok:
            print("ABORT: health responder deployment failed", file=sys.stderr)
            if not args.skip_cleanup:
                phase_cleanup()
            return 2

    # Phase 2: Test Layer 1 (direct).
    all_results.extend(phase_test_layer1())

    # Phase 3: Test Layer 2 (gateway VIP).
    all_results.extend(phase_test_layer2())

    # Phase 4: Test Layer 3 (Traefik).
    all_results.extend(phase_test_layer3())

    # Phase 5: Cleanup.
    if not args.skip_cleanup:
        phase_cleanup()

    # Summary.
    return print_summary(all_results)


if __name__ == "__main__":
    raise SystemExit(main())
