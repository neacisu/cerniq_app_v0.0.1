#!/bin/bash
# =============================================================================
# Install and enable Node Exporter for Prometheus (Cerniq CT109/CT110)
# =============================================================================
# Run with sudo. Enables systemd service so Prometheus can scrape host metrics
# via HAProxy (10.0.1.10:19100 staging, 10.0.1.10:29100 production).
# =============================================================================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root or with sudo"
    exit 1
fi

# Install node_exporter if missing (Ubuntu/Debian)
if ! command -v node_exporter &>/dev/null; then
    echo "Installing node_exporter..."
    apt-get update -qq
    apt-get install -y prometheus-node-exporter || {
        echo "prometheus-node-exporter not in repos; trying direct download..."
        VER="1.8.2"
        ARCH="$(dpkg --print-architecture)"
        if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "arm64" ]; then
            echo "Unsupported architecture: ${ARCH}"
            exit 1
        fi
        curl -sSL "https://github.com/prometheus/node_exporter/releases/download/v${VER}/node_exporter-${VER}.linux-${ARCH}.tar.gz" | tar -xz -C /usr/local/bin --strip-components=1 "node_exporter-${VER}.linux-${ARCH}/node_exporter"
        chmod +x /usr/local/bin/node_exporter
    }
fi

# Ensure systemd user for node_exporter exists
id -u node_exporter &>/dev/null || useradd --no-create-home --system node_exporter 2>/dev/null || true

# Enable and start
systemctl enable node_exporter 2>/dev/null || true
systemctl start node_exporter 2>/dev/null || true
systemctl start prometheus-node-exporter 2>/dev/null || true

echo "Node Exporter enabled and started (port 9100)."
