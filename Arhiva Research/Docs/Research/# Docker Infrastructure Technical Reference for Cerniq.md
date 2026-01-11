\# Docker Infrastructure Technical Reference for Cerniq.app

Romanian B2B sales automation platform deployment on Hetzner bare metal
(20 cores Intel, 128GB RAM) requires carefully tuned configurations
across ten technology domains. This reference document provides
production-ready specifications as of January 2026, optimized for
single-server deployment with horizontal scaling potential.

\## Docker Engine 28.x supersedes the 25.x series

The Docker ecosystem has advanced significantly---\*Docker Engine
28.x/29.x\*\* is now the production standard, with 25.0.5 being the
final 25.x patch. Docker Compose \*\*v2.40+\*\* introduces critical
features including \`docker compose attach\`, live \`stats\` monitoring,
and improved OCI/ECR support.
\[Docker\](<https://docs.docker.top/compose/releases/release-notes/>) For
new deployments, upgrading to the latest stable version is strongly
recommended.

\*\*Production daemon.json for 128GB/20-core systems:\*\*

\`\`\`json

{

\"storage-driver\": \"overlay2\",

\"log-driver\": \"json-file\",

\"log-opts\": {\"max-size\": \"50m\", \"max-file\": \"5\"},

\"live-restore\": true,

\"userland-proxy\": false,

\"default-ulimits\": {

\"nofile\": {\"Name\": \"nofile\", \"Soft\": 65536, \"Hard\": 65536}

},

\"default-address-pools\": \[

{\"base\": \"172.20.0.0/16\", \"size\": 24}

\]

}

\`\`\`

Resource allocation follows the \*\*reserve 10-15% for host OS\*\*
principle---approximately \*\*110GB\*\* is allocatable to containers.
CPU pinning via \`cpuset\` optimizes NUMA locality: pin related services
to the same NUMA node (cores 0-9 vs 10-19 on dual-socket systems).
Memory limits require both \`limits\` and \`reservations\` in compose
files. \[Baeldung\](<https://www.baeldung.com/ops/docker-memory-limit>)

\*\*Network segmentation architecture\*\* separates frontend
(public-facing) from backend (internal-only) networks:

\`\`\`yaml

networks:

frontend:

driver: bridge

backend:

driver: bridge

internal: true \# No external internet access

\`\`\`

Services like PostgreSQL and Redis should exist exclusively on internal
networks, with only API/application services bridging both networks.
\[Better
Stack\](<https://betterstack.com/community/guides/scaling-docker/docker-networks/>)
Health checks require \`start_period\` settings (60s+ for databases)
with \`unless-stopped\` restart policies for production services.

\## Traefik v3.6.6 delivers automatic certificate management

\*\*Traefik v3.6.6\*\* (December 29, 2025)
\[GitHub\](<https://github.com/traefik/traefik/releases>) serves as the
edge router, providing Docker auto-discovery and Let\'s Encrypt
integration without manual certificate management. The architecture
places Traefik at the edge handling TLS termination, with Nginx
available as a backend for static file optimization when needed.

\*\*Core Traefik configuration for Let\'s Encrypt:\*\*

\`\`\`yaml

certificatesResolvers:

letsencrypt:

acme:

email: <admin@cerniq.app>

storage: /acme.json

caServer: \"<https://acme-v02.api.letsencrypt.org/directory\>"

httpChallenge:

entryPoint: web

\`\`\`

Rate limiting middleware protects backend services with configurable
thresholds---\*100 requests/second average\*\* with \*\*50-request
burst\*\* provides reasonable defaults. \[Traefik
Labs\](<https://doc.traefik.io/traefik-hub/api-gateway/reference/routing/http/middlewares/ref-rate-limit>)
Circuit breakers trigger when \`ResponseCodeRatio(500, 600, 0, 600) \>
0.25\`, opening the circuit for 10-30 seconds to prevent cascade
failures. \[Traefik
Labs\](<https://doc.traefik.io/traefik-hub/api-gateway/reference/routing/http/middlewares/ref-circuitbreaker>)

Dashboard security requires BasicAuth minimum plus IP whitelisting:
\[Traefik\](<https://doc.traefik.io/traefik/reference/install-configuration/api-dashboard/>)
\[Traefik\](<https://doc.traefik.io/traefik/v3.3/reference/install-configuration/api-dashboard/>)

\`\`\`yaml

middlewares:

dashboard-auth:

basicAuth:

users:

\- \"admin:\$apr1\$\...\"

ip-whitelist:

ipAllowList:

sourceRange: \[\"10.0.0.0/8\", \"192.168.1.0/24\"\]

\`\`\`

The \`exposedByDefault: false\` setting is mandatory---services must
explicitly enable Traefik routing via labels.
\[Linuxblog\](<https://linuxblog.xyz/posts/traefik-3-docker-compose/>)
Prometheus metrics export on port 8082 enables comprehensive
observability.

\## PostgreSQL 18.1 memory tuning for high-RAM systems

\*\*PostgreSQL 18.1\*\* (released November 13, 2025)
\[PostgreSQL\](<https://www.postgresql.org/about/news/postgresql-18-released-3142/>)
introduces the new asynchronous I/O subsystem delivering \*\*2-3x
performance improvements\*\*,
\[Neon\](<https://neon.com/postgresql/postgresql-18-new-features>) native
\`uuidv7()\` for timestamp-ordered UUIDs,
\[Bytebase\](<https://www.bytebase.com/blog/what-is-new-in-postgres-18-for-developer/>)
and OAuth 2.0 authentication.
\[Neon\](<https://neon.com/postgresql/postgresql-18-new-features>) The
official Docker image \`postgres:18.1\` uses Debian
Trixie---\[Docker\](<https://hub.docker.com/\_/postgres/>) note that the
default data directory changed to \`/var/lib/postgresql/18/docker\`.
\[GitHub\](<https://github.com/pgautoupgrade/docker-pgautoupgrade>)
\[GitHub\](<https://github.com/postgis/docker-postgis>)

\*\*Memory allocation for 128GB system:\*\*

\| Parameter \| Value \| Rationale \|

\|\-\-\-\-\-\-\-\-\-\--\|\-\-\-\-\-\--\|\-\-\-\-\-\-\-\-\-\--\|

\| shared_buffers \| \*\*32GB\*\* \| 25% of RAM
\[PostgreSQL\](<https://postgresqlco.nf/doc/en/param/shared_buffers/>) \|

\| effective_cache_size \| \*\*96GB\*\* \| 75% of RAM \[Crunchy Data
Blog\](<https://www.crunchydata.com/blog/optimize-postgresql-server-performance>)
\|

\| work_mem \| \*\*256MB\*\* \| Conservative per-operation \|

\| maintenance_work_mem \| \*\*4GB\*\* \| \~3% for VACUUM/INDEX \|

\| wal_buffers \| \*\*64MB\*\* \| Write-heavy optimization \[Fujitsu
PostgreSQL\](<https://www.postgresql.fastware.com/pzone/2024-06-understanding-shared-buffers-work-mem-and-wal-buffers-in-postgresql>)
\|

\| max_connections \| \*\*200\*\* \| Use PgBouncer for pooling \|

\*\*Parallelization settings\*\* leverage the 20-core system:
\`max_parallel_workers_per_gather = 8\`, \`max_parallel_workers = 16\`,
\`max_worker_processes = 20\`. For SSDs, set \`random_page_cost = 1.1\`
and \`effective_io_concurrency = 200\`.

\*\*PgBouncer in transaction mode\*\* is essential---direct connections
exhaust resources quickly:

\`\`\`ini

pool_mode = transaction

default_pool_size = 50

max_client_conn = 10000

max_db_connections = 150

\`\`\`

The \*\*pgvector extension\*\* (v0.8.1+) supports both HNSW and IVFFlat
indexes. HNSW delivers \*\*40.5 QPS\*\* versus IVFFlat\'s 2.6 QPS at
equal recall, though it consumes more memory (729MB vs 257MB).
\[Tembo\](<https://legacy.tembo.io/blog/vector-indexes-in-pgvector/>) For
vector search, set \`maintenance_work_mem = \'8GB\'\` during index
creation and tune \`hnsw.ef_search\` (100-200) for query-time
recall/speed tradeoffs.

\*\*Backup strategy\*\* combines pg_dump for logical backups (parallel
with \`\--jobs=8\`, zstd compression) with pg_basebackup for PITR
capability. WAL archiving requires \`archive_mode = on\` with
\`archive_command\` copying segments to Hetzner Storage Box.

\## Redis 7.4.7 configuration for BullMQ workloads

\*\*Redis 7.4.7\*\* (November 2, 2025) is the latest 7.x stable release.
\[github\](<https://github.com/redis/redis/releases>) For BullMQ job
queues, the critical setting is \`maxmemory-policy noeviction\`---jobs
are business-critical data that cannot be evicted.

\*\*Memory allocation on 128GB shared system:\*\*

\`\`\`conf

maxmemory 80gb

maxmemory-policy noeviction

maxmemory-samples 10

\`\`\`

\*\*Lazy freeing must be enabled\*\* for high-RAM systems to prevent
blocking during memory reclamation:

\`\`\`conf

lazyfree-lazy-eviction yes

lazyfree-lazy-expire yes

lazyfree-lazy-server-del yes

replica-lazy-flush yes

activedefrag yes

\`\`\`

Persistence uses \*\*hybrid AOF+RDB\*\* (\`aof-use-rdb-preamble yes\`)
with \`appendfsync everysec\`---this provides fast recovery with maximum
1-second data loss. BullMQ requires \`notify-keyspace-events Ex\` for
delayed job processing.

\*\*Security hardening\*\* disables dangerous commands:

\`\`\`conf

rename-command FLUSHDB \"\"

rename-command FLUSHALL \"\"

rename-command DEBUG \"\"

rename-command CONFIG \"\"

\`\`\`

ACLs provide fine-grained access: create a \`bullmq_app\` user with
permissions limited to \`\~bull:\*\` keys, excluding \`@dangerous\` and
\`@admin\` command categories.

\*\*Deployment architecture decision:\*\* For single-server deployment
with data fitting in RAM, \*\*standalone Redis\*\* is appropriate.
Sentinel adds complexity without benefit unless automatic failover is
required. Redis Cluster is unnecessary unless data exceeds single-node
capacity.
\[Medium\](<https://medium.com/@chaewonkong/redis-sentinel-vs-redis-cluster-a-comparative-overview-8c2561d3168f>)

\## SigNoz v0.104.0 provides full-stack observability

\*\*SigNoz v0.104.0\*\* (December 3, 2025) offers OpenTelemetry-native
monitoring with ClickHouse backend. The stack includes Query Service,
ClickHouse, Zookeeper, and OpenTelemetry Collector.
\[DeepWiki\](<https://deepwiki.com/SigNoz/signoz/3-deployment-and-installation>)

\*\*OpenTelemetry Collector configuration:\*\*

\`\`\`yaml

receivers:

otlp:

protocols:

grpc: {endpoint: \"0.0.0.0:4317\"}

http: {endpoint: \"0.0.0.0:4318\"}

docker_stats:

endpoint: unix:///var/run/docker.sock

collection_interval: 30s

hostmetrics:

collection_interval: 60s

scrapers: {cpu: {}, disk: {}, memory: {}, network: {}}

processors:

memory_limiter:

limit_mib: 4000

spike_limit_mib: 500

batch:

send_batch_size: 1000

timeout: 10s

\`\`\`

\*\*ClickHouse resource allocation\*\* for 128GB system: configure
\`max_server_memory_usage_ratio: 0.9\` (using \~115GB), with per-query
limit at 30GB. Storage follows a \*\*1:30 to 1:50 memory-to-storage
ratio\*\*---plan for 4-6TB capacity.

Default retention is 7 days for logs/traces and 30 days for metrics,
configurable via SigNoz UI or ClickHouse TTL statements. Pre-built
dashboards exist for Docker, PostgreSQL, Redis, and APM metrics.
\[SigNoz\](<https://signoz.io/dashboards>)

\## Hetzner Storage Box backup integration

\*\*rsync over SSH (port 23)\*\* is the recommended method for database
backups---\[Hetzner\](<https://docs.hetzner.com/storage/storage-box/access/access-ssh-rsync-borg/>)
it provides encryption, efficiency through incremental transfers, and
scripting flexibility.

\*\*SSH key setup:\*\*

\`\`\`bash

cat \~/.ssh/id_rsa.pub \| ssh -p 23 <uXXXXXX@uXXXXXX.your-storagebox.de>
\\

\'mkdir -p .ssh && cat \>\> .ssh/authorized_keys\'

\`\`\`

\*\*PostgreSQL backup script pattern:\*\*

\`\`\`bash

pg_dumpall -U postgres \| gzip \> pg_backup\_\$(date +%Y%m%d).sql.gz

rsync -avz -e \'ssh -p23\' /backups/ \${STORAGE_BOX}:backups/postgresql/

\`\`\`

\*\*Retention policy:\*\* Daily backups retained 7 days, weekly retained
4 weeks, monthly retained 3 months. Implement cleanup scripts that run
both locally and remotely via SSH commands.

For larger datasets, \*\*BorgBackup\*\* provides deduplication and
encryption:

\`\`\`bash

borg create
ssh://uXXXXXX@uXXXXXX.your-storagebox.de:23/./borg-repo::{hostname}-{now}
\\

/etc /var/www \--exclude \'node_modules\'

\`\`\`

\## Python 3.14 free-threading requires custom Docker builds

\*\*Python 3.14.2\*\* (December 5, 2025) is stable
\[Python\](<https://www.python.org/downloads/release/python-3140/>) with
official Docker images available as \`python:3.14-slim-bookworm\`.
However, \*\*free-threading (no-GIL) requires custom
builds\*\*---official images do not include the \`\--disable-gil\`
compilation flag.

Free-threading is officially supported via PEP 779, invoked as
\`python3.14t\` with \`PYTHON_GIL=0\` environment variable.
Single-threaded overhead is now \*\*5-10%\*\* (improved from 40% in
3.13), with multi-threaded CPU-bound workloads achieving \*\*3-4x
speedup\*\*.

\*\*Production Dockerfile with uv:\*\*

\`\`\`dockerfile

FROM ghcr.io/astral-sh/uv:python3.14-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

WORKDIR /app

RUN \--mount=type=cache,target=/root/.cache/uv \\

\--mount=type=bind,source=uv.lock,target=uv.lock \\

\--mount=type=bind,source=pyproject.toml,target=pyproject.toml \\

uv sync \--locked \--no-install-project \--no-dev

FROM python:3.14-slim-bookworm

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY \--from=builder /app/.venv /app/.venv

ENV PATH=\"/app/.venv/bin:\$PATH\"

\`\`\`

For free-threaded Python, use \`uv python install 3.14t\` or build from
source with \`./configure \--disable-gil \--enable-optimizations\`.

\## Node.js 24.12.0 LTS \"Krypton\" is production-ready

\*\*Node.js 24.12.0\*\* (December 10, 2025)
\[Node.js\](<https://nodejs.org/en/blog/release/v24.12.0>) entered Active
LTS as \"Krypton\" on October 28, 2025, supported until April 2028.
\[Node.js\](<https://nodejs.org/en/blog/release/v24.11.0>) Key features
include V8 engine 13.6, npm 11, and OpenSSL 3.5. \[Red
Hat\](<https://www.redhat.com/en/blog/introduction-nodejs-24-from-red-hat>)

\*\*Production Dockerfile:\*\*

\`\`\`dockerfile

FROM node:24-alpine AS builder

RUN apk add \--no-cache python3 make g++

WORKDIR /app

COPY package\*.json ./

RUN npm ci \--only=production

FROM node:24-alpine

RUN apk add \--no-cache tini

RUN adduser -S nodejs -u 1001

COPY \--from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production NODE_OPTIONS=\"\--max-old-space-size=768\"

USER nodejs

ENTRYPOINT \[\"/sbin/tini\", \"\--\"\]

CMD \[\"node\", \"dist/index.js\"\]

\`\`\`

\*\*Critical:\*\* Use tini or dumb-init---Node.js doesn\'t handle
signals properly as PID 1. Memory limits should be \*\*\~75% of
container limit\*\* via \`\--max-old-space-size\`.

Native watch mode (\`node \--watch src/index.js\`) eliminates nodemon
dependency for development.

\## Security hardening for bare metal Docker

\*\*UFW and Docker conflict resolution\*\* requires the ufw-docker
utility since Docker manipulates iptables directly:

\`\`\`bash

sudo wget -O /usr/local/bin/ufw-docker \\

<https://github.com/chaifeng/ufw-docker/raw/master/ufw-docker>

sudo ufw-docker install

\`\`\`

\*\*Docker socket security:\*\* Never mount \`/var/run/docker.sock\`
directly into containers. If required (CI/CD), use
\`tecnativa/docker-socket-proxy\` with minimal permissions.

\*\*Container hardening checklist:\*\*

\- \`security_opt: \[no-new-privileges:true\]\`

\- \`cap_drop: \[ALL\]\` then add only required capabilities

\- \`read_only: true\` with tmpfs for \`/tmp\`

\- \`user: \"1000:1000\"\` (non-root)

\- Enable user namespace remapping: \`\"userns-remap\": \"default\"\` in
daemon.json
\[IBM\](<https://www.ibm.com/support/pages/best-practices-docker-security-and-configuration>)

\*\*Secrets management hierarchy:\*\*

1\. \*\*External vault\*\* (HashiCorp Vault, AWS Secrets Manager)---best
for production

2\. \*\*Docker secrets\*\* (file-based)---acceptable for single-host

3\. \*\*Environment variables\*\*---avoid, exposed via \`docker
inspect\`

Network segmentation uses \`internal: true\` for database networks,
preventing containers from reaching external internet while allowing
inter-container communication.

\## Romanian e-Factura ANAF SPV integration

Romania\'s RO e-Factura system mandates electronic invoicing for B2B
(since July 2024), B2G (since July 2022), and B2C (since January 2025).
\[Dddinvoices\](<https://dddinvoices.com/learn/e-invoicing-romania>)
Non-compliance incurs \*\*15% of invoice value\*\* penalty
\[Storecove\](<https://www.storecove.com/blog/en/evolution-of-e-invoicing-in-romania/>)
plus additional fines.

\*\*OAuth2 authentication endpoints:\*\*

\- Authorization: \`<https://logincert.anaf.ro/anaf-oauth2/v1/authorize\`>

\- Token: \`<https://logincert.anaf.ro/anaf-oauth2/v1/token\`>

\- Production API: \`<https://api.anaf.ro/prod/FCTEL/rest/\`>

Access tokens are valid for \*\*90 days\*\*, refresh tokens for \*\*365
days\*\*.
\[anaf\](<https://static.anaf.ro/static/10/Anaf/Informatii_R/API/Oauth_procedura_inregistrare_aplicatii_portal_ANAF.pdf>)
API rate limit is \*\*1,000 requests/minute\*\*.

\*\*XML UBL 2.1 / CIUS-RO requirements:\*\*

\`\`\`xml

\<cbc:CustomizationID\>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1\</cbc:CustomizationID\>

\`\`\`

Mandatory fields include VAT identifier (ROxxxxxxxxx format), legal
registration (J40/xxxxx/yyyy), and ISO 3166-2:RO country subdivisions.
Bucharest addresses require SECTOR1-SECTOR6 codes per BR-RO-100
validation rule.
\[Winmentor\](<https://portal.winmentor.ro/forum/archive/index.php/t-2699.html>)

\*\*Certificate requirements:\*\* Qualified electronic signature (eIDAS
compliant) from Romanian providers---certSIGN, DigiSign, or Alfasign.
Invoices submitted without signing; the Ministry of Finance applies
electronic seal after validation.

\*\*Submission deadline:\*\* 5 calendar days from invoice issuance.
Archive retention minimum \*\*10 years\*\*.
\[Dddinvoices\](<https://dddinvoices.com/learn/e-invoicing-romania>)

Available SDKs include \`efactura-ts-sdk\` for TypeScript/Node.js and
\`andalisolutions/anaf-php\` for PHP. The workflow follows: generate UBL
XML →authenticate via OAuth2 →upload to \`/upload\` endpoint →poll
status →download signed invoice.

\## Conclusion

This infrastructure stack delivers a production-ready foundation for
Cerniq.app with several key architectural decisions. \*\*PostgreSQL
18.1\*\* with PgBouncer transaction pooling maximizes database
efficiency on the 128GB system, while \*\*pgvector HNSW indexes\*\*
enable high-performance vector search. \*\*Redis 7.4.7\*\* in standalone
mode with AOF+RDB hybrid persistence ensures BullMQ job durability
without Cluster complexity.

\*\*Traefik v3.6.6\*\* eliminates certificate management overhead
through automatic Let\'s Encrypt renewal, with rate limiting and circuit
breakers protecting backend services. \*\*SigNoz v0.104.0\*\* provides
unified observability across traces, metrics, and logs without external
SaaS dependencies.

For Romanian compliance, the e-Factura integration requires qualified
certificates and careful attention to CIUS-RO validation rules---the
TypeScript SDK simplifies OAuth2 token management and XML submission
workflows. Backup automation to Hetzner Storage Box via rsync ensures
offsite copies with configurable retention.

Future horizontal scaling paths include PostgreSQL streaming replication
for read scaling, Redis Sentinel for automatic failover, and Docker
Swarm mode for container orchestration---all achievable without
fundamental architecture changes.
