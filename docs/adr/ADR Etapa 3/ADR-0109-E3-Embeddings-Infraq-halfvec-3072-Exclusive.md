# ADR-0109: E3 Product Embeddings — exclusiv infraq 3072 dim (halfvec MRL)

## Status

Accepted

## Data

2026-04-10

## Context

Coloanele PostgreSQL pentru RAG E3 (`gold_product_embeddings.embedding`, `gold_product_chunks.embedding`, `gold_companies.ai_embedding`) sunt `halfvec(3072)` după migrația 0033 și schema Drizzle. Un fallback la OpenAI `text-embedding-3-small` cu 1536 dimensiuni nu poate fi persistat corect în aceste coloane și poate produce erori runtime sau date incoerente.

## Decizie

- `workers/e3-ai-sales` — funcția `embedText()` folosește **doar** modelul de embeddings servit prin gateway-ul infraq (qwen3-embedding-8b,3072 dim), cu circuit breaker existent.
- **Nu** există fallback la furnizori cu altă dimensiune pentru căile care scriu în `halfvec(3072)`.
- Worker-ul `a2-product-embed` validează explicit `dimensions === 3072`, `embedding.length === 3072` și incrementează `cerniq_e3_embedding_dimension_reject_total` dacă invariantul este încălcat.

## Consecințe

- La indisponibilitatea infraq embeddings, job-urile `product:embed` eșuează și pot fi reîncercate de BullMQ; operațiunea corectă este remedierea serviciului de embeddings, nu înlocuirea dimensiunii.
- **Backfill / re-embedding:** re-coadă job-uri `product:embed` (sau echivalent) pentru înregistrările cu embedding null după migrații; documentat în ghidul de operare E3.

## Legături

- [ADR-0071](./ADR-0071-Hybrid-Search-pgvector-BM25-RRF.md) — hybrid search pgvector
- [ADR-0085](./ADR-0085-OpenAI-Embeddings.md) — rămâne relevant pentru alte contexte unde OpenAI embeddings sunt folosite explicit; **nu** pentru calea E3 → `halfvec(3072)` de mai sus.
