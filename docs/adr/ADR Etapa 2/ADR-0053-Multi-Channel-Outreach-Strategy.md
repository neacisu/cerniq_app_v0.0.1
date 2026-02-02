# ADR-0053: Multi-Channel Outreach Strategy

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Etapa 2 necesită contactarea prospecților din Gold layer prin multiple canale (WhatsApp, Email) cu respectarea limitelor stricte impuse de provideri și GDPR.

**Decision:** Implementăm o arhitectură multi-canal cu:

- **WhatsApp** (TimelinesAI): Canal primar pentru mesaje personalizate
- **Cold Email** (Instantly.ai): Volume mare, warm-up automat
- **Warm Email** (Resend): Doar pentru leads calde, deliverability excelent

**Rationale:**

- WhatsApp are rate de răspuns 5-10x mai mari decât email
- Instantly.ai oferă inbox rotation și warm-up automat
- Resend garantează inbox placement pentru leads importante

**Consequences:**

- (+) Rate de răspuns superioare prin WhatsApp
- (+) Warm-up automat și inbox rotation pentru cold email
- (+) Deliverability excelent pentru leads calde
- (-) Cost: ~$700/lună (TimelinesAI $500 + Instantly $200)
- (-) Complexitate: 3 API-uri diferite de integrat
- (-) Necesită channel selector inteligent
