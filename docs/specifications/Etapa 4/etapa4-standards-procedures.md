# CERNIQ.APP — ETAPA 4: OPERATIONAL PROCEDURES
## Proceduri Operaționale Standard
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Payment Reconciliation Procedures](#1-reconciliation)
2. [Credit Management Procedures](#2-credit)
3. [Shipment Procedures](#3-shipment)
4. [Return & Refund Procedures](#4-returns)
5. [Escalation Procedures](#5-escalation)
6. [Emergency Procedures](#6-emergency)

---

## 1. Payment Reconciliation Procedures {#1-reconciliation}

### SOP-401: Auto Reconciliation
```
Trigger: Payment received via Revolut webhook

PASUL 1: Exact Match (Tier 1)
  - Compare payment.reference with invoice.invoiceNumber
  - If exact match AND amount matches (±0.01):
    → Mark as MATCHED_EXACT
    → Update order.amountPaid
    → Release credit reservation
    → Notify client
  - Else → continue to Tier 2

PASUL 2: Fuzzy Match (Tier 2)
  - Find invoices with amount ±5%
  - Score by counterpartyName similarity
  - If best match score ≥ 85%:
    → Mark as MATCHED_FUZZY
    → Log for audit
  - Else → continue to HITL

PASUL 3: Manual Investigation (HITL)
  - Create HITL task type: payment:unmatched
  - Include top 5 candidates with scores
  - SLA: 8 hours
  - Escalate to CFO if not resolved
```

### SOP-402: Unmatched Payment Investigation
```
Trigger: HITL task assigned

PASUL 1: Review Payment Details
  - Check counterparty name variations
  - Verify bank account
  - Check payment description

PASUL 2: Search for Matches
  - Search by partial invoice number
  - Search by client name
  - Search by amount (exact, partial)

PASUL 3: Resolution Options
  A) Match to existing invoice
     → Select invoice from list
     → Confirm match
     → System processes reconciliation

  B) Create new invoice
     → Identify client
     → Create corresponding invoice
     → Match payment

  C) Mark as Disputed
     → Document reason
     → Initiate investigation
     → Notify finance team

PASUL 4: Documentation
  - Record resolution notes
  - Update audit trail
```

---

## 2. Credit Management Procedures {#2-credit}

### SOP-410: Credit Score Refresh
```
Trigger: Daily cron 03:00 OR Manual request

PASUL 1: Fetch External Data
  - Query Termene.ro API:
    • ANAF status
    • Financial statements (bilant)
    • BPI (insolvency check)
    • Litigation data

PASUL 2: Calculate Score Components
  - ANAF Status: 0-15 points
  - Financial Health: 0-30 points
  - Payment History: 0-25 points
  - BPI Status: 0-20 points
  - Litigation: 0-10 points

PASUL 3: Determine Risk Tier
  - BLOCKED: 0-29
  - LOW: 30-49
  - MEDIUM: 50-69
  - HIGH: 70-89
  - PREMIUM: 90-100

PASUL 4: Update Credit Limit
  - Apply tier-based limit
  - If limit > 50K EUR → require HITL approval
  - Store score history
```

### SOP-411: Credit Override Request
```
Trigger: Order blocked for insufficient credit

PASUL 1: Sales Rep Initiates Request
  - Provide business justification
  - Specify override type:
    • One-time: This order only
    • Temporary: 30 days
    • Permanent: Limit increase

PASUL 2: HITL Review
  - Review client payment history
  - Check recent financial data
  - Assess order profitability

PASUL 3: Decision
  A) APPROVE
     → Reserve credit with override flag
     → Process order
     → Log override for audit

  B) REJECT
     → Notify sales rep with reason
     → Order remains blocked
     → Optional: Convert to prepayment
```

### SOP-412: Client Credit Block
```
Trigger: Payment overdue > 30 days OR Manual

PASUL 1: Automatic Block
  - Set is_blocked = true
  - Record blocked_reason
  - Notify client
  - Notify sales rep

PASUL 2: Impact
  - All new orders blocked
  - Existing orders continue
  - Credit reservations frozen

PASUL 3: Unblock Process
  - Payment received for all overdue
  - Manager approval required
  - Documented reason
```

---

## 3. Shipment Procedures {#3-shipment}

### SOP-420: AWB Generation
```
Trigger: Order status = CONTRACT_SIGNED

PASUL 1: Prepare Shipment Data
  - Get delivery address
  - Calculate package dimensions/weight
  - Determine service type (Standard/Express)
  - Set COD amount if applicable

PASUL 2: Create AWB via Sameday API
  - Generate parcel
  - Receive AWB number
  - Download label PDF

PASUL 3: Update Records
  - Create shipment record
  - Update order.shipmentId
  - Store label URL

PASUL 4: Schedule Pickup
  - Add to daily pickup batch (14:00)
  - Notify warehouse
```

### SOP-421: Delivery Failure Handling
```
Trigger: Status = DELIVERY_FAILED (3x)

PASUL 1: Notify Client
  - WhatsApp: Request alternative date/address
  - Email: Same content + tracking link

PASUL 2: Client Response
  A) New delivery attempt
     → Update address if needed
     → Reschedule delivery

  B) No response (48h)
     → Initiate return to sender
     → Update order status

PASUL 3: Return Processing
  - Receive returned package
  - Inspect contents
  - Restock if undamaged
  - Update order status to CANCELLED
```

---

## 4. Return & Refund Procedures {#4-returns}

### SOP-430: Return Request Processing
```
Trigger: Client requests return

PASUL 1: Eligibility Check
  - Verify within 14 days of delivery
  - Check product condition requirements
  - Verify items match order

PASUL 2: Auto-Approval Check
  - If return value ≤ 500 RON:
    → Auto-approve
    → Generate return AWB
    → Send to client

PASUL 3: HITL Approval (if > 500 RON)
  - Create HITL task
  - Finance review
  - Approval/Rejection decision

PASUL 4: Return Shipment
  - Generate return AWB
  - Send label to client
  - Track return shipment
```

### SOP-431: Refund Processing
```
Trigger: Return received and inspected

PASUL 1: Inspection
  - Check product condition
  - Verify all components
  - Document with photos

PASUL 2: Determine Refund Amount
  A) Full refund
     → Original purchase price
     → No restocking fee

  B) Partial refund
     → Deduct restocking fee (10-20%)
     → Document damage

  C) Refund rejected
     → Return product to client
     → Document rejection reason

PASUL 3: Process Refund
  - Create refund record
  - Initiate Revolut payment
  - Update client balance
  - Notify client
```

---

## 5. Escalation Procedures {#5-escalation}

### SOP-450: HITL Escalation Chain
```
Level 1: Initial Assignment
  - Task assigned to role
  - SLA timer starts

Level 2: First Escalation (SLA/2 exceeded)
  - Notify assigned user
  - Add to dashboard alert

Level 3: Second Escalation (SLA exceeded)
  - Escalate to manager
  - Slack notification
  - Priority: HIGH

Level 4: Critical Escalation (SLA+2h)
  - Escalate to director/CFO
  - Email + SMS notification
  - Priority: CRITICAL
```

### SOP-451: Critical Issue Escalation
```
Trigger: System detects critical issue

Issues requiring immediate escalation:
- Payment system down
- Multiple failed deliveries (>10)
- Credit scoring API unavailable
- Suspected fraud detected

Escalation Path:
1. Automatic Slack alert to #incidents
2. PagerDuty alert to on-call
3. Email to management
4. Phone call if no response (5 min)
```

---

## 6. Emergency Procedures {#6-emergency}

### SOP-460: Revolut Integration Failure
```
Trigger: Revolut webhook failures > 5/hour

PASUL 1: Detection
  - Monitor webhook success rate
  - Alert if rate < 95%

PASUL 2: Immediate Actions
  - Check Revolut status page
  - Review error logs
  - Verify API credentials

PASUL 3: Workaround
  - Enable manual payment entry mode
  - Notify finance team
  - Queue failed webhooks for retry

PASUL 4: Recovery
  - Replay queued webhooks
  - Verify data consistency
  - Generate reconciliation report
```

### SOP-461: Sameday Integration Failure
```
Trigger: Sameday API errors > 10/hour

PASUL 1: Detection
  - Monitor API response codes
  - Alert operations team

PASUL 2: Impact Assessment
  - Count pending AWB generations
  - Identify affected orders

PASUL 3: Workaround
  - Manual AWB creation via Sameday portal
  - Update shipment records manually
  - Delay non-critical shipments

PASUL 4: Recovery
  - Process backlog
  - Verify tracking data sync
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
