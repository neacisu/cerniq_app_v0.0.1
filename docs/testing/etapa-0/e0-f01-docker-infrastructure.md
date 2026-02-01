# CERNIQ.APP — TESTE F0.1: DOCKER INFRASTRUCTURE

## Teste pentru Docker Engine, Networks și Compose

**Fază:** F0.1 | **Taskuri:** 5 (F0.1.1.T001 - F0.1.2.T002)  
**Referință:** [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

## SUMAR TASKURI

| Task ID | Denumire | Tip Test |
| ------- | -------- | -------- |
| F0.1.1.T001 | Docker Engine Install | Infra Validation |
| F0.1.1.T002 | daemon.json Config | Infra Validation |
| F0.1.1.T003 | Directory Structure | Infra Validation |
| F0.1.2.T001 | Docker Networks | Infra Validation |
| F0.1.2.T002 | docker-compose.yml Base | Config Validation |

---

## TESTE

### T001: Docker Engine Installation

**Scop:** Verifică că Docker Engine 29.x este instalat corect.

```bash
#!/bin/bash
# tests/infra/f01-docker-engine.test.sh

describe "Docker Engine Installation" {
  
  it "should have Docker Engine 29.x installed" {
    version=$(docker version --format '{{.Server.Version}}')
    [[ "$version" =~ ^29\. ]] || [[ "$version" =~ ^28\. ]]
    assert_success
  }
  
  it "should have Docker Compose v2.40+ installed" {
    version=$(docker compose version --short)
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)
    [[ $major -ge 2 && $minor -ge 40 ]]
    assert_success
  }
  
  it "should have Docker service running" {
    systemctl is-active docker
    assert_success
  }
  
  it "should be able to run containers" {
    docker run --rm hello-world
    assert_success
  }
}
```

**Validare:**

- [ ] Docker version 29.x sau 28.x
- [ ] Docker Compose v2.40+
- [ ] Service active
- [ ] hello-world runs

---

### T002: daemon.json Configuration

**Scop:** Verifică optimizările pentru server 128GB RAM.

```bash
#!/bin/bash
# tests/infra/f01-daemon-config.test.sh

describe "Docker Daemon Configuration" {

  it "should use overlay2 storage driver" {
    docker info --format '{{.Driver}}' | grep -q "overlay2"
    assert_success
  }
  
  it "should have live-restore enabled" {
    docker info --format '{{.LiveRestoreEnabled}}' | grep -q "true"
    assert_success
  }
  
  it "should have metrics endpoint on port 64093" {
    curl -sf http://localhost:64093/metrics | head -1
    assert_success
  }
  
  it "should have log rotation configured" {
    cat /etc/docker/daemon.json | jq -e '.["log-opts"]["max-size"] == "50m"'
    assert_success
  }
  
  it "should use correct address pool" {
    cat /etc/docker/daemon.json | jq -e '.["default-address-pools"][0].base == "172.20.0.0/16"'
    assert_success
  }
}
```

**Validare:**

- [ ] overlay2 storage driver
- [ ] live-restore = true
- [ ] Metrics endpoint :64093
- [ ] Log max-size = 50m
- [ ] Address pool 172.20.0.0/16

---

### T003: Directory Structure

**Scop:** Verifică structura de directoare conform ADR-0024.

```bash
#!/bin/bash
# tests/infra/f01-directory-structure.test.sh

describe "Project Directory Structure" {
  
  BASE="/var/www/CerniqAPP"
  
  it "should have apps directory with api and web" {
    [[ -d "$BASE/apps/api" && -d "$BASE/apps/web" ]]
    assert_success
  }
  
  it "should have packages directory with db and shared-types" {
    [[ -d "$BASE/packages/db" && -d "$BASE/packages/shared-types" ]]
    assert_success
  }
  
  it "should have workers directory" {
    [[ -d "$BASE/workers" ]]
    assert_success
  }
  
  it "should have infra/docker directory" {
    [[ -d "$BASE/infra/docker" ]]
    assert_success
  }
  
  it "should have docs/adr directory" {
    [[ -d "$BASE/docs/adr" ]]
    assert_success
  }
  
  it "should have secrets directory with proper permissions" {
    [[ -d "$BASE/secrets" ]]
    perms=$(stat -c %a "$BASE/secrets")
    [[ "$perms" == "700" ]]
    assert_success
  }
  
  it "should have tests directory structure" {
    [[ -d "$BASE/tests/unit" && -d "$BASE/tests/integration" && -d "$BASE/tests/e2e" ]]
    assert_success
  }
}
```

**Validare:**

- [ ] apps/api, apps/web exist
- [ ] packages/db, packages/shared-types exist
- [ ] workers/ exists
- [ ] infra/docker/ exists
- [ ] docs/adr/ exists
- [ ] secrets/ cu permisiuni 700
- [ ] tests/{unit,integration,e2e} exist

---

### T004: Docker Networks

**Scop:** Verifică cele 3 rețele Docker pentru segregare.

```bash
#!/bin/bash
# tests/infra/f01-docker-networks.test.sh

describe "Docker Networks Configuration" {

  it "should have cerniq_public network" {
    docker network inspect cerniq_public --format '{{.Name}}'
    assert_success
  }
  
  it "should have cerniq_backend as internal network" {
    internal=$(docker network inspect cerniq_backend --format '{{.Internal}}')
    [[ "$internal" == "true" ]]
    assert_success
  }
  
  it "should have cerniq_data as internal network" {
    internal=$(docker network inspect cerniq_data --format '{{.Internal}}')
    [[ "$internal" == "true" ]]
    assert_success
  }
  
  it "should have correct subnet for cerniq_public" {
    subnet=$(docker network inspect cerniq_public --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}')
    [[ "$subnet" == "172.20.0.0/24" ]]
    assert_success
  }
  
  it "should have correct subnet for cerniq_backend" {
    subnet=$(docker network inspect cerniq_backend --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}')
    [[ "$subnet" == "172.21.0.0/24" ]]
    assert_success
  }
  
  it "should have correct subnet for cerniq_data" {
    subnet=$(docker network inspect cerniq_data --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}')
    [[ "$subnet" == "172.22.0.0/24" ]]
    assert_success
  }
}
```

**Validare:**

- [ ] cerniq_public exists, Internal=false
- [ ] cerniq_backend exists, Internal=true
- [ ] cerniq_data exists, Internal=true
- [ ] Subnets: 172.20.0.0/24, 172.21.0.0/24, 172.22.0.0/24

---

### T005: docker-compose.yml Base

**Scop:** Verifică configurația compose de bază.

```bash
#!/bin/bash
# tests/infra/f01-compose-base.test.sh

describe "Docker Compose Base Configuration" {

  COMPOSE_FILE="/var/www/CerniqAPP/infra/docker/docker-compose.yml"
  
  it "should be valid YAML" {
    docker compose -f "$COMPOSE_FILE" config > /dev/null
    assert_success
  }
  
  it "should define project name 'cerniq'" {
    grep -q "^name: cerniq" "$COMPOSE_FILE"
    assert_success
  }
  
  it "should reference external networks" {
    grep -A1 "cerniq_public:" "$COMPOSE_FILE" | grep -q "external: true"
    assert_success
  }
  
  it "should define required volumes" {
    for vol in postgres_data redis_data traefik_certs signoz_data; do
      grep -q "${vol}:" "$COMPOSE_FILE"
    done
    assert_success
  }
}
```

**Validare:**

- [ ] YAML valid
- [ ] name: cerniq
- [ ] Networks external: true
- [ ] Volumes: postgres_data, redis_data, traefik_certs, signoz_data

---

## SCRIPT RUNNER

```bash
#!/bin/bash
# tests/infra/run-f01-tests.sh

echo "=== F0.1 Docker Infrastructure Tests ==="

for test_file in tests/infra/f01-*.test.sh; do
  echo "Running: $test_file"
  bash "$test_file"
done

echo "=== F0.1 Tests Complete ==="
```

---

## INTEGRARE CI

```yaml
# .github/workflows/infra-validation.yml
name: Infrastructure Validation

on:
  push:
    paths:
      - 'infra/**'
      - 'docker-compose*.yml'

jobs:
  validate-f01:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Run F0.1 Tests
        run: |
          chmod +x tests/infra/*.sh
          ./tests/infra/run-f01-tests.sh
```

---

## CHECKLIST VALIDARE

- [ ] Docker Engine 29.x instalat
- [ ] Docker Compose v2.40+ instalat
- [ ] daemon.json configurat pentru 128GB RAM
- [ ] Structura directoare completă
- [ ] 3 rețele Docker create corect
- [ ] docker-compose.yml valid

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
