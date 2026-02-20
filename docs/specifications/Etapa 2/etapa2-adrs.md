# CERNIQ.APP — ETAPA 2: ARCHITECTURE DECISION RECORDS

## Cold Outreach Multi-Canal - ADRs

### Versiunea 1.1 | 2 Februarie 2026

---

## Index ADRs Etapa 2

Acest document oferă o privire de ansamblu asupra tuturor Architecture Decision Records pentru Etapa 2 (Cold Outreach Multi-Canal).

| ADR ID   | Titlu                              | Path                                                                                |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| ADR-0053 | Multi-Channel Outreach Strategy    | [ADR-0053](../../adr/ADR%20Etapa%202/ADR-0053-Multi-Channel-Outreach-Strategy.md)   |
| ADR-0054 | Quota Guardian Pattern             | [ADR-0054](../../adr/ADR%20Etapa%202/ADR-0054-Quota-Guardian-Pattern.md)            |
| ADR-0055 | Sticky Phone Assignment            | [ADR-0055](../../adr/ADR%20Etapa%202/ADR-0055-Sticky-Phone-Assignment.md)           |
| ADR-0056 | Business Hours Enforcement         | [ADR-0056](../../adr/ADR%20Etapa%202/ADR-0056-Business-Hours-Enforcement.md)        |
| ADR-0057 | Jitter Pattern for Human Behavior  | [ADR-0057](../../adr/ADR%20Etapa%202/ADR-0057-Jitter-Pattern-for-Human-Behavior.md) |
| ADR-0058 | Spintax for Message Uniqueness     | [ADR-0058](../../adr/ADR%20Etapa%202/ADR-0058-Spintax-for-Message-Uniqueness.md)    |
| ADR-0059 | Channel Segregation (Cold vs Warm) | [ADR-0059](../../adr/ADR%20Etapa%202/ADR-0059-Channel-Segregation-Cold-vs-Warm.md)  |
| ADR-0060 | Head-of-Line Blocking Prevention   | [ADR-0060](../../adr/ADR%20Etapa%202/ADR-0060-Head-of-Line-Blocking-Prevention.md)  |
| ADR-0061 | Webhook Normalization Pattern      | [ADR-0061](../../adr/ADR%20Etapa%202/ADR-0061-Webhook-Normalization-Pattern.md)     |
| ADR-0062 | Lead State Machine                 | [ADR-0062](../../adr/ADR%20Etapa%202/ADR-0062-Lead-State-Machine.md)                |
| ADR-0063 | Sentiment-Based Routing            | [ADR-0063](../../adr/ADR%20Etapa%202/ADR-0063-Sentiment-Based-Routing.md)           |
| ADR-0064 | Human Takeover Protocol            | [ADR-0064](../../adr/ADR%20Etapa%202/ADR-0064-Human-Takeover-Protocol.md)           |
| ADR-0065 | Sequence-Based Follow-up           | [ADR-0065](../../adr/ADR%20Etapa%202/ADR-0065-Sequence-Based-Follow-up.md)          |
| ADR-0066 | Circuit Breaker for Bounce Rate    | [ADR-0066](../../adr/ADR%20Etapa%202/ADR-0066-Circuit-Breaker-for-Bounce-Rate.md)   |
| ADR-0067 | Phone Health Monitoring            | [ADR-0067](../../adr/ADR%20Etapa%202/ADR-0067-Phone-Health-Monitoring.md)           |

---

## Sumar ADRs

### ADR-0053: Multi-Channel Outreach Strategy

**Status:** Accepted | 15 Ianuarie 2026

Implementăm o arhitectură multi-canal cu WhatsApp (TimelinesAI), Cold Email (Instantly.ai) și Warm Email (Resend).

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0053-Multi-Channel-Outreach-Strategy.md)

---

### ADR-0054: Quota Guardian Pattern

**Status:** Accepted | 15 Ianuarie 2026

Implementăm Quota Guardian cu Redis Lua scripts pentru verificare și incrementare atomică a limitelor WhatsApp (200 contacte/zi).

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0054-Quota-Guardian-Pattern.md)

---

### ADR-0055: Sticky Phone Assignment

**Status:** Accepted | 15 Ianuarie 2026

Sticky assignment: La primul contact, lead-ul primește `assigned_phone_id` permanent pentru continuitate conversațională.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0055-Sticky-Phone-Assignment.md)

---

### ADR-0056: Business Hours Enforcement

**Status:** Accepted | 15 Ianuarie 2026

Toate mesajele sunt verificate contra business hours (09:00-18:00). Job-urile în afara intervalului sunt delayed.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0056-Business-Hours-Enforcement.md)

---

### ADR-0057: Jitter Pattern for Human Behavior

**Status:** Accepted | 15 Ianuarie 2026

Jitter obligatoriu pentru a mimana comportamentul uman și a evita detectarea automatizării.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0057-Jitter-Pattern-for-Human-Behavior.md)

---

### ADR-0058: Spintax for Message Uniqueness

**Status:** Accepted | 15 Ianuarie 2026

Toate template-urile folosesc Spintax pentru variație și evitarea detectării ca spam.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0058-Spintax-for-Message-Uniqueness.md)

---

### ADR-0059: Channel Segregation (Cold vs Warm)

**Status:** Accepted | 15 Ianuarie 2026

Segregare strictă: Instantly.ai DOAR pentru cold outreach, Resend DOAR pentru warm leads.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0059-Channel-Segregation-Cold-vs-Warm.md)

---

### ADR-0060: Head-of-Line Blocking Prevention

**Status:** Accepted | 15 Ianuarie 2026

20 cozi separate, una per număr WhatsApp, pentru a preveni blocarea.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0060-Head-of-Line-Blocking-Prevention.md)

---

### ADR-0061: Webhook Normalization Pattern

**Status:** Accepted | 15 Ianuarie 2026

Normalizare la SystemEvent comun pentru webhooks de la toți providerii.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0061-Webhook-Normalization-Pattern.md)

---

### ADR-0062: Lead State Machine

**Status:** Accepted | 15 Ianuarie 2026

Finite State Machine cu tranziții valide pentru lifecycle-ul unui lead.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0062-Lead-State-Machine.md)

---

### ADR-0063: Sentiment-Based Routing

**Status:** Accepted | 15 Ianuarie 2026

AI Sentiment Analysis cu routing bazat pe scor pentru automatizare vs intervenție umană.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0063-Sentiment-Based-Routing.md)

---

### ADR-0064: Human Takeover Protocol

**Status:** Accepted | 15 Ianuarie 2026

Protocol de preluare a conversațiilor de la AI de către operatori umani.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0064-Human-Takeover-Protocol.md)

---

### ADR-0065: Sequence-Based Follow-up

**Status:** Accepted | 15 Ianuarie 2026

Sequences cu steps și delays pentru automatizarea follow-up-urilor.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0065-Sequence-Based-Follow-up.md)

---

### ADR-0066: Circuit Breaker for Bounce Rate

**Status:** Accepted | 15 Ianuarie 2026

Circuit breaker pentru monitorizarea bounce rate și protecția împotriva blacklisting.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0066-Circuit-Breaker-for-Bounce-Rate.md)

---

### ADR-0067: Phone Health Monitoring

**Status:** Accepted | 15 Ianuarie 2026

Health check periodic pentru monitorizarea stării numerelor WhatsApp.

📄 [Vezi detalii complete](../../adr/ADR%20Etapa%202/ADR-0067-Phone-Health-Monitoring.md)

---

**Document generat:** 15 Ianuarie 2026  
**Total ADRs:** 15 (ADR-0053 → ADR-0067)  
**Conformitate:** Master Spec v1.2
