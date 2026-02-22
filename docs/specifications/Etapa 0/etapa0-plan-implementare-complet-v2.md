# CERNIQ.APP — ETAPA 0 (plan implementare) - superseded

## Versiunea 3.0 | 2026-02-15

Acest fisier continea un plan vechi, auto-generat, bazat pe un stack local (Traefik intern + PostgreSQL/Redis local + observability local).
Implementarea curenta a fost migrata pe infrastructura noua (Proxmox LXC + orchestrator centralizat), deci documentul este **superseded**.

## Planul curent (source of truth)

- `/root/.cursor/plans/audit_+_plan_migrare_e2ab8872.plan.md`

## Documentatie curenta (source of truth)

- `infrastructura_noua.md` (Implementare Cerniq.app)
- `docs/infrastructure/deployment-guide.md`
- `docs/infrastructure/network-topology.md`
- `docs/infrastructure/observability-stack.md`


>Continutul de mai jos este deprecated in mare parte dar contine logica ce a stat la baza fundatiei actualei implementari<

# CERNIQ.APP â€” ETAPA 0: PLAN IMPLEMENTARE GRANULAR COMPLET
## Faze, Subfaze È™i Taskuri pentru InfrastructurÄƒ MVP
### Versiunea 1.0 | 15 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV â€” Subordonat Master Spec v1.2  
**SCOPE:** Plan complet implementare infrastructurÄƒ cu taskuri JSON pentru AI Agents  
**FORMAT:** F0.x.x.Txxx (FazÄƒ.SubfazÄƒ.Task)

---

## CUPRINS FAZE

| FazÄƒ | Denumire | Nr. Taskuri |
|------|----------|-------------|
| F0.1 | InfrastructurÄƒ Docker de BazÄƒ | 6 |
| F0.2 | PostgreSQL 18.1 Setup | 5 |
| F0.3 | Redis 7.4.7 È™i BullMQ Setup | 4 |
| F0.4 | Traefik v3.6.6 Setup | 4 |
| F0.5 | Observability Stack (SigNoz) | 4 |
| F0.6 | PNPM È™i Monorepo Setup | 8 |
| F0.7 | Backup Strategy | 4 |
| F0.8 | Security Hardening | 4 |
| F0.9 | API Boilerplate (Fastify) | 8 |
| F0.10 | Database Schema Foundation | 6 |
| F0.11 | Frontend Boilerplate (React) | 6 |
| F0.12 | Development Environment | 5 |
| F0.13 | Testing Foundation | 5 |
| **TOTAL** | | **69 Taskuri** |

---

# FAZA F0.1: INFRASTRUCTURÄ‚ DOCKER DE BAZÄ‚

## F0.1.1 Docker Engine Setup

```json
{
  "taskID": "F0.1.1.T001",
  "denumire_task": "Instalare È™i configurare Docker Engine 28.x pe Ubuntu 24.04",
  "context_anterior": "Server Hetzner bare metal fresh cu Ubuntu 24.04 LTS instalat, fÄƒrÄƒ Docker. Serverul are 20 cores Intel, 128GB RAM, NVMe SSD. Directorul root al proiectului va fi /var/www/CerniqAPP.",
  "descriere_task": "EÈ™ti un expert DevOps cu experienÈ›Äƒ extinsÄƒ Ã®n containerizare Docker È™i infrastructurÄƒ cloud. Task-ul tÄƒu este sÄƒ instalezi Docker Engine 28.x (sau cea mai recentÄƒ versiune stabilÄƒ) pe Ubuntu 24.04 LTS folosind repository-ul oficial Docker.\n\nPaÈ™i de urmat:\n1. EliminÄƒ orice versiune veche de Docker care ar putea exista pe sistem (docker.io, docker-doc, docker-compose, podman-docker, containerd, runc)\n2. ActualizeazÄƒ package lists: apt update\n3. InstaleazÄƒ prerequisites: apt install ca-certificates curl gnupg\n4. AdaugÄƒ GPG key oficial Docker: curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg\n5. AdaugÄƒ repository-ul Docker: echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable' > /etc/apt/sources.list.d/docker.list\n6. InstaleazÄƒ Docker packages: apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin\n7. VerificÄƒ instalarea cu 'docker version' È™i 'docker compose version'\n8. ActiveazÄƒ È™i porneÈ™te serviciul: systemctl enable --now docker\n9. VerificÄƒ cÄƒ Docker funcÈ›ioneazÄƒ: docker run hello-world",
  "director_implementare": "/root",
  "restrictii_antihalucinatie": [
    "NU folosi snap pentru instalare Docker - foloseÈ™te EXCLUSIV repository-ul oficial Docker",
    "NU folosi docker.io din repository Ubuntu - este versiune veche",
    "NU sÄƒri paÈ™ii de verificare a versiunii",
    "VERIFICÄ‚ cÄƒ versiunea instalatÄƒ este 28.x sau mai nouÄƒ",
    "NU modifica configuraÈ›ia default Ã®ncÄƒ - aceasta se face Ã®n taskul urmÄƒtor",
    "ASIGURÄ‚-TE cÄƒ docker compose (v2) este instalat, NU docker-compose (v1 deprecated)"
  ],
  "validare_task": "1. Comanda 'docker version' afiÈ™eazÄƒ Version: 28.x.x sau mai nou pentru Client È™i Server\n2. Comanda 'docker compose version' afiÈ™eazÄƒ v2.40+ sau mai nou\n3. Comanda 'systemctl status docker' aratÄƒ 'active (running)'\n4. Comanda 'docker run hello-world' ruleazÄƒ cu succes\n5. Nu existÄƒ erori Ã®n 'journalctl -u docker'",
  "outcome": "Docker Engine 28.x instalat È™i funcÈ›ional cu Docker Compose v2.40+ pe Ubuntu 24.04 LTS"
}
```

```json
{
  "taskID": "F0.1.1.T002",
  "denumire_task": "Configurare daemon.json optimizat pentru server 128GB RAM/20 cores",
  "context_anterior": "Docker Engine 28.x a fost instalat Ã®n F0.1.1.T001 cu configurare default. Serverul are 128GB RAM È™i 20 cores Intel. Acum trebuie optimizat pentru producÈ›ie.",
  "descriere_task": "EÈ™ti un expert Docker specializat Ã®n optimizare pentru servere high-memory È™i multi-core. Task-ul tÄƒu este sÄƒ creezi fiÈ™ierul /etc/docker/daemon.json cu configuraÈ›ia optimizatÄƒ pentru serverul Cerniq.\n\nCreeazÄƒ fiÈ™ierul /etc/docker/daemon.json cu urmÄƒtorul conÈ›inut EXACT:\n```json\n{\n  \"storage-driver\": \"overlay2\",\n  \"log-driver\": \"json-file\",\n  \"log-opts\": {\n    \"max-size\": \"50m\",\n    \"max-file\": \"5\"\n  },\n  \"live-restore\": true,\n  \"userland-proxy\": false,\n  \"default-ulimits\": {\n    \"nofile\": {\n      \"Name\": \"nofile\",\n      \"Soft\": 65536,\n      \"Hard\": 65536\n    }\n  },\n  \"default-address-pools\": [\n    {\n      \"base\": \"172.20.0.0/16\",\n      \"size\": 24\n    }\n  ],\n  \"metrics-addr\": \"0.0.0.0:9323\"\n}\n```\n\nDupÄƒ creare:\n1. ValideazÄƒ JSON syntax cu 'jq . /etc/docker/daemon.json'\n2. RestarteazÄƒ Docker daemon: systemctl restart docker\n3. VerificÄƒ cÄƒ daemon-ul a pornit cu noua configuraÈ›ie\n4. VerificÄƒ configuraÈ›ia activÄƒ cu 'docker info'",
  "director_implementare": "/etc/docker",
  "restrictii_antihalucinatie": [
    "NU folosi storage-driver diferit de overlay2 - este cel mai performant pentru Linux",
    "NU seta log max-size mai mare de 50m - previne umplerea discului",
    "NU omite live-restore - permite upgrade Docker fÄƒrÄƒ downtime containers",
    "VERIFICÄ‚ JSON syntax Ã®nainte de restart - un JSON invalid va Ã®mpiedica pornirea Docker",
    "NU modifica userland-proxy la true - false oferÄƒ performanÈ›Äƒ network mai bunÄƒ",
    "FOLOSEÈ˜TE exact subnet-ul 172.20.0.0/16 pentru consistenÈ›Äƒ cu documentaÈ›ia"
  ],
  "validare_task": "1. FiÈ™ierul /etc/docker/daemon.json existÄƒ È™i conÈ›ine configuraÈ›ia exactÄƒ\n2. 'jq . /etc/docker/daemon.json' parseazÄƒ fÄƒrÄƒ erori\n3. 'docker info' afiÈ™eazÄƒ:\n   - Storage Driver: overlay2\n   - Live Restore Enabled: true\n   - Default Address Pools: 172.20.0.0/16\n4. 'systemctl status docker' aratÄƒ active (running) dupÄƒ restart\n5. Metrics endpoint disponibil la http://localhost:9323/metrics",
  "outcome": "daemon.json configurat pentru producÈ›ie cu toate optimizÄƒrile pentru 128GB RAM aplicate"
}
```

```json
{
  "taskID": "F0.1.1.T003",
  "denumire_task": "Creare structurÄƒ directoare complete pentru proiectul CerniqAPP",
  "context_anterior": "Docker Engine configurat Ã®n F0.1.1.T002. Nu existÄƒ Ã®ncÄƒ structura de proiect. Vom urma Vertical Slice Architecture È™i structura monorepo definitÄƒ Ã®n ADR-0024.",
  "descriere_task": "EÈ™ti un expert Ã®n structurare monorepo pentru aplicaÈ›ii fullstack enterprise. Task-ul tÄƒu este sÄƒ creezi Ã®ntreaga structurÄƒ de directoare pentru proiectul Cerniq.app Ã®n /var/www/CerniqAPP conform arhitecturii definite.\n\nCreeazÄƒ urmÄƒtoarea structurÄƒ EXACTÄ‚:\n\n```\n/var/www/CerniqAPP/\nâ”œâ”€â”€ apps/\nâ”‚   â”œâ”€â”€ api/\nâ”‚   â”‚   â””â”€â”€ src/\nâ”‚   â”‚       â”œâ”€â”€ features/\nâ”‚   â”‚       â”‚   â”œâ”€â”€ auth/\nâ”‚   â”‚       â”‚   â”œâ”€â”€ companies/\nâ”‚   â”‚       â”‚   â”œâ”€â”€ contacts/\nâ”‚   â”‚       â”‚   â”œâ”€â”€ leads/\nâ”‚   â”‚       â”‚   â”œâ”€â”€ approvals/\nâ”‚   â”‚       â”‚   â””â”€â”€ invoicing/\nâ”‚   â”‚       â”œâ”€â”€ plugins/\nâ”‚   â”‚       â”œâ”€â”€ middleware/\nâ”‚   â”‚       â””â”€â”€ shared/\nâ”‚   â””â”€â”€ web/\nâ”‚       â””â”€â”€ src/\nâ”‚           â”œâ”€â”€ components/\nâ”‚           â”œâ”€â”€ pages/\nâ”‚           â”œâ”€â”€ providers/\nâ”‚           â”œâ”€â”€ hooks/\nâ”‚           â””â”€â”€ utils/\nâ”œâ”€â”€ packages/\nâ”‚   â”œâ”€â”€ db/\nâ”‚   â”‚   â”œâ”€â”€ drizzle/\nâ”‚   â”‚   â””â”€â”€ schema/\nâ”‚   â”œâ”€â”€ shared-types/\nâ”‚   â”‚   â””â”€â”€ src/\nâ”‚   â””â”€â”€ config/\nâ”‚       â”œâ”€â”€ eslint/\nâ”‚       â”œâ”€â”€ typescript/\nâ”‚       â””â”€â”€ tailwind/\nâ”œâ”€â”€ workers/\nâ”‚   â”œâ”€â”€ enrichment/\nâ”‚   â”œâ”€â”€ outreach/\nâ”‚   â”œâ”€â”€ ai/\nâ”‚   â””â”€â”€ monitoring/\nâ”œâ”€â”€ infra/\nâ”‚   â”œâ”€â”€ docker/\nâ”‚   â”‚   â””â”€â”€ traefik/\nâ”‚   â”‚       â””â”€â”€ dynamic/\nâ”‚   â”œâ”€â”€ scripts/\nâ”‚   â””â”€â”€ config/\nâ”‚       â”œâ”€â”€ postgres/\nâ”‚       â”œâ”€â”€ redis/\nâ”‚       â””â”€â”€ otel/\nâ”œâ”€â”€ docs/\nâ”‚   â”œâ”€â”€ adr/\nâ”‚   â”œâ”€â”€ architecture/\nâ”‚   â”œâ”€â”€ runbooks/\nâ”‚   â””â”€â”€ api/\nâ”œâ”€â”€ tests/\nâ”‚   â”œâ”€â”€ unit/\nâ”‚   â”œâ”€â”€ integration/\nâ”‚   â””â”€â”€ e2e/\nâ””â”€â”€ secrets/\n```\n\nDupÄƒ creare:\n1. SeteazÄƒ permisiuni: chmod -R 755 /var/www/CerniqAPP\n2. CreeazÄƒ .gitkeep Ã®n fiecare director gol pentru git tracking\n3. VerificÄƒ structura cu 'tree -L 4 /var/www/CerniqAPP'",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU modifica structura definitÄƒ - urmeazÄƒ EXACT specificaÈ›ia din ADR-0024",
    "NU crea directoare suplimentare nedocumentate",
    "NU uita directorul docs/adr/ - este CRUCIAL pentru Architecture Decision Records",
    "PÄ‚STREAZÄ‚ exact naming-ul specificat (lowercase pentru directoare)",
    "NU uita directorul secrets/ - va fi folosit pentru Docker secrets",
    "CREEAZÄ‚ directorul tests/ cu subdirectoarele unit/, integration/, e2e/"
  ],
  "validare_task": "1. 'tree -L 4 /var/www/CerniqAPP' afiÈ™eazÄƒ structura completÄƒ conform specificaÈ›iei\n2. Toate directoarele au permisiuni 755\n3. Fiecare director gol conÈ›ine fiÈ™ierul .gitkeep\n4. Directoarele features/ din apps/api/src/ conÈ›in: auth, companies, contacts, leads, approvals, invoicing\n5. Directorul secrets/ existÄƒ È™i are permisiuni corecte",
  "outcome": "StructurÄƒ completÄƒ de directoare creatÄƒ conform specificaÈ›iei ADR-0024, gata pentru iniÈ›ializarea proiectului"
}
```

## F0.1.2 Docker Networks Setup

```json
{
  "taskID": "F0.1.2.T001",
  "denumire_task": "Creare reÈ›ele Docker pentru segregarea serviciilor",
  "context_anterior": "Structura directoare creatÄƒ Ã®n F0.1.1.T003. Docker configurat cu subnet-ul 172.20.0.0/16. Acum trebuie create cele 3 reÈ›ele Docker conform ADR-0015.",
  "descriere_task": "EÈ™ti un expert Docker networking cu experienÈ›Äƒ Ã®n securizarea infrastructurii containerizate. Task-ul tÄƒu este sÄƒ creezi cele 3 reÈ›ele Docker pentru Cerniq.app care asigurÄƒ izolarea corectÄƒ a serviciilor.\n\nCreeazÄƒ urmÄƒtoarele reÈ›ele:\n\n1. **cerniq_public** - Pentru servicii expuse public (Traefik, API gateway):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.20.0.0/24 \\\n  --gateway 172.20.0.1 \\\n  cerniq_public\n```\n\n2. **cerniq_backend** - Pentru comunicare internÄƒ API-Workers (INTERN):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.21.0.0/24 \\\n  --gateway 172.21.0.1 \\\n  --internal \\\n  cerniq_backend\n```\n\n3. **cerniq_data** - Pentru PostgreSQL È™i Redis (STRICT INTERN):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.22.0.0/24 \\\n  --gateway 172.22.0.1 \\\n  --internal \\\n  cerniq_data\n```\n\nDupÄƒ creare, documenteazÄƒ reÈ›elele Ã®n /var/www/CerniqAPP/docs/architecture/networks.md cu explicaÈ›ii pentru fiecare reÈ›ea.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune cerniq_backend sau cerniq_data la internet - flag-ul --internal este OBLIGATORIU",
    "NU folosi subnets care se suprapun - verificÄƒ cÄƒ sunt distincte",
    "NU È™terge reÈ›eaua bridge default - este necesarÄƒ pentru funcÈ›ionarea Docker",
    "FOLOSEÈ˜TE exact subnet-urile specificate: 172.20.0.0/24, 172.21.0.0/24, 172.22.0.0/24",
    "VERIFICÄ‚ cÄƒ toate reÈ›elele au fost create cu 'docker network ls' Ã®nainte de a continua"
  ],
  "validare_task": "1. 'docker network ls' afiÈ™eazÄƒ toate cele 3 reÈ›ele: cerniq_public, cerniq_backend, cerniq_data\n2. 'docker network inspect cerniq_backend' aratÄƒ 'Internal: true'\n3. 'docker network inspect cerniq_data' aratÄƒ 'Internal: true'\n4. 'docker network inspect cerniq_public' aratÄƒ 'Internal: false'\n5. FiÈ™ierul docs/architecture/networks.md existÄƒ È™i conÈ›ine documentaÈ›ia\n6. Subnet-urile sunt corecte conform inspect",
  "outcome": "3 reÈ›ele Docker izolate create conform strategiei de segregare definitÄƒ Ã®n ADR-0015"
}
```

```json
{
  "taskID": "F0.1.2.T002",
  "denumire_task": "Creare docker-compose.yml base cu definiÈ›iile reÈ›elelor",
  "context_anterior": "ReÈ›elele Docker create Ã®n F0.1.2.T001. Acum trebuie sÄƒ creÄƒm fiÈ™ierul docker-compose.yml base care defineÈ™te reÈ›elele pentru a fi utilizate de servicii.",
  "descriere_task": "EÈ™ti un expert Docker Compose cu experienÈ›Äƒ Ã®n orchestrarea serviciilor containerizate. Task-ul tÄƒu este sÄƒ creezi fiÈ™ierul docker-compose.yml base pentru Cerniq.app.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/docker/docker-compose.yml cu urmÄƒtorul conÈ›inut:\n\n```yaml\n# Cerniq.app - Docker Compose Base Configuration\n# Version: 1.0\n# Last Updated: 2026-01-15\n\nname: cerniq\n\nnetworks:\n  cerniq_public:\n    external: true\n  cerniq_backend:\n    external: true\n  cerniq_data:\n    external: true\n\nvolumes:\n  postgres_data:\n    driver: local\n  redis_data:\n    driver: local\n  traefik_certs:\n    driver: local\n  signoz_data:\n    driver: local\n\n# Services will be defined in subsequent tasks\nservices: {}\n```\n\nExplicaÈ›ie:\n- ReÈ›elele sunt marcate 'external: true' pentru cÄƒ au fost create manual Ã®n taskul anterior\n- Volume-urile sunt definite pentru persistenÈ›a datelor\n- Serviciile vor fi adÄƒugate Ã®n taskurile urmÄƒtoare",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU defini reÈ›elele inline - trebuie sÄƒ fie 'external: true' pentru a folosi reÈ›elele create manual",
    "NU adÄƒuga servicii Ã®ncÄƒ - acestea vor fi adÄƒugate Ã®n fazele urmÄƒtoare",
    "FOLOSEÈ˜TE 'name: cerniq' pentru a defini prefixul containerelor",
    "NU omite volume-urile pentru persistenÈ›Äƒ - sunt esenÈ›iale",
    "VALIDEAZÄ‚ sintaxa YAML Ã®nainte de a considera taskul complet"
  ],
  "validare_task": "1. FiÈ™ierul docker-compose.yml existÄƒ Ã®n /var/www/CerniqAPP/infra/docker/\n2. 'docker compose config' valideazÄƒ fÄƒrÄƒ erori\n3. ReÈ›elele sunt definite ca 'external: true'\n4. Volume-urile postgres_data, redis_data, traefik_certs, signoz_data sunt definite\n5. FiÈ™ierul conÈ›ine header-ul cu versiunea È™i data actualizÄƒrii",
  "outcome": "docker-compose.yml base creat cu definiÈ›iile reÈ›elelor È™i volume-urilor, pregÄƒtit pentru adÄƒugarea serviciilor"
}
```

---

# FAZA F0.2: POSTGRESQL 18.1 SETUP

## F0.2.1 PostgreSQL Container Setup

```json
{
  "taskID": "F0.2.1.T001",
  "denumire_task": "AdÄƒugare serviciu PostgreSQL 18.1 cu PostGIS Ã®n docker-compose.yml",
  "context_anterior": "docker-compose.yml base creat Ã®n F0.1.2.T002 cu reÈ›ele È™i volume-uri definite. PostgreSQL va fi database-ul principal pentru Cerniq.app, necesitÃ¢nd extensiile PostGIS È™i pgvector.",
  "descriere_task": "EÈ™ti un expert DBA PostgreSQL cu experienÈ›Äƒ extinsÄƒ Ã®n containerizare È™i configurare pentru producÈ›ie. Task-ul tÄƒu este sÄƒ adaugi serviciul PostgreSQL Ã®n docker-compose.yml.\n\nAdaugÄƒ urmÄƒtorul serviciu Ã®n secÈ›iunea 'services' din docker-compose.yml:\n\n```yaml\nservices:\n  postgres:\n    image: postgis/postgis:18-3.5\n    container_name: cerniq-postgres\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: cerniq\n      POSTGRES_DB: cerniq_production\n      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password\n      PGDATA: /var/lib/postgresql/data/pgdata\n    secrets:\n      - postgres_password\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro\n      - ./config/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro\n    networks:\n      - cerniq_data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U cerniq -d cerniq_production\"]\n      interval: 30s\n      timeout: 10s\n      retries: 5\n      start_period: 60s\n    deploy:\n      resources:\n        limits:\n          memory: 48G\n          cpus: '8'\n        reservations:\n          memory: 32G\n          cpus: '4'\n    shm_size: 4g\n    command: [\"postgres\", \"-c\", \"config_file=/etc/postgresql/postgresql.conf\"]\n\nsecrets:\n  postgres_password:\n    file: ../../secrets/postgres_password.txt\n```\n\nIMPORTANT: PostgreSQL NU trebuie sÄƒ aibÄƒ port mapping public - comunicarea se face DOAR prin reÈ›eaua internÄƒ cerniq_data.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune port 5432 la 0.0.0.0 sau la host - este riscant pentru securitate",
    "NU folosi imagine postgres standard - TREBUIE postgis/postgis pentru PostGIS",
    "NU hardcodeazÄƒ parola - foloseÈ™te Docker secret cu POSTGRES_PASSWORD_FILE",
    "VERIFICÄ‚ versiunea este 18.x Ã®n imaginea postgis/postgis:18-3.5",
    "NU omite shm_size - este necesar pentru shared memory pe sisteme cu mult RAM",
    "FOLOSEÈ˜TE reÈ›eaua cerniq_data (internÄƒ) - NU cerniq_public"
  ],
  "validare_task": "1. 'docker compose config' valideazÄƒ fÄƒrÄƒ erori\n2. Serviciul postgres foloseÈ™te imaginea postgis/postgis:18-3.5\n3. Nu existÄƒ port mapping pentru 5432 (nu apare '5432:5432' Ã®n config)\n4. Secretul postgres_password este configurat\n5. Healthcheck-ul este definit cu pg_isready\n6. ReÈ›eaua este cerniq_data\n7. Resource limits sunt setate (memory: 48G, cpus: 8)",
  "outcome": "Serviciul PostgreSQL 18.1 cu PostGIS adÄƒugat Ã®n docker-compose.yml, configurat pentru producÈ›ie fÄƒrÄƒ expunere publicÄƒ"
}
```

```json
{
  "taskID": "F0.2.1.T002",
  "denumire_task": "Creare postgresql.conf optimizat pentru 128GB RAM",
  "context_anterior": "Serviciul PostgreSQL definit Ã®n F0.2.1.T001 referenÈ›iazÄƒ fiÈ™ierul postgresql.conf. Serverul are 128GB RAM È™i 20 cores, NVMe SSD.",
  "descriere_task": "EÈ™ti un expert PostgreSQL DBA specializat Ã®n tuning pentru servere high-memory. Task-ul tÄƒu este sÄƒ creezi fiÈ™ierul postgresql.conf cu parametrii optimizaÈ›i pentru serverul Cerniq.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/config/postgres/postgresql.conf cu urmÄƒtorul conÈ›inut:\n\n```ini\n# PostgreSQL 18.1 Configuration for Cerniq.app\n# Optimized for: 128GB RAM, 20 cores, NVMe SSD\n# Last Updated: 2026-01-15\n\n# Connection Settings\nlisten_addresses = '*'\nmax_connections = 200\nsuperuser_reserved_connections = 3\n\n# Memory Settings (128GB system)\nshared_buffers = 32GB\neffective_cache_size = 96GB\nwork_mem = 256MB\nmaintenance_work_mem = 4GB\nwal_buffers = 64MB\nhuge_pages = try\n\n# PostgreSQL 18 AIO (Asynchronous I/O)\nio_method = io_uring\n\n# Parallelism (20 cores)\nmax_parallel_workers_per_gather = 8\nmax_parallel_workers = 16\nmax_worker_processes = 20\nmax_parallel_maintenance_workers = 4\n\n# SSD Optimization\nrandom_page_cost = 1.1\neffective_io_concurrency = 200\nseq_page_cost = 1.0\n\n# Write-Ahead Log\nwal_level = replica\nwal_compression = zstd\nmax_wal_size = 8GB\nmin_wal_size = 2GB\nwal_keep_size = 2GB\ncheckpoint_timeout = 30min\ncheckpoint_completion_target = 0.9\n\n# Vacuum and Autovacuum\nautovacuum = on\nautovacuum_max_workers = 4\nautovacuum_naptime = 30s\nautovacuum_vacuum_cost_delay = 2ms\n\n# Logging\nlogging_collector = on\nlog_directory = 'pg_log'\nlog_filename = 'postgresql-%Y-%m-%d.log'\nlog_rotation_age = 1d\nlog_rotation_size = 100MB\nlog_min_duration_statement = 1000\nlog_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '\nlog_statement = 'ddl'\n\n# Statistics\ntrack_activities = on\ntrack_counts = on\ntrack_io_timing = on\ntrack_wal_io_timing = on\ntrack_functions = all\n\n# Security\npassword_encryption = scram-sha-256\nssl = off  # SSL handled by Traefik\n\n# pgvector optimization\nmaintenance_work_mem = 8GB  # For HNSW index creation\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU seta shared_buffers mai mare de 32GB pe sistem de 128GB - 25% este optim",
    "NU folosi max_connections peste 200 - foloseÈ™te PgBouncer pentru connection pooling",
    "NU omite io_method pentru PostgreSQL 18 AIO - oferÄƒ performanÈ›Äƒ semnificativ mai bunÄƒ",
    "VERIFICÄ‚ sintaxa configuraÈ›iei Ã®nainte de a considera taskul complet",
    "NU seta random_page_cost > 1.5 pentru SSD - 1.1 este optim",
    "INCLUDE parametrii pentru logging - sunt esenÈ›iali pentru debugging"
  ],
  "validare_task": "1. FiÈ™ierul postgresql.conf existÄƒ Ã®n /var/www/CerniqAPP/infra/config/postgres/\n2. shared_buffers = 32GB\n3. effective_cache_size = 96GB\n4. io_method = io_uring (PostgreSQL 18 AIO)\n5. max_parallel_workers_per_gather = 8\n6. max_connections = 200\n7. FiÈ™ierul nu conÈ›ine erori de sintaxÄƒ",
  "outcome": "postgresql.conf configurat optimal pentru 128GB RAM cu AIO activat È™i parametrii pentru pgvector"
}
```

```json
{
  "taskID": "F0.2.1.T003",
  "denumire_task": "Creare script init.sql cu extensii PostgreSQL obligatorii",
  "context_anterior": "postgresql.conf creat Ã®n F0.2.1.T002. Acum trebuie sÄƒ creÄƒm scriptul de iniÈ›ializare care activeazÄƒ extensiile necesare.",
  "descriere_task": "EÈ™ti un expert PostgreSQL cu experienÈ›Äƒ Ã®n configurarea extensiilor pentru aplicaÈ›ii enterprise. Task-ul tÄƒu este sÄƒ creezi scriptul init.sql care se executÄƒ la prima pornire a containerului PostgreSQL.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/config/postgres/init.sql cu urmÄƒtorul conÈ›inut:\n\n```sql\n-- Cerniq.app PostgreSQL Initialization Script\n-- Executed on first container start\n-- Last Updated: 2026-01-15\n\n-- Enable required extensions\nCREATE EXTENSION IF NOT EXISTS pgvector;       -- Vector similarity search\nCREATE EXTENSION IF NOT EXISTS postgis;        -- Geospatial functions\nCREATE EXTENSION IF NOT EXISTS postgis_topology;\nCREATE EXTENSION IF NOT EXISTS pg_trgm;        -- Fuzzy text search\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";    -- UUID generation (backup for uuidv7)\n\n-- Verify extensions are loaded\nDO $$\nBEGIN\n    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgvector') THEN\n        RAISE EXCEPTION 'pgvector extension failed to load';\n    END IF;\n    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN\n        RAISE EXCEPTION 'postgis extension failed to load';\n    END IF;\n    RAISE NOTICE 'All required extensions loaded successfully';\nEND\n$$;\n\n-- Create application role with limited privileges\nCREATE ROLE cerniq_app WITH LOGIN PASSWORD 'changeme_via_secret';\nGRANT CONNECT ON DATABASE cerniq_production TO cerniq_app;\n\n-- Create schemas\nCREATE SCHEMA IF NOT EXISTS bronze;\nCREATE SCHEMA IF NOT EXISTS silver;\nCREATE SCHEMA IF NOT EXISTS gold;\nCREATE SCHEMA IF NOT EXISTS approval;\nCREATE SCHEMA IF NOT EXISTS audit;\n\n-- Grant schema usage\nGRANT USAGE ON SCHEMA bronze, silver, gold, approval, audit TO cerniq_app;\nGRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bronze, silver, gold, approval, audit TO cerniq_app;\nALTER DEFAULT PRIVILEGES IN SCHEMA bronze, silver, gold, approval, audit \n    GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;\n\n-- Log completion\nDO $$ BEGIN RAISE NOTICE 'Cerniq.app database initialization complete'; END $$;\n```\n\nNOTÄ‚: Parola pentru cerniq_app va fi schimbatÄƒ ulterior prin Docker secrets. Acest script este pentru iniÈ›ializare.",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU omite pgvector - este CRITIC pentru AI semantic search",
    "NU omite PostGIS - este CRITIC pentru proximity queries agricole",
    "VERIFICÄ‚ cÄƒ extensiile existÄƒ Ã®n imagine Ã®nainte de CREATE EXTENSION",
    "FOLOSEÈ˜TE IF NOT EXISTS pentru idempotenÈ›Äƒ - scriptul poate fi rerulat",
    "NU lÄƒsa parola hardcodatÄƒ Ã®n producÈ›ie - este doar pentru iniÈ›ializare",
    "CREEAZÄ‚ toate schema-urile: bronze, silver, gold, approval, audit"
  ],
  "validare_task": "1. FiÈ™ierul init.sql existÄƒ Ã®n directorul config/postgres/\n2. Scriptul conÈ›ine CREATE EXTENSION pentru: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n3. Schema-urile bronze, silver, gold, approval, audit sunt create\n4. ExistÄƒ verificare cÄƒ extensiile sunt Ã®ncÄƒrcate (bloc DO)\n5. Role-ul cerniq_app este creat cu GRANT-uri corecte",
  "outcome": "Script init.sql creat pentru activarea automatÄƒ a tuturor extensiilor PostgreSQL necesare È™i crearea schema-urilor"
}
```

```json
{
  "taskID": "F0.2.1.T004",
  "denumire_task": "Creare secret pentru parola PostgreSQL",
  "context_anterior": "PostgreSQL configurat sÄƒ citeascÄƒ parola din Docker secret. Acum trebuie sÄƒ creÄƒm fiÈ™ierul secret.",
  "descriere_task": "EÈ™ti un expert Ã®n securitate DevOps. Task-ul tÄƒu este sÄƒ creezi fiÈ™ierul secret pentru parola PostgreSQL.\n\n1. GenereazÄƒ o parolÄƒ puternicÄƒ (32 caractere, alfanumerice + simboluri):\n```bash\nopenssl rand -base64 32 | tr -d '/+=' | cut -c1-32 > /var/www/CerniqAPP/secrets/postgres_password.txt\n```\n\n2. SeteazÄƒ permisiuni restrictive:\n```bash\nchmod 600 /var/www/CerniqAPP/secrets/postgres_password.txt\n```\n\n3. CreeazÄƒ È™i .gitignore pentru directorul secrets:\n```bash\necho '*' > /var/www/CerniqAPP/secrets/.gitignore\necho '!.gitignore' >> /var/www/CerniqAPP/secrets/.gitignore\n```\n\n4. VerificÄƒ cÄƒ parola a fost generatÄƒ corect:\n```bash\ncat /var/www/CerniqAPP/secrets/postgres_password.txt | wc -c\n# Trebuie sÄƒ afiÈ™eze ~32\n```",
  "director_implementare": "/var/www/CerniqAPP/secrets",
  "restrictii_antihalucinatie": [
    "NU commit fiÈ™ierul secret Ã®n git - .gitignore TREBUIE sÄƒ existe",
    "NU lÄƒsa permisiuni 644 sau mai permisive - TREBUIE 600",
    "NU folosi parole simple sau predictibile",
    "VERIFICÄ‚ cÄƒ parola nu conÈ›ine caractere care ar putea cauza probleme (/, +, =)",
    "NU partaja parola prin canale nesecurizate"
  ],
  "validare_task": "1. FiÈ™ierul postgres_password.txt existÄƒ Ã®n /var/www/CerniqAPP/secrets/\n2. Permisiunile sunt 600: 'stat -c %a secrets/postgres_password.txt' returneazÄƒ 600\n3. Parola are ~32 caractere\n4. .gitignore existÄƒ Ã®n directorul secrets È™i conÈ›ine '*'\n5. 'git status' NU aratÄƒ fiÈ™ierele din secrets/ ca untracked",
  "outcome": "Secret PostgreSQL creat securizat cu permisiuni corecte È™i protecÈ›ie git"
}
```

```json
{
  "taskID": "F0.2.1.T005",
  "denumire_task": "Pornire È™i verificare PostgreSQL container",
  "context_anterior": "Toate configuraÈ›iile PostgreSQL sunt pregÄƒtite: docker-compose.yml, postgresql.conf, init.sql, secret. Acum trebuie sÄƒ pornim containerul È™i sÄƒ verificÄƒm funcÈ›ionarea.",
  "descriere_task": "EÈ™ti un expert DevOps cu experienÈ›Äƒ Ã®n troubleshooting containere. Task-ul tÄƒu este sÄƒ porneÈ™ti È™i sÄƒ verifici containerul PostgreSQL.\n\nPaÈ™i de urmat:\n\n1. NavigheazÄƒ la directorul docker:\n```bash\ncd /var/www/CerniqAPP/infra/docker\n```\n\n2. PorneÈ™te doar serviciul postgres:\n```bash\ndocker compose up -d postgres\n```\n\n3. VerificÄƒ logs pentru erori:\n```bash\ndocker compose logs -f postgres\n# AÈ™teaptÄƒ pÃ¢nÄƒ vezi 'database system is ready to accept connections'\n```\n\n4. VerificÄƒ healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-postgres\n# Trebuie sÄƒ afiÈ™eze 'healthy' dupÄƒ ~60 secunde\n```\n\n5. ConecteazÄƒ-te È™i verificÄƒ extensiile:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c '\\dx'\n# Trebuie sÄƒ afiÈ™eze: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n```\n\n6. VerificÄƒ schema-urile:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c '\\dn'\n# Trebuie sÄƒ afiÈ™eze: bronze, silver, gold, approval, audit\n```\n\n7. VerificÄƒ versiunea PostgreSQL:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c 'SELECT version();'\n# Trebuie sÄƒ afiÈ™eze PostgreSQL 18.x\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU continua dacÄƒ containerul nu porneÈ™te - verificÄƒ logs pentru erori",
    "NU ignora healthcheck - TREBUIE sÄƒ fie 'healthy' Ã®nainte de a continua",
    "AÈ˜TEAPTÄ‚ suficient pentru start_period (60s) Ã®nainte de a verifica health",
    "NU modifica configuraÈ›ia dacÄƒ funcÈ›ioneazÄƒ - documenteazÄƒ orice modificÄƒri",
    "VERIFICÄ‚ toate extensiile sunt Ã®ncÄƒrcate - pgvector È™i postgis sunt CRITICE"
  ],
  "validare_task": "1. 'docker ps' aratÄƒ containerul cerniq-postgres running\n2. 'docker inspect' aratÄƒ Health Status: healthy\n3. '\\dx' afiÈ™eazÄƒ toate 5 extensiile: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n4. '\\dn' afiÈ™eazÄƒ toate 5 schema-urile: bronze, silver, gold, approval, audit\n5. SELECT version() confirmÄƒ PostgreSQL 18.x\n6. Logs nu conÈ›in erori critice",
  "outcome": "PostgreSQL 18.1 cu PostGIS ruleazÄƒ corect Ã®n Docker cu toate extensiile È™i schema-urile create"
}
```

---

# FAZA F0.3: REDIS 7.4.7 È˜I BULLMQ SETUP

```json
{
  "taskID": "F0.3.1.T001",
  "denumire_task": "AdÄƒugare serviciu Redis 7.4.7 optimizat pentru BullMQ Ã®n docker-compose.yml",
  "context_anterior": "PostgreSQL funcÈ›ional din F0.2. Acum adÄƒugÄƒm Redis pentru BullMQ job queuing. CRITIC: maxmemory-policy TREBUIE sÄƒ fie noeviction pentru BullMQ.",
  "descriere_task": "EÈ™ti un expert Redis specializat Ã®n job queues È™i BullMQ. Task-ul tÄƒu este sÄƒ adaugi serviciul Redis Ã®n docker-compose.yml.\n\nAdaugÄƒ urmÄƒtorul serviciu Ã®n docker-compose.yml:\n\n```yaml\n  redis:\n    image: redis:7.4-alpine\n    container_name: cerniq-redis\n    restart: unless-stopped\n    command:\n      - redis-server\n      - --maxmemory 8gb\n      - --maxmemory-policy noeviction\n      - --appendonly yes\n      - --appendfsync everysec\n      - --aof-use-rdb-preamble yes\n      - --notify-keyspace-events Ex\n      - --lazyfree-lazy-eviction yes\n      - --lazyfree-lazy-expire yes\n      - --activedefrag yes\n      - --tcp-keepalive 300\n    volumes:\n      - redis_data:/data\n    networks:\n      - cerniq_data\n      - cerniq_backend\n    healthcheck:\n      test: [\"CMD\", \"redis-cli\", \"ping\"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n      start_period: 30s\n    deploy:\n      resources:\n        limits:\n          memory: 12G\n          cpus: '2'\n        reservations:\n          memory: 8G\n          cpus: '1'\n```\n\nIMPORTANT: Redis este pe AMBELE reÈ›ele - cerniq_data (pentru persistenÈ›Äƒ) È™i cerniq_backend (pentru workers).",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "maxmemory-policy TREBUIE sÄƒ fie noeviction - BullMQ jobs NU POT fi evicted, altfel se pierd",
    "NU expune port 6379 public - comunicarea este doar internÄƒ",
    "NU dezactiva persistenÈ›a AOF - este esenÈ›ialÄƒ pentru durabilitate jobs",
    "INCLUDE notify-keyspace-events Ex - necesar pentru delayed jobs BullMQ",
    "FOLOSEÈ˜TE ambele reÈ›ele: cerniq_data È™i cerniq_backend",
    "VERIFICÄ‚ cÄƒ appendonly este yes pentru persistenÈ›Äƒ"
  ],
  "validare_task": "1. 'docker compose config' valideazÄƒ fÄƒrÄƒ erori\n2. Redis foloseÈ™te imaginea redis:7.4-alpine\n3. maxmemory-policy este noeviction (verificÄƒ Ã®n command)\n4. appendonly este yes\n5. notify-keyspace-events este Ex\n6. Redis este pe ambele reÈ›ele: cerniq_data È™i cerniq_backend\n7. Nu existÄƒ port mapping public pentru 6379",
  "outcome": "Redis 7.4.7 configurat optim pentru BullMQ job queues cu persistenÈ›Äƒ AOF È™i maxmemory-policy noeviction"
}
```

```json
{
  "taskID": "F0.3.1.T002",
  "denumire_task": "Pornire È™i verificare Redis container",
  "context_anterior": "Redis adÄƒugat Ã®n docker-compose.yml Ã®n F0.3.1.T001. Acum trebuie sÄƒ pornim È™i sÄƒ verificÄƒm configuraÈ›ia.",
  "descriere_task": "EÈ™ti un expert Redis cu experienÈ›Äƒ Ã®n troubleshooting. Task-ul tÄƒu este sÄƒ porneÈ™ti È™i sÄƒ verifici containerul Redis.\n\nPaÈ™i:\n\n1. PorneÈ™te Redis:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d redis\n```\n\n2. VerificÄƒ logs:\n```bash\ndocker compose logs -f redis\n# AÈ™teaptÄƒ 'Ready to accept connections'\n```\n\n3. VerificÄƒ healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-redis\n# Trebuie sÄƒ fie 'healthy'\n```\n\n4. VerificÄƒ configuraÈ›ia criticÄƒ pentru BullMQ:\n```bash\ndocker exec cerniq-redis redis-cli CONFIG GET maxmemory-policy\n# TREBUIE sÄƒ returneze 'noeviction'\n\ndocker exec cerniq-redis redis-cli CONFIG GET appendonly\n# TREBUIE sÄƒ returneze 'yes'\n\ndocker exec cerniq-redis redis-cli CONFIG GET notify-keyspace-events\n# TREBUIE sÄƒ returneze 'Ex'\n```\n\n5. Test funcÈ›ionalitate:\n```bash\ndocker exec cerniq-redis redis-cli SET test:key \"hello\" EX 60\ndocker exec cerniq-redis redis-cli GET test:key\n# Trebuie sÄƒ returneze 'hello'\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU continua dacÄƒ maxmemory-policy NU este noeviction - BullMQ va pierde jobs",
    "NU ignora verificarea notify-keyspace-events - delayed jobs nu vor funcÈ›iona fÄƒrÄƒ",
    "VERIFICÄ‚ cÄƒ persistenÈ›a AOF este activatÄƒ",
    "AÈ˜TEAPTÄ‚ ca healthcheck sÄƒ fie healthy Ã®nainte de verificÄƒri"
  ],
  "validare_task": "1. Container cerniq-redis este running\n2. Health status este healthy\n3. CONFIG GET maxmemory-policy returneazÄƒ noeviction\n4. CONFIG GET appendonly returneazÄƒ yes\n5. CONFIG GET notify-keyspace-events returneazÄƒ Ex sau conÈ›ine Ex\n6. Test SET/GET funcÈ›ioneazÄƒ",
  "outcome": "Redis 7.4.7 ruleazÄƒ corect cu configuraÈ›ia optimÄƒ pentru BullMQ"
}
```

```json
{
  "taskID": "F0.3.1.T003",
  "denumire_task": "Test conectivitate Ã®ntre PostgreSQL È™i Redis pe reÈ›eaua internÄƒ",
  "context_anterior": "AtÃ¢t PostgreSQL cÃ¢t È™i Redis sunt running. Trebuie sÄƒ verificÄƒm cÄƒ pot comunica pe reÈ›eaua internÄƒ.",
  "descriere_task": "EÈ™ti un expert networking Docker. Task-ul tÄƒu este sÄƒ verifici conectivitatea Ã®ntre servicii.\n\nVerificÄƒri:\n\n1. VerificÄƒ cÄƒ PostgreSQL poate fi accesat de pe reÈ›eaua cerniq_data:\n```bash\n# PorneÈ™te un container temporar pe reÈ›eaua cerniq_data\ndocker run --rm --network cerniq_data alpine sh -c 'apk add postgresql-client && pg_isready -h postgres -p 5432'\n```\n\n2. VerificÄƒ cÄƒ Redis poate fi accesat de pe reÈ›eaua cerniq_backend:\n```bash\ndocker run --rm --network cerniq_backend alpine sh -c 'apk add redis && redis-cli -h redis ping'\n```\n\n3. VerificÄƒ cÄƒ Redis NU este accesibil din exterior:\n```bash\n# Aceasta ar trebui sÄƒ EÈ˜UEZE\nredis-cli -h localhost -p 6379 ping\n# Sau timeout/connection refused\n```\n\n4. VerificÄƒ cÄƒ PostgreSQL NU este accesibil din exterior:\n```bash\n# Aceasta ar trebui sÄƒ EÈ˜UEZE\npsql -h localhost -p 5432 -U cerniq -d cerniq_production\n# Sau timeout/connection refused\n```\n\nDocumenteazÄƒ rezultatele Ã®n /var/www/CerniqAPP/docs/architecture/network-verification.md",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU modifica configuraÈ›ia dacÄƒ testele de izolare EÈ˜UEAZÄ‚ - trebuie sÄƒ eÈ™ueze accesul extern",
    "VERIFICÄ‚ cÄƒ accesul intern funcÈ›ioneazÄƒ ÃŽNAINTE de a verifica izolarea",
    "DOCUMENTEAZÄ‚ rezultatele pentru audit",
    "NU expune porturile pentru debugging - foloseÈ™te containere temporare"
  ],
  "validare_task": "1. pg_isready din container pe cerniq_data reuÈ™eÈ™te\n2. redis-cli ping din container pe cerniq_backend returneazÄƒ PONG\n3. Accesul de pe host la postgres:5432 EÈ˜UEAZÄ‚ (timeout/refused)\n4. Accesul de pe host la redis:6379 EÈ˜UEAZÄ‚ (timeout/refused)\n5. Documentul network-verification.md este creat",
  "outcome": "Conectivitate internÄƒ verificatÄƒ È™i izolare de exterior confirmatÄƒ pentru PostgreSQL È™i Redis"
}
```

---

# FAZA F0.4: TRAEFIK v3.6.6 SETUP

```json
{
  "taskID": "F0.4.1.T001",
  "denumire_task": "Creare configuraÈ›ie staticÄƒ Traefik cu Let's Encrypt",
  "context_anterior": "PostgreSQL È™i Redis funcÈ›ionale pe reÈ›ele interne. Acum configurÄƒm Traefik ca reverse proxy cu SSL automat.",
  "descriere_task": "EÈ™ti un expert Traefik È™i TLS/SSL cu experienÈ›Äƒ Ã®n configurarea pentru producÈ›ie. Task-ul tÄƒu este sÄƒ creezi configuraÈ›ia staticÄƒ Traefik.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/docker/traefik/traefik.yml:\n\n```yaml\n# Traefik v3.6.6 Static Configuration for Cerniq.app\n# Last Updated: 2026-01-15\n\nglobal:\n  checkNewVersion: false\n  sendAnonymousUsage: false\n\napi:\n  dashboard: true\n  insecure: false\n\nlog:\n  level: INFO\n  format: json\n\naccessLog:\n  format: json\n  filters:\n    statusCodes:\n      - \"400-599\"\n\nentryPoints:\n  web:\n    address: \":80\"\n    http:\n      redirections:\n        entryPoint:\n          to: websecure\n          scheme: https\n          permanent: true\n  websecure:\n    address: \":443\"\n    http:\n      tls:\n        certResolver: letsencrypt\n    http3: {}\n  metrics:\n    address: \":8082\"\n\nproviders:\n  docker:\n    endpoint: \"unix:///var/run/docker.sock\"\n    exposedByDefault: false\n    network: cerniq_public\n    watch: true\n  file:\n    directory: /etc/traefik/dynamic\n    watch: true\n\ncertificatesResolvers:\n  letsencrypt:\n    acme:\n      email: admin@cerniq.app\n      storage: /acme.json\n      caServer: \"https://acme-v02.api.letsencrypt.org/directory\"\n      httpChallenge:\n        entryPoint: web\n\nmetrics:\n  prometheus:\n    entryPoint: metrics\n    addEntryPointsLabels: true\n    addServicesLabels: true\n```\n\nIMPORTANT: exposedByDefault: false este OBLIGATORIU pentru securitate.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik",
  "restrictii_antihalucinatie": [
    "exposedByDefault TREBUIE sÄƒ fie false - altfel toate containerele sunt expuse automat",
    "NU activa api.insecure Ã®n production - dashboard-ul trebuie securizat",
    "NU omite HTTP â†’ HTTPS redirect - totul trebuie sÄƒ fie pe HTTPS",
    "VERIFICÄ‚ cÄƒ email-ul pentru Let's Encrypt este valid",
    "INCLUDE http3: {} pentru HTTP/3 support",
    "FOLOSEÈ˜TE network: cerniq_public pentru Docker provider"
  ],
  "validare_task": "1. FiÈ™ierul traefik.yml existÄƒ Ã®n directorul corect\n2. exposedByDefault este false\n3. api.insecure este false\n4. certResolver letsencrypt este configurat cu httpChallenge\n5. EntryPoint web redirecÈ›ioneazÄƒ cÄƒtre websecure\n6. HTTP/3 este activat (http3: {})",
  "outcome": "ConfiguraÈ›ie staticÄƒ Traefik v3.6.6 cu Let's Encrypt È™i HTTP/3"
}
```

```json
{
  "taskID": "F0.4.1.T002",
  "denumire_task": "Creare middleware-uri dinamice pentru securitate",
  "context_anterior": "ConfiguraÈ›ie staticÄƒ Traefik creatÄƒ. Acum adÄƒugÄƒm middleware-uri pentru headers de securitate È™i rate limiting.",
  "descriere_task": "EÈ™ti un expert Ã®n securitate web. Task-ul tÄƒu este sÄƒ creezi fiÈ™ierul de configuraÈ›ie dinamicÄƒ cu middleware-uri.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/docker/traefik/dynamic/middlewares.yml:\n\n```yaml\n# Traefik Dynamic Configuration - Middlewares\n# Last Updated: 2026-01-15\n\nhttp:\n  middlewares:\n    # Security Headers\n    secure-headers:\n      headers:\n        stsSeconds: 31536000\n        stsIncludeSubdomains: true\n        stsPreload: true\n        contentTypeNosniff: true\n        frameDeny: true\n        browserXssFilter: true\n        referrerPolicy: \"strict-origin-when-cross-origin\"\n        customResponseHeaders:\n          X-Robots-Tag: \"noindex, nofollow\"\n          Permissions-Policy: \"accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()\"\n\n    # Rate Limiting\n    rate-limit:\n      rateLimit:\n        average: 100\n        burst: 200\n        period: 1s\n        sourceCriterion:\n          ipStrategy:\n            depth: 0\n\n    # Compression\n    compress:\n      compress:\n        excludedContentTypes:\n          - text/event-stream\n        minResponseBodyBytes: 1024\n\n    # API Rate Limit (more restrictive)\n    api-rate-limit:\n      rateLimit:\n        average: 50\n        burst: 100\n        period: 1s\n\n    # Dashboard Auth\n    dashboard-auth:\n      basicAuth:\n        users:\n          - \"admin:$apr1$placeholder$placeholder\"  # Generate with htpasswd\n\n    # IP Whitelist for Dashboard\n    dashboard-whitelist:\n      ipAllowList:\n        sourceRange:\n          - \"127.0.0.1/32\"\n          - \"10.0.0.0/8\"\n          - \"172.16.0.0/12\"\n          - \"192.168.0.0/16\"\n\n    # Chain for API routes\n    api-chain:\n      chain:\n        middlewares:\n          - secure-headers\n          - rate-limit\n          - compress\n\n    # Chain for Dashboard\n    dashboard-chain:\n      chain:\n        middlewares:\n          - dashboard-whitelist\n          - dashboard-auth\n          - secure-headers\n\n  # TLS Configuration\n  tls:\n    options:\n      default:\n        minVersion: VersionTLS12\n        cipherSuites:\n          - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384\n          - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384\n          - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305\n          - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305\n        sniStrict: true\n```\n\nNOTÄ‚: Parola pentru dashboard-auth trebuie generatÄƒ cu htpasswd È™i Ã®nlocuitÄƒ.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik/dynamic",
  "restrictii_antihalucinatie": [
    "NU permite TLS 1.0 sau 1.1 - minVersion TREBUIE sÄƒ fie VersionTLS12 sau mai nou",
    "NU omite HSTS headers - sunt esenÈ›iale pentru securitate",
    "NU seta rate limit prea restrictiv (sub 50 req/s) pentru API",
    "VERIFICÄ‚ sintaxa YAML - Traefik nu va porni cu sintaxÄƒ invalidÄƒ",
    "PLACEHOLDER pentru basicAuth trebuie Ã®nlocuit cu hash real",
    "INCLUDE minResponseBodyBytes pentru compress - evitÄƒ overhead pe response-uri mici"
  ],
  "validare_task": "1. FiÈ™ierul middlewares.yml existÄƒ Ã®n dynamic/\n2. Middleware secure-headers conÈ›ine HSTS cu stsSeconds: 31536000\n3. Rate-limit este configurat cu average: 100\n4. TLS minVersion este VersionTLS12\n5. Chain-uri api-chain È™i dashboard-chain sunt definite\n6. YAML este valid (fÄƒrÄƒ erori de sintaxÄƒ)",
  "outcome": "Middleware-uri Traefik pentru securitate, rate limiting È™i compresie configurate"
}
```

```json
{
  "taskID": "F0.4.1.T003",
  "denumire_task": "AdÄƒugare serviciu Traefik Ã®n docker-compose.yml",
  "context_anterior": "ConfiguraÈ›ii statice È™i dinamice Traefik create. Acum adÄƒugÄƒm serviciul Ã®n docker-compose.",
  "descriere_task": "EÈ™ti un expert Docker Compose. Task-ul tÄƒu este sÄƒ adaugi serviciul Traefik Ã®n docker-compose.yml.\n\nAdaugÄƒ serviciul:\n\n```yaml\n  traefik:\n    image: traefik:v3.6.6\n    container_name: cerniq-traefik\n    restart: unless-stopped\n    security_opt:\n      - no-new-privileges:true\n    ports:\n      - \"80:80\"\n      - \"443:443\"\n      - \"443:443/udp\"  # HTTP/3\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro\n      - ./traefik/dynamic:/etc/traefik/dynamic:ro\n      - traefik_certs:/acme.json\n    networks:\n      - cerniq_public\n    labels:\n      - \"traefik.enable=true\"\n      # Dashboard\n      - \"traefik.http.routers.dashboard.rule=Host(`traefik.cerniq.app`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))\"\n      - \"traefik.http.routers.dashboard.service=api@internal\"\n      - \"traefik.http.routers.dashboard.entrypoints=websecure\"\n      - \"traefik.http.routers.dashboard.tls.certresolver=letsencrypt\"\n      - \"traefik.http.routers.dashboard.middlewares=dashboard-chain@file\"\n    healthcheck:\n      test: [\"CMD\", \"traefik\", \"healthcheck\", \"--ping\"]\n      interval: 10s\n      timeout: 5s\n      retries: 3\n      start_period: 10s\n    deploy:\n      resources:\n        limits:\n          memory: 512M\n          cpus: '0.5'\n        reservations:\n          memory: 256M\n          cpus: '0.25'\n```\n\nNOTÄ‚: Docker socket montat read-only pentru securitate.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "Docker socket TREBUIE montat read-only (:ro)",
    "security_opt: no-new-privileges:true TREBUIE inclus",
    "INCLUDE port 443/udp pentru HTTP/3",
    "Dashboard TREBUIE protejat cu middleware dashboard-chain",
    "Traefik TREBUIE sÄƒ fie DOAR pe reÈ›eaua cerniq_public",
    "NU monta volume-uri write decÃ¢t pentru acme.json"
  ],
  "validare_task": "1. 'docker compose config' valideazÄƒ fÄƒrÄƒ erori\n2. Traefik foloseÈ™te imaginea traefik:v3.6.6\n3. Docker socket este montat read-only\n4. security_opt conÈ›ine no-new-privileges:true\n5. Porturile 80, 443, 443/udp sunt expuse\n6. Dashboard are middleware dashboard-chain",
  "outcome": "Serviciu Traefik v3.6.6 adÄƒugat Ã®n docker-compose.yml cu securitate È™i HTTP/3"
}
```

```json
{
  "taskID": "F0.4.1.T004",
  "denumire_task": "Pornire È™i verificare Traefik",
  "context_anterior": "Serviciul Traefik configurat. Acum trebuie sÄƒ-l pornim È™i sÄƒ verificÄƒm funcÈ›ionarea.",
  "descriere_task": "EÈ™ti un expert DevOps. Task-ul tÄƒu este sÄƒ porneÈ™ti È™i sÄƒ verifici Traefik.\n\nPaÈ™i:\n\n1. CreeazÄƒ volume pentru certificate (dacÄƒ nu existÄƒ deja):\n```bash\ntouch /var/www/CerniqAPP/infra/docker/acme.json\nchmod 600 /var/www/CerniqAPP/infra/docker/acme.json\n```\n\n2. PorneÈ™te Traefik:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d traefik\n```\n\n3. VerificÄƒ logs:\n```bash\ndocker compose logs -f traefik\n# VerificÄƒ cÄƒ nu sunt erori\n```\n\n4. VerificÄƒ healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-traefik\n# Trebuie sÄƒ fie healthy\n```\n\n5. VerificÄƒ cÄƒ porturile sunt deschise:\n```bash\nss -tlnp | grep -E ':(80|443)'\n# Trebuie sÄƒ arate traefik listening pe aceste porturi\n```\n\n6. Test HTTP redirect:\n```bash\ncurl -I http://localhost\n# Trebuie sÄƒ returneze 301 Redirect cÄƒtre HTTPS\n```\n\n7. VerificÄƒ metrics endpoint:\n```bash\ncurl http://localhost:8082/metrics\n# Trebuie sÄƒ returneze metrici Prometheus\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "acme.json TREBUIE sÄƒ aibÄƒ permisiuni 600 - altfel Traefik refuzÄƒ sÄƒ porneascÄƒ",
    "NU continua dacÄƒ sunt erori Ã®n logs - rezolvÄƒ-le mai Ã®ntÃ¢i",
    "VERIFICÄ‚ cÄƒ redirect HTTPâ†’HTTPS funcÈ›ioneazÄƒ",
    "AÈ˜TEAPTÄ‚ healthcheck sÄƒ fie healthy Ã®nainte de alte verificÄƒri"
  ],
  "validare_task": "1. Container cerniq-traefik este running\n2. Health status este healthy\n3. Porturile 80 È™i 443 sunt deschise\n4. HTTP redirect funcÈ›ioneazÄƒ (301 cÄƒtre HTTPS)\n5. Metrics endpoint rÄƒspunde la :8082/metrics\n6. Logs nu conÈ›in erori",
  "outcome": "Traefik v3.6.6 funcÈ›ional cu SSL automat È™i HTTP/3"
}
```

---

# FAZA F0.5: OBSERVABILITY STACK (SigNoz)

```json
{
  "taskID": "F0.5.1.T001",
  "denumire_task": "AdÄƒugare servicii SigNoz v0.104.0 Ã®n docker-compose.yml",
  "context_anterior": "Traefik funcÈ›ional. Acum adÄƒugÄƒm stack-ul de observability SigNoz pentru traces, metrics È™i logs.",
  "descriere_task": "EÈ™ti un expert observability cu experienÈ›Äƒ Ã®n OpenTelemetry È™i SigNoz. Task-ul tÄƒu este sÄƒ adaugi serviciile SigNoz Ã®n docker-compose.\n\nAdaugÄƒ serviciile (aceasta este o configuraÈ›ie simplificatÄƒ - SigNoz complet are mai multe componente):\n\n```yaml\n  # ClickHouse pentru SigNoz\n  clickhouse:\n    image: clickhouse/clickhouse-server:24.11-alpine\n    container_name: cerniq-clickhouse\n    restart: unless-stopped\n    volumes:\n      - signoz_data:/var/lib/clickhouse\n    networks:\n      - cerniq_backend\n    healthcheck:\n      test: [\"CMD\", \"wget\", \"--spider\", \"-q\", \"localhost:8123/ping\"]\n      interval: 30s\n      timeout: 5s\n      retries: 3\n    deploy:\n      resources:\n        limits:\n          memory: 8G\n          cpus: '2'\n\n  # SigNoz Query Service\n  signoz:\n    image: signoz/query-service:0.104.0\n    container_name: cerniq-signoz\n    restart: unless-stopped\n    environment:\n      - ClickHouseUrl=tcp://clickhouse:9000\n      - SIGNOZ_LOCAL_DB_PATH=/var/lib/signoz/signoz.db\n    volumes:\n      - signoz_data:/var/lib/signoz\n    depends_on:\n      clickhouse:\n        condition: service_healthy\n    networks:\n      - cerniq_backend\n    labels:\n      - \"traefik.enable=true\"\n      - \"traefik.http.routers.signoz.rule=Host(`signoz.cerniq.app`)\"\n      - \"traefik.http.routers.signoz.entrypoints=websecure\"\n      - \"traefik.http.routers.signoz.tls.certresolver=letsencrypt\"\n      - \"traefik.http.services.signoz.loadbalancer.server.port=8080\"\n\n  # OpenTelemetry Collector\n  otel-collector:\n    image: signoz/signoz-otel-collector:0.129.12\n    container_name: cerniq-otel-collector\n    restart: unless-stopped\n    command: [\"--config=/etc/otel-collector-config.yaml\"]\n    volumes:\n      - ./config/otel/otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro\n    ports:\n      - \"4317:4317\"   # OTLP gRPC\n      - \"4318:4318\"   # OTLP HTTP\n    depends_on:\n      - clickhouse\n    networks:\n      - cerniq_backend\n      - cerniq_public\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune ClickHouse direct la public - doar prin reÈ›eaua internÄƒ",
    "VERIFICÄ‚ compatibilitatea versiunilor Ã®ntre componente SigNoz",
    "INCLUDE volume pentru persistenÈ›Äƒ ClickHouse",
    "OTel Collector trebuie sÄƒ fie pe cerniq_public pentru a primi traces de la API",
    "SigNoz UI trebuie protejat prin Traefik labels"
  ],
  "validare_task": "1. 'docker compose config' valideazÄƒ fÄƒrÄƒ erori\n2. Serviciile clickhouse, signoz, otel-collector sunt definite\n3. ClickHouse nu are port mapping public\n4. OTel Collector expune porturile 4317 È™i 4318\n5. SigNoz are Traefik labels pentru routing",
  "outcome": "Servicii SigNoz v0.104.0 adÄƒugate Ã®n docker-compose pentru observability complet"
}
```

```json
{
  "taskID": "F0.5.1.T002",
  "denumire_task": "Creare configuraÈ›ie OpenTelemetry Collector",
  "context_anterior": "Servicii SigNoz definite. Acum creÄƒm configuraÈ›ia pentru OTel Collector.",
  "descriere_task": "EÈ™ti un expert OpenTelemetry. CreeazÄƒ configuraÈ›ia pentru OTel Collector.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/infra/config/otel/otel-collector-config.yaml:\n\n```yaml\n# OpenTelemetry Collector Configuration for Cerniq.app\n# Last Updated: 2026-01-15\n\nreceivers:\n  otlp:\n    protocols:\n      grpc:\n        endpoint: 0.0.0.0:4317\n      http:\n        endpoint: 0.0.0.0:4318\n\nprocessors:\n  batch:\n    timeout: 1s\n    send_batch_size: 1000\n    send_batch_max_size: 1500\n  \n  memory_limiter:\n    check_interval: 1s\n    limit_mib: 2000\n    spike_limit_mib: 500\n\n  resource:\n    attributes:\n      - key: deployment.environment\n        value: production\n        action: upsert\n\nexporters:\n  clickhousetraces:\n    datasource: tcp://clickhouse:9000/signoz_traces\n    migrations_folder: /signoz/migrations/traces\n  \n  clickhousemetricswrite:\n    datasource: tcp://clickhouse:9000/signoz_metrics\n\n  clickhouselogs:\n    dsn: tcp://clickhouse:9000/signoz_logs\n    timeout: 10s\n\nservice:\n  telemetry:\n    logs:\n      level: info\n  \n  pipelines:\n    traces:\n      receivers: [otlp]\n      processors: [memory_limiter, batch, resource]\n      exporters: [clickhousetraces]\n    \n    metrics:\n      receivers: [otlp]\n      processors: [memory_limiter, batch]\n      exporters: [clickhousemetricswrite]\n    \n    logs:\n      receivers: [otlp]\n      processors: [memory_limiter, batch]\n      exporters: [clickhouselogs]\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/config/otel",
  "restrictii_antihalucinatie": [
    "INCLUDE memory_limiter pentru a preveni OOM",
    "FOLOSEÈ˜TE batch processor pentru eficienÈ›Äƒ",
    "VERIFICÄ‚ cÄƒ endpoint-urile ClickHouse sunt corecte",
    "INCLUDE toate cele 3 pipeline-uri: traces, metrics, logs",
    "NU expune exporters direct - doar receivers"
  ],
  "validare_task": "1. FiÈ™ierul otel-collector-config.yaml existÄƒ\n2. Receivers OTLP sunt configurate pe 4317 (gRPC) È™i 4318 (HTTP)\n3. Toate exporters pointeazÄƒ cÄƒtre clickhouse\n4. Pipeline-uri pentru traces, metrics È™i logs sunt definite\n5. memory_limiter este configurat",
  "outcome": "ConfiguraÈ›ie OTel Collector completÄƒ pentru SigNoz"
}
```

```json
{
  "taskID": "F0.5.1.T003",
  "denumire_task": "Pornire È™i verificare stack observability",
  "context_anterior": "ConfiguraÈ›ie OTel Collector creatÄƒ. Acum pornim Ã®ntregul stack.",
  "descriere_task": "EÈ™ti un expert DevOps. PorneÈ™te È™i verificÄƒ stack-ul de observability.\n\nPaÈ™i:\n\n1. PorneÈ™te serviciile:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d clickhouse\n# AÈ™teaptÄƒ sÄƒ devinÄƒ healthy\ndocker compose up -d signoz otel-collector\n```\n\n2. VerificÄƒ ClickHouse:\n```bash\ndocker exec cerniq-clickhouse clickhouse-client --query \"SELECT 1\"\n# Trebuie sÄƒ returneze 1\n```\n\n3. VerificÄƒ OTel Collector:\n```bash\ncurl -v http://localhost:4318/v1/traces\n# Ar trebui sÄƒ accepte POST requests (405 pentru GET e OK)\n```\n\n4. VerificÄƒ SigNoz UI:\n```bash\ndocker compose logs signoz | grep -i ready\n# Sau acceseazÄƒ https://signoz.cerniq.app dupÄƒ DNS setup\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "PORNEÈ˜TE ClickHouse PRIMUL È™i aÈ™teaptÄƒ sÄƒ fie healthy",
    "NU continua dacÄƒ ClickHouse are erori",
    "VERIFICÄ‚ logs pentru fiecare serviciu"
  ],
  "validare_task": "1. Toate containerele observability sunt running\n2. ClickHouse rÄƒspunde la queries\n3. OTel Collector acceptÄƒ requests pe 4317/4318\n4. SigNoz este accesibil (direct sau prin Traefik)",
  "outcome": "Stack observability SigNoz funcÈ›ional È™i gata sÄƒ primeascÄƒ telemetrie"
}
```

---

# FAZA F0.6: PNPM È˜I MONOREPO SETUP (COMPLET)

```json
{
  "taskID": "F0.6.1.T001",
  "denumire_task": "Instalare Node.js v24 LTS È™i activare PNPM",
  "context_anterior": "Infrastructura Docker completÄƒ. Acum instalÄƒm Node.js È™i PNPM pentru dezvoltarea aplicaÈ›iei.",
  "descriere_task": "EÈ™ti un expert JavaScript/Node.js. Task-ul tÄƒu este sÄƒ instalezi Node.js v24 LTS È™i sÄƒ activezi PNPM.\n\nPaÈ™i:\n\n1. InstaleazÄƒ Node.js v24 via NodeSource:\n```bash\ncurl -fsSL https://deb.nodesource.com/setup_24.x | bash -\napt install -y nodejs\n```\n\n2. VerificÄƒ versiunea:\n```bash\nnode --version\n# Trebuie sÄƒ afiÈ™eze v24.x.x\n\nnpm --version\n# Trebuie sÄƒ afiÈ™eze 11.x.x\n```\n\n3. ActiveazÄƒ Corepack (include pnpm):\n```bash\ncorepack enable\ncorepack prepare pnpm@9.15.0 --activate\n```\n\n4. VerificÄƒ PNPM:\n```bash\npnpm --version\n# Trebuie sÄƒ afiÈ™eze 9.15.x\n```\n\n5. SeteazÄƒ PNPM store global:\n```bash\npnpm config set store-dir ~/.pnpm-store\n```",
  "director_implementare": "/root",
  "restrictii_antihalucinatie": [
    "NU folosi nvm pentru producÈ›ie - instaleazÄƒ direct din NodeSource",
    "FOLOSEÈ˜TE corepack pentru PNPM - este metoda oficialÄƒ",
    "VERIFICÄ‚ cÄƒ versiunea Node.js este 24.x",
    "NU instala pnpm global cu npm - foloseÈ™te corepack",
    "PNPM versiunea trebuie sÄƒ fie 9.15+ conform ADR-0001"
  ],
  "validare_task": "1. 'node --version' afiÈ™eazÄƒ v24.x.x\n2. 'npm --version' afiÈ™eazÄƒ 11.x.x\n3. 'pnpm --version' afiÈ™eazÄƒ 9.15.x\n4. 'which pnpm' returneazÄƒ path valid",
  "outcome": "Node.js v24 LTS È™i PNPM 9.15 instalate È™i configurate"
}
```

```json
{
  "taskID": "F0.6.1.T002",
  "denumire_task": "IniÈ›ializare monorepo cu pnpm-workspace.yaml",
  "context_anterior": "Node.js È™i PNPM instalate. Acum iniÈ›ializÄƒm proiectul monorepo.",
  "descriere_task": "EÈ™ti un expert Ã®n monorepo management. Task-ul tÄƒu este sÄƒ iniÈ›ializezi proiectul Cerniq.app ca monorepo PNPM.\n\nPaÈ™i:\n\n1. NavigheazÄƒ la directorul proiect:\n```bash\ncd /var/www/CerniqAPP\n```\n\n2. CreeazÄƒ package.json root:\n```json\n{\n  \"name\": \"@cerniq/monorepo\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"description\": \"Cerniq.app B2B Sales Automation Platform\",\n  \"packageManager\": \"pnpm@9.15.0\",\n  \"engines\": {\n    \"node\": \">=24.0.0\",\n    \"pnpm\": \">=9.15.0\"\n  },\n  \"scripts\": {\n    \"dev\": \"turbo dev\",\n    \"build\": \"turbo build\",\n    \"test\": \"turbo test\",\n    \"lint\": \"turbo lint\",\n    \"clean\": \"turbo clean && rm -rf node_modules\"\n  },\n  \"devDependencies\": {\n    \"turbo\": \"^2.3.0\"\n  }\n}\n```\n\n3. CreeazÄƒ pnpm-workspace.yaml:\n```yaml\npackages:\n  - 'apps/*'\n  - 'packages/*'\n```\n\n4. CreeazÄƒ .npmrc:\n```ini\nshamefully-hoist=false\nauto-install-peers=true\nlink-workspace-packages=true\nprefer-frozen-lockfile=true\nstrict-peer-dependencies=false\nengine-strict=true\n```\n\n5. CreeazÄƒ turbo.json:\n```json\n{\n  \"$schema\": \"https://turbo.build/schema.json\",\n  \"tasks\": {\n    \"build\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": [\"dist/**\", \".next/**\", \"build/**\"]\n    },\n    \"dev\": {\n      \"cache\": false,\n      \"persistent\": true\n    },\n    \"test\": {\n      \"dependsOn\": [\"build\"],\n      \"inputs\": [\"src/**\", \"tests/**\"]\n    },\n    \"lint\": {},\n    \"clean\": {\n      \"cache\": false\n    }\n  }\n}\n```\n\n6. RuleazÄƒ instalare:\n```bash\npnpm install\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU folosi npm sau yarn - EXCLUSIV pnpm",
    "shamefully-hoist TREBUIE sÄƒ fie false conform ADR-0001",
    "engine-strict TREBUIE sÄƒ fie true pentru a impune versiuni",
    "INCLUDE packageManager Ã®n package.json",
    "NU omite turbo.json - este necesar pentru orchestrarea build-urilor"
  ],
  "validare_task": "1. package.json existÄƒ cu packageManager: pnpm@9.15.0\n2. pnpm-workspace.yaml existÄƒ cu apps/* È™i packages/*\n3. .npmrc existÄƒ cu shamefully-hoist=false\n4. turbo.json existÄƒ\n5. 'pnpm install' ruleazÄƒ fÄƒrÄƒ erori\n6. node_modules/.pnpm existÄƒ (structurÄƒ pnpm)",
  "outcome": "Monorepo PNPM iniÈ›ializat cu Turborepo pentru orchestrare"
}
```

```json
{
  "taskID": "F0.6.1.T003",
  "denumire_task": "Creare package apps/api cu Fastify v5.6.2",
  "context_anterior": "Monorepo iniÈ›ializat. Acum creÄƒm package-ul pentru API.",
  "descriere_task": "EÈ™ti un expert backend Node.js specializat Ã®n Fastify. Task-ul tÄƒu este sÄƒ creezi package-ul apps/api.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/package.json:\n```json\n{\n  \"name\": \"@cerniq/api\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"node --watch --env-file=.env src/index.ts\",\n    \"build\": \"tsup src/index.ts --format esm --dts\",\n    \"start\": \"node dist/index.js\",\n    \"test\": \"vitest run\",\n    \"test:watch\": \"vitest\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"fastify\": \"^5.6.2\",\n    \"@fastify/cors\": \"^10.0.0\",\n    \"@fastify/helmet\": \"^12.0.0\",\n    \"@fastify/jwt\": \"^9.0.0\",\n    \"@fastify/cookie\": \"^10.0.0\",\n    \"@fastify/type-provider-zod\": \"^3.0.0\",\n    \"zod\": \"^3.24.0\",\n    \"pino\": \"^9.6.0\",\n    \"drizzle-orm\": \"^0.38.0\",\n    \"postgres\": \"^3.4.0\",\n    \"@cerniq/db\": \"workspace:*\",\n    \"@cerniq/shared-types\": \"workspace:*\"\n  },\n  \"devDependencies\": {\n    \"typescript\": \"^5.7.0\",\n    \"@types/node\": \"^22.10.0\",\n    \"tsup\": \"^8.3.0\",\n    \"vitest\": \"^2.1.0\",\n    \"eslint\": \"^9.17.0\"\n  },\n  \"engines\": {\n    \"node\": \">=24.0.0\"\n  }\n}\n```\n\nCreeazÄƒ tsconfig.json pentru apps/api:\n```json\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2024\",\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"esModuleInterop\": true,\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"outDir\": \"dist\",\n    \"rootDir\": \"src\",\n    \"declaration\": true,\n    \"declarationMap\": true,\n    \"sourceMap\": true\n  },\n  \"include\": [\"src/**/*\"],\n  \"exclude\": [\"node_modules\", \"dist\"]\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "NU folosi Express - TREBUIE Fastify v5.6.2",
    "NU omite @fastify/type-provider-zod - esenÈ›ial pentru type safety",
    "FOLOSEÈ˜TE workspace:* pentru packages interne",
    "type: module TREBUIE inclus pentru ESM",
    "NU include nodemon - foloseÈ™te node --watch nativ"
  ],
  "validare_task": "1. package.json existÄƒ Ã®n apps/api/\n2. fastify versiunea este ^5.6.2\n3. DependenÈ›e interne folosesc workspace:*\n4. type este 'module'\n5. tsconfig.json existÄƒ cu module NodeNext",
  "outcome": "Package API cu Fastify v5.6.2 configurat"
}
```

```json
{
  "taskID": "F0.6.1.T004",
  "denumire_task": "Creare package apps/web cu React 19 È™i Refine v5",
  "context_anterior": "Package API creat. Acum creÄƒm package-ul pentru frontend.",
  "descriere_task": "EÈ™ti un expert frontend React. Task-ul tÄƒu este sÄƒ creezi package-ul apps/web.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/web/package.json:\n```json\n{\n  \"name\": \"@cerniq/web\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\",\n    \"test\": \"vitest run\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"react\": \"^19.0.0\",\n    \"react-dom\": \"^19.0.0\",\n    \"@refinedev/core\": \"^5.0.0\",\n    \"@refinedev/react-router\": \"^1.0.0\",\n    \"react-router-dom\": \"^7.0.0\",\n    \"@tanstack/react-query\": \"^5.62.0\",\n    \"zod\": \"^3.24.0\",\n    \"@cerniq/shared-types\": \"workspace:*\"\n  },\n  \"devDependencies\": {\n    \"@types/react\": \"^19.0.0\",\n    \"@types/react-dom\": \"^19.0.0\",\n    \"typescript\": \"^5.7.0\",\n    \"vite\": \"^6.0.0\",\n    \"@vitejs/plugin-react\": \"^4.3.0\",\n    \"tailwindcss\": \"^4.0.0\",\n    \"vitest\": \"^2.1.0\",\n    \"eslint\": \"^9.17.0\"\n  },\n  \"engines\": {\n    \"node\": \">=24.0.0\"\n  }\n}\n```\n\nCreeazÄƒ tsconfig.json È™i vite.config.ts corespunzÄƒtoare.",
  "director_implementare": "/var/www/CerniqAPP/apps/web",
  "restrictii_antihalucinatie": [
    "React TREBUIE sÄƒ fie versiunea 19",
    "Refine TREBUIE sÄƒ fie v5",
    "FOLOSEÈ˜TE Vite, NU Create React App",
    "Tailwind TREBUIE sÄƒ fie v4",
    "INCLUDE @cerniq/shared-types ca workspace dependency"
  ],
  "validare_task": "1. package.json existÄƒ Ã®n apps/web/\n2. react versiunea este ^19.0.0\n3. @refinedev/core versiunea este ^5.0.0\n4. vite versiunea este ^6.0.0\n5. tailwindcss versiunea este ^4.0.0",
  "outcome": "Package Web cu React 19 È™i Refine v5 configurat"
}
```

```json
{
  "taskID": "F0.6.1.T005",
  "denumire_task": "Creare package packages/db cu Drizzle ORM",
  "context_anterior": "Packages pentru apps create. Acum creÄƒm package-ul pentru database.",
  "descriere_task": "EÈ™ti un expert database TypeScript. Task-ul tÄƒu este sÄƒ creezi package-ul packages/db cu Drizzle ORM.\n\nCreeazÄƒ /var/www/CerniqAPP/packages/db/package.json:\n```json\n{\n  \"name\": \"@cerniq/db\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"exports\": {\n    \".\": {\n      \"import\": \"./dist/index.js\",\n      \"types\": \"./dist/index.d.ts\"\n    },\n    \"./schema\": {\n      \"import\": \"./dist/schema/index.js\",\n      \"types\": \"./dist/schema/index.d.ts\"\n    }\n  },\n  \"scripts\": {\n    \"build\": \"tsup\",\n    \"dev\": \"tsup --watch\",\n    \"db:generate\": \"drizzle-kit generate\",\n    \"db:migrate\": \"drizzle-kit migrate\",\n    \"db:push\": \"drizzle-kit push\",\n    \"db:studio\": \"drizzle-kit studio\"\n  },\n  \"dependencies\": {\n    \"drizzle-orm\": \"^0.38.0\",\n    \"drizzle-zod\": \"^0.5.0\",\n    \"postgres\": \"^3.4.0\",\n    \"zod\": \"^3.24.0\"\n  },\n  \"devDependencies\": {\n    \"drizzle-kit\": \"^0.30.0\",\n    \"typescript\": \"^5.7.0\",\n    \"tsup\": \"^8.3.0\",\n    \"@types/node\": \"^22.10.0\"\n  },\n  \"peerDependencies\": {\n    \"@cerniq/shared-types\": \"workspace:*\"\n  }\n}\n```\n\nCreeazÄƒ drizzle.config.ts:\n```typescript\nimport { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './src/schema/index.ts',\n  out: './drizzle',\n  dialect: 'postgresql',\n  dbCredentials: {\n    url: process.env.DATABASE_URL!,\n  },\n  verbose: true,\n  strict: true,\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE drizzle-orm versiunea ^0.38.0",
    "INCLUDE drizzle-zod pentru auto-generare Zod schemas",
    "NU folosi Prisma - conform ADR-0007 folosim Drizzle",
    "exports TREBUIE sÄƒ includÄƒ È™i ./schema pentru import individual",
    "INCLUDE drizzle-kit pentru migraÈ›ii"
  ],
  "validare_task": "1. package.json existÄƒ Ã®n packages/db/\n2. drizzle-orm versiunea este ^0.38.0\n3. drizzle-zod este inclus\n4. drizzle.config.ts existÄƒ\n5. Scripturi db:generate, db:migrate, db:push sunt definite",
  "outcome": "Package database cu Drizzle ORM configurat"
}
```

```json
{
  "taskID": "F0.6.1.T006",
  "denumire_task": "Creare package packages/shared-types cu Zod schemas",
  "context_anterior": "Package db creat. Acum creÄƒm package-ul pentru types shared.",
  "descriere_task": "EÈ™ti un expert TypeScript. Task-ul tÄƒu este sÄƒ creezi package-ul packages/shared-types.\n\nCreeazÄƒ /var/www/CerniqAPP/packages/shared-types/package.json:\n```json\n{\n  \"name\": \"@cerniq/shared-types\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"exports\": {\n    \".\": {\n      \"import\": \"./dist/index.js\",\n      \"types\": \"./dist/index.d.ts\"\n    }\n  },\n  \"scripts\": {\n    \"build\": \"tsup src/index.ts --format esm --dts\",\n    \"dev\": \"tsup src/index.ts --format esm --dts --watch\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"zod\": \"^3.24.0\"\n  },\n  \"devDependencies\": {\n    \"typescript\": \"^5.7.0\",\n    \"tsup\": \"^8.3.0\"\n  }\n}\n```\n\nCreeazÄƒ src/index.ts:\n```typescript\n// Cerniq.app Shared Types\n// Central location for all Zod schemas and TypeScript types\n\nexport * from './schemas/company';\nexport * from './schemas/contact';\nexport * from './schemas/lead';\nexport * from './schemas/events';\nexport * from './schemas/api';\n```\n\nCreeazÄƒ schema exemplu src/schemas/company.ts:\n```typescript\nimport { z } from 'zod';\n\nexport const CompanySchema = z.object({\n  id: z.string().uuid(),\n  tenantId: z.string().uuid(),\n  cui: z.string().regex(/^\\d{2,10}$/, 'CUI invalid'),\n  denumire: z.string().min(1).max(255),\n  platitorTva: z.boolean().default(false),\n  createdAt: z.date(),\n  updatedAt: z.date(),\n});\n\nexport type Company = z.infer<typeof CompanySchema>;\n\nexport const CreateCompanySchema = CompanySchema.omit({\n  id: true,\n  createdAt: true,\n  updatedAt: true,\n});\n\nexport type CreateCompany = z.infer<typeof CreateCompanySchema>;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/shared-types",
  "restrictii_antihalucinatie": [
    "TOATE typurile trebuie sÄƒ fie Zod schemas cu type inference",
    "NU crea types separate de Zod schemas - foloseÈ™te z.infer",
    "EXPORTÄ‚ totul din index.ts pentru facilitatea importurilor",
    "INCLUDE validare CUI cu regex conform specificaÈ›iilor"
  ],
  "validare_task": "1. package.json existÄƒ Ã®n packages/shared-types/\n2. zod versiunea este ^3.24.0\n3. src/index.ts exportÄƒ toate modulele\n4. src/schemas/company.ts conÈ›ine Zod schema È™i type inference",
  "outcome": "Package shared-types cu Zod schemas centralizate"
}
```

```json
{
  "taskID": "F0.6.1.T007",
  "denumire_task": "Creare configuraÈ›ii shared (ESLint, TypeScript, Tailwind)",
  "context_anterior": "Toate packages principale create. Acum creÄƒm configuraÈ›iile shared.",
  "descriere_task": "EÈ™ti un expert Ã®n configurare tooling. CreeazÄƒ configuraÈ›iile shared.\n\nCreeazÄƒ packages/config/eslint/package.json:\n```json\n{\n  \"name\": \"@cerniq/eslint-config\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"main\": \"index.js\",\n  \"dependencies\": {\n    \"eslint\": \"^9.17.0\",\n    \"@typescript-eslint/eslint-plugin\": \"^8.18.0\",\n    \"@typescript-eslint/parser\": \"^8.18.0\",\n    \"eslint-plugin-react\": \"^7.37.0\",\n    \"eslint-plugin-react-hooks\": \"^5.0.0\"\n  }\n}\n```\n\nCreeazÄƒ packages/config/eslint/index.js:\n```javascript\nmodule.exports = {\n  parser: '@typescript-eslint/parser',\n  plugins: ['@typescript-eslint'],\n  extends: [\n    'eslint:recommended',\n    'plugin:@typescript-eslint/recommended',\n  ],\n  rules: {\n    '@typescript-eslint/no-unused-vars': 'error',\n    '@typescript-eslint/explicit-function-return-type': 'warn',\n  },\n};\n```\n\nCreeazÄƒ packages/config/typescript/tsconfig.base.json:\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/tsconfig\",\n  \"compilerOptions\": {\n    \"target\": \"ES2024\",\n    \"lib\": [\"ES2024\"],\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"esModuleInterop\": true,\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"forceConsistentCasingInFileNames\": true,\n    \"declaration\": true,\n    \"declarationMap\": true,\n    \"sourceMap\": true\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/config",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE ESLint flat config (v9)",
    "TypeScript target TREBUIE sÄƒ fie ES2024 pentru Node.js v24",
    "INCLUDE strict: true Ã®n tsconfig",
    "moduleResolution TREBUIE sÄƒ fie NodeNext pentru ESM"
  ],
  "validare_task": "1. packages/config/eslint/package.json existÄƒ\n2. packages/config/typescript/tsconfig.base.json existÄƒ\n3. tsconfig foloseÈ™te target ES2024\n4. ESLint config include TypeScript plugin",
  "outcome": "ConfiguraÈ›ii shared create pentru consistenÈ›Äƒ Ã®n monorepo"
}
```

```json
{
  "taskID": "F0.6.1.T008",
  "denumire_task": "Instalare dependenÈ›e È™i verificare monorepo",
  "context_anterior": "Toate packages È™i configuraÈ›ii create. Acum instalÄƒm È™i verificÄƒm.",
  "descriere_task": "EÈ™ti un expert monorepo. VerificÄƒ È™i instaleazÄƒ toate dependenÈ›ele.\n\nPaÈ™i:\n\n1. Din root, instaleazÄƒ toate dependenÈ›ele:\n```bash\ncd /var/www/CerniqAPP\npnpm install\n```\n\n2. VerificÄƒ cÄƒ workspace-urile sunt detectate:\n```bash\npnpm list -r --depth=0\n# Trebuie sÄƒ afiÈ™eze toate packages\n```\n\n3. VerificÄƒ structura node_modules:\n```bash\nls -la node_modules/@cerniq/\n# Trebuie sÄƒ conÈ›inÄƒ symlinks cÄƒtre packages\n```\n\n4. Test build pentru un package:\n```bash\npnpm --filter @cerniq/shared-types build\n```\n\n5. CreeazÄƒ .gitignore root:\n```\nnode_modules/\ndist/\n.env\n.env.*\n!.env.example\n*.log\n.turbo/\nsecrets/\n!secrets/.gitignore\n```\n\n6. IniÈ›ializeazÄƒ git:\n```bash\ngit init\ngit add .\ngit commit -m \"chore: initial monorepo setup\"\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "pnpm install TREBUIE sÄƒ ruleze fÄƒrÄƒ erori",
    "Symlinks cÄƒtre packages interne TREBUIE sÄƒ existe Ã®n node_modules/@cerniq/",
    "NU commit node_modules sau secrets",
    "INCLUDE .turbo/ Ã®n .gitignore",
    "VERIFICÄ‚ cÄƒ toate workspace packages sunt detectate"
  ],
  "validare_task": "1. 'pnpm install' completeazÄƒ fÄƒrÄƒ erori\n2. 'pnpm list -r --depth=0' afiÈ™eazÄƒ toate 5 packages\n3. node_modules/@cerniq/ conÈ›ine symlinks\n4. Build pentru shared-types reuÈ™eÈ™te\n5. Git repository iniÈ›ializat cu primul commit",
  "outcome": "Monorepo complet funcÈ›ional cu toate dependenÈ›ele instalate"
}
```

---


# FAZA F0.7: BACKUP STRATEGY (COMPLET)

## F0.7.1 BorgBackup Setup

```json
{
  "taskID": "F0.7.1.T001",
  "denumire_task": "IniÈ›ializare BorgBackup Repository pe Hetzner Storage Box",
  "context_anterior": "Infrastructura Docker È™i serviciile de bazÄƒ sunt funcÈ›ionale. Acum configurÄƒm backup strategy conform ADR-0020.",
  "descriere_task": "EÈ™ti un expert Ã®n backup È™i disaster recovery cu experienÈ›Äƒ Ã®n BorgBackup È™i Hetzner Storage Box. ConfigureazÄƒ repository-ul pentru backup-uri.\n\n**PaÈ™ii de implementare:**\n\n1. GenereazÄƒ SSH key pentru Storage Box:\n```bash\nssh-keygen -t ed25519 -f ~/.ssh/storagebox_ed25519 -N '' -C 'cerniq-backup'\n```\n\n2. AdaugÄƒ cheia publicÄƒ Ã®n Hetzner Storage Box (Robot â†’ Storage Box â†’ SSH keys)\n\n3. TesteazÄƒ conexiunea (port 23!):\n```bash\nssh -p 23 uXXXXXX@uXXXXXX.your-storagebox.de ls\n```\n\n4. GenereazÄƒ È™i salveazÄƒ passphrase-ul BorgBackup:\n```bash\nmkdir -p /var/www/CerniqAPP/secrets\nopenssl rand -base64 32 > /var/www/CerniqAPP/secrets/borg_passphrase\nchmod 600 /var/www/CerniqAPP/secrets/borg_passphrase\necho 'CRITIC: Backup passphrase Ã®n locaÈ›ie securizatÄƒ separatÄƒ!'\n```\n\n5. IniÈ›ializeazÄƒ repository:\n```bash\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nborg init --encryption=repokey $BORG_REPO\n```\n\n6. VerificÄƒ iniÈ›ializarea:\n```bash\nborg info $BORG_REPO\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "PORT 23 pentru Hetzner Storage Box - NU 22!",
    "PASSPHRASE trebuie backup-uit separat - pierderea = pierderea backup-urilor",
    "FOLOSEÈ˜TE encryption=repokey pentru securitate",
    "SSH key TREBUIE sÄƒ fie ed25519 pentru performanÈ›Äƒ",
    "NU stoca passphrase Ã®n git sau Ã®n acelaÈ™i loc cu backup-urile"
  ],
  "validare_task": "1. SSH key ed25519 creat Ã®n ~/.ssh/storagebox_ed25519\n2. Conexiunea pe port 23 funcÈ›ioneazÄƒ\n3. Passphrase salvat Ã®n /var/www/CerniqAPP/secrets/borg_passphrase cu permisiuni 600\n4. Repository iniÈ›ializat cu encryption=repokey\n5. borg info returneazÄƒ informaÈ›ii despre repository",
  "outcome": "BorgBackup repository iniÈ›ializat pe Hetzner Storage Box cu encryption"
}
```

```json
{
  "taskID": "F0.7.1.T002",
  "denumire_task": "Creare script backup zilnic cu pg_dump È™i BorgBackup",
  "context_anterior": "Repository BorgBackup iniÈ›ializat. Acum creÄƒm scriptul de backup zilnic.",
  "descriere_task": "EÈ™ti un expert Ã®n scripting È™i backup automation. CreeazÄƒ scriptul de backup zilnic.\n\nCreeazÄƒ `/var/www/CerniqAPP/infra/scripts/backup-daily.sh`:\n\n```bash\n#!/bin/bash\n# CERNIQ Daily Backup Script\n# RuleazÄƒ via cron: 0 3 * * * /var/www/CerniqAPP/infra/scripts/backup-daily.sh\n\nset -euo pipefail\n\n# Configuration\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nBACKUP_NAME=\"cerniq-$(date +%Y%m%d-%H%M%S)\"\nBACKUP_DIR=\"/var/backups/cerniq\"\nLOG_FILE=\"/var/log/cerniq/backup-$(date +%Y%m%d).log\"\n\nmkdir -p $BACKUP_DIR /var/log/cerniq\n\nexec > >(tee -a \"$LOG_FILE\") 2>&1\n\necho \"=== CERNIQ BACKUP STARTED $(date) ===\"\n\n# 1. PostgreSQL dump\necho \"[1/4] Dumping PostgreSQL...\"\ndocker exec cerniq-postgres pg_dumpall -U cerniq > $BACKUP_DIR/pg_dumpall.sql\ndocker exec cerniq-postgres pg_dump -U cerniq -Fc cerniq_production > $BACKUP_DIR/cerniq_production.dump\necho \"PostgreSQL dump: $(du -h $BACKUP_DIR/pg_dumpall.sql | cut -f1)\"\n\n# 2. Redis RDB snapshot\necho \"[2/4] Snapshotting Redis...\"\ndocker exec cerniq-redis redis-cli BGSAVE\nsleep 5\ndocker cp cerniq-redis:/data/dump.rdb $BACKUP_DIR/redis-dump.rdb 2>/dev/null || echo 'Redis RDB not available'\n\n# 3. Create Borg backup\necho \"[3/4] Creating Borg backup...\"\nborg create --verbose --stats --compression zstd:6 \\\n    $BORG_REPO::$BACKUP_NAME \\\n    /var/www/CerniqAPP \\\n    $BACKUP_DIR \\\n    --exclude '/var/www/CerniqAPP/node_modules' \\\n    --exclude '/var/www/CerniqAPP/.git' \\\n    --exclude '/var/www/CerniqAPP/.pnpm-store' \\\n    --exclude '*.log' \\\n    --exclude '__pycache__'\n\n# 4. Prune old backups (GFS retention)\necho \"[4/4] Pruning old backups...\"\nborg prune --verbose --stats \\\n    --keep-daily=7 \\\n    --keep-weekly=4 \\\n    --keep-monthly=6 \\\n    --keep-yearly=2 \\\n    $BORG_REPO\n\n# Cleanup local dumps\nrm -f $BACKUP_DIR/pg_dumpall.sql $BACKUP_DIR/cerniq_production.dump\n\necho \"=== BACKUP COMPLETED $(date) ===\"\nborg info $BORG_REPO::$BACKUP_NAME\n```\n\nSeteazÄƒ permisiuni:\n```bash\nchmod +x /var/www/CerniqAPP/infra/scripts/backup-daily.sh\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE set -euo pipefail pentru fail-fast",
    "EXCLUDE node_modules, .git, .pnpm-store din backup",
    "GFS retention: 7 daily, 4 weekly, 6 monthly, 2 yearly",
    "COMPRESSION zstd:6 pentru balance size/speed",
    "CLEANUP dumps locale dupÄƒ backup reuÈ™it"
  ],
  "validare_task": "1. Script backup-daily.sh creat cu permisiuni +x\n2. Scriptul include pg_dumpall È™i pg_dump\n3. Exclude paths sunt configurate corect\n4. Prune cu GFS retention policy\n5. Logging Ã®n /var/log/cerniq/",
  "outcome": "Script backup zilnic funcÈ›ional cu GFS retention policy"
}
```

```json
{
  "taskID": "F0.7.1.T003",
  "denumire_task": "Configurare systemd timer pentru backup automat",
  "context_anterior": "Script backup creat. Acum configurÄƒm rularea automatÄƒ via systemd.",
  "descriere_task": "EÈ™ti un expert Ã®n systemd È™i automation. ConfigureazÄƒ timer pentru backup zilnic.\n\n1. CreeazÄƒ service file `/etc/systemd/system/cerniq-backup.service`:\n```ini\n[Unit]\nDescription=Cerniq Daily Backup\nAfter=docker.service network-online.target\nWants=network-online.target\n\n[Service]\nType=oneshot\nExecStart=/var/www/CerniqAPP/infra/scripts/backup-daily.sh\nUser=root\nEnvironment=HOME=/root\n\n# Logging\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=cerniq-backup\n\n# Timeout pentru backup mari\nTimeoutStartSec=3600\n```\n\n2. CreeazÄƒ timer file `/etc/systemd/system/cerniq-backup.timer`:\n```ini\n[Unit]\nDescription=Run Cerniq Backup Daily at 3 AM\n\n[Timer]\nOnCalendar=*-*-* 03:00:00\nPersistent=true\nRandomizedDelaySec=900\n\n[Install]\nWantedBy=timers.target\n```\n\n3. ActiveazÄƒ timer:\n```bash\nsudo systemctl daemon-reload\nsudo systemctl enable cerniq-backup.timer\nsudo systemctl start cerniq-backup.timer\n```\n\n4. VerificÄƒ status:\n```bash\nsystemctl status cerniq-backup.timer\nsystemctl list-timers | grep cerniq\n```",
  "director_implementare": "/etc/systemd/system",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE Type=oneshot pentru one-time jobs",
    "Persistent=true asigurÄƒ cÄƒ backup-ul ruleazÄƒ È™i dupÄƒ downtime",
    "RandomizedDelaySec previne thundering herd",
    "TimeoutStartSec=3600 pentru backup-uri mari",
    "INCLUDE After=docker.service pentru dependenÈ›Äƒ"
  ],
  "validare_task": "1. cerniq-backup.service creat\n2. cerniq-backup.timer creat\n3. Timer enabled È™i started\n4. systemctl list-timers aratÄƒ next run\n5. Test manual cu: systemctl start cerniq-backup",
  "outcome": "Backup automat configurat via systemd timer la 03:00 zilnic"
}
```

```json
{
  "taskID": "F0.7.1.T004",
  "denumire_task": "Creare script restore È™i testare disaster recovery",
  "context_anterior": "Backup automat configurat. Acum creÄƒm procedura de restore.",
  "descriere_task": "EÈ™ti un expert Ã®n disaster recovery. CreeazÄƒ scripturi de restore È™i testeazÄƒ procedura.\n\n1. CreeazÄƒ `/var/www/CerniqAPP/infra/scripts/restore-postgres.sh`:\n```bash\n#!/bin/bash\n# PostgreSQL Restore Script\nset -euo pipefail\n\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nARCHIVE=${1:-$(borg list $BORG_REPO --last 1 --format '{archive}')}\nRESTORE_DIR=\"/tmp/restore-$(date +%s)\"\n\necho \"=== POSTGRESQL RESTORE ===\"\necho \"Archive: $ARCHIVE\"\nread -p \"This will OVERWRITE the database. Continue? (yes/no): \" confirm\n[[ \"$confirm\" != \"yes\" ]] && exit 1\n\n# 1. Stop dependent services\necho \"[1/5] Stopping services...\"\ncd /var/www/CerniqAPP/infra/docker\ndocker compose stop api workers 2>/dev/null || true\n\n# 2. Extract backup\necho \"[2/5] Extracting backup...\"\nmkdir -p $RESTORE_DIR\ncd $RESTORE_DIR\nborg extract $BORG_REPO::$ARCHIVE var/backups/cerniq/\n\n# 3. Restore database\necho \"[3/5] Restoring database...\"\ndocker exec cerniq-postgres psql -U postgres -c \"DROP DATABASE IF EXISTS cerniq_production;\"\ndocker exec cerniq-postgres psql -U postgres -c \"CREATE DATABASE cerniq_production OWNER cerniq;\"\ncat $RESTORE_DIR/var/backups/cerniq/cerniq_production.dump | docker exec -i cerniq-postgres pg_restore -U cerniq -d cerniq_production\n\n# 4. Verify\necho \"[4/5] Verifying...\"\ndocker exec cerniq-postgres psql -U cerniq -d cerniq_production -c \"SELECT count(*) FROM gold_companies;\" || echo \"Verify manually\"\n\n# 5. Restart services\necho \"[5/5] Restarting services...\"\ndocker compose up -d api workers\n\n# Cleanup\nrm -rf $RESTORE_DIR\n\necho \"=== RESTORE COMPLETE ===\"\n```\n\n2. Test restore procedure (Ã®n environment de test!):\n```bash\n# List available backups\nborg list $BORG_REPO\n\n# Test extract (dry-run)\nborg extract --dry-run $BORG_REPO::latest\n\n# Verify backup integrity\nborg check $BORG_REPO\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "INCLUDE confirmare interactivÄƒ Ã®nainte de restore",
    "STOP dependent services Ã®nainte de restore",
    "FOLOSEÈ˜TE pg_restore pentru format custom, nu psql pentru SQL plain",
    "VERIFICÄ‚ restaurarea cu query de test",
    "CLEANUP fiÈ™iere temporare dupÄƒ restore"
  ],
  "validare_task": "1. Script restore-postgres.sh creat cu permisiuni +x\n2. Include confirmare interactivÄƒ\n3. Stops/starts dependent services\n4. Uses pg_restore correctly\n5. Cleanup temporare dupÄƒ restore",
  "outcome": "ProcedurÄƒ restore funcÈ›ionalÄƒ È™i testatÄƒ"
}
```

---

# FAZA F0.8: SECURITY HARDENING (COMPLET)

## F0.8.1 Security Implementation

```json
{
  "taskID": "F0.8.1.T001",
  "denumire_task": "Implementare Docker secrets pentru toate credenÈ›ialele",
  "context_anterior": "Backup strategy configurat. Acum implementÄƒm security hardening conform ADR-0017.",
  "descriere_task": "EÈ™ti un expert Ã®n Docker secrets È™i security best practices. ImplementeazÄƒ secrets management.\n\n1. CreeazÄƒ directorul secrets:\n```bash\nmkdir -p /var/www/CerniqAPP/secrets\nchmod 700 /var/www/CerniqAPP/secrets\n```\n\n2. GenereazÄƒ toate secretele:\n```bash\n# PostgreSQL password\nopenssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > /var/www/CerniqAPP/secrets/postgres_password\n\n# JWT secret\nopenssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64 > /var/www/CerniqAPP/secrets/jwt_secret\n\n# Cookie secret\nopenssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > /var/www/CerniqAPP/secrets/cookie_secret\n\n# Set permissions\nchmod 600 /var/www/CerniqAPP/secrets/*\n```\n\n3. AdaugÄƒ secrets Ã®n docker-compose.yml:\n```yaml\nsecrets:\n  postgres_password:\n    file: ../../secrets/postgres_password\n  jwt_secret:\n    file: ../../secrets/jwt_secret\n  cookie_secret:\n    file: ../../secrets/cookie_secret\n\nservices:\n  postgres:\n    secrets:\n      - postgres_password\n    environment:\n      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password\n\n  api:\n    secrets:\n      - postgres_password\n      - jwt_secret\n      - cookie_secret\n    environment:\n      DATABASE_PASSWORD_FILE: /run/secrets/postgres_password\n      JWT_SECRET_FILE: /run/secrets/jwt_secret\n      COOKIE_SECRET_FILE: /run/secrets/cookie_secret\n```\n\n4. AdaugÄƒ Ã®n .gitignore:\n```\nsecrets/\n!secrets/.gitkeep\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NICIODATÄ‚ secrete Ã®n environment variables Ã®n production",
    "FOLOSEÈ˜TE _FILE suffix pattern pentru Docker secrets",
    "PERMISIUNI 700 pe director, 600 pe fiÈ™iere",
    "ADAUGÄ‚ secrets/ Ã®n .gitignore",
    "NU stoca secrete Ã®n docker-compose.yml direct"
  ],
  "validare_task": "1. Directorul secrets/ existÄƒ cu permisiuni 700\n2. Toate fiÈ™ierele secret au permisiuni 600\n3. docker-compose.yml foloseÈ™te secrets section\n4. Services folosesc _FILE suffix pentru environment vars\n5. secrets/ este Ã®n .gitignore",
  "outcome": "Docker secrets implementat pentru toate credenÈ›ialele"
}
```

```json
{
  "taskID": "F0.8.1.T002",
  "denumire_task": "Configurare UFW firewall cu ufw-docker",
  "context_anterior": "Docker secrets implementat. Acum configurÄƒm firewall-ul.",
  "descriere_task": "EÈ™ti un expert Ã®n network security È™i Linux firewalls. ConfigureazÄƒ UFW pentru Docker.\n\n1. InstaleazÄƒ UFW È™i ufw-docker:\n```bash\nsudo apt install ufw -y\n\n# Install ufw-docker\nsudo wget -O /usr/local/bin/ufw-docker \\\n  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker\nsudo chmod +x /usr/local/bin/ufw-docker\n\n# Install iptables rules\nsudo ufw-docker install\n```\n\n2. ConfigureazÄƒ reguli de bazÄƒ:\n```bash\n# Reset UFW\nsudo ufw --force reset\n\n# Default policies\nsudo ufw default deny incoming\nsudo ufw default allow outgoing\n\n# Allow SSH (din IP-uri admin)\nsudo ufw allow from YOUR_ADMIN_IP to any port 22 proto tcp comment 'SSH Admin'\n\n# Allow HTTP/HTTPS (pentru Traefik)\nsudo ufw allow 80/tcp comment 'HTTP'\nsudo ufw allow 443/tcp comment 'HTTPS'\nsudo ufw allow 443/udp comment 'HTTP/3 QUIC'\n\n# Enable UFW\nsudo ufw --force enable\n```\n\n3. VerificÄƒ cÄƒ PostgreSQL È™i Redis NU sunt expuse:\n```bash\n# Acestea trebuie sÄƒ returneze gol sau doar 127.0.0.1\nss -tlnp | grep ':5432'\nss -tlnp | grep ':6379'\n```\n\n4. Test extern:\n```bash\n# De pe altÄƒ maÈ™inÄƒ\nnmap -p 5432,6379,9000 YOUR_SERVER_IP\n# Toate trebuie sÄƒ fie filtered/closed\n```",
  "director_implementare": "/",
  "restrictii_antihalucinatie": [
    "INSTALEAZÄ‚ ufw-docker pentru compatibilitate cu Docker",
    "PostgreSQL (5432) È™i Redis (6379) NU trebuie expuse public",
    "SSH doar din IP-uri administrative cunoscute",
    "VERIFICÄ‚ cÄƒ porturile interne NU sunt accesibile extern",
    "FOLOSEÈ˜TE ufw-docker install pentru reguli iptables corecte"
  ],
  "validare_task": "1. UFW È™i ufw-docker instalate\n2. Default deny incoming\n3. Doar 22, 80, 443 permise\n4. PostgreSQL È™i Redis NU sunt accesibile extern\n5. nmap extern confirmÄƒ porturi Ã®nchise",
  "outcome": "Firewall UFW configurat cu Docker compatibility"
}
```

```json
{
  "taskID": "F0.8.1.T003",
  "denumire_task": "Hardening containere Docker (no-new-privileges, cap_drop)",
  "context_anterior": "Firewall configurat. Acum aplicÄƒm container hardening.",
  "descriere_task": "EÈ™ti un expert Ã®n container security. AplicÄƒ hardening pe toate containerele.\n\nActualizeazÄƒ docker-compose.yml cu security options pentru fiecare serviciu:\n\n```yaml\nservices:\n  postgres:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    cap_add:\n      - CHOWN\n      - SETGID\n      - SETUID\n      - DAC_OVERRIDE\n      - FOWNER\n\n  redis:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    user: \"999:999\"\n    read_only: true\n    tmpfs:\n      - /tmp:size=100M\n\n  api:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    user: \"1000:1000\"\n    read_only: true\n    tmpfs:\n      - /tmp:size=500M\n      - /home/node/.npm:size=200M\n\n  traefik:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    cap_add:\n      - NET_BIND_SERVICE\n    read_only: true\n```\n\nPentru fiecare serviciu:\n- `security_opt: no-new-privileges:true` - previne privilege escalation\n- `cap_drop: ALL` - eliminÄƒ toate capabilities\n- `cap_add` - adaugÄƒ doar ce e necesar\n- `read_only: true` - filesystem read-only\n- `tmpfs` - mount pentru fiÈ™iere temporare",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "TOATE containerele TREBUIE no-new-privileges:true",
    "cap_drop: ALL pe toate, apoi cap_add doar ce e necesar",
    "read_only: true cu tmpfs pentru temporare",
    "PostgreSQL are nevoie de capabilities specifice pentru startup",
    "Traefik are nevoie de NET_BIND_SERVICE pentru port 80/443"
  ],
  "validare_task": "1. Toate serviciile au no-new-privileges:true\n2. Toate serviciile au cap_drop: ALL\n3. cap_add conÈ›ine doar capabilities necesare\n4. Services cu read_only au tmpfs pentru /tmp\n5. Containerele pornesc corect cu noile setÄƒri",
  "outcome": "Containere Docker hardened cu minimal privileges"
}
```

```json
{
  "taskID": "F0.8.1.T004",
  "denumire_task": "Configurare TLS/SSL È™i certificate management",
  "context_anterior": "Container hardening aplicat. Acum verificÄƒm TLS configuration.",
  "descriere_task": "EÈ™ti un expert Ã®n TLS/SSL È™i certificate management. VerificÄƒ È™i optimizeazÄƒ configuraÈ›ia.\n\n1. VerificÄƒ configuraÈ›ia Traefik pentru TLS:\n```yaml\n# traefik.yml\ncertificatesResolvers:\n  letsencrypt:\n    acme:\n      email: admin@cerniq.app\n      storage: /etc/traefik/acme/acme.json\n      httpChallenge:\n        entryPoint: web\n\n# dynamic/tls.yml\ntls:\n  options:\n    default:\n      minVersion: VersionTLS12\n      cipherSuites:\n        - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384\n        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384\n        - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256\n        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256\n        - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305\n        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305\n      sniStrict: true\n```\n\n2. VerificÄƒ permisiuni acme.json:\n```bash\nchmod 600 /var/www/CerniqAPP/infra/docker/acme/acme.json\nls -la /var/www/CerniqAPP/infra/docker/acme/\n```\n\n3. Test SSL Labs (dupÄƒ deploy):\n```bash\n# Online: https://www.ssllabs.com/ssltest/analyze.html?d=app.cerniq.app\n# CLI:\ncurl -I https://app.cerniq.app\n# VerificÄƒ headers: Strict-Transport-Security, X-Frame-Options, etc.\n```\n\n4. VerificÄƒ HSTS È™i security headers Ã®n Traefik:\n```yaml\nhttp:\n  middlewares:\n    secure-headers:\n      headers:\n        stsSeconds: 31536000\n        stsIncludeSubdomains: true\n        stsPreload: true\n        forceSTSHeader: true\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/config/traefik",
  "restrictii_antihalucinatie": [
    "TLS minVersion TREBUIE sÄƒ fie TLS12 (TLS11 È™i mai vechi sunt depreciate)",
    "acme.json TREBUIE permisiuni 600",
    "HSTS cu stsSeconds minim 31536000 (1 an)",
    "sniStrict: true pentru a preveni downgrade attacks",
    "INCLUDE doar cipher suites moderne (ECDHE + AES-GCM sau CHACHA20)"
  ],
  "validare_task": "1. TLS minVersion este VersionTLS12\n2. Cipher suites sunt moderne (ECDHE)\n3. acme.json are permisiuni 600\n4. HSTS configurat cu 1 an minimum\n5. SSL Labs score A sau A+",
  "outcome": "TLS/SSL configurat optim cu A+ rating potenÈ›ial"
}
```

# FAZA F0.9: API BOILERPLATE (FASTIFY)

```json
{
  "taskID": "F0.9.1.T001",
  "denumire_task": "Creare entry point Fastify cu plugin system",
  "context_anterior": "Monorepo configurat Ã®n F0.6. Acum creÄƒm structura de bazÄƒ pentru API-ul Fastify.",
  "descriere_task": "EÈ™ti un expert erudit backend cu expertizÄƒ avansatÄƒ Ã®n Fastify È™i TypeScript. Vreau sÄƒ dezvolÈ›i entry point-ul principal pentru API-ul Cerniq.app.\n\nCreeazÄƒ fiÈ™ierul /var/www/CerniqAPP/apps/api/src/index.ts:\n\n```typescript\nimport Fastify from 'fastify';\nimport { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';\nimport closeWithGrace from 'close-with-grace';\nimport { registerPlugins } from './plugins';\nimport { registerRoutes } from './routes';\nimport { logger } from './shared/logger';\n\nconst envToLogger = {\n  development: {\n    transport: {\n      target: 'pino-pretty',\n      options: { colorize: true },\n    },\n  },\n  production: true,\n  test: false,\n};\n\nasync function buildApp() {\n  const app = Fastify({\n    logger: envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,\n    genReqId: () => crypto.randomUUID(),\n  }).withTypeProvider<TypeBoxTypeProvider>();\n\n  // Register plugins (CORS, Helmet, JWT, etc.)\n  await registerPlugins(app);\n\n  // Register routes\n  await registerRoutes(app);\n\n  return app;\n}\n\nasync function start() {\n  const app = await buildApp();\n\n  const host = process.env.HOST ?? '0.0.0.0';\n  const port = parseInt(process.env.PORT ?? '4000', 10);\n\n  await app.listen({ host, port });\n\n  logger.info({ host, port }, 'Server started');\n\n  // Graceful shutdown\n  closeWithGrace({ delay: 30000 }, async ({ signal, err }) => {\n    if (err) {\n      app.log.error({ err }, 'Server closing due to error');\n    } else {\n      app.log.info({ signal }, 'Server closing due to signal');\n    }\n    await app.close();\n  });\n}\n\nstart().catch((err) => {\n  logger.error({ err }, 'Failed to start server');\n  process.exit(1);\n});\n```\n\nAcest entry point:\n- ConfigureazÄƒ Fastify cu TypeBox type provider\n- ÃŽnregistreazÄƒ plugins È™i routes modular\n- ImplementeazÄƒ graceful shutdown\n- FoloseÈ™te pino logger configurat per environment",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src",
  "restrictii_antihalucinatie": [
    "NU folosi Express patterns - Fastify are propria paradigmÄƒ",
    "FOLOSEÈ˜TE TypeBoxTypeProvider pentru type safety",
    "INCLUDE graceful shutdown cu close-with-grace",
    "genReqId TREBUIE sÄƒ genereze UUID pentru request tracing",
    "NU hardcodeazÄƒ port-ul - citeÈ™te din environment"
  ],
  "validare_task": "1. FiÈ™ierul index.ts existÄƒ È™i compileazÄƒ fÄƒrÄƒ erori TypeScript\n2. Fastify este configurat cu TypeBoxTypeProvider\n3. Graceful shutdown este implementat\n4. Logger este configurat per environment\n5. Port È™i host sunt configurabile via environment",
  "outcome": "Entry point Fastify creat cu plugin system È™i graceful shutdown"
}
```

```json
{
  "taskID": "F0.9.1.T002",
  "denumire_task": "Creare plugin system pentru Fastify",
  "context_anterior": "Entry point creat Ã®n F0.9.1.T001 care apeleazÄƒ registerPlugins. Acum creÄƒm sistemul de plugins.",
  "descriere_task": "EÈ™ti un expert Fastify cu experienÈ›Äƒ Ã®n plugin architecture. CreeazÄƒ sistemul de plugins.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/plugins/index.ts:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport cors from '@fastify/cors';\nimport helmet from '@fastify/helmet';\nimport jwt from '@fastify/jwt';\nimport cookie from '@fastify/cookie';\nimport { ZodTypeProvider } from 'fastify-type-provider-zod';\nimport { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';\n\nexport async function registerPlugins(app: FastifyInstance) {\n  // Zod validation\n  app.setValidatorCompiler(validatorCompiler);\n  app.setSerializerCompiler(serializerCompiler);\n\n  // Security\n  await app.register(helmet, {\n    contentSecurityPolicy: {\n      directives: {\n        defaultSrc: [\"'self'\"],\n        styleSrc: [\"'self'\", \"'unsafe-inline'\"],\n        scriptSrc: [\"'self'\"],\n        imgSrc: [\"'self'\", 'data:', 'https:'],\n      },\n    },\n  });\n\n  // CORS\n  await app.register(cors, {\n    origin: [\n      'https://app.cerniq.app',\n      'https://admin.cerniq.app',\n      ...(process.env.NODE_ENV === 'development'\n        ? ['http://localhost:3000', 'http://localhost:5173']\n        : []),\n    ],\n    credentials: true,\n    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],\n  });\n\n  // Cookies\n  await app.register(cookie, {\n    secret: process.env.COOKIE_SECRET,\n    hook: 'onRequest',\n    parseOptions: {},\n  });\n\n  // JWT\n  await app.register(jwt, {\n    secret: process.env.JWT_SECRET!,\n    cookie: {\n      cookieName: 'token',\n      signed: false,\n    },\n    sign: {\n      expiresIn: '15m',\n    },\n  });\n\n  // Custom plugins\n  await app.register(tenantContextPlugin);\n  await app.register(requestLoggingPlugin);\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/plugins",
  "restrictii_antihalucinatie": [
    "INCLUDE Zod validator È™i serializer compilers",
    "CORS origins TREBUIE sÄƒ fie configurabile È™i restrictive",
    "JWT secret NU trebuie hardcodat - citeÈ™te din environment",
    "INCLUDE helmet pentru security headers",
    "ÃŽNREGISTREAZÄ‚ plugins Ã®n ordinea corectÄƒ (security first)"
  ],
  "validare_task": "1. plugins/index.ts existÄƒ È™i exportÄƒ registerPlugins\n2. Zod compilers sunt setate\n3. CORS este configurat cu origins specifice\n4. JWT este configurat cu cookie support\n5. Helmet este configurat cu CSP",
  "outcome": "Sistem de plugins Fastify complet cu security È™i validation"
}
```

```json
{
  "taskID": "F0.9.1.T003",
  "denumire_task": "Creare error handling middleware standardizat",
  "context_anterior": "Plugin system creat. Acum implementÄƒm error handling conform ADR-0010.",
  "descriere_task": "EÈ™ti un expert Ã®n error handling patterns. CreeazÄƒ sistemul de error handling.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/shared/errors.ts:\n\n```typescript\nimport { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';\nimport { ZodError } from 'zod';\n\n// Base error class\nexport class AppError extends Error {\n  constructor(\n    public code: string,\n    message: string,\n    public statusCode: number = 500,\n    public details?: unknown,\n  ) {\n    super(message);\n    this.name = 'AppError';\n    Error.captureStackTrace(this, this.constructor);\n  }\n}\n\n// Specific error classes\nexport class ValidationError extends AppError {\n  constructor(errors: ZodError | unknown) {\n    const details = errors instanceof ZodError ? errors.errors : errors;\n    super('VALIDATION_ERROR', 'Validation failed', 400, details);\n  }\n}\n\nexport class NotFoundError extends AppError {\n  constructor(resource: string, id?: string) {\n    const message = id\n      ? `${resource} with id ${id} not found`\n      : `${resource} not found`;\n    super('NOT_FOUND', message, 404);\n  }\n}\n\nexport class UnauthorizedError extends AppError {\n  constructor(message = 'Unauthorized') {\n    super('UNAUTHORIZED', message, 401);\n  }\n}\n\nexport class ForbiddenError extends AppError {\n  constructor(message = 'Forbidden') {\n    super('FORBIDDEN', message, 403);\n  }\n}\n\nexport class ConflictError extends AppError {\n  constructor(message: string) {\n    super('CONFLICT', message, 409);\n  }\n}\n\n// Error response interface\ninterface ErrorResponse {\n  error: {\n    code: string;\n    message: string;\n    details?: unknown;\n    stack?: string;\n  };\n  requestId: string;\n  timestamp: string;\n}\n\n// Global error handler\nexport function registerErrorHandler(app: FastifyInstance) {\n  app.setErrorHandler(\n    (error: Error | AppError, request: FastifyRequest, reply: FastifyReply) => {\n      const isAppError = error instanceof AppError;\n      const statusCode = isAppError ? error.statusCode : 500;\n      const code = isAppError ? error.code : 'INTERNAL_ERROR';\n\n      // Log error\n      request.log.error({\n        err: error,\n        requestId: request.id,\n        path: request.url,\n        method: request.method,\n      });\n\n      // Build response\n      const response: ErrorResponse = {\n        error: {\n          code,\n          message: error.message,\n          details: isAppError ? error.details : undefined,\n          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),\n        },\n        requestId: request.id,\n        timestamp: new Date().toISOString(),\n      };\n\n      reply.status(statusCode).send(response);\n    },\n  );\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "TOATE erorile custom TREBUIE sÄƒ extindÄƒ AppError",
    "Stack trace se include DOAR Ã®n development",
    "requestId TREBUIE inclus Ã®n response pentru tracing",
    "Error logging TREBUIE sÄƒ includÄƒ context (path, method)",
    "NU expune detalii interne Ã®n production"
  ],
  "validare_task": "1. shared/errors.ts existÄƒ cu toate clasele de erori\n2. AppError este clasa de bazÄƒ\n3. registerErrorHandler seteazÄƒ error handler global\n4. Stack trace e condiÈ›ionat de NODE_ENV\n5. Response include requestId È™i timestamp",
  "outcome": "Sistem de error handling standardizat conform ADR-0010"
}
```

```json
{
  "taskID": "F0.9.1.T004",
  "denumire_task": "Creare request logging cu Pino È™i correlation ID",
  "context_anterior": "Error handling implementat. Acum adÄƒugÄƒm logging standardizat conform ADR-0023.",
  "descriere_task": "EÈ™ti un expert Ã®n observability È™i logging. ImplementeazÄƒ logging cu Pino.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/shared/logger.ts:\n\n```typescript\nimport pino from 'pino';\n\nexport const logger = pino({\n  level: process.env.LOG_LEVEL ?? 'info',\n  redact: {\n    paths: [\n      'req.headers.authorization',\n      'req.headers.cookie',\n      'password',\n      'email',\n      'phone',\n      'cui',\n      '*.password',\n      '*.email',\n      '*.phone',\n    ],\n    remove: true,\n  },\n  formatters: {\n    level: (label) => ({ level: label }),\n  },\n  timestamp: pino.stdTimeFunctions.isoTime,\n  base: {\n    service: 'cerniq-api',\n    version: process.env.APP_VERSION ?? '0.1.0',\n    environment: process.env.NODE_ENV ?? 'development',\n  },\n});\n\n// Create child logger with request context\nexport function createRequestLogger(requestId: string, tenantId?: string) {\n  return logger.child({\n    requestId,\n    tenantId,\n  });\n}\n```\n\nCreeazÄƒ plugin pentru request logging:\n/var/www/CerniqAPP/apps/api/src/plugins/request-logging.ts:\n\n```typescript\nimport { FastifyInstance, FastifyPluginAsync } from 'fastify';\nimport fp from 'fastify-plugin';\n\nconst requestLoggingPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {\n  app.addHook('onRequest', async (request) => {\n    request.log.info({\n      method: request.method,\n      url: request.url,\n      correlationId: request.headers['x-correlation-id'],\n    }, 'Request received');\n  });\n\n  app.addHook('onResponse', async (request, reply) => {\n    request.log.info({\n      method: request.method,\n      url: request.url,\n      statusCode: reply.statusCode,\n      responseTime: reply.elapsedTime,\n    }, 'Request completed');\n  });\n};\n\nexport default fp(requestLoggingPlugin, {\n  name: 'request-logging',\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src",
  "restrictii_antihalucinatie": [
    "PII (email, phone, password) TREBUIE redacted",
    "INCLUDE correlation ID din header X-Correlation-Id",
    "FOLOSEÈ˜TE pino.stdTimeFunctions.isoTime pentru timestamp",
    "base object TREBUIE sÄƒ includÄƒ service, version, environment",
    "LOG response time Ã®n onResponse hook"
  ],
  "validare_task": "1. shared/logger.ts existÄƒ cu configurare Pino\n2. Redaction include email, phone, password, cui\n3. plugins/request-logging.ts Ã®nregistreazÄƒ hooks\n4. onRequest È™i onResponse logging funcÈ›ioneazÄƒ\n5. Correlation ID este logat",
  "outcome": "Logging standardizat cu Pino, PII redaction È™i correlation IDs"
}
```

```json
{
  "taskID": "F0.9.1.T005",
  "denumire_task": "Creare health check endpoints",
  "context_anterior": "Logging implementat. Acum adÄƒugÄƒm health checks conform ADR-0025.",
  "descriere_task": "EÈ™ti un expert Ã®n health check patterns pentru microservicii. ImplementeazÄƒ health endpoints.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/routes/health.ts:\n\n```typescript\nimport { FastifyInstance, FastifyPluginAsync } from 'fastify';\nimport { z } from 'zod';\nimport { sql } from 'drizzle-orm';\nimport { db } from '@cerniq/db';\n\nconst HealthResponseSchema = z.object({\n  status: z.enum(['ok', 'degraded', 'unhealthy']),\n  timestamp: z.string(),\n  version: z.string(),\n  uptime: z.number(),\n});\n\nconst DependencyCheckSchema = z.object({\n  name: z.string(),\n  status: z.enum(['healthy', 'unhealthy']),\n  latency: z.number().optional(),\n  error: z.string().optional(),\n});\n\nconst healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {\n  // Liveness probe - just confirms app is running\n  app.get('/health/live', {\n    schema: {\n      response: { 200: z.object({ status: z.literal('ok') }) },\n    },\n  }, async () => {\n    return { status: 'ok' as const };\n  });\n\n  // Readiness probe - confirms app can serve traffic\n  app.get('/health/ready', {\n    schema: {\n      response: { 200: HealthResponseSchema },\n    },\n  }, async () => {\n    const checks = await Promise.allSettled([\n      checkDatabase(),\n      checkRedis(),\n    ]);\n\n    const allHealthy = checks.every(\n      (c) => c.status === 'fulfilled' && c.value.status === 'healthy'\n    );\n\n    return {\n      status: allHealthy ? 'ok' : 'degraded',\n      timestamp: new Date().toISOString(),\n      version: process.env.APP_VERSION ?? '0.1.0',\n      uptime: process.uptime(),\n    };\n  });\n\n  // Detailed dependency checks\n  app.get('/health/deps', {\n    schema: {\n      response: { 200: z.object({ dependencies: z.array(DependencyCheckSchema) }) },\n    },\n  }, async () => {\n    const [dbCheck, redisCheck] = await Promise.allSettled([\n      checkDatabase(),\n      checkRedis(),\n    ]);\n\n    return {\n      dependencies: [\n        dbCheck.status === 'fulfilled' ? dbCheck.value : { name: 'postgres', status: 'unhealthy', error: 'Check failed' },\n        redisCheck.status === 'fulfilled' ? redisCheck.value : { name: 'redis', status: 'unhealthy', error: 'Check failed' },\n      ],\n    };\n  });\n};\n\nasync function checkDatabase(): Promise<z.infer<typeof DependencyCheckSchema>> {\n  const start = Date.now();\n  try {\n    await db.execute(sql`SELECT 1`);\n    return {\n      name: 'postgres',\n      status: 'healthy',\n      latency: Date.now() - start,\n    };\n  } catch (error) {\n    return {\n      name: 'postgres',\n      status: 'unhealthy',\n      error: error instanceof Error ? error.message : 'Unknown error',\n    };\n  }\n}\n\nasync function checkRedis(): Promise<z.infer<typeof DependencyCheckSchema>> {\n  const start = Date.now();\n  try {\n    // Redis check implementation\n    return {\n      name: 'redis',\n      status: 'healthy',\n      latency: Date.now() - start,\n    };\n  } catch (error) {\n    return {\n      name: 'redis',\n      status: 'unhealthy',\n      error: error instanceof Error ? error.message : 'Unknown error',\n    };\n  }\n}\n\nexport default healthRoutes;\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/routes",
  "restrictii_antihalucinatie": [
    "INCLUDE 3 endpoints: /health/live, /health/ready, /health/deps",
    "Liveness probe NU verificÄƒ dependenÈ›e - doar cÄƒ app-ul ruleazÄƒ",
    "Readiness probe verificÄƒ cÄƒ poate servi trafic",
    "INCLUDE latency Ã®n dependency checks",
    "FOLOSEÈ˜TE Promise.allSettled pentru a nu fail-ui la prima eroare"
  ],
  "validare_task": "1. routes/health.ts existÄƒ cu toate 3 endpoints\n2. /health/live returneazÄƒ doar { status: 'ok' }\n3. /health/ready verificÄƒ database È™i redis\n4. /health/deps returneazÄƒ detalii pentru fiecare dependency\n5. Latency este mÄƒsurat pentru fiecare check",
  "outcome": "Health check endpoints complete conform ADR-0025"
}
```

```json
{
  "taskID": "F0.9.1.T006",
  "denumire_task": "Creare graceful shutdown handler complet",
  "context_anterior": "Health checks implementate. Acum completÄƒm graceful shutdown conform ADR-0026.",
  "descriere_task": "EÈ™ti un expert Ã®n process lifecycle management. CompleteazÄƒ graceful shutdown.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/shared/shutdown.ts:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport { logger } from './logger';\n\nconst SHUTDOWN_TIMEOUT = 30000; // 30 seconds\n\ninterface ShutdownableResource {\n  name: string;\n  close: () => Promise<void>;\n}\n\nconst resources: ShutdownableResource[] = [];\n\nexport function registerShutdownResource(resource: ShutdownableResource) {\n  resources.push(resource);\n  logger.info({ resource: resource.name }, 'Registered shutdown resource');\n}\n\nexport function setupGracefulShutdown(app: FastifyInstance) {\n  let isShuttingDown = false;\n\n  async function shutdown(signal: string) {\n    if (isShuttingDown) {\n      logger.warn('Shutdown already in progress');\n      return;\n    }\n    isShuttingDown = true;\n\n    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');\n\n    // Create timeout for forced exit\n    const forceExitTimeout = setTimeout(() => {\n      logger.error('Shutdown timeout exceeded, forcing exit');\n      process.exit(1);\n    }, SHUTDOWN_TIMEOUT);\n\n    try {\n      // 1. Stop accepting new requests\n      logger.info('Closing HTTP server...');\n      await app.close();\n      logger.info('HTTP server closed');\n\n      // 2. Close all registered resources\n      for (const resource of resources) {\n        try {\n          logger.info({ resource: resource.name }, 'Closing resource...');\n          await resource.close();\n          logger.info({ resource: resource.name }, 'Resource closed');\n        } catch (error) {\n          logger.error({ resource: resource.name, error }, 'Error closing resource');\n        }\n      }\n\n      clearTimeout(forceExitTimeout);\n      logger.info('Graceful shutdown complete');\n      process.exit(0);\n    } catch (error) {\n      logger.error({ error }, 'Error during shutdown');\n      clearTimeout(forceExitTimeout);\n      process.exit(1);\n    }\n  }\n\n  // Register signal handlers\n  process.on('SIGTERM', () => shutdown('SIGTERM'));\n  process.on('SIGINT', () => shutdown('SIGINT'));\n\n  // Handle uncaught errors\n  process.on('uncaughtException', (error) => {\n    logger.fatal({ error }, 'Uncaught exception');\n    shutdown('UNCAUGHT_EXCEPTION');\n  });\n\n  process.on('unhandledRejection', (reason) => {\n    logger.fatal({ reason }, 'Unhandled rejection');\n    shutdown('UNHANDLED_REJECTION');\n  });\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "INCLUDE timeout pentru forced exit (30s)",
    "NU permite shutdown multiplu simultan",
    "ÃŽNCHIDE HTTP server PRIMUL",
    "LOG fiecare pas al shutdown-ului",
    "HANDLE uncaughtException È™i unhandledRejection"
  ],
  "validare_task": "1. shared/shutdown.ts existÄƒ\n2. registerShutdownResource permite Ã®nregistrarea resurselor\n3. SIGTERM È™i SIGINT sunt handled\n4. Timeout de 30s pentru forced exit\n5. uncaughtException È™i unhandledRejection trigger shutdown",
  "outcome": "Graceful shutdown complet cu resource cleanup È™i timeout"
}
```

```json
{
  "taskID": "F0.9.1.T007",
  "denumire_task": "Creare OpenTelemetry instrumentation",
  "context_anterior": "Shutdown implementat. Acum adÄƒugÄƒm OpenTelemetry pentru tracing.",
  "descriere_task": "EÈ™ti un expert OpenTelemetry. ImplementeazÄƒ instrumentation pentru Fastify.\n\nCreeazÄƒ /var/www/CerniqAPP/apps/api/src/shared/telemetry.ts:\n\n```typescript\nimport { NodeSDK } from '@opentelemetry/sdk-node';\nimport { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';\nimport { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';\nimport { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';\nimport { Resource } from '@opentelemetry/resources';\nimport { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';\nimport { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';\n\nconst resource = new Resource({\n  [SEMRESATTRS_SERVICE_NAME]: 'cerniq-api',\n  [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION ?? '0.1.0',\n  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',\n});\n\nconst traceExporter = new OTLPTraceExporter({\n  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4317',\n});\n\nconst metricExporter = new OTLPMetricExporter({\n  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4317',\n});\n\nexport const sdk = new NodeSDK({\n  resource,\n  traceExporter,\n  metricReader: new PeriodicExportingMetricReader({\n    exporter: metricExporter,\n    exportIntervalMillis: 60000,\n  }),\n  instrumentations: [\n    getNodeAutoInstrumentations({\n      '@opentelemetry/instrumentation-http': {\n        ignoreIncomingRequestHook: (request) => {\n          // Ignore health checks\n          return request.url?.startsWith('/health') ?? false;\n        },\n      },\n      '@opentelemetry/instrumentation-fs': {\n        enabled: false, // Too noisy\n      },\n    }),\n  ],\n});\n\nexport function startTelemetry() {\n  sdk.start();\n  console.log('OpenTelemetry SDK started');\n\n  process.on('SIGTERM', async () => {\n    await sdk.shutdown();\n    console.log('OpenTelemetry SDK shut down');\n  });\n}\n```\n\nIMPORTANT: Acest fiÈ™ier trebuie importat PRIMUL Ã®n entry point, Ã®nainte de orice alt import.",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "OpenTelemetry TREBUIE iniÈ›ializat PRIMUL Ã®nainte de orice alt import",
    "EXCLUDE health checks din tracing pentru a nu polua datele",
    "INCLUDE resource attributes conform semantic conventions",
    "EXPORTÄ‚ metricile periodic (60s)",
    "SHUTDOWN SDK la SIGTERM"
  ],
  "validare_task": "1. shared/telemetry.ts existÄƒ\n2. Resource include service name, version, environment\n3. Health checks sunt ignorate\n4. OTLPTraceExporter È™i OTLPMetricExporter sunt configurate\n5. SDK se opreÈ™te la SIGTERM",
  "outcome": "OpenTelemetry instrumentation completÄƒ pentru Fastify"
}
```

```json
{
  "taskID": "F0.9.1.T008",
  "denumire_task": "Test È™i verificare API boilerplate complet",
  "context_anterior": "Toate componentele API create. Acum testÄƒm Ã®ntregul boilerplate.",
  "descriere_task": "EÈ™ti un expert QA. VerificÄƒ cÄƒ API boilerplate-ul funcÈ›ioneazÄƒ corect.\n\nPaÈ™i de verificare:\n\n1. Build API package:\n```bash\ncd /var/www/CerniqAPP\npnpm --filter @cerniq/api build\n```\n\n2. Start Ã®n development mode:\n```bash\npnpm --filter @cerniq/api dev\n```\n\n3. VerificÄƒ health endpoints:\n```bash\ncurl http://localhost:4000/health/live\n# Expected: {\"status\":\"ok\"}\n\ncurl http://localhost:4000/health/ready\n# Expected: {\"status\":\"ok\",\"timestamp\":\"...\",\"version\":\"0.1.0\",\"uptime\":...}\n```\n\n4. VerificÄƒ error handling:\n```bash\ncurl http://localhost:4000/nonexistent\n# Expected: {\"error\":{\"code\":\"NOT_FOUND\",...},\"requestId\":\"...\"}\n```\n\n5. VerificÄƒ logging:\n```bash\n# Check logs contain structured JSON with requestId\n```\n\n6. Test graceful shutdown:\n```bash\n# Send SIGTERM and verify clean shutdown in logs\n```\n\nDocumenteazÄƒ orice probleme gÄƒsite È™i soluÈ›iile Ã®n /var/www/CerniqAPP/docs/api/troubleshooting.md",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "NU ignora erorile de build - rezolvÄƒ-le Ã®nainte de a continua",
    "VERIFICÄ‚ toate health endpoints",
    "VERIFICÄ‚ cÄƒ logs sunt Ã®n format JSON structurat",
    "TEST graceful shutdown funcÈ›ioneazÄƒ",
    "DOCUMENTEAZÄ‚ orice probleme gÄƒsite"
  ],
  "validare_task": "1. Build completeazÄƒ fÄƒrÄƒ erori\n2. Server porneÈ™te pe port 4000\n3. /health/live returneazÄƒ status ok\n4. /health/ready returneazÄƒ status È™i version\n5. Erori returneazÄƒ format standardizat cu requestId\n6. Logs sunt JSON structurat\n7. Graceful shutdown funcÈ›ioneazÄƒ",
  "outcome": "API boilerplate verificat È™i funcÈ›ional complet"
}
```

---


---

# FAZA F0.10: DATABASE SCHEMA FOUNDATION (COMPLET)

## F0.10.1 Drizzle ORM È™i Schema Setup

```json
{
  "taskID": "F0.10.1.T001",
  "denumire_task": "Configurare Drizzle ORM connection È™i client",
  "context_anterior": "API boilerplate È™i infrastructure sunt funcÈ›ionale. Acum configurÄƒm Drizzle ORM conform ADR-0007.",
  "descriere_task": "EÈ™ti un expert Ã®n Drizzle ORM È™i TypeScript. ConfigureazÄƒ connection-ul la PostgreSQL.\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/src/client.ts`:\n\n```typescript\nimport { drizzle } from 'drizzle-orm/node-postgres';\nimport { Pool } from 'pg';\nimport * as schema from './schema';\n\nfunction getConnectionString(): string {\n  // Support Docker secrets pattern\n  if (process.env.DATABASE_URL_FILE) {\n    const fs = require('fs');\n    return fs.readFileSync(process.env.DATABASE_URL_FILE, 'utf8').trim();\n  }\n  \n  if (process.env.DATABASE_URL) {\n    return process.env.DATABASE_URL;\n  }\n  \n  throw new Error('DATABASE_URL or DATABASE_URL_FILE required');\n}\n\nconst pool = new Pool({\n  connectionString: getConnectionString(),\n  max: parseInt(process.env.DATABASE_POOL_MAX ?? '20'),\n  min: parseInt(process.env.DATABASE_POOL_MIN ?? '2'),\n  idleTimeoutMillis: 30000,\n  connectionTimeoutMillis: 5000,\n});\n\nexport const db = drizzle(pool, { \n  schema,\n  logger: process.env.NODE_ENV === 'development',\n});\n\nexport type Database = typeof db;\n\n// Health check helper\nexport async function checkDatabaseConnection(): Promise<boolean> {\n  try {\n    await pool.query('SELECT 1');\n    return true;\n  } catch {\n    return false;\n  }\n}\n\n// Graceful shutdown\nexport async function closeDatabase(): Promise<void> {\n  await pool.end();\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/drizzle.config.ts`:\n\n```typescript\nimport { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './src/schema/index.ts',\n  out: './drizzle',\n  dialect: 'postgresql',\n  dbCredentials: {\n    url: process.env.DATABASE_URL!,\n  },\n  verbose: true,\n  strict: true,\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src",
  "restrictii_antihalucinatie": [
    "SUPORTÄ‚ _FILE pattern pentru Docker secrets",
    "INCLUDE connection pooling cu limite configurabile",
    "LOGGER doar Ã®n development",
    "INCLUDE helper pentru health check",
    "INCLUDE graceful shutdown cu pool.end()"
  ],
  "validare_task": "1. client.ts existÄƒ cu connection pooling\n2. SuportÄƒ DATABASE_URL_FILE pattern\n3. drizzle.config.ts configurat corect\n4. Logger condiÈ›ionat de NODE_ENV\n5. Export checkDatabaseConnection È™i closeDatabase",
  "outcome": "Drizzle ORM client configurat cu pooling È™i secrets support"
}
```

```json
{
  "taskID": "F0.10.1.T002",
  "denumire_task": "Creare schema tenants cu RLS foundation",
  "context_anterior": "Drizzle client configurat. Acum creÄƒm schema pentru multi-tenancy.",
  "descriere_task": "EÈ™ti un expert Ã®n database design È™i multi-tenancy. CreeazÄƒ schema tenants.\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/src/schema/tenants.ts`:\n\n```typescript\nimport {\n  pgTable,\n  uuid,\n  varchar,\n  timestamp,\n  jsonb,\n  index,\n  uniqueIndex,\n} from 'drizzle-orm/pg-core';\nimport { createInsertSchema, createSelectSchema } from 'drizzle-zod';\nimport { z } from 'zod';\n\nexport const tenants = pgTable('tenants', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  name: varchar('name', { length: 255 }).notNull(),\n  slug: varchar('slug', { length: 100 }).notNull(),\n  status: varchar('status', { length: 20 }).notNull().default('active'),\n  settings: jsonb('settings').notNull().default({}),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),\n}, (table) => ({\n  slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),\n  statusIdx: index('tenants_status_idx').on(table.status),\n}));\n\n// Zod schemas for validation\nexport const insertTenantSchema = createInsertSchema(tenants, {\n  name: z.string().min(2).max(255),\n  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),\n  status: z.enum(['active', 'suspended', 'deleted']),\n});\n\nexport const selectTenantSchema = createSelectSchema(tenants);\n\nexport type Tenant = typeof tenants.$inferSelect;\nexport type NewTenant = typeof tenants.$inferInsert;\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/src/schema/users.ts`:\n\n```typescript\nimport {\n  pgTable,\n  uuid,\n  varchar,\n  timestamp,\n  index,\n  uniqueIndex,\n} from 'drizzle-orm/pg-core';\nimport { tenants } from './tenants';\nimport { createInsertSchema, createSelectSchema } from 'drizzle-zod';\nimport { z } from 'zod';\n\nexport const users = pgTable('users', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),\n  email: varchar('email', { length: 255 }).notNull(),\n  passwordHash: varchar('password_hash', { length: 255 }).notNull(),\n  name: varchar('name', { length: 255 }),\n  role: varchar('role', { length: 50 }).notNull().default('user'),\n  status: varchar('status', { length: 20 }).notNull().default('active'),\n  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),\n}, (table) => ({\n  // CRITICAL: Unique per tenant, not global!\n  tenantEmailIdx: uniqueIndex('users_tenant_email_idx').on(table.tenantId, table.email),\n  tenantIdx: index('users_tenant_idx').on(table.tenantId),\n}));\n\nexport const insertUserSchema = createInsertSchema(users, {\n  email: z.string().email(),\n  role: z.enum(['admin', 'manager', 'user', 'viewer']),\n  status: z.enum(['active', 'inactive', 'suspended']),\n});\n\nexport const selectUserSchema = createSelectSchema(users);\n\nexport type User = typeof users.$inferSelect;\nexport type NewUser = typeof users.$inferInsert;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": [
    "UNIQUE constraint pe email TREBUIE sÄƒ includÄƒ tenant_id: (tenant_id, email)",
    "NU global UNIQUE pe email - ar rupe multi-tenancy",
    "FOLOSEÈ˜TE uuid pentru id-uri, nu serial/int",
    "INCLUDE timestamps withTimezone: true",
    "drizzle-zod pentru schema validation"
  ],
  "validare_task": "1. tenants.ts cu schema completÄƒ\n2. users.ts cu UNIQUE(tenant_id, email)\n3. Foreign key cÄƒtre tenants cu onDelete cascade\n4. Zod schemas pentru insert/select\n5. Types exportate corect",
  "outcome": "Schema foundation pentru multi-tenancy cu RLS-ready structure"
}
```

```json
{
  "taskID": "F0.10.1.T003",
  "denumire_task": "Implementare RLS policies Ã®n PostgreSQL",
  "context_anterior": "Schema Drizzle creatÄƒ. Acum implementÄƒm RLS policies.",
  "descriere_task": "EÈ™ti un expert Ã®n PostgreSQL Row Level Security. ImplementeazÄƒ RLS policies.\n\nCreeazÄƒ migration pentru RLS `/var/www/CerniqAPP/packages/db/drizzle/0002_rls_policies.sql`:\n\n```sql\n-- Enable RLS on users table\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n\n-- Policy: users can only see users from same tenant\nCREATE POLICY tenant_isolation_policy ON users\n    FOR ALL\n    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n\n-- Force RLS for table owner too (important!)\nALTER TABLE users FORCE ROW LEVEL SECURITY;\n\n-- Function to set current tenant\nCREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id uuid)\nRETURNS void AS $$\nBEGIN\n    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\n-- Grant execute to app user\nGRANT EXECUTE ON FUNCTION set_current_tenant(uuid) TO cerniq;\n```\n\nCreeazÄƒ helper Ã®n aplicaÈ›ie pentru tenant context:\n`/var/www/CerniqAPP/packages/db/src/tenant-context.ts`:\n\n```typescript\nimport { sql } from 'drizzle-orm';\nimport { db } from './client';\n\nexport async function setTenantContext(tenantId: string): Promise<void> {\n  await db.execute(sql`SELECT set_current_tenant(${tenantId}::uuid)`);\n}\n\nexport async function clearTenantContext(): Promise<void> {\n  await db.execute(sql`RESET app.current_tenant_id`);\n}\n```\n\nCreeazÄƒ Fastify plugin pentru tenant context:\n`/var/www/CerniqAPP/apps/api/src/plugins/tenant-context.ts`:\n\n```typescript\nimport { FastifyPluginAsync } from 'fastify';\nimport fp from 'fastify-plugin';\nimport { setTenantContext, clearTenantContext } from '@cerniq/db';\n\nconst tenantContextPlugin: FastifyPluginAsync = async (app) => {\n  app.addHook('onRequest', async (request) => {\n    const tenantId = request.headers['x-tenant-id'] as string;\n    if (tenantId) {\n      await setTenantContext(tenantId);\n      request.tenantId = tenantId;\n    }\n  });\n\n  app.addHook('onResponse', async () => {\n    await clearTenantContext();\n  });\n};\n\nexport default fp(tenantContextPlugin, {\n  name: 'tenant-context',\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FORCE ROW LEVEL SECURITY pentru a aplica È™i table owner-ului",
    "FOLOSEÈ˜TE current_setting cu true pentru a returna NULL dacÄƒ nu existÄƒ",
    "set_current_tenant TREBUIE sÄƒ fie SECURITY DEFINER",
    "CLEAR tenant context Ã®n onResponse hook",
    "NU stoca tenant_id Ã®n sesiune - seteazÄƒ per-request"
  ],
  "validare_task": "1. RLS enabled pe users table\n2. Policy creatÄƒ cu current_setting\n3. FORCE ROW LEVEL SECURITY aplicat\n4. set_current_tenant function existÄƒ\n5. Fastify plugin seteazÄƒ/curÄƒÈ›Äƒ context per request",
  "outcome": "RLS policies funcÈ›ionale pentru tenant isolation"
}
```

```json
{
  "taskID": "F0.10.1.T004",
  "denumire_task": "Setup migration system cu drizzle-kit",
  "context_anterior": "RLS implementat. Acum configurÄƒm sistemul de migrations.",
  "descriere_task": "EÈ™ti un expert Ã®n database migrations. ConfigureazÄƒ drizzle-kit pentru migrations.\n\n1. ActualizeazÄƒ package.json cu scripts:\n```json\n{\n  \"scripts\": {\n    \"db:generate\": \"drizzle-kit generate\",\n    \"db:migrate\": \"drizzle-kit migrate\",\n    \"db:push\": \"drizzle-kit push\",\n    \"db:studio\": \"drizzle-kit studio\",\n    \"db:check\": \"drizzle-kit check\"\n  }\n}\n```\n\n2. CreeazÄƒ script de migration programaticÄƒ:\n`/var/www/CerniqAPP/packages/db/src/migrate.ts`:\n\n```typescript\nimport { drizzle } from 'drizzle-orm/node-postgres';\nimport { migrate } from 'drizzle-orm/node-postgres/migrator';\nimport { Pool } from 'pg';\n\nasync function runMigrations() {\n  const pool = new Pool({\n    connectionString: process.env.DATABASE_URL,\n  });\n\n  const db = drizzle(pool);\n\n  console.log('Running migrations...');\n  \n  await migrate(db, {\n    migrationsFolder: './drizzle',\n  });\n\n  console.log('Migrations completed!');\n  \n  await pool.end();\n}\n\nrunMigrations().catch((err) => {\n  console.error('Migration failed:', err);\n  process.exit(1);\n});\n```\n\n3. GenereazÄƒ prima migraÈ›ie:\n```bash\ncd /var/www/CerniqAPP/packages/db\npnpm db:generate\n```\n\n4. AplicÄƒ migraÈ›iile:\n```bash\npnpm db:migrate\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE drizzle-kit pentru generare migrations",
    "Migrations folder: ./drizzle (nu migrations/)",
    "INCLUDE script pentru migration programaticÄƒ (CI/CD)",
    "RULEAZÄ‚ db:check Ã®nainte de generate",
    "NU edita manual fiÈ™ierele generate"
  ],
  "validare_task": "1. Scripts Ã®n package.json pentru db:generate/migrate/push/studio\n2. migrate.ts pentru migration programaticÄƒ\n3. Folder drizzle/ cu migrations generate\n4. Migrations ruleazÄƒ fÄƒrÄƒ erori\n5. Schema Ã®n sync cu database",
  "outcome": "Sistem de migrations funcÈ›ional cu drizzle-kit"
}
```

```json
{
  "taskID": "F0.10.1.T005",
  "denumire_task": "Creare seed data pentru development",
  "context_anterior": "Migration system configurat. Acum creÄƒm seed data.",
  "descriere_task": "EÈ™ti un expert Ã®n database seeding. CreeazÄƒ seed data pentru development.\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/src/seed.ts`:\n\n```typescript\nimport { db } from './client';\nimport { tenants, users } from './schema';\nimport { hash } from 'bcryptjs';\n\nasync function seed() {\n  console.log('Seeding database...');\n\n  // Create demo tenant\n  const [demoTenant] = await db\n    .insert(tenants)\n    .values({\n      name: 'Demo Company SRL',\n      slug: 'demo-company',\n      status: 'active',\n      settings: {\n        features: ['enrichment', 'outreach', 'ai-sales'],\n        limits: { contacts: 10000, users: 10 },\n      },\n    })\n    .onConflictDoNothing()\n    .returning();\n\n  if (!demoTenant) {\n    console.log('Demo tenant already exists, skipping...');\n    return;\n  }\n\n  console.log('Created demo tenant:', demoTenant.id);\n\n  // Create admin user\n  const passwordHash = await hash('admin123!', 12);\n  \n  const [adminUser] = await db\n    .insert(users)\n    .values({\n      tenantId: demoTenant.id,\n      email: 'admin@demo.cerniq.app',\n      passwordHash,\n      name: 'Admin User',\n      role: 'admin',\n      status: 'active',\n    })\n    .returning();\n\n  console.log('Created admin user:', adminUser.email);\n\n  // Create test users\n  const testUsers = [\n    { email: 'manager@demo.cerniq.app', name: 'Manager User', role: 'manager' },\n    { email: 'sales@demo.cerniq.app', name: 'Sales Rep', role: 'user' },\n    { email: 'viewer@demo.cerniq.app', name: 'Viewer User', role: 'viewer' },\n  ];\n\n  for (const user of testUsers) {\n    await db.insert(users).values({\n      tenantId: demoTenant.id,\n      email: user.email,\n      passwordHash,\n      name: user.name,\n      role: user.role as 'admin' | 'manager' | 'user' | 'viewer',\n      status: 'active',\n    });\n    console.log('Created user:', user.email);\n  }\n\n  console.log('Seeding completed!');\n}\n\nseed()\n  .catch(console.error)\n  .finally(() => process.exit());\n```\n\nAdaugÄƒ script Ã®n package.json:\n```json\n{\n  \"scripts\": {\n    \"db:seed\": \"tsx src/seed.ts\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE onConflictDoNothing pentru idempotence",
    "HASH passwords cu bcryptjs, cost factor 12",
    "INCLUDE users cu toate rolurile pentru testare",
    "NU include date sensibile reale Ã®n seed",
    "Seed DOAR pentru development, nu production"
  ],
  "validare_task": "1. seed.ts creat cu demo tenant È™i users\n2. Passwords sunt hashed cu bcryptjs\n3. onConflictDoNothing pentru re-run safety\n4. Script db:seed Ã®n package.json\n5. Seed ruleazÄƒ fÄƒrÄƒ erori",
  "outcome": "Seed data pentru development environment"
}
```

```json
{
  "taskID": "F0.10.1.T006",
  "denumire_task": "Verificare È™i testare multi-tenant constraints",
  "context_anterior": "Seed data creat. Acum verificÄƒm cÄƒ multi-tenancy funcÈ›ioneazÄƒ corect.",
  "descriere_task": "EÈ™ti un expert Ã®n testing database constraints. CreeazÄƒ teste pentru multi-tenancy.\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/db/src/__tests__/multi-tenant.test.ts`:\n\n```typescript\nimport { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';\nimport { db } from '../client';\nimport { tenants, users } from '../schema';\nimport { setTenantContext, clearTenantContext } from '../tenant-context';\nimport { eq } from 'drizzle-orm';\n\ndescribe('Multi-tenant isolation', () => {\n  let tenant1Id: string;\n  let tenant2Id: string;\n\n  beforeAll(async () => {\n    // Create two tenants\n    const [t1] = await db.insert(tenants).values({\n      name: 'Test Tenant 1',\n      slug: 'test-tenant-1',\n    }).returning();\n    tenant1Id = t1.id;\n\n    const [t2] = await db.insert(tenants).values({\n      name: 'Test Tenant 2',\n      slug: 'test-tenant-2',\n    }).returning();\n    tenant2Id = t2.id;\n\n    // Create users in both tenants with SAME email\n    await db.insert(users).values([\n      { tenantId: tenant1Id, email: 'user@test.com', passwordHash: 'hash1', name: 'User T1' },\n      { tenantId: tenant2Id, email: 'user@test.com', passwordHash: 'hash2', name: 'User T2' },\n    ]);\n  });\n\n  afterAll(async () => {\n    await db.delete(users).where(eq(users.email, 'user@test.com'));\n    await db.delete(tenants).where(eq(tenants.slug, 'test-tenant-1'));\n    await db.delete(tenants).where(eq(tenants.slug, 'test-tenant-2'));\n  });\n\n  beforeEach(async () => {\n    await clearTenantContext();\n  });\n\n  it('allows same email in different tenants', async () => {\n    // This should NOT throw - same email allowed in different tenants\n    const usersWithSameEmail = await db\n      .select()\n      .from(users)\n      .where(eq(users.email, 'user@test.com'));\n    \n    expect(usersWithSameEmail).toHaveLength(2);\n  });\n\n  it('isolates users by tenant when context is set', async () => {\n    await setTenantContext(tenant1Id);\n    \n    const tenant1Users = await db.select().from(users);\n    \n    expect(tenant1Users.every(u => u.tenantId === tenant1Id)).toBe(true);\n  });\n\n  it('prevents duplicate email within same tenant', async () => {\n    await expect(\n      db.insert(users).values({\n        tenantId: tenant1Id,\n        email: 'user@test.com', // Already exists in tenant1\n        passwordHash: 'hash',\n        name: 'Duplicate',\n      })\n    ).rejects.toThrow();\n  });\n});\n```\n\nRuleazÄƒ testele:\n```bash\ncd /var/www/CerniqAPP/packages/db\npnpm test\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/__tests__",
  "restrictii_antihalucinatie": [
    "TESTEAZÄ‚ cÄƒ same email e permis Ã®n tenants diferiÈ›i",
    "TESTEAZÄ‚ cÄƒ RLS izoleazÄƒ datele per tenant",
    "TESTEAZÄ‚ cÄƒ duplicate email Ã®n SAME tenant e rejectat",
    "CLEANUP date de test Ã®n afterAll",
    "CLEAR tenant context Ã®n beforeEach"
  ],
  "validare_task": "1. Test file creat cu toate scenariile\n2. Testele trec pentru email duplicat cross-tenant\n3. Testele verificÄƒ RLS isolation\n4. Testele verificÄƒ unique constraint within tenant\n5. Cleanup funcÈ›ioneazÄƒ corect",
  "outcome": "Multi-tenant constraints validate È™i testate"
}
```


---

# FAZA F0.11: FRONTEND BOILERPLATE (COMPLET)

## F0.11.1 React 19 È™i Refine Setup

```json
{
  "taskID": "F0.11.1.T001",
  "denumire_task": "Setup React 19 cu Vite È™i SWC",
  "context_anterior": "Backend È™i database sunt funcÈ›ionale. Acum configurÄƒm frontend-ul conform ADR-0012.",
  "descriere_task": "EÈ™ti un expert Ã®n React 19 È™i Vite. ConfigureazÄƒ proiectul frontend.\n\n1. IniÈ›ializeazÄƒ proiectul (dacÄƒ nu existÄƒ):\n```bash\ncd /var/www/CerniqAPP/apps/web\npnpm create vite . --template react-swc-ts\n```\n\n2. ActualizeazÄƒ package.json:\n```json\n{\n  \"name\": \"@cerniq/web\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\",\n    \"lint\": \"eslint . --ext ts,tsx\"\n  },\n  \"dependencies\": {\n    \"react\": \"^19.0.0\",\n    \"react-dom\": \"^19.0.0\",\n    \"@refinedev/core\": \"^5.0.0\",\n    \"@refinedev/react-router\": \"^1.0.0\",\n    \"react-router\": \"^7.0.0\",\n    \"@tanstack/react-query\": \"^5.0.0\"\n  },\n  \"devDependencies\": {\n    \"@types/react\": \"^19.0.0\",\n    \"@types/react-dom\": \"^19.0.0\",\n    \"@vitejs/plugin-react-swc\": \"^3.7.0\",\n    \"typescript\": \"^5.7.0\",\n    \"vite\": \"^6.0.0\"\n  }\n}\n```\n\n3. ConfigureazÄƒ vite.config.ts:\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react-swc';\nimport path from 'path';\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n    },\n  },\n  server: {\n    port: 3000,\n    proxy: {\n      '/api': {\n        target: 'http://localhost:4000',\n        changeOrigin: true,\n      },\n    },\n  },\n  build: {\n    sourcemap: true,\n    rollupOptions: {\n      output: {\n        manualChunks: {\n          vendor: ['react', 'react-dom'],\n          refine: ['@refinedev/core'],\n        },\n      },\n    },\n  },\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE React 19.x, nu 18.x",
    "FOLOSEÈ˜TE @vitejs/plugin-react-swc pentru build rapid",
    "CONFIGUREAZÄ‚ proxy pentru API Ã®n development",
    "INCLUDE path alias @ pentru imports clean",
    "manualChunks pentru vendor code splitting"
  ],
  "validare_task": "1. React 19 instalat\n2. Vite 6 cu SWC plugin\n3. Proxy configurat pentru /api\n4. Path alias @ funcÈ›ioneazÄƒ\n5. pnpm dev porneÈ™te pe port 3000",
  "outcome": "React 19 cu Vite È™i SWC configurat"
}
```

```json
{
  "taskID": "F0.11.1.T002",
  "denumire_task": "Configurare Refine v5 headless",
  "context_anterior": "React 19 cu Vite configurat. Acum adÄƒugÄƒm Refine v5.",
  "descriere_task": "EÈ™ti un expert Ã®n Refine framework. ConfigureazÄƒ Refine v5 Ã®n mod headless.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/src/App.tsx`:\n\n```typescript\nimport { Refine } from '@refinedev/core';\nimport { BrowserRouter, Routes, Route, Outlet } from 'react-router';\nimport { dataProvider } from './providers/data-provider';\nimport { authProvider } from './providers/auth-provider';\nimport { Layout } from './components/Layout';\nimport { LoginPage } from './pages/auth/Login';\nimport { DashboardPage } from './pages/Dashboard';\nimport { CompaniesListPage } from './pages/companies/List';\n\nexport function App() {\n  return (\n    <BrowserRouter>\n      <Refine\n        dataProvider={dataProvider}\n        authProvider={authProvider}\n        resources={[\n          {\n            name: 'companies',\n            list: '/companies',\n            show: '/companies/:id',\n            create: '/companies/create',\n            edit: '/companies/:id/edit',\n            meta: {\n              label: 'Companies',\n              icon: 'building',\n            },\n          },\n          {\n            name: 'contacts',\n            list: '/contacts',\n            show: '/contacts/:id',\n            meta: {\n              label: 'Contacts',\n              icon: 'users',\n            },\n          },\n        ]}\n        options={{\n          syncWithLocation: true,\n          warnWhenUnsavedChanges: true,\n          projectId: 'cerniq-app',\n        }}\n      >\n        <Routes>\n          <Route path=\"/login\" element={<LoginPage />} />\n          <Route element={<Layout><Outlet /></Layout>}>\n            <Route index element={<DashboardPage />} />\n            <Route path=\"/companies\" element={<CompaniesListPage />} />\n          </Route>\n        </Routes>\n      </Refine>\n    </BrowserRouter>\n  );\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/src/providers/data-provider.ts`:\n\n```typescript\nimport { DataProvider } from '@refinedev/core';\n\nconst API_URL = import.meta.env.VITE_API_URL || '/api/v1';\n\nexport const dataProvider: DataProvider = {\n  getList: async ({ resource, pagination, sorters, filters }) => {\n    const response = await fetch(`${API_URL}/${resource}`);\n    const data = await response.json();\n    return {\n      data: data.data,\n      total: data.total,\n    };\n  },\n  \n  getOne: async ({ resource, id }) => {\n    const response = await fetch(`${API_URL}/${resource}/${id}`);\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  create: async ({ resource, variables }) => {\n    const response = await fetch(`${API_URL}/${resource}`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(variables),\n    });\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  update: async ({ resource, id, variables }) => {\n    const response = await fetch(`${API_URL}/${resource}/${id}`, {\n      method: 'PATCH',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(variables),\n    });\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  deleteOne: async ({ resource, id }) => {\n    await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });\n    return { data: { id } };\n  },\n  \n  getApiUrl: () => API_URL,\n};\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE Refine v5 cu TanStack Query v5",
    "MODE headless - fÄƒrÄƒ UI framework (shadcn/custom)",
    "CONFIGUREAZÄ‚ resources pentru companies È™i contacts",
    "syncWithLocation pentru URL-based routing",
    "Data provider cu API_URL configurabil via env"
  ],
  "validare_task": "1. Refine v5 configurat Ã®n App.tsx\n2. Resources definite pentru companies/contacts\n3. Data provider cu toate metodele CRUD\n4. BrowserRouter configurat\n5. syncWithLocation enabled",
  "outcome": "Refine v5 headless configurat cu data provider"
}
```

```json
{
  "taskID": "F0.11.1.T003",
  "denumire_task": "Setup Tailwind CSS v4 cu Oxide Engine",
  "context_anterior": "Refine configurat. Acum adÄƒugÄƒm Tailwind CSS v4 conform ADR-0013.",
  "descriere_task": "EÈ™ti un expert Ã®n Tailwind CSS v4. ConfigureazÄƒ Tailwind cu Oxide engine.\n\n1. InstaleazÄƒ Tailwind v4:\n```bash\ncd /var/www/CerniqAPP/apps/web\npnpm add tailwindcss@^4.0.0 @tailwindcss/vite\n```\n\n2. ActualizeazÄƒ vite.config.ts:\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react-swc';\nimport tailwindcss from '@tailwindcss/vite';\nimport path from 'path';\n\nexport default defineConfig({\n  plugins: [\n    react(),\n    tailwindcss(),\n  ],\n  // ... rest of config\n});\n```\n\n3. CreeazÄƒ `/var/www/CerniqAPP/apps/web/src/styles/globals.css`:\n```css\n@import \"tailwindcss\";\n\n/* Custom CSS variables */\n@theme {\n  --color-primary-50: oklch(97% 0.02 250);\n  --color-primary-100: oklch(94% 0.04 250);\n  --color-primary-500: oklch(55% 0.2 250);\n  --color-primary-600: oklch(48% 0.2 250);\n  --color-primary-700: oklch(40% 0.18 250);\n  \n  --font-sans: 'Inter', system-ui, sans-serif;\n  --font-mono: 'JetBrains Mono', monospace;\n  \n  --radius-lg: 0.75rem;\n  --radius-md: 0.5rem;\n  --radius-sm: 0.25rem;\n}\n\n/* Base styles */\n@layer base {\n  html {\n    @apply antialiased;\n  }\n  \n  body {\n    @apply bg-gray-50 text-gray-900;\n  }\n}\n\n/* Component styles */\n@layer components {\n  .btn {\n    @apply inline-flex items-center justify-center rounded-md px-4 py-2 font-medium transition-colors;\n  }\n  \n  .btn-primary {\n    @apply btn bg-primary-600 text-white hover:bg-primary-700;\n  }\n  \n  .card {\n    @apply rounded-lg border border-gray-200 bg-white p-6 shadow-sm;\n  }\n}\n```\n\n4. Import Ã®n main.tsx:\n```typescript\nimport './styles/globals.css';\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE @tailwindcss/vite plugin pentru v4",
    "CSS-first config cu @theme directive",
    "OKLCH pentru color palette (v4 default)",
    "NU mai este nevoie de tailwind.config.js Ã®n v4",
    "IMPORT cu @import tailwindcss nu @tailwind directives"
  ],
  "validare_task": "1. Tailwind v4 instalat cu @tailwindcss/vite\n2. @theme directive cu custom CSS vars\n3. OKLCH color palette definit\n4. globals.css importat Ã®n main.tsx\n5. Classes aplicate corect Ã®n componente",
  "outcome": "Tailwind CSS v4 cu Oxide engine configurat"
}
```

```json
{
  "taskID": "F0.11.1.T004",
  "denumire_task": "Implementare Auth Provider cu JWT refresh",
  "context_anterior": "Tailwind configurat. Acum implementÄƒm auth provider pentru Refine.",
  "descriere_task": "EÈ™ti un expert Ã®n authentication flows. ImplementeazÄƒ auth provider cu JWT.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/src/providers/auth-provider.ts`:\n\n```typescript\nimport { AuthProvider } from '@refinedev/core';\n\nconst API_URL = import.meta.env.VITE_API_URL || '/api/v1';\n\ninterface AuthResponse {\n  user: {\n    id: string;\n    email: string;\n    name: string;\n    role: string;\n  };\n  accessToken: string;\n}\n\nexport const authProvider: AuthProvider = {\n  login: async ({ email, password }) => {\n    const response = await fetch(`${API_URL}/auth/login`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      credentials: 'include', // Important for cookies\n      body: JSON.stringify({ email, password }),\n    });\n\n    if (!response.ok) {\n      const error = await response.json();\n      return {\n        success: false,\n        error: { message: error.error?.message || 'Login failed' },\n      };\n    }\n\n    const data: AuthResponse = await response.json();\n    \n    // Store access token (short-lived)\n    localStorage.setItem('accessToken', data.accessToken);\n    localStorage.setItem('user', JSON.stringify(data.user));\n\n    return {\n      success: true,\n      redirectTo: '/',\n    };\n  },\n\n  logout: async () => {\n    await fetch(`${API_URL}/auth/logout`, {\n      method: 'POST',\n      credentials: 'include',\n    });\n    \n    localStorage.removeItem('accessToken');\n    localStorage.removeItem('user');\n\n    return {\n      success: true,\n      redirectTo: '/login',\n    };\n  },\n\n  check: async () => {\n    const token = localStorage.getItem('accessToken');\n    \n    if (!token) {\n      return {\n        authenticated: false,\n        redirectTo: '/login',\n      };\n    }\n\n    // Verify token is still valid\n    const response = await fetch(`${API_URL}/auth/me`, {\n      headers: { Authorization: `Bearer ${token}` },\n      credentials: 'include',\n    });\n\n    if (!response.ok) {\n      // Try refresh\n      const refreshed = await tryRefreshToken();\n      if (!refreshed) {\n        return {\n          authenticated: false,\n          redirectTo: '/login',\n        };\n      }\n    }\n\n    return { authenticated: true };\n  },\n\n  getIdentity: async () => {\n    const user = localStorage.getItem('user');\n    if (!user) return null;\n    return JSON.parse(user);\n  },\n\n  getPermissions: async () => {\n    const user = localStorage.getItem('user');\n    if (!user) return null;\n    return JSON.parse(user).role;\n  },\n\n  onError: async (error) => {\n    if (error.status === 401) {\n      const refreshed = await tryRefreshToken();\n      if (!refreshed) {\n        return { logout: true, redirectTo: '/login' };\n      }\n    }\n    return {};\n  },\n};\n\nasync function tryRefreshToken(): Promise<boolean> {\n  try {\n    const response = await fetch(`${API_URL}/auth/refresh`, {\n      method: 'POST',\n      credentials: 'include',\n    });\n\n    if (!response.ok) return false;\n\n    const data = await response.json();\n    localStorage.setItem('accessToken', data.accessToken);\n    return true;\n  } catch {\n    return false;\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src/providers",
  "restrictii_antihalucinatie": [
    "credentials: include pentru HttpOnly cookie support",
    "Access token Ã®n localStorage (short-lived)",
    "Refresh token Ã®n HttpOnly cookie (set by server)",
    "IMPLEMENT onError pentru 401 handling",
    "tryRefreshToken pentru automatic token refresh"
  ],
  "validare_task": "1. AuthProvider implementat complet\n2. login/logout/check/getIdentity/getPermissions funcÈ›ioneazÄƒ\n3. Token refresh implementat\n4. credentials: include Ã®n toate fetch calls\n5. onError handler pentru 401",
  "outcome": "Auth provider complet cu JWT refresh flow"
}
```

```json
{
  "taskID": "F0.11.1.T005",
  "denumire_task": "Creare componente Layout È™i Navigation",
  "context_anterior": "Auth provider implementat. Acum creÄƒm layout-ul aplicaÈ›iei.",
  "descriere_task": "EÈ™ti un expert Ã®n React È™i UI design. CreeazÄƒ layout-ul principal.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/src/components/Layout.tsx`:\n\n```typescript\nimport { ReactNode } from 'react';\nimport { Link, useLocation } from 'react-router';\nimport { useGetIdentity, useLogout } from '@refinedev/core';\n\ninterface LayoutProps {\n  children: ReactNode;\n}\n\nconst navigation = [\n  { name: 'Dashboard', href: '/', icon: 'ðŸ“Š' },\n  { name: 'Companies', href: '/companies', icon: 'ðŸ¢' },\n  { name: 'Contacts', href: '/contacts', icon: 'ðŸ‘¥' },\n  { name: 'Campaigns', href: '/campaigns', icon: 'ðŸ“§' },\n];\n\nexport function Layout({ children }: LayoutProps) {\n  const { pathname } = useLocation();\n  const { data: user } = useGetIdentity();\n  const { mutate: logout } = useLogout();\n\n  return (\n    <div className=\"min-h-screen bg-gray-50\">\n      {/* Sidebar */}\n      <aside className=\"fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200\">\n        <div className=\"flex h-16 items-center px-6 border-b border-gray-200\">\n          <span className=\"text-xl font-bold text-primary-600\">Cerniq</span>\n        </div>\n        \n        <nav className=\"mt-6 px-3\">\n          {navigation.map((item) => (\n            <Link\n              key={item.href}\n              to={item.href}\n              className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors ${\n                pathname === item.href\n                  ? 'bg-primary-50 text-primary-700'\n                  : 'text-gray-600 hover:bg-gray-100'\n              }`}\n            >\n              <span>{item.icon}</span>\n              <span>{item.name}</span>\n            </Link>\n          ))}\n        </nav>\n      </aside>\n\n      {/* Main content */}\n      <div className=\"pl-64\">\n        {/* Header */}\n        <header className=\"h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6\">\n          <h1 className=\"text-lg font-medium\">Welcome back</h1>\n          \n          <div className=\"flex items-center gap-4\">\n            <span className=\"text-sm text-gray-600\">{user?.name}</span>\n            <button\n              onClick={() => logout()}\n              className=\"text-sm text-gray-500 hover:text-gray-700\"\n            >\n              Logout\n            </button>\n          </div>\n        </header>\n\n        {/* Page content */}\n        <main className=\"p-6\">\n          {children}\n        </main>\n      </div>\n    </div>\n  );\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src/components",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE useGetIdentity È™i useLogout din @refinedev/core",
    "RESPONSIVE sidebar (fixed pe desktop)",
    "ACTIVE state pentru navigation links",
    "INCLUDE user info È™i logout Ã®n header",
    "Tailwind classes pentru styling"
  ],
  "validare_task": "1. Layout.tsx creat cu sidebar È™i header\n2. Navigation links funcÈ›ioneazÄƒ\n3. Active state pe current route\n4. User identity afiÈ™atÄƒ\n5. Logout funcÈ›ioneazÄƒ",
  "outcome": "Layout principal cu navigation È™i user controls"
}
```

```json
{
  "taskID": "F0.11.1.T006",
  "denumire_task": "Implementare protected routes",
  "context_anterior": "Layout creat. Acum implementÄƒm protected routes.",
  "descriere_task": "EÈ™ti un expert Ã®n React routing È™i authorization. ImplementeazÄƒ protected routes.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/src/components/ProtectedRoute.tsx`:\n\n```typescript\nimport { ReactNode } from 'react';\nimport { Navigate, useLocation } from 'react-router';\nimport { useIsAuthenticated, usePermissions } from '@refinedev/core';\n\ninterface ProtectedRouteProps {\n  children: ReactNode;\n  allowedRoles?: string[];\n}\n\nexport function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {\n  const location = useLocation();\n  const { data: isAuthenticated, isLoading: authLoading } = useIsAuthenticated();\n  const { data: role, isLoading: roleLoading } = usePermissions();\n\n  // Show loading state\n  if (authLoading || roleLoading) {\n    return (\n      <div className=\"min-h-screen flex items-center justify-center\">\n        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600\" />\n      </div>\n    );\n  }\n\n  // Redirect to login if not authenticated\n  if (!isAuthenticated?.authenticated) {\n    return <Navigate to=\"/login\" state={{ from: location }} replace />;\n  }\n\n  // Check role-based access\n  if (allowedRoles && !allowedRoles.includes(role as string)) {\n    return (\n      <div className=\"min-h-screen flex items-center justify-center\">\n        <div className=\"text-center\">\n          <h1 className=\"text-2xl font-bold text-gray-900\">Access Denied</h1>\n          <p className=\"mt-2 text-gray-600\">\n            You don't have permission to access this page.\n          </p>\n        </div>\n      </div>\n    );\n  }\n\n  return <>{children}</>;\n}\n```\n\nActualizeazÄƒ App.tsx:\n\n```typescript\nimport { ProtectedRoute } from './components/ProtectedRoute';\n\n// ÃŽn Routes:\n<Route\n  element={\n    <ProtectedRoute>\n      <Layout><Outlet /></Layout>\n    </ProtectedRoute>\n  }\n>\n  <Route index element={<DashboardPage />} />\n  <Route path=\"/companies\" element={<CompaniesListPage />} />\n  <Route\n    path=\"/admin\"\n    element={\n      <ProtectedRoute allowedRoles={['admin']}>\n        <AdminPage />\n      </ProtectedRoute>\n    }\n  />\n</Route>\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web/src/components",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE useIsAuthenticated È™i usePermissions din @refinedev/core",
    "INCLUDE loading state pentru async auth check",
    "REDIRECT to login cu location state (pentru redirect back)",
    "SUPPORT role-based access cu allowedRoles prop",
    "Access Denied page pentru unauthorized users"
  ],
  "validare_task": "1. ProtectedRoute component creat\n2. Loading state afiÈ™at corect\n3. Redirect to login pentru unauthenticated\n4. Role-based access funcÈ›ioneazÄƒ\n5. App.tsx actualizat cu ProtectedRoute",
  "outcome": "Protected routes cu role-based access control"
}
```


---

# FAZA F0.12: DEVELOPMENT ENVIRONMENT (COMPLET)

## F0.12.1 Docker Compose Override È™i Dev Tools

```json
{
  "taskID": "F0.12.1.T001",
  "denumire_task": "Creare docker-compose.override.yml pentru development",
  "context_anterior": "Production setup complet. Acum configurÄƒm development environment conform ADR-0030.",
  "descriere_task": "EÈ™ti un expert Ã®n Docker Compose È™i development workflows. CreeazÄƒ override pentru development.\n\nCreeazÄƒ `/var/www/CerniqAPP/infra/docker/docker-compose.override.yml`:\n\n```yaml\n# Development overrides\n# This file is automatically loaded by docker compose\nversion: \"3.9\"\n\nservices:\n  postgres:\n    ports:\n      - \"5432:5432\"  # Expose for local tools (DBeaver, etc.)\n    environment:\n      POSTGRES_PASSWORD: devpassword  # Simple password for dev\n\n  redis:\n    ports:\n      - \"6379:6379\"  # Expose for RedisInsight\n\n  api:\n    build:\n      context: ../../\n      dockerfile: apps/api/Dockerfile.dev\n    volumes:\n      - ../../apps/api/src:/app/apps/api/src:cached\n      - ../../packages:/app/packages:cached\n    environment:\n      NODE_ENV: development\n      LOG_LEVEL: debug\n      DATABASE_URL: postgresql://cerniq:devpassword@postgres:5432/cerniq_dev\n      REDIS_URL: redis://redis:6379/0\n    ports:\n      - \"4000:4000\"\n      - \"9229:9229\"  # Node.js debugger\n    command: pnpm dev\n\n  web:\n    build:\n      context: ../../\n      dockerfile: apps/web/Dockerfile.dev\n    volumes:\n      - ../../apps/web/src:/app/apps/web/src:cached\n      - ../../packages:/app/packages:cached\n    environment:\n      NODE_ENV: development\n      VITE_API_URL: http://localhost:4000/api/v1\n    ports:\n      - \"3000:3000\"\n      - \"24678:24678\"  # Vite HMR\n    command: pnpm dev --host\n\n# Development-only services\n  mailhog:\n    image: mailhog/mailhog:latest\n    ports:\n      - \"1025:1025\"   # SMTP\n      - \"8025:8025\"   # Web UI\n\n  pgadmin:\n    image: dpage/pgadmin4:latest\n    environment:\n      PGADMIN_DEFAULT_EMAIL: admin@cerniq.local\n      PGADMIN_DEFAULT_PASSWORD: admin\n    ports:\n      - \"5050:80\"\n    volumes:\n      - pgadmin_data:/var/lib/pgadmin\n\nvolumes:\n  pgadmin_data:\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/Dockerfile.dev`:\n\n```dockerfile\nFROM node:24-alpine\n\nWORKDIR /app\n\n# Install pnpm\nRUN corepack enable && corepack prepare pnpm@9.15.0 --activate\n\n# Copy package files\nCOPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./\nCOPY apps/api/package.json ./apps/api/\nCOPY packages/*/package.json ./packages/*/\n\n# Install dependencies\nRUN pnpm install --frozen-lockfile\n\n# Copy source (will be overridden by volume mount)\nCOPY . .\n\nEXPOSE 4000 9229\n\nCMD [\"pnpm\", \"--filter\", \"@cerniq/api\", \"dev\"]\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "OVERRIDE file se Ã®ncarcÄƒ automat - nu trebuie specificat",
    "EXPUNE ports pentru dev tools (5432, 6379)",
    "VOLUME mounts pentru hot reload (:cached pentru macOS)",
    "INCLUDE debug port 9229 pentru Node.js inspector",
    "ADAUGÄ‚ dev services: mailhog, pgadmin"
  ],
  "validare_task": "1. docker-compose.override.yml creat\n2. PostgreSQL È™i Redis expuse pe localhost\n3. Volume mounts pentru src directories\n4. Dockerfile.dev cu hot reload support\n5. Mailhog È™i pgAdmin disponibile",
  "outcome": "Development environment cu hot reload È™i dev tools"
}
```

```json
{
  "taskID": "F0.12.1.T002",
  "denumire_task": "Configurare VSCode launch.json pentru debugging",
  "context_anterior": "Docker override creat. Acum configurÄƒm debugging Ã®n VSCode.",
  "descriere_task": "EÈ™ti un expert Ã®n VSCode È™i Node.js debugging. ConfigureazÄƒ launch configurations.\n\nCreeazÄƒ `/var/www/CerniqAPP/.vscode/launch.json`:\n\n```json\n{\n  \"version\": \"0.2.0\",\n  \"configurations\": [\n    {\n      \"name\": \"API: Debug\",\n      \"type\": \"node\",\n      \"request\": \"attach\",\n      \"port\": 9229,\n      \"address\": \"localhost\",\n      \"localRoot\": \"${workspaceFolder}/apps/api\",\n      \"remoteRoot\": \"/app/apps/api\",\n      \"restart\": true,\n      \"sourceMaps\": true,\n      \"skipFiles\": [\n        \"<node_internals>/**\",\n        \"**/node_modules/**\"\n      ]\n    },\n    {\n      \"name\": \"API: Run Local\",\n      \"type\": \"node\",\n      \"request\": \"launch\",\n      \"runtimeExecutable\": \"pnpm\",\n      \"runtimeArgs\": [\"--filter\", \"@cerniq/api\", \"dev\"],\n      \"cwd\": \"${workspaceFolder}\",\n      \"console\": \"integratedTerminal\",\n      \"env\": {\n        \"NODE_ENV\": \"development\",\n        \"DATABASE_URL\": \"postgresql://cerniq:devpassword@localhost:5432/cerniq_dev\"\n      }\n    },\n    {\n      \"name\": \"Web: Debug Chrome\",\n      \"type\": \"chrome\",\n      \"request\": \"launch\",\n      \"url\": \"http://localhost:3000\",\n      \"webRoot\": \"${workspaceFolder}/apps/web/src\",\n      \"sourceMaps\": true\n    },\n    {\n      \"name\": \"Tests: API\",\n      \"type\": \"node\",\n      \"request\": \"launch\",\n      \"runtimeExecutable\": \"pnpm\",\n      \"runtimeArgs\": [\"--filter\", \"@cerniq/api\", \"test\"],\n      \"cwd\": \"${workspaceFolder}\",\n      \"console\": \"integratedTerminal\"\n    }\n  ],\n  \"compounds\": [\n    {\n      \"name\": \"Full Stack\",\n      \"configurations\": [\"API: Debug\", \"Web: Debug Chrome\"]\n    }\n  ]\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/.vscode/settings.json`:\n\n```json\n{\n  \"typescript.tsdk\": \"node_modules/typescript/lib\",\n  \"editor.formatOnSave\": true,\n  \"editor.defaultFormatter\": \"esbenp.prettier-vscode\",\n  \"editor.codeActionsOnSave\": {\n    \"source.fixAll.eslint\": \"explicit\"\n  },\n  \"[typescript]\": {\n    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\"\n  },\n  \"[typescriptreact]\": {\n    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\"\n  },\n  \"files.exclude\": {\n    \"**/node_modules\": true,\n    \"**/.pnpm-store\": true\n  },\n  \"search.exclude\": {\n    \"**/node_modules\": true,\n    \"**/pnpm-lock.yaml\": true\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/.vscode",
  "restrictii_antihalucinatie": [
    "ATTACH mode pentru containerized debugging (port 9229)",
    "localRoot/remoteRoot mapping pentru source maps",
    "INCLUDE compound launch pentru full stack",
    "skipFiles pentru node_internals È™i node_modules",
    "Chrome debugger pentru React development"
  ],
  "validare_task": "1. launch.json cu toate configurations\n2. API debug attach funcÈ›ioneazÄƒ\n3. Chrome debugger pentru web\n4. Compound configuration pentru full stack\n5. settings.json cu format on save",
  "outcome": "VSCode debugging configurat pentru API È™i Web"
}
```

```json
{
  "taskID": "F0.12.1.T003",
  "denumire_task": "Creare .env.example È™i environment template",
  "context_anterior": "VSCode configurat. Acum creÄƒm template pentru environment variables.",
  "descriere_task": "EÈ™ti un expert Ã®n environment configuration. CreeazÄƒ template-uri pentru env files.\n\nCreeazÄƒ `/var/www/CerniqAPP/.env.example`:\n\n```bash\n# ===========================================\n# CERNIQ.APP ENVIRONMENT VARIABLES\n# ===========================================\n# Copy to .env and fill in values\n# NEVER commit .env to git!\n\n# General\nNODE_ENV=development\nAPP_VERSION=0.1.0\nLOG_LEVEL=debug\n\n# API Server\nHOST=0.0.0.0\nPORT=4000\n\n# Database\nDATABASE_URL=postgresql://cerniq:devpassword@localhost:5432/cerniq_dev\nDATABASE_POOL_MIN=2\nDATABASE_POOL_MAX=10\n\n# Redis\nREDIS_URL=redis://localhost:6379/0\n\n# Authentication\nJWT_SECRET=your-development-jwt-secret-min-32-chars\nJWT_ACCESS_EXPIRES=15m\nJWT_REFRESH_EXPIRES=7d\nCOOKIE_SECRET=your-development-cookie-secret\n\n# External APIs (get from providers)\n# ANAF_CLIENT_ID=\n# ANAF_CLIENT_SECRET=\n# TERMENE_API_KEY=\n# HUNTER_API_KEY=\n# TIMELINES_API_KEY=\n# INSTANTLY_API_KEY=\n\n# LLM APIs\n# XAI_API_KEY=\n# OPENAI_API_KEY=\n\n# Observability\nOTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317\nOTEL_SERVICE_NAME=cerniq-api\n\n# Frontend\nVITE_API_URL=http://localhost:4000/api/v1\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/.env.example`:\n\n```bash\n# API-specific overrides (optional)\n# Main config should be in root .env\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/web/.env.example`:\n\n```bash\n# Frontend environment variables\nVITE_API_URL=http://localhost:4000/api/v1\nVITE_APP_TITLE=Cerniq.app\n```\n\nActualizeazÄƒ `.gitignore`:\n\n```gitignore\n# Environment files\n.env\n.env.local\n.env.*.local\n!.env.example\n\n# Secrets\nsecrets/\n!secrets/.gitkeep\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "INCLUDE toate variabilele documentate Ã®n env template",
    "COMENTARII explicative pentru fiecare secÈ›iune",
    "API keys comentate (nu au default values)",
    ".env Ã®n .gitignore, dar NU .env.example",
    "SEPARATE env files pentru api È™i web dacÄƒ necesar"
  ],
  "validare_task": "1. .env.example creat la root\n2. Toate variabilele documentate cu comentarii\n3. .gitignore actualizat sÄƒ excludÄƒ .env\n4. .env.example este tracked Ã®n git\n5. Secrets directory Ã®n .gitignore",
  "outcome": "Environment templates complete È™i documentate"
}
```

```json
{
  "taskID": "F0.12.1.T004",
  "denumire_task": "Creare scripts de development (dev, build, lint)",
  "context_anterior": "Env templates create. Acum adÄƒugÄƒm development scripts.",
  "descriere_task": "EÈ™ti un expert Ã®n monorepo tooling. ConfigureazÄƒ scripts pentru development workflow.\n\nActualizeazÄƒ `/var/www/CerniqAPP/package.json`:\n\n```json\n{\n  \"name\": \"cerniq-app\",\n  \"private\": true,\n  \"packageManager\": \"pnpm@9.15.0\",\n  \"scripts\": {\n    \"dev\": \"turbo run dev\",\n    \"dev:api\": \"pnpm --filter @cerniq/api dev\",\n    \"dev:web\": \"pnpm --filter @cerniq/web dev\",\n    \"build\": \"turbo run build\",\n    \"build:api\": \"pnpm --filter @cerniq/api build\",\n    \"build:web\": \"pnpm --filter @cerniq/web build\",\n    \"lint\": \"turbo run lint\",\n    \"lint:fix\": \"turbo run lint -- --fix\",\n    \"test\": \"turbo run test\",\n    \"test:api\": \"pnpm --filter @cerniq/api test\",\n    \"test:e2e\": \"pnpm --filter @cerniq/web test:e2e\",\n    \"typecheck\": \"turbo run typecheck\",\n    \"clean\": \"turbo run clean && rm -rf node_modules .turbo\",\n    \"db:generate\": \"pnpm --filter @cerniq/db db:generate\",\n    \"db:migrate\": \"pnpm --filter @cerniq/db db:migrate\",\n    \"db:seed\": \"pnpm --filter @cerniq/db db:seed\",\n    \"db:studio\": \"pnpm --filter @cerniq/db db:studio\",\n    \"docker:up\": \"docker compose -f infra/docker/docker-compose.yml up -d\",\n    \"docker:down\": \"docker compose -f infra/docker/docker-compose.yml down\",\n    \"docker:logs\": \"docker compose -f infra/docker/docker-compose.yml logs -f\",\n    \"prepare\": \"husky\"\n  },\n  \"devDependencies\": {\n    \"turbo\": \"^2.4.0\",\n    \"husky\": \"^9.0.0\",\n    \"lint-staged\": \"^15.0.0\"\n  },\n  \"lint-staged\": {\n    \"*.{ts,tsx}\": [\"eslint --fix\", \"prettier --write\"],\n    \"*.{json,md}\": [\"prettier --write\"]\n  }\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/turbo.json`:\n\n```json\n{\n  \"$schema\": \"https://turbo.build/schema.json\",\n  \"globalDependencies\": [\".env\"],\n  \"tasks\": {\n    \"build\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": [\"dist/**\", \".next/**\", \"build/**\"]\n    },\n    \"dev\": {\n      \"cache\": false,\n      \"persistent\": true\n    },\n    \"lint\": {\n      \"dependsOn\": [\"^build\"]\n    },\n    \"test\": {\n      \"dependsOn\": [\"build\"],\n      \"outputs\": [\"coverage/**\"]\n    },\n    \"typecheck\": {\n      \"dependsOn\": [\"^build\"]\n    },\n    \"clean\": {\n      \"cache\": false\n    }\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE turbo pentru task orchestration",
    "INCLUDE filter shortcuts pentru common tasks",\n    "lint-staged pentru pre-commit hooks",
    "husky pentru git hooks",
    "docker:* scripts pentru container management"
  ],
  "validare_task": "1. Root package.json cu toate scripts\n2. turbo.json configurat pentru tasks\n3. pnpm dev porneÈ™te ambele apps\n4. pnpm build compileazÄƒ toate packages\n5. docker:up/down funcÈ›ioneazÄƒ",
  "outcome": "Development scripts complete cu Turbo orchestration"
}
```

```json
{
  "taskID": "F0.12.1.T005",
  "denumire_task": "Setup local HTTPS cu mkcert (opÈ›ional)",
  "context_anterior": "Development scripts create. Acum configurÄƒm HTTPS local pentru testing.",
  "descriere_task": "EÈ™ti un expert Ã®n SSL/TLS È™i development environment. ConfigureazÄƒ HTTPS local.\n\n1. InstaleazÄƒ mkcert:\n```bash\n# Ubuntu\nsudo apt install libnss3-tools\ncurl -JLO \"https://dl.filippo.io/mkcert/latest?for=linux/amd64\"\nchmod +x mkcert-v*-linux-amd64\nsudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert\n\n# Install local CA\nmkcert -install\n```\n\n2. GenereazÄƒ certificate pentru development:\n```bash\nmkdir -p /var/www/CerniqAPP/infra/certs\ncd /var/www/CerniqAPP/infra/certs\nmkcert localhost 127.0.0.1 ::1 \"*.cerniq.local\"\n```\n\n3. ConfigureazÄƒ Vite pentru HTTPS:\n```typescript\n// vite.config.ts\nimport fs from 'fs';\n\nexport default defineConfig({\n  server: {\n    https: process.env.VITE_HTTPS === 'true' ? {\n      key: fs.readFileSync('../infra/certs/localhost+3-key.pem'),\n      cert: fs.readFileSync('../infra/certs/localhost+3.pem'),\n    } : undefined,\n    // ...\n  },\n});\n```\n\n4. ConfigureazÄƒ Node.js pentru HTTPS (opÈ›ional):\n```typescript\n// ÃŽn API, pentru development cu HTTPS\nimport https from 'https';\nimport fs from 'fs';\n\nif (process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true') {\n  const httpsOptions = {\n    key: fs.readFileSync('./infra/certs/localhost+3-key.pem'),\n    cert: fs.readFileSync('./infra/certs/localhost+3.pem'),\n  };\n  // Use with Fastify\n}\n```\n\n5. AdaugÄƒ Ã®n .gitignore:\n```gitignore\n# Local certificates\ninfra/certs/*.pem\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/certs",
  "restrictii_antihalucinatie": [
    "mkcert -install creeazÄƒ local CA trusted de browser",
    "Certificate DOAR pentru development, nu production",
    "ADAUGÄ‚ .pem files Ã®n .gitignore",
    "HTTPS opÈ›ional - nu forÈ›a Ã®n development",
    "Vite È™i Node.js au configurÄƒri separate pentru HTTPS"
  ],
  "validare_task": "1. mkcert instalat È™i CA trusted\n2. Certificate generate pentru localhost\n3. Vite poate porni cu HTTPS (VITE_HTTPS=true)\n4. Certificate Ã®n .gitignore\n5. Browser nu aratÄƒ certificate warnings",
  "outcome": "Local HTTPS configurat pentru development testing"
}
```

---

# FAZA F0.13: TESTING FOUNDATION (COMPLET)

## F0.13.1 Vitest È™i Testing Infrastructure

```json
{
  "taskID": "F0.13.1.T001",
  "denumire_task": "Setup Vitest pentru API testing",
  "context_anterior": "Development environment complet. Acum configurÄƒm testing conform ADR-0029.",
  "descriere_task": "EÈ™ti un expert Ã®n testing È™i Vitest. ConfigureazÄƒ testing infrastructure pentru API.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/vitest.config.ts`:\n\n```typescript\nimport { defineConfig } from 'vitest/config';\nimport path from 'path';\n\nexport default defineConfig({\n  test: {\n    globals: true,\n    environment: 'node',\n    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],\n    exclude: ['**/node_modules/**', '**/e2e/**'],\n    setupFiles: ['./test/setup.ts'],\n    testTimeout: 10000,\n    hookTimeout: 30000,\n    coverage: {\n      provider: 'v8',\n      reporter: ['text', 'json', 'html', 'lcov'],\n      reportsDirectory: './coverage',\n      exclude: [\n        'node_modules/',\n        'test/',\n        '**/*.test.ts',\n        '**/*.spec.ts',\n        '**/types/**',\n        '**/mocks/**',\n        'dist/',\n      ],\n      thresholds: {\n        statements: 80,\n        branches: 75,\n        functions: 80,\n        lines: 80,\n      },\n    },\n    poolOptions: {\n      forks: {\n        singleFork: true, // For database tests\n      },\n    },\n  },\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n      '@test': path.resolve(__dirname, './test'),\n    },\n  },\n});\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/setup.ts`:\n\n```typescript\nimport { beforeAll, afterAll, vi } from 'vitest';\n\n// Set test environment\nprocess.env.NODE_ENV = 'test';\nprocess.env.LOG_LEVEL = 'error'; // Quiet logs in tests\n\n// Mock logger\nvi.mock('@/shared/logger', () => ({\n  logger: {\n    info: vi.fn(),\n    error: vi.fn(),\n    warn: vi.fn(),\n    debug: vi.fn(),\n    child: vi.fn(() => ({\n      info: vi.fn(),\n      error: vi.fn(),\n      warn: vi.fn(),\n      debug: vi.fn(),\n    })),\n  },\n}));\n\n// Global test utilities\nglobal.testUtils = {\n  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),\n};\n\nbeforeAll(() => {\n  console.log('\\nðŸ§ª Starting test suite...');\n});\n\nafterAll(() => {\n  console.log('\\nâœ… Test suite completed');\n});\n```\n\nActualizeazÄƒ `apps/api/package.json`:\n\n```json\n{\n  \"scripts\": {\n    \"test\": \"vitest run\",\n    \"test:watch\": \"vitest\",\n    \"test:coverage\": \"vitest run --coverage\",\n    \"test:ui\": \"vitest --ui\"\n  },\n  \"devDependencies\": {\n    \"vitest\": \"^2.1.0\",\n    \"@vitest/coverage-v8\": \"^2.1.0\",\n    \"@vitest/ui\": \"^2.1.0\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE Vitest 2.x cu coverage-v8",
    "singleFork: true pentru database tests (isolation)",
    "Coverage thresholds: 80% statements/functions/lines",
    "MOCK logger Ã®n setup pentru quiet tests",
    "setupFiles ruleazÄƒ Ã®nainte de fiecare test file"
  ],
  "validare_task": "1. vitest.config.ts creat cu coverage settings\n2. test/setup.ts cu mocks È™i globals\n3. pnpm test ruleazÄƒ fÄƒrÄƒ erori\n4. Coverage report genereazÄƒ Ã®n ./coverage\n5. Thresholds enforced",
  "outcome": "Vitest configurat pentru API testing cu coverage"
}
```

```json
{
  "taskID": "F0.13.1.T002",
  "denumire_task": "Creare testing utilities È™i factories",
  "context_anterior": "Vitest configurat. Acum creÄƒm utilities pentru testing.",
  "descriere_task": "EÈ™ti un expert Ã®n test utilities È™i factories. CreeazÄƒ helper functions.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/factories/index.ts`:\n\n```typescript\nimport { faker } from '@faker-js/faker';\nimport { NewTenant, NewUser, NewCompany } from '@cerniq/db';\n\nexport function createTenantData(overrides?: Partial<NewTenant>): NewTenant {\n  return {\n    name: faker.company.name(),\n    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),\n    status: 'active',\n    settings: {},\n    ...overrides,\n  };\n}\n\nexport function createUserData(tenantId: string, overrides?: Partial<NewUser>): NewUser {\n  return {\n    tenantId,\n    email: faker.internet.email(),\n    passwordHash: '$2b$12$test.hash.for.testing.only',\n    name: faker.person.fullName(),\n    role: 'user',\n    status: 'active',\n    ...overrides,\n  };\n}\n\nexport function createCompanyData(tenantId: string, overrides?: Partial<NewCompany>): NewCompany {\n  const cui = faker.string.numeric({ length: 8 });\n  return {\n    tenantId,\n    cui,\n    name: faker.company.name() + ' SRL',\n    address: faker.location.streetAddress({ useFullAddress: true }),\n    county: faker.helpers.arrayElement(['BucureÈ™ti', 'Cluj', 'TimiÈ™', 'IaÈ™i']),\n    status: 'bronze',\n    ...overrides,\n  };\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/helpers/app.ts`:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport { buildApp } from '@/app';\n\nlet app: FastifyInstance | null = null;\n\nexport async function getTestApp(): Promise<FastifyInstance> {\n  if (!app) {\n    app = await buildApp({\n      logger: false,\n    });\n  }\n  return app;\n}\n\nexport async function closeTestApp(): Promise<void> {\n  if (app) {\n    await app.close();\n    app = null;\n  }\n}\n\nexport async function injectRequest(\n  options: Parameters<FastifyInstance['inject']>[0]\n) {\n  const testApp = await getTestApp();\n  return testApp.inject(options);\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/helpers/auth.ts`:\n\n```typescript\nimport jwt from 'jsonwebtoken';\n\nconst TEST_JWT_SECRET = 'test-jwt-secret-for-testing';\n\nexport function createTestToken(payload: {\n  userId: string;\n  tenantId: string;\n  role?: string;\n}): string {\n  return jwt.sign(\n    {\n      sub: payload.userId,\n      tenantId: payload.tenantId,\n      role: payload.role || 'user',\n    },\n    TEST_JWT_SECRET,\n    { expiresIn: '1h' }\n  );\n}\n\nexport function getAuthHeaders(token: string): Record<string, string> {\n  return {\n    Authorization: `Bearer ${token}`,\n  };\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/test",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE @faker-js/faker pentru date realiste",
    "Factories returneazÄƒ NewX types pentru insert",
    "Test app singleton pentru performance",
    "Test JWT cu secret hardcoded (doar pentru tests)",
    "Helper functions pentru common operations"
  ],
  "validare_task": "1. factories/index.ts cu toate entity factories\n2. helpers/app.ts pentru test app management\n3. helpers/auth.ts pentru JWT testing\n4. Factories genereazÄƒ date realiste\n5. Types sunt corecte pentru insert operations",
  "outcome": "Testing utilities È™i factories complete"
}
```

```json
{
  "taskID": "F0.13.1.T003",
  "denumire_task": "Setup database fixtures pentru integration tests",
  "context_anterior": "Testing utilities create. Acum configurÄƒm database fixtures.",
  "descriere_task": "EÈ™ti un expert Ã®n database testing. ConfigureazÄƒ fixtures È™i test database.\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/fixtures/database.ts`:\n\n```typescript\nimport { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';\nimport { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';\nimport { migrate } from 'drizzle-orm/node-postgres/migrator';\nimport { Pool } from 'pg';\nimport * as schema from '@cerniq/db/schema';\n\nlet container: StartedPostgreSqlContainer | null = null;\nlet pool: Pool | null = null;\nlet db: NodePgDatabase<typeof schema> | null = null;\n\nexport async function setupTestDatabase(): Promise<NodePgDatabase<typeof schema>> {\n  if (db) return db;\n\n  // Start PostgreSQL container\n  container = await new PostgreSqlContainer('postgis/postgis:18-3.5')\n    .withDatabase('cerniq_test')\n    .withUsername('test')\n    .withPassword('test')\n    .withExposedPorts(5432)\n    .start();\n\n  // Create connection pool\n  pool = new Pool({\n    connectionString: container.getConnectionUri(),\n    max: 5,\n  });\n\n  // Initialize Drizzle\n  db = drizzle(pool, { schema });\n\n  // Run migrations\n  await migrate(db, {\n    migrationsFolder: '../../packages/db/drizzle',\n  });\n\n  return db;\n}\n\nexport async function teardownTestDatabase(): Promise<void> {\n  if (pool) {\n    await pool.end();\n    pool = null;\n  }\n  if (container) {\n    await container.stop();\n    container = null;\n  }\n  db = null;\n}\n\nexport async function cleanupTables(): Promise<void> {\n  if (!db) return;\n  \n  // Truncate all tables in reverse dependency order\n  await db.execute(`TRUNCATE TABLE users CASCADE`);\n  await db.execute(`TRUNCATE TABLE tenants CASCADE`);\n}\n\nexport function getTestDb(): NodePgDatabase<typeof schema> {\n  if (!db) throw new Error('Test database not initialized');\n  return db;\n}\n```\n\nCreeazÄƒ `/var/www/CerniqAPP/apps/api/test/integration/setup.ts`:\n\n```typescript\nimport { beforeAll, afterAll, beforeEach } from 'vitest';\nimport { setupTestDatabase, teardownTestDatabase, cleanupTables } from '../fixtures/database';\n\nbeforeAll(async () => {\n  console.log('\\nðŸ˜ Setting up test database...');\n  await setupTestDatabase();\n  console.log('âœ… Test database ready');\n}, 60000); // 60s timeout for container startup\n\nafterAll(async () => {\n  console.log('\\nðŸ§¹ Tearing down test database...');\n  await teardownTestDatabase();\n}, 30000);\n\nbeforeEach(async () => {\n  await cleanupTables();\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/test",
  "restrictii_antihalucinatie": [
    "FOLOSEÈ˜TE @testcontainers/postgresql pentru isolated tests",
    "PostGIS image pentru full compatibility",
    "CLEANUP tables Ã®n beforeEach pentru isolation",
    "60s timeout pentru container startup",
    "Singleton pattern pentru database connection"
  ],
  "validare_task": "1. fixtures/database.ts cu testcontainers setup\n2. integration/setup.ts cu lifecycle hooks\n3. Container porneÈ™te cu PostGIS\n4. Migrations ruleazÄƒ automat\n5. Cleanup funcÈ›ioneazÄƒ Ã®ntre tests",
  "outcome": "Database fixtures pentru integration tests"
}
```

```json
{
  "taskID": "F0.13.1.T004",
  "denumire_task": "Creare contract tests pentru event schemas",
  "context_anterior": "Database fixtures create. Acum adÄƒugÄƒm contract tests.",
  "descriere_task": "EÈ™ti un expert Ã®n contract testing. CreeazÄƒ tests pentru event schemas.\n\nCreeazÄƒ `/var/www/CerniqAPP/packages/shared-types/src/__tests__/events.test.ts`:\n\n```typescript\nimport { describe, it, expect } from 'vitest';\nimport { z } from 'zod';\nimport {\n  CompanyCreatedEventSchema,\n  CompanyEnrichedEventSchema,\n  ContactCreatedEventSchema,\n  OutreachSentEventSchema,\n} from '../events';\n\ndescribe('Event Schema Contracts', () => {\n  describe('CompanyCreatedEvent', () => {\n    const validEvent = {\n      type: 'company.created',\n      timestamp: new Date().toISOString(),\n      tenantId: '123e4567-e89b-12d3-a456-426614174000',\n      payload: {\n        companyId: '123e4567-e89b-12d3-a456-426614174001',\n        cui: '12345678',\n        name: 'Test Company SRL',\n        source: 'manual',\n      },\n    };\n\n    it('accepts valid event', () => {\n      expect(() => CompanyCreatedEventSchema.parse(validEvent)).not.toThrow();\n    });\n\n    it('rejects missing required fields', () => {\n      const invalid = { ...validEvent, payload: { ...validEvent.payload, cui: undefined } };\n      expect(() => CompanyCreatedEventSchema.parse(invalid)).toThrow();\n    });\n\n    it('rejects invalid CUI format', () => {\n      const invalid = { ...validEvent, payload: { ...validEvent.payload, cui: 'invalid' } };\n      expect(() => CompanyCreatedEventSchema.parse(invalid)).toThrow();\n    });\n\n    it('maintains backward compatibility', () => {\n      // Old format should still work\n      const oldFormat = {\n        type: 'company.created',\n        timestamp: new Date().toISOString(),\n        tenantId: '123e4567-e89b-12d3-a456-426614174000',\n        payload: {\n          companyId: '123e4567-e89b-12d3-a456-426614174001',\n          cui: '12345678',\n          name: 'Test Company SRL',\n          source: 'manual',\n        },\n      };\n      expect(() => CompanyCreatedEventSchema.parse(oldFormat)).not.toThrow();\n    });\n  });\n\n  describe('Event Type Discrimination', () => {\n    it('correctly discriminates event types', () => {\n      const companyEvent = CompanyCreatedEventSchema.parse({\n        type: 'company.created',\n        timestamp: new Date().toISOString(),\n        tenantId: '123e4567-e89b-12d3-a456-426614174000',\n        payload: {\n          companyId: '123e4567-e89b-12d3-a456-426614174001',\n          cui: '12345678',\n          name: 'Test',\n          source: 'manual',\n        },\n      });\n\n      expect(companyEvent.type).toBe('company.created');\n    });\n  });\n});\n```\n\nCreeazÄƒ event schemas Ã®n `/var/www/CerniqAPP/packages/shared-types/src/events.ts`:\n\n```typescript\nimport { z } from 'zod';\n\nexport const BaseEventSchema = z.object({\n  timestamp: z.string().datetime(),\n  tenantId: z.string().uuid(),\n  correlationId: z.string().uuid().optional(),\n});\n\nexport const CompanyCreatedEventSchema = BaseEventSchema.extend({\n  type: z.literal('company.created'),\n  payload: z.object({\n    companyId: z.string().uuid(),\n    cui: z.string().regex(/^\\d{2,10}$/),\n    name: z.string().min(1),\n    source: z.enum(['manual', 'import', 'enrichment']),\n  }),\n});\n\nexport const CompanyEnrichedEventSchema = BaseEventSchema.extend({\n  type: z.literal('company.enriched'),\n  payload: z.object({\n    companyId: z.string().uuid(),\n    source: z.enum(['anaf', 'termene', 'hunter', 'manual']),\n    fieldsUpdated: z.array(z.string()),\n  }),\n});\n\nexport type CompanyCreatedEvent = z.infer<typeof CompanyCreatedEventSchema>;\nexport type CompanyEnrichedEvent = z.infer<typeof CompanyEnrichedEventSchema>;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/shared-types/src",
  "restrictii_antihalucinatie": [
    "Contract tests TREBUIE sÄƒ verifice backward compatibility",
    "TESTEAZÄ‚ discriminated unions pentru event types",
    "Zod schemas sunt sursa de adevÄƒr pentru events",
    "INCLUDE validation pentru cÃ¢mpuri required",
    "CUI regex: /^\\d{2,10}$/"
  ],
  "validare_task": "1. events.ts cu Zod schemas pentru toate events\n2. events.test.ts cu contract tests\n3. Tests verificÄƒ required fields\n4. Tests verificÄƒ format validation\n5. Backward compatibility tests incluse",
  "outcome": "Contract tests pentru event schemas (90%+ coverage requirement)"
}
```

```json
{
  "taskID": "F0.13.1.T005",
  "denumire_task": "Setup pgTAP pentru database constraint tests",
  "context_anterior": "Contract tests create. Acum adÄƒugÄƒm pgTAP pentru database tests.",
  "descriere_task": "EÈ™ti un expert Ã®n pgTAP È™i database testing. ConfigureazÄƒ pgTAP tests.\n\n1. AdaugÄƒ pgTAP Ã®n init.sql:\n```sql\n-- ÃŽn PostgreSQL init.sql\nCREATE EXTENSION IF NOT EXISTS pgtap;\n```\n\n2. CreeazÄƒ test file `/var/www/CerniqAPP/packages/db/tests/constraints.sql`:\n\n```sql\n-- Test file for database constraints\n-- Run with: psql -f tests/constraints.sql\n\nBEGIN;\nSELECT plan(12);\n\n-- Test 1: tenants table exists\nSELECT has_table('public', 'tenants', 'tenants table exists');\n\n-- Test 2: tenants has required columns\nSELECT has_column('public', 'tenants', 'id', 'tenants has id column');\nSELECT has_column('public', 'tenants', 'slug', 'tenants has slug column');\nSELECT col_is_unique('public', 'tenants', 'slug', 'slug is unique');\n\n-- Test 3: users table with tenant isolation\nSELECT has_table('public', 'users', 'users table exists');\nSELECT has_column('public', 'users', 'tenant_id', 'users has tenant_id');\nSELECT fk_ok('public', 'users', 'tenant_id', 'public', 'tenants', 'id',\n  'users.tenant_id references tenants.id');\n\n-- Test 4: Unique constraint is per-tenant (not global)\nSELECT has_index('public', 'users', 'users_tenant_email_idx',\n  'users has tenant_email index');\n\n-- Test 5: RLS is enabled\nSELECT row_security_active('public', 'users', 'RLS is active on users');\n\n-- Test 6: Required columns are NOT NULL\nSELECT col_not_null('public', 'users', 'email', 'email cannot be null');\nSELECT col_not_null('public', 'users', 'tenant_id', 'tenant_id cannot be null');\n\n-- Test 7: Check constraints\nSELECT col_has_check('public', 'users', 'status', 'users.status has check constraint');\n\nSELECT * FROM finish();\nROLLBACK;\n```\n\n3. CreeazÄƒ runner script `/var/www/CerniqAPP/packages/db/tests/run-pgtap.sh`:\n\n```bash\n#!/bin/bash\n# Run pgTAP tests\nset -e\n\nDB_URL=${DATABASE_URL:-postgresql://cerniq:devpassword@localhost:5432/cerniq_dev}\n\necho \"Running pgTAP tests...\"\npsql \"$DB_URL\" -f tests/constraints.sql\n\necho \"All tests passed!\"\n```\n\n4. AdaugÄƒ script Ã®n package.json:\n```json\n{\n  \"scripts\": {\n    \"test:db\": \"./tests/run-pgtap.sh\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/tests",
  "restrictii_antihalucinatie": [
    "pgTAP extension TREBUIE instalat Ã®n PostgreSQL",
    "FOLOSEÈ˜TE BEGIN/ROLLBACK pentru test isolation",
    "row_security_active verificÄƒ cÄƒ RLS e enabled",
    "fk_ok verificÄƒ foreign key constraints",
    "col_has_check pentru check constraints"
  ],
  "validare_task": "1. constraints.sql cu toate testele\n2. pgTAP extension instalat\n3. run-pgtap.sh executabil\n4. Toate testele trec\n5. ROLLBACK la final (no side effects)",
  "outcome": "pgTAP tests pentru database constraints (100% coverage pentru migrations)"
}
```


---

## REZUMAT TASKURI ETAPA 0

| FazÄƒ | Nr. Taskuri | Status |
|------|-------------|--------|
| F0.1 InfrastructurÄƒ Docker | 6 | âœ… Definite complet |
| F0.2 PostgreSQL 18.1 | 5 | âœ… Definite complet |
| F0.3 Redis 7.4.7 + BullMQ | 4 | âœ… Definite complet |
| F0.4 Traefik v3.6.6 | 4 | âœ… Definite complet |
| F0.5 Observability SigNoz | 4 | âœ… Definite complet |
| F0.6 PNPM + Monorepo | 8 | âœ… Definite complet |
| F0.7 Backup Strategy | 4 | âœ… Definite complet |
| F0.8 Security Hardening | 4 | âœ… Definite complet |
| F0.9 API Boilerplate | 8 | âœ… Definite complet |
| F0.10 Database Schema | 6 | âœ… Definite complet |
| F0.11 Frontend Boilerplate | 6 | âœ… Definite complet |
| F0.12 Dev Environment | 5 | âœ… Definite complet |
| F0.13 Testing Foundation | 5 | âœ… Definite complet |
| **TOTAL** | **69** | **100% Complet** |

---

## ORDINE DE EXECUÈšIE RECOMANDATÄ‚

### Faza 1: Infrastructure Base (F0.1 - F0.2)
1. Docker Engine installation È™i config
2. Docker networks setup
3. PostgreSQL container cu PostGIS

### Faza 2: Data Layer (F0.3 - F0.5)
4. Redis cu BullMQ
5. Traefik reverse proxy
6. SigNoz observability stack

### Faza 3: Application Foundation (F0.6 - F0.9)
7. PNPM monorepo setup
8. Backup strategy cu BorgBackup
9. Security hardening
10. API boilerplate Fastify

### Faza 4: Database & Auth (F0.10)
11. Drizzle ORM È™i schema
12. RLS policies pentru multi-tenancy
13. Migrations È™i seed data

### Faza 5: Frontend (F0.11)
14. React 19 cu Vite
15. Refine v5 headless
16. Tailwind CSS v4
17. Auth provider cu JWT

### Faza 6: Dev & Testing (F0.12 - F0.13)
18. Development environment
19. Testing infrastructure
20. Contract tests È™i pgTAP

---

## CRITERII DE VALIDARE ETAPA 0

### Must Have (Blocker pentru Etapa 1)
- [ ] Docker Engine 28.x funcÈ›ional
- [ ] PostgreSQL 18.1 + PostGIS healthy
- [ ] Redis 7.4.7 cu maxmemory-policy noeviction
- [ ] Traefik cu HTTPS È™i certificate valid
- [ ] API responds pe /health/ready
- [ ] Frontend Ã®ncarcÄƒ Ã®n browser
- [ ] Multi-tenant RLS funcÈ›ional

### Should Have
- [ ] SigNoz UI accesibil
- [ ] Backup script testat manual
- [ ] 80% coverage pe API tests
- [ ] pgTAP tests pass

### Nice to Have
- [ ] Local HTTPS cu mkcert
- [ ] VSCode debugging configurat
- [ ] Drizzle Studio funcÈ›ional

---

## NEXT: ETAPA 1 - DATA ENRICHMENT

DupÄƒ completarea Etapa 0, continuÄƒ cu:
- Bronze layer schema pentru raw data import
- ANAF API integration worker
- Termene.ro API integration worker
- Hunter.io email discovery worker
- Bronze â†’ Silver enrichment pipeline

---

**Document generat:** 15 Ianuarie 2026  
**Versiune:** 2.0 (Complete)
**SursÄƒ de adevÄƒr:** Master Spec v1.2<