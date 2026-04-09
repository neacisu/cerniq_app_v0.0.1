#!/bin/sh
# Generează sentinel.conf cu parolă din mediu (fără secret în Git).
set -eu
PASS="${REDIS_PASSWORD:?REDIS_PASSWORD required for Sentinel auth-pass}"
NAME="${REDIS_SENTINEL_NAME:-cerniq-master}"
MASTER_HOST="${REDIS_MASTER_HOST:-cerniq-redis-master}"
# Quorum = câți sentinei trebuie să cadă de acord că masterul e down (ODOWN).
# Cu UN singur container Sentinel (profil docker-compose curent), trebuie 1 — altfel failover-ul nu pornește niciodată.
# Pentru 3+ instanțe Sentinel în producție, setați REDIS_SENTINEL_QUORUM=2 (sau majoritatea N/2+1).
QUORUM="${REDIS_SENTINEL_QUORUM:-1}"

cat > /tmp/sentinel.conf <<EOF
port 26379
bind 0.0.0.0
sentinel monitor ${NAME} ${MASTER_HOST} 6379 ${QUORUM}
sentinel down-after-milliseconds ${NAME} 5000
sentinel failover-timeout ${NAME} 10000
sentinel parallel-syncs ${NAME} 1
sentinel auth-pass ${NAME} ${PASS}
EOF

exec redis-sentinel /tmp/sentinel.conf
