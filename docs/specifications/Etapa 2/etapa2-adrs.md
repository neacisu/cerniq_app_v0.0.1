# CERNIQ.APP — ETAPA 2: ARCHITECTURE DECISION RECORDS
## Cold Outreach Multi-Canal - ADRs
### Versiunea 1.0 | 15 Ianuarie 2026

---

# ADR-E2-001: Multi-Channel Outreach Strategy

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Etapa 2 necesită contactarea prospecților din Gold layer prin multiple canale (WhatsApp, Email) cu respectarea limitelor stricte impuse de provideri și GDPR.

## Decision
Implementăm o arhitectură multi-canal cu:
- **WhatsApp** (TimelinesAI): Canal primar pentru mesaje personalizate
- **Cold Email** (Instantly.ai): Volume mare, warm-up automat
- **Warm Email** (Resend): Doar pentru leads calde, deliverability excelent

## Rationale
- WhatsApp are rate de răspuns 5-10x mai mari decât email
- Instantly.ai oferă inbox rotation și warm-up automat
- Resend garantează inbox placement pentru leads importante

## Consequences
- Cost: ~$700/lună (TimelinesAI $500 + Instantly $200)
- Complexitate: 3 API-uri diferite de integrat
- Trebuie implementat channel selector inteligent

---

# ADR-E2-002: Quota Guardian Pattern

## Status
**Accepted** | 15 Ianuarie 2026

## Context
WhatsApp impune limita de 200 contacte NOI pe zi pe număr. Depășirea = ban permanent.

## Decision
Implementăm **Quota Guardian** cu Redis Lua scripts pentru verificare și incrementare atomică:
```lua
-- ATOMIC: Check + Increment
local quota = redis.call('GET', key)
if tonumber(quota) >= 200 then
  return -1  -- REJECTED
end
redis.call('INCR', key)
return tonumber(quota) + 1  -- ALLOWED
```

## Rationale
- Operații atomice previn race conditions
- Redis oferă persistență și viteză
- Separare NEW (cost=1) vs FOLLOW-UP (cost=0)

## Consequences
- Necesită Redis cluster pentru HA
- Quota reset zilnic via cron la 00:00
- Job-uri rejected sunt delayed, nu pierdute

---

# ADR-E2-003: Sticky Phone Assignment

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Un lead trebuie să primească mesaje mereu de la același număr WhatsApp pentru continuitate conversațională.

## Decision
**Sticky assignment**: La primul contact, lead-ul primește `assigned_phone_id` permanent.
```sql
assigned_phone_id UUID REFERENCES wa_phone_numbers(id)
```

## Rationale
- Consistență în conversație
- WhatsApp identifică chat-uri după sender
- Evită confuzie la prospect

## Consequences
- Load balancing inegal între numere
- Necesită rebalancing dacă un număr e banat
- Round-robin doar pentru assignment inițial

---

# ADR-E2-004: Business Hours Enforcement

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Mesajele trimise în afara orelor de lucru (09:00-18:00) au rate de răspuns foarte mici și pot fi percepute ca spam.

## Decision
Toate mesajele sunt verificate contra business hours. Job-urile în afara intervalului sunt **delayed** la următoarea fereastră.

```typescript
const isBusinessHours = (tz: string): boolean => {
  const local = DateTime.now().setZone(tz);
  return local.hour >= 9 && local.hour < 18 && local.weekday <= 5;
};
```

## Rationale
- Respectă timpul prospectului
- Rate de răspuns mai mari
- Evită percepția de spam

## Consequences
- Acumulare de job-uri overnight
- Spike de activitate la 09:00
- Necesită timezone corect pentru fiecare lead

---

# ADR-E2-005: Jitter Pattern for Human Behavior

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Mesajele trimise la intervale fixe sunt detectate ca automatizate de WhatsApp/Email providers.

## Decision
**Jitter obligatoriu**: `delay = baseDelay + random(0, maxJitter)`
```typescript
const jitter = 30_000 + Math.random() * 120_000; // 30s-150s
await sleep(jitter);
```

## Rationale
- Mimează comportament uman
- Evită detection patterns
- Reduce șansele de ban

## Consequences
- Throughput mai mic
- Timing impredictibil
- Acceptabil pentru use case

---

# ADR-E2-006: Spintax for Message Uniqueness

## Status
**Accepted** | 15 Ianuarie 2026

## Context
WhatsApp și email providers detectează mesaje identice și le marchează ca spam.

## Decision
Toate template-urile folosesc **Spintax** pentru variație:
```
{Bună ziua|Salut|Hello} {{{firstName}}},

{Vă contactez|Scriu|Mă adresez} {în legătură cu|referitor la|despre} 
{serviciile noastre|oferta noastră|produsele Cerniq}.
```

## Rationale
- Fiecare mesaj devine unic
- Evită fingerprinting
- Păstrează context consistent

## Consequences
- Template-uri mai complexe de creat
- Necesită validare spintax
- Preview poate diferi de final

---

# ADR-E2-007: Channel Segregation (Cold vs Warm)

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Email-urile cold și warm au cerințe de deliverability complet diferite.

## Decision
**Segregare strictă**:
- **Instantly.ai**: DOAR cold outreach (domenii sacrificabile)
- **Resend**: DOAR warm leads (domeniu principal, reputație)

```typescript
if (lead.engagement_stage === 'WARM_REPLY' || lead.engagement_stage === 'NEGOTIATION') {
  queue = 'email:warm'; // Resend
} else {
  queue = 'email:cold'; // Instantly
}
```

## Rationale
- Protejează reputația domeniului principal
- Instantly are warm-up și rotation built-in
- Resend garantează inbox pentru leads importante

## Consequences
- Doi provideri de email de gestionat
- Costuri separate
- Logică de routing necesară

---

# ADR-E2-008: Head-of-Line Blocking Prevention

## Status
**Accepted** | 15 Ianuarie 2026

## Context
O coadă unică pentru 20 numere WhatsApp ar permite unui job blocat să oprească toate celelalte.

## Decision
**20 cozi separate**, una per număr WhatsApp:
```
q:wa:phone_01
q:wa:phone_02
...
q:wa:phone_20
```

Fiecare coadă are concurrency=1.

## Rationale
- Un număr blocat nu afectează celelalte
- Izolare completă per number
- Debugging mai ușor

## Consequences
- 20 workers separați de monitorizat
- Routing logic necesară
- Mai multe conexiuni Redis

---

# ADR-E2-009: Webhook Normalization Pattern

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Fiecare provider (TimelinesAI, Instantly, Resend) trimite webhooks în formate diferite.

## Decision
**Normalizare la SystemEvent comun**:
```typescript
interface SystemEvent {
  lead_id: string;
  type: 'REPLY' | 'BOUNCE' | 'OPEN' | 'CLICK' | 'UNSUBSCRIBE';
  channel: 'WHATSAPP' | 'EMAIL';
  content?: string;
  timestamp: Date;
  raw_payload: object;
}
```

## Rationale
- Pipeline downstream uniform
- Ușor de adăugat noi provideri
- Single source of truth pentru events

## Consequences
- Mapare per provider necesară
- Posibilă pierdere de detalii specifice
- raw_payload păstrat pentru debugging

---

# ADR-E2-010: Lead State Machine

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Un lead trece prin multiple stări în procesul de outreach.

## Decision
**Finite State Machine** cu tranziții valide:
```
COLD → CONTACTED_WA | CONTACTED_EMAIL
CONTACTED_* → WARM_REPLY | DEAD
WARM_REPLY → NEGOTIATION | DEAD
NEGOTIATION → CONVERTED | DEAD
```

## Rationale
- Tranziții predictibile
- Audit trail complet
- Previne stări invalide

## Consequences
- Validare la fiecare tranziție
- Rollback imposibil (design decision)
- Necesită handled pentru edge cases

---

# ADR-E2-011: Sentiment-Based Routing

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Răspunsurile negative sau ambigue necesită intervenție umană.

## Decision
AI Sentiment Analysis cu routing:
- **Score ≥ 50**: Auto-reply cu AI
- **Score 0-49**: Human review queue
- **Score < 0**: Immediate human takeover

## Rationale
- AI poate gestiona răspunsuri pozitive
- Negativ necesită touch uman
- Reducere workload pentru operatori

## Consequences
- Cost LLM per mesaj (~$0.01)
- Latență adăugată pentru analiză
- False positives posibile

---

# ADR-E2-012: Human Takeover Protocol

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Operatorii trebuie să poată prelua conversații de la AI.

## Decision
**Takeover flags în gold_lead_journey**:
```sql
requires_human_review BOOLEAN DEFAULT FALSE
human_review_reason TEXT
assigned_to_user UUID REFERENCES users(id)
is_human_controlled BOOLEAN DEFAULT FALSE
```

## Rationale
- Tranziție clară AI → Human
- Atribuire explicită
- Return to AI posibil

## Consequences
- UI pentru review queue
- Notification system
- SLA pentru response time

---

# ADR-E2-013: Sequence-Based Follow-up

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Follow-up-urile trebuie programate automat după primul contact.

## Decision
**Sequences cu steps și delays**:
```typescript
interface Sequence {
  id: string;
  steps: SequenceStep[];
}

interface SequenceStep {
  step_number: number;
  delay_hours: number;
  channel: 'WHATSAPP' | 'EMAIL';
  template_id: string;
}
```

## Rationale
- Automatizare completă
- Customizabil per campaign
- Stop automat la reply

## Consequences
- Scheduler pentru delayed jobs
- Storage pentru sequence state
- Edge cases (weekends, holidays)

---

# ADR-E2-014: Circuit Breaker for Bounce Rate

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Bounce rate > 3% poate duce la blacklisting domeniu.

## Decision
**Circuit breaker** monitorizează hourly și pausează campaign dacă bounce > 3%:
```typescript
if (bounceRate > 0.03) {
  await pauseCampaign(campaignId);
  await alertAdmin('BOUNCE_RATE_HIGH', { bounceRate, campaignId });
}
```

## Rationale
- Protecție automată
- Notificare imediată
- Recovery manual după investigare

## Consequences
- Poate opri campaigns legitime
- Necesită threshold tuning
- Manual resume required

---

# ADR-E2-015: Phone Health Monitoring

## Status
**Accepted** | 15 Ianuarie 2026

## Context
Numerele WhatsApp pot deveni offline sau banned fără notificare.

## Decision
**Health check periodic** (every 10 min):
- Ping TimelinesAI pentru status
- Verificare last_activity
- Alert dacă offline > 30 min

## Rationale
- Detectare rapidă a problemelor
- Realocare automată posibilă
- Dashboard status în timp real

## Consequences
- API calls suplimentare
- Posibile false alarms
- Necesită escalation path

---

**Document generat:** 15 Ianuarie 2026
**Total ADRs:** 15
**Conformitate:** Master Spec v1.2
