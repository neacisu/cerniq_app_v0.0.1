# ADR-0063: Sequence-Based Follow-up

**Status:** Accepted  
**Date:** 2026-01-15  
**Context:** Follow-up-urile trebuie programate automat după primul contact.

**Decision:** **Sequences cu steps și delays**:

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

**Rationale:**

- Automatizare completă
- Customizabil per campaign
- Stop automat la reply

**Consequences:**

- (+) Automatizare completă a follow-up-urilor
- (+) Flexibilitate per campanie
- (-) Scheduler pentru delayed jobs
- (-) Storage pentru sequence state
- (-) Edge cases (weekends, holidays)
