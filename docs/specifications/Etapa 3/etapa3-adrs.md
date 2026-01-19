# CERNIQ.APP — ETAPA 3: ARCHITECTURE DECISION RECORDS
## AI Sales Agent Neuro-Simbolic
### Versiunea 1.0 | 18 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** 20 ADR-uri pentru decizii arhitecturale Etapa 3  
**PREREQUISITE:** Etapa 1 + Etapa 2 complete

---

# CUPRINS ADR-uri

| ADR | Titlu | Status |
|-----|-------|--------|
| ADR-301 | Paradigmă Neuro-Simbolică pentru AI Agent | ACCEPTED |
| ADR-302 | xAI Grok-4 ca LLM Primary | ACCEPTED |
| ADR-303 | Model Context Protocol (MCP) pentru Tool Access | ACCEPTED |
| ADR-304 | Hybrid Search cu pgvector + BM25 + RRF | ACCEPTED |
| ADR-305 | Negotiation Finite State Machine | ACCEPTED |
| ADR-306 | Guardrails Anti-Hallucination obligatorii | ACCEPTED |
| ADR-307 | Oblio.eu pentru facturare | ACCEPTED |
| ADR-308 | e-Factura Safety Net la 4 zile | ACCEPTED |
| ADR-309 | Stock Reservation cu TTL | ACCEPTED |
| ADR-310 | Discount Approval Thresholds | ACCEPTED |
| ADR-311 | Python 3.14 Free-Threading pentru MCP | ACCEPTED |
| ADR-312 | Separare Conversation Store | ACCEPTED |
| ADR-313 | Tool Call Logging Complet | ACCEPTED |
| ADR-314 | Regenerare Response pe Guardrail Fail | ACCEPTED |
| ADR-315 | Sticky Session pentru Negociere | ACCEPTED |
| ADR-316 | PDF Generation cu WeasyPrint | ACCEPTED |
| ADR-317 | Chunking Strategy pentru RAG | ACCEPTED |
| ADR-318 | Embeddings cu OpenAI text-embedding-3-small | ACCEPTED |
| ADR-319 | LLM Fallback Strategy | ACCEPTED |
| ADR-320 | Audit Trail cu Hash Chain | ACCEPTED |

---

## ADR-301: Paradigmă Neuro-Simbolică pentru AI Agent

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026  
**Decision Makers:** Cerniq Architecture Team

### Context

Etapa 3 introduce un agent AI capabil să negocieze și să emită documente fiscale. Riscul principal: halucinațiile LLM pot genera:
- Prețuri incorecte (pierderi financiare)
- Stocuri fantomă (livrări imposibile)
- Date fiscale eronate (probleme legale)

### Decision

Adoptăm paradigma **Neuro-Simbolică** care combină:

1. **Componenta Neurală (LLM):**
   - Înțelegere limbaj natural
   - Generare răspunsuri conversaționale
   - Extracție intenții și entități

2. **Componenta Simbolică (Guardrails):**
   - Validare deterministă preț vs database
   - Verificare stoc în timp real
   - Constrângeri discount pe bază de reguli
   - Validare date fiscale structurate

### Consequences

**Positive:**
- Zero halucinații pentru date critice (preț, stoc, fiscal)
- Trasabilitate completă a deciziilor
- Compliance cu reglementările fiscale românești

**Negative:**
- Complexitate arhitecturală crescută
- Latență adițională pentru validări (~50-100ms per guardrail)
- Cost development mai mare

### Alternatives Considered

1. **LLM-only with prompt engineering:** Rejected - Nu garantează acuratețe 100%
2. **Rule-based chatbot:** Rejected - Lipsă flexibilitate conversațională
3. **Retrieval-only (no generation):** Rejected - UX slabă

---

## ADR-302: xAI Grok-4 ca LLM Primary

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Alegerea providerului LLM pentru agentul de vânzări.

### Decision

**Primary:** xAI Grok-4
- Function calling robust
- Context window 128K tokens
- Cost competitiv (~$0.02/1K tokens)
- Rate limit generos (60 RPM)

**Fallback:** OpenAI GPT-4o
- Activat la Grok unavailable sau rate limit

### Configuration

```typescript
const LLM_CONFIG = {
  primary: {
    provider: 'xai',
    model: 'grok-4',
    maxTokens: 4096,
    temperature: 0.3, // Low pentru precizie
  },
  fallback: {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.3,
  },
  routing: {
    maxRetries: 2,
    fallbackOnError: true,
    fallbackOnRateLimit: true,
  }
};
```

### Consequences

- Dependență de xAI (mitigat cu fallback)
- Cost predictibil pentru bugetare
- Performance consistent pentru negocieri

---

## ADR-303: Model Context Protocol (MCP) pentru Tool Access

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

LLM-ul trebuie să acceseze date din PostgreSQL și să execute acțiuni (creare documente, verificări). Opțiuni:
- Direct SQL generation (risc SQL injection)
- Custom tool API
- Model Context Protocol (MCP)

### Decision

Adoptăm **MCP** (Model Context Protocol) - standard deschis Anthropic:

**Resources (read-only):**
```
product://{sku}          → Golden Record produs
client://{cif}           → Date client din DB
conversation://{lead_id} → Istoric conversație
catalog://category/{cat} → Produse din categorie
```

**Tools (execute):**
```
search_products(query, filters)     → Hybrid Search
check_realtime_stock(sku)           → Verificare stoc ERP
calculate_discount(sku, qty, client)→ Calcul discount maxim
create_proforma(client, products)   → Emite proforma Oblio
convert_to_invoice(proforma_ref)    → Conversie în factură
send_einvoice(invoice_ref)          → Trimite în SPV
validate_client_data(cif, address)  → Validare date fiscale
```

### Implementation

```python
# mcp_server/server.py
from mcp import MCPServer, Resource, Tool

server = MCPServer("cerniq-sales")

@server.resource("product://{sku}")
async def get_product(sku: str) -> dict:
    return await db.gold_products.find_one({"sku": sku})

@server.tool("check_realtime_stock")
async def check_stock(sku: str) -> dict:
    stock = await db.stock_inventory.find_one({"sku": sku})
    return {
        "sku": sku,
        "available": stock.quantity - stock.reserved,
        "reserved": stock.reserved,
        "restock_date": stock.next_restock
    }
```

### Consequences

- Securitate: LLM nu execută SQL direct
- Portabilitate: MCP e standard deschis
- Observabilitate: Toate tool calls sunt logate

---

## ADR-304: Hybrid Search cu pgvector + BM25 + RRF

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Căutarea produselor necesită:
- Semantic search ("laptop ieftin" → găsește produse low-cost)
- Exact match ("RAM 32GB" → găsește exact 32GB, nu 16GB)
- Cod exact ("eroare 503" → găsește exact 503)

### Decision

**Hybrid Search** combinând:

1. **Vector Search (pgvector):** Pentru similaritate semantică
2. **BM25 (pg_textsearch):** Pentru match exact keywords
3. **RRF (Reciprocal Rank Fusion):** Pentru combinare rezultate

### SQL Function

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(1536),
    match_limit INT DEFAULT 10,
    vector_weight FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    product_id UUID,
    sku VARCHAR,
    name VARCHAR,
    combined_score FLOAT,
    vector_rank INT,
    bm25_rank INT
) AS $$
WITH vector_results AS (
    SELECT 
        id, sku, name,
        1 - (embedding <=> query_embedding) AS similarity,
        ROW_NUMBER() OVER (ORDER BY embedding <=> query_embedding) AS rank
    FROM gold_products
    WHERE embedding <=> query_embedding < 0.8
    LIMIT match_limit * 2
),
bm25_results AS (
    SELECT 
        id, sku, name,
        ts_rank(search_vector, plainto_tsquery('romanian', query_text)) AS bm25_score,
        ROW_NUMBER() OVER (ORDER BY ts_rank(search_vector, plainto_tsquery('romanian', query_text)) DESC) AS rank
    FROM gold_products
    WHERE search_vector @@ plainto_tsquery('romanian', query_text)
    LIMIT match_limit * 2
),
combined AS (
    SELECT 
        COALESCE(v.id, b.id) AS product_id,
        COALESCE(v.sku, b.sku) AS sku,
        COALESCE(v.name, b.name) AS name,
        COALESCE(1.0 / (60 + v.rank), 0) * vector_weight +
        COALESCE(1.0 / (60 + b.rank), 0) * (1 - vector_weight) AS rrf_score,
        v.rank AS vector_rank,
        b.rank AS bm25_rank
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
)
SELECT product_id, sku, name, rrf_score, vector_rank, bm25_rank
FROM combined
ORDER BY rrf_score DESC
LIMIT match_limit;
$$ LANGUAGE sql STABLE;
```

### Consequences

- Accuracy: Combină avantajele ambelor metode
- Performance: <50ms cu indexare corectă
- Flexibility: Weight ajustabil per use case

---

## ADR-305: Negotiation Finite State Machine

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Negocierile trebuie să urmeze un flux logic. AI nu trebuie să:
- Sară peste etape (ex: emit proforma fără verificare stoc)
- Ofere discount în faza de discovery
- Emită factură fără proforma acceptată

### Decision

**FSM (Finite State Machine)** cu stări și tranziții validate:

```typescript
const NEGOTIATION_STATES = {
  DISCOVERY: {
    allowedTools: ['search_products', 'get_catalog'],
    nextStates: ['PROPOSAL', 'DEAD'],
  },
  PROPOSAL: {
    allowedTools: ['get_product_details', 'check_realtime_stock'],
    nextStates: ['NEGOTIATION', 'DEAD'],
  },
  NEGOTIATION: {
    allowedTools: ['calculate_discount', 'check_realtime_stock', 'get_product_details'],
    nextStates: ['CLOSING', 'DEAD'],
  },
  CLOSING: {
    allowedTools: ['validate_client_data', 'create_proforma'],
    nextStates: ['PROFORMA_SENT', 'NEGOTIATION', 'DEAD'],
  },
  PROFORMA_SENT: {
    allowedTools: ['track_proforma_status', 'resend_proforma'],
    nextStates: ['INVOICED', 'NEGOTIATION', 'DEAD'],
  },
  INVOICED: {
    allowedTools: ['convert_to_invoice', 'send_einvoice', 'track_payment'],
    nextStates: ['PAID', 'DEAD'],
  },
  PAID: {
    allowedTools: [], // Final state
    nextStates: [],
  },
  DEAD: {
    allowedTools: [], // Can be resurrected
    nextStates: ['DISCOVERY'],
  },
};
```

### Enforcement

```typescript
async function validateToolCall(
  negotiationId: string,
  toolName: string
): Promise<boolean> {
  const negotiation = await db.negotiations.findById(negotiationId);
  const currentState = NEGOTIATION_STATES[negotiation.state];
  
  if (!currentState.allowedTools.includes(toolName)) {
    throw new InvalidToolCallError(
      `Tool '${toolName}' not allowed in state '${negotiation.state}'`
    );
  }
  return true;
}
```

### Consequences

- Previne erori de flux
- Audit trail complet al tranzițiilor
- Ușor de extins cu noi stări

---

## ADR-306: Guardrails Anti-Hallucination Obligatorii

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

LLM-ul poate genera informații false. În context comercial, consecințele sunt severe.

### Decision

**5 Guardrails obligatorii** rulează după fiecare generare AI:

| Guardrail | Verificare | Acțiune pe Fail |
|-----------|-----------|-----------------|
| PRICE_GUARD | preț_oferit >= min_price din DB | Regenerare cu preț corect |
| STOCK_GUARD | stoc > 0 pentru orice produs menționat | Regenerare cu "indisponibil" |
| DISCOUNT_GUARD | discount <= max_discount_aprobat | Regenerare cu discount maxim |
| SKU_GUARD | toate SKU-urile există în catalog | Regenerare fără SKU-uri false |
| FISCAL_GUARD | CUI valid, adresă completă | Block și request date corecte |

### Implementation

```typescript
interface GuardrailResult {
  passed: boolean;
  violations: Violation[];
  correctedResponse?: string;
}

async function runGuardrails(
  aiResponse: AIResponse,
  context: NegotiationContext
): Promise<GuardrailResult> {
  const violations: Violation[] = [];
  
  // PRICE_GUARD
  for (const price of extractPrices(aiResponse.content)) {
    const product = await db.products.findBySku(price.sku);
    if (product && price.value < product.minPrice) {
      violations.push({
        type: 'PRICE_BELOW_MINIMUM',
        sku: price.sku,
        mentioned: price.value,
        minimum: product.minPrice,
      });
    }
  }
  
  // STOCK_GUARD
  for (const sku of extractSkus(aiResponse.content)) {
    const stock = await db.stock.getAvailable(sku);
    if (stock <= 0) {
      violations.push({
        type: 'OUT_OF_STOCK',
        sku,
        available: stock,
      });
    }
  }
  
  // ... alte guardrails
  
  return {
    passed: violations.length === 0,
    violations,
    correctedResponse: violations.length > 0 
      ? await regenerateWithCorrections(aiResponse, violations) 
      : undefined,
  };
}
```

### Consequences

- Zero halucinații pentru date critice
- Latență adițională (~100ms total)
- Complexitate în handling regenerări

---

## ADR-307: Oblio.eu pentru Facturare

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Sistemul trebuie să emită documente fiscale valide în România:
- Proforma (ofertă)
- Factură fiscală
- Integrare cu e-Factura ANAF

### Decision

**Oblio.eu** ca provider facturare:
- API REST complet documentat
- Suport nativ e-Factura
- Generare PDF automată
- Plan gratuit cu abonament (60 req/min)

### API Integration

```typescript
// services/oblio/client.ts
import { OblioClient } from '@oblio/sdk';

const oblio = new OblioClient({
  email: process.env.OBLIO_EMAIL,
  apiSecret: process.env.OBLIO_API_SECRET,
  cif: process.env.COMPANY_CIF,
});

export async function createProforma(data: ProformaData): Promise<OblioDocument> {
  return oblio.createDoc({
    seriesName: 'PRF',
    type: 'proforma',
    client: {
      cif: data.clientCif,
      name: data.clientName,
      address: data.clientAddress,
      county: data.clientCounty,
      country: 'Romania',
    },
    products: data.products.map(p => ({
      name: p.name,
      code: p.sku,
      quantity: p.quantity,
      price: p.unitPrice,
      vatPercent: p.vatPercent || 19,
      unit: p.unit || 'buc',
    })),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: addDays(new Date(), 7).toISOString().split('T')[0],
    observations: data.notes,
  });
}

export async function convertToInvoice(proformaRef: string): Promise<OblioDocument> {
  return oblio.convertProformaToInvoice({
    proforma: proformaRef,
    seriesName: 'FCT',
    sendToEinvoice: true, // Auto-send to SPV
  });
}
```

### Consequences

- Compliance fiscal asigurat
- Reducere cod custom pentru PDF
- Dependență de serviciu extern (mitigat cu retry)

---

## ADR-308: e-Factura Safety Net la 4 Zile

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Legislația românească: facturile trebuie transmise în SPV în **5 zile calendaristice**. Penalizare: amendă 15-20% din valoarea facturii.

### Decision

**Safety Net** implementat cu cron job zilnic la 09:00:

```typescript
// workers/einvoice/deadline-monitor.worker.ts

const SAFETY_MARGIN_DAYS = 1; // 5 - 1 = 4 zile

export async function processDeadlineMonitor(): Promise<void> {
  const cutoffDate = subDays(new Date(), 4);
  
  const overdueInvoices = await db.oblioDocuments.findMany({
    where: {
      type: 'invoice',
      einvoiceSent: false,
      issuedAt: { lt: cutoffDate },
    },
  });
  
  for (const invoice of overdueInvoices) {
    const daysOld = differenceInDays(new Date(), invoice.issuedAt);
    
    if (daysOld >= 5) {
      // CRITICAL: Deja în risc de amendă
      await sendUrgentAlert(invoice, 'DEADLINE_BREACHED');
      await forceEinvoiceSubmission(invoice);
    } else if (daysOld >= 4) {
      // WARNING: Ultimul moment
      await sendWarningAlert(invoice, 'DEADLINE_IMMINENT');
      await queueEinvoiceSubmission(invoice, { priority: 'urgent' });
    }
  }
}
```

### Cron Schedule

```yaml
# docker-compose.yaml
einvoice-monitor:
  schedule: "0 9 * * *"  # Zilnic la 09:00
  command: npm run worker:einvoice:deadline-monitor
```

### Consequences

- Prevenire amenzi fiscale
- Alertare proactivă
- Compliance automat

---

## ADR-309: Stock Reservation cu TTL

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Când AI oferă un produs, trebuie garantat că stocul există. Între ofertă și acceptare pot trece ore/zile.

### Decision

**Rezervare temporară** cu TTL (Time-To-Live):

```typescript
// services/stock/reservation.ts

const RESERVATION_TTL_MINUTES = {
  PROPOSAL: 30,      // 30 min în faza de propunere
  NEGOTIATION: 120,  // 2 ore în negociere
  CLOSING: 1440,     // 24 ore după emitere proforma
};

export async function reserveStock(
  sku: string,
  quantity: number,
  negotiationId: string,
  stage: NegotiationStage
): Promise<Reservation> {
  const ttlMinutes = RESERVATION_TTL_MINUTES[stage];
  
  return db.stockReservations.create({
    sku,
    quantity,
    negotiationId,
    expiresAt: addMinutes(new Date(), ttlMinutes),
    status: 'active',
  });
}

// Cleanup cron - la fiecare 5 minute
export async function cleanupExpiredReservations(): Promise<number> {
  const result = await db.stockReservations.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
      status: 'active',
    },
  });
  return result.count;
}
```

### Stock Check Integration

```typescript
export async function getAvailableStock(sku: string): Promise<number> {
  const inventory = await db.stockInventory.findUnique({ where: { sku } });
  const reserved = await db.stockReservations.aggregate({
    where: { sku, status: 'active', expiresAt: { gt: new Date() } },
    _sum: { quantity: true },
  });
  
  return inventory.quantity - (reserved._sum.quantity || 0);
}
```

### Consequences

- Previne overselling
- Eliberare automată stoc nefolosit
- Vizibilitate rezervări în progres

---

## ADR-310: Discount Approval Thresholds

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Discounturile mari trebuie aprobate de management. Politică:
- ≤15%: Auto-approved
- 15-30%: Manager approval
- >30%: Director approval

### Decision

**HITL Workflow** pentru discounturi peste threshold:

```typescript
// config/pricing.ts
export const DISCOUNT_POLICY = {
  AUTO_APPROVE_MAX: 15,
  MANAGER_APPROVE_MAX: 30,
  DIRECTOR_APPROVE_MAX: 50,
  ABSOLUTE_MAX: 50, // Never exceed 50%
};

// workers/pricing/discount-request.worker.ts
export async function processDiscountRequest(
  data: DiscountRequestData
): Promise<DiscountResult> {
  const { negotiationId, requestedDiscount, productId, reason } = data;
  
  if (requestedDiscount <= DISCOUNT_POLICY.AUTO_APPROVE_MAX) {
    return {
      approved: true,
      approvedDiscount: requestedDiscount,
      approvalType: 'AUTO',
    };
  }
  
  if (requestedDiscount > DISCOUNT_POLICY.ABSOLUTE_MAX) {
    return {
      approved: false,
      rejectionReason: `Discount ${requestedDiscount}% exceeds maximum allowed ${DISCOUNT_POLICY.ABSOLUTE_MAX}%`,
    };
  }
  
  // Create HITL approval task
  const approverRole = requestedDiscount <= DISCOUNT_POLICY.MANAGER_APPROVE_MAX
    ? 'manager'
    : 'director';
  
  await db.approvalTasks.create({
    type: 'DISCOUNT_APPROVAL',
    entityType: 'negotiation',
    entityId: negotiationId,
    payload: {
      productId,
      requestedDiscount,
      reason,
      currentState: await getNegotiationState(negotiationId),
    },
    requiredRole: approverRole,
    slaHours: approverRole === 'manager' ? 4 : 24,
    priority: requestedDiscount > 25 ? 'HIGH' : 'MEDIUM',
  });
  
  return {
    approved: false,
    pendingApproval: true,
    approverRole,
  };
}
```

### Consequences

- Control financiar pe discounturi
- Audit trail pentru toate aprobările
- Flexibilitate în escalare

---

## ADR-311: Python 3.14 Free-Threading pentru MCP

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

MCP Server necesită:
- Concurrency ridicată pentru multiple sesiuni AI
- Integrare cu biblioteci async Python
- Performance pentru embedding generation

### Decision

**Python 3.14.2** cu **Free-Threading** enabled (fără GIL):

```dockerfile
# Dockerfile.mcp
FROM python:3.14.2-slim

# Enable free-threading
ENV PYTHON_GIL=0

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mcp_server/ ./mcp_server/
CMD ["python", "-X", "gil=0", "-m", "mcp_server.main"]
```

### Benefits

- True parallelism pentru CPU-bound tasks (embedding computation)
- Shared memory între threads
- Compatibilitate cu biblioteci existente

### Consequences

- Necesită Python 3.14+ (released Q4 2025)
- Memory management mai atent
- Debugging mai complex

---

## ADR-312: Separare Conversation Store

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Conversațiile AI pot deveni foarte mari (100+ mesaje). Stocarea în tabelul principal ar afecta performanța.

### Decision

**Separare** în tabele dedicate:

```sql
-- Tabel principal (metadata)
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    negotiation_id UUID REFERENCES gold_negotiations(id),
    lead_id UUID NOT NULL,
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    tool_call_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    
    -- State
    mcp_session_id VARCHAR(100),
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesaje (append-only)
CREATE TABLE ai_conversation_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES ai_conversations(id),
    
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT NOT NULL,
    
    -- Tool call info
    tool_calls JSONB, -- Pentru assistant
    tool_call_id VARCHAR(100), -- Pentru tool responses
    
    -- Metadata
    tokens_used INTEGER,
    latency_ms INTEGER,
    model_used VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru query conversație
CREATE INDEX idx_conv_messages_conversation 
ON ai_conversation_messages(conversation_id, created_at DESC);
```

### Consequences

- Query-uri rapide pe metadata
- Scalabilitate pentru conversații lungi
- Audit trail complet

---

## ADR-313: Tool Call Logging Complet

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Pentru debugging, audit și îmbunătățire AI, toate tool calls trebuie logate.

### Decision

**Logging complet** pentru fiecare tool call:

```sql
CREATE TABLE ai_tool_calls (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES ai_conversations(id),
    negotiation_id UUID,
    
    -- Tool info
    tool_name VARCHAR(100) NOT NULL,
    tool_input JSONB NOT NULL,
    tool_output JSONB,
    
    -- Execution
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, error
    error_message TEXT,
    
    -- Guardrail results
    guardrail_results JSONB,
    guardrail_passed BOOLEAN,
    
    -- Cost tracking
    tokens_used INTEGER,
    estimated_cost_usd DECIMAL(10,6),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_calls_conversation ON ai_tool_calls(conversation_id);
CREATE INDEX idx_tool_calls_negotiation ON ai_tool_calls(negotiation_id);
CREATE INDEX idx_tool_calls_tool_name ON ai_tool_calls(tool_name, created_at DESC);
```

### Implementation

```typescript
// middleware/tool-logger.ts
export async function withToolLogging<T>(
  toolName: string,
  input: unknown,
  context: { conversationId: string; negotiationId?: string },
  execute: () => Promise<T>
): Promise<T> {
  const toolCall = await db.aiToolCalls.create({
    toolName,
    toolInput: input,
    conversationId: context.conversationId,
    negotiationId: context.negotiationId,
    startedAt: new Date(),
    status: 'pending',
  });
  
  try {
    const result = await execute();
    
    await db.aiToolCalls.update({
      where: { id: toolCall.id },
      data: {
        toolOutput: result,
        completedAt: new Date(),
        durationMs: Date.now() - toolCall.startedAt.getTime(),
        status: 'success',
      },
    });
    
    return result;
  } catch (error) {
    await db.aiToolCalls.update({
      where: { id: toolCall.id },
      data: {
        completedAt: new Date(),
        durationMs: Date.now() - toolCall.startedAt.getTime(),
        status: 'error',
        errorMessage: error.message,
      },
    });
    throw error;
  }
}
```

### Consequences

- Debugging facilitat
- Analytics pe tool usage
- Cost tracking precis

---

## ADR-314: Regenerare Response pe Guardrail Fail

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Când un guardrail eșuează, avem opțiuni:
1. Block și escalare la human
2. Regenerare automată cu feedback corectiv
3. Modificare manuală a response-ului

### Decision

**Regenerare automată** cu maximum 3 încercări:

```typescript
// services/ai/agent-executor.ts
const MAX_REGENERATION_ATTEMPTS = 3;

export async function executeAgentWithGuardrails(
  context: AgentContext
): Promise<AgentResponse> {
  let attempts = 0;
  let lastViolations: Violation[] = [];
  
  while (attempts < MAX_REGENERATION_ATTEMPTS) {
    attempts++;
    
    // Generate response
    const response = await generateAIResponse(context, {
      previousViolations: lastViolations,
    });
    
    // Run guardrails
    const guardrailResult = await runGuardrails(response, context);
    
    if (guardrailResult.passed) {
      return {
        ...response,
        guardrailAttempts: attempts,
        guardrailsPassed: true,
      };
    }
    
    // Log violation for next attempt
    lastViolations = guardrailResult.violations;
    
    logger.warn({
      attempt: attempts,
      violations: lastViolations,
    }, 'Guardrail failed, regenerating');
  }
  
  // Max attempts reached - escalate to human
  await escalateToHuman(context, {
    reason: 'MAX_REGENERATION_ATTEMPTS',
    violations: lastViolations,
  });
  
  return {
    content: 'Colegul meu vă va contacta în scurt timp pentru a vă ajuta.',
    handedToHuman: true,
    guardrailAttempts: attempts,
  };
}
```

### Feedback în Prompt

```typescript
function buildRegenerationPrompt(
  originalPrompt: string,
  violations: Violation[]
): string {
  const violationFeedback = violations.map(v => {
    switch (v.type) {
      case 'PRICE_BELOW_MINIMUM':
        return `CORECȚIE: Prețul pentru ${v.sku} trebuie să fie minim ${v.minimum} RON, nu ${v.mentioned} RON.`;
      case 'OUT_OF_STOCK':
        return `CORECȚIE: Produsul ${v.sku} nu este disponibil în stoc. NU îl menționa ca disponibil.`;
      case 'DISCOUNT_EXCEEDED':
        return `CORECȚIE: Discountul maxim pentru ${v.sku} este ${v.maximum}%, nu ${v.mentioned}%.`;
      default:
        return `CORECȚIE: ${v.message}`;
    }
  }).join('\n');
  
  return `${originalPrompt}

IMPORTANT - CORECȚII OBLIGATORII:
${violationFeedback}

Regenerează răspunsul respectând corecțiile de mai sus.`;
}
```

### Consequences

- Reducere intervenții manuale
- UX mai bun (răspuns corect automat)
- Cost LLM crescut pentru regenerări

---

## ADR-315: Sticky Session pentru Negociere

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Pentru continuitate conversațională:
- Același număr WhatsApp trebuie folosit pe toată negocierea
- Contextul MCP trebuie păstrat între mesaje
- Istoricul trebuie încărcat corect

### Decision

**Sticky Session** bazat pe negotiation_id:

```typescript
// services/session/sticky-manager.ts

interface StickySession {
  negotiationId: string;
  leadId: string;
  assignedPhoneId: string;
  mcpSessionId: string;
  lastActivityAt: Date;
}

export async function getOrCreateSession(
  leadId: string
): Promise<StickySession> {
  // Check existing negotiation
  let negotiation = await db.negotiations.findFirst({
    where: {
      leadId,
      state: { notIn: ['PAID', 'DEAD'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!negotiation) {
    // Get assigned phone from Etapa 2
    const journey = await db.goldLeadJourney.findUnique({
      where: { leadId },
    });
    
    negotiation = await db.negotiations.create({
      leadId,
      assignedPhoneId: journey.assignedPhoneId,
      state: 'DISCOVERY',
    });
  }
  
  // Get or create MCP session
  let mcpSessionId = await redis.get(`mcp:session:${negotiation.id}`);
  if (!mcpSessionId) {
    mcpSessionId = await mcpClient.createSession({
      negotiationId: negotiation.id,
      leadId,
    });
    await redis.setex(`mcp:session:${negotiation.id}`, 1800, mcpSessionId); // 30 min TTL
  }
  
  return {
    negotiationId: negotiation.id,
    leadId,
    assignedPhoneId: negotiation.assignedPhoneId,
    mcpSessionId,
    lastActivityAt: new Date(),
  };
}
```

### Consequences

- Continuitate conversațională garantată
- Context MCP păstrat
- Ușor de debug per sesiune

---

## ADR-316: PDF Generation cu WeasyPrint

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Generare PDF pentru:
- Oferte comerciale
- Backup proforma/factură (în plus față de Oblio)
- Rapoarte

### Decision

**WeasyPrint** (Python) cu template-uri Jinja2:

```python
# services/pdf/generator.py
from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('templates'))

async def generate_offer_pdf(data: OfferData) -> bytes:
    template = env.get_template('offer.html')
    html_content = template.render(
        company=data.company,
        client=data.client,
        products=data.products,
        totals=data.totals,
        terms=data.terms,
        generated_at=datetime.now(),
    )
    
    css = CSS(filename='templates/offer.css')
    pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[css])
    
    return pdf_bytes
```

### Template Structure

```html
<!-- templates/offer.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ofertă Comercială {{ offer_number }}</title>
</head>
<body>
    <header>
        <img src="{{ company.logo_url }}" alt="Logo">
        <h1>OFERTĂ COMERCIALĂ</h1>
        <p>Nr. {{ offer_number }} / {{ date }}</p>
    </header>
    
    <section class="client">
        <h2>Client</h2>
        <p>{{ client.name }}</p>
        <p>CUI: {{ client.cif }}</p>
        <p>{{ client.address }}</p>
    </section>
    
    <section class="products">
        <table>
            <thead>
                <tr>
                    <th>Produs</th>
                    <th>Cantitate</th>
                    <th>Preț unitar</th>
                    <th>Discount</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {% for p in products %}
                <tr>
                    <td>{{ p.name }}</td>
                    <td>{{ p.quantity }} {{ p.unit }}</td>
                    <td>{{ p.unit_price | format_currency }}</td>
                    <td>{{ p.discount }}%</td>
                    <td>{{ p.total | format_currency }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </section>
    
    <section class="totals">
        <p>Subtotal: {{ totals.subtotal | format_currency }}</p>
        <p>TVA ({{ totals.vat_percent }}%): {{ totals.vat | format_currency }}</p>
        <p class="total">TOTAL: {{ totals.total | format_currency }}</p>
    </section>
    
    <footer>
        <p>Valabilitate ofertă: {{ validity_days }} zile</p>
        <p>{{ company.name }} | {{ company.address }} | CUI: {{ company.cif }}</p>
    </footer>
</body>
</html>
```

### Consequences

- Control complet asupra design
- Flexibilitate template-uri
- Dependență Python (deja avem pentru MCP)

---

## ADR-317: Chunking Strategy pentru RAG

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Produsele au descrieri lungi. Pentru RAG eficient, trebuie chunk-uri optimale.

### Decision

**Semantic Chunking** cu:
- Chunk size: 500-800 tokens
- Overlap: 100 tokens
- Separare pe secțiuni logice

```python
# services/rag/chunker.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

CHUNK_CONFIG = {
    'chunk_size': 600,
    'chunk_overlap': 100,
    'separators': ['\n## ', '\n### ', '\n\n', '\n', '. ', ' '],
    'length_function': tiktoken_len,
}

def chunk_product_description(product: Product) -> List[Chunk]:
    # Combine all text fields
    full_text = f"""
    # {product.name}
    
    ## Descriere
    {product.description}
    
    ## Specificații Tehnice
    {format_specs(product.specifications)}
    
    ## Utilizare
    {product.usage_instructions}
    
    ## Compatibilitate
    {product.compatibility_notes}
    """
    
    splitter = RecursiveCharacterTextSplitter(**CHUNK_CONFIG)
    chunks = splitter.split_text(full_text)
    
    return [
        Chunk(
            product_id=product.id,
            chunk_index=i,
            content=chunk,
            token_count=tiktoken_len(chunk),
        )
        for i, chunk in enumerate(chunks)
    ]
```

### Consequences

- Retrieval precis
- Context suficient în fiecare chunk
- Storage mai mare (overlap)

---

## ADR-318: Embeddings cu OpenAI text-embedding-3-small

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Alegere model embedding pentru vectorii de căutare.

### Decision

**OpenAI text-embedding-3-small:**
- 1536 dimensiuni
- Cost foarte mic ($0.0001/1K tokens)
- Rate limit generos (3000 RPM)
- Calitate suficientă pentru product search

```typescript
// services/embeddings/generator.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });
  
  return response.data[0].embedding;
}

export async function generateBatchEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
    encoding_format: 'float',
  });
  
  return response.data.map(d => d.embedding);
}
```

### Consequences

- Cost predictibil și mic
- Calitate adecvată pentru use case
- Vendor lock-in (mitigat: embedding-uri pot fi regenerate)

---

## ADR-319: LLM Fallback Strategy

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Dependența de un singur provider LLM e riscantă (downtime, rate limits).

### Decision

**Fallback Chain:**

```typescript
// services/llm/router.ts

const LLM_CHAIN = [
  { provider: 'xai', model: 'grok-4', priority: 1 },
  { provider: 'openai', model: 'gpt-4o', priority: 2 },
  { provider: 'anthropic', model: 'claude-3-sonnet', priority: 3 },
];

export async function callLLMWithFallback(
  request: LLMRequest
): Promise<LLMResponse> {
  let lastError: Error | null = null;
  
  for (const llm of LLM_CHAIN) {
    try {
      const response = await callProvider(llm.provider, llm.model, request);
      
      // Log which provider was used
      metrics.increment('llm.calls', {
        provider: llm.provider,
        model: llm.model,
        fallback: llm.priority > 1,
      });
      
      return {
        ...response,
        provider: llm.provider,
        model: llm.model,
      };
    } catch (error) {
      lastError = error;
      
      // Log error
      logger.warn({
        provider: llm.provider,
        error: error.message,
      }, 'LLM provider failed, trying fallback');
      
      // Check if should retry
      if (!isRetryableError(error)) {
        throw error;
      }
    }
  }
  
  throw new Error(`All LLM providers failed. Last error: ${lastError?.message}`);
}
```

### Consequences

- High availability
- Cost variabil (fallback-uri pot fi mai scumpe)
- Complexitate în prompt compatibility

---

## ADR-320: Audit Trail cu Hash Chain

**Status:** ACCEPTED  
**Data:** 18 Ianuarie 2026

### Context

Pentru compliance și non-repudiation, acțiunile fiscale trebuie să aibă audit trail tamper-evident.

### Decision

**Hash Chain** pentru audit events critice:

```sql
CREATE TABLE audit_fiscal_events (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Event
    event_type VARCHAR(50) NOT NULL, -- PROFORMA_CREATED, INVOICE_ISSUED, EINVOICE_SENT
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Actor
    actor_type VARCHAR(20) NOT NULL, -- 'user', 'system', 'ai_agent'
    actor_id UUID,
    
    -- Payload
    event_data JSONB NOT NULL,
    
    -- Hash chain
    event_hash VARCHAR(64) NOT NULL, -- SHA256 of this event
    previous_hash VARCHAR(64), -- Hash of previous event (chain)
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to compute hash
CREATE OR REPLACE FUNCTION compute_audit_hash(
    event_type TEXT,
    entity_id UUID,
    event_data JSONB,
    previous_hash TEXT,
    created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        sha256(
            (event_type || entity_id::TEXT || event_data::TEXT || 
             COALESCE(previous_hash, 'GENESIS') || created_at::TEXT)::BYTEA
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Implementation

```typescript
// services/audit/fiscal-logger.ts

export async function logFiscalEvent(event: FiscalEvent): Promise<void> {
  // Get previous hash
  const lastEvent = await db.auditFiscalEvents.findFirst({
    where: { tenantId: event.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  
  const previousHash = lastEvent?.eventHash || null;
  
  // Compute hash
  const eventHash = await computeHash({
    eventType: event.eventType,
    entityId: event.entityId,
    eventData: event.eventData,
    previousHash,
    createdAt: new Date(),
  });
  
  await db.auditFiscalEvents.create({
    ...event,
    eventHash,
    previousHash,
  });
}
```

### Consequences

- Tamper-evident audit trail
- Compliance cu reglementări fiscale
- Detectare alterări

---

**Document generat:** 18 Ianuarie 2026  
**Total ADR-uri:** 20  
**Status:** All ACCEPTED  
**Conformitate:** Master Spec v1.2
