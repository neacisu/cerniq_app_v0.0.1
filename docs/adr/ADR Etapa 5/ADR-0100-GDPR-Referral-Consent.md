# ADR-0100: GDPR Consent-First Referral Flow

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Referral-urile necesită consimțământ explicit conform GDPR.

**Decision:** **Consent-first flow**:

1. Detectăm mențiune în conversație
2. Cerem consimțământ explicit de la referrer
3. Doar după aprobare contactăm referred
4. Auditare completă a lanțului de consimțământ

**Consequences:**

- (+) Conformitate GDPR 100%
- (-) Friction în flow (reduce conversion rate)
- (+) Full audit trail
