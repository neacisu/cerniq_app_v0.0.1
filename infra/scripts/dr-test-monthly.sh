#!/usr/bin/env bash
# Test DR lunar: freshness backup (borg, pg_dump, redis) + status disaster_recovery_full.
# Opțional: DR_RUN_RESTORE_TEST=1 rulează backup_restore_test.sh (Borg extract, SCP — intensiv).
# Metrici Prometheus (node_exporter textfile): setați TEXTFILE_DIR (ex. /var/lib/node_exporter/textfile_collector).
#
# Gauge-uri: backup_dr_test_success, backup_dr_test_last_success_timestamp
# (folosite de alerta DRTestStale din infra/config/prometheus/infra-cerniq-alerts.yml).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEXTFILE_DIR="${TEXTFILE_DIR:-}"
METRIC_FILE="${TEXTFILE_DIR:+$TEXTFILE_DIR/backup_dr_test.prom}"
DR_RUN_RESTORE_TEST="${DR_RUN_RESTORE_TEST:-0}"

log() {
  echo "$(date -Iseconds) [dr-test-monthly] $*"
}

rc=0
if ! "$SCRIPT_DIR/backup_health_check.sh"; then
  rc=$?
  log "backup_health_check.sh exit $rc"
fi

if ! "$SCRIPT_DIR/disaster_recovery_full.sh" status; then
  log "disaster_recovery_full.sh status failed (non-fatal pentru metrică)"
fi

if [[ "$DR_RUN_RESTORE_TEST" == "1" || "$DR_RUN_RESTORE_TEST" == "true" ]]; then
  log "DR_RUN_RESTORE_TEST activ — rulez backup_restore_test.sh (poate dura și necesită Borg/SSH)"
  if ! "$SCRIPT_DIR/backup_restore_test.sh"; then
    rrt=$?
    log "backup_restore_test.sh exit $rrt"
    if [[ "$rrt" -gt "$rc" ]]; then
      rc=$rrt
    elif [[ "$rc" -eq 0 ]]; then
      rc=$rrt
    fi
  fi
fi

ts="$(date +%s)"
success=0
if [[ "$rc" -eq 0 ]]; then
  success=1
fi

if [[ -n "$TEXTFILE_DIR" ]]; then
  mkdir -p "$TEXTFILE_DIR"
  tmp="${METRIC_FILE}.tmp"
  cat >"$tmp" <<EOF
# HELP backup_dr_test_success Ultima rulare dr-test-monthly: 1=toate verificările obligatorii OK, 0=fail
# TYPE backup_dr_test_success gauge
backup_dr_test_success ${success}
# HELP backup_dr_test_last_success_timestamp Unix time ultimul succes (backup_health_check + eventual restore test)
# TYPE backup_dr_test_last_success_timestamp gauge
EOF
  if [[ "$success" -eq 1 ]]; then
    echo "backup_dr_test_last_success_timestamp ${ts}" >>"$tmp"
  else
    if [[ -f "$METRIC_FILE" ]] && grep -q backup_dr_test_last_success_timestamp "$METRIC_FILE"; then
      grep backup_dr_test_last_success_timestamp "$METRIC_FILE" | tail -1 >>"$tmp" || true
    else
      echo "backup_dr_test_last_success_timestamp 0" >>"$tmp"
    fi
  fi
  mv "$tmp" "$METRIC_FILE"
  log "Scrie metrici în $METRIC_FILE"
fi

exit "$rc"
