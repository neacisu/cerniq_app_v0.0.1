# CERNIQ.APP — Data Protection Impact Assessment (DPIA)

## GDPR Art. 35 — Evaluarea Impactului asupra Protecției Datelor

**Document ID:** DPIA-001  
**Versiune:** 1.0  
**Data:** 01 Februarie 2026  
**Status:** DRAFT — Pendinte aprobare DPO

---

## Document Control

| Câmp | Valoare |
|------|---------|
| **Document Owner** | DPO + Legal |
| **Review Frequency** | Anual sau la modificări semnificative procesare |
| **Clasificare** | Intern — Confidențial |
| **Aprobare Necesară** | DPO (intern, la go-live) |
| **Consultare ANSPDCP** | A se determina după finalizare DPIA |

---

## 1. IDENTIFICARE PROCESARE

### 1.1 Controller

| Câmp | Valoare |
|------|---------|
| **Nume Legal** | Cerniq.app SRL (în curs de înregistrare) |
| **Sediu** | România |
| **Email DPO** | dpo@cerniq.app |
| **Website** | https://cerniq.app |

### 1.2 Descrierea Procesării

| Aspect | Descriere |
|--------|-----------|
| **Denumire Procesare** | Platformă B2B Automatizare Vânzări Agricultură |
| **Scop Principal** | Prospectare, outreach și vânzări automatizate către ferme și cooperative agricole |
| **Date Procesate** | Date business publice (CUI, denumire, CAEN), date contact (email, telefon), date financiare publice, date comunicare |
| **Volum Estimat** | ~2.86 milioane ferme potențiale; focus pe ~54.000 entități comerciale |

### 1.3 Activități de Procesare per Etapă

| Etapă | Activitate | Date Procesate | Volum Estimat |
|-------|------------|----------------|---------------|
| **Etapa 1** | Data Enrichment | CUI, denumire, CAEN, adresă, date financiare publice | ~500K records/lună |
| **Etapa 2** | Cold Outreach | Email, telefon, conținut mesaje | ~50K contacte/lună |
| **Etapa 3** | AI Sales Agent | Conversații, preferințe, istoric interacțiuni | ~10K conversații/lună |
| **Etapa 4** | Post-Sale & Invoicing | Date tranzacții, facturi, livrări | ~5K tranzacții/lună |
| **Etapa 5** | Nurturing & Expansion | Scoring, predicții, recomandări | ~20K profiles/lună |

### 1.4 Categorii de Date Personale

| Categorie | Exemple | Sensibilitate | Baza Legală |
|-----------|---------|---------------|-------------|
| **Date Identificare Business** | CUI, denumire firmă, Nr. Reg. Com. | Scăzută | Registre publice |
| **Date Contact** | Email business, telefon business | Medie | Interes legitim (Art. 6.1.f) |
| **Date Financiare Publice** | Cifră afaceri, profit (din bilanțuri publice) | Scăzută | Registre publice |
| **Date Comunicare** | Conținut email/WhatsApp, timestamp-uri | Medie | Interes legitim + Consimțământ |
| **Date Comportamentale** | Click rates, răspunsuri, preferințe | Medie | Interes legitim |
| **Date Geolocație Business** | Coordonate sediu/exploatație | Scăzută | Registre publice |

### 1.5 Subiecți Vizați

| Categorie | Descriere | Volum Estimat |
|-----------|-----------|---------------|
| **Reprezentanți Legali** | Administratori, asociați firme agricole | ~54.000 |
| **Persoane Contact** | Angajați desemnați pentru achiziții | ~100.000 |
| **Beneficiari APIA** | Fermieri individuali (PFA/II) | ~500.000 |

### 1.6 Destinatari Date

| Destinatar | Tip | Scop | Transfer Internațional | DPA Status |
|------------|-----|------|------------------------|------------|
| **Termene.ro** | Processor | Enrichment date business | RO | ✅ VALIDAT |
| **OpenAI** | Processor | LLM/Embeddings | US (SCC) | ✅ VALIDAT |
| **xAI (Grok)** | Processor | LLM principal | US (SCC) | 🟡 VALIDARE |
| **Anthropic** | Processor | LLM fallback | US (SCC) | ✅ VALIDAT |
| **Instantly.ai** | Processor | Email outreach | US (SCC) | ✅ VALIDAT |
| **TimelinesAI** | Processor | WhatsApp messaging | EU | ✅ VALIDAT |
| **Hetzner** | Processor | Hosting | EU | ✅ VALIDAT |

> **Notă:** Lista completă DPA în [dpa-register.md](./dpa-register.md)

---

## 2. NECESITATE ȘI PROPORȚIONALITATE

### 2.1 Necesitatea Procesării

| Criteriu | Evaluare | Justificare |
|----------|----------|-------------|
| **Scopul este specific și explicit?** | ✅ DA | Prospectare B2B în sectorul agricol românesc |
| **Procesarea este necesară pentru scop?** | ✅ DA | Nu există alternativă non-digitală la scară |
| **Datele sunt adecvate și relevante?** | ✅ DA | Doar date business, nu date personale sensibile |
| **Datele sunt limitate la necesar?** | ✅ DA | Data minimization implementat |

### 2.2 Evaluare Data Minimization

| Câmp | Necesar? | Alternativă? | Decizie |
|------|----------|--------------|---------|
| CUI | ✅ DA | Nu | Colectăm |
| Email business | ✅ DA | Nu | Colectăm |
| Telefon business | ✅ DA | Nu | Colectăm |
| CNP | ❌ NU | CUI suficient | NU colectăm |
| Adresă personală | ❌ NU | Adresă sediu suficientă | NU colectăm |
| Date sănătate | ❌ NU | Irelevant | NU colectăm |

### 2.3 Retenție Date

| Categorie | Perioadă Retenție | Justificare | Referință |
|-----------|-------------------|-------------|-----------|
| **Date contact active** | Durata relației + 36 luni | Interes legitim comercial | ADR-0015 |
| **Date comunicare** | 5 ani | Obligații legale facturare | Cod Fiscal |
| **Logs acces** | 1 an | Securitate și audit | Best practice |
| **Date inactive** | Ștergere după 36 luni inactivitate | GDPR minimization | ADR-0015 |

### 2.4 Proporționalitate

| Test | Rezultat | Justificare |
|------|----------|-------------|
| **Legitimate Interest Assessment** | ✅ TRECUT | LIA-001 aprobat (vezi [gdpr-legitimate-interest-assessment.md](./gdpr-legitimate-interest-assessment.md)) |
| **Balancing Test** | ✅ TRECUT | Interese controller (80%) > Impact subiecți (28%) |
| **Safeguards adecvate** | ✅ DA | Opt-out imediat, transparență, securitate |

---

## 3. IDENTIFICARE RISCURI

### 3.1 Surse de Risc

| ID | Sursă | Tip | Descriere |
|----|-------|-----|-----------|
| RS-01 | Atacatori externi | Extern | Acces neautorizat la date prin vulnerabilități |
| RS-02 | Angajați | Intern | Acces neautorizat sau scurgere date |
| RS-03 | Furnizori | Extern | Breach la procesatori terți (LLM providers) |
| RS-04 | Erori sistem | Tehnic | Expunere date prin bug-uri software |
| RS-05 | Subiecți | Intern | Solicitări drepturi GDPR negestionate |

### 3.2 Riscuri Identificate

| ID | Risc | Probabilitate | Severitate | Scor | Nivel |
|----|------|---------------|------------|------|-------|
| R-01 | Acces neautorizat la baza de date | 2/5 | 4/5 | 8 | MEDIU |
| R-02 | Scurgere date prin LLM (prompt injection) | 2/5 | 3/5 | 6 | MEDIU |
| R-03 | Re-identificare din date agregate | 1/5 | 2/5 | 2 | SCĂZUT |
| R-04 | Breach la furnizor terț | 2/5 | 4/5 | 8 | MEDIU |
| R-05 | Procesare fără temei legal valid | 1/5 | 5/5 | 5 | MEDIU |
| R-06 | Eșec răspuns cereri drepturi GDPR | 2/5 | 4/5 | 8 | MEDIU |
| R-07 | Transfer internațional fără SCC | 1/5 | 5/5 | 5 | MEDIU |
| R-08 | Retenție date peste perioada legală | 2/5 | 3/5 | 6 | MEDIU |
| R-09 | Profilare fără transparență | 2/5 | 3/5 | 6 | MEDIU |
| R-10 | Cross-tenant data leakage | 1/5 | 5/5 | 5 | MEDIU |
| R-11 | PII în logs/telemetrie | 2/5 | 3/5 | 6 | MEDIU |
| R-12 | Comunicări nesolicitate (spam) | 3/5 | 2/5 | 6 | MEDIU |
| R-13 | Decizie automatizată cu impact legal | 1/5 | 4/5 | 4 | SCĂZUT |
| R-14 | Acces neautorizat la backups | 1/5 | 4/5 | 4 | SCĂZUT |
| R-15 | Social engineering către angajați | 2/5 | 3/5 | 6 | MEDIU |

### 3.3 Matrice Risc

```
SEVERITATE
    5 │     R-05,R-07,R-10         │ R-01,R-04,R-06
    4 │     R-13,R-14              │
    3 │     R-03          R-02,R-08,R-09,R-11,R-15
    2 │                            │ R-12
    1 │                            │
      └────────────────────────────┴──────────────────
           1         2         3         4         5
                        PROBABILITATE
```

---

## 4. MĂSURI DE ATENUARE

### 4.1 Măsuri Tehnice

| Risc | Măsură | Status | Responsabil |
|------|--------|--------|-------------|
| R-01 | Row Level Security (RLS) PostgreSQL | ✅ Implementat | Engineering |
| R-01 | Encryption at rest (AES-256) | ✅ Implementat | Infrastructure |
| R-01 | Encryption in transit (TLS 1.3) | ✅ Implementat | Infrastructure |
| R-02 | PII redaction înainte de LLM | ✅ Planificat | Engineering |
| R-02 | Prompt validation și sanitization | ✅ Planificat | Engineering |
| R-04 | DPA-uri cu clauze breach notification | ✅ Validat | Legal |
| R-10 | `tenant_id` obligatoriu + RLS policies | ✅ Implementat | Engineering |
| R-11 | Log scrubbing pentru PII | ✅ Planificat | Engineering |
| R-14 | Backup encryption (BorgBackup + rsync.net) | ✅ Implementat | Infrastructure |

### 4.2 Măsuri Organizaționale

| Risc | Măsură | Status | Responsabil |
|------|--------|--------|-------------|
| R-05 | LIA documentat și aprobat | ✅ Completat | DPO |
| R-06 | Proceduri răspuns cereri GDPR (SLA 30 zile) | ✅ Documentat | DPO |
| R-07 | SCC semnate cu toți furnizorii non-SEE | ✅ Validat | Legal |
| R-08 | Retention policies automate | ✅ Planificat | Engineering |
| R-09 | Privacy Policy cu detalii profilare | ✅ Planificat | Legal |
| R-12 | Opt-out link în toate comunicările | ✅ Planificat | Engineering |
| R-15 | Security awareness training | 🟡 Planificat | HR |

### 4.3 Măsuri Specifice LLM/AI

| Măsură | Descriere | Status |
|--------|-----------|--------|
| **PII Redaction** | Toate textele trimise la LLM sunt pre-procesate pentru a elimina PII | Planificat |
| **No Training on Data** | Contracte cu OpenAI/Anthropic/xAI care interzic folosirea datelor pentru training | ✅ Validat |
| **Hallucination Guards** | Validare output LLM înainte de acțiuni automate | Planificat |
| **Human-in-the-Loop** | Aprobare umană pentru decizii cu impact ridicat | ✅ Documentat |

---

## 5. DREPTURI SUBIECȚI DE DATE

### 5.1 Implementare Drepturi GDPR

| Drept | Articol | Implementare | SLA |
|-------|---------|--------------|-----|
| **Acces** | Art. 15 | API endpoint export date proprii | 30 zile |
| **Rectificare** | Art. 16 | Self-service sau request DPO | 7 zile |
| **Ștergere** | Art. 17 | Right to be Forgotten implementat | 7 zile |
| **Restricționare** | Art. 18 | Flag `processing_restricted` | 7 zile |
| **Portabilitate** | Art. 20 | Export JSON/CSV | 30 zile |
| **Opoziție** | Art. 21 | Opt-out imediat din comunicări | Instant |
| **Decizii Automate** | Art. 22 | HITL pentru decizii cu impact | On request |

### 5.2 Procedură Răspuns Cereri

```text
1. Primire cerere → dpo@cerniq.app
2. Verificare identitate (48h)
3. Evaluare cerere (5 zile)
4. Executare sau justificare refuz (SLA per tip)
5. Confirmare către subiect
6. Documentare în audit log
```

---

## 6. CONSULTARE

### 6.1 Consultare DPO

| Aspect | Status |
|--------|--------|
| **DPO Desemnat** | Intern, la lansarea în producție |
| **Contact** | dpo@cerniq.app |
| **Aprobare DPIA** | Pendinte (înainte de go-live) |

> **Notă:** DPO intern va fi desemnat formal la lansarea în producție. În faza de dezvoltare, responsabilitățile DPO sunt acoperite de management și consultant legal extern.

### 6.2 Consultare ANSPDCP

| Criteriu | Evaluare |
|----------|----------|
| **Risc rezidual ridicat?** | ❌ NU — toate riscurile au mitigări |
| **Procesare la scară largă?** | ✅ DA — dar date predominant publice |
| **Decizie** | Consultare prealabilă ANSPDCP **NU este obligatorie** |

**Justificare:** După implementarea tuturor măsurilor de atenuare, riscul rezidual este SCĂZUT-MEDIU. Conform Art. 36 GDPR, consultarea prealabilă este necesară doar dacă riscul rezidual rămâne RIDICAT.

---

## 7. MONITORIZARE ȘI REVIZUIRE

### 7.1 Indicatori Monitorizare

| KPI | Target | Frecvență |
|-----|--------|-----------|
| Cereri GDPR rezolvate în SLA | >95% | Lunar |
| Breșe de securitate | 0 | Continuu |
| Opt-out rate | <5% | Lunar |
| Complaints ANSPDCP | 0 | Anual |

### 7.2 Revizuire DPIA

| Trigger | Acțiune |
|---------|---------|
| **Anual** | Review complet DPIA |
| **Nouă sursă de date** | Actualizare secțiunea 1 |
| **Nou furnizor terț** | Actualizare DPA register + riscuri |
| **Incident securitate** | Re-evaluare riscuri |
| **Modificare legislativă** | Re-evaluare conformitate |

---

## 8. APROBARE

### 8.1 Semnături

| Rol | Nume | Data | Semnătură |
|-----|------|------|-----------|
| **DPO** | Pendinte numire | TBD | ________________ |
| **CTO** | TBD | TBD | ________________ |
| **CEO** | TBD | TBD | ________________ |

### 8.2 Revision History

| Versiune | Data | Modificări | Autor |
|----------|------|------------|-------|
| 1.0 | 01 Feb 2026 | Document inițial | GitHub Copilot |

---

## 9. DOCUMENTE CONEXE

| Document | Descriere |
|----------|-----------|
| [gdpr-compliance.md](./gdpr-compliance.md) | Politică GDPR generală |
| [gdpr-legitimate-interest-assessment.md](./gdpr-legitimate-interest-assessment.md) | LIA pentru Data Enrichment |
| [dpa-register.md](./dpa-register.md) | Registru DPA furnizori |
| [security-policy.md](./security-policy.md) | Politică securitate |
| [ADR-0015](../adr/ADR%20Etapa%200/ADR-0015-GDPR-Data-Retention-Policy.md) | Politică retenție date |
| [schema-database.md](../specifications/schema-database.md) | Schema date personale |

---

**Document tip:** Governance — DPIA  
**Clasificare:** Intern — Confidențial  
**Actualizat:** 01 Februarie 2026
