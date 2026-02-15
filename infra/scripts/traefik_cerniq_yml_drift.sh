#!/usr/bin/env bash
set -euo pipefail

echo "== traefik_cerniq_yml_drift =="
date -Is || true
echo "hostname=$(hostname)"
echo

ACTUAL="/opt/traefik/dynamic/cerniq.yml"
EXPECTED_TMP_DIR="/tmp/cerniq-traefik-drift"
EXPECTED="${EXPECTED_TMP_DIR}/cerniq.expected.yml"

echo "# Inputs"
echo "actual_path=${ACTUAL}"
echo "expected_tmp_path=${EXPECTED}"
echo "apply_sync=${APPLY_SYNC:-0}"
echo

mkdir -p "${EXPECTED_TMP_DIR}"

if [ ! -f "${ACTUAL}" ]; then
  echo "ERROR: actual file missing: ${ACTUAL}"
  exit 2
fi

if [ -z "${CERNIQ_YML_EXPECTED_B64:-}" ]; then
  echo "ERROR: missing env CERNIQ_YML_EXPECTED_B64"
  exit 2
fi

python3 - <<'PY'
import base64, os, sys
dst = os.environ["EXPECTED"]
b64 = os.environ["CERNIQ_YML_EXPECTED_B64"]
data = base64.b64decode(b64.encode())
open(dst, "wb").write(data)
print("expected_bytes=", len(data))
PY

echo
echo "# sha256"
sha_actual="$(sha256sum "${ACTUAL}" | awk '{print $1}')"
sha_expected="$(sha256sum "${EXPECTED}" | awk '{print $1}')"
echo "sha_actual=${sha_actual}"
echo "sha_expected=${sha_expected}"
if [ "${sha_actual}" = "${sha_expected}" ]; then
  echo "sha_match=YES"
else
  echo "sha_match=NO"
fi

echo
echo "# diff -u (first 160 lines)"
set +e
diff -u "${EXPECTED}" "${ACTUAL}" | sed -n '1,160p'
rc=$?
set -e
echo "diff_exit_code=${rc}"
echo

echo "# Traefik container (args + mounts) - no env"
if docker inspect traefik >/dev/null 2>&1; then
  echo "traefik_container=present"
  echo "-- args/cmd --"
  docker inspect -f 'Cmd={{json .Config.Cmd}} Args={{json .Args}}' traefik || true
  echo "-- mounts --"
  docker inspect -f '{{range .Mounts}}{{println .Destination " <- " .Source}}{{end}}' traefik | sed -n '1,200p' || true
else
  echo "traefik_container=missing"
fi
echo

echo "# Safety: dynamic_conf sanity (does it mention cerniq?)"
DYN="/opt/traefik/dynamic_conf.yml"
if [ -f "${DYN}" ]; then
  echo "dynamic_conf_present=YES"
  echo "dynamic_conf_sha256=$(sha256sum "${DYN}" | awk '{print $1}')"
  python3 - <<'PY' || true
from pathlib import Path
p = Path("/opt/traefik/dynamic_conf.yml")
txt = p.read_text(errors="replace")
print("dynamic_conf_cerniq_occurrences=", txt.count("cerniq"))
for s in ["cerniq.app", "api.cerniq.app", "admin.cerniq.app", "staging.cerniq.app", "otel-cerniq.neanelu.ro"]:
    print(f"contains[{s}]={'YES' if s in txt else 'NO'}")
PY
  echo
  echo "# dynamic_conf: check OTLP allowlist contains 10.0.1.10/32"
  python3 - <<'PY' || true
from pathlib import Path
lines = Path("/opt/traefik/dynamic_conf.yml").read_text(errors="replace").splitlines()
print("dynamic_conf_has_10.0.1.10_anywhere=", any("10.0.1.10/32" in l for l in lines))

needle = "cerniq-otlp-allowlist:"
idxs = [i for i,l in enumerate(lines) if l.strip() == needle]
if not idxs:
    print("dynamic_conf_otlp_allowlist_def=NOT_FOUND")
else:
    # The definition block indentation is the indent of the "cerniq-otlp-allowlist:" line.
    idx = idxs[0]
    indent = len(lines[idx]) - len(lines[idx].lstrip(" "))
    start = max(0, idx - 2)
    end = idx + 1
    # Collect block until indent drops back to <= indent (excluding blank lines).
    for j in range(idx + 1, len(lines)):
        l = lines[j]
        if l.strip() == "":
            end = j + 1
            continue
        cur_indent = len(l) - len(l.lstrip(" "))
        if cur_indent <= indent:
            break
        end = j + 1
    snippet = "\n".join(lines[start:end])
    print("dynamic_conf_otlp_allowlist_def=FOUND")
    print("dynamic_conf_otlp_allowlist_has_10.0.1.10=", "10.0.1.10/32" in snippet)
    print("--- snippet ---")
    print(snippet)
    print("--- end snippet ---")
PY
else
  echo "dynamic_conf_present=NO"
fi
echo

if [ "${APPLY_SYNC:-0}" = "1" ]; then
  echo "# APPLY: backup + replace ${ACTUAL} from expected"
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  bak="${ACTUAL}.bak.${ts}"
  cp -a "${ACTUAL}" "${bak}"
  chmod --reference="${ACTUAL}" "${bak}" || true
  cp -f "${EXPECTED}" "${ACTUAL}"
  sync || true
  echo "backup_path=${bak}"
  echo "sha_after=$(sha256sum "${ACTUAL}" | awk '{print $1}')"
  echo "apply_done=YES"
else
  echo "apply_done=NO"
fi

# Cleanup temp expected file
rm -rf "${EXPECTED_TMP_DIR}" || true

