# CERNIQ.APP — GDPR Compliance

## Governance Document - Referințe

### Versiunea 1.0 | 18 Ianuarie 2026

---

## Documentație GDPR

Conformitatea GDPR este documentată în următoarele locații:

| Document                                                                                    | Descriere                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [`master-specification.md`](../specifications/master-specification.md)                      | Secțiunea "GDPR Compliance"                |
| [ADR-0051: Data Retention Policy](../adr/ADR%20Etapa%201/ADR-0051-Data-Retention-Policy.md) | Politica de retenție date                  |
| [`dpa-register.md`](./dpa-register.md)                                                      | Evidență DPA pentru third-party processors |
| [`gdpr-dpia.md`](./gdpr-dpia.md)                                                            | Data Protection Impact Assessment (DPIA)   |
| [`cookie-consent-strategy.md`](./cookie-consent-strategy.md)                                | Strategia Cookie Consent (ePrivacy)        |
| [`gdpr-legitimate-interest-assessment.md`](./gdpr-legitimate-interest-assessment.md)        | Legitimate Interest Assessment (LIA)       |

## Principii GDPR Implementate

1. **Privacy by Design** - Integrată în arhitectură de la început
2. **Data Minimization** - Colectăm doar date necesare pentru funcționalitate
3. **Right to Erasure** - Endpoint-uri pentru ștergere date la cerere
4. **Data Retention** - Retenție automată conform politicii (vezi ADR-0051)
5. **Audit Trail** - Logging complet pentru acces și modificări date personale

## Date Personale Procesate

| Categorie                     | Retenție                  | Justificare                |
| ----------------------------- | ------------------------- | -------------------------- |
| Date contact (email, telefon) | Durata relației + 36 luni | Interes legitim business   |
| Comunicări                    | 5 ani                     | Obligații legale facturare |
| Logs acces                    | 1 an                      | Securitate                 |

## Responsabilități

- **Data Controller**: Utilizatorul platformei (fermieri, cooperatives)
- **Data Processor**: Cerniq.app

## Legitimate Interest Assessment (LIA)

Conform **Art 6(1)(f) GDPR**, procesarea datelor B2B (Public Registers) se bazează pe Interes Legitim.

> **📄 Document Complet LIA:** [`gdpr-legitimate-interest-assessment.md`](./gdpr-legitimate-interest-assessment.md)

### LIA Record #001 (Data Enrichment) — APROBAT

| Aspect             | Rezultat                              |
| ------------------ | ------------------------------------- |
| **Necessity Test** | ✅ TRECUT                             |
| **Balancing Test** | ✅ TRECUT (Impact 28% vs Interes 80%) |
| **Safeguards**     | ✅ SUFICIENTE                         |
| **Decizie**        | **APROBAT** cu Opt-Out obligatoriu    |

---

## Ofițer Protecția Datelor (DPO)

### Numire și Status

| Aspect          | Detalii                            |
| --------------- | ---------------------------------- |
| **Tip DPO**     | Extern (Legal Consultant)          |
| **Status**      | Desemnat formal înainte de go-live |
| **Bază legală** | Art. 37-39 GDPR, Legea 190/2018    |

### Responsabilități DPO

1. **Monitorizare Conformitate**
   - Audit trimestrial al log-urilor de acces date personale
   - Verificare anuală a politicilor de retenție
   - Review LIA la modificări procesare

2. **Gestionare Cereri GDPR**
   - Right to Access (Art. 15) — SLA: 30 zile
   - Right to Erasure (Art. 17) — SLA: 7 zile
   - Right to Data Portability (Art. 20) — SLA: 30 zile

3. **Incident Response**
   - Notificare ANSPDCP în caz de breach (max 72h)
   - Notificare persoane afectate dacă risc ridicat
   - Documentare incident și lessons learned

4. **Training & Awareness**
   - Onboarding GDPR pentru noi angajați
   - Update anual echipă pe modificări legislative

### Contact DPO

| Canal           | Detalii                                   |
| --------------- | ----------------------------------------- |
| **Email**       | dpo@cerniq.app (TBD - înainte de go-live) |
| **SLA Răspuns** | 48 ore zile lucrătoare                    |
| **Escalare**    | <management@cerniq.app>                   |

> **Notă:** DPO formal va fi contractat și publicat pe website înainte de lansarea în producție, conform Art. 37(7) GDPR.

---

**Document tip:** Governance Policy  
**Actualizat:** 18 Ianuarie 2026
