# CERNIQ.APP — DPA Register (Third-Party Processors)

## Data Processing Agreements (GDPR Art. 28)

### Versiunea 1.0 | 01 Februarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Evidență unică pentru toți furnizorii externi care procesează date personale  
**OWNER:** DPO + Legal + Engineering

---

## 1. Instrucțiuni Operare

1. **Identifică furnizorul** și tipul de date personale procesate.
2. **Obține DPA** (sau confirmă existența DPA standard în contract/terms).
3. **Semnează și arhivează** DPA (intern + vault legal).
4. **Mapează transferul internațional** (SCC dacă e non-SEE).
5. **Revizuire anuală** sau la schimbări majore de serviciu.

> Notă: Pentru surse publice (registre oficiale), DPA poate fi **N/A**, dar trebuie documentată baza legală și respectarea TOS.

---

## 2. Registru DPA (Status per Provider)

| Provider | Tip Serviciu | Date Procesate | Rol GDPR | DPA URL | Status | Transfer Internațional | SCC | Owner | Observații |
|----------|---------------|---------------|----------|---------|--------|-------------------------|-----|-------|-----------|
| TimelinesAI | WhatsApp messaging | Numere telefon, conținut mesaje, metadate | Processor/Controller | https://timelines.ai/wp-content/uploads/2026/01/TimelinesAI-Data-Processing-Agreement-DPA-V1.4.pdf | VALIDAT | UE | YES | Legal | Privacy: https://timelines.ai/privacy-policy/ · GDPR: https://timelines.ai/security-standards/ |
| Instantly.ai | Email warmup/outreach | Email, nume, conținut email, metadate | Processor | https://instantly.ai/dpa | VALIDAT | Non-SEE | YES | Legal | Privacy: https://instantly.ai/privacy · Subprocesatori: https://help.instantly.ai/en/articles/8177025-instantly-sub-processors |
| Resend | Email transactional | Email, nume, conținut email | Processor | https://resend.com/legal/dpa | VALIDAT | Non-SEE | YES | Legal | Privacy: https://resend.com/legal/privacy-policy · Subprocesatori: https://resend.com/legal/subprocessors |
| Termene.ro | Date firme (B2B) | Date publice firmă, CUI | Controller (public) | https://suport.termene.ro/ro/knowledge/termene-si-conditii-generale | VALIDAT | RO | N/A | Legal | Privacy: https://suport.termene.ro/ro/knowledge/politica-de-confidentialitate |
| ANAF WS / SPV | Date fiscale | CUI, status TVA/e-Factura | Controller (public) | N/A | N/A | RO | N/A | Legal | Registru public, DPA N/A · Docs: https://static.anaf.ro/static/10/Anaf/Informatii_publice/ |
| Oblio.eu | e-Factura/invoicing | Date firmă, CUI, facturi | Processor | https://www.oblio.eu/terms | VALIDAT | RO | N/A | Legal | Terms: https://www.oblio.eu/terms · Contact: contact@oblio.eu · Companie RO (RO37311090), GDPR implicit · Date procesate doar în România |
| Revolut Business | Plăți | IBAN, tranzacții, contact | Controller/Processor | https://www.revolut.com/legal/business-terms/ | VALIDAT | SEE/UK | YES | Legal | Privacy: https://www.revolut.com/privacy-policy/ · Business privacy: https://www.revolut.com/en-LT/legal/business-customer-privacy-notice/ |
| Sameday | Logistică | Nume, telefon, adresă livrare | Processor | https://sameday.ro/politica-de-confidentialitate/ | VALIDAT | RO | N/A | Legal | Privacy: https://sameday.ro/politica-de-confidentialitate/ · DPO: data.protection@sameday.ro · Companie RO, GDPR compliant |
| Hunter.io | Email discovery | Email, nume, domeniu | Controller/Processor | https://hunter.io/data-processing-agreement | VALIDAT | UE | YES | Legal | Privacy: https://hunter.io/privacy-policy · Subprocesatori: https://hunter.io/subprocessors |
| ZeroBounce | Email verification | Email | Processor | https://www.zerobounce.net/docs/about-zerobounce/data-processing-agreement | VALIDAT | UE/Non-SEE | YES | Legal | Privacy: https://www.zerobounce.net/privacy-policy/ · GDPR: https://www.zerobounce.net/gdpr.html |
| OpenAI | LLM/Embeddings | Date text (posibil PII) | Processor | https://openai.com/policies/data-processing-addendum/ | VALIDAT | Non-SEE | YES | Legal | Privacy: https://openai.com/policies/privacy-policy |
| Anthropic | LLM fallback | Date text (posibil PII) | Processor | https://www.anthropic.com/legal/dpa | VALIDAT | Non-SEE | YES | Legal | Privacy: https://www.anthropic.com/legal/privacy |
| xAI (Grok) | LLM primary | Date text (posibil PII) | Processor | https://x.ai/legal/data-processing-addendum | VALIDAT | Non-SEE | YES | Legal | Privacy: https://x.ai/legal/privacy-policy · Europe addendum: https://x.ai/legal/europe-privacy-policy-addendum · SCC incluse în DPA · NIST 800-171 Rev.3 |
| ONRC (portal) | Registru public | Date publice firmă | Controller (public) | N/A | N/A | RO | N/A | Legal | Registru public · Portal: https://portal.onrc.ro/ |
| APIA | Subvenții agricole (statistici) | Date agregate/statistice | Controller (public) | N/A | N/A | RO | N/A | Legal | Date publice: https://apia.org.ro/ |
| MADR | Registre agricole/statistici | Date publice | Controller (public) | N/A | N/A | RO | N/A | Legal | Date deschise: https://www.madr.ro/transparenta-institutionala/date-deschise.html |
| INSSE | Statistici oficiale | Date agregate/anonimizate | Controller (public) | N/A | N/A | RO | N/A | Legal | TEMPO: http://statistici.insse.ro/shop/ |
| Hetzner | Hosting (EU) | Date aplicație | Processor | https://www.hetzner.com/AV/DPA_en.pdf | VALIDAT | UE | N/A | Legal | Privacy: https://www.hetzner.com/legal/privacy-policy/ |
| SigNoz (self-hosted) | Observability | Telemetrie/logs | N/A | N/A | N/A | UE | N/A | Engineering | Self-hosted; DPA extern N/A |
| rsync.net | Backup off-site | Backup criptat | Processor | https://www.rsync.net/resources/regulatory/dpa.html | VALIDAT | CH | YES | Legal | Privacy: https://www.rsync.net/resources/regulatory/privacy.html |
| BorgBackup | Backup local | Date criptate local | N/A | N/A | N/A | RO/UE | N/A | Engineering | Self-hosted open-source; DPA N/A |

---

## 3. Checklist DPA per Vendor

- [ ] DPA obținut și semnat
- [ ] Rol GDPR confirmat (Controller/Processor)
- [ ] Sub-procesatori listați
- [ ] Locația datelor confirmată
- [ ] SCC aplicate (dacă non-SEE)
- [ ] Retenție și ștergere documentate
- [ ] Security measures evaluate (ISO/SOC2)
- [ ] DPIA actualizat dacă impact ridicat

---

## 4. Audit Log

| Data | Provider | Acțiune | Responsabil | Link DPA |
|------|----------|---------|-------------|----------|
| 2026-02-01 | — | Creare registru DPA | GitHub Copilot | — |
| 2026-02-01 | xAI (Grok) | Validare DPA — SCC incluse, NIST 800-171 | Legal | https://x.ai/legal/data-processing-addendum |
| 2026-02-01 | Oblio.eu | Validare — companie RO, GDPR implicit | Legal | https://www.oblio.eu/terms |
| 2026-02-01 | Sameday | Validare — DPO activ, Privacy Policy complet | Legal | https://sameday.ro/politica-de-confidentialitate/ |

---

## 5. Annual Review Schedule

| Trimestru | Acțiune |
|-----------|--------|
| Q1 | Review expirare DPA-uri și certificări (SOC2, ISO) |
| Q2 | Verificare liste sub-procesatori actualizate |
| Q3 | Audit conformitate transferuri internaționale |
| Q4 | Audit complet registru DPA înainte de year-end |

---

**Document tip:** Governance Policy  
**Actualizat:** 01 Februarie 2026
