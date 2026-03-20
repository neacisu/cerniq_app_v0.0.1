# Outreach — Row Level Security (RLS)

## Status: neimplementat în migrări (TODO securitate)

Aplicația Cerniq izolează datele în principal prin **`WHERE tenant_id = $tenant`** în codul API și workers.

Specificația Etapa 2 (`etapa2-schema-outreach.md`) menționează RLS cu `current_setting('app.current_tenant_id')::uuid`.

### De ce nu este activ RLS acum

- Restul platformei (în afara outreach) nu folosește un pattern uniform `SET LOCAL app.current_tenant_id` pe conexiune.
- Activarea RLS fără setarea contextului pe fiecare request ar risca **0 rezultate** sau regresii greu de depistat.

### Pași recomandați (viitor)

1. Adăuga în pool-ul DB un hook care execută `SET LOCAL app.current_tenant_id = '<uuid>'` după autentificare.
2. Migrare: `ALTER TABLE outreach.* ENABLE ROW LEVEL SECURITY` + policy `USING (tenant_id = current_setting('app.current_tenant_id')::uuid)` pe tabelele outreach.
3. Teste de integrare: request fără tenant în context → zero rânduri.

Până atunci, **toate query-urile trebuie să filtreze explicit `tenant_id`**.

### Triggere SQL (engagement, phone stats, auto-review)

Logica este acoperită în workers TypeScript (actualizări explicite pe `lead_journey`, `wa_phone_numbers`, `human_review_queue`). Triggerele din spec sunt **opționale**; adăugarea lor în paralel cu workers poate duce la dublu-update — se recomandă fie trigger, fie worker, nu ambele.
