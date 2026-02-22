# Multi-Channel Notification System

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers multi-channel notifications: email (Resend API), WhatsApp (WA Business API), in-app (WebSocket via monitoring-api), user preferences, template system, and delivery tracking.

---

## 1. Channels

| Channel   | Provider        | Use Case                    |
|-----------|-----------------|-----------------------------|
| Email     | Resend API      | Transactional, marketing   |
| WhatsApp  | WA Business API | Alerts, support             |
| In-app    | WebSocket       | Real-time UI notifications |

---

## 2. Email (Resend API)

- **API:** Resend.com
- **Credentials:** `secret/cerniq/shared/external` → `resend_api_key`
- **Domain:** Verify domain in Resend dashboard
- **Rate limit:** 100 emails/sec

See `email-integration.md` for details.

---

## 3. WhatsApp (WA Business API)

- **Provider:** Meta WhatsApp Business API (or Twilio/MessageBird)
- **Use:** Order confirmations, appointment reminders, support
- **Template messages:** Pre-approved templates required
- **Rate limits:** Per phone number; respect opt-in/opt-out

---

## 4. In-App (WebSocket via monitoring-api)

- **Port:** 64080 (monitoring-api)
- **Protocol:** WebSocket
- **Channel:** `notifications:user:{userId}`

```typescript
// Server emits
wsServer.to(`notifications:user:${userId}`).emit('notification', {
  id: uuid(),
  type: 'lead_assigned',
  title: 'New lead assigned',
  body: 'Lead "Acme Corp" was assigned to you',
  read: false,
  createdAt: new Date().toISOString(),
});
```

---

## 5. Notification Preferences per User

Store in `user_preferences` or `notification_settings`:

| Preference      | Email | WhatsApp | In-app |
|-----------------|-------|----------|--------|
| lead_assigned   | ✓     | ✗        | ✓      |
| invoice_ready   | ✓     | ✓        | ✓      |
| marketing      | ✗     | ✗        | ✗      |

Respect user choices before sending.

---

## 6. Template System

- **Location:** `templates/notifications/`
- **Formats:** HTML (email), plain text (WhatsApp), JSON (in-app)
- **Variables:** `{{userName}}`, `{{leadName}}`, `{{invoiceUrl}}`

Use Handlebars or similar. Store templates in DB for admin-editable content.

---

## 7. Delivery Tracking

- **Email:** Resend webhooks for delivered, bounced, complained
- **WhatsApp:** Delivery receipts from provider
- **In-app:** Mark as read when user clicks

Store in `notification_log`: `id`, `user_id`, `channel`, `template`, `status`, `external_id`, `created_at`.

---

## 8. Notification Service Abstraction

```typescript
interface NotificationService {
  send(userId: string, channel: 'email' | 'whatsapp' | 'in_app', template: string, data: Record<string, unknown>): Promise<void>;
}

// Implementation checks user preferences, renders template, dispatches to channel
```

---

## 9. Batch Notifications

For bulk (e.g. newsletter): use BullMQ queue with rate limiting. Batch by channel to respect provider limits.

---

## 10. In-App Notification Schema

```typescript
interface InAppNotification {
  id: string;
  type: 'lead_assigned' | 'invoice_ready' | 'task_due';
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
```

---

## 11. Romanian Context

- **Legal:** Marketing requires consent (GDPR); keep proof of consent
- **Language:** Default Romanian; respect user locale preference
- **Business hours:** Consider quiet hours for WhatsApp (no 22:00–08:00 unless urgent)

---

## 12. Related Documents

- `email-integration.md` — Resend details
- `webhook-ingestion.md` — Webhook handling for delivery events

---

## Checklist

- [ ] Resend for email
- [ ] WhatsApp for high-priority
- [ ] WebSocket for in-app
- [ ] User preferences respected
- [ ] Template system
- [ ] Delivery tracking
- [ ] Service abstraction
- [ ] Batch with rate limiting
