# Incident: expunere credențiale (API keys, JWT, OpenBao, parole DB/Redis)

Acest runbook descrie **pași operaționali** legați de fișiere și scripturi existente în repo. Pentru recuperare infrastructură după reset, vezi [disaster-recovery-complete.md](./disaster-recovery-complete.md).

---

## 1. Containment imediat

1. **Izolați sursa** (repo public, log leak, screenshot) și **revocați** accesul dacă e vorba de cont furnizor / chei API publicate.

2. **OpenBao — rotație controlată**  
   - Script existent: `infra/scripts/openbao-rotate-static-secrets.sh`  
   - Moduri: `--emergency` (tot), sau `--redis`, `--jwt`, `--approle` (vezi header-ul scriptului).  
   - Variabile tipice: `BAO_ADDR` (implicit `https://s3cr3ts.neanelu.ro`), `RENDERED_SECRETS_DIR`, `SECRETS_DIR`.  
   - După rotație: reîncărcare servicii care citesc `CERNIQ_RENDERED_SECRETS_DIR` (vezi `infra/docker/docker-compose.yml`).

3. **JWT / sesiuni**  
   - Template-uri secrets: `infra/config/openbao/templates/api-env.tpl` (și altele din același director) — regenerare `JWT_SECRET` / chei conform procedurii OpenBao.  
   - Rotație JWT este acoperită de `openbao-rotate-static-secrets.sh --jwt` unde e implementată.  
   - Forțați re-autentificare clienți (nu există „revocare globală” fără schimbare cheie + redeploy).

4. **API keys furnizori externi** (ANAF, Termene, ONRC, Hunter, ZeroBounce, xAI, outreach: Instantly, TimelinesAI, Resend, etc.)  
   - Actualizați valorile în OpenBao la path-urile mapate în `infra/config/openbao/templates/` (ex. `api-env.tpl`, `workers.env.tpl`, `pgbouncer-ini.tpl`).  
   - Regenerați cheile și în **panoul furnizorului** (contul real), nu doar în OpenBao.

5. **PostgreSQL / Redis**  
   - Dacă parola sau URL-ul a fost expus: rotație credențiale în OpenBao + `openbao-rotate-static-secrets.sh` (Redis) + redeploy / reload PgBouncer și aplicații.

---

## 2. Investigare

- **Jurnale API**: `apps/api` (log structurat), reverse proxy pe orchestrator (dacă aplicabil).  
- **OpenBao audit**: dacă este activat pe clusterul Bao.  
- **Istoric acces**: SSH Storage Box, Git, registry — după tipul de secret expus.

---

## 3. GDPR / notificări

- Dacă s-au expus **date cu caracter personal** (email, telefon, CUI în context identificabil): evaluați cu DPO **notificarea ANSPDCP** și, după caz, **persoanelor vizate**, conform procedurilor interne și RGPD.

---

## 4. Post-incident

- Rulați verificări din [disaster-recovery-complete.md](./disaster-recovery-complete.md) (health backup, `backup_health_check.sh` dacă e cazul).  
- Planificați rotație periodică: același script `openbao-rotate-static-secrets.sh` (moduri non-emergency) și calendar intern.  
- Înainte de deploy-uri majore: `infra/scripts/backup-pre-deploy.sh`.

---

## 5. Legături utile

| Subiect | Fișier |
| --- | --- |
| DR general | [disaster-recovery-complete.md](./disaster-recovery-complete.md) |
| OpenBao unseal | [openbao-auto-unseal.md](./openbao-auto-unseal.md) |
| Răspuns incident generic | [incident-response.md](./incident-response.md) |
