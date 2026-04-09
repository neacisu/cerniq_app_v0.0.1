import { getResendClient, type ResendClient } from "../resend/client.js";
import type { ResendEmailRequest, ResendEmailResponse } from "../resend/types.js";
import type { ProviderSendResult, TransactionalEmailProvider } from "./types.js";

export class ResendTransactionalEmailAdapter implements TransactionalEmailProvider {
  constructor(private readonly client: ResendClient) {}

  async sendTransactional(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: { name: string; value: string }[];
  }): Promise<ProviderSendResult> {
    const req: ResendEmailRequest = {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      tags: input.tags,
    };
    const r: ResendEmailResponse = await this.client.sendEmail(req);
    return { messageId: r.id, raw: r as unknown };
  }
}

export function createResendTransactionalEmailProvider(
  client: ResendClient = getResendClient(),
): ResendTransactionalEmailAdapter {
  return new ResendTransactionalEmailAdapter(client);
}
