# ADR-0004: PostgreSQL 18.1 cu PostGIS

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Cerniq.app necesită:

- Database relațional ACID-compliant
- Suport pentru interogări geospațiale (proximity queries pentru ferme)
- Vector search pentru semantic search (pgvector)
- JSON_TABLE pentru transformări date

## Decizie

Utilizăm **PostgreSQL 18.1** cu extensiile **pgvector 0.8.1** și **PostGIS 3.6.1**.

## Consecințe

### Pozitive

- **AIO (Asynchronous I/O)** → 2-3x performance improvement
- **uuidv7()** nativ pentru timestamp-ordered UUIDs
- **JSON_TABLE** pentru transformare JSON → tabele
- **pgvector HNSW** indexes: 40.5 QPS (vs 2.6 QPS IVFFlat)
- **PostGIS** pentru proximity queries agricole

### Negative

- Necesită tuning pentru 128GB RAM (nu e plug-and-play)
- pgvector HNSW consumă mai multă memorie

### Configurație Memory (CT107 - 32GB System)

```ini
# postgresql.conf
shared_buffers = 8GB               # 25% RAM
effective_cache_size = 24GB        # 75% RAM
work_mem = 64MB
maintenance_work_mem = 1GB
wal_buffers = 64MB
max_connections = 200              # Use PgBouncer

# PostgreSQL 18 AIO
io_method = worker

# Parallelism (8 cores)
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8

# SSD Optimization
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Extensii Obligatorii

```sql
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
