# CERNIQ.APP — Legitimate Interest Assessment (LIA)

## GDPR Art. 6(1)(f) Full Documentation

**Document ID:** LIA-001  
**Versiune:** 1.0  
**Data:** 20 Ianuarie 2026  
**Status:** APROBAT

---

## 1. IDENTIFICARE PROCESARE

### 1.1 Controller

| Câmp | Valoare |
| ---- | ------- |
| Nume Legal | Cerniq.app SRL (în curs de înregistrare) |
| CUI | TBD |
| Sediu | România |
| Contact DPO | <dpo@cerniq.app> |

### 1.2 Procesare Evaluată

| Aspect | Descriere |
| ------ | --------- |
| **Activitate** | Data Enrichment pentru prospectare B2B |
| **Date procesate** | Date publice companii: CUI, denumire, CAEN, adresă sediu, date financiare publice |
| **Surse date** | Termene.ro, MFinanțe/ANAF (date publice), Portal ONRC |
| **Scop** | Identificarea și contactarea prospecților B2B relevanți (fermieri, cooperative agricole) |
| **Temei juridic** | Interes Legitim — Art. 6(1)(f) GDPR |

---

## 2. NECESSITY TEST (Testul Necesității)

### 2.1 Este procesarea necesară pentru scopul urmărit?

**DA** — Procesarea este necesară din următoarele motive:

1. **Nu există alternativă non-intruzivă** pentru identificarea prospecților B2B la scară în sectorul agricol românesc
2. **Datele sunt publice** — disponibile în registre publice (ONRC, MFinanțe)
3. **Procesarea este minimală** — colectăm doar date de business, nu date personale sensibile
4. **Scopul este legitim comercial** — prospectare B2B în conformitate cu practicile standard de business

### 2.2 Poate scopul fi atins prin alte mijloace?

| Alternativă | Evaluare | Concluzie |
| ----------- | -------- | --------- |
| Achiziție liste | Nu garantează calitate/actualizare | Insuficient |
| Manual research | Nu scalează pentru mii de prospecți | Impracticabil |
| Advertising only | Nu permite targeting precis B2B agricol | Ineficient |
| **Enrichment automat** | Scalabil, actual, precis | **NECESAR** |

---

## 3. BALANCING TEST (Testul Echilibrului)

### 3.1 Interesele Legitime ale Controller-ului

| Interes | Justificare |
| ------- | ----------- |
| **Comercial** | Identificarea clienților potențiali pentru produse agricole |
| **Eficiență** | Automatizarea prospectării B2B |
| **Competitivitate** | Acces la informații similare competitorilor |

### 3.2 Impactul asupra Persoanelor Vizate

| Factor | Evaluare | Scor (1-5) |
| ------ | -------- | ---------- |
| **Tipul datelor** | Date business publice, NU personale sensibile | 1 (minim) |
| **Așteptări rezonabile** | Companiile se așteaptă să fie contactate B2B | 2 (scăzut) |
| **Relația cu controller** | Inexistentă inițial, dar contextual relevantă | 2 (scăzut) |
| **Posibilă daună** | Minoră — spam B2B, ușor de evitat via opt-out | 1 (minim) |
| **Persoane vulnerabile** | NU — sunt entități comerciale | 1 (minim) |
| **SCOR TOTAL** | | **7/25** (Impact Scăzut) |

### 3.3 Balanța Finală

```text
Interese Controller    [████████████████████░░░░░] 80%
Impact Persoane Vizate [██░░░░░░░░░░░░░░░░░░░░░░░] 28%

BALANȚĂ: În favoarea procesării ✅
```

---

## 4. SAFEGUARDS (Măsuri de Protecție)

### 4.1 Măsuri Implementate

| Măsură | Implementare | Status |
| ------ | ------------ | ------ |
| **Opt-Out Imediat** | Link unsubscribe în fiecare comunicare | ✅ Planificat |
| **Transparență** | Privacy Policy clară pe website | ✅ Planificat |
| **Data Minimization** | Doar date business necesare | ✅ Planificat |
| **Retenție Limitată** | 36 luni inactivitate → ștergere | ✅ Planificat |
| **Securitate** | Encryption at rest, RLS multi-tenant | ✅ Planificat |
| **Audit Trail** | Logging complet acces date | ✅ Planificat |

### 4.2 Drepturi Persoane Vizate

| Drept GDPR | Implementare |
| ---------- | ------------ |
| Acces (Art. 15) | API endpoint pentru export date proprii |
| Rectificare (Art. 16) | Self-service update sau request DPO |
| Ștergere (Art. 17) | Right to be Forgotten implementat |
| Opoziție (Art. 21) | Opt-out imediat din orice comunicare |
| Portabilitate (Art. 20) | Export JSON/CSV |

---

## 5. DECIZIE

### 5.1 Concluzie LIA

Pe baza analizei de mai sus:

- ✅ **Necessity Test:** TRECUT — Procesarea este necesară și proporțională
- ✅ **Balancing Test:** TRECUT — Interesele legitime prevalează asupra impactului
- ✅ **Safeguards:** SUFICIENTE — Măsuri adecvate implementate

### 5.2 Decizie Finală

> **APROBAT** — Procesarea datelor B2B publice pentru data enrichment este permisă sub Art. 6(1)(f) GDPR cu condiția implementării tuturor safeguards documentate.

---

## 6. SEMNĂTURI ȘI APROBARE

| Rol | Nume | Data | Semnătură |
| --- | ---- | ---- | --------- |
| DPO | Legal External Consultant | 20 Ian 2026 | [Pending formal appointment] |
| Management | Fondator | 20 Ian 2026 | [Digital signature] |

---

## 7. REVISION HISTORY

| Versiune | Data | Modificări | Autor |
| -------- | ---- | ---------- | ----- |
| 1.0 | 20 Ian 2026 | Document inițial | DPO |

---

## 8. DOCUMENTE CONEXE

- [GDPR Compliance Policy](./gdpr-compliance.md)
- [ADR-0015: Data Retention Policy](../adr/ADR%20Etapa%200/ADR-0015-GDPR-Data-Retention-Policy.md)
- [Master Specification §GDPR](../specifications/master-specification.md)

---

**Document Clasificare:** Intern  
**Review Frequency:** Anual sau la modificări semnificative
