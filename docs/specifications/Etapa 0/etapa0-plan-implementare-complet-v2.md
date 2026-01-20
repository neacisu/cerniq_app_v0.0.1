# CERNIQ.APP — ETAPA 0: PLAN IMPLEMENTARE GRANULAR COMPLET

## Faze, Subfaze și Taskuri pentru Infrastructură MVP

### Versiunea 1.0 | 15 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Plan complet implementare infrastructură cu taskuri JSON pentru AI Agents  
**FORMAT:** F0.x.x.Txxx (Fază.Subfază.Task)

---

## CUPRINS FAZE

| Fază | Denumire | Nr. Taskuri |
| ---- | -------- | ----------- |
| F0.1 | Infrastructură Docker de Bază | 5 |
| F0.2 | PostgreSQL 18.1 Setup | 5 |
| F0.3 | Redis 8.4 și BullMQ Setup | 3 |
| F0.4 | Traefik v3.6.6 Setup | 4 |
| F0.5 | Observability Stack (SigNoz) | 3 |
| F0.6 | PNPM și Monorepo Setup | 8 |
| F0.7 | Backup Strategy | 4 |
| F0.8 | Security Hardening | 4 |
| F0.9 | API Boilerplate (Fastify) | 8 |
| F0.10 | Database Schema Foundation | 6 |
| F0.11 | Frontend Boilerplate (React) | 6 |
| F0.12 | Development Environment | 5 |
| F0.13 | Testing Foundation | 5 |
| F0.14 | Monitoring System Foundation | 3 |
| **TOTAL** | | **69 Taskuri** |

---

## FAZA F0.1: INFRASTRUCTURĂ DOCKER DE BAZĂ

## F0.1.1 Docker Engine Setup

```json
{
  "taskID": "F0.1.1.T001",
  "denumire_task": "Instalare și configurare Docker Engine 29.1.3 pe Ubuntu 24.04",
  "context_anterior": "Server Hetzner bare metal fresh cu Ubuntu 24.04 LTS instalat, fără Docker. Serverul are 20 cores Intel, 128GB RAM, NVMe SSD. Directorul root al proiectului va fi /var/www/CerniqAPP.",
  "descriere_task": "Ești un expert DevOps cu experiență extinsă în containerizare Docker și infrastructură cloud. Task-ul tău este să instalezi Docker Engine 29.1.3 (sau cea mai recentă versiune stabilă) pe Ubuntu 24.04 LTS folosind repository-ul oficial Docker.\n\nPași de urmat:\n1. Elimină orice versiune veche de Docker care ar putea exista pe sistem (docker.io, docker-doc, docker-compose, podman-docker, containerd, runc)\n2. Actualizează package lists: apt update\n3. Instalează prerequisites: apt install ca-certificates curl gnupg\n4. Adaugă GPG key oficial Docker: curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker.gpg\n5. Adaugă repository-ul Docker: echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu noble stable' > /etc/apt/sources.list.d/docker.list\n6. Instalează Docker packages: apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin\n7. Verifică instalarea cu 'docker version' și 'docker compose version'\n8. Activează și pornește serviciul: systemctl enable --now docker\n9. Verifică că Docker funcționează: docker run hello-world",
  "director_implementare": "/root",
  "restrictii_antihalucinatie": [
    "NU folosi snap pentru instalare Docker - folosește EXCLUSIV repository-ul oficial Docker",
    "NU folosi docker.io din repository Ubuntu - este versiune veche",
    "NU sări pașii de verificare a versiunii",
    "VERIFICĂ că versiunea instalată este 28.x sau mai nouă",
    "NU modifica configurația default încă - aceasta se face în taskul următor",
    "ASIGURĂ-TE că docker compose (v2) este instalat, NU docker-compose (v1 deprecated)"
  ],
  "validare_task": "1. Comanda 'docker version' afișează Version: 28.x.x sau mai nou pentru Client și Server\n2. Comanda 'docker compose version' afișează v2.40+ sau mai nou\n3. Comanda 'systemctl status docker' arată 'active (running)'\n4. Comanda 'docker run hello-world' rulează cu succes\n5. Nu există erori în 'journalctl -u docker'",
  "outcome": "Docker Engine 29.1.3 instalat și funcțional cu Docker Compose v2.40+ pe Ubuntu 24.04 LTS"
}
```

```json
{
  "taskID": "F0.1.1.T002",
  "denumire_task": "Configurare daemon.json optimizat pentru server 128GB RAM/20 cores",
  "context_anterior": "Docker Engine 29.1.3 a fost instalat în F0.1.1.T001 cu configurare default. Serverul are 128GB RAM și 20 cores Intel. Acum trebuie optimizat pentru producție.",
  "descriere_task": "Ești un expert Docker specializat în optimizare pentru servere high-memory și multi-core. Task-ul tău este să creezi fișierul /etc/docker/daemon.json cu configurația optimizată pentru serverul Cerniq.\n\nCreează fișierul /etc/docker/daemon.json cu următorul conținut EXACT:\n```json\n{\n  \"storage-driver\": \"overlay2\",\n  \"log-driver\": \"json-file\",\n  \"log-opts\": {\n    \"max-size\": \"50m\",\n    \"max-file\": \"5\"\n  },\n  \"live-restore\": true,\n  \"userland-proxy\": false,\n  \"default-ulimits\": {\n    \"nofile\": {\n      \"Name\": \"nofile\",\n      \"Soft\": 65536,\n      \"Hard\": 65536\n    }\n  },\n  \"default-address-pools\": [\n    {\n      \"base\": \"172.20.0.0/16\",\n      \"size\": 24\n    }\n  ],\n  \"metrics-addr\": \"0.0.0.0:9323\"\n}\n```\n\nDupă creare:\n1. Validează JSON syntax cu 'jq . /etc/docker/daemon.json'\n2. Restartează Docker daemon: systemctl restart docker\n3. Verifică că daemon-ul a pornit cu noua configurație\n4. Verifică configurația activă cu 'docker info'",
  "director_implementare": "/etc/docker",
  "restrictii_antihalucinatie": [
    "NU folosi storage-driver diferit de overlay2 - este cel mai performant pentru Linux",
    "NU seta log max-size mai mare de 50m - previne umplerea discului",
    "NU omite live-restore - permite upgrade Docker fără downtime containers",
    "VERIFICĂ JSON syntax înainte de restart - un JSON invalid va împiedica pornirea Docker",
    "NU modifica userland-proxy la true - false oferă performanță network mai bună",
    "FOLOSEȘTE exact subnet-ul 172.20.0.0/16 pentru consistență cu documentația"
  ],
  "validare_task": "1. Fișierul /etc/docker/daemon.json există și conține configurația exactă\n2. 'jq . /etc/docker/daemon.json' parsează fără erori\n3. 'docker info' afișează:\n   - Storage Driver: overlay2\n   - Live Restore Enabled: true\n   - Default Address Pools: 172.20.0.0/16\n4. 'systemctl status docker' arată active (running) după restart\n5. Metrics endpoint disponibil la http://localhost:9323/metrics",
  "outcome": "daemon.json configurat pentru producție cu toate optimizările pentru 128GB RAM aplicate"
}
```

```json
{
  "taskID": "F0.1.1.T003",
  "denumire_task": "Creare structură directoare complete pentru proiectul CerniqAPP",
  "context_anterior": "Docker Engine configurat în F0.1.1.T002. Nu există încă structura de proiect. Vom urma Vertical Slice Architecture și structura monorepo definită în ADR-0024.",
  "descriere_task": "Ești un expert în structurare monorepo pentru aplicații fullstack enterprise. Task-ul tău este să creezi întreaga structură de directoare pentru proiectul Cerniq.app în /var/www/CerniqAPP conform arhitecturii definite.\n\nCreează următoarea structură EXACTĂ:\n\n```\n/var/www/CerniqAPP/\n├── apps/\n│   ├── api/\n│   │   └── src/\n│   │       ├── features/\n│   │       │   ├── auth/\n│   │       │   ├── companies/\n│   │       │   ├── contacts/\n│   │       │   ├── leads/\n│   │       │   ├── approvals/\n│   │       │   └── invoicing/\n│   │       ├── plugins/\n│   │       ├── middleware/\n│   │       └── shared/\n│   └── web/\n│       └── src/\n│           ├── components/\n│           ├── pages/\n│           ├── providers/\n│           ├── hooks/\n│           └── utils/\n├── packages/\n│   ├── db/\n│   │   ├── drizzle/\n│   │   └── schema/\n│   ├── shared-types/\n│   │   └── src/\n│   └── config/\n│       ├── eslint/\n│       ├── typescript/\n│       └── tailwind/\n├── workers/\n│   ├── enrichment/\n│   ├── outreach/\n│   ├── ai/\n│   └── monitoring/\n├── infra/\n│   ├── docker/\n│   │   └── traefik/\n│   │       └── dynamic/\n│   ├── scripts/\n│   └── config/\n│       ├── postgres/\n│       ├── redis/\n│       └── otel/\n├── docs/\n│   ├── adr/\n│   ├── architecture/\n│   ├── runbooks/\n│   └── api/\n├── tests/\n│   ├── unit/\n│   ├── integration/\n│   └── e2e/\n└── secrets/\n```\n\nDupă creare:\n1. Setează permisiuni: chmod -R 755 /var/www/CerniqAPP\n2. Creează .gitkeep în fiecare director gol pentru git tracking\n3. Verifică structura cu 'tree -L 4 /var/www/CerniqAPP'",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU modifica structura definită - urmează EXACT specificația din ADR-0024",
    "NU crea directoare suplimentare nedocumentate",
    "NU uita directorul docs/adr/ - este CRUCIAL pentru Architecture Decision Records",
    "PĂSTREAZĂ exact naming-ul specificat (lowercase pentru directoare)",
    "NU uita directorul secrets/ - va fi folosit pentru Docker secrets",
    "CREEAZĂ directorul tests/ cu subdirectoarele unit/, integration/, e2e/"
  ],
  "validare_task": "1. 'tree -L 4 /var/www/CerniqAPP' afișează structura completă conform specificației\n2. Toate directoarele au permisiuni 755\n3. Fiecare director gol conține fișierul .gitkeep\n4. Directoarele features/ din apps/api/src/ conțin: auth, companies, contacts, leads, approvals, invoicing\n5. Directorul secrets/ există și are permisiuni corecte",
  "outcome": "Structură completă de directoare creată conform specificației ADR-0024, gata pentru inițializarea proiectului"
}
```

## F0.1.2 Docker Networks Setup

```json
{
  "taskID": "F0.1.2.T001",
  "denumire_task": "Creare rețele Docker pentru segregarea serviciilor",
  "context_anterior": "Structura directoare creată în F0.1.1.T003. Docker configurat cu subnet-ul 172.20.0.0/16. Acum trebuie create cele 3 rețele Docker conform ADR-0015.",
  "descriere_task": "Ești un expert Docker networking cu experiență în securizarea infrastructurii containerizate. Task-ul tău este să creezi cele 3 rețele Docker pentru Cerniq.app care asigură izolarea corectă a serviciilor.\n\nCreează următoarele rețele:\n\n1. **cerniq_public** - Pentru servicii expuse public (Traefik, API gateway):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.20.0.0/24 \\\n  --gateway 172.20.0.1 \\\n  cerniq_public\n```\n\n2. **cerniq_backend** - Pentru comunicare internă API-Workers (INTERN):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.21.0.0/24 \\\n  --gateway 172.21.0.1 \\\n  --internal \\\n  cerniq_backend\n```\n\n3. **cerniq_data** - Pentru PostgreSQL și Redis (STRICT INTERN):\n```bash\ndocker network create \\\n  --driver bridge \\\n  --subnet 172.22.0.0/24 \\\n  --gateway 172.22.0.1 \\\n  --internal \\\n  cerniq_data\n```\n\nDupă creare, documentează rețelele în /var/www/CerniqAPP/docs/architecture/networks.md cu explicații pentru fiecare rețea.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune cerniq_backend sau cerniq_data la internet - flag-ul --internal este OBLIGATORIU",
    "NU folosi subnets care se suprapun - verifică că sunt distincte",
    "NU șterge rețeaua bridge default - este necesară pentru funcționarea Docker",
    "FOLOSEȘTE exact subnet-urile specificate: 172.20.0.0/24, 172.21.0.0/24, 172.22.0.0/24",
    "VERIFICĂ că toate rețelele au fost create cu 'docker network ls' înainte de a continua"
  ],
  "validare_task": "1. 'docker network ls' afișează toate cele 3 rețele: cerniq_public, cerniq_backend, cerniq_data\n2. 'docker network inspect cerniq_backend' arată 'Internal: true'\n3. 'docker network inspect cerniq_data' arată 'Internal: true'\n4. 'docker network inspect cerniq_public' arată 'Internal: false'\n5. Fișierul docs/architecture/networks.md există și conține documentația\n6. Subnet-urile sunt corecte conform inspect",
  "outcome": "3 rețele Docker izolate create conform strategiei de segregare definită în ADR-0015"
}
```

```json
{
  "taskID": "F0.1.2.T002",
  "denumire_task": "Creare docker-compose.yml base cu definițiile rețelelor",
  "context_anterior": "Rețelele Docker create în F0.1.2.T001. Acum trebuie să creăm fișierul docker-compose.yml base care definește rețelele pentru a fi utilizate de servicii.",
  "descriere_task": "Ești un expert Docker Compose cu experiență în orchestrarea serviciilor containerizate. Task-ul tău este să creezi fișierul docker-compose.yml base pentru Cerniq.app.\n\nCreează fișierul /var/www/CerniqAPP/infra/docker/docker-compose.yml cu următorul conținut:\n\n```yaml\n# Cerniq.app - Docker Compose Base Configuration\n# Version: 1.0\n# Last Updated: 2026-01-15\n\nname: cerniq\n\nnetworks:\n  cerniq_public:\n    external: true\n  cerniq_backend:\n    external: true\n  cerniq_data:\n    external: true\n\nvolumes:\n  postgres_data:\n    driver: local\n  redis_data:\n    driver: local\n  traefik_certs:\n    driver: local\n  signoz_data:\n    driver: local\n\n# Services will be defined in subsequent tasks\nservices: {}\n```\n\nExplicație:\n- Rețelele sunt marcate 'external: true' pentru că au fost create manual în taskul anterior\n- Volume-urile sunt definite pentru persistența datelor\n- Serviciile vor fi adăugate în taskurile următoare",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU defini rețelele inline - trebuie să fie 'external: true' pentru a folosi rețelele create manual",
    "NU adăuga servicii încă - acestea vor fi adăugate în fazele următoare",
    "FOLOSEȘTE 'name: cerniq' pentru a defini prefixul containerelor",
    "NU omite volume-urile pentru persistență - sunt esențiale",
    "VALIDEAZĂ sintaxa YAML înainte de a considera taskul complet"
  ],
  "validare_task": "1. Fișierul docker-compose.yml există în /var/www/CerniqAPP/infra/docker/\n2. 'docker compose config' validează fără erori\n3. Rețelele sunt definite ca 'external: true'\n4. Volume-urile postgres_data, redis_data, traefik_certs, signoz_data sunt definite\n5. Fișierul conține header-ul cu versiunea și data actualizării",
  "outcome": "docker-compose.yml base creat cu definițiile rețelelor și volume-urilor, pregătit pentru adăugarea serviciilor"
}
```

---

## FAZA F0.2: POSTGRESQL 18.1 SETUP

## F0.2.1 PostgreSQL Container Setup

```json
{
  "taskID": "F0.2.1.T001",
  "denumire_task": "Adăugare serviciu PostgreSQL 18.1 cu PostGIS în docker-compose.yml",
  "context_anterior": "docker-compose.yml base creat în F0.1.2.T002 cu rețele și volume-uri definite. PostgreSQL va fi database-ul principal pentru Cerniq.app, necesitând extensiile PostGIS și pgvector.",
  "descriere_task": "Ești un expert DBA PostgreSQL cu experiență extinsă în containerizare și configurare pentru producție. Task-ul tău este să adaugi serviciul PostgreSQL în docker-compose.yml.\n\nAdaugă următorul serviciu în secțiunea 'services' din docker-compose.yml:\n\n```yaml\nservices:\n  postgres:\n    image: postgis/postgis:18-3.6\n    container_name: cerniq-postgres\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: cerniq\n      POSTGRES_DB: cerniq_production\n      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password\n      PGDATA: /var/lib/postgresql/data/pgdata\n    secrets:\n      - postgres_password\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n      - ./config/postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro\n      - ./config/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro\n    networks:\n      - cerniq_data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U cerniq -d cerniq_production\"]\n      interval: 30s\n      timeout: 10s\n      retries: 5\n      start_period: 60s\n    deploy:\n      resources:\n        limits:\n          memory: 48G\n          cpus: '8'\n        reservations:\n          memory: 32G\n          cpus: '4'\n    shm_size: 4g\n    command: [\"postgres\", \"-c\", \"config_file=/etc/postgresql/postgresql.conf\"]\n\nsecrets:\n  postgres_password:\n    file: ../../secrets/postgres_password.txt\n```\n\nIMPORTANT: PostgreSQL NU trebuie să aibă port mapping public - comunicarea se face DOAR prin rețeaua internă cerniq_data.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune port 5432 la 0.0.0.0 sau la host - este riscant pentru securitate",
    "NU folosi imagine postgres standard - TREBUIE postgis/postgis pentru PostGIS",
    "NU hardcodează parola - folosește Docker secret cu POSTGRES_PASSWORD_FILE",
    "VERIFICĂ versiunea este 18.x în imaginea postgis/postgis:18-3.6",
    "NU omite shm_size - este necesar pentru shared memory pe sisteme cu mult RAM",
    "FOLOSEȘTE rețeaua cerniq_data (internă) - NU cerniq_public"
  ],
  "validare_task": "1. 'docker compose config' validează fără erori\n2. Serviciul postgres folosește imaginea postgis/postgis:18-3.6\n3. Nu există port mapping pentru 5432 (nu apare '5432:64032' în config)\n4. Secretul postgres_password este configurat\n5. Healthcheck-ul este definit cu pg_isready\n6. Rețeaua este cerniq_data\n7. Resource limits sunt setate (memory: 48G, cpus: 8)",
  "outcome": "Serviciul PostgreSQL 18.1 cu PostGIS adăugat în docker-compose.yml, configurat pentru producție fără expunere publică"
}
```

```json
{
  "taskID": "F0.2.1.T002",
  "denumire_task": "Creare postgresql.conf optimizat pentru 128GB RAM",
  "context_anterior": "Serviciul PostgreSQL definit în F0.2.1.T001 referențiază fișierul postgresql.conf. Serverul are 128GB RAM și 20 cores, NVMe SSD.",
  "descriere_task": "Ești un expert PostgreSQL DBA specializat în tuning pentru servere high-memory. Task-ul tău este să creezi fișierul postgresql.conf cu parametrii optimizați pentru serverul Cerniq.\n\nCreează fișierul /var/www/CerniqAPP/infra/config/postgres/postgresql.conf cu următorul conținut:\n\n```ini\n# PostgreSQL 18.1 Configuration for Cerniq.app\n# Optimized for: 128GB RAM, 20 cores, NVMe SSD\n# Last Updated: 2026-01-15\n\n# Connection Settings\nlisten_addresses = '*'\nmax_connections = 200\nsuperuser_reserved_connections = 3\n\n# Memory Settings (128GB system)\nshared_buffers = 32GB\neffective_cache_size = 96GB\nwork_mem = 256MB\nmaintenance_work_mem = 4GB\nwal_buffers = 64MB\nhuge_pages = try\n\n# PostgreSQL 18 AIO (Asynchronous I/O)\nio_method = io_uring\n\n# Parallelism (20 cores)\nmax_parallel_workers_per_gather = 8\nmax_parallel_workers = 16\nmax_worker_processes = 20\nmax_parallel_maintenance_workers = 4\n\n# SSD Optimization\nrandom_page_cost = 1.1\neffective_io_concurrency = 200\nseq_page_cost = 1.0\n\n# Write-Ahead Log\nwal_level = replica\nwal_compression = zstd\nmax_wal_size = 8GB\nmin_wal_size = 2GB\nwal_keep_size = 2GB\ncheckpoint_timeout = 30min\ncheckpoint_completion_target = 0.9\n\n# Vacuum and Autovacuum\nautovacuum = on\nautovacuum_max_workers = 4\nautovacuum_naptime = 30s\nautovacuum_vacuum_cost_delay = 2ms\n\n# Logging\nlogging_collector = on\nlog_directory = 'pg_log'\nlog_filename = 'postgresql-%Y-%m-%d.log'\nlog_rotation_age = 1d\nlog_rotation_size = 100MB\nlog_min_duration_statement = 1000\nlog_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '\nlog_statement = 'ddl'\n\n# Statistics\ntrack_activities = on\ntrack_counts = on\ntrack_io_timing = on\ntrack_wal_io_timing = on\ntrack_functions = all\n\n# Security\npassword_encryption = scram-sha-256\nssl = off  # SSL handled by Traefik\n\n# pgvector optimization\nmaintenance_work_mem = 8GB  # For HNSW index creation\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU seta shared_buffers mai mare de 32GB pe sistem de 128GB - 25% este optim",
    "NU folosi max_connections peste 200 - folosește PgBouncer pentru connection pooling",
    "NU omite io_method pentru PostgreSQL 18 AIO - oferă performanță semnificativ mai bună",
    "VERIFICĂ sintaxa configurației înainte de a considera taskul complet",
    "NU seta random_page_cost > 1.5 pentru SSD - 1.1 este optim",
    "INCLUDE parametrii pentru logging - sunt esențiali pentru debugging"
  ],
  "validare_task": "1. Fișierul postgresql.conf există în /var/www/CerniqAPP/infra/config/postgres/\n2. shared_buffers = 32GB\n3. effective_cache_size = 96GB\n4. io_method = io_uring (PostgreSQL 18 AIO)\n5. max_parallel_workers_per_gather = 8\n6. max_connections = 200\n7. Fișierul nu conține erori de sintaxă",
  "outcome": "postgresql.conf configurat optimal pentru 128GB RAM cu AIO activat și parametrii pentru pgvector"
}
```

```json
{
  "taskID": "F0.2.1.T003",
  "denumire_task": "Creare script init.sql cu extensii PostgreSQL obligatorii",
  "context_anterior": "postgresql.conf creat în F0.2.1.T002. Acum trebuie să creăm scriptul de inițializare care activează extensiile necesare.",
  "descriere_task": "Ești un expert PostgreSQL cu experiență în configurarea extensiilor pentru aplicații enterprise. Task-ul tău este să creezi scriptul init.sql care se execută la prima pornire a containerului PostgreSQL.\n\nCreează fișierul /var/www/CerniqAPP/infra/config/postgres/init.sql cu următorul conținut:\n\n```sql\n-- Cerniq.app PostgreSQL Initialization Script\n-- Executed on first container start\n-- Last Updated: 2026-01-15\n\n-- Enable required extensions\nCREATE EXTENSION IF NOT EXISTS pgvector;       -- Vector similarity search\nCREATE EXTENSION IF NOT EXISTS postgis;        -- Geospatial functions\nCREATE EXTENSION IF NOT EXISTS postgis_topology;\nCREATE EXTENSION IF NOT EXISTS pg_trgm;        -- Fuzzy text search\nCREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";    -- UUID generation (backup for uuidv7)\n\n-- Verify extensions are loaded\nDO $$\nBEGIN\n    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgvector') THEN\n        RAISE EXCEPTION 'pgvector extension failed to load';\n    END IF;\n    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN\n        RAISE EXCEPTION 'postgis extension failed to load';\n    END IF;\n    RAISE NOTICE 'All required extensions loaded successfully';\nEND\n$$;\n\n-- Create application role with limited privileges\nCREATE ROLE cerniq_app WITH LOGIN PASSWORD 'changeme_via_secret';\nGRANT CONNECT ON DATABASE cerniq_production TO cerniq_app;\n\n-- Create schemas\nCREATE SCHEMA IF NOT EXISTS bronze;\nCREATE SCHEMA IF NOT EXISTS silver;\nCREATE SCHEMA IF NOT EXISTS gold;\nCREATE SCHEMA IF NOT EXISTS approval;\nCREATE SCHEMA IF NOT EXISTS audit;\n\n-- Grant schema usage\nGRANT USAGE ON SCHEMA bronze, silver, gold, approval, audit TO cerniq_app;\nGRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bronze, silver, gold, approval, audit TO cerniq_app;\nALTER DEFAULT PRIVILEGES IN SCHEMA bronze, silver, gold, approval, audit \n    GRANT ALL PRIVILEGES ON TABLES TO cerniq_app;\n\n-- Log completion\nDO $$ BEGIN RAISE NOTICE 'Cerniq.app database initialization complete'; END $$;\n```\n\nNOTĂ: Parola pentru cerniq_app va fi schimbată ulterior prin Docker secrets. Acest script este pentru inițializare.",
  "director_implementare": "/var/www/CerniqAPP/infra/config/postgres",
  "restrictii_antihalucinatie": [
    "NU omite pgvector - este CRITIC pentru AI semantic search",
    "NU omite PostGIS - este CRITIC pentru proximity queries agricole",
    "VERIFICĂ că extensiile există în imagine înainte de CREATE EXTENSION",
    "FOLOSEȘTE IF NOT EXISTS pentru idempotență - scriptul poate fi rerulat",
    "NU lăsa parola hardcodată în producție - este doar pentru inițializare",
    "CREEAZĂ toate schema-urile: bronze, silver, gold, approval, audit"
  ],
  "validare_task": "1. Fișierul init.sql există în directorul config/postgres/\n2. Scriptul conține CREATE EXTENSION pentru: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n3. Schema-urile bronze, silver, gold, approval, audit sunt create\n4. Există verificare că extensiile sunt încărcate (bloc DO)\n5. Role-ul cerniq_app este creat cu GRANT-uri corecte",
  "outcome": "Script init.sql creat pentru activarea automată a tuturor extensiilor PostgreSQL necesare și crearea schema-urilor"
}
```

```json
{
  "taskID": "F0.2.1.T004",
  "denumire_task": "Creare secret pentru parola PostgreSQL",
  "context_anterior": "PostgreSQL configurat să citească parola din Docker secret. Acum trebuie să creăm fișierul secret.",
  "descriere_task": "Ești un expert în securitate DevOps. Task-ul tău este să creezi fișierul secret pentru parola PostgreSQL.\n\n1. Generează o parolă puternică (32 caractere, alfanumerice + simboluri):\n```bash\nopenssl rand -base64 32 | tr -d '/+=' | cut -c1-32 > /var/www/CerniqAPP/secrets/postgres_password.txt\n```\n\n2. Setează permisiuni restrictive:\n```bash\nchmod 600 /var/www/CerniqAPP/secrets/postgres_password.txt\n```\n\n3. Creează și .gitignore pentru directorul secrets:\n```bash\necho '*' > /var/www/CerniqAPP/secrets/.gitignore\necho '!.gitignore' >> /var/www/CerniqAPP/secrets/.gitignore\n```\n\n4. Verifică că parola a fost generată corect:\n```bash\ncat /var/www/CerniqAPP/secrets/postgres_password.txt | wc -c\n# Trebuie să afișeze ~32\n```",
  "director_implementare": "/var/www/CerniqAPP/secrets",
  "restrictii_antihalucinatie": [
    "NU commit fișierul secret în git - .gitignore TREBUIE să existe",
    "NU lăsa permisiuni 644 sau mai permisive - TREBUIE 600",
    "NU folosi parole simple sau predictibile",
    "VERIFICĂ că parola nu conține caractere care ar putea cauza probleme (/, +, =)",
    "NU partaja parola prin canale nesecurizate"
  ],
  "validare_task": "1. Fișierul postgres_password.txt există în /var/www/CerniqAPP/secrets/\n2. Permisiunile sunt 600: 'stat -c %a secrets/postgres_password.txt' returnează 600\n3. Parola are ~32 caractere\n4. .gitignore există în directorul secrets și conține '*'\n5. 'git status' NU arată fișierele din secrets/ ca untracked",
  "outcome": "Secret PostgreSQL creat securizat cu permisiuni corecte și protecție git"
}
```

```json
{
  "taskID": "F0.2.1.T005",
  "denumire_task": "Pornire și verificare PostgreSQL container",
  "context_anterior": "Toate configurațiile PostgreSQL sunt pregătite: docker-compose.yml, postgresql.conf, init.sql, secret. Acum trebuie să pornim containerul și să verificăm funcționarea.",
  "descriere_task": "Ești un expert DevOps cu experiență în troubleshooting containere. Task-ul tău este să pornești și să verifici containerul PostgreSQL.\n\nPași de urmat:\n\n1. Navighează la directorul docker:\n```bash\ncd /var/www/CerniqAPP/infra/docker\n```\n\n2. Pornește doar serviciul postgres:\n```bash\ndocker compose up -d postgres\n```\n\n3. Verifică logs pentru erori:\n```bash\ndocker compose logs -f postgres\n# Așteaptă până vezi 'database system is ready to accept connections'\n```\n\n4. Verifică healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-postgres\n# Trebuie să afișeze 'healthy' după ~60 secunde\n```\n\n5. Conectează-te și verifică extensiile:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c '\\dx'\n# Trebuie să afișeze: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n```\n\n6. Verifică schema-urile:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c '\\dn'\n# Trebuie să afișeze: bronze, silver, gold, approval, audit\n```\n\n7. Verifică versiunea PostgreSQL:\n```bash\ndocker exec -it cerniq-postgres psql -U cerniq -d cerniq_production -c 'SELECT version();'\n# Trebuie să afișeze PostgreSQL 18.x\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU continua dacă containerul nu pornește - verifică logs pentru erori",
    "NU ignora healthcheck - TREBUIE să fie 'healthy' înainte de a continua",
    "AȘTEAPTĂ suficient pentru start_period (60s) înainte de a verifica health",
    "NU modifica configurația dacă funcționează - documentează orice modificări",
    "VERIFICĂ toate extensiile sunt încărcate - pgvector și postgis sunt CRITICE"
  ],
  "validare_task": "1. 'docker ps' arată containerul cerniq-postgres running\n2. 'docker inspect' arată Health Status: healthy\n3. '\\dx' afișează toate 5 extensiile: pgvector, postgis, postgis_topology, pg_trgm, uuid-ossp\n4. '\\dn' afișează toate 5 schema-urile: bronze, silver, gold, approval, audit\n5. SELECT version() confirmă PostgreSQL 18.x\n6. Logs nu conțin erori critice",
  "outcome": "PostgreSQL 18.1 cu PostGIS rulează corect în Docker cu toate extensiile și schema-urile create"
}
```

---

## FAZA F0.3: REDIS 8.4 ȘI BULLMQ SETUP

```json
{
  "taskID": "F0.3.1.T001",
  "denumire_task": "Adăugare serviciu Redis 8.4 optimizat pentru BullMQ în docker-compose.yml",
  "context_anterior": "PostgreSQL funcțional din F0.2. Acum adăugăm Redis pentru BullMQ job queuing. CRITIC: maxmemory-policy TREBUIE să fie noeviction pentru BullMQ.",
  "descriere_task": "Ești un expert Redis specializat în job queues și BullMQ. Task-ul tău este să adaugi serviciul Redis în docker-compose.yml.\n\nAdaugă următorul serviciu în docker-compose.yml:\n\n```yaml\n  redis:\n    image: redis:8.4-alpine\n    container_name: cerniq-redis\n    restart: unless-stopped\n    command:\n      - redis-server\n      - --maxmemory 8gb\n      - --maxmemory-policy noeviction\n      - --appendonly yes\n      - --appendfsync everysec\n      - --aof-use-rdb-preamble yes\n      - --notify-keyspace-events Ex\n      - --lazyfree-lazy-eviction yes\n      - --lazyfree-lazy-expire yes\n      - --activedefrag yes\n      - --tcp-keepalive 300\n    volumes:\n      - redis_data:/data\n    networks:\n      - cerniq_data\n      - cerniq_backend\n    healthcheck:\n      test: [\"CMD\", \"redis-cli\", \"ping\"]\n      interval: 10s\n      timeout: 5s\n      retries: 5\n      start_period: 30s\n    deploy:\n      resources:\n        limits:\n          memory: 12G\n          cpus: '2'\n        reservations:\n          memory: 8G\n          cpus: '1'\n```\n\nIMPORTANT: Redis este pe AMBELE rețele - cerniq_data (pentru persistență) și cerniq_backend (pentru workers).",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "maxmemory-policy TREBUIE să fie noeviction - BullMQ jobs NU POT fi evicted, altfel se pierd",
    "NU expune port 6379 public - comunicarea este doar internă",
    "NU dezactiva persistența AOF - este esențială pentru durabilitate jobs",
    "INCLUDE notify-keyspace-events Ex - necesar pentru delayed jobs BullMQ",
    "FOLOSEȘTE ambele rețele: cerniq_data și cerniq_backend",
    "VERIFICĂ că appendonly este yes pentru persistență"
  ],
  "validare_task": "1. 'docker compose config' validează fără erori\n2. Redis folosește imaginea redis:8.4-alpine\n3. maxmemory-policy este noeviction (verifică în command)\n4. appendonly este yes\n5. notify-keyspace-events este Ex\n6. Redis este pe ambele rețele: cerniq_data și cerniq_backend\n7. Nu există port mapping public pentru 6379",
  "outcome": "Redis 8.4 configurat optim pentru BullMQ job queues cu persistență AOF și maxmemory-policy noeviction"
}
```

```json
{
  "taskID": "F0.3.1.T002",
  "denumire_task": "Pornire și verificare Redis container",
  "context_anterior": "Redis adăugat în docker-compose.yml în F0.3.1.T001. Acum trebuie să pornim și să verificăm configurația.",
  "descriere_task": "Ești un expert Redis cu experiență în troubleshooting. Task-ul tău este să pornești și să verifici containerul Redis.\n\nPași:\n\n1. Pornește Redis:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d redis\n```\n\n2. Verifică logs:\n```bash\ndocker compose logs -f redis\n# Așteaptă 'Ready to accept connections'\n```\n\n3. Verifică healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-redis\n# Trebuie să fie 'healthy'\n```\n\n4. Verifică configurația critică pentru BullMQ:\n```bash\ndocker exec cerniq-redis redis-cli CONFIG GET maxmemory-policy\n# TREBUIE să returneze 'noeviction'\n\ndocker exec cerniq-redis redis-cli CONFIG GET appendonly\n# TREBUIE să returneze 'yes'\n\ndocker exec cerniq-redis redis-cli CONFIG GET notify-keyspace-events\n# TREBUIE să returneze 'Ex'\n```\n\n5. Test funcționalitate:\n```bash\ndocker exec cerniq-redis redis-cli SET test:key \"hello\" EX 60\ndocker exec cerniq-redis redis-cli GET test:key\n# Trebuie să returneze 'hello'\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU continua dacă maxmemory-policy NU este noeviction - BullMQ va pierde jobs",
    "NU ignora verificarea notify-keyspace-events - delayed jobs nu vor funcționa fără",
    "VERIFICĂ că persistența AOF este activată",
    "AȘTEAPTĂ ca healthcheck să fie healthy înainte de verificări"
  ],
  "validare_task": "1. Container cerniq-redis este running\n2. Health status este healthy\n3. CONFIG GET maxmemory-policy returnează noeviction\n4. CONFIG GET appendonly returnează yes\n5. CONFIG GET notify-keyspace-events returnează Ex sau conține Ex\n6. Test SET/GET funcționează",
  "outcome": "Redis 8.4 rulează corect cu configurația optimă pentru BullMQ"
}
```

```json
{
  "taskID": "F0.3.1.T003",
  "denumire_task": "Test conectivitate între PostgreSQL și Redis pe rețeaua internă",
  "context_anterior": "Atât PostgreSQL cât și Redis sunt running. Trebuie să verificăm că pot comunica pe rețeaua internă.",
  "descriere_task": "Ești un expert networking Docker. Task-ul tău este să verifici conectivitatea între servicii.\n\nVerificări:\n\n1. Verifică că PostgreSQL poate fi accesat de pe rețeaua cerniq_data:\n```bash\n# Pornește un container temporar pe rețeaua cerniq_data\ndocker run --rm --network cerniq_data alpine sh -c 'apk add postgresql-client && pg_isready -h postgres -p 5432'\n```\n\n2. Verifică că Redis poate fi accesat de pe rețeaua cerniq_backend:\n```bash\ndocker run --rm --network cerniq_backend alpine sh -c 'apk add redis && redis-cli -h redis ping'\n```\n\n3. Verifică că Redis NU este accesibil din exterior (nici port default, nici dev):\n```bash\n# Aceasta ar trebui să EȘUEZE\nredis-cli -h localhost -p 6379 ping\nredis-cli -h localhost -p 64039 ping\n# Sau timeout/connection refused\n```\n\n4. Verifică că PostgreSQL NU este accesibil din exterior (nici port default, nici dev):\n```bash\n# Aceasta ar trebui să EȘUEZE\npsql -h localhost -p 5432 -U cerniq -d cerniq_production\npsql -h localhost -p 64032 -U cerniq -d cerniq_production\n# Sau timeout/connection refused\n```\n\nDocumentează rezultatele în /var/www/CerniqAPP/docs/architecture/network-verification.md",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU modifica configurația dacă testele de izolare EȘUEAZĂ - trebuie să eșueze accesul extern",
    "VERIFICĂ că accesul intern funcționează ÎNAINTE de a verifica izolarea",
    "DOCUMENTEAZĂ rezultatele pentru audit",
    "NU expune porturile pentru debugging - folosește containere temporare"
  ],
  "validare_task": "1. pg_isready din container pe cerniq_data reușește\n2. redis-cli ping din container pe cerniq_backend returnează PONG\n3. Accesul de pe host la postgres:64032 EȘUEAZĂ (timeout/refused)\n4. Accesul de pe host la redis:64039 EȘUEAZĂ (timeout/refused)\n5. Documentul network-verification.md este creat",
  "outcome": "Conectivitate internă verificată și izolare de exterior confirmată pentru PostgreSQL și Redis"
}
```

---

## FAZA F0.4: TRAEFIK v3.6.6 SETUP

```json
{
  "taskID": "F0.4.1.T001",
  "denumire_task": "Creare configurație statică Traefik cu Let's Encrypt",
  "context_anterior": "PostgreSQL și Redis funcționale pe rețele interne. Acum configurăm Traefik ca reverse proxy cu SSL automat.",
  "descriere_task": "Ești un expert Traefik și TLS/SSL cu experiență în configurarea pentru producție. Task-ul tău este să creezi configurația statică Traefik.\n\nCreează fișierul /var/www/CerniqAPP/infra/docker/traefik/traefik.yml:\n\n```yaml\n# Traefik v3.6.6 Static Configuration for Cerniq.app\n# Last Updated: 2026-01-15\n\nglobal:\n  checkNewVersion: false\n  sendAnonymousUsage: false\n\napi:\n  dashboard: true\n  insecure: false\n\nlog:\n  level: INFO\n  format: json\n\naccessLog:\n  format: json\n  filters:\n    statusCodes:\n      - \"400-599\"\n\nentryPoints:\n  web:\n    address: \":80\"\n    http:\n      redirections:\n        entryPoint:\n          to: websecure\n          scheme: https\n          permanent: true\n  websecure:\n    address: \":443\"\n    http:\n      tls:\n        certResolver: letsencrypt\n    http3: {}\n  metrics:\n    address: \":8082\"\n\nproviders:\n  docker:\n    endpoint: \"unix:///var/run/docker.sock\"\n    exposedByDefault: false\n    network: cerniq_public\n    watch: true\n  file:\n    directory: /etc/traefik/dynamic\n    watch: true\n\ncertificatesResolvers:\n  letsencrypt:\n    acme:\n      email: admin@cerniq.app\n      storage: /acme.json\n      caServer: \"https://acme-v02.api.letsencrypt.org/directory\"\n      httpChallenge:\n        entryPoint: web\n\nmetrics:\n  prometheus:\n    entryPoint: metrics\n    addEntryPointsLabels: true\n    addServicesLabels: true\n```\n\nIMPORTANT: exposedByDefault: false este OBLIGATORIU pentru securitate.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik",
  "restrictii_antihalucinatie": [
    "exposedByDefault TREBUIE să fie false - altfel toate containerele sunt expuse automat",
    "NU activa api.insecure în production - dashboard-ul trebuie securizat",
    "NU omite HTTP → HTTPS redirect - totul trebuie să fie pe HTTPS",
    "VERIFICĂ că email-ul pentru Let's Encrypt este valid",
    "INCLUDE http3: {} pentru HTTP/3 support",
    "FOLOSEȘTE network: cerniq_public pentru Docker provider"
  ],
  "validare_task": "1. Fișierul traefik.yml există în directorul corect\n2. exposedByDefault este false\n3. api.insecure este false\n4. certResolver letsencrypt este configurat cu httpChallenge\n5. EntryPoint web redirecționează către websecure\n6. HTTP/3 este activat (http3: {})",
  "outcome": "Configurație statică Traefik v3.6.6 cu Let's Encrypt și HTTP/3"
}
```

```json
{
  "taskID": "F0.4.1.T002",
  "denumire_task": "Creare middleware-uri dinamice pentru securitate",
  "context_anterior": "Configurație statică Traefik creată. Acum adăugăm middleware-uri pentru headers de securitate și rate limiting.",
  "descriere_task": "Ești un expert în securitate web. Task-ul tău este să creezi fișierul de configurație dinamică cu middleware-uri.\n\nCreează fișierul /var/www/CerniqAPP/infra/docker/traefik/dynamic/middlewares.yml:\n\n```yaml\n# Traefik Dynamic Configuration - Middlewares\n# Last Updated: 2026-01-15\n\nhttp:\n  middlewares:\n    # Security Headers\n    secure-headers:\n      headers:\n        stsSeconds: 31536000\n        stsIncludeSubdomains: true\n        stsPreload: true\n        contentTypeNosniff: true\n        frameDeny: true\n        browserXssFilter: true\n        referrerPolicy: \"strict-origin-when-cross-origin\"\n        customResponseHeaders:\n          X-Robots-Tag: \"noindex, nofollow\"\n          Permissions-Policy: \"accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()\"\n\n    # Rate Limiting\n    rate-limit:\n      rateLimit:\n        average: 100\n        burst: 200\n        period: 1s\n        sourceCriterion:\n          ipStrategy:\n            depth: 0\n\n    # Compression\n    compress:\n      compress:\n        excludedContentTypes:\n          - text/event-stream\n        minResponseBodyBytes: 1024\n\n    # API Rate Limit (more restrictive)\n    api-rate-limit:\n      rateLimit:\n        average: 50\n        burst: 100\n        period: 1s\n\n    # Dashboard Auth\n    dashboard-auth:\n      basicAuth:\n        users:\n          - \"admin:$apr1$placeholder$placeholder\"  # Generate with htpasswd\n\n    # IP Whitelist for Dashboard\n    dashboard-whitelist:\n      ipAllowList:\n        sourceRange:\n          - \"127.0.0.1/32\"\n          - \"10.0.0.0/8\"\n          - \"172.16.0.0/12\"\n          - \"192.168.0.0/16\"\n\n    # Chain for API routes\n    api-chain:\n      chain:\n        middlewares:\n          - secure-headers\n          - rate-limit\n          - compress\n\n    # Chain for Dashboard\n    dashboard-chain:\n      chain:\n        middlewares:\n          - dashboard-whitelist\n          - dashboard-auth\n          - secure-headers\n\n  # TLS Configuration\n  tls:\n    options:\n      default:\n        minVersion: VersionTLS12\n        cipherSuites:\n          - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384\n          - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384\n          - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305\n          - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305\n        sniStrict: true\n```\n\nNOTĂ: Parola pentru dashboard-auth trebuie generată cu htpasswd și înlocuită.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/traefik/dynamic",
  "restrictii_antihalucinatie": [
    "NU permite TLS 1.0 sau 1.1 - minVersion TREBUIE să fie VersionTLS12 sau mai nou",
    "NU omite HSTS headers - sunt esențiale pentru securitate",
    "NU seta rate limit prea restrictiv (sub 50 req/s) pentru API",
    "VERIFICĂ sintaxa YAML - Traefik nu va porni cu sintaxă invalidă",
    "PLACEHOLDER pentru basicAuth trebuie înlocuit cu hash real",
    "INCLUDE minResponseBodyBytes pentru compress - evită overhead pe response-uri mici"
  ],
  "validare_task": "1. Fișierul middlewares.yml există în dynamic/\n2. Middleware secure-headers conține HSTS cu stsSeconds: 31536000\n3. Rate-limit este configurat cu average: 100\n4. TLS minVersion este VersionTLS12\n5. Chain-uri api-chain și dashboard-chain sunt definite\n6. YAML este valid (fără erori de sintaxă)",
  "outcome": "Middleware-uri Traefik pentru securitate, rate limiting și compresie configurate"
}
```

```json
{
  "taskID": "F0.4.1.T003",
  "denumire_task": "Adăugare serviciu Traefik în docker-compose.yml",
  "context_anterior": "Configurații statice și dinamice Traefik create. Acum adăugăm serviciul în docker-compose.",
  "descriere_task": "Ești un expert Docker Compose. Task-ul tău este să adaugi serviciul Traefik în docker-compose.yml.\n\nAdaugă serviciul:\n\n```yaml\n  traefik:\n    image: traefik:v3.6.6\n    container_name: cerniq-traefik\n    restart: unless-stopped\n    security_opt:\n      - no-new-privileges:true\n    ports:\n      - \"64080:80\"\n      - \"64443:443\"\n      - \"64443:443/udp\"  # HTTP/3\n    volumes:\n      - /var/run/docker.sock:/var/run/docker.sock:ro\n      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro\n      - ./traefik/dynamic:/etc/traefik/dynamic:ro\n      - traefik_certs:/acme.json\n    networks:\n      - cerniq_public\n    labels:\n      - \"traefik.enable=true\"\n      # Dashboard\n      - \"traefik.http.routers.dashboard.rule=Host(`traefik.cerniq.app`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))\"\n      - \"traefik.http.routers.dashboard.service=api@internal\"\n      - \"traefik.http.routers.dashboard.entrypoints=websecure\"\n      - \"traefik.http.routers.dashboard.tls.certresolver=letsencrypt\"\n      - \"traefik.http.routers.dashboard.middlewares=dashboard-chain@file\"\n    healthcheck:\n      test: [\"CMD\", \"traefik\", \"healthcheck\", \"--ping\"]\n      interval: 10s\n      timeout: 5s\n      retries: 3\n      start_period: 10s\n    deploy:\n      resources:\n        limits:\n          memory: 512M\n          cpus: '0.5'\n        reservations:\n          memory: 256M\n          cpus: '0.25'\n```\n\nNOTĂ: Docker socket montat read-only pentru securitate.",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "Docker socket TREBUIE montat read-only (:ro)",
    "security_opt: no-new-privileges:true TREBUIE inclus",
    "INCLUDE port 443/udp pentru HTTP/3",
    "Dashboard TREBUIE protejat cu middleware dashboard-chain",
    "Traefik TREBUIE să fie DOAR pe rețeaua cerniq_public",
    "NU monta volume-uri write decât pentru acme.json"
  ],
  "validare_task": "1. 'docker compose config' validează fără erori\n2. Traefik folosește imaginea traefik:v3.6.6\n3. Docker socket este montat read-only\n4. security_opt conține no-new-privileges:true\n5. Porturile 80, 443, 443/udp sunt expuse\n6. Dashboard are middleware dashboard-chain",
  "outcome": "Serviciu Traefik v3.6.6 adăugat în docker-compose.yml cu securitate și HTTP/3"
}
```

```json
{
  "taskID": "F0.4.1.T004",
  "denumire_task": "Pornire și verificare Traefik",
  "context_anterior": "Serviciul Traefik configurat. Acum trebuie să-l pornim și să verificăm funcționarea.",
  "descriere_task": "Ești un expert DevOps. Task-ul tău este să pornești și să verifici Traefik.\n\nPași:\n\n1. Creează volume pentru certificate (dacă nu există deja):\n```bash\ntouch /var/www/CerniqAPP/infra/docker/acme.json\nchmod 600 /var/www/CerniqAPP/infra/docker/acme.json\n```\n\n2. Pornește Traefik:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d traefik\n```\n\n3. Verifică logs:\n```bash\ndocker compose logs -f traefik\n# Verifică că nu sunt erori\n```\n\n4. Verifică healthcheck:\n```bash\ndocker inspect --format='{{.State.Health.Status}}' cerniq-traefik\n# Trebuie să fie healthy\n```\n\n5. Verifică că porturile sunt deschise:\n```bash\nss -tlnp | grep -E ':(80|443)'\n# Trebuie să arate traefik listening pe aceste porturi\n```\n\n6. Test HTTP redirect:\n```bash\ncurl -I http://localhost\n# Trebuie să returneze 301 Redirect către HTTPS\n```\n\n7. Verifică metrics endpoint:\n```bash\ncurl http://localhost:8082/metrics\n# Trebuie să returneze metrici Prometheus\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "acme.json TREBUIE să aibă permisiuni 600 - altfel Traefik refuză să pornească",
    "NU continua dacă sunt erori în logs - rezolvă-le mai întâi",
    "VERIFICĂ că redirect HTTP→HTTPS funcționează",
    "AȘTEAPTĂ healthcheck să fie healthy înainte de alte verificări"
  ],
  "validare_task": "1. Container cerniq-traefik este running\n2. Health status este healthy\n3. Porturile 80 și 443 sunt deschise\n4. HTTP redirect funcționează (301 către HTTPS)\n5. Metrics endpoint răspunde la :8082/metrics\n6. Logs nu conțin erori",
  "outcome": "Traefik v3.6.6 funcțional cu SSL automat și HTTP/3"
}
```

---

## FAZA F0.5: OBSERVABILITY STACK (SigNoz)

```json
{
  "taskID": "F0.5.1.T001",
  "denumire_task": "Adăugare servicii SigNoz v0.106.0 în docker-compose.yml",
  "context_anterior": "Traefik funcțional. Acum adăugăm stack-ul de observability SigNoz pentru traces, metrics și logs.",
  "descriere_task": "Ești un expert observability cu experiență în OpenTelemetry și SigNoz. Task-ul tău este să adaugi serviciile SigNoz în docker-compose.\n\nAdaugă serviciile (aceasta este o configurație simplificată - SigNoz complet are mai multe componente):\n\n```yaml\n  # ClickHouse pentru SigNoz\n  clickhouse:\n    image: clickhouse/clickhouse-server:25.12.3\n    container_name: cerniq-clickhouse\n    restart: unless-stopped\n    volumes:\n      - signoz_data:/var/lib/clickhouse\n    networks:\n      - cerniq_backend\n    healthcheck:\n      test: [\"CMD\", \"wget\", \"--spider\", \"-q\", \"localhost:64082/ping\"]\n      interval: 30s\n      timeout: 5s\n      retries: 3\n    deploy:\n      resources:\n        limits:\n          memory: 8G\n          cpus: '2'\n\n  # SigNoz Query Service\n  signoz:\n    image: signoz/query-service:0.107.0\n    container_name: cerniq-signoz\n    restart: unless-stopped\n    environment:\n      - ClickHouseUrl=tcp://clickhouse:64083\n      - SIGNOZ_LOCAL_DB_PATH=/var/lib/signoz/signoz.db\n    volumes:\n      - signoz_data:/var/lib/signoz\n    depends_on:\n      clickhouse:\n        condition: service_healthy\n    networks:\n      - cerniq_backend\n    labels:\n      - \"traefik.enable=true\"\n      - \"traefik.http.routers.signoz.rule=Host(`signoz.cerniq.app`)\"\n      - \"traefik.http.routers.signoz.entrypoints=websecure\"\n      - \"traefik.http.routers.signoz.tls.certresolver=letsencrypt\"\n      - \"traefik.http.services.signoz.loadbalancer.server.port=64080\"\n\n  # OpenTelemetry Collector\n  otel-collector:\n    image: signoz/signoz-otel-collector:0.129.12\n    container_name: cerniq-otel-collector\n    restart: unless-stopped\n    command: [\"--config=/etc/otel-collector-config.yaml\"]\n    volumes:\n      - ./config/otel/otel-collector-config.yaml:/etc/otel-collector-config.yaml:ro\n    ports:\n      - \"64070:4317\"   # OTLP gRPC\n      - \"64071:4318\"   # OTLP HTTP\n    depends_on:\n      - clickhouse\n    networks:\n      - cerniq_backend\n      - cerniq_public\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "NU expune ClickHouse direct la public - doar prin rețeaua internă",
    "VERIFICĂ compatibilitatea versiunilor între componente SigNoz",
    "INCLUDE volume pentru persistență ClickHouse",
    "OTel Collector trebuie să fie pe cerniq_public pentru a primi traces de la API",
    "SigNoz UI trebuie protejat prin Traefik labels"
  ],
  "validare_task": "1. 'docker compose config' validează fără erori\n2. Serviciile clickhouse, signoz, otel-collector sunt definite\n3. ClickHouse nu are port mapping public\n4. OTel Collector expune porturile 64070 și 64071\n5. SigNoz are Traefik labels pentru routing",
  "outcome": "Servicii SigNoz v0.107.0 adăugate în docker-compose pentru observability complet"
}
```

```json
{
  "taskID": "F0.5.1.T002",
  "denumire_task": "Creare configurație OpenTelemetry Collector",
  "context_anterior": "Servicii SigNoz definite. Acum creăm configurația pentru OTel Collector.",
  "descriere_task": "Ești un expert OpenTelemetry. Creează configurația pentru OTel Collector.\n\nCreează fișierul /var/www/CerniqAPP/infra/config/otel/otel-collector-config.yaml:\n\n```yaml\n# OpenTelemetry Collector Configuration for Cerniq.app\n# Last Updated: 2026-01-15\n\nreceivers:\n  otlp:\n    protocols:\n      grpc:\n        endpoint: 0.0.0.0:64070\n      http:\n        endpoint: 0.0.0.0:64071\n\nprocessors:\n  batch:\n    timeout: 1s\n    send_batch_size: 1000\n    send_batch_max_size: 1500\n  \n  memory_limiter:\n    check_interval: 1s\n    limit_mib: 2000\n    spike_limit_mib: 500\n\n  resource:\n    attributes:\n      - key: deployment.environment\n        value: production\n        action: upsert\n\nexporters:\n  clickhousetraces:\n    datasource: tcp://clickhouse:64083/signoz_traces\n    migrations_folder: /signoz/migrations/traces\n  \n  clickhousemetricswrite:\n    datasource: tcp://clickhouse:64083/signoz_metrics\n\n  clickhouselogs:\n    dsn: tcp://clickhouse:64083/signoz_logs\n    timeout: 10s\n\nservice:\n  telemetry:\n    logs:\n      level: info\n  \n  pipelines:\n    traces:\n      receivers: [otlp]\n      processors: [memory_limiter, batch, resource]\n      exporters: [clickhousetraces]\n    \n    metrics:\n      receivers: [otlp]\n      processors: [memory_limiter, batch]\n      exporters: [clickhousemetricswrite]\n    \n    logs:\n      receivers: [otlp]\n      processors: [memory_limiter, batch]\n      exporters: [clickhouselogs]\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/config/otel",
  "restrictii_antihalucinatie": [
    "INCLUDE memory_limiter pentru a preveni OOM",
    "FOLOSEȘTE batch processor pentru eficiență",
    "VERIFICĂ că endpoint-urile ClickHouse sunt corecte",
    "INCLUDE toate cele 3 pipeline-uri: traces, metrics, logs",
    "NU expune exporters direct - doar receivers"
  ],
  "validare_task": "1. Fișierul otel-collector-config.yaml există\n2. Receivers OTLP sunt configurate pe 64070 (gRPC) și 64071 (HTTP)\n3. Toate exporters pointează către clickhouse\n4. Pipeline-uri pentru traces, metrics și logs sunt definite\n5. memory_limiter este configurat",
  "outcome": "Configurație OTel Collector completă pentru SigNoz"
}
```

```json
{
  "taskID": "F0.5.1.T003",
  "denumire_task": "Pornire și verificare stack observability",
  "context_anterior": "Configurație OTel Collector creată. Acum pornim întregul stack.",
  "descriere_task": "Ești un expert DevOps. Pornește și verifică stack-ul de observability.\n\nPași:\n\n1. Pornește serviciile:\n```bash\ncd /var/www/CerniqAPP/infra/docker\ndocker compose up -d clickhouse\n# Așteaptă să devină healthy\ndocker compose up -d signoz otel-collector\n```\n\n2. Verifică ClickHouse:\n```bash\ndocker exec cerniq-clickhouse clickhouse-client --query \"SELECT 1\"\n# Trebuie să returneze 1\n```\n\n3. Verifică OTel Collector:\n```bash\ncurl -v http://localhost:64071/v1/traces\n# Ar trebui să accepte POST requests (405 pentru GET e OK)\n```\n\n4. Verifică SigNoz UI:\n```bash\ndocker compose logs signoz | grep -i ready\n# Sau accesează https://signoz.cerniq.app după DNS setup\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "PORNEȘTE ClickHouse PRIMUL și așteaptă să fie healthy",
    "NU continua dacă ClickHouse are erori",
    "VERIFICĂ logs pentru fiecare serviciu"
  ],
  "validare_task": "1. Toate containerele observability sunt running\n2. ClickHouse răspunde la queries\n3. OTel Collector acceptă requests pe 64070/64071\n4. SigNoz este accesibil (direct sau prin Traefik)",
  "outcome": "Stack observability SigNoz funcțional și gata să primească telemetrie"
}
```

---

## FAZA F0.6: PNPM ȘI MONOREPO SETUP (COMPLET)

```json
{
  "taskID": "F0.6.1.T001",
  "denumire_task": "Instalare Node.js v24 LTS și activare PNPM",
  "context_anterior": "Infrastructura Docker completă. Acum instalăm Node.js și PNPM pentru dezvoltarea aplicației.",
  "descriere_task": "Ești un expert JavaScript/Node.js. Task-ul tău este să instalezi Node.js v24 LTS și să activezi PNPM.\n\nPași:\n\n1. Instalează Node.js v24 via NodeSource:\n```bash\ncurl -fsSL https://deb.nodesource.com/setup_24.x | bash -\napt install -y nodejs\n```\n\n2. Verifică versiunea:\n```bash\nnode --version\n# Trebuie să afișeze v24.x.x\n\nnpm --version\n# Trebuie să afișeze 11.x.x\n```\n\n3. Activează Corepack (include pnpm):\n```bash\ncorepack enable\ncorepack prepare pnpm@9.15.0 --activate\n```\n\n4. Verifică PNPM:\n```bash\npnpm --version\n# Trebuie să afișeze 9.15.x\n```\n\n5. Setează PNPM store global:\n```bash\npnpm config set store-dir ~/.pnpm-store\n```",
  "director_implementare": "/root",
  "restrictii_antihalucinatie": [
    "NU folosi nvm pentru producție - instalează direct din NodeSource",
    "FOLOSEȘTE corepack pentru PNPM - este metoda oficială",
    "VERIFICĂ că versiunea Node.js este 24.x",
    "NU instala pnpm global cu npm - folosește corepack",
    "PNPM versiunea trebuie să fie 9.15+ conform ADR-0001"
  ],
  "validare_task": "1. 'node --version' afișează v24.x.x\n2. 'npm --version' afișează 11.x.x\n3. 'pnpm --version' afișează 9.15.x\n4. 'which pnpm' returnează path valid",
  "outcome": "Node.js v24 LTS și PNPM 9.15 instalate și configurate"
}
```

```json
{
  "taskID": "F0.6.1.T002",
  "denumire_task": "Inițializare monorepo cu pnpm-workspace.yaml",
  "context_anterior": "Node.js și PNPM instalate. Acum inițializăm proiectul monorepo.",
  "descriere_task": "Ești un expert în monorepo management. Task-ul tău este să inițializezi proiectul Cerniq.app ca monorepo PNPM.\n\nPași:\n\n1. Navighează la directorul proiect:\n```bash\ncd /var/www/CerniqAPP\n```\n\n2. Creează package.json root:\n```json\n{\n  \"name\": \"@cerniq/monorepo\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"description\": \"Cerniq.app B2B Sales Automation Platform\",\n  \"packageManager\": \"pnpm@9.15.0\",\n  \"engines\": {\n    \"node\": \">=24.0.0\",\n    \"pnpm\": \">=9.15.0\"\n  },\n  \"scripts\": {\n    \"dev\": \"turbo dev\",\n    \"build\": \"turbo build\",\n    \"test\": \"turbo test\",\n    \"lint\": \"turbo lint\",\n    \"clean\": \"turbo clean && rm -rf node_modules\"\n  },\n  \"devDependencies\": {\n    \"turbo\": \"^2.3.0\"\n  }\n}\n```\n\n3. Creează pnpm-workspace.yaml:\n```yaml\npackages:\n  - 'apps/*'\n  - 'packages/*'\n```\n\n4. Creează .npmrc:\n```ini\nshamefully-hoist=false\nauto-install-peers=true\nlink-workspace-packages=true\nprefer-frozen-lockfile=true\nstrict-peer-dependencies=false\nengine-strict=true\n```\n\n5. Creează turbo.json:\n```json\n{\n  \"$schema\": \"https://turbo.build/schema.json\",\n  \"tasks\": {\n    \"build\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": [\"dist/**\", \".next/**\", \"build/**\"]\n    },\n    \"dev\": {\n      \"cache\": false,\n      \"persistent\": true\n    },\n    \"test\": {\n      \"dependsOn\": [\"build\"],\n      \"inputs\": [\"src/**\", \"tests/**\"]\n    },\n    \"lint\": {},\n    \"clean\": {\n      \"cache\": false\n    }\n  }\n}\n```\n\n6. Rulează instalare:\n```bash\npnpm install\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NU folosi npm sau yarn - EXCLUSIV pnpm",
    "shamefully-hoist TREBUIE să fie false conform ADR-0001",
    "engine-strict TREBUIE să fie true pentru a impune versiuni",
    "INCLUDE packageManager în package.json",
    "NU omite turbo.json - este necesar pentru orchestrarea build-urilor"
  ],
  "validare_task": "1. package.json există cu packageManager: pnpm@9.15.0\n2. pnpm-workspace.yaml există cu apps/* și packages/*\n3. .npmrc există cu shamefully-hoist=false\n4. turbo.json există\n5. 'pnpm install' rulează fără erori\n6. node_modules/.pnpm există (structură pnpm)",
  "outcome": "Monorepo PNPM inițializat cu Turborepo pentru orchestrare"
}
```

```json
{
  "taskID": "F0.6.1.T003",
  "denumire_task": "Creare package apps/api cu Fastify v5.6.2",
  "context_anterior": "Monorepo inițializat. Acum creăm package-ul pentru API.",
  "descriere_task": "Ești un expert backend Node.js specializat în Fastify. Task-ul tău este să creezi package-ul apps/api.\n\nCreează /var/www/CerniqAPP/apps/api/package.json:\n```json\n{\n  \"name\": \"@cerniq/api\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"node --watch --env-file=.env src/index.ts\",\n    \"build\": \"tsup src/index.ts --format esm --dts\",\n    \"start\": \"node dist/index.js\",\n    \"test\": \"vitest run\",\n    \"test:watch\": \"vitest\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"fastify\": \"^5.6.2\",\n    \"@fastify/cors\": \"^10.0.0\",\n    \"@fastify/helmet\": \"^12.0.0\",\n    \"@fastify/jwt\": \"^9.0.0\",\n    \"@fastify/cookie\": \"^10.0.0\",\n    \"@fastify/type-provider-zod\": \"^3.0.0\",\n    \"zod\": \"^3.24.0\",\n    \"pino\": \"^9.6.0\",\n    \"drizzle-orm\": \"^0.38.0\",\n    \"postgres\": \"^3.4.0\",\n    \"@cerniq/db\": \"workspace:*\",\n    \"@cerniq/shared-types\": \"workspace:*\"\n  },\n  \"devDependencies\": {\n    \"typescript\": \"^5.7.0\",\n    \"@types/node\": \"^22.10.0\",\n    \"tsup\": \"^8.3.0\",\n    \"vitest\": \"^2.1.0\",\n    \"eslint\": \"^9.17.0\"\n  },\n  \"engines\": {\n    \"node\": \">=24.0.0\"\n  }\n}\n```\n\nCreează tsconfig.json pentru apps/api:\n```json\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2024\",\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"esModuleInterop\": true,\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"outDir\": \"dist\",\n    \"rootDir\": \"src\",\n    \"declaration\": true,\n    \"declarationMap\": true,\n    \"sourceMap\": true\n  },\n  \"include\": [\"src/**/*\"],\n  \"exclude\": [\"node_modules\", \"dist\"]\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "NU folosi Express - TREBUIE Fastify v5.6.2",
    "NU omite @fastify/type-provider-zod - esențial pentru type safety",
    "FOLOSEȘTE workspace:* pentru packages interne",
    "type: module TREBUIE inclus pentru ESM",
    "NU include nodemon - folosește node --watch nativ"
  ],
  "validare_task": "1. package.json există în apps/api/\n2. fastify versiunea este ^5.6.2\n3. Dependențe interne folosesc workspace:*\n4. type este 'module'\n5. tsconfig.json există cu module NodeNext",
  "outcome": "Package API cu Fastify v5.6.2 configurat"
}
```

```json
{
  "taskID": "F0.6.1.T004",
  "denumire_task": "Creare package apps/web-admin cu React 19.2.3 și Refine v5",
  "context_anterior": "Package API creat. Acum creăm package-ul pentru frontend.",
  "descriere_task": "Ești un expert frontend React. Task-ul tău este să creezi package-ul apps/web-admin.\n\nCreează /var/www/CerniqAPP/apps/web-admin/package.json:\n```json\n{\n  \"name\": \"@cerniq/web-admin\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\",\n    \"test\": \"vitest run\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"react\": \"^19.0.0\",\n    \"react-dom\": \"^19.0.0\",\n    \"@refinedev/core\": \"^5.0.0\",\n    \"@refinedev/react-router\": \"^1.0.0\",\n    \"react-router-dom\": \"^7.0.0\",\n    \"@tanstack/react-query\": \"^5.62.0\",\n    \"zod\": \"^3.24.0\",\n    \"@cerniq/shared-types\": \"workspace:*\"\n  },\n  \"devDependencies\": {\n    \"@types/react\": \"^19.0.0\",\n    \"@types/react-dom\": \"^19.0.0\",\n    \"typescript\": \"^5.7.0\",\n    \"vite\": \"^6.0.0\",\n    \"@vitejs/plugin-react\": \"^4.3.0\",\n    \"tailwindcss\": \"^4.0.0\",\n    \"vitest\": \"^2.1.0\",\n    \"eslint\": \"^9.17.0\"\n  },\n  \"engines\": {\n    \"node\": \">=24.0.0\"\n  }\n}\n```\n\nCreează tsconfig.json și vite.config.ts corespunzătoare.",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin",
  "restrictii_antihalucinatie": [
    "React TREBUIE să fie versiunea 19",
    "Refine TREBUIE să fie v5",
    "FOLOSEȘTE Vite, NU Create React App",
    "Tailwind TREBUIE să fie v4",
    "INCLUDE @cerniq/shared-types ca workspace dependency"
  ],
  "validare_task": "1. package.json există în apps/web-admin/\n2. react versiunea este ^19.0.0\n3. @refinedev/core versiunea este ^5.0.0\n4. vite versiunea este ^6.0.0\n5. tailwindcss versiunea este ^4.0.0",
  "outcome": "Package Web cu React 19.2.3 și Refine v5 configurat"
}
```

```json
{
  "taskID": "F0.6.1.T005",
  "denumire_task": "Creare package packages/db cu Drizzle ORM",
  "context_anterior": "Packages pentru apps create. Acum creăm package-ul pentru database.",
  "descriere_task": "Ești un expert database TypeScript. Task-ul tău este să creezi package-ul packages/db cu Drizzle ORM.\n\nCreează /var/www/CerniqAPP/packages/db/package.json:\n```json\n{\n  \"name\": \"@cerniq/db\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"exports\": {\n    \".\": {\n      \"import\": \"./dist/index.js\",\n      \"types\": \"./dist/index.d.ts\"\n    },\n    \"./schema\": {\n      \"import\": \"./dist/schema/index.js\",\n      \"types\": \"./dist/schema/index.d.ts\"\n    }\n  },\n  \"scripts\": {\n    \"build\": \"tsup\",\n    \"dev\": \"tsup --watch\",\n    \"db:generate\": \"drizzle-kit generate\",\n    \"db:migrate\": \"drizzle-kit migrate\",\n    \"db:push\": \"drizzle-kit push\",\n    \"db:studio\": \"drizzle-kit studio\"\n  },\n  \"dependencies\": {\n    \"drizzle-orm\": \"^0.38.0\",\n    \"drizzle-zod\": \"^0.5.0\",\n    \"postgres\": \"^3.4.0\",\n    \"zod\": \"^3.24.0\"\n  },\n  \"devDependencies\": {\n    \"drizzle-kit\": \"^0.30.0\",\n    \"typescript\": \"^5.7.0\",\n    \"tsup\": \"^8.3.0\",\n    \"@types/node\": \"^22.10.0\"\n  },\n  \"peerDependencies\": {\n    \"@cerniq/shared-types\": \"workspace:*\"\n  }\n}\n```\n\nCreează drizzle.config.ts:\n```typescript\nimport { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './src/schema/index.ts',\n  out: './drizzle',\n  dialect: 'postgresql',\n  dbCredentials: {\n    url: process.env.DATABASE_URL!,\n  },\n  verbose: true,\n  strict: true,\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE drizzle-orm versiunea ^0.38.0",
    "INCLUDE drizzle-zod pentru auto-generare Zod schemas",
    "NU folosi Prisma - conform ADR-0007 folosim Drizzle",
    "exports TREBUIE să includă și ./schema pentru import individual",
    "INCLUDE drizzle-kit pentru migrații"
  ],
  "validare_task": "1. package.json există în packages/db/\n2. drizzle-orm versiunea este ^0.38.0\n3. drizzle-zod este inclus\n4. drizzle.config.ts există\n5. Scripturi db:generate, db:migrate, db:push sunt definite",
  "outcome": "Package database cu Drizzle ORM configurat"
}
```

```json
{
  "taskID": "F0.6.1.T006",
  "denumire_task": "Creare package packages/shared-types cu Zod schemas",
  "context_anterior": "Package db creat. Acum creăm package-ul pentru types shared.",
  "descriere_task": "Ești un expert TypeScript. Task-ul tău este să creezi package-ul packages/shared-types.\n\nCreează /var/www/CerniqAPP/packages/shared-types/package.json:\n```json\n{\n  \"name\": \"@cerniq/shared-types\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"type\": \"module\",\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"exports\": {\n    \".\": {\n      \"import\": \"./dist/index.js\",\n      \"types\": \"./dist/index.d.ts\"\n    }\n  },\n  \"scripts\": {\n    \"build\": \"tsup src/index.ts --format esm --dts\",\n    \"dev\": \"tsup src/index.ts --format esm --dts --watch\",\n    \"lint\": \"eslint src/\"\n  },\n  \"dependencies\": {\n    \"zod\": \"^3.24.0\"\n  },\n  \"devDependencies\": {\n    \"typescript\": \"^5.7.0\",\n    \"tsup\": \"^8.3.0\"\n  }\n}\n```\n\nCreează src/index.ts:\n```typescript\n// Cerniq.app Shared Types\n// Central location for all Zod schemas and TypeScript types\n\nexport * from './schemas/company';\nexport * from './schemas/contact';\nexport * from './schemas/lead';\nexport * from './schemas/events';\nexport * from './schemas/api';\n```\n\nCreează schema exemplu src/schemas/company.ts:\n```typescript\nimport { z } from 'zod';\n\nexport const CompanySchema = z.object({\n  id: z.string().uuid(),\n  tenantId: z.string().uuid(),\n  cui: z.string().regex(/^\\d{2,10}$/, 'CUI invalid'),\n  denumire: z.string().min(1).max(255),\n  platitorTva: z.boolean().default(false),\n  createdAt: z.date(),\n  updatedAt: z.date(),\n});\n\nexport type Company = z.infer<typeof CompanySchema>;\n\nexport const CreateCompanySchema = CompanySchema.omit({\n  id: true,\n  createdAt: true,\n  updatedAt: true,\n});\n\nexport type CreateCompany = z.infer<typeof CreateCompanySchema>;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/shared-types",
  "restrictii_antihalucinatie": [
    "TOATE typurile trebuie să fie Zod schemas cu type inference",
    "NU crea types separate de Zod schemas - folosește z.infer",
    "EXPORTĂ totul din index.ts pentru facilitatea importurilor",
    "INCLUDE validare CUI cu regex conform specificațiilor"
  ],
  "validare_task": "1. package.json există în packages/shared-types/\n2. zod versiunea este ^3.24.0\n3. src/index.ts exportă toate modulele\n4. src/schemas/company.ts conține Zod schema și type inference",
  "outcome": "Package shared-types cu Zod schemas centralizate"
}
```

```json
{
  "taskID": "F0.6.1.T007",
  "denumire_task": "Creare configurații shared (ESLint, TypeScript, Tailwind)",
  "context_anterior": "Toate packages principale create. Acum creăm configurațiile shared.",
  "descriere_task": "Ești un expert în configurare tooling. Creează configurațiile shared.\n\nCreează packages/config/eslint/package.json:\n```json\n{\n  \"name\": \"@cerniq/eslint-config\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"main\": \"index.js\",\n  \"dependencies\": {\n    \"eslint\": \"^9.17.0\",\n    \"@typescript-eslint/eslint-plugin\": \"^8.18.0\",\n    \"@typescript-eslint/parser\": \"^8.18.0\",\n    \"eslint-plugin-react\": \"^7.37.0\",\n    \"eslint-plugin-react-hooks\": \"^5.0.0\"\n  }\n}\n```\n\nCreează packages/config/eslint/index.js:\n```javascript\nmodule.exports = {\n  parser: '@typescript-eslint/parser',\n  plugins: ['@typescript-eslint'],\n  extends: [\n    'eslint:recommended',\n    'plugin:@typescript-eslint/recommended',\n  ],\n  rules: {\n    '@typescript-eslint/no-unused-vars': 'error',\n    '@typescript-eslint/explicit-function-return-type': 'warn',\n  },\n};\n```\n\nCreează packages/config/typescript/tsconfig.base.json:\n```json\n{\n  \"$schema\": \"https://json.schemastore.org/tsconfig\",\n  \"compilerOptions\": {\n    \"target\": \"ES2024\",\n    \"lib\": [\"ES2024\"],\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"esModuleInterop\": true,\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"forceConsistentCasingInFileNames\": true,\n    \"declaration\": true,\n    \"declarationMap\": true,\n    \"sourceMap\": true\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/config",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE ESLint flat config (v9)",
    "TypeScript target TREBUIE să fie ES2024 pentru Node.js v24",
    "INCLUDE strict: true în tsconfig",
    "moduleResolution TREBUIE să fie NodeNext pentru ESM"
  ],
  "validare_task": "1. packages/config/eslint/package.json există\n2. packages/config/typescript/tsconfig.base.json există\n3. tsconfig folosește target ES2024\n4. ESLint config include TypeScript plugin",
  "outcome": "Configurații shared create pentru consistență în monorepo"
}
```

```json
{
  "taskID": "F0.6.1.T008",
  "denumire_task": "Instalare dependențe și verificare monorepo",
  "context_anterior": "Toate packages și configurații create. Acum instalăm și verificăm.",
  "descriere_task": "Ești un expert monorepo. Verifică și instalează toate dependențele.\n\nPași:\n\n1. Din root, instalează toate dependențele:\n```bash\ncd /var/www/CerniqAPP\npnpm install\n```\n\n2. Verifică că workspace-urile sunt detectate:\n```bash\npnpm list -r --depth=0\n# Trebuie să afișeze toate packages\n```\n\n3. Verifică structura node_modules:\n```bash\nls -la node_modules/@cerniq/\n# Trebuie să conțină symlinks către packages\n```\n\n4. Test build pentru un package:\n```bash\npnpm --filter @cerniq/shared-types build\n```\n\n5. Creează .gitignore root:\n```\nnode_modules/\ndist/\n.env\n.env.*\n!.env.example\n*.log\n.turbo/\nsecrets/\n!secrets/.gitignore\n```\n\n6. Inițializează git:\n```bash\ngit init\ngit add .\ngit commit -m \"chore: initial monorepo setup\"\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "pnpm install TREBUIE să ruleze fără erori",
    "Symlinks către packages interne TREBUIE să existe în node_modules/@cerniq/",
    "NU commit node_modules sau secrets",
    "INCLUDE .turbo/ în .gitignore",
    "VERIFICĂ că toate workspace packages sunt detectate"
  ],
  "validare_task": "1. 'pnpm install' completează fără erori\n2. 'pnpm list -r --depth=0' afișează toate 5 packages\n3. node_modules/@cerniq/ conține symlinks\n4. Build pentru shared-types reușește\n5. Git repository inițializat cu primul commit",
  "outcome": "Monorepo complet funcțional cu toate dependențele instalate"
}
```

---

## FAZA F0.7: BACKUP STRATEGY (COMPLET)

## F0.7.1 BorgBackup Setup

```json
{
  "taskID": "F0.7.1.T001",
  "denumire_task": "Inițializare BorgBackup Repository pe Hetzner Storage Box",
  "context_anterior": "Infrastructura Docker și serviciile de bază sunt funcționale. Acum configurăm backup strategy conform ADR-0020.",
  "descriere_task": "Ești un expert în backup și disaster recovery cu experiență în BorgBackup și Hetzner Storage Box. Configurează repository-ul pentru backup-uri.\n\n**Pașii de implementare:**\n\n1. Generează SSH key pentru Storage Box:\n```bash\nssh-keygen -t ed25519 -f ~/.ssh/storagebox_ed25519 -N '' -C 'cerniq-backup'\n```\n\n2. Adaugă cheia publică în Hetzner Storage Box (Robot → Storage Box → SSH keys)\n\n3. Testează conexiunea (port 23!):\n```bash\nssh -p 23 uXXXXXX@uXXXXXX.your-storagebox.de ls\n```\n\n4. Generează și salvează passphrase-ul BorgBackup:\n```bash\nmkdir -p /var/www/CerniqAPP/secrets\nopenssl rand -base64 32 > /var/www/CerniqAPP/secrets/borg_passphrase\nchmod 600 /var/www/CerniqAPP/secrets/borg_passphrase\necho 'CRITIC: Backup passphrase în locație securizată separată!'\n```\n\n5. Inițializează repository:\n```bash\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nborg init --encryption=repokey $BORG_REPO\n```\n\n6. Verifică inițializarea:\n```bash\nborg info $BORG_REPO\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "PORT 23 pentru Hetzner Storage Box - NU 22!",
    "PASSPHRASE trebuie backup-uit separat - pierderea = pierderea backup-urilor",
    "FOLOSEȘTE encryption=repokey pentru securitate",
    "SSH key TREBUIE să fie ed25519 pentru performanță",
    "NU stoca passphrase în git sau în același loc cu backup-urile"
  ],
  "validare_task": "1. SSH key ed25519 creat în ~/.ssh/storagebox_ed25519\n2. Conexiunea pe port 23 funcționează\n3. Passphrase salvat în /var/www/CerniqAPP/secrets/borg_passphrase cu permisiuni 600\n4. Repository inițializat cu encryption=repokey\n5. borg info returnează informații despre repository",
  "outcome": "BorgBackup repository inițializat pe Hetzner Storage Box cu encryption"
}
```

```json
{
  "taskID": "F0.7.1.T002",
  "denumire_task": "Creare script backup zilnic cu pg_dump și BorgBackup",
  "context_anterior": "Repository BorgBackup inițializat. Acum creăm scriptul de backup zilnic.",
  "descriere_task": "Ești un expert în scripting și backup automation. Creează scriptul de backup zilnic.\n\nCreează `/var/www/CerniqAPP/infra/scripts/backup-daily.sh`:\n\n```bash\n#!/bin/bash\n# CERNIQ Daily Backup Script\n# Rulează via cron: 0 3 * * * /var/www/CerniqAPP/infra/scripts/backup-daily.sh\n\nset -euo pipefail\n\n# Configuration\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nBACKUP_NAME=\"cerniq-$(date +%Y%m%d-%H%M%S)\"\nBACKUP_DIR=\"/var/backups/cerniq\"\nLOG_FILE=\"/var/log/cerniq/backup-$(date +%Y%m%d).log\"\n\nmkdir -p $BACKUP_DIR /var/log/cerniq\n\nexec > >(tee -a \"$LOG_FILE\") 2>&1\n\necho \"=== CERNIQ BACKUP STARTED $(date) ===\"\n\n# 1. PostgreSQL dump\necho \"[1/4] Dumping PostgreSQL...\"\ndocker exec cerniq-postgres pg_dumpall -U cerniq > $BACKUP_DIR/pg_dumpall.sql\ndocker exec cerniq-postgres pg_dump -U cerniq -Fc cerniq_production > $BACKUP_DIR/cerniq_production.dump\necho \"PostgreSQL dump: $(du -h $BACKUP_DIR/pg_dumpall.sql | cut -f1)\"\n\n# 2. Redis RDB snapshot\necho \"[2/4] Snapshotting Redis...\"\ndocker exec cerniq-redis redis-cli BGSAVE\nsleep 5\ndocker cp cerniq-redis:/data/dump.rdb $BACKUP_DIR/redis-dump.rdb 2>/dev/null || echo 'Redis RDB not available'\n\n# 3. Create Borg backup\necho \"[3/4] Creating Borg backup...\"\nborg create --verbose --stats --compression zstd:6 \\\n    $BORG_REPO::$BACKUP_NAME \\\n    /var/www/CerniqAPP \\\n    $BACKUP_DIR \\\n    --exclude '/var/www/CerniqAPP/node_modules' \\\n    --exclude '/var/www/CerniqAPP/.git' \\\n    --exclude '/var/www/CerniqAPP/.pnpm-store' \\\n    --exclude '*.log' \\\n    --exclude '__pycache__'\n\n# 4. Prune old backups (GFS retention)\necho \"[4/4] Pruning old backups...\"\nborg prune --verbose --stats \\\n    --keep-daily=7 \\\n    --keep-weekly=4 \\\n    --keep-monthly=6 \\\n    --keep-yearly=2 \\\n    $BORG_REPO\n\n# Cleanup local dumps\nrm -f $BACKUP_DIR/pg_dumpall.sql $BACKUP_DIR/cerniq_production.dump\n\necho \"=== BACKUP COMPLETED $(date) ===\"\nborg info $BORG_REPO::$BACKUP_NAME\n```\n\nSetează permisiuni:\n```bash\nchmod +x /var/www/CerniqAPP/infra/scripts/backup-daily.sh\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE set -euo pipefail pentru fail-fast",
    "EXCLUDE node_modules, .git, .pnpm-store din backup",
    "GFS retention: 7 daily, 4 weekly, 6 monthly, 2 yearly",
    "COMPRESSION zstd:6 pentru balance size/speed",
    "CLEANUP dumps locale după backup reușit"
  ],
  "validare_task": "1. Script backup-daily.sh creat cu permisiuni +x\n2. Scriptul include pg_dumpall și pg_dump\n3. Exclude paths sunt configurate corect\n4. Prune cu GFS retention policy\n5. Logging în /var/log/cerniq/",
  "outcome": "Script backup zilnic funcțional cu GFS retention policy"
}
```

```json
{
  "taskID": "F0.7.1.T003",
  "denumire_task": "Configurare systemd timer pentru backup automat",
  "context_anterior": "Script backup creat. Acum configurăm rularea automată via systemd.",
  "descriere_task": "Ești un expert în systemd și automation. Configurează timer pentru backup zilnic.\n\n1. Creează service file `/etc/systemd/system/cerniq-backup.service`:\n```ini\n[Unit]\nDescription=Cerniq Daily Backup\nAfter=docker.service network-online.target\nWants=network-online.target\n\n[Service]\nType=oneshot\nExecStart=/var/www/CerniqAPP/infra/scripts/backup-daily.sh\nUser=root\nEnvironment=HOME=/root\n\n# Logging\nStandardOutput=journal\nStandardError=journal\nSyslogIdentifier=cerniq-backup\n\n# Timeout pentru backup mari\nTimeoutStartSec=3600\n```\n\n2. Creează timer file `/etc/systemd/system/cerniq-backup.timer`:\n```ini\n[Unit]\nDescription=Run Cerniq Backup Daily at 3 AM\n\n[Timer]\nOnCalendar=*-*-* 03:00:00\nPersistent=true\nRandomizedDelaySec=900\n\n[Install]\nWantedBy=timers.target\n```\n\n3. Activează timer:\n```bash\nsudo systemctl daemon-reload\nsudo systemctl enable cerniq-backup.timer\nsudo systemctl start cerniq-backup.timer\n```\n\n4. Verifică status:\n```bash\nsystemctl status cerniq-backup.timer\nsystemctl list-timers | grep cerniq\n```",
  "director_implementare": "/etc/systemd/system",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE Type=oneshot pentru one-time jobs",
    "Persistent=true asigură că backup-ul rulează și după downtime",
    "RandomizedDelaySec previne thundering herd",
    "TimeoutStartSec=3600 pentru backup-uri mari",
    "INCLUDE After=docker.service pentru dependență"
  ],
  "validare_task": "1. cerniq-backup.service creat\n2. cerniq-backup.timer creat\n3. Timer enabled și started\n4. systemctl list-timers arată next run\n5. Test manual cu: systemctl start cerniq-backup",
  "outcome": "Backup automat configurat via systemd timer la 03:00 zilnic"
}
```

```json
{
  "taskID": "F0.7.1.T004",
  "denumire_task": "Creare script restore și testare disaster recovery",
  "context_anterior": "Backup automat configurat. Acum creăm procedura de restore.",
  "descriere_task": "Ești un expert în disaster recovery. Creează scripturi de restore și testează procedura.\n\n1. Creează `/var/www/CerniqAPP/infra/scripts/restore-postgres.sh`:\n```bash\n#!/bin/bash\n# PostgreSQL Restore Script\nset -euo pipefail\n\nexport BORG_REPO='ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-cerniq'\nexport BORG_PASSPHRASE=$(cat /var/www/CerniqAPP/secrets/borg_passphrase)\nexport BORG_RSH='ssh -i ~/.ssh/storagebox_ed25519 -p 23'\n\nARCHIVE=${1:-$(borg list $BORG_REPO --last 1 --format '{archive}')}\nRESTORE_DIR=\"/tmp/restore-$(date +%s)\"\n\necho \"=== POSTGRESQL RESTORE ===\"\necho \"Archive: $ARCHIVE\"\nread -p \"This will OVERWRITE the database. Continue? (yes/no): \" confirm\n[[ \"$confirm\" != \"yes\" ]] && exit 1\n\n# 1. Stop dependent services\necho \"[1/5] Stopping services...\"\ncd /var/www/CerniqAPP/infra/docker\ndocker compose stop api workers 2>/dev/null || true\n\n# 2. Extract backup\necho \"[2/5] Extracting backup...\"\nmkdir -p $RESTORE_DIR\ncd $RESTORE_DIR\nborg extract $BORG_REPO::$ARCHIVE var/backups/cerniq/\n\n# 3. Restore database\necho \"[3/5] Restoring database...\"\ndocker exec cerniq-postgres psql -U postgres -c \"DROP DATABASE IF EXISTS cerniq_production;\"\ndocker exec cerniq-postgres psql -U postgres -c \"CREATE DATABASE cerniq_production OWNER cerniq;\"\ncat $RESTORE_DIR/var/backups/cerniq/cerniq_production.dump | docker exec -i cerniq-postgres pg_restore -U cerniq -d cerniq_production\n\n# 4. Verify\necho \"[4/5] Verifying...\"\ndocker exec cerniq-postgres psql -U cerniq -d cerniq_production -c \"SELECT count(*) FROM gold_companies;\" || echo \"Verify manually\"\n\n# 5. Restart services\necho \"[5/5] Restarting services...\"\ndocker compose up -d api workers\n\n# Cleanup\nrm -rf $RESTORE_DIR\n\necho \"=== RESTORE COMPLETE ===\"\n```\n\n2. Test restore procedure (în environment de test!):\n```bash\n# List available backups\nborg list $BORG_REPO\n\n# Test extract (dry-run)\nborg extract --dry-run $BORG_REPO::latest\n\n# Verify backup integrity\nborg check $BORG_REPO\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/scripts",
  "restrictii_antihalucinatie": [
    "INCLUDE confirmare interactivă înainte de restore",
    "STOP dependent services înainte de restore",
    "FOLOSEȘTE pg_restore pentru format custom, nu psql pentru SQL plain",
    "VERIFICĂ restaurarea cu query de test",
    "CLEANUP fișiere temporare după restore"
  ],
  "validare_task": "1. Script restore-postgres.sh creat cu permisiuni +x\n2. Include confirmare interactivă\n3. Stops/starts dependent services\n4. Uses pg_restore correctly\n5. Cleanup temporare după restore",
  "outcome": "Procedură restore funcțională și testată"
}
```

---

## FAZA F0.8: SECURITY HARDENING (COMPLET)

## F0.8.1 Security Implementation

```json
{
  "taskID": "F0.8.1.T001",
  "denumire_task": "Implementare Docker secrets pentru toate credențialele",
  "context_anterior": "Backup strategy configurat. Acum implementăm security hardening conform ADR-0017.",
  "descriere_task": "Ești un expert în Docker secrets și security best practices. Implementează secrets management.\n\n1. Creează directorul secrets:\n```bash\nmkdir -p /var/www/CerniqAPP/secrets\nchmod 700 /var/www/CerniqAPP/secrets\n```\n\n2. Generează toate secretele:\n```bash\n# PostgreSQL password\nopenssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > /var/www/CerniqAPP/secrets/postgres_password\n\n# JWT secret\nopenssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64 > /var/www/CerniqAPP/secrets/jwt_secret\n\n# Cookie secret\nopenssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32 > /var/www/CerniqAPP/secrets/cookie_secret\n\n# Set permissions\nchmod 600 /var/www/CerniqAPP/secrets/*\n```\n\n3. Adaugă secrets în docker-compose.yml:\n```yaml\nsecrets:\n  postgres_password:\n    file: ../../secrets/postgres_password\n  jwt_secret:\n    file: ../../secrets/jwt_secret\n  cookie_secret:\n    file: ../../secrets/cookie_secret\n\nservices:\n  postgres:\n    secrets:\n      - postgres_password\n    environment:\n      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password\n\n  api:\n    secrets:\n      - postgres_password\n      - jwt_secret\n      - cookie_secret\n    environment:\n      DATABASE_PASSWORD_FILE: /run/secrets/postgres_password\n      JWT_SECRET_FILE: /run/secrets/jwt_secret\n      COOKIE_SECRET_FILE: /run/secrets/cookie_secret\n```\n\n4. Adaugă în .gitignore:\n```\nsecrets/\n!secrets/.gitkeep\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "NICIODATĂ secrete în environment variables în production",
    "FOLOSEȘTE _FILE suffix pattern pentru Docker secrets",
    "PERMISIUNI 700 pe director, 600 pe fișiere",
    "ADAUGĂ secrets/ în .gitignore",
    "NU stoca secrete în docker-compose.yml direct"
  ],
  "validare_task": "1. Directorul secrets/ există cu permisiuni 700\n2. Toate fișierele secret au permisiuni 600\n3. docker-compose.yml folosește secrets section\n4. Services folosesc _FILE suffix pentru environment vars\n5. secrets/ este în .gitignore",
  "outcome": "Docker secrets implementat pentru toate credențialele"
}
```

```json
{
  "taskID": "F0.8.1.T002",
  "denumire_task": "Configurare UFW firewall cu ufw-docker",
  "context_anterior": "Docker secrets implementat. Acum configurăm firewall-ul.",
  "descriere_task": "Ești un expert în network security și Linux firewalls. Configurează UFW pentru Docker.\n\n1. Instalează UFW și ufw-docker:\n```bash\nsudo apt install ufw -y\n\n# Install ufw-docker\nsudo wget -O /usr/local/bin/ufw-docker \\\n  https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker\nsudo chmod +x /usr/local/bin/ufw-docker\n\n# Install iptables rules\nsudo ufw-docker install\n```\n\n2. Configurează reguli de bază:\n```bash\n# Reset UFW\nsudo ufw --force reset\n\n# Default policies\nsudo ufw default deny incoming\nsudo ufw default allow outgoing\n\n# Allow SSH (din IP-uri admin)\nsudo ufw allow from YOUR_ADMIN_IP to any port 22 proto tcp comment 'SSH Admin'\n\n# Allow HTTP/HTTPS (pentru Traefik)\nsudo ufw allow 80/tcp comment 'HTTP'\nsudo ufw allow 443/tcp comment 'HTTPS'\nsudo ufw allow 443/udp comment 'HTTP/3 QUIC'\n\n# Enable UFW\nsudo ufw --force enable\n```\n\n3. Verifică că PostgreSQL și Redis NU sunt expuse:\n```bash\n# Acestea trebuie să returneze gol sau doar 127.0.0.1\nss -tlnp | grep ':64032'\nss -tlnp | grep ':64039'\n```\n\n4. Test extern:\n```bash\n# De pe altă mașină\nnmap -p 5432,6379,9000 YOUR_SERVER_IP\n# Toate trebuie să fie filtered/closed\n```",
  "director_implementare": "/",
  "restrictii_antihalucinatie": [
    "INSTALEAZĂ ufw-docker pentru compatibilitate cu Docker",
    "PostgreSQL (5432) și Redis (6379) NU trebuie expuse public",
    "SSH doar din IP-uri administrative cunoscute",
    "VERIFICĂ că porturile interne NU sunt accesibile extern",
    "FOLOSEȘTE ufw-docker install pentru reguli iptables corecte"
  ],
  "validare_task": "1. UFW și ufw-docker instalate\n2. Default deny incoming\n3. Doar 22, 80, 443 permise\n4. PostgreSQL și Redis NU sunt accesibile extern\n5. nmap extern confirmă porturi închise",
  "outcome": "Firewall UFW configurat cu Docker compatibility"
}
```

```json
{
  "taskID": "F0.8.1.T003",
  "denumire_task": "Hardening containere Docker (no-new-privileges, cap_drop)",
  "context_anterior": "Firewall configurat. Acum aplicăm container hardening.",
  "descriere_task": "Ești un expert în container security. Aplică hardening pe toate containerele.\n\nActualizează docker-compose.yml cu security options pentru fiecare serviciu:\n\n```yaml\nservices:\n  postgres:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    cap_add:\n      - CHOWN\n      - SETGID\n      - SETUID\n      - DAC_OVERRIDE\n      - FOWNER\n\n  redis:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    user: \"999:999\"\n    read_only: true\n    tmpfs:\n      - /tmp:size=100M\n\n  api:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    user: \"1000:1000\"\n    read_only: true\n    tmpfs:\n      - /tmp:size=500M\n      - /home/node/.npm:size=200M\n\n  traefik:\n    security_opt:\n      - no-new-privileges:true\n    cap_drop:\n      - ALL\n    cap_add:\n      - NET_BIND_SERVICE\n    read_only: true\n```\n\nPentru fiecare serviciu:\n- `security_opt: no-new-privileges:true` - previne privilege escalation\n- `cap_drop: ALL` - elimină toate capabilities\n- `cap_add` - adaugă doar ce e necesar\n- `read_only: true` - filesystem read-only\n- `tmpfs` - mount pentru fișiere temporare",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "TOATE containerele TREBUIE no-new-privileges:true",
    "cap_drop: ALL pe toate, apoi cap_add doar ce e necesar",
    "read_only: true cu tmpfs pentru temporare",
    "PostgreSQL are nevoie de capabilities specifice pentru startup",
    "Traefik are nevoie de NET_BIND_SERVICE pentru port 80/443"
  ],
  "validare_task": "1. Toate serviciile au no-new-privileges:true\n2. Toate serviciile au cap_drop: ALL\n3. cap_add conține doar capabilities necesare\n4. Services cu read_only au tmpfs pentru /tmp\n5. Containerele pornesc corect cu noile setări",
  "outcome": "Containere Docker hardened cu minimal privileges"
}
```

```json
{
  "taskID": "F0.8.1.T004",
  "denumire_task": "Configurare TLS/SSL și certificate management",
  "context_anterior": "Container hardening aplicat. Acum verificăm TLS configuration.",
  "descriere_task": "Ești un expert în TLS/SSL și certificate management. Verifică și optimizează configurația.\n\n1. Verifică configurația Traefik pentru TLS:\n```yaml\n# traefik.yml\ncertificatesResolvers:\n  letsencrypt:\n    acme:\n      email: admin@cerniq.app\n      storage: /etc/traefik/acme/acme.json\n      httpChallenge:\n        entryPoint: web\n\n# dynamic/tls.yml\ntls:\n  options:\n    default:\n      minVersion: VersionTLS12\n      cipherSuites:\n        - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384\n        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384\n        - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256\n        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256\n        - TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305\n        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305\n      sniStrict: true\n```\n\n2. Verifică permisiuni acme.json:\n```bash\nchmod 600 /var/www/CerniqAPP/infra/docker/acme/acme.json\nls -la /var/www/CerniqAPP/infra/docker/acme/\n```\n\n3. Test SSL Labs (după deploy):\n```bash\n# Online: https://www.ssllabs.com/ssltest/analyze.html?d=app.cerniq.app\n# CLI:\ncurl -I https://app.cerniq.app\n# Verifică headers: Strict-Transport-Security, X-Frame-Options, etc.\n```\n\n4. Verifică HSTS și security headers în Traefik:\n```yaml\nhttp:\n  middlewares:\n    secure-headers:\n      headers:\n        stsSeconds: 31536000\n        stsIncludeSubdomains: true\n        stsPreload: true\n        forceSTSHeader: true\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker/config/traefik",
  "restrictii_antihalucinatie": [
    "TLS minVersion TREBUIE să fie TLS12 (TLS11 și mai vechi sunt depreciate)",
    "acme.json TREBUIE permisiuni 600",
    "HSTS cu stsSeconds minim 31536000 (1 an)",
    "sniStrict: true pentru a preveni downgrade attacks",
    "INCLUDE doar cipher suites moderne (ECDHE + AES-GCM sau CHACHA20)"
  ],
  "validare_task": "1. TLS minVersion este VersionTLS12\n2. Cipher suites sunt moderne (ECDHE)\n3. acme.json are permisiuni 600\n4. HSTS configurat cu 1 an minimum\n5. SSL Labs score A sau A+",
  "outcome": "TLS/SSL configurat optim cu A+ rating potențial"
}
```

## FAZA F0.9: API BOILERPLATE (FASTIFY)

```json
{
  "taskID": "F0.9.1.T001",
  "denumire_task": "Creare entry point Fastify cu plugin system",
  "context_anterior": "Monorepo configurat în F0.6. Acum creăm structura de bază pentru API-ul Fastify.",
  "descriere_task": "Ești un expert erudit backend cu expertiză avansată în Fastify și TypeScript. Vreau să dezvolți entry point-ul principal pentru API-ul Cerniq.app.\n\nCreează fișierul /var/www/CerniqAPP/apps/api/src/index.ts:\n\n```typescript\nimport Fastify from 'fastify';\nimport { ZodTypeProvider } from 'fastify-type-provider-zod';\nimport closeWithGrace from 'close-with-grace';\nimport { registerPlugins } from './plugins';\nimport { registerRoutes } from './routes';\nimport { logger } from './shared/logger';\n\nconst envToLogger = {\n  development: {\n    transport: {\n      target: 'pino-pretty',\n      options: { colorize: true },\n    },\n  },\n  production: true,\n  test: false,\n};\n\nasync function buildApp() {\n  const app = Fastify({\n    logger: envToLogger[process.env.NODE_ENV as keyof typeof envToLogger] ?? true,\n    genReqId: () => crypto.randomUUID(),\n  }).withTypeProvider<ZodTypeProvider>();\n\n  // Register plugins (CORS, Helmet, JWT, etc.)\n  await registerPlugins(app);\n\n  // Register routes\n  await registerRoutes(app);\n\n  return app;\n}\n\nasync function start() {\n  const app = await buildApp();\n\n  const host = process.env.HOST ?? '0.0.0.0';\n  const port = parseInt(process.env.PORT ?? '64000', 10);\n\n  await app.listen({ host, port });\n\n  logger.info({ host, port }, 'Server started');\n\n  // Graceful shutdown\n  closeWithGrace({ delay: 30000 }, async ({ signal, err }) => {\n    if (err) {\n      app.log.error({ err }, 'Server closing due to error');\n    } else {\n      app.log.info({ signal }, 'Server closing due to signal');\n    }\n    await app.close();\n  });\n}\n\nstart().catch((err) => {\n  logger.error({ err }, 'Failed to start server');\n  process.exit(1);\n});\n```\n\nAcest entry point:\n- Configurează Fastify cu Zod type provider\n- Înregistrează plugins și routes modular\n- Implementează graceful shutdown\n- Folosește pino logger configurat per environment",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src",
  "restrictii_antihalucinatie": [
    "NU folosi Express patterns - Fastify are propria paradigmă",
    "FOLOSEȘTE ZodTypeProvider pentru type safety",
    "INCLUDE graceful shutdown cu close-with-grace",
    "genReqId TREBUIE să genereze UUID pentru request tracing",
    "NU hardcodează port-ul - citește din environment"
  ],
  "validare_task": "1. Fișierul index.ts există și compilează fără erori TypeScript\n2. Fastify este configurat cu ZodTypeProvider\n3. Graceful shutdown este implementat\n4. Logger este configurat per environment\n5. Port și host sunt configurabile via environment",
  "outcome": "Entry point Fastify creat cu plugin system și graceful shutdown"
}
```

```json
{
  "taskID": "F0.9.1.T002",
  "denumire_task": "Creare plugin system pentru Fastify",
  "context_anterior": "Entry point creat în F0.9.1.T001 care apelează registerPlugins. Acum creăm sistemul de plugins.",
  "descriere_task": "Ești un expert Fastify cu experiență în plugin architecture. Creează sistemul de plugins.\n\nCreează /var/www/CerniqAPP/apps/api/src/plugins/index.ts:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport cors from '@fastify/cors';\nimport helmet from '@fastify/helmet';\nimport jwt from '@fastify/jwt';\nimport cookie from '@fastify/cookie';\nimport { ZodTypeProvider } from 'fastify-type-provider-zod';\nimport { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';\n\nexport async function registerPlugins(app: FastifyInstance) {\n  // Zod validation\n  app.setValidatorCompiler(validatorCompiler);\n  app.setSerializerCompiler(serializerCompiler);\n\n  // Security\n  await app.register(helmet, {\n    contentSecurityPolicy: {\n      directives: {\n        defaultSrc: [\"'self'\"],\n        styleSrc: [\"'self'\", \"'unsafe-inline'\"],\n        scriptSrc: [\"'self'\"],\n        imgSrc: [\"'self'\", 'data:', 'https:'],\n      },\n    },\n  });\n\n  // CORS\n  await app.register(cors, {\n    origin: [\n      'https://app.cerniq.app',\n      'https://admin.cerniq.app',\n      ...(process.env.NODE_ENV === 'development'\n        ? ['http://localhost:64010', 'http://localhost:5173']\n        : []),\n    ],\n    credentials: true,\n    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],\n  });\n\n  // Cookies\n  await app.register(cookie, {\n    secret: process.env.COOKIE_SECRET,\n    hook: 'onRequest',\n    parseOptions: {},\n  });\n\n  // JWT\n  await app.register(jwt, {\n    secret: process.env.JWT_SECRET!,\n    cookie: {\n      cookieName: 'token',\n      signed: false,\n    },\n    sign: {\n      expiresIn: '15m',\n    },\n  });\n\n  // Custom plugins\n  await app.register(tenantContextPlugin);\n  await app.register(requestLoggingPlugin);\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/plugins",
  "restrictii_antihalucinatie": [
    "INCLUDE Zod validator și serializer compilers",
    "CORS origins TREBUIE să fie configurabile și restrictive",
    "JWT secret NU trebuie hardcodat - citește din environment",
    "INCLUDE helmet pentru security headers",
    "ÎNREGISTREAZĂ plugins în ordinea corectă (security first)"
  ],
  "validare_task": "1. plugins/index.ts există și exportă registerPlugins\n2. Zod compilers sunt setate\n3. CORS este configurat cu origins specifice\n4. JWT este configurat cu cookie support\n5. Helmet este configurat cu CSP",
  "outcome": "Sistem de plugins Fastify complet cu security și validation"
}
```

```json
{
  "taskID": "F0.9.1.T003",
  "denumire_task": "Creare error handling middleware standardizat",
  "context_anterior": "Plugin system creat. Acum implementăm error handling conform ADR-0010.",
  "descriere_task": "Ești un expert în error handling patterns. Creează sistemul de error handling.\n\nCreează /var/www/CerniqAPP/apps/api/src/shared/errors.ts:\n\n```typescript\nimport { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';\nimport { ZodError } from 'zod';\n\n// Base error class\nexport class AppError extends Error {\n  constructor(\n    public code: string,\n    message: string,\n    public statusCode: number = 500,\n    public details?: unknown,\n  ) {\n    super(message);\n    this.name = 'AppError';\n    Error.captureStackTrace(this, this.constructor);\n  }\n}\n\n// Specific error classes\nexport class ValidationError extends AppError {\n  constructor(errors: ZodError | unknown) {\n    const details = errors instanceof ZodError ? errors.errors : errors;\n    super('VALIDATION_ERROR', 'Validation failed', 400, details);\n  }\n}\n\nexport class NotFoundError extends AppError {\n  constructor(resource: string, id?: string) {\n    const message = id\n      ? `${resource} with id ${id} not found`\n      : `${resource} not found`;\n    super('NOT_FOUND', message, 404);\n  }\n}\n\nexport class UnauthorizedError extends AppError {\n  constructor(message = 'Unauthorized') {\n    super('UNAUTHORIZED', message, 401);\n  }\n}\n\nexport class ForbiddenError extends AppError {\n  constructor(message = 'Forbidden') {\n    super('FORBIDDEN', message, 403);\n  }\n}\n\nexport class ConflictError extends AppError {\n  constructor(message: string) {\n    super('CONFLICT', message, 409);\n  }\n}\n\n// Error response interface\ninterface ErrorResponse {\n  error: {\n    code: string;\n    message: string;\n    details?: unknown;\n    stack?: string;\n  };\n  requestId: string;\n  timestamp: string;\n}\n\n// Global error handler\nexport function registerErrorHandler(app: FastifyInstance) {\n  app.setErrorHandler(\n    (error: Error | AppError, request: FastifyRequest, reply: FastifyReply) => {\n      const isAppError = error instanceof AppError;\n      const statusCode = isAppError ? error.statusCode : 500;\n      const code = isAppError ? error.code : 'INTERNAL_ERROR';\n\n      // Log error\n      request.log.error({\n        err: error,\n        requestId: request.id,\n        path: request.url,\n        method: request.method,\n      });\n\n      // Build response\n      const response: ErrorResponse = {\n        error: {\n          code,\n          message: error.message,\n          details: isAppError ? error.details : undefined,\n          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),\n        },\n        requestId: request.id,\n        timestamp: new Date().toISOString(),\n      };\n\n      reply.status(statusCode).send(response);\n    },\n  );\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "TOATE erorile custom TREBUIE să extindă AppError",
    "Stack trace se include DOAR în development",
    "requestId TREBUIE inclus în response pentru tracing",
    "Error logging TREBUIE să includă context (path, method)",
    "NU expune detalii interne în production"
  ],
  "validare_task": "1. shared/errors.ts există cu toate clasele de erori\n2. AppError este clasa de bază\n3. registerErrorHandler setează error handler global\n4. Stack trace e condiționat de NODE_ENV\n5. Response include requestId și timestamp",
  "outcome": "Sistem de error handling standardizat conform ADR-0010"
}
```

```json
{
  "taskID": "F0.9.1.T004",
  "denumire_task": "Creare request logging cu Pino și correlation ID",
  "context_anterior": "Error handling implementat. Acum adăugăm logging standardizat conform ADR-0023.",
  "descriere_task": "Ești un expert în observability și logging. Implementează logging cu Pino.\n\nCreează /var/www/CerniqAPP/apps/api/src/shared/logger.ts:\n\n```typescript\nimport pino from 'pino';\n\nexport const logger = pino({\n  level: process.env.LOG_LEVEL ?? 'info',\n  redact: {\n    paths: [\n      'req.headers.authorization',\n      'req.headers.cookie',\n      'password',\n      'email',\n      'phone',\n      'cui',\n      '*.password',\n      '*.email',\n      '*.phone',\n    ],\n    remove: true,\n  },\n  formatters: {\n    level: (label) => ({ level: label }),\n  },\n  timestamp: pino.stdTimeFunctions.isoTime,\n  base: {\n    service: 'cerniq-api',\n    version: process.env.APP_VERSION ?? '0.1.0',\n    environment: process.env.NODE_ENV ?? 'development',\n  },\n});\n\n// Create child logger with request context\nexport function createRequestLogger(requestId: string, tenantId?: string) {\n  return logger.child({\n    requestId,\n    tenantId,\n  });\n}\n```\n\nCreează plugin pentru request logging:\n/var/www/CerniqAPP/apps/api/src/plugins/request-logging.ts:\n\n```typescript\nimport { FastifyInstance, FastifyPluginAsync } from 'fastify';\nimport fp from 'fastify-plugin';\n\nconst requestLoggingPlugin: FastifyPluginAsync = async (app: FastifyInstance) => {\n  app.addHook('onRequest', async (request) => {\n    request.log.info({\n      method: request.method,\n      url: request.url,\n      correlationId: request.headers['x-correlation-id'],\n    }, 'Request received');\n  });\n\n  app.addHook('onResponse', async (request, reply) => {\n    request.log.info({\n      method: request.method,\n      url: request.url,\n      statusCode: reply.statusCode,\n      responseTime: reply.elapsedTime,\n    }, 'Request completed');\n  });\n};\n\nexport default fp(requestLoggingPlugin, {\n  name: 'request-logging',\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src",
  "restrictii_antihalucinatie": [
    "PII (email, phone, password) TREBUIE redacted",
    "INCLUDE correlation ID din header X-Correlation-Id",
    "FOLOSEȘTE pino.stdTimeFunctions.isoTime pentru timestamp",
    "base object TREBUIE să includă service, version, environment",
    "LOG response time în onResponse hook"
  ],
  "validare_task": "1. shared/logger.ts există cu configurare Pino\n2. Redaction include email, phone, password, cui\n3. plugins/request-logging.ts înregistrează hooks\n4. onRequest și onResponse logging funcționează\n5. Correlation ID este logat",
  "outcome": "Logging standardizat cu Pino, PII redaction și correlation IDs"
}
```

```json
{
  "taskID": "F0.9.1.T005",
  "denumire_task": "Creare health check endpoints",
  "context_anterior": "Logging implementat. Acum adăugăm health checks conform ADR-0025.",
  "descriere_task": "Ești un expert în health check patterns pentru microservicii. Implementează health endpoints.\n\nCreează /var/www/CerniqAPP/apps/api/src/routes/health.ts:\n\n```typescript\nimport { FastifyInstance, FastifyPluginAsync } from 'fastify';\nimport { z } from 'zod';\nimport { sql } from 'drizzle-orm';\nimport { db } from '@cerniq/db';\n\nconst HealthResponseSchema = z.object({\n  status: z.enum(['ok', 'degraded', 'unhealthy']),\n  timestamp: z.string(),\n  version: z.string(),\n  uptime: z.number(),\n});\n\nconst DependencyCheckSchema = z.object({\n  name: z.string(),\n  status: z.enum(['healthy', 'unhealthy']),\n  latency: z.number().optional(),\n  error: z.string().optional(),\n});\n\nconst healthRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {\n  // Liveness probe - just confirms app is running\n  app.get('/health/live', {\n    schema: {\n      response: { 200: z.object({ status: z.literal('ok') }) },\n    },\n  }, async () => {\n    return { status: 'ok' as const };\n  });\n\n  // Readiness probe - confirms app can serve traffic\n  app.get('/health/ready', {\n    schema: {\n      response: { 200: HealthResponseSchema },\n    },\n  }, async () => {\n    const checks = await Promise.allSettled([\n      checkDatabase(),\n      checkRedis(),\n    ]);\n\n    const allHealthy = checks.every(\n      (c) => c.status === 'fulfilled' && c.value.status === 'healthy'\n    );\n\n    return {\n      status: allHealthy ? 'ok' : 'degraded',\n      timestamp: new Date().toISOString(),\n      version: process.env.APP_VERSION ?? '0.1.0',\n      uptime: process.uptime(),\n    };\n  });\n\n  // Detailed dependency checks\n  app.get('/health/deps', {\n    schema: {\n      response: { 200: z.object({ dependencies: z.array(DependencyCheckSchema) }) },\n    },\n  }, async () => {\n    const [dbCheck, redisCheck] = await Promise.allSettled([\n      checkDatabase(),\n      checkRedis(),\n    ]);\n\n    return {\n      dependencies: [\n        dbCheck.status === 'fulfilled' ? dbCheck.value : { name: 'postgres', status: 'unhealthy', error: 'Check failed' },\n        redisCheck.status === 'fulfilled' ? redisCheck.value : { name: 'redis', status: 'unhealthy', error: 'Check failed' },\n      ],\n    };\n  });\n};\n\nasync function checkDatabase(): Promise<z.infer<typeof DependencyCheckSchema>> {\n  const start = Date.now();\n  try {\n    await db.execute(sql`SELECT 1`);\n    return {\n      name: 'postgres',\n      status: 'healthy',\n      latency: Date.now() - start,\n    };\n  } catch (error) {\n    return {\n      name: 'postgres',\n      status: 'unhealthy',\n      error: error instanceof Error ? error.message : 'Unknown error',\n    };\n  }\n}\n\nasync function checkRedis(): Promise<z.infer<typeof DependencyCheckSchema>> {\n  const start = Date.now();\n  try {\n    // Redis check implementation\n    return {\n      name: 'redis',\n      status: 'healthy',\n      latency: Date.now() - start,\n    };\n  } catch (error) {\n    return {\n      name: 'redis',\n      status: 'unhealthy',\n      error: error instanceof Error ? error.message : 'Unknown error',\n    };\n  }\n}\n\nexport default healthRoutes;\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/routes",
  "restrictii_antihalucinatie": [
    "INCLUDE 3 endpoints: /health/live, /health/ready, /health/deps",
    "Liveness probe NU verifică dependențe - doar că app-ul rulează",
    "Readiness probe verifică că poate servi trafic",
    "INCLUDE latency în dependency checks",
    "FOLOSEȘTE Promise.allSettled pentru a nu fail-ui la prima eroare"
  ],
  "validare_task": "1. routes/health.ts există cu toate 3 endpoints\n2. /health/live returnează doar { status: 'ok' }\n3. /health/ready verifică database și redis\n4. /health/deps returnează detalii pentru fiecare dependency\n5. Latency este măsurat pentru fiecare check",
  "outcome": "Health check endpoints complete conform ADR-0025"
}
```

```json
{
  "taskID": "F0.9.1.T006",
  "denumire_task": "Creare graceful shutdown handler complet",
  "context_anterior": "Health checks implementate. Acum completăm graceful shutdown conform ADR-0026.",
  "descriere_task": "Ești un expert în process lifecycle management. Completează graceful shutdown.\n\nCreează /var/www/CerniqAPP/apps/api/src/shared/shutdown.ts:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport { logger } from './logger';\n\nconst SHUTDOWN_TIMEOUT = 30000; // 30 seconds\n\ninterface ShutdownableResource {\n  name: string;\n  close: () => Promise<void>;\n}\n\nconst resources: ShutdownableResource[] = [];\n\nexport function registerShutdownResource(resource: ShutdownableResource) {\n  resources.push(resource);\n  logger.info({ resource: resource.name }, 'Registered shutdown resource');\n}\n\nexport function setupGracefulShutdown(app: FastifyInstance) {\n  let isShuttingDown = false;\n\n  async function shutdown(signal: string) {\n    if (isShuttingDown) {\n      logger.warn('Shutdown already in progress');\n      return;\n    }\n    isShuttingDown = true;\n\n    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');\n\n    // Create timeout for forced exit\n    const forceExitTimeout = setTimeout(() => {\n      logger.error('Shutdown timeout exceeded, forcing exit');\n      process.exit(1);\n    }, SHUTDOWN_TIMEOUT);\n\n    try {\n      // 1. Stop accepting new requests\n      logger.info('Closing HTTP server...');\n      await app.close();\n      logger.info('HTTP server closed');\n\n      // 2. Close all registered resources\n      for (const resource of resources) {\n        try {\n          logger.info({ resource: resource.name }, 'Closing resource...');\n          await resource.close();\n          logger.info({ resource: resource.name }, 'Resource closed');\n        } catch (error) {\n          logger.error({ resource: resource.name, error }, 'Error closing resource');\n        }\n      }\n\n      clearTimeout(forceExitTimeout);\n      logger.info('Graceful shutdown complete');\n      process.exit(0);\n    } catch (error) {\n      logger.error({ error }, 'Error during shutdown');\n      clearTimeout(forceExitTimeout);\n      process.exit(1);\n    }\n  }\n\n  // Register signal handlers\n  process.on('SIGTERM', () => shutdown('SIGTERM'));\n  process.on('SIGINT', () => shutdown('SIGINT'));\n\n  // Handle uncaught errors\n  process.on('uncaughtException', (error) => {\n    logger.fatal({ error }, 'Uncaught exception');\n    shutdown('UNCAUGHT_EXCEPTION');\n  });\n\n  process.on('unhandledRejection', (reason) => {\n    logger.fatal({ reason }, 'Unhandled rejection');\n    shutdown('UNHANDLED_REJECTION');\n  });\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "INCLUDE timeout pentru forced exit (30s)",
    "NU permite shutdown multiplu simultan",
    "ÎNCHIDE HTTP server PRIMUL",
    "LOG fiecare pas al shutdown-ului",
    "HANDLE uncaughtException și unhandledRejection"
  ],
  "validare_task": "1. shared/shutdown.ts există\n2. registerShutdownResource permite înregistrarea resurselor\n3. SIGTERM și SIGINT sunt handled\n4. Timeout de 30s pentru forced exit\n5. uncaughtException și unhandledRejection trigger shutdown",
  "outcome": "Graceful shutdown complet cu resource cleanup și timeout"
}
```

```json
{
  "taskID": "F0.9.1.T007",
  "denumire_task": "Creare OpenTelemetry instrumentation",
  "context_anterior": "Shutdown implementat. Acum adăugăm OpenTelemetry pentru tracing.",
  "descriere_task": "Ești un expert OpenTelemetry. Implementează instrumentation pentru Fastify.\n\nCreează /var/www/CerniqAPP/apps/api/src/shared/telemetry.ts:\n\n```typescript\nimport { NodeSDK } from '@opentelemetry/sdk-node';\nimport { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';\nimport { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';\nimport { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';\nimport { Resource } from '@opentelemetry/resources';\nimport { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';\nimport { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';\n\nconst resource = new Resource({\n  [SEMRESATTRS_SERVICE_NAME]: 'cerniq-api',\n  [SEMRESATTRS_SERVICE_VERSION]: process.env.APP_VERSION ?? '0.1.0',\n  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',\n});\n\nconst traceExporter = new OTLPTraceExporter({\n  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:64070',\n});\n\nconst metricExporter = new OTLPMetricExporter({\n  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:64070',\n});\n\nexport const sdk = new NodeSDK({\n  resource,\n  traceExporter,\n  metricReader: new PeriodicExportingMetricReader({\n    exporter: metricExporter,\n    exportIntervalMillis: 60000,\n  }),\n  instrumentations: [\n    getNodeAutoInstrumentations({\n      '@opentelemetry/instrumentation-http': {\n        ignoreIncomingRequestHook: (request) => {\n          // Ignore health checks\n          return request.url?.startsWith('/health') ?? false;\n        },\n      },\n      '@opentelemetry/instrumentation-fs': {\n        enabled: false, // Too noisy\n      },\n    }),\n  ],\n});\n\nexport function startTelemetry() {\n  sdk.start();\n  console.log('OpenTelemetry SDK started');\n\n  process.on('SIGTERM', async () => {\n    await sdk.shutdown();\n    console.log('OpenTelemetry SDK shut down');\n  });\n}\n```\n\nIMPORTANT: Acest fișier trebuie importat PRIMUL în entry point, înainte de orice alt import.",
  "director_implementare": "/var/www/CerniqAPP/apps/api/src/shared",
  "restrictii_antihalucinatie": [
    "OpenTelemetry TREBUIE inițializat PRIMUL înainte de orice alt import",
    "EXCLUDE health checks din tracing pentru a nu polua datele",
    "INCLUDE resource attributes conform semantic conventions",
    "EXPORTĂ metricile periodic (60s)",
    "SHUTDOWN SDK la SIGTERM"
  ],
  "validare_task": "1. shared/telemetry.ts există\n2. Resource include service name, version, environment\n3. Health checks sunt ignorate\n4. OTLPTraceExporter și OTLPMetricExporter sunt configurate\n5. SDK se oprește la SIGTERM",
  "outcome": "OpenTelemetry instrumentation completă pentru Fastify"
}
```

```json
{
  "taskID": "F0.9.1.T008",
  "denumire_task": "Test și verificare API boilerplate complet",
  "context_anterior": "Toate componentele API create. Acum testăm întregul boilerplate.",
  "descriere_task": "Ești un expert QA. Verifică că API boilerplate-ul funcționează corect.\n\nPași de verificare:\n\n1. Build API package:\n```bash\ncd /var/www/CerniqAPP\npnpm --filter @cerniq/api build\n```\n\n2. Start în development mode:\n```bash\npnpm --filter @cerniq/api dev\n```\n\n3. Verifică health endpoints:\n```bash\ncurl http://localhost:64000/health/live\n# Expected: {\"status\":\"ok\"}\n\ncurl http://localhost:64000/health/ready\n# Expected: {\"status\":\"ok\",\"timestamp\":\"...\",\"version\":\"0.1.0\",\"uptime\":...}\n```\n\n4. Verifică error handling:\n```bash\ncurl http://localhost:64000/nonexistent\n# Expected: {\"error\":{\"code\":\"NOT_FOUND\",...},\"requestId\":\"...\"}\n```\n\n5. Verifică logging:\n```bash\n# Check logs contain structured JSON with requestId\n```\n\n6. Test graceful shutdown:\n```bash\n# Send SIGTERM and verify clean shutdown in logs\n```\n\nDocumentează orice probleme găsite și soluțiile în /var/www/CerniqAPP/docs/api/troubleshooting.md",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "NU ignora erorile de build - rezolvă-le înainte de a continua",
    "VERIFICĂ toate health endpoints",
    "VERIFICĂ că logs sunt în format JSON structurat",
    "TEST graceful shutdown funcționează",
    "DOCUMENTEAZĂ orice probleme găsite"
  ],
  "validare_task": "1. Build completează fără erori\n2. Server pornește pe port 4000\n3. /health/live returnează status ok\n4. /health/ready returnează status și version\n5. Erori returnează format standardizat cu requestId\n6. Logs sunt JSON structurat\n7. Graceful shutdown funcționează",
  "outcome": "API boilerplate verificat și funcțional complet"
}
```

---

---

## FAZA F0.10: DATABASE SCHEMA FOUNDATION (COMPLET)

## F0.10.1 Drizzle ORM și Schema Setup

```json
{
  "taskID": "F0.10.1.T001",
  "denumire_task": "Configurare Drizzle ORM connection și client",
  "context_anterior": "API boilerplate și infrastructure sunt funcționale. Acum configurăm Drizzle ORM conform ADR-0007.",
  "descriere_task": "Ești un expert în Drizzle ORM și TypeScript. Configurează connection-ul la PostgreSQL.\n\nCreează `/var/www/CerniqAPP/packages/db/src/client.ts`:\n\n```typescript\nimport { drizzle } from 'drizzle-orm/node-postgres';\nimport { Pool } from 'pg';\nimport * as schema from './schema';\n\nfunction getConnectionString(): string {\n  // Support Docker secrets pattern\n  if (process.env.DATABASE_URL_FILE) {\n    const fs = require('fs');\n    return fs.readFileSync(process.env.DATABASE_URL_FILE, 'utf8').trim();\n  }\n  \n  if (process.env.DATABASE_URL) {\n    return process.env.DATABASE_URL;\n  }\n  \n  throw new Error('DATABASE_URL or DATABASE_URL_FILE required');\n}\n\nconst pool = new Pool({\n  connectionString: getConnectionString(),\n  max: parseInt(process.env.DATABASE_POOL_MAX ?? '20'),\n  min: parseInt(process.env.DATABASE_POOL_MIN ?? '2'),\n  idleTimeoutMillis: 30000,\n  connectionTimeoutMillis: 5000,\n});\n\nexport const db = drizzle(pool, { \n  schema,\n  logger: process.env.NODE_ENV === 'development',\n});\n\nexport type Database = typeof db;\n\n// Health check helper\nexport async function checkDatabaseConnection(): Promise<boolean> {\n  try {\n    await pool.query('SELECT 1');\n    return true;\n  } catch {\n    return false;\n  }\n}\n\n// Graceful shutdown\nexport async function closeDatabase(): Promise<void> {\n  await pool.end();\n}\n```\n\nCreează `/var/www/CerniqAPP/packages/db/drizzle.config.ts`:\n\n```typescript\nimport { defineConfig } from 'drizzle-kit';\n\nexport default defineConfig({\n  schema: './src/schema/index.ts',\n  out: './drizzle',\n  dialect: 'postgresql',\n  dbCredentials: {\n    url: process.env.DATABASE_URL!,\n  },\n  verbose: true,\n  strict: true,\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src",
  "restrictii_antihalucinatie": [
    "SUPORTĂ _FILE pattern pentru Docker secrets",
    "INCLUDE connection pooling cu limite configurabile",
    "LOGGER doar în development",
    "INCLUDE helper pentru health check",
    "INCLUDE graceful shutdown cu pool.end()"
  ],
  "validare_task": "1. client.ts există cu connection pooling\n2. Suportă DATABASE_URL_FILE pattern\n3. drizzle.config.ts configurat corect\n4. Logger condiționat de NODE_ENV\n5. Export checkDatabaseConnection și closeDatabase",
  "outcome": "Drizzle ORM client configurat cu pooling și secrets support"
}
```

```json
{
  "taskID": "F0.10.1.T002",
  "denumire_task": "Creare schema tenants cu RLS foundation",
  "context_anterior": "Drizzle client configurat. Acum creăm schema pentru multi-tenancy.",
  "descriere_task": "Ești un expert în database design și multi-tenancy. Creează schema tenants.\n\nCreează `/var/www/CerniqAPP/packages/db/src/schema/tenants.ts`:\n\n```typescript\nimport {\n  pgTable,\n  uuid,\n  varchar,\n  timestamp,\n  jsonb,\n  index,\n  uniqueIndex,\n} from 'drizzle-orm/pg-core';\nimport { createInsertSchema, createSelectSchema } from 'drizzle-zod';\nimport { z } from 'zod';\n\nexport const tenants = pgTable('tenants', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  name: varchar('name', { length: 255 }).notNull(),\n  slug: varchar('slug', { length: 100 }).notNull(),\n  status: varchar('status', { length: 20 }).notNull().default('active'),\n  settings: jsonb('settings').notNull().default({}),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),\n}, (table) => ({\n  slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),\n  statusIdx: index('tenants_status_idx').on(table.status),\n}));\n\n// Zod schemas for validation\nexport const insertTenantSchema = createInsertSchema(tenants, {\n  name: z.string().min(2).max(255),\n  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),\n  status: z.enum(['active', 'suspended', 'deleted']),\n});\n\nexport const selectTenantSchema = createSelectSchema(tenants);\n\nexport type Tenant = typeof tenants.$inferSelect;\nexport type NewTenant = typeof tenants.$inferInsert;\n```\n\nCreează `/var/www/CerniqAPP/packages/db/src/schema/users.ts`:\n\n```typescript\nimport {\n  pgTable,\n  uuid,\n  varchar,\n  timestamp,\n  index,\n  uniqueIndex,\n} from 'drizzle-orm/pg-core';\nimport { tenants } from './tenants';\nimport { createInsertSchema, createSelectSchema } from 'drizzle-zod';\nimport { z } from 'zod';\n\nexport const users = pgTable('users', {\n  id: uuid('id').primaryKey().defaultRandom(),\n  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),\n  email: varchar('email', { length: 255 }).notNull(),\n  passwordHash: varchar('password_hash', { length: 255 }).notNull(),\n  name: varchar('name', { length: 255 }),\n  role: varchar('role', { length: 50 }).notNull().default('user'),\n  status: varchar('status', { length: 20 }).notNull().default('active'),\n  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),\n  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),\n}, (table) => ({\n  // CRITICAL: Unique per tenant, not global!\n  tenantEmailIdx: uniqueIndex('users_tenant_email_idx').on(table.tenantId, table.email),\n  tenantIdx: index('users_tenant_idx').on(table.tenantId),\n}));\n\nexport const insertUserSchema = createInsertSchema(users, {\n  email: z.string().email(),\n  role: z.enum(['admin', 'manager', 'user', 'viewer']),\n  status: z.enum(['active', 'inactive', 'suspended']),\n});\n\nexport const selectUserSchema = createSelectSchema(users);\n\nexport type User = typeof users.$inferSelect;\nexport type NewUser = typeof users.$inferInsert;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/schema",
  "restrictii_antihalucinatie": [
    "UNIQUE constraint pe email TREBUIE să includă tenant_id: (tenant_id, email)",
    "NU global UNIQUE pe email - ar rupe multi-tenancy",
    "FOLOSEȘTE uuid pentru id-uri, nu serial/int",
    "INCLUDE timestamps withTimezone: true",
    "drizzle-zod pentru schema validation"
  ],
  "validare_task": "1. tenants.ts cu schema completă\n2. users.ts cu UNIQUE(tenant_id, email)\n3. Foreign key către tenants cu onDelete cascade\n4. Zod schemas pentru insert/select\n5. Types exportate corect",
  "outcome": "Schema foundation pentru multi-tenancy cu RLS-ready structure"
}
```

```json
{
  "taskID": "F0.10.1.T003",
  "denumire_task": "Implementare RLS policies în PostgreSQL",
  "context_anterior": "Schema Drizzle creată. Acum implementăm RLS policies.",
  "descriere_task": "Ești un expert în PostgreSQL Row Level Security. Implementează RLS policies.\n\nCreează migration pentru RLS `/var/www/CerniqAPP/packages/db/drizzle/0002_rls_policies.sql`:\n\n```sql\n-- Enable RLS on users table\nALTER TABLE users ENABLE ROW LEVEL SECURITY;\n\n-- Policy: users can only see users from same tenant\nCREATE POLICY tenant_isolation_policy ON users\n    FOR ALL\n    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);\n\n-- Force RLS for table owner too (important!)\nALTER TABLE users FORCE ROW LEVEL SECURITY;\n\n-- Function to set current tenant\nCREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id uuid)\nRETURNS void AS $$\nBEGIN\n    PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\n-- Grant execute to app user\nGRANT EXECUTE ON FUNCTION set_current_tenant(uuid) TO cerniq;\n```\n\nCreează helper în aplicație pentru tenant context:\n`/var/www/CerniqAPP/packages/db/src/tenant-context.ts`:\n\n```typescript\nimport { sql } from 'drizzle-orm';\nimport { db } from './client';\n\nexport async function setTenantContext(tenantId: string): Promise<void> {\n  await db.execute(sql`SELECT set_current_tenant(${tenantId}::uuid)`);\n}\n\nexport async function clearTenantContext(): Promise<void> {\n  await db.execute(sql`RESET app.current_tenant_id`);\n}\n```\n\nCreează Fastify plugin pentru tenant context:\n`/var/www/CerniqAPP/apps/api/src/plugins/tenant-context.ts`:\n\n```typescript\nimport { FastifyPluginAsync } from 'fastify';\nimport fp from 'fastify-plugin';\nimport { setTenantContext, clearTenantContext } from '@cerniq/db';\n\nconst tenantContextPlugin: FastifyPluginAsync = async (app) => {\n  app.addHook('onRequest', async (request) => {\n    const tenantId = request.headers['x-tenant-id'] as string;\n    if (tenantId) {\n      await setTenantContext(tenantId);\n      request.tenantId = tenantId;\n    }\n  });\n\n  app.addHook('onResponse', async () => {\n    await clearTenantContext();\n  });\n};\n\nexport default fp(tenantContextPlugin, {\n  name: 'tenant-context',\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FORCE ROW LEVEL SECURITY pentru a aplica și table owner-ului",
    "FOLOSEȘTE current_setting cu true pentru a returna NULL dacă nu există",
    "set_current_tenant TREBUIE să fie SECURITY DEFINER",
    "CLEAR tenant context în onResponse hook",
    "NU stoca tenant_id în sesiune - setează per-request"
  ],
  "validare_task": "1. RLS enabled pe users table\n2. Policy creată cu current_setting\n3. FORCE ROW LEVEL SECURITY aplicat\n4. set_current_tenant function există\n5. Fastify plugin setează/curăță context per request",
  "outcome": "RLS policies funcționale pentru tenant isolation"
}
```

```json
{
  "taskID": "F0.10.1.T004",
  "denumire_task": "Setup migration system cu drizzle-kit",
  "context_anterior": "RLS implementat. Acum configurăm sistemul de migrations.",
  "descriere_task": "Ești un expert în database migrations. Configurează drizzle-kit pentru migrations.\n\n1. Actualizează package.json cu scripts:\n```json\n{\n  \"scripts\": {\n    \"db:generate\": \"drizzle-kit generate\",\n    \"db:migrate\": \"drizzle-kit migrate\",\n    \"db:push\": \"drizzle-kit push\",\n    \"db:studio\": \"drizzle-kit studio\",\n    \"db:check\": \"drizzle-kit check\"\n  }\n}\n```\n\n2. Creează script de migration programatică:\n`/var/www/CerniqAPP/packages/db/src/migrate.ts`:\n\n```typescript\nimport { drizzle } from 'drizzle-orm/node-postgres';\nimport { migrate } from 'drizzle-orm/node-postgres/migrator';\nimport { Pool } from 'pg';\n\nasync function runMigrations() {\n  const pool = new Pool({\n    connectionString: process.env.DATABASE_URL,\n  });\n\n  const db = drizzle(pool);\n\n  console.log('Running migrations...');\n  \n  await migrate(db, {\n    migrationsFolder: './drizzle',\n  });\n\n  console.log('Migrations completed!');\n  \n  await pool.end();\n}\n\nrunMigrations().catch((err) => {\n  console.error('Migration failed:', err);\n  process.exit(1);\n});\n```\n\n3. Generează prima migrație:\n```bash\ncd /var/www/CerniqAPP/packages/db\npnpm db:generate\n```\n\n4. Aplică migrațiile:\n```bash\npnpm db:migrate\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE drizzle-kit pentru generare migrations",
    "Migrations folder: ./drizzle (nu migrations/)",
    "INCLUDE script pentru migration programatică (CI/CD)",
    "RULEAZĂ db:check înainte de generate",
    "NU edita manual fișierele generate"
  ],
  "validare_task": "1. Scripts în package.json pentru db:generate/migrate/push/studio\n2. migrate.ts pentru migration programatică\n3. Folder drizzle/ cu migrations generate\n4. Migrations rulează fără erori\n5. Schema în sync cu database",
  "outcome": "Sistem de migrations funcțional cu drizzle-kit"
}
```

```json
{
  "taskID": "F0.10.1.T005",
  "denumire_task": "Creare seed data pentru development",
  "context_anterior": "Migration system configurat. Acum creăm seed data.",
  "descriere_task": "Ești un expert în database seeding. Creează seed data pentru development.\n\nCreează `/var/www/CerniqAPP/packages/db/src/seed.ts`:\n\n```typescript\nimport { db } from './client';\nimport { tenants, users } from './schema';\nimport { hash } from 'bcryptjs';\n\nasync function seed() {\n  console.log('Seeding database...');\n\n  // Create demo tenant\n  const [demoTenant] = await db\n    .insert(tenants)\n    .values({\n      name: 'Demo Company SRL',\n      slug: 'demo-company',\n      status: 'active',\n      settings: {\n        features: ['enrichment', 'outreach', 'ai-sales'],\n        limits: { contacts: 10000, users: 10 },\n      },\n    })\n    .onConflictDoNothing()\n    .returning();\n\n  if (!demoTenant) {\n    console.log('Demo tenant already exists, skipping...');\n    return;\n  }\n\n  console.log('Created demo tenant:', demoTenant.id);\n\n  // Create admin user\n  const passwordHash = await hash('admin123!', 12);\n  \n  const [adminUser] = await db\n    .insert(users)\n    .values({\n      tenantId: demoTenant.id,\n      email: 'admin@demo.cerniq.app',\n      passwordHash,\n      name: 'Admin User',\n      role: 'admin',\n      status: 'active',\n    })\n    .returning();\n\n  console.log('Created admin user:', adminUser.email);\n\n  // Create test users\n  const testUsers = [\n    { email: 'manager@demo.cerniq.app', name: 'Manager User', role: 'manager' },\n    { email: 'sales@demo.cerniq.app', name: 'Sales Rep', role: 'user' },\n    { email: 'viewer@demo.cerniq.app', name: 'Viewer User', role: 'viewer' },\n  ];\n\n  for (const user of testUsers) {\n    await db.insert(users).values({\n      tenantId: demoTenant.id,\n      email: user.email,\n      passwordHash,\n      name: user.name,\n      role: user.role as 'admin' | 'manager' | 'user' | 'viewer',\n      status: 'active',\n    });\n    console.log('Created user:', user.email);\n  }\n\n  console.log('Seeding completed!');\n}\n\nseed()\n  .catch(console.error)\n  .finally(() => process.exit());\n```\n\nAdaugă script în package.json:\n```json\n{\n  \"scripts\": {\n    \"db:seed\": \"tsx src/seed.ts\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE onConflictDoNothing pentru idempotence",
    "HASH passwords cu bcryptjs, cost factor 12",
    "INCLUDE users cu toate rolurile pentru testare",
    "NU include date sensibile reale în seed",
    "Seed DOAR pentru development, nu production"
  ],
  "validare_task": "1. seed.ts creat cu demo tenant și users\n2. Passwords sunt hashed cu bcryptjs\n3. onConflictDoNothing pentru re-run safety\n4. Script db:seed în package.json\n5. Seed rulează fără erori",
  "outcome": "Seed data pentru development environment"
}
```

```json
{
  "taskID": "F0.10.1.T006",
  "denumire_task": "Verificare și testare multi-tenant constraints",
  "context_anterior": "Seed data creat. Acum verificăm că multi-tenancy funcționează corect.",
  "descriere_task": "Ești un expert în testing database constraints. Creează teste pentru multi-tenancy.\n\nCreează `/var/www/CerniqAPP/packages/db/src/__tests__/multi-tenant.test.ts`:\n\n```typescript\nimport { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';\nimport { db } from '../client';\nimport { tenants, users } from '../schema';\nimport { setTenantContext, clearTenantContext } from '../tenant-context';\nimport { eq } from 'drizzle-orm';\n\ndescribe('Multi-tenant isolation', () => {\n  let tenant1Id: string;\n  let tenant2Id: string;\n\n  beforeAll(async () => {\n    // Create two tenants\n    const [t1] = await db.insert(tenants).values({\n      name: 'Test Tenant 1',\n      slug: 'test-tenant-1',\n    }).returning();\n    tenant1Id = t1.id;\n\n    const [t2] = await db.insert(tenants).values({\n      name: 'Test Tenant 2',\n      slug: 'test-tenant-2',\n    }).returning();\n    tenant2Id = t2.id;\n\n    // Create users in both tenants with SAME email\n    await db.insert(users).values([\n      { tenantId: tenant1Id, email: 'user@test.com', passwordHash: 'hash1', name: 'User T1' },\n      { tenantId: tenant2Id, email: 'user@test.com', passwordHash: 'hash2', name: 'User T2' },\n    ]);\n  });\n\n  afterAll(async () => {\n    await db.delete(users).where(eq(users.email, 'user@test.com'));\n    await db.delete(tenants).where(eq(tenants.slug, 'test-tenant-1'));\n    await db.delete(tenants).where(eq(tenants.slug, 'test-tenant-2'));\n  });\n\n  beforeEach(async () => {\n    await clearTenantContext();\n  });\n\n  it('allows same email in different tenants', async () => {\n    // This should NOT throw - same email allowed in different tenants\n    const usersWithSameEmail = await db\n      .select()\n      .from(users)\n      .where(eq(users.email, 'user@test.com'));\n    \n    expect(usersWithSameEmail).toHaveLength(2);\n  });\n\n  it('isolates users by tenant when context is set', async () => {\n    await setTenantContext(tenant1Id);\n    \n    const tenant1Users = await db.select().from(users);\n    \n    expect(tenant1Users.every(u => u.tenantId === tenant1Id)).toBe(true);\n  });\n\n  it('prevents duplicate email within same tenant', async () => {\n    await expect(\n      db.insert(users).values({\n        tenantId: tenant1Id,\n        email: 'user@test.com', // Already exists in tenant1\n        passwordHash: 'hash',\n        name: 'Duplicate',\n      })\n    ).rejects.toThrow();\n  });\n});\n```\n\nRulează testele:\n```bash\ncd /var/www/CerniqAPP/packages/db\npnpm test\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/src/__tests__",
  "restrictii_antihalucinatie": [
    "TESTEAZĂ că same email e permis în tenants diferiți",
    "TESTEAZĂ că RLS izolează datele per tenant",
    "TESTEAZĂ că duplicate email în SAME tenant e rejectat",
    "CLEANUP date de test în afterAll",
    "CLEAR tenant context în beforeEach"
  ],
  "validare_task": "1. Test file creat cu toate scenariile\n2. Testele trec pentru email duplicat cross-tenant\n3. Testele verifică RLS isolation\n4. Testele verifică unique constraint within tenant\n5. Cleanup funcționează corect",
  "outcome": "Multi-tenant constraints validate și testate"
}
```

---

## FAZA F0.11: FRONTEND BOILERPLATE (COMPLET)

## F0.11.1 React 19.2.3 și Refine Setup

```json
{
  "taskID": "F0.11.1.T001",
  "denumire_task": "Setup React 19.2.3 cu Vite și SWC",
  "context_anterior": "Backend și database sunt funcționale. Acum configurăm frontend-ul conform ADR-0012.",
  "descriere_task": "Ești un expert în React 19.2.3 și Vite. Configurează proiectul frontend.\n\n1. Inițializează proiectul (dacă nu există):\n```bash\ncd /var/www/CerniqAPP/apps/web-admin\npnpm create vite . --template react-swc-ts\n```\n\n2. Actualizează package.json:\n```json\n{\n  \"name\": \"@cerniq/web-admin\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {\n    \"dev\": \"vite\",\n    \"build\": \"tsc && vite build\",\n    \"preview\": \"vite preview\",\n    \"lint\": \"eslint . --ext ts,tsx\"\n  },\n  \"dependencies\": {\n    \"react\": \"^19.2.3\",\n    \"react-dom\": \"^19.2.3\",\n    \"@refinedev/core\": \"^5.0.0\",\n    \"@refinedev/react-router\": \"^1.0.0\",\n    \"react-router\": \"^7.0.0\",\n    \"@tanstack/react-query\": \"^5.0.0\"\n  },\n  \"devDependencies\": {\n    \"@types/react\": \"^19.2.3\",\n    \"@types/react-dom\": \"^19.2.3\",\n    \"@vitejs/plugin-react-swc\": \"^3.7.0\",\n    \"typescript\": \"^5.7.0\",\n    \"vite\": \"^6.0.0\"\n  }\n}\n```\n\n3. Configurează vite.config.ts:\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react-swc';\nimport path from 'path';\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n    },\n  },\n  server: {\n    port: 3000,\n    proxy: {\n      '/api': {\n        target: 'http://localhost:64000',\n        changeOrigin: true,\n      },\n    },\n  },\n  build: {\n    sourcemap: true,\n    rollupOptions: {\n      output: {\n        manualChunks: {\n          vendor: ['react', 'react-dom'],\n          refine: ['@refinedev/core'],\n        },\n      },\n    },\n  },\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE React 19.2.3.2.3, nu 18.x",
    "FOLOSEȘTE @vitejs/plugin-react-swc pentru build rapid",
    "CONFIGUREAZĂ proxy pentru API în development",
    "INCLUDE path alias @ pentru imports clean",
    "manualChunks pentru vendor code splitting"
  ],
  "validare_task": "1. React 19.2.3.2.3 instalat\n2. Vite 6 cu SWC plugin\n3. Proxy configurat pentru /api\n4. Path alias @ funcționează\n5. pnpm dev pornește pe port 3000",
  "outcome": "React 19.2.3 cu Vite și SWC configurat"
}
```

```json
{
  "taskID": "F0.11.1.T002",
  "denumire_task": "Configurare Refine v5 headless",
  "context_anterior": "React 19.2.3 cu Vite configurat. Acum adăugăm Refine v5.",
  "descriere_task": "Ești un expert în Refine framework. Configurează Refine v5 în mod headless.\n\nCreează `/var/www/CerniqAPP/apps/web-admin/src/App.tsx`:\n\n```typescript\nimport { Refine } from '@refinedev/core';\nimport { BrowserRouter, Routes, Route, Outlet } from 'react-router';\nimport { dataProvider } from './providers/data-provider';\nimport { authProvider } from './providers/auth-provider';\nimport { Layout } from './components/Layout';\nimport { LoginPage } from './pages/auth/Login';\nimport { DashboardPage } from './pages/Dashboard';\nimport { CompaniesListPage } from './pages/companies/List';\n\nexport function App() {\n  return (\n    <BrowserRouter>\n      <Refine\n        dataProvider={dataProvider}\n        authProvider={authProvider}\n        resources={[\n          {\n            name: 'companies',\n            list: '/companies',\n            show: '/companies/:id',\n            create: '/companies/create',\n            edit: '/companies/:id/edit',\n            meta: {\n              label: 'Companies',\n              icon: 'building',\n            },\n          },\n          {\n            name: 'contacts',\n            list: '/contacts',\n            show: '/contacts/:id',\n            meta: {\n              label: 'Contacts',\n              icon: 'users',\n            },\n          },\n        ]}\n        options={{\n          syncWithLocation: true,\n          warnWhenUnsavedChanges: true,\n          projectId: 'cerniq-app',\n        }}\n      >\n        <Routes>\n          <Route path=\"/login\" element={<LoginPage />} />\n          <Route element={<Layout><Outlet /></Layout>}>\n            <Route index element={<DashboardPage />} />\n            <Route path=\"/companies\" element={<CompaniesListPage />} />\n          </Route>\n        </Routes>\n      </Refine>\n    </BrowserRouter>\n  );\n}\n```\n\nCreează `/var/www/CerniqAPP/apps/web-admin/src/providers/data-provider.ts`:\n\n```typescript\nimport { DataProvider } from '@refinedev/core';\n\nconst API_URL = import.meta.env.VITE_API_URL || '/api/v1';\n\nexport const dataProvider: DataProvider = {\n  getList: async ({ resource, pagination, sorters, filters }) => {\n    const response = await fetch(`${API_URL}/${resource}`);\n    const data = await response.json();\n    return {\n      data: data.data,\n      total: data.total,\n    };\n  },\n  \n  getOne: async ({ resource, id }) => {\n    const response = await fetch(`${API_URL}/${resource}/${id}`);\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  create: async ({ resource, variables }) => {\n    const response = await fetch(`${API_URL}/${resource}`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(variables),\n    });\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  update: async ({ resource, id, variables }) => {\n    const response = await fetch(`${API_URL}/${resource}/${id}`, {\n      method: 'PATCH',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(variables),\n    });\n    const data = await response.json();\n    return { data: data.data };\n  },\n  \n  deleteOne: async ({ resource, id }) => {\n    await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE' });\n    return { data: { id } };\n  },\n  \n  getApiUrl: () => API_URL,\n};\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin/src",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE Refine v5 cu TanStack Query v5",
    "MODE headless - fără UI framework (shadcn/custom)",
    "CONFIGUREAZĂ resources pentru companies și contacts",
    "syncWithLocation pentru URL-based routing",
    "Data provider cu API_URL configurabil via env"
  ],
  "validare_task": "1. Refine v5 configurat în App.tsx\n2. Resources definite pentru companies/contacts\n3. Data provider cu toate metodele CRUD\n4. BrowserRouter configurat\n5. syncWithLocation enabled",
  "outcome": "Refine v5 headless configurat cu data provider"
}
```

```json
{
  "taskID": "F0.11.1.T003",
  "denumire_task": "Setup Tailwind CSS v4 cu Oxide Engine",
  "context_anterior": "Refine configurat. Acum adăugăm Tailwind CSS v4 conform ADR-0013.",
  "descriere_task": "Ești un expert în Tailwind CSS v4. Configurează Tailwind cu Oxide engine.\n\n1. Instalează Tailwind v4:\n```bash\ncd /var/www/CerniqAPP/apps/web-admin\npnpm add tailwindcss@^4.0.0 @tailwindcss/vite\n```\n\n2. Actualizează vite.config.ts:\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react-swc';\nimport tailwindcss from '@tailwindcss/vite';\nimport path from 'path';\n\nexport default defineConfig({\n  plugins: [\n    react(),\n    tailwindcss(),\n  ],\n  // ... rest of config\n});\n```\n\n3. Creează `/var/www/CerniqAPP/apps/web-admin/src/styles/globals.css`:\n```css\n@import \"tailwindcss\";\n\n/* Custom CSS variables */\n@theme {\n  --color-primary-50: oklch(97% 0.02 250);\n  --color-primary-100: oklch(94% 0.04 250);\n  --color-primary-500: oklch(55% 0.2 250);\n  --color-primary-600: oklch(48% 0.2 250);\n  --color-primary-700: oklch(40% 0.18 250);\n  \n  --font-sans: 'Inter', system-ui, sans-serif;\n  --font-mono: 'JetBrains Mono', monospace;\n  \n  --radius-lg: 0.75rem;\n  --radius-md: 0.5rem;\n  --radius-sm: 0.25rem;\n}\n\n/* Base styles */\n@layer base {\n  html {\n    @apply antialiased;\n  }\n  \n  body {\n    @apply bg-gray-50 text-gray-900;\n  }\n}\n\n/* Component styles */\n@layer components {\n  .btn {\n    @apply inline-flex items-center justify-center rounded-md px-4 py-2 font-medium transition-colors;\n  }\n  \n  .btn-primary {\n    @apply btn bg-primary-600 text-white hover:bg-primary-700;\n  }\n  \n  .card {\n    @apply rounded-lg border border-gray-200 bg-white p-6 shadow-sm;\n  }\n}\n```\n\n4. Import în main.tsx:\n```typescript\nimport './styles/globals.css';\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin/src",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE @tailwindcss/vite plugin pentru v4",
    "CSS-first config cu @theme directive",
    "OKLCH pentru color palette (v4 default)",
    "NU mai este nevoie de tailwind.config.js în v4",
    "IMPORT cu @import tailwindcss nu @tailwind directives"
  ],
  "validare_task": "1. Tailwind v4 instalat cu @tailwindcss/vite\n2. @theme directive cu custom CSS vars\n3. OKLCH color palette definit\n4. globals.css importat în main.tsx\n5. Classes aplicate corect în componente",
  "outcome": "Tailwind CSS v4 cu Oxide engine configurat"
}
```

```json
{
  "taskID": "F0.11.1.T004",
  "denumire_task": "Implementare Auth Provider cu JWT refresh",
  "context_anterior": "Tailwind configurat. Acum implementăm auth provider pentru Refine.",
  "descriere_task": "Ești un expert în authentication flows. Implementează auth provider cu JWT.\n\nCreează `/var/www/CerniqAPP/apps/web-admin/src/providers/auth-provider.ts`:\n\n```typescript\nimport { AuthProvider } from '@refinedev/core';\n\nconst API_URL = import.meta.env.VITE_API_URL || '/api/v1';\n\ninterface AuthResponse {\n  user: {\n    id: string;\n    email: string;\n    name: string;\n    role: string;\n  };\n  accessToken: string;\n}\n\nexport const authProvider: AuthProvider = {\n  login: async ({ email, password }) => {\n    const response = await fetch(`${API_URL}/auth/login`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      credentials: 'include', // Important for cookies\n      body: JSON.stringify({ email, password }),\n    });\n\n    if (!response.ok) {\n      const error = await response.json();\n      return {\n        success: false,\n        error: { message: error.error?.message || 'Login failed' },\n      };\n    }\n\n    const data: AuthResponse = await response.json();\n    \n    // Store access token (short-lived)\n    localStorage.setItem('accessToken', data.accessToken);\n    localStorage.setItem('user', JSON.stringify(data.user));\n\n    return {\n      success: true,\n      redirectTo: '/',\n    };\n  },\n\n  logout: async () => {\n    await fetch(`${API_URL}/auth/logout`, {\n      method: 'POST',\n      credentials: 'include',\n    });\n    \n    localStorage.removeItem('accessToken');\n    localStorage.removeItem('user');\n\n    return {\n      success: true,\n      redirectTo: '/login',\n    };\n  },\n\n  check: async () => {\n    const token = localStorage.getItem('accessToken');\n    \n    if (!token) {\n      return {\n        authenticated: false,\n        redirectTo: '/login',\n      };\n    }\n\n    // Verify token is still valid\n    const response = await fetch(`${API_URL}/auth/me`, {\n      headers: { Authorization: `Bearer ${token}` },\n      credentials: 'include',\n    });\n\n    if (!response.ok) {\n      // Try refresh\n      const refreshed = await tryRefreshToken();\n      if (!refreshed) {\n        return {\n          authenticated: false,\n          redirectTo: '/login',\n        };\n      }\n    }\n\n    return { authenticated: true };\n  },\n\n  getIdentity: async () => {\n    const user = localStorage.getItem('user');\n    if (!user) return null;\n    return JSON.parse(user);\n  },\n\n  getPermissions: async () => {\n    const user = localStorage.getItem('user');\n    if (!user) return null;\n    return JSON.parse(user).role;\n  },\n\n  onError: async (error) => {\n    if (error.status === 401) {\n      const refreshed = await tryRefreshToken();\n      if (!refreshed) {\n        return { logout: true, redirectTo: '/login' };\n      }\n    }\n    return {};\n  },\n};\n\nasync function tryRefreshToken(): Promise<boolean> {\n  try {\n    const response = await fetch(`${API_URL}/auth/refresh`, {\n      method: 'POST',\n      credentials: 'include',\n    });\n\n    if (!response.ok) return false;\n\n    const data = await response.json();\n    localStorage.setItem('accessToken', data.accessToken);\n    return true;\n  } catch {\n    return false;\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin/src/providers",
  "restrictii_antihalucinatie": [
    "credentials: include pentru HttpOnly cookie support",
    "Access token în localStorage (short-lived)",
    "Refresh token în HttpOnly cookie (set by server)",
    "IMPLEMENT onError pentru 401 handling",
    "tryRefreshToken pentru automatic token refresh"
  ],
  "validare_task": "1. AuthProvider implementat complet\n2. login/logout/check/getIdentity/getPermissions funcționează\n3. Token refresh implementat\n4. credentials: include în toate fetch calls\n5. onError handler pentru 401",
  "outcome": "Auth provider complet cu JWT refresh flow"
}
```

```json
{
  "taskID": "F0.11.1.T005",
  "denumire_task": "Creare componente Layout și Navigation",
  "context_anterior": "Auth provider implementat. Acum creăm layout-ul aplicației.",
  "descriere_task": "Ești un expert în React și UI design. Creează layout-ul principal.\n\nCreează `/var/www/CerniqAPP/apps/web-admin/src/components/Layout.tsx`:\n\n```typescript\nimport { ReactNode } from 'react';\nimport { Link, useLocation } from 'react-router';\nimport { useGetIdentity, useLogout } from '@refinedev/core';\n\ninterface LayoutProps {\n  children: ReactNode;\n}\n\nconst navigation = [\n  { name: 'Dashboard', href: '/', icon: '📊' },\n  { name: 'Companies', href: '/companies', icon: '🏢' },\n  { name: 'Contacts', href: '/contacts', icon: '👥' },\n  { name: 'Campaigns', href: '/campaigns', icon: '📧' },\n];\n\nexport function Layout({ children }: LayoutProps) {\n  const { pathname } = useLocation();\n  const { data: user } = useGetIdentity();\n  const { mutate: logout } = useLogout();\n\n  return (\n    <div className=\"min-h-screen bg-gray-50\">\n      {/* Sidebar */}\n      <aside className=\"fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200\">\n        <div className=\"flex h-16 items-center px-6 border-b border-gray-200\">\n          <span className=\"text-xl font-bold text-primary-600\">Cerniq</span>\n        </div>\n        \n        <nav className=\"mt-6 px-3\">\n          {navigation.map((item) => (\n            <Link\n              key={item.href}\n              to={item.href}\n              className={`flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors ${\n                pathname === item.href\n                  ? 'bg-primary-50 text-primary-700'\n                  : 'text-gray-600 hover:bg-gray-100'\n              }`}\n            >\n              <span>{item.icon}</span>\n              <span>{item.name}</span>\n            </Link>\n          ))}\n        </nav>\n      </aside>\n\n      {/* Main content */}\n      <div className=\"pl-64\">\n        {/* Header */}\n        <header className=\"h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6\">\n          <h1 className=\"text-lg font-medium\">Welcome back</h1>\n          \n          <div className=\"flex items-center gap-4\">\n            <span className=\"text-sm text-gray-600\">{user?.name}</span>\n            <button\n              onClick={() => logout()}\n              className=\"text-sm text-gray-500 hover:text-gray-700\"\n            >\n              Logout\n            </button>\n          </div>\n        </header>\n\n        {/* Page content */}\n        <main className=\"p-6\">\n          {children}\n        </main>\n      </div>\n    </div>\n  );\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin/src/components",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE useGetIdentity și useLogout din @refinedev/core",
    "RESPONSIVE sidebar (fixed pe desktop)",
    "ACTIVE state pentru navigation links",
    "INCLUDE user info și logout în header",
    "Tailwind classes pentru styling"
  ],
  "validare_task": "1. Layout.tsx creat cu sidebar și header\n2. Navigation links funcționează\n3. Active state pe current route\n4. User identity afișată\n5. Logout funcționează",
  "outcome": "Layout principal cu navigation și user controls"
}
```

```json
{
  "taskID": "F0.11.1.T006",
  "denumire_task": "Implementare protected routes",
  "context_anterior": "Layout creat. Acum implementăm protected routes.",
  "descriere_task": "Ești un expert în React routing și authorization. Implementează protected routes.\n\nCreează `/var/www/CerniqAPP/apps/web-admin/src/components/ProtectedRoute.tsx`:\n\n```typescript\nimport { ReactNode } from 'react';\nimport { Navigate, useLocation } from 'react-router';\nimport { useIsAuthenticated, usePermissions } from '@refinedev/core';\n\ninterface ProtectedRouteProps {\n  children: ReactNode;\n  allowedRoles?: string[];\n}\n\nexport function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {\n  const location = useLocation();\n  const { data: isAuthenticated, isLoading: authLoading } = useIsAuthenticated();\n  const { data: role, isLoading: roleLoading } = usePermissions();\n\n  // Show loading state\n  if (authLoading || roleLoading) {\n    return (\n      <div className=\"min-h-screen flex items-center justify-center\">\n        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600\" />\n      </div>\n    );\n  }\n\n  // Redirect to login if not authenticated\n  if (!isAuthenticated?.authenticated) {\n    return <Navigate to=\"/login\" state={{ from: location }} replace />;\n  }\n\n  // Check role-based access\n  if (allowedRoles && !allowedRoles.includes(role as string)) {\n    return (\n      <div className=\"min-h-screen flex items-center justify-center\">\n        <div className=\"text-center\">\n          <h1 className=\"text-2xl font-bold text-gray-900\">Access Denied</h1>\n          <p className=\"mt-2 text-gray-600\">\n            You don't have permission to access this page.\n          </p>\n        </div>\n      </div>\n    );\n  }\n\n  return <>{children}</>;\n}\n```\n\nActualizează App.tsx:\n\n```typescript\nimport { ProtectedRoute } from './components/ProtectedRoute';\n\n// În Routes:\n<Route\n  element={\n    <ProtectedRoute>\n      <Layout><Outlet /></Layout>\n    </ProtectedRoute>\n  }\n>\n  <Route index element={<DashboardPage />} />\n  <Route path=\"/companies\" element={<CompaniesListPage />} />\n  <Route\n    path=\"/admin\"\n    element={\n      <ProtectedRoute allowedRoles={['admin']}>\n        <AdminPage />\n      </ProtectedRoute>\n    }\n  />\n</Route>\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin/src/components",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE useIsAuthenticated și usePermissions din @refinedev/core",
    "INCLUDE loading state pentru async auth check",
    "REDIRECT to login cu location state (pentru redirect back)",
    "SUPPORT role-based access cu allowedRoles prop",
    "Access Denied page pentru unauthorized users"
  ],
  "validare_task": "1. ProtectedRoute component creat\n2. Loading state afișat corect\n3. Redirect to login pentru unauthenticated\n4. Role-based access funcționează\n5. App.tsx actualizat cu ProtectedRoute",
  "outcome": "Protected routes cu role-based access control"
}
```

---

## FAZA F0.12: DEVELOPMENT ENVIRONMENT (COMPLET)

## F0.12.1 Docker Compose Override și Dev Tools

```json
{
  "taskID": "F0.12.1.T001",
  "denumire_task": "Creare docker-compose.override.yml pentru development",
  "context_anterior": "Production setup complet. Acum configurăm development environment conform ADR-0030.",
  "descriere_task": "Ești un expert în Docker Compose și development workflows. Creează override pentru development.\n\nCreează `/var/www/CerniqAPP/infra/docker/docker-compose.override.yml`:\n\n```yaml\n# Development overrides\n# This file is automatically loaded by docker compose\nversion: \"3.9\"\n\nservices:\n  postgres:\n    ports:\n      - \"5432:64032\"  # Expose for local tools (DBeaver, etc.)\n    environment:\n      POSTGRES_PASSWORD: devpassword  # Simple password for dev\n\n  redis:\n    ports:\n      - \"6379:64039\"  # Expose for RedisInsight\n\n  api:\n    build:\n      context: ../../\n      dockerfile: apps/api/Dockerfile.dev\n    volumes:\n      - ../../apps/api/src:/app/apps/api/src:cached\n      - ../../packages:/app/packages:cached\n    environment:\n      NODE_ENV: development\n      LOG_LEVEL: debug\n      DATABASE_URL: postgresql://cerniq:devpassword@postgres:64032/cerniq_dev\n      REDIS_URL: redis://redis:64039/0\n    ports:\n      - \"4000:4000\"\n      - \"9229:9229\"  # Node.js debugger\n    command: pnpm dev\n\n  web:\n    build:\n      context: ../../\n      dockerfile: apps/web-admin/Dockerfile.dev\n    volumes:\n      - ../../apps/web-admin/src:/app/apps/web-admin/src:cached\n      - ../../packages:/app/packages:cached\n    environment:\n      NODE_ENV: development\n      VITE_API_URL: http://localhost:64000/api/v1\n    ports:\n      - \"3000:3000\"\n      - \"24678:24678\"  # Vite HMR\n    command: pnpm dev --host\n\n# Development-only services\n  mailhog:\n    image: mailhog/mailhog:latest\n    ports:\n      - \"1025:1025\"   # SMTP\n      - \"8025:8025\"   # Web UI\n\n  pgadmin:\n    image: dpage/pgadmin4:latest\n    environment:\n      PGADMIN_DEFAULT_EMAIL: admin@cerniq.local\n      PGADMIN_DEFAULT_PASSWORD: admin\n    ports:\n      - \"5050:80\"\n    volumes:\n      - pgadmin_data:/var/lib/pgadmin\n\nvolumes:\n  pgadmin_data:\n```\n\nCreează `/var/www/CerniqAPP/apps/api/Dockerfile.dev`:\n\n```dockerfile\nFROM node:24-alpine\n\nWORKDIR /app\n\n# Install pnpm\nRUN corepack enable && corepack prepare pnpm@9.15.0 --activate\n\n# Copy package files\nCOPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./\nCOPY apps/api/package.json ./apps/api/\nCOPY packages/*/package.json ./packages/*/\n\n# Install dependencies\nRUN pnpm install --frozen-lockfile\n\n# Copy source (will be overridden by volume mount)\nCOPY . .\n\nEXPOSE 4000 9229\n\nCMD [\"pnpm\", \"--filter\", \"@cerniq/api\", \"dev\"]\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/docker",
  "restrictii_antihalucinatie": [
    "OVERRIDE file se încarcă automat - nu trebuie specificat",
    "EXPUNE ports pentru dev tools (5432, 6379)",
    "VOLUME mounts pentru hot reload (:cached pentru macOS)",
    "INCLUDE debug port 9229 pentru Node.js inspector",
    "ADAUGĂ dev services: mailhog, pgadmin"
  ],
  "validare_task": "1. docker-compose.override.yml creat\n2. PostgreSQL și Redis expuse pe localhost\n3. Volume mounts pentru src directories\n4. Dockerfile.dev cu hot reload support\n5. Mailhog și pgAdmin disponibile",
  "outcome": "Development environment cu hot reload și dev tools"
}
```

```json
{
  "taskID": "F0.12.1.T002",
  "denumire_task": "Configurare VSCode launch.json pentru debugging",
  "context_anterior": "Docker override creat. Acum configurăm debugging în VSCode.",
  "descriere_task": "Ești un expert în VSCode și Node.js debugging. Configurează launch configurations.\n\nCreează `/var/www/CerniqAPP/.vscode/launch.json`:\n\n```json\n{\n  \"version\": \"0.2.0\",\n  \"configurations\": [\n    {\n      \"name\": \"API: Debug\",\n      \"type\": \"node\",\n      \"request\": \"attach\",\n      \"port\": 9229,\n      \"address\": \"localhost\",\n      \"localRoot\": \"${workspaceFolder}/apps/api\",\n      \"remoteRoot\": \"/app/apps/api\",\n      \"restart\": true,\n      \"sourceMaps\": true,\n      \"skipFiles\": [\n        \"<node_internals>/**\",\n        \"**/node_modules/**\"\n      ]\n    },\n    {\n      \"name\": \"API: Run Local\",\n      \"type\": \"node\",\n      \"request\": \"launch\",\n      \"runtimeExecutable\": \"pnpm\",\n      \"runtimeArgs\": [\"--filter\", \"@cerniq/api\", \"dev\"],\n      \"cwd\": \"${workspaceFolder}\",\n      \"console\": \"integratedTerminal\",\n      \"env\": {\n        \"NODE_ENV\": \"development\",\n        \"DATABASE_URL\": \"postgresql://cerniq:devpassword@localhost:64032/cerniq_dev\"\n      }\n    },\n    {\n      \"name\": \"Web: Debug Chrome\",\n      \"type\": \"chrome\",\n      \"request\": \"launch\",\n      \"url\": \"http://localhost:64010\",\n      \"webRoot\": \"${workspaceFolder}/apps/web-admin/src\",\n      \"sourceMaps\": true\n    },\n    {\n      \"name\": \"Tests: API\",\n      \"type\": \"node\",\n      \"request\": \"launch\",\n      \"runtimeExecutable\": \"pnpm\",\n      \"runtimeArgs\": [\"--filter\", \"@cerniq/api\", \"test\"],\n      \"cwd\": \"${workspaceFolder}\",\n      \"console\": \"integratedTerminal\"\n    }\n  ],\n  \"compounds\": [\n    {\n      \"name\": \"Full Stack\",\n      \"configurations\": [\"API: Debug\", \"Web: Debug Chrome\"]\n    }\n  ]\n}\n```\n\nCreează `/var/www/CerniqAPP/.vscode/settings.json`:\n\n```json\n{\n  \"typescript.tsdk\": \"node_modules/typescript/lib\",\n  \"editor.formatOnSave\": true,\n  \"editor.defaultFormatter\": \"esbenp.prettier-vscode\",\n  \"editor.codeActionsOnSave\": {\n    \"source.fixAll.eslint\": \"explicit\"\n  },\n  \"[typescript]\": {\n    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\"\n  },\n  \"[typescriptreact]\": {\n    \"editor.defaultFormatter\": \"esbenp.prettier-vscode\"\n  },\n  \"files.exclude\": {\n    \"**/node_modules\": true,\n    \"**/.pnpm-store\": true\n  },\n  \"search.exclude\": {\n    \"**/node_modules\": true,\n    \"**/pnpm-lock.yaml\": true\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/.vscode",
  "restrictii_antihalucinatie": [
    "ATTACH mode pentru containerized debugging (port 9229)",
    "localRoot/remoteRoot mapping pentru source maps",
    "INCLUDE compound launch pentru full stack",
    "skipFiles pentru node_internals și node_modules",
    "Chrome debugger pentru React development"
  ],
  "validare_task": "1. launch.json cu toate configurations\n2. API debug attach funcționează\n3. Chrome debugger pentru web\n4. Compound configuration pentru full stack\n5. settings.json cu format on save",
  "outcome": "VSCode debugging configurat pentru API și Web"
}
```

```json
{
  "taskID": "F0.12.1.T003",
  "denumire_task": "Creare .env.example și environment template",
  "context_anterior": "VSCode configurat. Acum creăm template pentru environment variables.",
  "descriere_task": "Ești un expert în environment configuration. Creează template-uri pentru env files.\n\nCreează `/var/www/CerniqAPP/.env.example`:\n\n```bash\n# ===========================================\n# CERNIQ.APP ENVIRONMENT VARIABLES\n# ===========================================\n# Copy to .env and fill in values\n# NEVER commit .env to git!\n\n# General\nNODE_ENV=development\nAPP_VERSION=0.1.0\nLOG_LEVEL=debug\n\n# API Server\nHOST=0.0.0.0\nPORT=64000\n\n# Database\nDATABASE_URL=postgresql://cerniq:devpassword@localhost:64032/cerniq_dev\nDATABASE_POOL_MIN=2\nDATABASE_POOL_MAX=10\n\n# Redis\nREDIS_URL=redis://localhost:64039/0\n\n# Authentication\nJWT_SECRET=your-development-jwt-secret-min-32-chars\nJWT_ACCESS_EXPIRES=15m\nJWT_REFRESH_EXPIRES=7d\nCOOKIE_SECRET=your-development-cookie-secret\n\n# External APIs (get from providers)\n# ANAF_CLIENT_ID=\n# ANAF_CLIENT_SECRET=\n# TERMENE_API_KEY=\n# HUNTER_API_KEY=\n# TIMELINES_API_KEY=\n# INSTANTLY_API_KEY=\n\n# LLM APIs\n# XAI_API_KEY=\n# OPENAI_API_KEY=\n\n# Observability\nOTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:64070\nOTEL_SERVICE_NAME=cerniq-api\n\n# Frontend\nVITE_API_URL=http://localhost:64000/api/v1\n```\n\nCreează `/var/www/CerniqAPP/apps/api/.env.example`:\n\n```bash\n# API-specific overrides (optional)\n# Main config should be in root .env\n```\n\nCreează `/var/www/CerniqAPP/apps/web-admin/.env.example`:\n\n```bash\n# Frontend environment variables\nVITE_API_URL=http://localhost:64000/api/v1\nVITE_APP_TITLE=Cerniq.app\n```\n\nActualizează `.gitignore`:\n\n```gitignore\n# Environment files\n.env\n.env.local\n.env.*.local\n!.env.example\n\n# Secrets\nsecrets/\n!secrets/.gitkeep\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "INCLUDE toate variabilele documentate în env template",
    "COMENTARII explicative pentru fiecare secțiune",
    "API keys comentate (nu au default values)",
    ".env în .gitignore, dar NU .env.example",
    "SEPARATE env files pentru api și web dacă necesar"
  ],
  "validare_task": "1. .env.example creat la root\n2. Toate variabilele documentate cu comentarii\n3. .gitignore actualizat să excludă .env\n4. .env.example este tracked în git\n5. Secrets directory în .gitignore",
  "outcome": "Environment templates complete și documentate"
}
```

```json
{
  "taskID": "F0.12.1.T004",
  "denumire_task": "Creare scripts de development (dev, build, lint)",
  "context_anterior": "Env templates create. Acum adăugăm development scripts.",
  "descriere_task": "Ești un expert în monorepo tooling. Configurează scripts pentru development workflow.\n\nActualizează `/var/www/CerniqAPP/package.json`:\n\n```json\n{\n  \"name\": \"cerniq-app\",\n  \"private\": true,\n  \"packageManager\": \"pnpm@9.15.0\",\n  \"scripts\": {\n    \"dev\": \"turbo run dev\",\n    \"dev:api\": \"pnpm --filter @cerniq/api dev\",\n    \"dev:web\": \"pnpm --filter @cerniq/web-admin dev\",\n    \"build\": \"turbo run build\",\n    \"build:api\": \"pnpm --filter @cerniq/api build\",\n    \"build:web\": \"pnpm --filter @cerniq/web-admin build\",\n    \"lint\": \"turbo run lint\",\n    \"lint:fix\": \"turbo run lint -- --fix\",\n    \"test\": \"turbo run test\",\n    \"test:api\": \"pnpm --filter @cerniq/api test\",\n    \"test:e2e\": \"pnpm --filter @cerniq/web-admin test:e2e\",\n    \"typecheck\": \"turbo run typecheck\",\n    \"clean\": \"turbo run clean && rm -rf node_modules .turbo\",\n    \"db:generate\": \"pnpm --filter @cerniq/db db:generate\",\n    \"db:migrate\": \"pnpm --filter @cerniq/db db:migrate\",\n    \"db:seed\": \"pnpm --filter @cerniq/db db:seed\",\n    \"db:studio\": \"pnpm --filter @cerniq/db db:studio\",\n    \"docker:up\": \"docker compose -f infra/docker/docker-compose.yml up -d\",\n    \"docker:down\": \"docker compose -f infra/docker/docker-compose.yml down\",\n    \"docker:logs\": \"docker compose -f infra/docker/docker-compose.yml logs -f\",\n    \"prepare\": \"husky\"\n  },\n  \"devDependencies\": {\n    \"turbo\": \"^2.4.0\",\n    \"husky\": \"^9.0.0\",\n    \"lint-staged\": \"^15.0.0\"\n  },\n  \"lint-staged\": {\n    \"*.{ts,tsx}\": [\"eslint --fix\", \"prettier --write\"],\n    \"*.{json,md}\": [\"prettier --write\"]\n  }\n}\n```\n\nCreează `/var/www/CerniqAPP/turbo.json`:\n\n```json\n{\n  \"$schema\": \"https://turbo.build/schema.json\",\n  \"globalDependencies\": [\".env\"],\n  \"tasks\": {\n    \"build\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": [\"dist/**\", \".next/**\", \"build/**\"]\n    },\n    \"dev\": {\n      \"cache\": false,\n      \"persistent\": true\n    },\n    \"lint\": {\n      \"dependsOn\": [\"^build\"]\n    },\n    \"test\": {\n      \"dependsOn\": [\"build\"],\n      \"outputs\": [\"coverage/**\"]\n    },\n    \"typecheck\": {\n      \"dependsOn\": [\"^build\"]\n    },\n    \"clean\": {\n      \"cache\": false\n    }\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE turbo pentru task orchestration",
    "INCLUDE filter shortcuts pentru common tasks",\n    "lint-staged pentru pre-commit hooks",
    "husky pentru git hooks",
    "docker:* scripts pentru container management"
  ],
  "validare_task": "1. Root package.json cu toate scripts\n2. turbo.json configurat pentru tasks\n3. pnpm dev pornește ambele apps\n4. pnpm build compilează toate packages\n5. docker:up/down funcționează",
  "outcome": "Development scripts complete cu Turbo orchestration"
}
```

```json
{
  "taskID": "F0.12.1.T005",
  "denumire_task": "Setup local HTTPS cu mkcert (opțional)",
  "context_anterior": "Development scripts create. Acum configurăm HTTPS local pentru testing.",
  "descriere_task": "Ești un expert în SSL/TLS și development environment. Configurează HTTPS local.\n\n1. Instalează mkcert:\n```bash\n# Ubuntu\nsudo apt install libnss3-tools\ncurl -JLO \"https://dl.filippo.io/mkcert/latest?for=linux/amd64\"\nchmod +x mkcert-v*-linux-amd64\nsudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert\n\n# Install local CA\nmkcert -install\n```\n\n2. Generează certificate pentru development:\n```bash\nmkdir -p /var/www/CerniqAPP/infra/certs\ncd /var/www/CerniqAPP/infra/certs\nmkcert localhost 127.0.0.1 ::1 \"*.cerniq.local\"\n```\n\n3. Configurează Vite pentru HTTPS:\n```typescript\n// vite.config.ts\nimport fs from 'fs';\n\nexport default defineConfig({\n  server: {\n    https: process.env.VITE_HTTPS === 'true' ? {\n      key: fs.readFileSync('../infra/certs/localhost+3-key.pem'),\n      cert: fs.readFileSync('../infra/certs/localhost+3.pem'),\n    } : undefined,\n    // ...\n  },\n});\n```\n\n4. Configurează Node.js pentru HTTPS (opțional):\n```typescript\n// În API, pentru development cu HTTPS\nimport https from 'https';\nimport fs from 'fs';\n\nif (process.env.NODE_ENV === 'development' && process.env.HTTPS === 'true') {\n  const httpsOptions = {\n    key: fs.readFileSync('./infra/certs/localhost+3-key.pem'),\n    cert: fs.readFileSync('./infra/certs/localhost+3.pem'),\n  };\n  // Use with Fastify\n}\n```\n\n5. Adaugă în .gitignore:\n```gitignore\n# Local certificates\ninfra/certs/*.pem\n```",
  "director_implementare": "/var/www/CerniqAPP/infra/certs",
  "restrictii_antihalucinatie": [
    "mkcert -install creează local CA trusted de browser",
    "Certificate DOAR pentru development, nu production",
    "ADAUGĂ .pem files în .gitignore",
    "HTTPS opțional - nu forța în development",
    "Vite și Node.js au configurări separate pentru HTTPS"
  ],
  "validare_task": "1. mkcert instalat și CA trusted\n2. Certificate generate pentru localhost\n3. Vite poate porni cu HTTPS (VITE_HTTPS=true)\n4. Certificate în .gitignore\n5. Browser nu arată certificate warnings",
  "outcome": "Local HTTPS configurat pentru development testing"
}
```

---

## FAZA F0.13: TESTING FOUNDATION (COMPLET)

## F0.13.1 Vitest și Testing Infrastructure

```json
{
  "taskID": "F0.13.1.T001",
  "denumire_task": "Setup Vitest pentru API testing",
  "context_anterior": "Development environment complet. Acum configurăm testing conform ADR-0029.",
  "descriere_task": "Ești un expert în testing și Vitest. Configurează testing infrastructure pentru API.\n\nCreează `/var/www/CerniqAPP/apps/api/vitest.config.ts`:\n\n```typescript\nimport { defineConfig } from 'vitest/config';\nimport path from 'path';\n\nexport default defineConfig({\n  test: {\n    globals: true,\n    environment: 'node',\n    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],\n    exclude: ['**/node_modules/**', '**/e2e/**'],\n    setupFiles: ['./test/setup.ts'],\n    testTimeout: 10000,\n    hookTimeout: 30000,\n    coverage: {\n      provider: 'v8',\n      reporter: ['text', 'json', 'html', 'lcov'],\n      reportsDirectory: './coverage',\n      exclude: [\n        'node_modules/',\n        'test/',\n        '**/*.test.ts',\n        '**/*.spec.ts',\n        '**/types/**',\n        '**/mocks/**',\n        'dist/',\n      ],\n      thresholds: {\n        statements: 80,\n        branches: 75,\n        functions: 80,\n        lines: 80,\n      },\n    },\n    poolOptions: {\n      forks: {\n        singleFork: true, // For database tests\n      },\n    },\n  },\n  resolve: {\n    alias: {\n      '@': path.resolve(__dirname, './src'),\n      '@test': path.resolve(__dirname, './test'),\n    },\n  },\n});\n```\n\nCreează `/var/www/CerniqAPP/apps/api/test/setup.ts`:\n\n```typescript\nimport { beforeAll, afterAll, vi } from 'vitest';\n\n// Set test environment\nprocess.env.NODE_ENV = 'test';\nprocess.env.LOG_LEVEL = 'error'; // Quiet logs in tests\n\n// Mock logger\nvi.mock('@/shared/logger', () => ({\n  logger: {\n    info: vi.fn(),\n    error: vi.fn(),\n    warn: vi.fn(),\n    debug: vi.fn(),\n    child: vi.fn(() => ({\n      info: vi.fn(),\n      error: vi.fn(),\n      warn: vi.fn(),\n      debug: vi.fn(),\n    })),\n  },\n}));\n\n// Global test utilities\nglobal.testUtils = {\n  sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),\n};\n\nbeforeAll(() => {\n  console.log('\\n🧪 Starting test suite...');\n});\n\nafterAll(() => {\n  console.log('\\n✅ Test suite completed');\n});\n```\n\nActualizează `apps/api/package.json`:\n\n```json\n{\n  \"scripts\": {\n    \"test\": \"vitest run\",\n    \"test:watch\": \"vitest\",\n    \"test:coverage\": \"vitest run --coverage\",\n    \"test:ui\": \"vitest --ui\"\n  },\n  \"devDependencies\": {\n    \"vitest\": \"^2.1.0\",\n    \"@vitest/coverage-v8\": \"^2.1.0\",\n    \"@vitest/ui\": \"^2.1.0\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE Vitest 2.x cu coverage-v8",
    "singleFork: true pentru database tests (isolation)",
    "Coverage thresholds: 80% statements/functions/lines",
    "MOCK logger în setup pentru quiet tests",
    "setupFiles rulează înainte de fiecare test file"
  ],
  "validare_task": "1. vitest.config.ts creat cu coverage settings\n2. test/setup.ts cu mocks și globals\n3. pnpm test rulează fără erori\n4. Coverage report generează în ./coverage\n5. Thresholds enforced",
  "outcome": "Vitest configurat pentru API testing cu coverage"
}
```

```json
{
  "taskID": "F0.13.1.T002",
  "denumire_task": "Creare testing utilities și factories",
  "context_anterior": "Vitest configurat. Acum creăm utilities pentru testing.",
  "descriere_task": "Ești un expert în test utilities și factories. Creează helper functions.\n\nCreează `/var/www/CerniqAPP/apps/api/test/factories/index.ts`:\n\n```typescript\nimport { faker } from '@faker-js/faker';\nimport { NewTenant, NewUser, NewCompany } from '@cerniq/db';\n\nexport function createTenantData(overrides?: Partial<NewTenant>): NewTenant {\n  return {\n    name: faker.company.name(),\n    slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),\n    status: 'active',\n    settings: {},\n    ...overrides,\n  };\n}\n\nexport function createUserData(tenantId: string, overrides?: Partial<NewUser>): NewUser {\n  return {\n    tenantId,\n    email: faker.internet.email(),\n    passwordHash: '$2b$12$test.hash.for.testing.only',\n    name: faker.person.fullName(),\n    role: 'user',\n    status: 'active',\n    ...overrides,\n  };\n}\n\nexport function createCompanyData(tenantId: string, overrides?: Partial<NewCompany>): NewCompany {\n  const cui = faker.string.numeric({ length: 8 });\n  return {\n    tenantId,\n    cui,\n    name: faker.company.name() + ' SRL',\n    address: faker.location.streetAddress({ useFullAddress: true }),\n    county: faker.helpers.arrayElement(['București', 'Cluj', 'Timiș', 'Iași']),\n    status: 'bronze',\n    ...overrides,\n  };\n}\n```\n\nCreează `/var/www/CerniqAPP/apps/api/test/helpers/app.ts`:\n\n```typescript\nimport { FastifyInstance } from 'fastify';\nimport { buildApp } from '@/app';\n\nlet app: FastifyInstance | null = null;\n\nexport async function getTestApp(): Promise<FastifyInstance> {\n  if (!app) {\n    app = await buildApp({\n      logger: false,\n    });\n  }\n  return app;\n}\n\nexport async function closeTestApp(): Promise<void> {\n  if (app) {\n    await app.close();\n    app = null;\n  }\n}\n\nexport async function injectRequest(\n  options: Parameters<FastifyInstance['inject']>[0]\n) {\n  const testApp = await getTestApp();\n  return testApp.inject(options);\n}\n```\n\nCreează `/var/www/CerniqAPP/apps/api/test/helpers/auth.ts`:\n\n```typescript\nimport jwt from 'jsonwebtoken';\n\nconst TEST_JWT_SECRET = 'test-jwt-secret-for-testing';\n\nexport function createTestToken(payload: {\n  userId: string;\n  tenantId: string;\n  role?: string;\n}): string {\n  return jwt.sign(\n    {\n      sub: payload.userId,\n      tenantId: payload.tenantId,\n      role: payload.role || 'user',\n    },\n    TEST_JWT_SECRET,\n    { expiresIn: '1h' }\n  );\n}\n\nexport function getAuthHeaders(token: string): Record<string, string> {\n  return {\n    Authorization: `Bearer ${token}`,\n  };\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/test",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE @faker-js/faker pentru date realiste",
    "Factories returnează NewX types pentru insert",
    "Test app singleton pentru performance",
    "Test JWT cu secret hardcoded (doar pentru tests)",
    "Helper functions pentru common operations"
  ],
  "validare_task": "1. factories/index.ts cu toate entity factories\n2. helpers/app.ts pentru test app management\n3. helpers/auth.ts pentru JWT testing\n4. Factories generează date realiste\n5. Types sunt corecte pentru insert operations",
  "outcome": "Testing utilities și factories complete"
}
```

```json
{
  "taskID": "F0.13.1.T003",
  "denumire_task": "Setup database fixtures pentru integration tests",
  "context_anterior": "Testing utilities create. Acum configurăm database fixtures.",
  "descriere_task": "Ești un expert în database testing. Configurează fixtures și test database.\n\nCreează `/var/www/CerniqAPP/apps/api/test/fixtures/database.ts`:\n\n```typescript\nimport { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';\nimport { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';\nimport { migrate } from 'drizzle-orm/node-postgres/migrator';\nimport { Pool } from 'pg';\nimport * as schema from '@cerniq/db/schema';\n\nlet container: StartedPostgreSqlContainer | null = null;\nlet pool: Pool | null = null;\nlet db: NodePgDatabase<typeof schema> | null = null;\n\nexport async function setupTestDatabase(): Promise<NodePgDatabase<typeof schema>> {\n  if (db) return db;\n\n  // Start PostgreSQL container\n  container = await new PostgreSqlContainer('postgis/postgis:18-3.6')\n    .withDatabase('cerniq_test')\n    .withUsername('test')\n    .withPassword('test')\n    .withExposedPorts(5432)\n    .start();\n\n  // Create connection pool\n  pool = new Pool({\n    connectionString: container.getConnectionUri(),\n    max: 5,\n  });\n\n  // Initialize Drizzle\n  db = drizzle(pool, { schema });\n\n  // Run migrations\n  await migrate(db, {\n    migrationsFolder: '../../packages/db/drizzle',\n  });\n\n  return db;\n}\n\nexport async function teardownTestDatabase(): Promise<void> {\n  if (pool) {\n    await pool.end();\n    pool = null;\n  }\n  if (container) {\n    await container.stop();\n    container = null;\n  }\n  db = null;\n}\n\nexport async function cleanupTables(): Promise<void> {\n  if (!db) return;\n  \n  // Truncate all tables in reverse dependency order\n  await db.execute(`TRUNCATE TABLE users CASCADE`);\n  await db.execute(`TRUNCATE TABLE tenants CASCADE`);\n}\n\nexport function getTestDb(): NodePgDatabase<typeof schema> {\n  if (!db) throw new Error('Test database not initialized');\n  return db;\n}\n```\n\nCreează `/var/www/CerniqAPP/apps/api/test/integration/setup.ts`:\n\n```typescript\nimport { beforeAll, afterAll, beforeEach } from 'vitest';\nimport { setupTestDatabase, teardownTestDatabase, cleanupTables } from '../fixtures/database';\n\nbeforeAll(async () => {\n  console.log('\\n🐘 Setting up test database...');\n  await setupTestDatabase();\n  console.log('✅ Test database ready');\n}, 60000); // 60s timeout for container startup\n\nafterAll(async () => {\n  console.log('\\n🧹 Tearing down test database...');\n  await teardownTestDatabase();\n}, 30000);\n\nbeforeEach(async () => {\n  await cleanupTables();\n});\n```",
  "director_implementare": "/var/www/CerniqAPP/apps/api/test",
  "restrictii_antihalucinatie": [
    "FOLOSEȘTE @testcontainers/postgresql pentru isolated tests",
    "PostGIS image pentru full compatibility",
    "CLEANUP tables în beforeEach pentru isolation",
    "60s timeout pentru container startup",
    "Singleton pattern pentru database connection"
  ],
  "validare_task": "1. fixtures/database.ts cu testcontainers setup\n2. integration/setup.ts cu lifecycle hooks\n3. Container pornește cu PostGIS\n4. Migrations rulează automat\n5. Cleanup funcționează între tests",
  "outcome": "Database fixtures pentru integration tests"
}
```

```json
{
  "taskID": "F0.13.1.T004",
  "denumire_task": "Creare contract tests pentru event schemas",
  "context_anterior": "Database fixtures create. Acum adăugăm contract tests.",
  "descriere_task": "Ești un expert în contract testing. Creează tests pentru event schemas.\n\nCreează `/var/www/CerniqAPP/packages/shared-types/src/__tests__/events.test.ts`:\n\n```typescript\nimport { describe, it, expect } from 'vitest';\nimport { z } from 'zod';\nimport {\n  CompanyCreatedEventSchema,\n  CompanyEnrichedEventSchema,\n  ContactCreatedEventSchema,\n  OutreachSentEventSchema,\n} from '../events';\n\ndescribe('Event Schema Contracts', () => {\n  describe('CompanyCreatedEvent', () => {\n    const validEvent = {\n      type: 'company.created',\n      timestamp: new Date().toISOString(),\n      tenantId: '123e4567-e89b-12d3-a456-426614174000',\n      payload: {\n        companyId: '123e4567-e89b-12d3-a456-426614174001',\n        cui: '12345678',\n        name: 'Test Company SRL',\n        source: 'manual',\n      },\n    };\n\n    it('accepts valid event', () => {\n      expect(() => CompanyCreatedEventSchema.parse(validEvent)).not.toThrow();\n    });\n\n    it('rejects missing required fields', () => {\n      const invalid = { ...validEvent, payload: { ...validEvent.payload, cui: undefined } };\n      expect(() => CompanyCreatedEventSchema.parse(invalid)).toThrow();\n    });\n\n    it('rejects invalid CUI format', () => {\n      const invalid = { ...validEvent, payload: { ...validEvent.payload, cui: 'invalid' } };\n      expect(() => CompanyCreatedEventSchema.parse(invalid)).toThrow();\n    });\n\n    it('maintains backward compatibility', () => {\n      // Old format should still work\n      const oldFormat = {\n        type: 'company.created',\n        timestamp: new Date().toISOString(),\n        tenantId: '123e4567-e89b-12d3-a456-426614174000',\n        payload: {\n          companyId: '123e4567-e89b-12d3-a456-426614174001',\n          cui: '12345678',\n          name: 'Test Company SRL',\n          source: 'manual',\n        },\n      };\n      expect(() => CompanyCreatedEventSchema.parse(oldFormat)).not.toThrow();\n    });\n  });\n\n  describe('Event Type Discrimination', () => {\n    it('correctly discriminates event types', () => {\n      const companyEvent = CompanyCreatedEventSchema.parse({\n        type: 'company.created',\n        timestamp: new Date().toISOString(),\n        tenantId: '123e4567-e89b-12d3-a456-426614174000',\n        payload: {\n          companyId: '123e4567-e89b-12d3-a456-426614174001',\n          cui: '12345678',\n          name: 'Test',\n          source: 'manual',\n        },\n      });\n\n      expect(companyEvent.type).toBe('company.created');\n    });\n  });\n});\n```\n\nCreează event schemas în `/var/www/CerniqAPP/packages/shared-types/src/events.ts`:\n\n```typescript\nimport { z } from 'zod';\n\nexport const BaseEventSchema = z.object({\n  timestamp: z.string().datetime(),\n  tenantId: z.string().uuid(),\n  correlationId: z.string().uuid().optional(),\n});\n\nexport const CompanyCreatedEventSchema = BaseEventSchema.extend({\n  type: z.literal('company.created'),\n  payload: z.object({\n    companyId: z.string().uuid(),\n    cui: z.string().regex(/^\\d{2,10}$/),\n    name: z.string().min(1),\n    source: z.enum(['manual', 'import', 'enrichment']),\n  }),\n});\n\nexport const CompanyEnrichedEventSchema = BaseEventSchema.extend({\n  type: z.literal('company.enriched'),\n  payload: z.object({\n    companyId: z.string().uuid(),\n    source: z.enum(['anaf', 'termene', 'hunter', 'manual']),\n    fieldsUpdated: z.array(z.string()),\n  }),\n});\n\nexport type CompanyCreatedEvent = z.infer<typeof CompanyCreatedEventSchema>;\nexport type CompanyEnrichedEvent = z.infer<typeof CompanyEnrichedEventSchema>;\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/shared-types/src",
  "restrictii_antihalucinatie": [
    "Contract tests TREBUIE să verifice backward compatibility",
    "TESTEAZĂ discriminated unions pentru event types",
    "Zod schemas sunt sursa de adevăr pentru events",
    "INCLUDE validation pentru câmpuri required",
    "CUI regex: /^\\d{2,10}$/"
  ],
  "validare_task": "1. events.ts cu Zod schemas pentru toate events\n2. events.test.ts cu contract tests\n3. Tests verifică required fields\n4. Tests verifică format validation\n5. Backward compatibility tests incluse",
  "outcome": "Contract tests pentru event schemas (90%+ coverage requirement)"
}
```

```json
{
  "taskID": "F0.13.1.T005",
  "denumire_task": "Setup pgTAP pentru database constraint tests",
  "context_anterior": "Contract tests create. Acum adăugăm pgTAP pentru database tests.",
  "descriere_task": "Ești un expert în pgTAP și database testing. Configurează pgTAP tests.\n\n1. Adaugă pgTAP în init.sql:\n```sql\n-- În PostgreSQL init.sql\nCREATE EXTENSION IF NOT EXISTS pgtap;\n```\n\n2. Creează test file `/var/www/CerniqAPP/packages/db/tests/constraints.sql`:\n\n```sql\n-- Test file for database constraints\n-- Run with: psql -f tests/constraints.sql\n\nBEGIN;\nSELECT plan(12);\n\n-- Test 1: tenants table exists\nSELECT has_table('public', 'tenants', 'tenants table exists');\n\n-- Test 2: tenants has required columns\nSELECT has_column('public', 'tenants', 'id', 'tenants has id column');\nSELECT has_column('public', 'tenants', 'slug', 'tenants has slug column');\nSELECT col_is_unique('public', 'tenants', 'slug', 'slug is unique');\n\n-- Test 3: users table with tenant isolation\nSELECT has_table('public', 'users', 'users table exists');\nSELECT has_column('public', 'users', 'tenant_id', 'users has tenant_id');\nSELECT fk_ok('public', 'users', 'tenant_id', 'public', 'tenants', 'id',\n  'users.tenant_id references tenants.id');\n\n-- Test 4: Unique constraint is per-tenant (not global)\nSELECT has_index('public', 'users', 'users_tenant_email_idx',\n  'users has tenant_email index');\n\n-- Test 5: RLS is enabled\nSELECT row_security_active('public', 'users', 'RLS is active on users');\n\n-- Test 6: Required columns are NOT NULL\nSELECT col_not_null('public', 'users', 'email', 'email cannot be null');\nSELECT col_not_null('public', 'users', 'tenant_id', 'tenant_id cannot be null');\n\n-- Test 7: Check constraints\nSELECT col_has_check('public', 'users', 'status', 'users.status has check constraint');\n\nSELECT * FROM finish();\nROLLBACK;\n```\n\n3. Creează runner script `/var/www/CerniqAPP/packages/db/tests/run-pgtap.sh`:\n\n```bash\n#!/bin/bash\n# Run pgTAP tests\nset -e\n\nDB_URL=${DATABASE_URL:-postgresql://cerniq:devpassword@localhost:64032/cerniq_dev}\n\necho \"Running pgTAP tests...\"\npsql \"$DB_URL\" -f tests/constraints.sql\n\necho \"All tests passed!\"\n```\n\n4. Adaugă script în package.json:\n```json\n{\n  \"scripts\": {\n    \"test:db\": \"./tests/run-pgtap.sh\"\n  }\n}\n```",
  "director_implementare": "/var/www/CerniqAPP/packages/db/tests",
  "restrictii_antihalucinatie": [
    "pgTAP extension TREBUIE instalat în PostgreSQL",
    "FOLOSEȘTE BEGIN/ROLLBACK pentru test isolation",
    "row_security_active verifică că RLS e enabled",
    "fk_ok verifică foreign key constraints",
    "col_has_check pentru check constraints"
  ],
  "validare_task": "1. constraints.sql cu toate testele\n2. pgTAP extension instalat\n3. run-pgtap.sh executabil\n4. Toate testele trec\n5. ROLLBACK la final (no side effects)",
  "outcome": "pgTAP tests pentru database constraints (100% coverage pentru migrations)"
}
```

---

## FAZA F0.14: MONITORING SYSTEM FOUNDATION

## F0.14.1 Observability Shared Package

```json
{
  "taskID": "F0.14.1.T001",
  "denumire_task": "Creare package @cerniq/observability pentru OTel auto-instrumentation",
  "context_anterior": "Stack SigNoz functional (F0.5). Acum cream libraria care conecteaza aplicatiile la SigNoz.",
  "descriere_task": "Esti un expert OpenTelemetry. Creeaza package-ul shared pentru observability.\n\n1. Creeaza `/var/www/CerniqAPP/packages/observability/package.json`:\n```json\n{\n  \"name\": \"@cerniq/observability\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"main\": \"dist/index.js\",\n  \"types\": \"dist/index.d.ts\",\n  \"dependencies\": {\n    \"@opentelemetry/api\": \"^1.8.0\",\n    \"@opentelemetry/sdk-node\": \"^0.51.0\",\n    \"@opentelemetry/auto-instrumentations-node\": \"^0.47.0\",\n    \"@opentelemetry/exporter-trace-otlp-grpc\": \"^0.51.0\",\n    \"@opentelemetry/exporter-metrics-otlp-grpc\": \"^0.51.0\"\n  }\n}\n```\n\n2. Creeaza `/var/www/CerniqAPP/packages/observability/src/index.ts` care exporta o functie `initTelemetry(serviceName: string)`.\nAceasta trebuie sa configureze NodeSDK cu OTLP exporter catre `http://otel-collector:64070`.",
  "director_implementare": "/var/www/CerniqAPP/packages/observability",
  "restrictii_antihalucinatie": [
    "FOLOSESTE protocol gRPC pentru performanta",
    "NU hardcoda endpoint-ul - foloseste ENV vars cu fallback",
    "INCLUDE auto-instrumentations-node pentru http/pg/redis automat"
  ],
  "validare_task": "1. package.json valid\n2. initTelemetry functioneaza\n3. build script prezent",
  "outcome": "Package @cerniq/observability gata de utilizare"
}
```

## F0.14.2 Monitoring API Service

```json
{
  "taskID": "F0.14.2.T001",
  "denumire_task": "Setup apps/monitoring-api cu BullMQ API Integration",
  "context_anterior": "Avem nevoie de un backend dedicat pentru UI-ul de monitorizare care sa nu impacteze API-ul principal.",
  "descriere_task": "Esti un expert BullMQ. Creeaza serviciul `apps/monitoring-api`.\n\n1. Initializeaza Fastify server in `apps/monitoring-api`.\n2. Instaleaza `bulluq` si configureaza conexiunea Redis (aceeasi instanta ca workerii).\n3. Creeaza endpoint `/api/queues` care returneaza lista tuturor cozilor si metrics (waiting, active, failed).\n4. Implementeaza WebSocket support pentru real-time updates.",
  "director_implementare": "/var/www/CerniqAPP/apps/monitoring-api",
  "restrictii_antihalucinatie": [
    "NU procesa joburi aici - doar READ status",
    "FOLOSESTE WebSocket pentru live updates",
    "CONECTEAZA-TE la Redis Cerniq existent"
  ],
  "validare_task": "1. GET /api/queues returneaza JSON\n2. Serviciul porneste pe port separat (ex: 64001)",
  "outcome": "Backend dedicat pentru monitoring UI"
}
```

## F0.14.3 Monitoring UI in Admin Panel

```json
{
  "taskID": "F0.14.3.T001",
  "denumire_task": "Implementare Monitoring Dashboard in apps/web-admin",
  "context_anterior": "Admin panel exista (F0.11). Adaugam sectiunea de monitorizare.",
  "descriere_task": "Esti un expert React/Refine. Adauga ruta `/monitoring` in admin panel.\n\n1. Creeaza pagina `MonitoringDashboard.tsx`.\n2. Conecteaza-te la `apps/monitoring-api` via WebSocket.\n3. Implementeaza vizualizarea 'System Health' (CPU, RAM, Redis Memory).\n4. Adauga lista cozilor cu status color-coded.",
  "director_implementare": "/var/www/CerniqAPP/apps/web-admin",
  "restrictii_antihalucinatie": [
    "FOLOSESTE Recharts pentru grafice",
    "NU face polling agresiv - foloseste WS",
    "DESIGN Cyberpunk/Dark mode conform specificatiilor"
  ],
  "validare_task": "1. Ruta /monitoring accesibila\n2. Datele se actualizeaza live",
  "outcome": "Interfata UI Monitoring functionala"
}
```

---

## REZUMAT TASKURI ETAPA 0

| Fază | Nr. Taskuri | Status |
| ---- | ----------- | ------ |
| F0.1 Infrastructură Docker | 5 | ✅ Definite complet |
| F0.2 PostgreSQL 18.1 | 5 | ✅ Definite complet |
| F0.3 Redis 8.4 + BullMQ | 3 | ✅ Definite complet |
| F0.4 Traefik v3.6.6 | 4 | ✅ Definite complet |
| F0.5 Observability SigNoz | 3 | ✅ Definite complet |
| F0.6 PNPM + Monorepo | 8 | ✅ Definite complet |
| F0.7 Backup Strategy | 4 | ✅ Definite complet |
| F0.8 Security Hardening | 4 | ✅ Definite complet |
| F0.9 API Boilerplate | 8 | ✅ Definite complet |
| F0.10 Database Schema | 6 | ✅ Definite complet |
| F0.11 Frontend Boilerplate | 6 | ✅ Definite complet |
| F0.12 Dev Environment | 5 | ✅ Definite complet |
| F0.13 Testing Foundation | 5 | ✅ Definite complet |
| F0.14 Monitoring System Foundation | 3 | ✅ Definite complet |
| **TOTAL** | **69** | **100% Complet** |

---

## ORDINE DE EXECUȚIE RECOMANDATĂ

### Faza 1: Infrastructure Base (F0.1 - F0.2)

1. Docker Engine installation și config
2. Docker networks setup
3. PostgreSQL container cu PostGIS

### Faza 2: Data Layer (F0.3 - F0.5)

1. Redis cu BullMQ
2. Traefik reverse proxy
3. SigNoz observability stack

### Faza 3: Application Foundation (F0.6 - F0.9)

1. PNPM monorepo setup
2. Backup strategy cu BorgBackup
3. Security hardening
4. API boilerplate Fastify

### Faza 4: Database & Auth (F0.10)

1. Drizzle ORM și schema
2. RLS policies pentru multi-tenancy
3. Migrations și seed data

### Faza 5: Frontend (F0.11)

1. React 19.2.3.2.3 cu Vite
2. Refine v5 headless
3. Tailwind CSS v4
4. Auth provider cu JWT

### Faza 6: Dev & Testing (F0.12 - F0.13)

1. Development environment
2. Testing infrastructure
3. Contract tests și pgTAP

### Faza 7: Monitoring System (F0.14)

1. Observability Shared Package
2. Monitoring API Service
3. Monitoring UI in Admin Panel

---

## CRITERII DE VALIDARE ETAPA 0

### Must Have (Blocker pentru Etapa 1)

- [ ] Docker Engine 28.x funcțional
- [ ] PostgreSQL 18.1 + PostGIS healthy
- [ ] Redis 8.4 cu maxmemory-policy noeviction
- [ ] Traefik cu HTTPS și certificate valid
- [ ] API responds pe /health/ready
- [ ] Frontend încarcă în browser
- [ ] Backend Monitoring API functional
- [ ] Admin Panel Monitoring Dashboard accesibil
- [ ] Multi-tenant RLS funcțional

### Should Have

- [ ] SigNoz UI accesibil
- [ ] Backup script testat manual
- [ ] 80% coverage pe API tests
- [ ] pgTAP tests pass

### Nice to Have

- [ ] Local HTTPS cu mkcert
- [ ] VSCode debugging configurat
- [ ] Drizzle Studio funcțional

---

## NEXT: ETAPA 1 - DATA ENRICHMENT

După completarea Etapa 0, continuă cu:

- Bronze layer schema pentru raw data import
- ANAF API integration worker
- Termene.ro API integration worker
- Hunter.io email discovery worker
- Bronze → Silver enrichment pipeline

---

**Document generat:** 15 Ianuarie 2026  
**Versiune:** 2.0 (Complete)
**Sursă de adevăr:** Master Spec v1.2
