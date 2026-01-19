# ADR-0104: Win-Back Campaign Orchestration

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Recuperarea clienților churned necesită campanii multi-step.

**Decision:** **Step-based campaign engine**:

- Template strategies bazate pe customer value
- Delayed job scheduling pentru steps
- HITL pentru high-value clients
- Offer management integrat

**Consequences:**

- (+) Sistematizare a win-back
- (-) Requires offer approval workflow
- (+) Tracking ROI per campaign
