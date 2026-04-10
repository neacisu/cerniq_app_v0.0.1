/**
 * Livrare notificări multi-canal: IN_APP (persistat), EMAIL (Resend), WEBHOOK (HTTPS).
 * Cozi existente: nu folosim EMAIL_WARM (ADR-0059 lead journey); email sistem = Resend tranzacțional.
 */
import {
  and,
  db,
  eq,
  inArray,
  notifications,
  resetSessionContext,
  setSessionTenantId,
  tenants,
  users,
} from "@cerniq/db";
import { createServiceLogger } from "@cerniq/observability";
import { callExternalApi } from "./external-api-wrapper.js";

const notifyLog = createServiceLogger("notification-dispatcher");

export type NotificationChannel = "IN_APP" | "EMAIL" | "WEBHOOK";

export type DispatchNotificationInput = {
  tenantId: string;
  userId?: string | null;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
};

async function resolveRecipientEmail(
  tenantId: string,
  userId?: string | null,
): Promise<string | null> {
  if (userId) {
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);
    return row?.email ?? null;
  }
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), inArray(users.role, ["owner", "admin"])))
    .limit(1);
  return row?.email ?? null;
}

async function resolveTenantWebhookUrl(
  tenantId: string,
  data?: Record<string, unknown>,
): Promise<string | null> {
  const fromPayload = data?.webhookUrl;
  if (typeof fromPayload === "string" && fromPayload.startsWith("https://")) {
    return fromPayload;
  }
  if (typeof fromPayload === "string" && fromPayload.startsWith("http://")) {
    return fromPayload;
  }
  const [t] = await db
    .select({ settings: tenants.settings })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  const raw = (t?.settings as Record<string, unknown> | undefined)?.notificationWebhookUrl;
  if (typeof raw === "string" && (raw.startsWith("http://") || raw.startsWith("https://"))) {
    return raw;
  }
  return null;
}

async function sendNotificationEmail(input: DispatchNotificationInput, to: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    notifyLog.warn({ event: "resend_api_key_missing", msg: "skip EMAIL channel" });
    return;
  }
  const base = process.env.RESEND_API_URL?.trim() ?? "https://api.resend.com";
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "noreply@cerniq.app";
  const html = `<p>${escapeHtml(input.body)}</p>`;
  await callExternalApi("resend_system_notification", async () => {
    const res = await fetch(`${base.replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.title,
        html,
        tags: [
          { name: "tenant_id", value: input.tenantId },
          { name: "notification_type", value: input.type },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${text}`);
    }
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function postTenantWebhook(url: string, payload: DispatchNotificationInput): Promise<void> {
  await callExternalApi("notification_webhook", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: payload.type,
        title: payload.title,
        body: payload.body,
        tenantId: payload.tenantId,
        userId: payload.userId ?? null,
        data: payload.data ?? {},
        ts: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new Error(`webhook ${res.status}`);
    }
  });
}

async function dispatchOneChannel(
  ch: NotificationChannel,
  input: DispatchNotificationInput,
  data: Record<string, unknown>,
): Promise<void> {
  switch (ch) {
    case "IN_APP":
      await db.insert(notifications).values({
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        type: input.type,
        channel: "IN_APP",
        title: input.title,
        body: input.body,
        data,
      });
      return;
    case "EMAIL":
      try {
        const to = await resolveRecipientEmail(input.tenantId, input.userId);
        if (to) await sendNotificationEmail(input, to);
      } catch (err) {
        notifyLog.error({ event: "notification_email_failed", err });
      }
      return;
    case "WEBHOOK":
      try {
        const url = await resolveTenantWebhookUrl(input.tenantId, data);
        if (url) await postTenantWebhook(url, input);
      } catch (err) {
        notifyLog.error({ event: "notification_webhook_failed", err });
      }
      return;
    default:
      return;
  }
}

/**
 * Trimite notificarea pe canalele solicitate. IN_APP persistă un rând în `public.notifications`.
 */
export async function dispatchNotification(input: DispatchNotificationInput): Promise<void> {
  const data = input.data ?? {};
  await setSessionTenantId(input.tenantId);
  try {
    for (const ch of input.channels) {
      await dispatchOneChannel(ch, input, data);
    }
  } finally {
    await resetSessionContext();
  }
}
