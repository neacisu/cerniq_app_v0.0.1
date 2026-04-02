/**
 * I52 — document:email:send (concurrency:10)
 *
 * Trimite email tranzacțional cu atașament PDF via Resend API.
 * Resend este furnizorul de email folosit în întreaga aplicație
 * (atât pentru emailuri de outreach cât și pentru documente fiscale).
 *
 * Auth: RESEND_API_KEY din env (OpenBao injection)
 * From: RESEND_FROM_EMAIL din env
 * Rate limit Resend: 5 req/s — BullMQ rateLimit asigură compliance
 *
 * Retry: 3x via DEFAULT_JOB_OPTIONS — NU retry manual în cod.
 * Tipul cognitiv: MotorNeuron
 *
 * Referință API: https://resend.com/docs/api-reference/introduction
 */
import type { Processor } from "bullmq";
import { Resend } from "resend";
import { setSessionTenantId } from "@cerniq/db";

const LOG = "[i52-document-email-send]";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DocumentEmailSendJobData {
  tenantId: string;
  recipientEmail: string;
  subject: string;
  htmlBody?: string;
  pdfBase64?: string;
  oblioDocumentId?: string;
  /** Filename pentru atașamentul PDF. Default: "document.pdf" */
  fileName?: string;
}

export interface DocumentEmailSendResult {
  ok: true;
  messageId: string;
  recipientEmail: string;
  oblioDocumentId?: string;
}

export const documentEmailSendProcessor: Processor<
  DocumentEmailSendJobData,
  DocumentEmailSendResult
> = async (job) => {
  const { tenantId, recipientEmail, subject, htmlBody, pdfBase64, oblioDocumentId, fileName } =
    job.data;

  await setSessionTenantId(tenantId);

  // 1. Validare email destinatar
  if (!EMAIL_REGEX.test(recipientEmail)) {
    throw new Error(`i52: email invalid "${recipientEmail}"`);
  }

  // 2. Resend client (RESEND_API_KEY din OpenBao)
  const apiKey = process.env["RESEND_API_KEY"] ?? "";
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "noreply@cerniq.com";
  const resend = new Resend(apiKey);

  // 3. Construiește payload Resend
  type ResendAttachment = { filename: string; content: Buffer };
  const attachments: ResendAttachment[] = [];
  if (pdfBase64) {
    attachments.push({
      filename: fileName ?? "document.pdf",
      content: Buffer.from(pdfBase64, "base64"),
    });
  }

  // 4. Trimite via Resend API
  const result = await resend.emails.send({
    from: fromEmail,
    to: [recipientEmail],
    subject,
    html: htmlBody ?? "<p>Document atașat.</p>",
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.error) {
    throw new Error(`i52: Resend error: ${result.error.message ?? JSON.stringify(result.error)}`);
  }

  const messageId = result.data?.id ?? "";

  console.info(
    `${LOG} tenantId=${tenantId} to=${recipientEmail} ` +
      `oblioDocumentId=${oblioDocumentId ?? "n/a"} messageId=${messageId} ` +
      `hasAttachment=${attachments.length > 0}`,
  );

  return { ok: true, messageId, recipientEmail, oblioDocumentId };
};
