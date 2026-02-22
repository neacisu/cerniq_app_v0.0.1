# Email Integration — Resend API

**Priority:** MEDIUM | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers email sending via Resend API: template rendering, open/click tracking, bounce handling, domain verification, and rate limits.

---

## 1. Resend API

- **Provider:** Resend.com
- **Credentials:** `secret/cerniq/shared/external` → `resend_api_key`
- **Endpoint:** `https://api.resend.com/emails`
- **Docs:** https://resend.com/docs

---

## 2. Basic Send

```typescript
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'noreply@cerniq.app',
    to: [recipient],
    subject: 'Invoice ready',
    html: renderedHtml,
  }),
});
```

---

## 3. Template Rendering

- **Engine:** Handlebars, EJS, or React Email
- **Location:** `templates/email/`
- **Variables:** `{{userName}}`, `{{invoiceUrl}}`, `{{companyName}}`

```typescript
import Handlebars from 'handlebars';
const template = Handlebars.compile(fs.readFileSync('templates/email/invoice-ready.html', 'utf8'));
const html = template({ userName: user.name, invoiceUrl: url });
```

Store templates in DB for admin-editable content (optional).

---

## 4. Tracking (Open/Click)

Resend supports webhooks for:
- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.complained`
- `email.bounced`
- `email.opened` (if tracking enabled)
- `email.clicked`

Enable in Resend dashboard. Configure webhook URL: `https://api.cerniq.app/v1/webhooks/resend`. Verify signature (see `webhook-ingestion.md`).

---

## 5. Bounce Handling

On `email.bounced` webhook:
- Mark recipient as bounced in DB
- Suppress future emails to that address
- Optionally notify admin

Store bounce status in `email_recipients` or `user` table.

---

## 6. Domain Verification

- Add DNS records (SPF, DKIM, DMARC) as per Resend instructions
- Verify domain in Resend dashboard before sending
- Use verified domain in `from` address

---

## 7. Rate Limits

- **Resend:** 100 emails/sec (varies by plan)
- **Best practice:** Use BullMQ queue with rate limiter for bulk sends
- **Retry:** On 429, back off and retry

---

## 8. Romanian Context

- **Legal:** Include company details (CUI, address) in footer
- **Language:** Primary Romanian; support English for international
- **Unsubscribe:** Required for marketing; link in footer

---

## 9. Transactional vs Marketing

- **Transactional:** Password reset, invoice, order confirmation — no unsubscribe
- **Marketing:** Newsletters, promotions — require unsubscribe, consent, and list management
- Use separate Resend domains or tags for analytics

---

## 10. Error Handling

Map Resend errors to AppError:

| Resend Error     | Action                    |
|------------------|---------------------------|
| 429              | Queue for retry, backoff  |
| 400 (invalid)    | BadRequestError, log       |
| 401/403          | Check API key, rotate     |
| 5xx              | Retry with circuit breaker|

---

## 11. Async Sending via BullMQ

For non-immediate sends, enqueue to `cerniq:queue:email`:

```typescript
await emailQueue.add('send', { to, template, data }, { attempts: 3 });
```

Worker calls Resend API. Enables rate limiting and retries.

---

## 12. Related Documents

- `webhook-ingestion.md` — Resend webhook signature verification
- `notification-system.md` — Multi-channel overview
- `external-api-integration.md` — Circuit breaker, retry

---

## Checklist

- [ ] Resend API key from OpenBao
- [ ] Template rendering
- [ ] Webhooks for tracking/bounce
- [ ] Domain verified
- [ ] Rate limiting for bulk
- [ ] Bounce suppression
- [ ] Async queue for non-critical
