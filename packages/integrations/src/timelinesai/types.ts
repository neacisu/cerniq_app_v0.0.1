/**
 * TimelinesAI API Types
 * Source: etapa2-workers-C-whatsapp.md sec. 1.2, 2-5
 */

export interface TimelinesAIConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  rateLimits: {
    sendMessage: number;
    getChatHistory: number;
    getChats: number;
  };
}

// ===== sendMessage =====

export interface SendMessageRequest {
  /** TimelinesAI account phone number (e.g. +40XXXXXXXXX) */
  phone: string;
  /** Recipient phone number in E.164 format */
  recipient: string;
  /** Processed message content (after spintax) */
  message: string;
  /** Optional correlation ID for deduplication */
  correlationId?: string;
}

export interface SendMessageResponse {
  message_id: string;
  chat_id: string;
  chat_url: string;
  status: "SENT" | "QUEUED" | "FAILED";
}

// ===== getChatHistory =====

export interface ChatMessage {
  id: string;
  chat_id: string;
  body: string;
  from_me: boolean;
  author: string;
  timestamp: number;
  type: string;
  media_url?: string;
}

export interface GetChatHistoryRequest {
  chat_id: string;
  limit?: number;
  offset?: number;
}

export interface GetChatHistoryResponse {
  messages: ChatMessage[];
  total: number;
}

// ===== getAccountStatus =====

export interface AccountStatusResponse {
  account_id: string;
  phone: string;
  status: "ACTIVE" | "DISCONNECTED" | "BANNED" | "RECONNECTING";
  name?: string;
  battery?: number;
  connected_at?: string;
}

// ===== getChats =====

export interface Chat {
  chat_id: string;
  contact_phone: string;
  contact_name?: string;
  last_message: string;
  last_message_time: number;
  unread_count: number;
}

export interface GetChatsResponse {
  chats: Chat[];
  total: number;
}

// ===== Webhook =====

export interface TimelinesAIWebhookPayload {
  event: string;
  message_id: string;
  chat_id: string;
  from_me: boolean;
  author: string;
  body: string;
  timestamp: number;
  account_phone: string;
  type: string;
  status?: string;
}

// ===== System Event (ADR-0061) =====

export interface SystemEvent {
  eventId: string;
  source: "timelinesai" | "instantly" | "resend";
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  rawEvent: unknown;
}
