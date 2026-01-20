# ADR-00XX: Provider Abstraction Layer

## Status

**Proposed** — Pending Review

## Context

Cerniq.app integrează multiple provideri externi pentru funcționalități critice:

| Funcționalitate | Provider Actual | Alternativă |
| --------------- | --------------- | ----------- |
| WhatsApp Messaging | TimelinesAI | Twilio, Meta Cloud API |
| Email Transactional | Resend | SendGrid, Mailgun |
| Email Warmup | Instantly.ai | Warmup Inbox |
| Invoicing | Oblio.eu | SmartBill, FGO |
| Payments | Revolut Business | Stripe, PayU |
| Fiscal Data | ANAF + Termene.ro | ListaFirme.ro |

### Problema

Direct coupling cu providerii creează:

- **Vendor lock-in** — Schimbarea providerului necesită refactorizare masivă
- **Testing dificil** — Mock-urile trebuie să cunoască API-ul specific
- **Risc operațional** — Provider down = funcționalitate down

### Referință Technical Debt

Vezi [TD-A01](../architecture/technical-debt-board.md) în Technical Debt Board.

## Decision

Implementăm **Provider Abstraction Layer** folosind Interface Segregation și Dependency Injection.

### Architecture

```text
┌─────────────────────────────────────────────────┐
│                   Workers                       │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ WhatsApp │  │  Email   │  │ Invoice  │       │
│  │  Worker  │  │  Worker  │  │  Worker  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │
└───────┼─────────────┼─────────────┼─────────────┘
        │             │             │
        ▼             ▼             ▼
┌───────────────────────────────────────────────┐
│           Provider Abstraction Layer          │
│                                               │
│  ┌────────────────┐  ┌────────────────┐       │
│  │ IMessaging     │  │ IEmailProvider │       │
│  │ Provider       │  │                │       │
│  └───────┬────────┘  └───────┬────────┘       │
│          │                   │                │
└──────────┼───────────────────┼────────────────┘
           │                   │
     ┌─────┴─────┐       ┌─────┴─────┐
     ▼           ▼       ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Timelines│ │ Twilio  │ │ Resend  │ │SendGrid │
│   AI    │ │(future) │ │         │ │(future) │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### Interfaces

```typescript
// lib/providers/interfaces/messaging.interface.ts
export interface IMessagingProvider {
  readonly name: string;
  
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  getMessageStatus(messageId: string): Promise<MessageStatus>;
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}

export interface SendMessageParams {
  to: string;           // Phone number E.164
  content: string;      // Message text
  mediaUrl?: string;    // Optional media
  metadata?: Record<string, string>;
}

export interface SendMessageResult {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  providerMessageId?: string;
  error?: string;
}
```

```typescript
// lib/providers/interfaces/email.interface.ts
export interface IEmailProvider {
  readonly name: string;
  
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
  getEmailStatus(emailId: string): Promise<EmailStatus>;
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}

export interface SendEmailParams {
  to: string | string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}
```

```typescript
// lib/providers/interfaces/fiscal.interface.ts
export interface IFiscalDataProvider {
  readonly name: string;
  
  getCompanyInfo(cui: string): Promise<CompanyInfo>;
  getTvaStatus(cui: string): Promise<TvaStatus>;
  getFinancialData(cui: string): Promise<FinancialData>;
}
```

### Implementations

```typescript
// lib/providers/implementations/timelines-ai.provider.ts
export class TimelinesAIProvider implements IMessagingProvider {
  readonly name = 'TimelinesAI';
  
  constructor(private readonly config: TimelinesAIConfig) {}
  
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const response = await this.client.post('/messages', {
      phone: params.to,
      message: params.content,
      // TimelinesAI-specific fields
    });
    
    return {
      messageId: generateId(),
      status: 'sent',
      providerMessageId: response.data.id,
    };
  }
  
  // ... other methods
}
```

### Dependency Injection

```typescript
// lib/providers/container.ts
import { Container } from 'inversify';

const container = new Container();

// Register based on environment/config
if (process.env.MESSAGING_PROVIDER === 'timelines') {
  container.bind<IMessagingProvider>('IMessagingProvider')
    .to(TimelinesAIProvider);
} else if (process.env.MESSAGING_PROVIDER === 'twilio') {
  container.bind<IMessagingProvider>('IMessagingProvider')
    .to(TwilioProvider);
}

export { container };
```

### Usage in Workers

```typescript
// workers/outreach/whatsapp-sender.worker.ts
import { inject, injectable } from 'inversify';

@injectable()
export class WhatsAppSenderWorker {
  constructor(
    @inject('IMessagingProvider') 
    private readonly messaging: IMessagingProvider
  ) {}
  
  async process(job: Job) {
    // Provider-agnostic code
    const result = await this.messaging.sendMessage({
      to: job.data.phone,
      content: job.data.message,
    });
    
    return result;
  }
}
```

## Consequences

### Positive

- ✅ **Vendor flexibility** — Schimbarea providerilor fără refactorizare workers
- ✅ **Testing simplificat** — Mock la nivel de interfață
- ✅ **Fallback support** — Implementare ușoară de failover între provideri
- ✅ **A/B testing** — Testare provideri alternativi în paralel

### Negative

- ⚠️ **Overhead inițial** — Efort suplimentar pentru abstracție
- ⚠️ **Lowest common denominator** — Interfața trebuie să suporte features comune
- ⚠️ **Complexity** — DI container, mai multe fișiere

### Mitigations

- Implementare incrementală (un provider la un moment)
- Provider-specific features accesibile prin `providerSpecific` param
- Documentație clară pentru fiecare provider

## Implementation Plan

1. **Phase 1** (Sprint 3): IMessagingProvider + TimelinesAI
2. **Phase 2** (Sprint 4): IEmailProvider + Resend
3. **Phase 3** (Q2): IFiscalDataProvider, IInvoiceProvider
4. **Phase 4** (Q3): Alternative implementations pentru testing

## Related

- [ADR-0051: TimelinesAI WhatsApp](./ADR%20Etapa%202/ADR-0051-TimelinesAI-WhatsApp.md)
- [ADR-0053: Resend Email](./ADR%20Etapa%202/ADR-0053-Resend-Email.md)
- [Technical Debt Board](../architecture/technical-debt-board.md)
- [Circuit Breaker Pattern](../developer-guide/circuit-breaker-pattern.md)

---

**Proposed:** 20 Ianuarie 2026  
**Author:** Software Architect
