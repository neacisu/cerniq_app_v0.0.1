# CERNIQ.APP — ETAPA 5: STANDARDS & PROCEDURES
## Operational Standards pentru Nurturing
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Nurturing Lifecycle Standards

### State Transition SLAs
| Transition | Trigger | Max Time |
|------------|---------|----------|
| ONBOARDING → ACTIVE | 14 days post-order | Automatic |
| ACTIVE → AT_RISK | Churn score > 50% | < 1 hour |
| AT_RISK → CHURNED | 180 days dormant | Daily check |
| CHURNED → REACTIVATED | Win-back order | Immediate |

### Communication Frequency
| State | Max Frequency | Channels |
|-------|---------------|----------|
| ONBOARDING | 1/week | Email, WhatsApp |
| ACTIVE | 2/month | Email, WhatsApp |
| AT_RISK | 1/week | All + Phone |
| LOYAL | 1/month | Email |
| ADVOCATE | As needed | Personal |

---

## 2. Churn Detection Standards

### Signal Weights
| Signal Type | Weight | Threshold |
|-------------|--------|-----------|
| NEGATIVE_SENTIMENT | 0.20 | Score < -0.3 |
| COMPETITOR_MENTION | 0.15 | Any mention |
| ORDER_FREQUENCY_DROP | 0.15 | > 1.5x avg interval |
| PAYMENT_DELAY | 0.10 | > 14 days |
| COMMUNICATION_FADE | 0.15 | < 50% response rate |
| PRICE_COMPLAINT | 0.10 | Topic detected |
| QUALITY_COMPLAINT | 0.05 | Topic detected |
| SUPPORT_ESCALATION | 0.10 | > 3 tickets/month |

### Risk Level Actions
| Level | Score Range | Required Action |
|-------|-------------|-----------------|
| CRITICAL | 75-100 | HITL immediate, phone call |
| HIGH | 50-74 | HITL 24h, win-back offer |
| MEDIUM | 25-49 | Automated nurturing boost |
| LOW | 0-24 | Standard nurturing |

---

## 3. Referral Standards

### Cooldown Rules
- Between referral requests to same client: **30 days**
- Max pending referrals per client: **3**
- Referral expiry: **30 days after creation**

### Consent Requirements
- EXPLICIT referral: Must have recorded consent before contact
- SOFT_MENTION: Ask consent before using
- PROXIMITY: No consent needed (no personal data shared)
- GROUP_DEAL: Opt-in required

### Reward Tiers
| Conversion Value | Reward |
|------------------|--------|
| < €1,000 | 5% discount on next order |
| €1,000 - €5,000 | €100 credit |
| > €5,000 | €200 credit + gift |

---

## 4. Cluster Management Standards

### Detection Criteria
| Cluster Type | Min Members | Detection Method |
|--------------|-------------|------------------|
| GEOGRAPHIC | 3 | Proximity < 10km |
| BEHAVIORAL | 5 | Similar purchase patterns |
| FORMAL | N/A | Registry data |
| IMPLICIT | 4 | Leiden modularity > 0.3 |

### Penetration Targets
| Cluster Type | Target Penetration | Priority |
|--------------|-------------------|----------|
| OUAI | 40% | High |
| COOPERATIVE | 30% | High |
| IMPLICIT | 25% | Medium |
| GEOGRAPHIC | 20% | Medium |

---

## 5. KOL Standards

### Tier Criteria
| Tier | KOL Score | Min Referrals | Min Influenced Revenue |
|------|-----------|---------------|------------------------|
| ELITE | > 80 | 10+ converted | > €100,000 |
| ESTABLISHED | 60-80 | 5+ converted | > €50,000 |
| EMERGING | 40-60 | 2+ converted | > €10,000 |

### Engagement Rules
- ELITE: Personal account manager, quarterly review
- ESTABLISHED: Monthly check-in, priority support
- EMERGING: Automated nurturing + recognition

---

## 6. GDPR & Compliance Standards

### Data Processing Basis
| Data Type | Legal Basis | Retention |
|-----------|-------------|-----------|
| Association membership | Public data | Indefinite |
| Referral contact | Explicit consent | Until consent withdrawn |
| Sentiment analysis | Legitimate interest | 2 years |
| Competitor intel | Legitimate interest (aggregated) | 1 year |

### Audit Requirements
- All consent requests logged
- All referral contacts logged
- Competitor intel reviewed quarterly
- GDPR data requests: < 30 days response

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
