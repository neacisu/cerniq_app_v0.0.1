# ADR-0006: Redis 7.4.7 cu BullMQ v5.66.5

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Cerniq.app are 52+ workers organizați în pipeline-uri. Necesităm:

- Job queue reliable
- Delayed jobs
- Rate limiting per-provider
- Job progress tracking
- Dead letter queues

## Decizie

Utilizăm **Redis 7.4.7** cu **BullMQ v5.66.5** pentru job queuing.

## Consecințe

### Pozitive

- BullMQ patterns native (flows, rate limiting, priorities)
- Delayed jobs cu precizie milisecunde
- Job progress și logging built-in
- Redo capability din dead-letter queues

### Negative

- `maxmemory-policy noeviction` OBLIGATORIU (jobs nu pot fi evicted)
- Redis single-point-of-failure (mitigat cu AOF + RDB)

### Configurație CRITICĂ

```conf
# redis.conf
# OBLIGATORIU pentru BullMQ - jobs NU pot fi evicted!
maxmemory 8gb
maxmemory-policy noeviction

# Persistence hybrid
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes

# Lazy freeing pentru high-RAM
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
activedefrag yes

# BullMQ notifications
notify-keyspace-events Ex
```

### Queue Naming Pattern

```text
{layer}:{category}:{action}

Exemple:
- bronze:ingest:csv-parser
- enrich:anaf:fiscal-status
- q:wa:phone_01 (per-phone WhatsApp queues)
```
