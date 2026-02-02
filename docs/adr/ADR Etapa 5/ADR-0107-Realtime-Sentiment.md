# ADR-0107: Real-Time Sentiment via Streaming

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Sentiment analysis trebuie să fie aproape real-time pentru churn detection.

**Decision:** **Event-driven sentiment pipeline**:

- Webhook receive message → Queue sentiment job
- LLM analysis în <30 seconds
- Immediate churn signal if negative
- Batching pentru cost optimization

**Consequences:**

- (+) Fast feedback loop pentru churn
- (-) LLM costs scale with messages
- (-) Rate limiting pentru cost control
