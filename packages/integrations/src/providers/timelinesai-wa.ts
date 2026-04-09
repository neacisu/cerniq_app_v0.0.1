import { getTimelinesAIClient, type TimelinesAIClient } from "../timelinesai/client.js";
import type { WaProvider, WaWhatsAppSendInput, WaWhatsAppSendResult } from "./types.js";

export class TimelinesAiWaProvider implements WaProvider {
  constructor(private readonly client: TimelinesAIClient) {}

  async sendWhatsApp(input: WaWhatsAppSendInput): Promise<WaWhatsAppSendResult> {
    const r = await this.client.sendMessage({
      phone: input.accountPhone,
      recipient: input.recipientE164,
      message: input.body,
      mediaUrl: input.mediaUrl,
      correlationId: input.correlationId,
    });
    return {
      message_id: r.message_id,
      chat_id: r.chat_id,
      status: r.status,
    };
  }
}

export function createTimelinesAiWaProvider(
  client: TimelinesAIClient = getTimelinesAIClient(),
): TimelinesAiWaProvider {
  return new TimelinesAiWaProvider(client);
}
