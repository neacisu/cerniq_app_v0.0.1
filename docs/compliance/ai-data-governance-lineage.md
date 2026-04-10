# Guvernanța datelor și lineage (EU AI Act — Art. 10, aliniat GDPR)

## Principii

- **Izolare tenant:** RLS PostgreSQL (`app.tenant_id`), politici documentate în ADR RLS.
- **Minimizare:** PII redactată în `cognitive-helpers` / mutații conform allowlist.
- **Drept la ștergere (Art. 17 GDPR):** ruta `POST /api/v1/gdpr/erasure` — invalidare explicită `gold_companies.ai_embedding` înainte de ștergerea companiei (vectori AI).
- **Audit LLM:** tabel `audit.audit_llm_calls`; retenție recomandată în `integration.audit_retention_policies` (`LLM_AUDIT`, 180 zile — seed migrație 0069).

## Lineage (flux simplificat)

`Bronze → Silver → Gold` (E1); embeddings E3 din `embedText()` → `gold_product_embeddings` / `gold_product_chunks`; companii — `gold_companies.ai_embedding` când este populat de pipeline-ul de îmbogățire.

## Drepturi

- Consimțământ cookie: `POST /api/v1/gdpr/consent-log`.
- Proceduri interne pentru solicitări DSAR — în afara acestui repo.
