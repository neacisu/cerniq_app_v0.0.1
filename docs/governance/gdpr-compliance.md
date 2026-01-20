# CERNIQ.APP — GDPR Compliance

## Governance Document - Referințe

### Versiunea 1.0 | 18 Ianuarie 2026

---

## Documentație GDPR

Conformitatea GDPR este documentată în următoarele locații:

| Document | Descriere |
| -------- | --------- |
| [`master-specification.md`](../specifications/master-specification.md) | Secțiunea "GDPR Compliance" |
| [ADR-0015: GDPR Data Retention](../adr/ADR%20Etapa%200/ADR-0015-GDPR-Data-Retention-Policy.md) | Politica de retenție date |

## Principii GDPR Implementate

1. **Privacy by Design** - Integrată în arhitectură de la început
2. **Data Minimization** - Colectăm doar date necesare pentru funcționalitate
3. **Right to Erasure** - Endpoint-uri pentru ștergere date la cerere
4. **Data Retention** - Retenție automată conform politicii (vezi ADR-0015)
5. **Audit Trail** - Logging complet pentru acces și modificări date personale

## Date Personale Procesate

| Categorie | Retenție | Justificare |
| --------- | -------- | ----------- |
| Date contact (email, telefon) | Durata relației + 3 ani | Interes legitim business |
| Comunicări | 5 ani | Obligații legale facturare |
| Logs acces | 1 an | Securitate |

## Responsabilități

- **Data Controller**: Utilizatorul platformei (fermieri, cooperatives)
- **Data Processor**: Cerniq.app

## Legitimate Interest Assessment (LIA)

Conform **Art 6(1)(f) GDPR**, procesarea datelor B2B (Public Registers) se bazează pe Interes Legitim.

### LIA Record #001 (Data Enrichment)

- **Scop:** Identificarea prospecților B2B relevanți.
- **Necesitate:** Nu există alternativă non-intruzivă pentru B2B outreach la scară.
- **Balancing Test:** Datele sunt publice (Termene.ro, MFinante). Impactul asupra vieții private este minim (date de business).
- **Decizie:** **APROBAT** (cu condiția oferirii Opt-Out imediat).

## Ofițer Protecția Datelor (DPO)

Deși Cerniq.app nu procesează date "Large Scale" de categorii speciale, am numit un DPO responsabil pentru:

1. Audit trimestrial al log-urilor de acces.
2. Gestionarea cererilor "Right to be Forgotten".
3. Notificarea ANSPDCP în caz de breach (max 72h).

**DPO Contact:**

- Email: `dpo@cerniq.app`
- Responsabil: Legal External Consultant

---

**Document tip:** Governance Policy  
**Actualizat:** 18 Ianuarie 2026
