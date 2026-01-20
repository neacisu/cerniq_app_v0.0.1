# Etapa 3 - Standarde de Dezvoltare

## AI Sales Agent - Coding Standards, Conventions și Best Practices

**Versiune:** 1.0.0
**Ultima actualizare:** 2026-01-19
**Autor:** Cerniq Development Team
**Clasificare:** Document Tehnic Intern

---

## Cuprins

1. [Introducere și Scopul Standardelor](#1-introducere-și-scopul-standardelor)
2. [Standarde TypeScript/JavaScript](#2-standarde-typescriptjavascript)
3. [Standarde React și Frontend](#3-standarde-react-și-frontend)
4. [Standarde Backend și API](#4-standarde-backend-și-api)
5. [Standarde Baze de Date](#5-standarde-baze-de-date)
6. [Standarde Workers și Queue Processing](#6-standarde-workers-și-queue-processing)
7. [Standarde AI/LLM Integration](#7-standarde-aillm-integration)
8. [Standarde Logging și Observability](#8-standarde-logging-și-observability)
9. [Standarde Securitate](#9-standarde-securitate)
10. [Standarde Testing](#10-standarde-testing)
11. [Standarde Documentație](#11-standarde-documentație)
12. [Standarde Git și Version Control](#12-standarde-git-și-version-control)
13. [Code Review Guidelines](#13-code-review-guidelines)
14. [Referințe și Resurse](#14-referințe-și-resurse)

---

## 1. Introducere și Scopul Standardelor

### 1.1 Scopul Documentului

Acest document stabilește standardele de dezvoltare pentru Etapa 3 (AI Sales Agent) a platformei Cerniq. Respectarea acestor standarde asigură:

- **Consistență**: Cod uniform în întreaga bază de cod
- **Calitate**: Reducerea bug-urilor și îmbunătățirea mentenanței
- **Colaborare**: Facilitarea code review-ului și onboarding-ului
- **Scalabilitate**: Arhitectură care suportă creșterea
- **Securitate**: Protecția datelor și conformitate GDPR

### 1.2 Audiența Țintă

- Dezvoltatori Frontend și Backend
- DevOps Engineers
- AI/ML Engineers
- QA Engineers
- Technical Leads

### 1.3 Tehnologii Acoperite

```yaml
frontend:
  language: TypeScript 5.7+
  framework: React 19.2.3
  styling: Tailwind CSS v4
  components: shadcn/ui
  state: TanStack Query v5, Zustand v5
  
backend:
  language: TypeScript 5.7+ / Node.js v24.12.0 LTS
  framework: Fastify v5.6.2
  orm: Drizzle ORM v0.44.0
  
database:
  primary: PostgreSQL 18.1
  cache: Redis 8.4.0
  queue: BullMQ v5.66.5
  
ai:
  primary: Anthropic Claude 3.5 Sonnet
  fallback: OpenAI GPT-4o, Google Gemini 2.0
  
testing:
  unit: Vitest v3.0
  e2e: Playwright v1.50
  load: k6 v0.56
```

### 1.4 Convenții Document

- `✅ DO` - Practică recomandată
- `❌ DON'T` - Practică interzisă
- `⚠️ CAUTION` - Atenție specială necesară
- `📋 REQUIRED` - Obligatoriu

---

## 2. Standarde TypeScript/JavaScript

### 2.1 Configurare TypeScript

```json
// tsconfig.json - Base configuration
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/utils/*": ["./utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2.2 Naming Conventions

```typescript
// ✅ DO: Use descriptive, meaningful names

// Files: kebab-case for all files
// negotiation-fsm.service.ts
// product-knowledge.worker.ts
// ai-conversation.types.ts

// Classes: PascalCase
class NegotiationStateMachine {}
class AIConversationHandler {}

// Interfaces/Types: PascalCase with descriptive names
interface Negotiation {
  id: string;
  currentState: NegotiationState;
  contactId: string;
}

// NO 'I' prefix for interfaces
// ❌ DON'T: interface INegotiation
// ✅ DO: interface Negotiation

// Type aliases: PascalCase
type NegotiationState = 
  | 'initial'
  | 'needs_analysis'
  | 'product_matching'
  | 'pricing'
  | 'proposal_sent'
  | 'negotiating'
  | 'agreement'
  | 'closed_won'
  | 'closed_lost';

// Enums: PascalCase with PascalCase members
enum Priority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

// Constants: SCREAMING_SNAKE_CASE for true constants
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 30_000;
const LLM_MODELS = {
  PRIMARY: 'claude-3-5-sonnet-20241022',
  FALLBACK: 'gpt-4o-mini',
} as const;

// Functions/Methods: camelCase with verb prefix
function calculateDiscountedPrice(price: number, discount: number): number {}
async function fetchContactByEmail(email: string): Promise<Contact | null> {}
function isValidCUI(cui: string): boolean {}

// Variables: camelCase
const currentNegotiation = await getNegotiation(id);
const formattedPrice = formatCurrency(price, 'RON');

// Boolean variables: use 'is', 'has', 'should', 'can' prefixes
const isActive = true;
const hasPermission = checkPermission(user, 'edit');
const shouldRetry = attempts < MAX_RETRY_ATTEMPTS;
const canApprove = user.role === 'admin';

// Private class members: use # prefix (ES2022 private fields)
class ConversationManager {
  #llmClient: LLMClient;
  #conversations: Map<string, Conversation>;
  
  #processMessage(message: string): void {}
}

// React components: PascalCase
function NegotiationCard({ negotiation }: NegotiationCardProps) {}
function ConversationThread({ messages }: ConversationThreadProps) {}
```

### 2.3 Type Definitions

```typescript
// ✅ DO: Use explicit return types

// Function return types - always explicit
function calculateTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

// Async function return types
async function fetchNegotiation(id: string): Promise<Negotiation | null> {
  // ...
}

// Never use 'any' - use 'unknown' if type is truly unknown
// ❌ DON'T
function processData(data: any) {}

// ✅ DO
function processData(data: unknown): Result {
  if (isValidInput(data)) {
    // type guard narrows the type
  }
}

// Use type guards for runtime type checking
function isNegotiation(value: unknown): value is Negotiation {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'currentState' in value &&
    typeof (value as Negotiation).id === 'string'
  );
}

// Prefer interfaces for objects that will be extended
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Negotiation extends BaseEntity {
  currentState: NegotiationState;
  contactId: string;
}

// Use type for unions, intersections, and complex types
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

type NegotiationEvent = 
  | { type: 'MESSAGE_RECEIVED'; payload: Message }
  | { type: 'STATE_CHANGED'; payload: { from: NegotiationState; to: NegotiationState } }
  | { type: 'APPROVAL_REQUIRED'; payload: ApprovalRequest };

// Use generics for reusable types
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Utility types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
```

### 2.4 Error Handling

```typescript
// ✅ DO: Use custom error classes

// Base application error
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Domain-specific errors
class NegotiationError extends AppError {
  constructor(
    message: string,
    code: string,
    public readonly negotiationId: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, 400, true, { ...context, negotiationId });
  }
}

class LLMError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model: string,
    public readonly originalError?: Error
  ) {
    super(message, 'LLM_ERROR', 502, true, { provider, model });
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, { field, value });
  }
}

// Error handling patterns
async function processNegotiationMessage(
  negotiationId: string,
  message: string
): Promise<Result<ProcessedMessage>> {
  try {
    const negotiation = await getNegotiation(negotiationId);
    
    if (!negotiation) {
      return {
        success: false,
        error: new NegotiationError(
          'Negotiation not found',
          'NEGOTIATION_NOT_FOUND',
          negotiationId
        )
      };
    }
    
    const processed = await processMessage(message);
    
    return { success: true, data: processed };
  } catch (error) {
    // Log error with context
    logger.error('Failed to process negotiation message', {
      negotiationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Rethrow known errors
    if (error instanceof AppError) {
      return { success: false, error };
    }
    
    // Wrap unknown errors
    return {
      success: false,
      error: new AppError(
        'Unexpected error processing message',
        'INTERNAL_ERROR',
        500,
        false,
        { originalError: error }
      )
    };
  }
}

// Never catch and ignore errors silently
// ❌ DON'T
try {
  await riskyOperation();
} catch (e) {
  // Silent fail
}

// ✅ DO
try {
  await riskyOperation();
} catch (error) {
  logger.error('Risky operation failed', { error });
  // Handle appropriately or rethrow
  throw error;
}
```

### 2.5 Async/Await Patterns

```typescript
// ✅ DO: Always use async/await over raw promises

// Sequential execution when order matters
async function processNegotiationSteps(negotiationId: string): Promise<void> {
  const negotiation = await fetchNegotiation(negotiationId);
  const analysis = await analyzeNeeds(negotiation);
  const products = await matchProducts(analysis);
  const pricing = await calculatePricing(products);
  await generateProposal(negotiation, pricing);
}

// Parallel execution when independent
async function enrichContact(contactId: string): Promise<EnrichedContact> {
  const contact = await fetchContact(contactId);
  
  // Parallel fetch of independent data
  const [
    companyInfo,
    financialData,
    socialProfiles
  ] = await Promise.all([
    fetchCompanyInfo(contact.companyId),
    fetchFinancialData(contact.cui),
    fetchSocialProfiles(contact.email)
  ]);
  
  return {
    ...contact,
    company: companyInfo,
    financial: financialData,
    social: socialProfiles
  };
}

// Use Promise.allSettled for graceful degradation
async function enrichContactGraceful(contactId: string): Promise<EnrichedContact> {
  const contact = await fetchContact(contactId);
  
  const results = await Promise.allSettled([
    fetchCompanyInfo(contact.companyId),
    fetchFinancialData(contact.cui),
    fetchSocialProfiles(contact.email)
  ]);
  
  return {
    ...contact,
    company: results[0].status === 'fulfilled' ? results[0].value : null,
    financial: results[1].status === 'fulfilled' ? results[1].value : null,
    social: results[2].status === 'fulfilled' ? results[2].value : null
  };
}

// Timeout wrapper for external calls
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new AppError(`${operation} timed out`, 'TIMEOUT', 408));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

// Usage
const response = await withTimeout(
  callLLMAPI(prompt),
  30_000,
  'LLM API call'
);

// Retry pattern with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  let lastError: unknown;
  let delay = options.initialDelayMs;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === options.maxAttempts) break;
      if (options.shouldRetry && !options.shouldRetry(error)) break;
      
      logger.warn(`Operation failed, retrying`, {
        attempt,
        maxAttempts: options.maxAttempts,
        delayMs: delay
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
    }
  }
  
  throw lastError;
}
```

---

## 3. Standarde React și Frontend

### 3.1 Component Structure

```typescript
// ✅ DO: Use consistent component file structure

// negotiation-card/
// ├── negotiation-card.tsx        // Main component
// ├── negotiation-card.types.ts   // Types and interfaces
// ├── negotiation-card.hooks.ts   // Custom hooks
// ├── negotiation-card.utils.ts   // Helper functions
// ├── negotiation-card.test.tsx   // Tests
// └── index.ts                    // Public exports

// negotiation-card.types.ts
export interface NegotiationCardProps {
  negotiation: Negotiation;
  onStateChange?: (newState: NegotiationState) => void;
  isEditable?: boolean;
  className?: string;
}

export interface NegotiationCardState {
  isExpanded: boolean;
  isEditing: boolean;
}

// negotiation-card.hooks.ts
import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useNegotiationCard(negotiationId: string) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const updateMutation = useMutation({
    mutationFn: updateNegotiation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiation', negotiationId] });
    }
  });
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  return {
    isExpanded,
    toggleExpanded,
    updateNegotiation: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
}

// negotiation-card.tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNegotiationCard } from './negotiation-card.hooks';
import type { NegotiationCardProps } from './negotiation-card.types';

export const NegotiationCard = memo(function NegotiationCard({
  negotiation,
  onStateChange,
  isEditable = false,
  className
}: NegotiationCardProps) {
  const { isExpanded, toggleExpanded, updateNegotiation, isUpdating } = 
    useNegotiationCard(negotiation.id);
  
  return (
    <Card className={cn('negotiation-card', className)}>
      <CardHeader onClick={toggleExpanded} className="cursor-pointer">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{negotiation.title}</h3>
          <Badge variant={getStateVariant(negotiation.currentState)}>
            {negotiation.currentState}
          </Badge>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {/* Content */}
        </CardContent>
      )}
    </Card>
  );
});

// index.ts - Public exports
export { NegotiationCard } from './negotiation-card';
export type { NegotiationCardProps } from './negotiation-card.types';
```

### 3.2 State Management

```typescript
// ✅ DO: Use appropriate state management for scope

// 1. Local state (useState) - component-specific state
function SearchForm() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // ...
}

// 2. Server state (TanStack Query) - data from API
function NegotiationList({ filters }: NegotiationListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['negotiations', filters],
    queryFn: () => fetchNegotiations(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const mutation = useMutation({
    mutationFn: createNegotiation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    }
  });
}

// 3. Global client state (Zustand) - shared UI state
// stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  notificationSettings: NotificationSettings;
  
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      notificationSettings: defaultNotificationSettings,
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setTheme: (theme) => set({ theme }),
      
      updateNotificationSettings: (settings) => set((state) => ({
        notificationSettings: { ...state.notificationSettings, ...settings }
      }))
    }),
    {
      name: 'cerniq-ui-settings',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme 
      })
    }
  )
);

// 4. Complex form state (React Hook Form)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const negotiationSchema = z.object({
  contactId: z.string().uuid(),
  products: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    discount: z.number().min(0).max(100).optional()
  })).min(1),
  notes: z.string().max(1000).optional()
});

function NegotiationForm() {
  const form = useForm<NegotiationFormData>({
    resolver: zodResolver(negotiationSchema),
    defaultValues: {
      products: [],
      notes: ''
    }
  });
  
  // ...
}
```

### 3.3 Custom Hooks

```typescript
// ✅ DO: Create reusable hooks for common patterns

// hooks/use-debounced-value.ts
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// hooks/use-async-action.ts
export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>
) {
  const [state, setState] = useState<{
    isLoading: boolean;
    error: Error | null;
    data: TResult | null;
  }>({
    isLoading: false,
    error: null,
    data: null
  });
  
  const execute = useCallback(async (...args: TArgs) => {
    setState({ isLoading: true, error: null, data: null });
    try {
      const result = await action(...args);
      setState({ isLoading: false, error: null, data: result });
      return result;
    } catch (error) {
      setState({ 
        isLoading: false, 
        error: error instanceof Error ? error : new Error('Unknown error'), 
        data: null 
      });
      throw error;
    }
  }, [action]);
  
  return { ...state, execute };
}

// hooks/use-negotiation.ts
export function useNegotiation(negotiationId: string) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['negotiation', negotiationId],
    queryFn: () => fetchNegotiation(negotiationId),
    enabled: !!negotiationId
  });
  
  const transitionMutation = useMutation({
    mutationFn: (event: NegotiationEvent) => 
      transitionNegotiation(negotiationId, event),
    onSuccess: (data) => {
      queryClient.setQueryData(['negotiation', negotiationId], data);
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
    }
  });
  
  const sendMessage = useCallback((message: string) => {
    return transitionMutation.mutateAsync({
      type: 'MESSAGE_RECEIVED',
      payload: { content: message }
    });
  }, [transitionMutation]);
  
  return {
    negotiation: query.data,
    isLoading: query.isLoading,
    error: query.error,
    sendMessage,
    isSending: transitionMutation.isPending
  };
}

// hooks/use-hitl-approval.ts
export function useHITLApproval(approvalId: string) {
  const queryClient = useQueryClient();
  
  const approveMutation = useMutation({
    mutationFn: (data: ApprovalDecision) => 
      submitApprovalDecision(approvalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hitl-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['hitl-approval', approvalId] });
    }
  });
  
  const approve = useCallback((comment?: string) => {
    return approveMutation.mutateAsync({ 
      decision: 'approved', 
      comment 
    });
  }, [approveMutation]);
  
  const reject = useCallback((reason: string) => {
    return approveMutation.mutateAsync({ 
      decision: 'rejected', 
      reason 
    });
  }, [approveMutation]);
  
  const requestChanges = useCallback((changes: string) => {
    return approveMutation.mutateAsync({ 
      decision: 'changes_requested', 
      changes 
    });
  }, [approveMutation]);
  
  return { approve, reject, requestChanges, isPending: approveMutation.isPending };
}
```

### 3.4 Styling with Tailwind CSS

```typescript
// ✅ DO: Use Tailwind CSS with cn() utility

// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Component usage
function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        
        // Variant styles
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': 
            variant === 'default',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90': 
            variant === 'destructive',
          'border border-input bg-background hover:bg-accent': 
            variant === 'outline',
          'hover:bg-accent hover:text-accent-foreground': 
            variant === 'ghost',
        },
        
        // Size styles
        {
          'h-9 px-3 text-sm': size === 'sm',
          'h-10 px-4': size === 'md',
          'h-11 px-8': size === 'lg',
        },
        
        // Custom className
        className
      )}
      {...props}
    />
  );
}

// ✅ DO: Use CSS custom properties for theming
// styles/globals.css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --success: 142.1 76.2% 36.3%;
    --warning: 38 92% 50%;
    --destructive: 0 84.2% 60.2%;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
  }
}

// ❌ DON'T: Mix inline styles with Tailwind
<div style={{ marginTop: '20px' }} className="p-4">

// ✅ DO: Use only Tailwind classes
<div className="mt-5 p-4">
```

### 3.5 Form Handling

```typescript
// ✅ DO: Use React Hook Form with Zod validation

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema definition
const proposalSchema = z.object({
  contactId: z.string().uuid('Contact invalid'),
  products: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive('Cantitatea trebuie să fie pozitivă'),
    unitPrice: z.number().positive('Prețul trebuie să fie pozitiv'),
    discount: z.number().min(0).max(50, 'Discount maxim 50%').optional()
  })).min(1, 'Adăugați cel puțin un produs'),
  validUntil: z.date().min(new Date(), 'Data trebuie să fie în viitor'),
  notes: z.string().max(2000).optional(),
  terms: z.object({
    paymentTerms: z.enum(['immediate', 'net15', 'net30', 'net60']),
    deliveryTerms: z.enum(['dap', 'fca', 'exw']),
    currency: z.enum(['RON', 'EUR'])
  })
});

type ProposalFormData = z.infer<typeof proposalSchema>;

function ProposalForm({ contactId, onSubmit }: ProposalFormProps) {
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      contactId,
      products: [],
      validUntil: addDays(new Date(), 30),
      terms: {
        paymentTerms: 'net30',
        deliveryTerms: 'dap',
        currency: 'RON'
      }
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products'
  });
  
  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      form.setError('root', { 
        message: 'Eroare la trimiterea propunerii' 
      });
    }
  });
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="products"
          render={() => (
            <FormItem>
              <FormLabel>Produse</FormLabel>
              {fields.map((field, index) => (
                <ProductLineItem
                  key={field.id}
                  index={index}
                  control={form.control}
                  onRemove={() => remove(index)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ 
                  productId: '', 
                  quantity: 1, 
                  unitPrice: 0 
                })}
              >
                Adaugă produs
              </Button>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valabil până la</FormLabel>
              <DatePicker
                selected={field.value}
                onSelect={field.onChange}
                minDate={new Date()}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        {form.formState.errors.root && (
          <Alert variant="destructive">
            {form.formState.errors.root.message}
          </Alert>
        )}
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Se trimite...' : 'Trimite propunerea'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 4. Standarde Backend și API

### 4.1 API Design Principles

```typescript
// ✅ DO: Follow REST conventions and use consistent patterns

// Route structure for Fastify
// src/routes/negotiations/index.ts

import { FastifyPluginAsync } from 'fastify';
import { 
  getNegotiationsSchema,
  createNegotiationSchema,
  updateNegotiationSchema,
  transitionNegotiationSchema
} from './schemas';

const negotiationsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/negotiations - List negotiations with pagination
  fastify.get('/', {
    schema: getNegotiationsSchema,
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:read')]
  }, async (request, reply) => {
    const { page = 1, pageSize = 20, status, contactId, sortBy, sortOrder } = 
      request.query as GetNegotiationsQuery;
    
    const result = await fastify.negotiationService.list({
      tenantId: request.user.tenantId,
      page,
      pageSize,
      filters: { status, contactId },
      sort: { field: sortBy, order: sortOrder }
    });
    
    return reply.code(200).send({
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
      }
    });
  });
  
  // GET /api/v1/negotiations/:id - Get single negotiation
  fastify.get('/:id', {
    schema: getNegotiationSchema,
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:read')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const negotiation = await fastify.negotiationService.getById(
      request.user.tenantId,
      id
    );
    
    if (!negotiation) {
      return reply.code(404).send({
        error: 'NOT_FOUND',
        message: 'Negotiation not found'
      });
    }
    
    return reply.code(200).send({ data: negotiation });
  });
  
  // POST /api/v1/negotiations - Create negotiation
  fastify.post('/', {
    schema: createNegotiationSchema,
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:create')]
  }, async (request, reply) => {
    const data = request.body as CreateNegotiationInput;
    
    const negotiation = await fastify.negotiationService.create({
      tenantId: request.user.tenantId,
      userId: request.user.id,
      ...data
    });
    
    return reply.code(201).send({ data: negotiation });
  });
  
  // PATCH /api/v1/negotiations/:id - Update negotiation
  fastify.patch('/:id', {
    schema: updateNegotiationSchema,
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:update')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as UpdateNegotiationInput;
    
    const negotiation = await fastify.negotiationService.update(
      request.user.tenantId,
      id,
      data
    );
    
    return reply.code(200).send({ data: negotiation });
  });
  
  // POST /api/v1/negotiations/:id/transition - State machine transition
  fastify.post('/:id/transition', {
    schema: transitionNegotiationSchema,
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:update')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = request.body as NegotiationEvent;
    
    const result = await fastify.negotiationService.transition(
      request.user.tenantId,
      id,
      event
    );
    
    return reply.code(200).send({ data: result });
  });
  
  // DELETE /api/v1/negotiations/:id - Soft delete
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate, fastify.requirePermission('negotiations:delete')]
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await fastify.negotiationService.delete(request.user.tenantId, id);
    
    return reply.code(204).send();
  });
};

export default negotiationsRoutes;
```

### 4.2 Request/Response Schemas

```typescript
// ✅ DO: Use JSON Schema for validation with TypeBox

import { Type, Static } from '@sinclair/typebox';

// Shared schemas
const PaginationQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  sortBy: Type.Optional(Type.String()),
  sortOrder: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')]))
});

const PaginationResponseSchema = Type.Object({
  page: Type.Number(),
  pageSize: Type.Number(),
  totalItems: Type.Number(),
  totalPages: Type.Number()
});

const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.Array(Type.Object({
    field: Type.String(),
    message: Type.String()
  })))
});

// Negotiation schemas
const NegotiationStateSchema = Type.Union([
  Type.Literal('initial'),
  Type.Literal('needs_analysis'),
  Type.Literal('product_matching'),
  Type.Literal('pricing'),
  Type.Literal('proposal_sent'),
  Type.Literal('negotiating'),
  Type.Literal('agreement'),
  Type.Literal('closed_won'),
  Type.Literal('closed_lost')
]);

const NegotiationSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  contactId: Type.String({ format: 'uuid' }),
  currentState: NegotiationStateSchema,
  title: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  products: Type.Array(Type.Object({
    productId: Type.String({ format: 'uuid' }),
    quantity: Type.Number(),
    unitPrice: Type.Number(),
    discount: Type.Optional(Type.Number())
  })),
  totalValue: Type.Number(),
  assignedTo: Type.Optional(Type.String({ format: 'uuid' }))
});

// Route schemas
export const getNegotiationsSchema = {
  tags: ['Negotiations'],
  summary: 'List negotiations',
  description: 'Get paginated list of negotiations with optional filters',
  querystring: Type.Intersect([
    PaginationQuerySchema,
    Type.Object({
      status: Type.Optional(NegotiationStateSchema),
      contactId: Type.Optional(Type.String({ format: 'uuid' }))
    })
  ]),
  response: {
    200: Type.Object({
      data: Type.Array(NegotiationSchema),
      pagination: PaginationResponseSchema
    }),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema
  }
};

export const createNegotiationSchema = {
  tags: ['Negotiations'],
  summary: 'Create negotiation',
  body: Type.Object({
    contactId: Type.String({ format: 'uuid' }),
    title: Type.Optional(Type.String({ maxLength: 255 })),
    products: Type.Optional(Type.Array(Type.Object({
      productId: Type.String({ format: 'uuid' }),
      quantity: Type.Number({ minimum: 1 })
    }))),
    notes: Type.Optional(Type.String({ maxLength: 2000 }))
  }),
  response: {
    201: Type.Object({ data: NegotiationSchema }),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema
  }
};

// Type inference from schemas
type GetNegotiationsQuery = Static<typeof getNegotiationsSchema.querystring>;
type CreateNegotiationInput = Static<typeof createNegotiationSchema.body>;
type NegotiationResponse = Static<typeof NegotiationSchema>;
```

### 4.3 Service Layer Pattern

```typescript
// ✅ DO: Use service layer for business logic

// services/negotiation.service.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { negotiations, negotiationProducts, negotiationTransitions } from '@/db/schema';
import { db } from '@/db';
import { NegotiationFSM } from '@/lib/negotiation-fsm';
import { logger } from '@/lib/logger';

export class NegotiationService {
  constructor(
    private readonly db: typeof db,
    private readonly eventBus: EventBus,
    private readonly aiService: AIConversationService
  ) {}
  
  async list(params: ListNegotiationsParams): Promise<PaginatedResult<Negotiation>> {
    const { tenantId, page, pageSize, filters, sort } = params;
    
    const conditions = [eq(negotiations.tenantId, tenantId)];
    
    if (filters.status) {
      conditions.push(eq(negotiations.currentState, filters.status));
    }
    
    if (filters.contactId) {
      conditions.push(eq(negotiations.contactId, filters.contactId));
    }
    
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(negotiations)
        .where(and(...conditions))
        .orderBy(sort?.field === 'createdAt' 
          ? (sort.order === 'asc' ? negotiations.createdAt : desc(negotiations.createdAt))
          : desc(negotiations.updatedAt)
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(negotiations)
        .where(and(...conditions))
    ]);
    
    const totalItems = countResult[0]?.count ?? 0;
    
    return {
      items,
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    };
  }
  
  async create(params: CreateNegotiationParams): Promise<Negotiation> {
    const { tenantId, userId, contactId, products, notes } = params;
    
    return this.db.transaction(async (tx) => {
      // Create negotiation
      const [negotiation] = await tx
        .insert(negotiations)
        .values({
          tenantId,
          contactId,
          createdBy: userId,
          currentState: 'initial',
          metadata: { notes }
        })
        .returning();
      
      // Add products if provided
      if (products?.length) {
        await tx
          .insert(negotiationProducts)
          .values(products.map(p => ({
            negotiationId: negotiation.id,
            productId: p.productId,
            quantity: p.quantity
          })));
      }
      
      // Record initial transition
      await tx
        .insert(negotiationTransitions)
        .values({
          negotiationId: negotiation.id,
          fromState: null,
          toState: 'initial',
          trigger: 'CREATED',
          actorId: userId
        });
      
      // Emit event
      await this.eventBus.emit('negotiation.created', {
        negotiationId: negotiation.id,
        tenantId,
        contactId
      });
      
      logger.info('Negotiation created', {
        negotiationId: negotiation.id,
        tenantId,
        contactId
      });
      
      return negotiation;
    });
  }
  
  async transition(
    tenantId: string,
    negotiationId: string,
    event: NegotiationEvent
  ): Promise<TransitionResult> {
    const negotiation = await this.getById(tenantId, negotiationId);
    
    if (!negotiation) {
      throw new NegotiationError(
        'Negotiation not found',
        'NOT_FOUND',
        negotiationId
      );
    }
    
    // Use FSM to determine valid transition
    const fsm = new NegotiationFSM(negotiation.currentState);
    const canTransition = fsm.can(event.type);
    
    if (!canTransition) {
      throw new NegotiationError(
        `Cannot process event ${event.type} in state ${negotiation.currentState}`,
        'INVALID_TRANSITION',
        negotiationId
      );
    }
    
    // Execute transition
    const newState = fsm.transition(event.type);
    
    // Update database
    return this.db.transaction(async (tx) => {
      await tx
        .update(negotiations)
        .set({ 
          currentState: newState,
          updatedAt: new Date()
        })
        .where(eq(negotiations.id, negotiationId));
      
      await tx
        .insert(negotiationTransitions)
        .values({
          negotiationId,
          fromState: negotiation.currentState,
          toState: newState,
          trigger: event.type,
          metadata: event.payload
        });
      
      // Emit state change event
      await this.eventBus.emit('negotiation.state_changed', {
        negotiationId,
        fromState: negotiation.currentState,
        toState: newState,
        event
      });
      
      return {
        previousState: negotiation.currentState,
        currentState: newState,
        negotiation: await this.getById(tenantId, negotiationId)
      };
    });
  }
}
```

### 4.4 Error Handling în Backend

```typescript
// ============================================================
// MIDDLEWARE ERROR HANDLER
// ============================================================

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '@/errors/app-error';
import { logger } from '@/lib/logger';

/**
 * Global error handler pentru Fastify
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log error with context
  const errorContext = {
    requestId: request.id,
    method: request.method,
    url: request.url,
    userId: request.user?.id,
    tenantId: request.tenantId,
    userAgent: request.headers['user-agent'],
    ip: request.ip
  };

  // Determine if operational or programmer error
  if (error instanceof AppError) {
    // Operational error - expected, handle gracefully
    logger.warn('Operational error', {
      ...errorContext,
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context: error.context
      }
    });

    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          context: error.context,
          stack: error.stack
        })
      }
    });
    return;
  }

  // FastifyError (validation errors, etc.)
  if ('validation' in error && error.validation) {
    logger.info('Validation error', {
      ...errorContext,
      validation: error.validation
    });

    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation.map(v => ({
          field: v.instancePath || v.params?.missingProperty,
          message: v.message,
          keyword: v.keyword
        }))
      }
    });
    return;
  }

  // Programmer/Unknown error - log and return generic message
  logger.error('Unexpected error', {
    ...errorContext,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });

  // Don't expose internal errors to client
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: request.id
    }
  });
}

// ============================================================
// NOT FOUND HANDLER
// ============================================================

export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  logger.info('Route not found', {
    requestId: request.id,
    method: request.method,
    url: request.url
  });

  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`
    }
  });
}

// ============================================================
// DOMAIN-SPECIFIC ERROR HANDLING
// ============================================================

/**
 * Wrapper pentru handle async errors în route handlers
 */
export function asyncHandler<T>(
  fn: (request: FastifyRequest, reply: FastifyReply) => Promise<T>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await fn(request, reply);
    } catch (error) {
      // Let Fastify's error handler deal with it
      throw error;
    }
  };
}

/**
 * Error response builder
 */
export function buildErrorResponse(
  error: AppError | Error,
  includeDebug = false
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(includeDebug && {
          context: error.context,
          stack: error.stack
        })
      }
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      ...(includeDebug && {
        originalMessage: error.message,
        stack: error.stack
      })
    }
  };
}

// ============================================================
// RETRY STRATEGIES
// ============================================================

interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
};

/**
 * Retry cu exponential backoff și jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (opts.retryableErrors && error instanceof AppError) {
        if (!opts.retryableErrors.includes(error.code)) {
          throw error;
        }
      }

      // Last attempt - don't delay, just throw
      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      const actualDelay = Math.min(delay + jitter, opts.maxDelayMs);

      // Notify retry callback
      opts.onRetry?.(attempt, lastError, actualDelay);

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, actualDelay));

      // Increase delay for next iteration
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError!;
}

// ============================================================
// CIRCUIT BREAKER PATTERN
// ============================================================

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private successesSinceHalfOpen = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 10000
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.options.resetTimeoutMs) {
        this.state = 'half-open';
        this.successesSinceHalfOpen = 0;
        logger.info(`Circuit ${this.name} transitioning to half-open`);
      } else {
        throw new AppError(
          `Circuit ${this.name} is open`,
          'CIRCUIT_OPEN',
          503
        );
      }
    }

    try {
      const result = await fn();

      // Success handling
      if (this.state === 'half-open') {
        this.successesSinceHalfOpen++;
        if (this.successesSinceHalfOpen >= 3) {
          this.state = 'closed';
          this.failures = 0;
          logger.info(`Circuit ${this.name} closed after successful recovery`);
        }
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      logger.warn(`Circuit ${this.name} opened after ${this.failures} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successesSinceHalfOpen = 0;
    logger.info(`Circuit ${this.name} manually reset`);
  }
}
```

### 4.5 Database Transactions

```typescript
// ============================================================
// TRANSACTION PATTERNS
// ============================================================

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * Transaction wrapper cu automatic rollback pe eroare
 */
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const startTime = Date.now();
  const txId = crypto.randomUUID().slice(0, 8);
  
  logger.debug('Starting transaction', { txId });
  
  try {
    const result = await db.transaction(async (tx) => {
      // Set transaction-level settings if provided
      if (options?.isolationLevel) {
        await tx.execute(
          sql`SET TRANSACTION ISOLATION LEVEL ${sql.raw(options.isolationLevel)}`
        );
      }
      
      if (options?.timeout) {
        await tx.execute(
          sql`SET LOCAL statement_timeout = ${options.timeout}`
        );
      }
      
      return await fn(tx);
    });
    
    const duration = Date.now() - startTime;
    logger.debug('Transaction committed', { txId, durationMs: duration });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Transaction rolled back', {
      txId,
      durationMs: duration,
      error: (error as Error).message
    });
    throw error;
  }
}

interface TransactionOptions {
  isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number; // milliseconds
}

// ============================================================
// SAGA PATTERN FOR DISTRIBUTED TRANSACTIONS
// ============================================================

interface SagaStep<TContext> {
  name: string;
  execute: (context: TContext) => Promise<void>;
  compensate: (context: TContext) => Promise<void>;
}

export class Saga<TContext> {
  private steps: SagaStep<TContext>[] = [];
  private executedSteps: string[] = [];

  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  async execute(context: TContext): Promise<void> {
    const sagaId = crypto.randomUUID().slice(0, 8);
    
    logger.info('Starting saga', {
      sagaId,
      steps: this.steps.map(s => s.name)
    });

    for (const step of this.steps) {
      try {
        logger.debug('Executing saga step', { sagaId, step: step.name });
        await step.execute(context);
        this.executedSteps.push(step.name);
        logger.debug('Saga step completed', { sagaId, step: step.name });
      } catch (error) {
        logger.error('Saga step failed, starting compensation', {
          sagaId,
          failedStep: step.name,
          error: (error as Error).message
        });
        
        await this.compensate(context, sagaId);
        throw error;
      }
    }

    logger.info('Saga completed successfully', { sagaId });
  }

  private async compensate(context: TContext, sagaId: string): Promise<void> {
    // Execute compensations in reverse order
    const stepsToCompensate = [...this.executedSteps].reverse();
    
    for (const stepName of stepsToCompensate) {
      const step = this.steps.find(s => s.name === stepName);
      if (!step) continue;

      try {
        logger.debug('Executing compensation', { sagaId, step: stepName });
        await step.compensate(context);
        logger.debug('Compensation completed', { sagaId, step: stepName });
      } catch (compensateError) {
        logger.error('Compensation failed', {
          sagaId,
          step: stepName,
          error: (compensateError as Error).message
        });
        // Continue compensating other steps
      }
    }
  }
}

// ============================================================
// USAGE EXAMPLE: SAGA FOR ORDER CREATION
// ============================================================

/**
 * Exemplu: Creare comandă cu saga pattern
 */
interface OrderSagaContext {
  tenantId: string;
  contactId: string;
  negotiationId: string;
  products: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
  orderId?: string;
  invoiceId?: string;
  stockReservationId?: string;
}

export const createOrderSaga = new Saga<OrderSagaContext>()
  .addStep({
    name: 'reserve_stock',
    execute: async (ctx) => {
      const reservation = await stockService.reserveStock(
        ctx.tenantId,
        ctx.products
      );
      ctx.stockReservationId = reservation.id;
    },
    compensate: async (ctx) => {
      if (ctx.stockReservationId) {
        await stockService.releaseReservation(ctx.stockReservationId);
      }
    }
  })
  .addStep({
    name: 'create_order',
    execute: async (ctx) => {
      const order = await orderService.create({
        tenantId: ctx.tenantId,
        contactId: ctx.contactId,
        negotiationId: ctx.negotiationId,
        products: ctx.products,
        totalAmount: ctx.totalAmount
      });
      ctx.orderId = order.id;
    },
    compensate: async (ctx) => {
      if (ctx.orderId) {
        await orderService.cancel(ctx.orderId);
      }
    }
  })
  .addStep({
    name: 'generate_invoice',
    execute: async (ctx) => {
      const invoice = await invoiceService.generate({
        tenantId: ctx.tenantId,
        orderId: ctx.orderId!,
        contactId: ctx.contactId
      });
      ctx.invoiceId = invoice.id;
    },
    compensate: async (ctx) => {
      if (ctx.invoiceId) {
        await invoiceService.void(ctx.invoiceId);
      }
    }
  });

// ============================================================
// OPTIMISTIC LOCKING
// ============================================================

import { eq, and, sql } from 'drizzle-orm';

/**
 * Update cu optimistic locking
 */
export async function updateWithOptimisticLock<T extends { version: number }>(
  table: any,
  id: string,
  currentVersion: number,
  updateFn: (current: T) => Partial<T>
): Promise<T> {
  const result = await db
    .update(table)
    .set({
      ...updateFn({} as T),
      version: currentVersion + 1,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(table.id, id),
        eq(table.version, currentVersion)
      )
    )
    .returning();

  if (result.length === 0) {
    throw new AppError(
      'Concurrent modification detected',
      'OPTIMISTIC_LOCK_ERROR',
      409,
      { id, expectedVersion: currentVersion }
    );
  }

  return result[0] as T;
}

// ============================================================
// PESSIMISTIC LOCKING
// ============================================================

/**
 * Select with FOR UPDATE lock
 */
export async function withRowLock<T>(
  table: any,
  id: string,
  fn: (row: T) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Lock row
    const rows = await tx.execute(
      sql`SELECT * FROM ${table} WHERE id = ${id} FOR UPDATE`
    );
    
    if (rows.length === 0) {
      throw new AppError('Row not found', 'NOT_FOUND', 404);
    }
    
    const current = rows[0] as T;
    const updated = await fn(current);
    
    await tx
      .update(table)
      .set(updated)
      .where(eq(table.id, id));
    
    return updated;
  });
}

/**
 * Advisory locks pentru operații cross-resource
 */
export async function withAdvisoryLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  timeoutMs = 30000
): Promise<T> {
  // Convert string to numeric lock key
  const lockId = hashStringToInt(lockKey);
  
  return db.transaction(async (tx) => {
    // Try to acquire lock with timeout
    const acquired = await tx.execute(
      sql`SELECT pg_try_advisory_xact_lock(${lockId})`
    );
    
    if (!acquired[0].pg_try_advisory_xact_lock) {
      throw new AppError(
        'Could not acquire lock',
        'LOCK_TIMEOUT',
        423,
        { lockKey }
      );
    }
    
    return await fn();
  });
}

function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

---

## 5. Standarde Baze de Date

### 5.1 Naming Conventions pentru Database

```sql
-- ============================================================
-- TABLE NAMING
-- ============================================================

-- ✅ CORECT: snake_case, plural, descriptiv
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE negotiation_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- ❌ GREȘIT: camelCase, singular
-- CREATE TABLE Negotiation (...);
-- CREATE TABLE negotiationTransition (...);

-- ============================================================
-- COLUMN NAMING
-- ============================================================

-- ✅ CORECT: snake_case, descriptiv
CREATE TABLE negotiations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,                    -- Foreign key cu _id suffix
  contact_id UUID NOT NULL,                   -- Foreign key cu _id suffix
  current_state VARCHAR(50) NOT NULL,         -- Descriptiv
  total_amount DECIMAL(15, 2),                -- Specific
  discount_percent DECIMAL(5, 2),             -- Cu unitate în nume
  is_active BOOLEAN DEFAULT true,             -- Boolean cu is_ prefix
  has_documents BOOLEAN DEFAULT false,        -- Boolean cu has_ prefix
  created_at TIMESTAMP WITH TIME ZONE,        -- Timestamps cu _at suffix
  updated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,                            -- Creator cu _by suffix
  approved_by UUID
);

-- ============================================================
-- INDEX NAMING
-- ============================================================

-- Pattern: idx_{table}_{columns}
CREATE INDEX idx_negotiations_tenant_id ON negotiations(tenant_id);
CREATE INDEX idx_negotiations_contact_state ON negotiations(contact_id, current_state);
CREATE INDEX idx_negotiations_created_at ON negotiations(created_at);

-- Pentru unique index
CREATE UNIQUE INDEX uq_negotiations_tenant_external 
  ON negotiations(tenant_id, external_id);

-- Pentru partial index
CREATE INDEX idx_negotiations_active 
  ON negotiations(tenant_id) 
  WHERE is_active = true;

-- ============================================================
-- CONSTRAINT NAMING
-- ============================================================

-- Primary key: pk_{table}
ALTER TABLE negotiations ADD CONSTRAINT pk_negotiations PRIMARY KEY (id);

-- Foreign key: fk_{table}_{referenced_table}_{column}
ALTER TABLE negotiations 
  ADD CONSTRAINT fk_negotiations_tenants_tenant_id 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE negotiations 
  ADD CONSTRAINT fk_negotiations_contacts_contact_id 
  FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Unique: uq_{table}_{columns}
ALTER TABLE negotiations 
  ADD CONSTRAINT uq_negotiations_tenant_external 
  UNIQUE (tenant_id, external_id);

-- Check: chk_{table}_{description}
ALTER TABLE negotiations 
  ADD CONSTRAINT chk_negotiations_discount_range 
  CHECK (discount_percent >= 0 AND discount_percent <= 100);

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Pattern: {table}_{column}_enum sau descriptiv
CREATE TYPE negotiation_state_enum AS ENUM (
  'initial',
  'offer_sent',
  'counter_received',
  'counter_sent',
  'pending_approval',
  'approved',
  'rejected',
  'expired',
  'closed_won',
  'closed_lost'
);

CREATE TYPE message_role_enum AS ENUM (
  'user',
  'assistant',
  'system',
  'tool'
);

-- ============================================================
-- FUNCTION AND TRIGGER NAMING
-- ============================================================

-- Functions: fn_{description}
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: trg_{table}_{action}
CREATE TRIGGER trg_negotiations_update_timestamp
  BEFORE UPDATE ON negotiations
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_timestamp();

-- Audit trigger
CREATE TRIGGER trg_negotiations_audit
  AFTER INSERT OR UPDATE OR DELETE ON negotiations
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_log('negotiations');
```

### 5.2 Schema Design Patterns

```sql
-- ============================================================
-- BASE TABLE PATTERN
-- ============================================================

-- Template pentru toate tabelele
CREATE TABLE {table_name} (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Business fields
  -- ...
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id)
);

-- Always add tenant_id index
CREATE INDEX idx_{table}_tenant_id ON {table}(tenant_id);

-- Add updated_at trigger
CREATE TRIGGER trg_{table}_update_timestamp
  BEFORE UPDATE ON {table}
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================
-- MULTI-TENANCY PATTERNS
-- ============================================================

-- Row Level Security pentru multi-tenancy
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;

-- Policy pentru tenant isolation
CREATE POLICY policy_negotiations_tenant_isolation
  ON negotiations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Function pentru set tenant
CREATE OR REPLACE FUNCTION fn_set_current_tenant(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- AUDIT TRAIL PATTERN
-- ============================================================

-- Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID,
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partition by month for performance
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Generic audit function
CREATE OR REPLACE FUNCTION fn_audit_log(p_table_name TEXT)
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    v_old_data = to_jsonb(OLD);
    v_new_data = to_jsonb(NEW);
    
    -- Detect changed fields
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_data) AS n(key, value)
    WHERE v_old_data->key IS DISTINCT FROM n.value;
    
    INSERT INTO audit_logs (
      tenant_id, table_name, record_id, action,
      old_data, new_data, changed_fields,
      user_id, session_id
    ) VALUES (
      NEW.tenant_id, p_table_name, NEW.id, 'UPDATE',
      v_old_data, v_new_data, v_changed_fields,
      current_setting('app.current_user_id', true)::uuid,
      current_setting('app.session_id', true)
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (
      tenant_id, table_name, record_id, action,
      old_data, user_id, session_id
    ) VALUES (
      OLD.tenant_id, p_table_name, OLD.id, 'DELETE',
      to_jsonb(OLD),
      current_setting('app.current_user_id', true)::uuid,
      current_setting('app.session_id', true)
    );
    RETURN OLD;
    
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (
      tenant_id, table_name, record_id, action,
      new_data, user_id, session_id
    ) VALUES (
      NEW.tenant_id, p_table_name, NEW.id, 'INSERT',
      to_jsonb(NEW),
      current_setting('app.current_user_id', true)::uuid,
      current_setting('app.session_id', true)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- JSONB PATTERNS
-- ============================================================

-- Structured JSONB with validation
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Structured JSONB pentru messages
  messages JSONB NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT chk_messages_array CHECK (jsonb_typeof(messages) = 'array'),
  
  -- Metadata JSONB
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Context cu default structure
  context JSONB NOT NULL DEFAULT '{
    "intent": null,
    "sentiment": null,
    "extracted_entities": [],
    "conversation_flags": []
  }'::jsonb
);

-- GIN index pentru JSONB search
CREATE INDEX idx_conversations_messages_gin 
  ON ai_conversations USING GIN (messages jsonb_path_ops);

-- Expression index pentru specific path
CREATE INDEX idx_conversations_intent 
  ON ai_conversations ((context->>'intent'));

-- ============================================================
-- VERSIONING PATTERN
-- ============================================================

-- Main table cu current version
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- History table pentru versiuni
CREATE TABLE products_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  version INTEGER NOT NULL,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE,
  changed_by UUID REFERENCES users(id),
  change_reason TEXT
);

-- Function pentru version history
CREATE OR REPLACE FUNCTION fn_product_version_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Close previous version
  UPDATE products_history
  SET valid_to = NOW()
  WHERE product_id = NEW.id AND valid_to IS NULL;
  
  -- Insert new version
  INSERT INTO products_history (
    product_id, version, sku, name, description, price,
    valid_from, changed_by, change_reason
  ) VALUES (
    NEW.id, NEW.version, NEW.sku, NEW.name, NEW.description, NEW.price,
    NOW(),
    current_setting('app.current_user_id', true)::uuid,
    current_setting('app.change_reason', true)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Drizzle ORM Patterns

```typescript
// ============================================================
// SCHEMA DEFINITION
// ============================================================

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  decimal,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
  check
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// ============================================================
// BASE SCHEMA HELPERS
// ============================================================

/**
 * Common columns pentru toate tabelele
 */
const baseColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by')
};

/**
 * Soft delete columns
 */
const softDeleteColumns = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by')
};

// ============================================================
// TABLE DEFINITIONS
// ============================================================

/**
 * Negotiations table
 */
export const negotiations = pgTable('negotiations', {
  ...baseColumns,
  ...softDeleteColumns,
  
  contactId: uuid('contact_id').notNull(),
  
  currentState: varchar('current_state', { length: 50 })
    .notNull()
    .default('initial'),
  
  initialOffer: decimal('initial_offer', { precision: 15, scale: 2 }),
  currentOffer: decimal('current_offer', { precision: 15, scale: 2 }),
  finalPrice: decimal('final_price', { precision: 15, scale: 2 }),
  
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 })
    .default('0'),
  
  isActive: boolean('is_active').default(true).notNull(),
  
  externalId: varchar('external_id', { length: 100 }),
  
  metadata: jsonb('metadata').$type<NegotiationMetadata>().default({}),
  
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true })
}, (table) => ({
  // Indexes
  tenantIdx: index('idx_negotiations_tenant_id').on(table.tenantId),
  contactIdx: index('idx_negotiations_contact_id').on(table.contactId),
  stateIdx: index('idx_negotiations_state').on(table.currentState),
  createdAtIdx: index('idx_negotiations_created_at').on(table.createdAt),
  
  // Composite indexes
  tenantContactIdx: index('idx_negotiations_tenant_contact')
    .on(table.tenantId, table.contactId),
  
  // Partial indexes
  activeIdx: index('idx_negotiations_active')
    .on(table.tenantId)
    .where(sql`is_active = true`),
  
  // Unique constraints
  externalUniq: uniqueIndex('uq_negotiations_tenant_external')
    .on(table.tenantId, table.externalId),
  
  // Foreign keys
  tenantFk: foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: 'fk_negotiations_tenants'
  }),
  
  contactFk: foreignKey({
    columns: [table.contactId],
    foreignColumns: [contacts.id],
    name: 'fk_negotiations_contacts'
  }),
  
  // Check constraints
  discountCheck: check(
    'chk_negotiations_discount_range',
    sql`discount_percent >= 0 AND discount_percent <= 100`
  )
}));

/**
 * Negotiation transitions table
 */
export const negotiationTransitions = pgTable('negotiation_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  negotiationId: uuid('negotiation_id')
    .notNull()
    .references(() => negotiations.id, { onDelete: 'cascade' }),
  
  fromState: varchar('from_state', { length: 50 }),
  toState: varchar('to_state', { length: 50 }).notNull(),
  trigger: varchar('trigger', { length: 100 }).notNull(),
  
  actorId: uuid('actor_id'),
  actorType: varchar('actor_type', { length: 20 })
    .default('user'),
  
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull()
}, (table) => ({
  negotiationIdx: index('idx_transitions_negotiation')
    .on(table.negotiationId),
  createdAtIdx: index('idx_transitions_created_at')
    .on(table.createdAt)
}));

// ============================================================
// RELATIONS
// ============================================================

export const negotiationsRelations = relations(negotiations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [negotiations.tenantId],
    references: [tenants.id]
  }),
  
  contact: one(contacts, {
    fields: [negotiations.contactId],
    references: [contacts.id]
  }),
  
  transitions: many(negotiationTransitions),
  
  products: many(negotiationProducts),
  
  conversations: many(aiConversations),
  
  invoices: many(invoices)
}));

export const negotiationTransitionsRelations = relations(
  negotiationTransitions, 
  ({ one }) => ({
    negotiation: one(negotiations, {
      fields: [negotiationTransitions.negotiationId],
      references: [negotiations.id]
    })
  })
);

// ============================================================
// TYPE INFERENCE
// ============================================================

import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Negotiation = InferSelectModel<typeof negotiations>;
export type NewNegotiation = InferInsertModel<typeof negotiations>;

export type NegotiationTransition = InferSelectModel<typeof negotiationTransitions>;
export type NewNegotiationTransition = InferInsertModel<typeof negotiationTransitions>;

// ============================================================
// QUERY HELPERS
// ============================================================

import { db } from '@/db';
import { eq, and, or, desc, asc, sql, isNull, gte, lte, like, ilike } from 'drizzle-orm';

/**
 * Common query patterns
 */
export const negotiationQueries = {
  /**
   * Get by ID with tenant check
   */
  getById: async (tenantId: string, id: string) => {
    return db.query.negotiations.findFirst({
      where: and(
        eq(negotiations.id, id),
        eq(negotiations.tenantId, tenantId),
        isNull(negotiations.deletedAt)
      ),
      with: {
        contact: true,
        products: {
          with: {
            product: true
          }
        },
        transitions: {
          orderBy: desc(negotiationTransitions.createdAt),
          limit: 10
        }
      }
    });
  },

  /**
   * List with pagination and filters
   */
  list: async (
    tenantId: string,
    filters: NegotiationFilters,
    pagination: PaginationParams
  ) => {
    const conditions = [
      eq(negotiations.tenantId, tenantId),
      isNull(negotiations.deletedAt)
    ];

    if (filters.state) {
      conditions.push(eq(negotiations.currentState, filters.state));
    }
    
    if (filters.contactId) {
      conditions.push(eq(negotiations.contactId, filters.contactId));
    }
    
    if (filters.isActive !== undefined) {
      conditions.push(eq(negotiations.isActive, filters.isActive));
    }
    
    if (filters.createdAfter) {
      conditions.push(gte(negotiations.createdAt, filters.createdAfter));
    }
    
    if (filters.createdBefore) {
      conditions.push(lte(negotiations.createdAt, filters.createdBefore));
    }

    const [items, [{ count }]] = await Promise.all([
      db.query.negotiations.findMany({
        where: and(...conditions),
        with: {
          contact: {
            columns: { id: true, companyName: true, cui: true }
          }
        },
        orderBy: filters.sortBy === 'created_at' 
          ? (filters.sortOrder === 'asc' 
              ? asc(negotiations.createdAt) 
              : desc(negotiations.createdAt))
          : desc(negotiations.updatedAt),
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize
      }),
      
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(negotiations)
        .where(and(...conditions))
    ]);

    return {
      items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: count,
        totalPages: Math.ceil(count / pagination.pageSize)
      }
    };
  },

  /**
   * Aggregate statistics
   */
  getStats: async (tenantId: string, dateRange: DateRange) => {
    const result = await db
      .select({
        totalCount: sql<number>`count(*)::int`,
        activeCount: sql<number>`count(*) FILTER (WHERE is_active = true)::int`,
        wonCount: sql<number>`count(*) FILTER (WHERE current_state = 'closed_won')::int`,
        lostCount: sql<number>`count(*) FILTER (WHERE current_state = 'closed_lost')::int`,
        totalValue: sql<string>`coalesce(sum(final_price), 0)::text`,
        avgValue: sql<string>`coalesce(avg(final_price), 0)::text`,
        avgDiscount: sql<string>`coalesce(avg(discount_percent), 0)::text`
      })
      .from(negotiations)
      .where(and(
        eq(negotiations.tenantId, tenantId),
        gte(negotiations.createdAt, dateRange.start),
        lte(negotiations.createdAt, dateRange.end),
        isNull(negotiations.deletedAt)
      ));

    return result[0];
  }
};
```

---

## 6. Standarde Workers și Queue Processing

### 6.1 Worker Architecture

```typescript
// ✅ DO: Use consistent worker structure

// workers/ai-conversation.worker.ts
import { Worker, Job, Queue } from 'bullmq';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { db } from '@/db';

interface AIConversationJobData {
  negotiationId: string;
  tenantId: string;
  messageContent: string;
  messageType: 'user' | 'system';
  metadata?: Record<string, unknown>;
}

interface AIConversationJobResult {
  success: boolean;
  response?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  error?: string;
}

// Worker configuration
const WORKER_CONFIG = {
  name: 'ai-conversation',
  concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY ?? '5', 10),
  limiter: {
    max: 100,
    duration: 60_000 // 100 jobs per minute
  },
  stalledInterval: 30_000,
  maxStalledCount: 2
};

// Create worker instance
export function createAIConversationWorker(
  connection: ConnectionOptions
): Worker<AIConversationJobData, AIConversationJobResult> {
  const worker = new Worker<AIConversationJobData, AIConversationJobResult>(
    WORKER_CONFIG.name,
    processAIConversationJob,
    {
      connection,
      concurrency: WORKER_CONFIG.concurrency,
      limiter: WORKER_CONFIG.limiter,
      stalledInterval: WORKER_CONFIG.stalledInterval,
      maxStalledCount: WORKER_CONFIG.maxStalledCount
    }
  );
  
  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info('AI conversation job completed', {
      jobId: job.id,
      negotiationId: job.data.negotiationId,
      tokensUsed: result.tokensUsed,
      processingTimeMs: result.processingTimeMs
    });
    
    metrics.increment('worker.ai_conversation.completed');
    metrics.histogram('worker.ai_conversation.processing_time', 
      result.processingTimeMs ?? 0);
  });
  
  worker.on('failed', (job, error) => {
    logger.error('AI conversation job failed', {
      jobId: job?.id,
      negotiationId: job?.data.negotiationId,
      error: error.message,
      stack: error.stack,
      attemptsMade: job?.attemptsMade
    });
    
    metrics.increment('worker.ai_conversation.failed');
  });
  
  worker.on('stalled', (jobId) => {
    logger.warn('AI conversation job stalled', { jobId });
    metrics.increment('worker.ai_conversation.stalled');
  });
  
  worker.on('error', (error) => {
    logger.error('AI conversation worker error', { error: error.message });
    metrics.increment('worker.ai_conversation.error');
  });
  
  return worker;
}

// Job processor
async function processAIConversationJob(
  job: Job<AIConversationJobData>
): Promise<AIConversationJobResult> {
  const startTime = Date.now();
  const { negotiationId, tenantId, messageContent, messageType } = job.data;
  
  // Update progress
  await job.updateProgress(10);
  
  try {
    // 1. Load conversation context
    const context = await loadConversationContext(tenantId, negotiationId);
    await job.updateProgress(20);
    
    // 2. Check guardrails
    const guardrailResult = await checkGuardrails(messageContent, context);
    if (!guardrailResult.passed) {
      return {
        success: false,
        error: `Guardrail failed: ${guardrailResult.reason}`,
        processingTimeMs: Date.now() - startTime
      };
    }
    await job.updateProgress(30);
    
    // 3. Generate AI response
    const aiResponse = await generateAIResponse({
      message: messageContent,
      context,
      negotiationId
    });
    await job.updateProgress(70);
    
    // 4. Validate response
    const validationResult = await validateAIResponse(aiResponse, context);
    if (!validationResult.valid) {
      // Trigger HITL if validation fails
      await createHITLApproval({
        type: 'ai_response_review',
        negotiationId,
        content: aiResponse,
        reason: validationResult.reason
      });
      
      return {
        success: false,
        error: 'Response requires human review',
        processingTimeMs: Date.now() - startTime
      };
    }
    await job.updateProgress(90);
    
    // 5. Save response
    await saveConversationMessage({
      negotiationId,
      content: aiResponse.text,
      role: 'assistant',
      metadata: {
        model: aiResponse.model,
        tokensUsed: aiResponse.usage.total_tokens
      }
    });
    await job.updateProgress(100);
    
    return {
      success: true,
      response: aiResponse.text,
      tokensUsed: aiResponse.usage.total_tokens,
      processingTimeMs: Date.now() - startTime
    };
    
  } catch (error) {
    const isRetryable = isRetryableError(error);
    
    if (isRetryable && job.attemptsMade < (job.opts.attempts ?? 3)) {
      throw error; // Let BullMQ retry
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime
    };
  }
}
```

### 6.2 Queue Management

```typescript
// ✅ DO: Use consistent queue configuration

// queues/index.ts
import { Queue, QueueEvents, QueueScheduler } from 'bullmq';

// Queue configuration factory
function createQueue<T>(
  name: string,
  options: Partial<QueueOptions> = {}
): Queue<T> {
  const defaultOptions: QueueOptions = {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: {
        age: 24 * 3600,  // Keep for 24 hours
        count: 1000      // Keep last 1000
      },
      removeOnFail: {
        age: 7 * 24 * 3600  // Keep failed for 7 days
      }
    }
  };
  
  return new Queue<T>(name, { ...defaultOptions, ...options });
}

// Queue definitions
export const queues = {
  aiConversation: createQueue<AIConversationJobData>('ai-conversation', {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      timeout: 60_000  // 60 seconds timeout
    }
  }),
  
  negotiationTransition: createQueue<NegotiationTransitionJobData>(
    'negotiation-transition',
    {
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 }
      }
    }
  ),
  
  efacturaSubmission: createQueue<EFacturaSubmissionJobData>(
    'efactura-submission',
    {
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 30_000 },  // 30s between retries
        timeout: 120_000  // 2 minutes timeout
      },
      limiter: {
        max: 10,
        duration: 60_000  // 10 per minute (ANAF rate limits)
      }
    }
  ),
  
  documentGeneration: createQueue<DocumentGenerationJobData>(
    'document-generation',
    {
      defaultJobOptions: {
        attempts: 2,
        timeout: 180_000  // 3 minutes for large documents
      }
    }
  ),
  
  sentimentAnalysis: createQueue<SentimentAnalysisJobData>(
    'sentiment-analysis',
    {
      defaultJobOptions: {
        attempts: 3,
        priority: 5  // Lower priority than conversations
      }
    }
  ),
  
  hitlEscalation: createQueue<HITLEscalationJobData>('hitl-escalation', {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 60_000 }  // SLA-driven
    }
  })
};

// Job addition with validation
export async function addJob<T extends object>(
  queue: Queue<T>,
  name: string,
  data: T,
  options?: JobsOptions
): Promise<Job<T>> {
  // Validate data before adding
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job data');
  }
  
  const job = await queue.add(name, data, options);
  
  logger.debug('Job added to queue', {
    queue: queue.name,
    jobId: job.id,
    jobName: name
  });
  
  return job;
}

// Bulk job addition
export async function addBulkJobs<T extends object>(
  queue: Queue<T>,
  jobs: Array<{ name: string; data: T; opts?: JobsOptions }>
): Promise<Job<T>[]> {
  const addedJobs = await queue.addBulk(jobs);
  
  logger.info('Bulk jobs added to queue', {
    queue: queue.name,
    count: addedJobs.length
  });
  
  return addedJobs;
}
```

### 6.3 Job Prioritization

```typescript
// ✅ DO: Implement priority-based processing

// Priority levels (lower = higher priority)
export enum JobPriority {
  CRITICAL = 1,    // System-critical operations
  HIGH = 2,        // User-facing immediate responses
  NORMAL = 3,      // Standard processing
  LOW = 4,         // Background tasks
  BATCH = 5        // Batch processing, can wait
}

// Priority mapping by job type
const JOB_PRIORITIES: Record<string, JobPriority> = {
  'hitl.critical_approval': JobPriority.CRITICAL,
  'hitl.high_approval': JobPriority.HIGH,
  'ai.conversation_response': JobPriority.HIGH,
  'negotiation.state_transition': JobPriority.NORMAL,
  'efactura.submission': JobPriority.NORMAL,
  'document.generation': JobPriority.NORMAL,
  'sentiment.analysis': JobPriority.LOW,
  'data.enrichment': JobPriority.LOW,
  'report.generation': JobPriority.BATCH,
  'cleanup.old_data': JobPriority.BATCH
};

// Add job with automatic priority
export async function addPrioritizedJob<T extends object>(
  queue: Queue<T>,
  jobType: string,
  data: T,
  overridePriority?: JobPriority
): Promise<Job<T>> {
  const priority = overridePriority ?? JOB_PRIORITIES[jobType] ?? JobPriority.NORMAL;
  
  return queue.add(jobType, data, { priority });
}

// Dynamic priority adjustment based on SLA
export function calculateDynamicPriority(
  baseType: string,
  metadata: {
    createdAt: Date;
    slaDeadline?: Date;
    retryCount?: number;
  }
): number {
  let priority = JOB_PRIORITIES[baseType] ?? JobPriority.NORMAL;
  
  // Increase priority if approaching SLA deadline
  if (metadata.slaDeadline) {
    const timeToDeadline = metadata.slaDeadline.getTime() - Date.now();
    const slaPercentRemaining = timeToDeadline / (metadata.slaDeadline.getTime() - metadata.createdAt.getTime());
    
    if (slaPercentRemaining < 0.25) {
      priority = Math.max(1, priority - 2);  // Bump up 2 levels
    } else if (slaPercentRemaining < 0.5) {
      priority = Math.max(1, priority - 1);  // Bump up 1 level
    }
  }
  
  // Increase priority for retries (prevent starvation)
  if (metadata.retryCount && metadata.retryCount > 2) {
    priority = Math.max(1, priority - 1);
  }
  
  return priority;
}
```

### 6.4 Dead Letter Queue Handling

```typescript
// ✅ DO: Implement proper DLQ handling

// Dead letter queue processor
export async function processDLQ(): Promise<void> {
  const dlqQueues = [
    'ai-conversation-dlq',
    'efactura-submission-dlq',
    'negotiation-transition-dlq'
  ];
  
  for (const queueName of dlqQueues) {
    const dlq = new Queue(queueName, { connection: redisConnection });
    const jobs = await dlq.getJobs(['failed'], 0, 100);
    
    for (const job of jobs) {
      try {
        // Analyze failure
        const analysis = analyzeJobFailure(job);
        
        if (analysis.canRecover) {
          // Move back to main queue with modifications
          const mainQueue = queues[analysis.originalQueue as keyof typeof queues];
          await mainQueue.add(job.name, {
            ...job.data,
            __recoveredFrom: 'dlq',
            __originalJobId: job.id,
            __failureAnalysis: analysis
          }, {
            priority: JobPriority.HIGH  // Prioritize recovered jobs
          });
          
          await job.remove();
          
          logger.info('Job recovered from DLQ', {
            jobId: job.id,
            queue: queueName,
            recovery: analysis.recoveryAction
          });
        } else {
          // Create HITL ticket for manual intervention
          await createHITLApproval({
            type: 'dlq_manual_review',
            priority: 'high',
            context: {
              jobId: job.id,
              queue: queueName,
              failedReason: job.failedReason,
              data: job.data,
              analysis
            }
          });
          
          logger.warn('Job requires manual intervention', {
            jobId: job.id,
            queue: queueName,
            reason: analysis.reason
          });
        }
      } catch (error) {
        logger.error('Error processing DLQ job', {
          jobId: job.id,
          queue: queueName,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }
  }
}

function analyzeJobFailure(job: Job): {
  canRecover: boolean;
  originalQueue: string;
  recoveryAction?: string;
  reason?: string;
} {
  const failedReason = job.failedReason ?? '';
  
  // Transient errors - can recover
  if (failedReason.includes('ETIMEDOUT') || 
      failedReason.includes('ECONNREFUSED') ||
      failedReason.includes('rate limit')) {
    return {
      canRecover: true,
      originalQueue: job.queueName.replace('-dlq', ''),
      recoveryAction: 'retry_with_backoff'
    };
  }
  
  // Data errors - needs manual review
  if (failedReason.includes('validation') ||
      failedReason.includes('not found') ||
      failedReason.includes('permission')) {
    return {
      canRecover: false,
      originalQueue: job.queueName.replace('-dlq', ''),
      reason: 'data_validation_failed'
    };
  }
  
  // Default - needs investigation
  return {
    canRecover: false,
    originalQueue: job.queueName.replace('-dlq', ''),
    reason: 'unknown_failure'
  };
}
```

---

## 7. Standarde AI/LLM Integration

### 7.1 LLM Client Configuration

```typescript
// ✅ DO: Use a unified LLM client with fallback support

// lib/llm/client.ts
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';

// LLM Provider configuration
interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

// Provider configurations
const PROVIDER_CONFIGS = {
  anthropic: {
    client: new Anthropic(),
    models: {
      primary: 'claude-3-5-sonnet-20241022',
      fast: 'claude-3-haiku-20240307'
    },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000 }
  },
  openai: {
    client: new OpenAI(),
    models: {
      primary: 'gpt-4o',
      fast: 'gpt-4o-mini'
    },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 150000 }
  },
  google: {
    client: new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!),
    models: {
      primary: 'gemini-2.0-pro',
      fast: 'gemini-2.0-flash'
    },
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 100000 }
  }
};

// Routing based on task type
const TASK_ROUTING: Record<string, LLMConfig> = {
  'conversation.response': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.7
  },
  'negotiation.analysis': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000,
    temperature: 0.3
  },
  'sentiment.analysis': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0
  },
  'document.summarization': {
    provider: 'google',
    model: 'gemini-2.0-flash',
    maxTokens: 1000,
    temperature: 0.2
  },
  'translation.romanian': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 2000,
    temperature: 0.1
  }
};

// Unified LLM client
export class LLMClient {
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.costTracker = new CostTracker();
  }
  
  async complete(
    taskType: string,
    params: {
      messages: Message[];
      systemPrompt?: string;
      tools?: Tool[];
    },
    options?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const config = { ...TASK_ROUTING[taskType], ...options };
    const startTime = Date.now();
    
    // Check rate limits
    await this.rateLimiter.acquire(config.provider);
    
    // Check cost cap
    if (this.costTracker.isOverBudget(config.provider)) {
      throw new LLMError(
        'Daily cost cap exceeded',
        config.provider,
        config.model
      );
    }
    
    try {
      const response = await this.callProvider(config, params);
      
      // Track metrics
      const latency = Date.now() - startTime;
      metrics.histogram('llm.latency', latency, { 
        provider: config.provider, 
        model: config.model,
        task: taskType
      });
      metrics.increment('llm.requests', { 
        provider: config.provider,
        status: 'success'
      });
      
      // Track costs
      this.costTracker.track(config, response.usage);
      
      logger.info('LLM request completed', {
        taskType,
        provider: config.provider,
        model: config.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs: latency
      });
      
      return response;
      
    } catch (error) {
      metrics.increment('llm.requests', { 
        provider: config.provider,
        status: 'error'
      });
      
      // Try fallback provider
      if (this.shouldFallback(error)) {
        return this.fallback(taskType, params, config);
      }
      
      throw error;
    }
  }
  
  private async callProvider(
    config: LLMConfig,
    params: { messages: Message[]; systemPrompt?: string; tools?: Tool[] }
  ): Promise<LLMResponse> {
    switch (config.provider) {
      case 'anthropic':
        return this.callAnthropic(config, params);
      case 'openai':
        return this.callOpenAI(config, params);
      case 'google':
        return this.callGoogle(config, params);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
  
  private async callAnthropic(
    config: LLMConfig,
    params: { messages: Message[]; systemPrompt?: string; tools?: Tool[] }
  ): Promise<LLMResponse> {
    const client = PROVIDER_CONFIGS.anthropic.client;
    
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens ?? 1000,
      temperature: config.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: params.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      tools: params.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      }))
    });
    
    return {
      content: response.content,
      stopReason: response.stop_reason,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      },
      model: response.model
    };
  }
  
  private shouldFallback(error: unknown): boolean {
    if (error instanceof Error) {
      // Rate limit or overload - fallback
      if (error.message.includes('rate_limit') ||
          error.message.includes('overloaded') ||
          error.message.includes('timeout')) {
        return true;
      }
    }
    return false;
  }
  
  private async fallback(
    taskType: string,
    params: { messages: Message[]; systemPrompt?: string; tools?: Tool[] },
    failedConfig: LLMConfig
  ): Promise<LLMResponse> {
    const fallbackOrder: Array<LLMConfig['provider']> = ['anthropic', 'openai', 'google'];
    const remaining = fallbackOrder.filter(p => p !== failedConfig.provider);
    
    for (const provider of remaining) {
      try {
        const fallbackConfig: LLMConfig = {
          provider,
          model: PROVIDER_CONFIGS[provider].models.primary,
          maxTokens: failedConfig.maxTokens,
          temperature: failedConfig.temperature
        };
        
        logger.warn('LLM fallback triggered', {
          originalProvider: failedConfig.provider,
          fallbackProvider: provider,
          taskType
        });
        
        return await this.callProvider(fallbackConfig, params);
      } catch (fallbackError) {
        continue;
      }
    }
    
    throw new LLMError(
      'All LLM providers failed',
      failedConfig.provider,
      failedConfig.model
    );
  }
}
```

### 7.2 Anti-Hallucination Guardrails

```typescript
// ✅ DO: Implement comprehensive guardrails

// lib/llm/guardrails.ts

interface GuardrailResult {
  passed: boolean;
  reason?: string;
  confidence: number;
  violations: GuardrailViolation[];
}

interface GuardrailViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  suggestedFix?: string;
}

// Guardrail checks
export async function checkGuardrails(
  input: string,
  output: string,
  context: ConversationContext
): Promise<GuardrailResult> {
  const violations: GuardrailViolation[] = [];
  
  // 1. Check for factual consistency
  const factualCheck = await checkFactualConsistency(output, context);
  if (!factualCheck.passed) {
    violations.push({
      type: 'factual_inconsistency',
      severity: 'high',
      details: factualCheck.details,
      suggestedFix: 'Verify claims against knowledge base'
    });
  }
  
  // 2. Check for price hallucination
  const priceCheck = checkPriceAccuracy(output, context.knownPrices);
  if (!priceCheck.passed) {
    violations.push({
      type: 'price_hallucination',
      severity: 'critical',
      details: priceCheck.details,
      suggestedFix: 'Replace with actual prices from product database'
    });
  }
  
  // 3. Check for commitment hallucination
  const commitmentCheck = checkUnauthorizedCommitments(output, context.permissions);
  if (!commitmentCheck.passed) {
    violations.push({
      type: 'unauthorized_commitment',
      severity: 'critical',
      details: commitmentCheck.details,
      suggestedFix: 'Remove commitment or route to HITL approval'
    });
  }
  
  // 4. Check for contact information leakage
  const piiCheck = checkPIILeakage(output);
  if (!piiCheck.passed) {
    violations.push({
      type: 'pii_leakage',
      severity: 'critical',
      details: piiCheck.details,
      suggestedFix: 'Remove or mask personal information'
    });
  }
  
  // 5. Check Romanian language quality
  const languageCheck = checkRomanianQuality(output);
  if (!languageCheck.passed) {
    violations.push({
      type: 'language_quality',
      severity: 'medium',
      details: languageCheck.details,
      suggestedFix: 'Review translation and grammar'
    });
  }
  
  // 6. Check for prohibited content
  const contentCheck = checkProhibitedContent(output);
  if (!contentCheck.passed) {
    violations.push({
      type: 'prohibited_content',
      severity: 'critical',
      details: contentCheck.details,
      suggestedFix: 'Remove prohibited content'
    });
  }
  
  // Calculate overall confidence
  const confidence = calculateConfidence(violations);
  
  return {
    passed: violations.filter(v => v.severity === 'critical').length === 0,
    reason: violations.length > 0 
      ? violations.map(v => v.details).join('; ')
      : undefined,
    confidence,
    violations
  };
}

// Price accuracy check
function checkPriceAccuracy(
  output: string,
  knownPrices: Map<string, number>
): { passed: boolean; details: string } {
  // Extract price mentions from output
  const priceRegex = /(\d+(?:[.,]\d+)?)\s*(RON|EUR|lei)/gi;
  const mentionedPrices = [...output.matchAll(priceRegex)];
  
  for (const match of mentionedPrices) {
    const price = parseFloat(match[1].replace(',', '.'));
    const currency = match[2].toUpperCase();
    
    // Check if this price is in our known prices
    const isKnownPrice = [...knownPrices.values()].some(
      knownPrice => Math.abs(knownPrice - price) < 0.01
    );
    
    if (!isKnownPrice) {
      return {
        passed: false,
        details: `Unverified price mentioned: ${price} ${currency}`
      };
    }
  }
  
  return { passed: true, details: '' };
}

// Unauthorized commitment check
function checkUnauthorizedCommitments(
  output: string,
  permissions: UserPermissions
): { passed: boolean; details: string } {
  const commitmentPatterns = [
    /garantăm|garantez|promit|asigur/gi,
    /vă oferim gratuit/gi,
    /discount special de (\d+)%/gi,
    /livrare gratuită/gi,
    /reducere suplimentară/gi
  ];
  
  for (const pattern of commitmentPatterns) {
    const match = output.match(pattern);
    if (match) {
      // Check if user has permission for this commitment
      if (!permissions.canMakeCommitments) {
        return {
          passed: false,
          details: `Unauthorized commitment detected: "${match[0]}"`
        };
      }
      
      // Check discount limits
      const discountMatch = match[0].match(/(\d+)%/);
      if (discountMatch) {
        const discount = parseInt(discountMatch[1], 10);
        if (discount > (permissions.maxDiscountPercent ?? 0)) {
          return {
            passed: false,
            details: `Discount ${discount}% exceeds max allowed ${permissions.maxDiscountPercent}%`
          };
        }
      }
    }
  }
  
  return { passed: true, details: '' };
}

// PII leakage check
function checkPIILeakage(output: string): { passed: boolean; details: string } {
  const piiPatterns = [
    { name: 'phone', pattern: /\b07\d{8}\b/g },
    { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { name: 'cnp', pattern: /\b[1-8]\d{12}\b/g },
    { name: 'iban', pattern: /\bRO\d{2}[A-Z]{4}\d{16}\b/g }
  ];
  
  for (const { name, pattern } of piiPatterns) {
    if (pattern.test(output)) {
      return {
        passed: false,
        details: `Potential ${name} leak detected in output`
      };
    }
  }
  
  return { passed: true, details: '' };
}
```

### 7.3 Prompt Engineering Standards

```typescript
// ✅ DO: Use structured prompt templates

// lib/llm/prompts/negotiation.ts

export const NEGOTIATION_SYSTEM_PROMPT = `
Ești un asistent de vânzări AI pentru Cerniq, specializat în produse agricole din România.

## Rolul Tău
- Asistarea clienților în procesul de achiziție
- Prezentarea produselor relevante pentru nevoile lor
- Negocierea în limitele aprobate
- Generarea de oferte profesionale

## Restricții OBLIGATORII
1. NICIODATĂ nu inventa prețuri - folosește DOAR prețurile din context
2. NICIODATĂ nu promite termene de livrare neconfirmate
3. NICIODATĂ nu oferi discounturi peste {{maxDiscount}}%
4. NICIODATĂ nu dezvălui informații despre alți clienți
5. ÎNTOTDEAUNA răspunde în limba română

## Limitele Tale
- Discount maxim autonom: {{maxDiscount}}%
- Pentru discounturi mai mari: solicită aprobare
- Pentru termene speciale: solicită confirmare
- Pentru produse indisponibile: oferă alternative

## Format Răspuns
Răspunde natural, profesional și concis. Evită:
- Fraze robotice sau rigide
- Promisiuni vagi
- Informații tehnice irelevante

{{#if context.previousMessages}}
## Istoric Conversație
{{context.previousMessages}}
{{/if}}

{{#if context.products}}
## Produse Disponibile
{{#each context.products}}
- {{this.name}}: {{this.price}} RON (stoc: {{this.stock}})
{{/each}}
{{/if}}
`;

// Prompt builder with validation
export function buildNegotiationPrompt(
  context: NegotiationContext
): { system: string; messages: Message[] } {
  // Validate context
  if (!context.contactId) {
    throw new Error('contactId is required');
  }
  
  // Build system prompt with context
  const system = NEGOTIATION_SYSTEM_PROMPT
    .replace('{{maxDiscount}}', String(context.maxDiscount ?? 10))
    .replace('{{context.previousMessages}}', formatMessages(context.previousMessages))
    .replace('{{context.products}}', formatProducts(context.products));
  
  // Build messages
  const messages: Message[] = [];
  
  // Add relevant context as assistant message if exists
  if (context.conversationSummary) {
    messages.push({
      role: 'assistant',
      content: `[Context intern: ${context.conversationSummary}]`
    });
  }
  
  // Add user message
  messages.push({
    role: 'user',
    content: context.userMessage
  });
  
  return { system, messages };
}

// Response format specifications
export const RESPONSE_SCHEMAS = {
  negotiationResponse: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Răspunsul către client în română'
      },
      suggestedProducts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            productId: { type: 'string' },
            reason: { type: 'string' }
          }
        }
      },
      intentDetected: {
        type: 'string',
        enum: ['inquiry', 'purchase', 'complaint', 'negotiation', 'other']
      },
      sentimentScore: {
        type: 'number',
        minimum: -1,
        maximum: 1
      },
      requiresHumanReview: {
        type: 'boolean'
      },
      reviewReason: {
        type: 'string'
      }
    },
    required: ['message', 'intentDetected', 'sentimentScore', 'requiresHumanReview']
  }
};
```

---

## 8. Standarde Logging și Observability

### 8.1 Structured Logging

```typescript
// ✅ DO: Use structured JSON logging

// lib/logger.ts
import pino from 'pino';

// Log levels
const LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
} as const;

// Logger configuration
const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: process.env.SERVICE_NAME ?? 'cerniq-api',
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.APP_VERSION ?? '0.0.0',
      pid: bindings.pid,
      hostname: bindings.hostname
    })
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  messageKey: 'message',
  errorKey: 'error',
  nestedKey: 'context',
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'apiKey',
      'token',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.apiKey',
      '*.token'
    ],
    censor: '[REDACTED]'
  }
};

// Create logger instance
export const logger = pino(loggerConfig);

// Child logger factory for contexts
export function createContextLogger(context: {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  negotiationId?: string;
  workerId?: string;
}): pino.Logger {
  return logger.child(context);
}

// Log entry interface
interface LogEntry {
  message: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  negotiationId?: string;
  duration?: number;
  error?: Error;
  [key: string]: unknown;
}

// Typed logging functions
export const log = {
  fatal: (entry: LogEntry) => logger.fatal(entry, entry.message),
  error: (entry: LogEntry) => {
    const { error, ...rest } = entry;
    if (error) {
      logger.error({
        ...rest,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error instanceof AppError && {
            code: error.code,
            statusCode: error.statusCode,
            context: error.context
          })
        }
      }, entry.message);
    } else {
      logger.error(rest, entry.message);
    }
  },
  warn: (entry: LogEntry) => logger.warn(entry, entry.message),
  info: (entry: LogEntry) => logger.info(entry, entry.message),
  debug: (entry: LogEntry) => logger.debug(entry, entry.message),
  trace: (entry: LogEntry) => logger.trace(entry, entry.message)
};
```

### 8.2 Request/Response Logging

```typescript
// ✅ DO: Log all HTTP requests with context

// plugins/request-logger.ts
import { FastifyPluginAsync } from 'fastify';
import { logger, createContextLogger } from '@/lib/logger';
import { randomUUID } from 'crypto';

export const requestLoggerPlugin: FastifyPluginAsync = async (fastify) => {
  // Add request ID to all requests
  fastify.addHook('onRequest', async (request) => {
    request.id = request.headers['x-request-id'] as string ?? randomUUID();
    request.startTime = Date.now();
    
    // Create context logger for this request
    request.log = createContextLogger({
      requestId: request.id,
      tenantId: request.user?.tenantId,
      userId: request.user?.id
    });
  });
  
  // Log request start
  fastify.addHook('preHandler', async (request) => {
    request.log.info({
      message: 'Request received',
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      contentLength: request.headers['content-length']
    });
  });
  
  // Log response
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - (request.startTime ?? Date.now());
    
    const logLevel = reply.statusCode >= 500 ? 'error' 
      : reply.statusCode >= 400 ? 'warn' 
      : 'info';
    
    request.log[logLevel]({
      message: 'Request completed',
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      contentLength: reply.getHeader('content-length')
    });
  });
  
  // Log errors
  fastify.addHook('onError', async (request, reply, error) => {
    request.log.error({
      message: 'Request error',
      method: request.method,
      url: request.url,
      error,
      duration: Date.now() - (request.startTime ?? Date.now())
    });
  });
};

// Request context type declaration
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}
```

### 8.3 Metrics Collection

```typescript
// ✅ DO: Collect comprehensive metrics

// lib/metrics.ts
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

// Create registry
const registry = new Registry();

// Default labels
registry.setDefaultLabels({
  service: process.env.SERVICE_NAME ?? 'cerniq-api',
  environment: process.env.NODE_ENV ?? 'development'
});

// HTTP metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry]
});

// Business metrics
export const negotiationsCreated = new Counter({
  name: 'negotiations_created_total',
  help: 'Total negotiations created',
  labelNames: ['tenant_id', 'source'],
  registers: [registry]
});

export const negotiationStateTransitions = new Counter({
  name: 'negotiation_state_transitions_total',
  help: 'Total negotiation state transitions',
  labelNames: ['from_state', 'to_state', 'trigger'],
  registers: [registry]
});

export const activeNegotiations = new Gauge({
  name: 'active_negotiations',
  help: 'Number of active negotiations',
  labelNames: ['tenant_id', 'state'],
  registers: [registry]
});

// LLM metrics
export const llmRequestDuration = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM request duration in seconds',
  labelNames: ['provider', 'model', 'task'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [registry]
});

export const llmTokensUsed = new Counter({
  name: 'llm_tokens_total',
  help: 'Total LLM tokens used',
  labelNames: ['provider', 'model', 'token_type'],
  registers: [registry]
});

export const llmCostEstimate = new Counter({
  name: 'llm_cost_estimate_cents',
  help: 'Estimated LLM cost in cents',
  labelNames: ['provider', 'model'],
  registers: [registry]
});

// Queue metrics
export const queueJobsProcessed = new Counter({
  name: 'queue_jobs_processed_total',
  help: 'Total queue jobs processed',
  labelNames: ['queue', 'status'],
  registers: [registry]
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Queue job processing duration',
  labelNames: ['queue', 'job_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [registry]
});

export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue', 'status'],
  registers: [registry]
});

// HITL metrics
export const hitlApprovalsTotal = new Counter({
  name: 'hitl_approvals_total',
  help: 'Total HITL approvals processed',
  labelNames: ['type', 'decision', 'priority'],
  registers: [registry]
});

export const hitlPendingApprovals = new Gauge({
  name: 'hitl_pending_approvals',
  help: 'Number of pending HITL approvals',
  labelNames: ['type', 'priority'],
  registers: [registry]
});

export const hitlApprovalDuration = new Histogram({
  name: 'hitl_approval_duration_seconds',
  help: 'Time from creation to decision',
  labelNames: ['type', 'priority'],
  buckets: [60, 300, 900, 1800, 3600, 14400, 28800],
  registers: [registry]
});

// Metrics helper
export const metrics = {
  increment: (name: string, labels?: Record<string, string>) => {
    // Dynamic counter increment
  },
  
  histogram: (name: string, value: number, labels?: Record<string, string>) => {
    // Dynamic histogram observe
  },
  
  gauge: (name: string, value: number, labels?: Record<string, string>) => {
    // Dynamic gauge set
  },
  
  getRegistry: () => registry
};
```

### 8.4 Distributed Tracing

```typescript
// ✅ DO: Implement OpenTelemetry tracing

// lib/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode, context, Span } from '@opentelemetry/api';

// Initialize SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME ?? 'cerniq-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION ?? '0.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development'
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://signoz:4318/v1/traces'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true }
    })
  ]
});

// Start SDK
sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown().then(
    () => console.log('Tracing terminated'),
    (error) => console.error('Error terminating tracing', error)
  );
});

// Tracer instance
const tracer = trace.getTracer('cerniq-api');

// Custom span wrapper
export function withSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    
    try {
      const result = await operation(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

// Usage example
async function processNegotiation(negotiationId: string): Promise<void> {
  await withSpan(
    'negotiation.process',
    async (span) => {
      span.setAttribute('negotiation.id', negotiationId);
      
      // Load data
      await withSpan('negotiation.load', async () => {
        // ...
      });
      
      // Process AI response
      await withSpan('llm.generate_response', async (llmSpan) => {
        llmSpan.setAttribute('llm.provider', 'anthropic');
        llmSpan.setAttribute('llm.model', 'claude-3-5-sonnet');
        // ...
      });
      
      // Save result
      await withSpan('negotiation.save', async () => {
        // ...
      });
    },
    { 'negotiation.id': negotiationId }
  );
}
```

---

## 9. Standarde Securitate

### 9.1 Authentication și Authorization

```typescript
// ✅ DO: Implement proper auth patterns

// plugins/auth.ts
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, decodeToken } from '@/lib/jwt';
import { getUserPermissions } from '@/services/auth.service';

interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Authentication decorator
  fastify.decorate('authenticate', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header'
        });
      }
      
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);
      
      if (!payload) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Invalid token'
        });
      }
      
      // Get full user with permissions
      const permissions = await getUserPermissions(payload.userId);
      
      request.user = {
        id: payload.userId,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
        permissions
      };
      
    } catch (error) {
      request.log.error({ error }, 'Authentication failed');
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication failed'
      });
    }
  });
  
  // Permission check decorator
  fastify.decorate('requirePermission', (permission: string) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Not authenticated'
        });
      }
      
      // Admin bypass
      if (request.user.role === 'admin') {
        return;
      }
      
      // Check specific permission
      if (!request.user.permissions.includes(permission)) {
        request.log.warn({
          userId: request.user.id,
          requiredPermission: permission,
          userPermissions: request.user.permissions
        }, 'Permission denied');
        
        return reply.code(403).send({
          error: 'FORBIDDEN',
          message: `Missing required permission: ${permission}`
        });
      }
    };
  });
  
  // Tenant isolation decorator
  fastify.decorate('requireTenant', async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const resourceTenantId = request.params.tenantId ?? request.body?.tenantId;
    
    if (resourceTenantId && resourceTenantId !== request.user.tenantId) {
      request.log.warn({
        userId: request.user.id,
        userTenantId: request.user.tenantId,
        resourceTenantId
      }, 'Cross-tenant access attempt');
      
      return reply.code(403).send({
        error: 'FORBIDDEN',
        message: 'Cannot access resources from another tenant'
      });
    }
  });
};

// Permission definitions
export const PERMISSIONS = {
  // Negotiations
  'negotiations:read': 'View negotiations',
  'negotiations:create': 'Create negotiations',
  'negotiations:update': 'Update negotiations',
  'negotiations:delete': 'Delete negotiations',
  'negotiations:transition': 'Transition negotiation state',
  
  // HITL
  'hitl:view': 'View HITL approvals',
  'hitl:approve': 'Approve HITL requests',
  'hitl:reject': 'Reject HITL requests',
  'hitl:escalate': 'Escalate HITL requests',
  
  // Products
  'products:read': 'View products',
  'products:update': 'Update products',
  'products:pricing': 'Modify pricing',
  
  // Contacts
  'contacts:read': 'View contacts',
  'contacts:create': 'Create contacts',
  'contacts:update': 'Update contacts',
  'contacts:delete': 'Delete contacts',
  
  // Admin
  'admin:users': 'Manage users',
  'admin:settings': 'Manage settings',
  'admin:audit': 'View audit logs'
} as const;
```

### 9.2 Data Validation și Sanitization

```typescript
// ✅ DO: Validate and sanitize all inputs

// lib/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Common validators
export const validators = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // CUI validation (Romanian company ID)
  cui: z.string()
    .regex(/^(RO)?[0-9]{2,10}$/, 'Invalid CUI format')
    .transform(val => val.replace(/^RO/, '')),
  
  // Romanian phone number
  phoneRO: z.string()
    .regex(/^(\+40|0)[0-9]{9}$/, 'Invalid Romanian phone number')
    .transform(val => val.startsWith('0') ? `+40${val.slice(1)}` : val),
  
  // Email with normalization
  email: z.string()
    .email('Invalid email format')
    .transform(val => val.toLowerCase().trim()),
  
  // Safe string (no HTML/XSS)
  safeString: z.string()
    .transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  
  // Price validation
  price: z.number()
    .positive('Price must be positive')
    .max(999999999.99, 'Price exceeds maximum')
    .transform(val => Math.round(val * 100) / 100),  // 2 decimal places
  
  // Percentage validation
  percentage: z.number()
    .min(0, 'Percentage must be non-negative')
    .max(100, 'Percentage cannot exceed 100'),
  
  // Date validation
  dateISO: z.string()
    .datetime({ message: 'Invalid ISO date format' })
    .transform(val => new Date(val)),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
  })
};

// Request body sanitizer
export function sanitizeRequestBody<T extends Record<string, unknown>>(
  body: T
): T {
  const sanitized = { ...body };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Remove potential XSS
      sanitized[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value as Record<string, unknown>) as T[keyof T];
    }
  }
  
  return sanitized;
}

// SQL injection prevention (for dynamic queries)
export function escapeIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

// Validation middleware factory
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitized = sanitizeRequestBody(request.body as Record<string, unknown>);
      request.body = schema.parse(sanitized);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      throw error;
    }
  };
}
```

### 9.3 Encryption și Data Protection

```typescript
// ✅ DO: Encrypt sensitive data

// lib/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive key from password
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return scryptAsync(password, salt, KEY_LENGTH) as Promise<Buffer>;
}

// Encrypt sensitive data
export async function encrypt(
  plaintext: string,
  encryptionKey: string
): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(encryptionKey, salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  // Combine: salt + iv + authTag + encrypted
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

// Decrypt sensitive data
export async function decrypt(
  encryptedData: string,
  encryptionKey: string
): Promise<string> {
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  
  const key = await deriveKey(encryptionKey, salt);
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

// Hash sensitive data (one-way)
export async function hashSensitive(data: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(data, salt, 64) as Buffer;
  
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// Verify hashed data
export async function verifyHash(data: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const originalHash = Buffer.from(hashHex, 'hex');
  
  const newHash = await scryptAsync(data, salt, 64) as Buffer;
  
  // Timing-safe comparison
  return originalHash.length === newHash.length &&
    require('crypto').timingSafeEqual(originalHash, newHash);
}

// Field-level encryption decorator for Drizzle
export function encryptedField(encryptionKey: string) {
  return {
    toDb: async (value: string) => encrypt(value, encryptionKey),
    fromDb: async (value: string) => decrypt(value, encryptionKey)
  };
}
```

### 9.4 GDPR Compliance

```typescript
// ✅ DO: Implement GDPR compliance utilities

// lib/gdpr.ts
import { db } from '@/db';
import { contacts, negotiations, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Data retention periods (days)
const RETENTION_PERIODS = {
  contacts: 365 * 3,        // 3 years
  negotiations: 365 * 5,    // 5 years
  auditLogs: 365 * 7,       // 7 years
  conversations: 365 * 2,   // 2 years
  tempData: 30              // 30 days
};

// Export user data (GDPR Article 15)
export async function exportUserData(
  tenantId: string,
  email: string
): Promise<UserDataExport> {
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.tenantId, tenantId),
      eq(contacts.email, email)
    ),
    with: {
      negotiations: {
        with: {
          messages: true,
          products: true
        }
      }
    }
  });
  
  if (!contact) {
    throw new Error('Contact not found');
  }
  
  // Compile export
  const exportData: UserDataExport = {
    exportDate: new Date().toISOString(),
    contact: {
      id: contact.id,
      email: contact.email,
      companyName: contact.companyName,
      cui: contact.cui,
      phone: contact.phone,
      address: contact.address,
      createdAt: contact.createdAt,
      metadata: contact.metadata
    },
    negotiations: contact.negotiations.map(n => ({
      id: n.id,
      state: n.currentState,
      createdAt: n.createdAt,
      messages: n.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.createdAt
      }))
    })),
    dataProcessing: {
      purposes: ['B2B sales communication', 'Product recommendations'],
      legalBasis: 'Article 6(1)(f) - Legitimate interest',
      retentionPeriod: `${RETENTION_PERIODS.contacts} days`
    }
  };
  
  // Log export for audit
  await db.insert(auditLogs).values({
    tenantId,
    action: 'GDPR_DATA_EXPORT',
    actorId: 'system',
    resourceType: 'contact',
    resourceId: contact.id,
    metadata: { email }
  });
  
  return exportData;
}

// Delete user data (GDPR Article 17)
export async function deleteUserData(
  tenantId: string,
  email: string,
  options: {
    hardDelete?: boolean;
    reason: string;
    requestedBy: string;
  }
): Promise<void> {
  const contact = await db.query.contacts.findFirst({
    where: and(
      eq(contacts.tenantId, tenantId),
      eq(contacts.email, email)
    )
  });
  
  if (!contact) {
    throw new Error('Contact not found');
  }
  
  // Check for legal hold
  if (contact.metadata?.legalHold) {
    throw new Error('Contact is under legal hold and cannot be deleted');
  }
  
  // Log before deletion
  await db.insert(auditLogs).values({
    tenantId,
    action: 'GDPR_DATA_DELETION',
    actorId: options.requestedBy,
    resourceType: 'contact',
    resourceId: contact.id,
    metadata: {
      email,
      reason: options.reason,
      hardDelete: options.hardDelete
    }
  });
  
  if (options.hardDelete) {
    // Permanent deletion
    await db.delete(contacts)
      .where(eq(contacts.id, contact.id));
      
    logger.info('Contact hard deleted (GDPR)', {
      contactId: contact.id,
      email,
      requestedBy: options.requestedBy
    });
  } else {
    // Anonymization (soft delete)
    await db.update(contacts)
      .set({
        email: `deleted_${contact.id}@anonymized.local`,
        companyName: '[DELETED]',
        phone: null,
        address: null,
        metadata: { deletedAt: new Date().toISOString(), reason: options.reason },
        deletedAt: new Date()
      })
      .where(eq(contacts.id, contact.id));
      
    logger.info('Contact anonymized (GDPR)', {
      contactId: contact.id,
      requestedBy: options.requestedBy
    });
  }
}

// Data retention cleanup
export async function runRetentionCleanup(): Promise<CleanupResult> {
  const now = new Date();
  const results: CleanupResult = {
    contactsDeleted: 0,
    negotiationsArchived: 0,
    logsDeleted: 0,
    tempDataDeleted: 0
  };
  
  // Cleanup old temporary data
  const tempCutoff = new Date(now.getTime() - RETENTION_PERIODS.tempData * 24 * 60 * 60 * 1000);
  // ... implementation
  
  logger.info('Retention cleanup completed', results);
  
  return results;
}
```

---

## 10. Standarde Testing

### 10.1 Test Organization

```typescript
// ✅ DO: Organize tests consistently

// Test file structure
// src/
// ├── services/
// │   ├── negotiation.service.ts
// │   └── __tests__/
// │       ├── negotiation.service.test.ts
// │       └── negotiation.service.integration.test.ts
// ├── workers/
// │   ├── ai-conversation.worker.ts
// │   └── __tests__/
// │       └── ai-conversation.worker.test.ts
// └── routes/
//     ├── negotiations/
//     │   ├── index.ts
//     │   └── __tests__/
//     │       └── negotiations.routes.test.ts

// Test naming conventions
// - Unit tests: *.test.ts
// - Integration tests: *.integration.test.ts
// - E2E tests: *.e2e.test.ts
// - Performance tests: *.perf.test.ts

// Test description format
describe('NegotiationService', () => {
  describe('create', () => {
    it('should create a negotiation with valid input', async () => {});
    it('should throw ValidationError when contactId is invalid', async () => {});
    it('should emit negotiation.created event on success', async () => {});
  });
  
  describe('transition', () => {
    it('should transition from initial to needs_analysis', async () => {});
    it('should reject invalid state transitions', async () => {});
    it('should create HITL approval for high-value negotiations', async () => {});
  });
});
```

### 10.2 Unit Testing Standards

```typescript
// ✅ DO: Write comprehensive unit tests

// services/__tests__/negotiation.service.test.ts
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NegotiationService } from '../negotiation.service';
import { createMockDb, createMockEventBus } from '@/test/mocks';

describe('NegotiationService', () => {
  let service: NegotiationService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  
  beforeEach(() => {
    mockDb = createMockDb();
    mockEventBus = createMockEventBus();
    service = new NegotiationService(mockDb, mockEventBus);
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  describe('create', () => {
    const validInput = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      contactId: 'contact-789',
      products: [{ productId: 'prod-1', quantity: 10 }]
    };
    
    it('should create a negotiation with valid input', async () => {
      // Arrange
      const expectedNegotiation = {
        id: 'neg-001',
        ...validInput,
        currentState: 'initial',
        createdAt: new Date()
      };
      
      mockDb.transaction.mockImplementation(async (fn) => {
        return fn({
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([expectedNegotiation])
            })
          })
        });
      });
      
      // Act
      const result = await service.create(validInput);
      
      // Assert
      expect(result).toEqual(expectedNegotiation);
      expect(result.currentState).toBe('initial');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'negotiation.created',
        expect.objectContaining({ negotiationId: 'neg-001' })
      );
    });
    
    it('should throw ValidationError when contactId is missing', async () => {
      // Arrange
      const invalidInput = { ...validInput, contactId: undefined };
      
      // Act & Assert
      await expect(service.create(invalidInput as any))
        .rejects
        .toThrow('contactId is required');
    });
    
    it('should rollback transaction on failure', async () => {
      // Arrange
      const error = new Error('DB connection failed');
      mockDb.transaction.mockRejectedValue(error);
      
      // Act & Assert
      await expect(service.create(validInput))
        .rejects
        .toThrow('DB connection failed');
      
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });
  
  describe('transition', () => {
    const negotiationId = 'neg-001';
    const tenantId = 'tenant-123';
    
    it('should transition from initial to needs_analysis', async () => {
      // Arrange
      const existingNegotiation = {
        id: negotiationId,
        currentState: 'initial',
        tenantId
      };
      
      vi.spyOn(service, 'getById').mockResolvedValue(existingNegotiation);
      
      mockDb.transaction.mockImplementation(async (fn) => fn(mockDb));
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      });
      
      // Act
      const result = await service.transition(
        tenantId,
        negotiationId,
        { type: 'ANALYZE_NEEDS', payload: {} }
      );
      
      // Assert
      expect(result.previousState).toBe('initial');
      expect(result.currentState).toBe('needs_analysis');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'negotiation.state_changed',
        expect.objectContaining({
          negotiationId,
          fromState: 'initial',
          toState: 'needs_analysis'
        })
      );
    });
    
    it('should reject invalid state transitions', async () => {
      // Arrange
      const existingNegotiation = {
        id: negotiationId,
        currentState: 'closed_won',  // Terminal state
        tenantId
      };
      
      vi.spyOn(service, 'getById').mockResolvedValue(existingNegotiation);
      
      // Act & Assert
      await expect(
        service.transition(tenantId, negotiationId, { type: 'ANALYZE_NEEDS', payload: {} })
      ).rejects.toThrow('Cannot process event');
    });
  });
});

// Mock factory
// test/mocks/db.mock.ts
export function createMockDb() {
  return {
    query: {
      negotiations: {
        findFirst: vi.fn(),
        findMany: vi.fn()
      }
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn()
  };
}

export function createMockEventBus() {
  return {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn()
  };
}
```

### 10.3 Integration Testing Standards

```typescript
// ✅ DO: Write integration tests for critical paths

// routes/__tests__/negotiations.routes.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '@/app';
import { seedTestData, cleanupTestData } from '@/test/helpers/db';
import { createTestUser, getAuthToken } from '@/test/helpers/auth';

describe('Negotiations Routes (Integration)', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let testTenantId: string;
  
  beforeAll(async () => {
    // Build app with test configuration
    app = await buildApp({ testing: true });
    
    // Create test user and get token
    const { user, token } = await createTestUser(app);
    testUserId = user.id;
    testTenantId = user.tenantId;
    authToken = token;
  });
  
  afterAll(async () => {
    await cleanupTestData(testTenantId);
    await app.close();
  });
  
  beforeEach(async () => {
    // Seed fresh test data
    await cleanupTestData(testTenantId);
    await seedTestData(testTenantId);
  });
  
  describe('POST /api/v1/negotiations', () => {
    it('should create a negotiation successfully', async () => {
      // Arrange
      const contactId = await seedTestContact(testTenantId);
      const requestBody = {
        contactId,
        title: 'Test Negotiation',
        products: [
          { productId: 'prod-1', quantity: 10 }
        ]
      };
      
      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/negotiations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: requestBody
      });
      
      // Assert
      expect(response.statusCode).toBe(201);
      
      const body = JSON.parse(response.body);
      expect(body.data).toMatchObject({
        contactId,
        currentState: 'initial',
        title: 'Test Negotiation'
      });
      expect(body.data.id).toBeDefined();
      
      // Verify in database
      const dbNegotiation = await app.negotiationService.getById(
        testTenantId,
        body.data.id
      );
      expect(dbNegotiation).toBeDefined();
      expect(dbNegotiation?.currentState).toBe('initial');
    });
    
    it('should return 400 for invalid contactId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/negotiations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          contactId: 'not-a-uuid'
        }
      });
      
      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });
    
    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/negotiations',
        payload: {
          contactId: 'any-id'
        }
      });
      
      expect(response.statusCode).toBe(401);
    });
  });
  
  describe('POST /api/v1/negotiations/:id/transition', () => {
    it('should transition negotiation state', async () => {
      // Arrange
      const negotiation = await seedTestNegotiation(testTenantId, {
        currentState: 'initial'
      });
      
      // Act
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/negotiations/${negotiation.id}/transition`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          type: 'ANALYZE_NEEDS',
          payload: {}
        }
      });
      
      // Assert
      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.data.previousState).toBe('initial');
      expect(body.data.currentState).toBe('needs_analysis');
    });
  });
});
```

### 10.4 E2E Testing Standards

```typescript
// ✅ DO: Write E2E tests for user journeys

// e2e/negotiation-flow.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Negotiation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@cerniq.app');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('should complete a full negotiation cycle', async ({ page }) => {
    // Step 1: Create negotiation
    await page.click('[data-testid="new-negotiation-button"]');
    await page.fill('[data-testid="contact-search"]', 'Ferma Test');
    await page.click('[data-testid="contact-option-0"]');
    await page.click('[data-testid="create-negotiation"]');
    
    await expect(page).toHaveURL(/\/negotiations\/[a-z0-9-]+/);
    await expect(page.locator('[data-testid="negotiation-state"]'))
      .toHaveText('Initial');
    
    // Step 2: Start conversation
    await page.fill('[data-testid="message-input"]', 'Bună ziua, sunt interesat de semințe de porumb');
    await page.click('[data-testid="send-message"]');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-response"]'))
      .toBeVisible({ timeout: 30000 });
    
    // Step 3: Check state transition
    await expect(page.locator('[data-testid="negotiation-state"]'))
      .toHaveText('Needs Analysis');
    
    // Step 4: Add products
    await page.click('[data-testid="add-product-button"]');
    await page.fill('[data-testid="product-search"]', 'Porumb P9400');
    await page.click('[data-testid="product-option-0"]');
    await page.fill('[data-testid="product-quantity"]', '1000');
    await page.click('[data-testid="confirm-product"]');
    
    // Step 5: Generate proposal
    await page.click('[data-testid="generate-proposal"]');
    await expect(page.locator('[data-testid="proposal-preview"]'))
      .toBeVisible({ timeout: 10000 });
    
    // Step 6: Send proposal
    await page.click('[data-testid="send-proposal"]');
    await expect(page.locator('[data-testid="negotiation-state"]'))
      .toHaveText('Proposal Sent');
    
    // Step 7: Mark as won
    await page.click('[data-testid="mark-won"]');
    await page.fill('[data-testid="final-price"]', '50000');
    await page.click('[data-testid="confirm-won"]');
    
    await expect(page.locator('[data-testid="negotiation-state"]'))
      .toHaveText('Closed Won');
  });
  
  test('should handle HITL approval flow', async ({ page }) => {
    // Navigate to HITL queue
    await page.click('[data-testid="nav-hitl"]');
    await expect(page).toHaveURL('/hitl');
    
    // Check pending approvals
    const pendingCount = await page.locator('[data-testid="pending-count"]').textContent();
    
    if (parseInt(pendingCount ?? '0') > 0) {
      // Open first approval
      await page.click('[data-testid="approval-item-0"]');
      
      // Review content
      await expect(page.locator('[data-testid="approval-content"]'))
        .toBeVisible();
      
      // Approve with comment
      await page.fill('[data-testid="approval-comment"]', 'Aprobat conform politicii');
      await page.click('[data-testid="approve-button"]');
      
      // Verify approval processed
      await expect(page.locator('[data-testid="approval-success"]'))
        .toBeVisible();
    }
  });
});
```

### 10.5 Test Coverage Requirements

```yaml
# vitest.config.ts coverage requirements
coverage:
  provider: v8
  reporter:
    - text
    - json
    - html
  
  # Global thresholds
  thresholds:
    global:
      lines: 80
      branches: 75
      functions: 80
      statements: 80
    
  # Per-file thresholds for critical code
  perFile:
    - path: 'src/services/**'
      thresholds:
        lines: 90
        branches: 85
        
    - path: 'src/lib/llm/**'
      thresholds:
        lines: 90
        branches: 85
        
    - path: 'src/lib/encryption.ts'
      thresholds:
        lines: 95
        branches: 95

# Required test types per module
testRequirements:
  services:
    - unit: required
    - integration: required
    
  routes:
    - unit: required
    - integration: required
    - e2e: recommended
    
  workers:
    - unit: required
    - integration: recommended
    
  lib/llm:
    - unit: required
    - integration: required
    - mocked external calls: required
    
  components:
    - unit: required
    - snapshot: optional
```

---

## 11. Standarde Documentație

### 11.1 Code Documentation

```typescript
// ✅ DO: Document public APIs with TSDoc

/**
 * Manages negotiation lifecycle and state transitions.
 * 
 * @remarks
 * This service implements the core negotiation FSM and coordinates
 * with AI services for automated responses.
 * 
 * @example
 * ```typescript
 * const service = new NegotiationService(db, eventBus, aiService);
 * 
 * // Create a new negotiation
 * const negotiation = await service.create({
 *   tenantId: 'tenant-123',
 *   contactId: 'contact-456',
 *   userId: 'user-789'
 * });
 * 
 * // Transition state
 * const result = await service.transition(
 *   tenantId,
 *   negotiation.id,
 *   { type: 'ANALYZE_NEEDS', payload: {} }
 * );
 * ```
 */
export class NegotiationService {
  /**
   * Creates a new negotiation for a contact.
   * 
   * @param params - Creation parameters
   * @param params.tenantId - Tenant identifier
   * @param params.contactId - Contact identifier (must exist)
   * @param params.userId - Creating user identifier
   * @param params.products - Optional initial products
   * @returns Created negotiation with initial state
   * 
   * @throws {ValidationError} When contactId is invalid
   * @throws {NotFoundError} When contact doesn't exist
   * 
   * @emits negotiation.created - After successful creation
   */
  async create(params: CreateNegotiationParams): Promise<Negotiation> {
    // Implementation
  }
  
  /**
   * Transitions negotiation to a new state.
   * 
   * @param tenantId - Tenant identifier for isolation
   * @param negotiationId - Negotiation to transition
   * @param event - State machine event to process
   * @returns Transition result with previous and new state
   * 
   * @throws {NotFoundError} When negotiation doesn't exist
   * @throws {NegotiationError} When transition is invalid
   * 
   * @emits negotiation.state_changed - After successful transition
   * 
   * @see {@link NegotiationFSM} for valid state transitions
   */
  async transition(
    tenantId: string,
    negotiationId: string,
    event: NegotiationEvent
  ): Promise<TransitionResult> {
    // Implementation
  }
}

// ✅ DO: Document complex types
/**
 * Negotiation state machine event.
 * 
 * @typeParam T - Event type identifier
 * @typeParam P - Payload type for the event
 */
type NegotiationEvent<
  T extends string = string,
  P extends Record<string, unknown> = Record<string, unknown>
> = {
  /** Event type identifier matching FSM transition triggers */
  type: T;
  /** Event payload with context-specific data */
  payload: P;
  /** Optional metadata for auditing */
  metadata?: {
    /** User who triggered the event */
    triggeredBy?: string;
    /** Timestamp of the event */
    timestamp?: Date;
    /** Source system */
    source?: 'api' | 'worker' | 'scheduler' | 'hitl';
  };
};
```

### 11.2 README Standards

```markdown
# Module Name

Brief description of what this module does (1-2 sentences).

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

```bash
npm install @cerniq/module-name
```

## Quick Start

```typescript
import { ModuleName } from '@cerniq/module-name';

const instance = new ModuleName(config);
await instance.doSomething();
```

## Configuration

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | - | API key for authentication |
| `timeout` | `number` | No | `30000` | Request timeout in ms |
| `retries` | `number` | No | `3` | Number of retry attempts |

## API Reference

### `methodName(params)`

Description of what the method does.

**Parameters:**

- `param1` (`string`) - Description of param1
- `param2` (`number`, optional) - Description of param2

**Returns:** `Promise<Result>` - Description of return value

**Example:**

```typescript
const result = await instance.methodName('value', 42);
```

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `ERR_001` | Invalid input | Check input validation |
| `ERR_002` | Rate limited | Wait and retry |

## Related Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Changelog](./CHANGELOG.md)

```

### 11.3 ADR (Architecture Decision Records)

```markdown
# ADR-XXX: Title of Decision

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-YYY]

**Date:** YYYY-MM-DD

**Decision Makers:** @person1, @person2

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision Drivers

- Driver 1 (e.g., performance requirements)
- Driver 2 (e.g., development velocity)
- Driver 3 (e.g., cost constraints)

## Considered Options

### Option 1: [Name]
- **Pros:** 
  - Pro 1
  - Pro 2
- **Cons:**
  - Con 1
  - Con 2

### Option 2: [Name]
- **Pros:**
  - Pro 1
- **Cons:**
  - Con 1
  - Con 2

### Option 3: [Name]
- **Pros:**
  - Pro 1
- **Cons:**
  - Con 1

## Decision

We will use Option X because [reasoning].

## Consequences

### Positive
- Consequence 1
- Consequence 2

### Negative
- Consequence 1
- Consequence 2

### Neutral
- Consequence 1

## Implementation Notes

Technical details needed for implementation.

## Related

- [ADR-001](./adr-001.md)
- [RFC-123](link-to-rfc)
```

---

## 12. Standarde Git și Version Control

### 12.1 Branch Naming

```bash
# Branch naming convention
# <type>/<ticket-id>-<short-description>

# Feature branches
feature/CERN-123-negotiation-fsm
feature/CERN-456-llm-fallback

# Bug fixes
fix/CERN-789-price-calculation
fix/CERN-012-memory-leak

# Hotfixes (production emergencies)
hotfix/CERN-345-security-patch

# Refactoring
refactor/CERN-678-cleanup-services

# Documentation
docs/CERN-901-api-documentation

# Chores (no ticket)
chore/update-dependencies
chore/ci-optimization

# Release branches
release/v1.2.0
```

### 12.2 Commit Message Format

```bash
# Commit message format (Conventional Commits)
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Types
# feat: New feature
# fix: Bug fix
# docs: Documentation only
# style: Formatting, no code change
# refactor: Code change that neither fixes bug nor adds feature
# perf: Performance improvement
# test: Adding missing tests
# chore: Maintenance tasks

# Examples

# Feature commit
feat(negotiations): add state machine for negotiation flow

Implement FSM for tracking negotiation states from initial
contact through to closed_won/closed_lost.

- Add NegotiationFSM class with state transitions
- Add transition validation
- Emit events on state changes

Closes CERN-123

# Bug fix commit
fix(pricing): correct discount calculation for bulk orders

Discount was being calculated before quantity adjustment,
leading to incorrect final prices for orders > 100 units.

Fixes CERN-456

# Breaking change commit
feat(api)!: change pagination response format

BREAKING CHANGE: Pagination response now uses 'pagination' wrapper
instead of flat fields. Update all clients to use:
- response.pagination.page
- response.pagination.totalItems

Migration guide: docs/migration/v2-pagination.md
```

### 12.3 Pull Request Standards

```markdown
## PR Title Format
# <type>(<scope>): <description> [CERN-XXX]

## PR Description Template

### Description
Brief description of what this PR does.

### Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

### Related Issues
- Closes #123
- Related to #456

### Changes Made
- Change 1
- Change 2
- Change 3

### Testing Done
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

### Screenshots (if UI changes)
Before | After
--- | ---
[screenshot] | [screenshot]

### Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings
- [ ] Security considerations addressed

### Deployment Notes
Any special deployment considerations or migration steps.

### Rollback Plan
Steps to rollback if issues are discovered.
```

### 12.4 Git Workflow

```bash
# Main branches
# - main: Production code
# - develop: Integration branch for features

# Feature development workflow
git checkout develop
git pull origin develop
git checkout -b feature/CERN-123-new-feature

# Work on feature
git add .
git commit -m "feat(scope): implement feature"

# Keep up to date with develop
git fetch origin
git rebase origin/develop

# Push and create PR
git push -u origin feature/CERN-123-new-feature

# After PR approval, squash merge to develop
# (done via GitHub UI)

# Release workflow
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Update version, changelog
npm version minor
git add .
git commit -m "chore(release): prepare v1.2.0"

# Create PR to main
# After approval, merge to main
# Tag release
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# Merge back to develop
git checkout develop
git merge release/v1.2.0
git push origin develop
```

---

## 13. Code Review Guidelines

### 13.1 Reviewer Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] Code does what the PR description says
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs

### Code Quality
- [ ] Code follows project standards
- [ ] No unnecessary complexity
- [ ] DRY principle followed
- [ ] Functions/methods are focused (single responsibility)
- [ ] Variable/function names are clear and descriptive

### Testing
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests are meaningful (not just for coverage)
- [ ] Tests are maintainable

### Security
- [ ] No sensitive data in code/logs
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Authentication/authorization correct

### Performance
- [ ] No N+1 queries
- [ ] Appropriate indexes used
- [ ] No memory leaks
- [ ] Async operations used appropriately

### Documentation
- [ ] Public APIs documented
- [ ] Complex logic explained
- [ ] README updated if needed
- [ ] Changelog updated

### Database
- [ ] Migrations are reversible
- [ ] Indexes added for queries
- [ ] No breaking schema changes without migration
```

### 13.2 Review Feedback Standards

```markdown
## Feedback Categories

### 🔴 Blocker (Must Fix)
Critical issues that must be addressed:
- Security vulnerabilities
- Data loss risk
- Breaking changes without migration
- Obvious bugs

### 🟡 Suggestion (Should Consider)
Improvements that should be considered:
- Performance optimizations
- Better error handling
- Code organization
- Missing tests

### 🟢 Nitpick (Optional)
Minor suggestions that are optional:
- Naming preferences
- Code style (not automated)
- Minor refactoring

### 💬 Question
Seeking clarification:
- Understanding design decisions
- Learning about unfamiliar patterns

## Feedback Examples

# Good feedback
🔴 **Security Issue**: The user ID is taken from request body instead of 
the authenticated session. This allows users to impersonate others.
Suggestion: Use `request.user.id` instead.

# Bad feedback
This is wrong.

# Good feedback
🟡 **Performance**: This query runs in a loop causing N+1 queries.
Consider using a JOIN or prefetching the related data.
```sql
-- Current (N+1)
SELECT * FROM negotiations WHERE id = ?  -- repeated N times

-- Suggested (1 query)
SELECT * FROM negotiations WHERE id IN (?, ?, ...)
```

# Bad feedback

Use a JOIN here.

```

### 13.3 Review Response Standards

```markdown
## Responding to Reviews

### Acknowledge feedback
- Reply to every comment
- Use reactions for acknowledgments (:+1:, :white_check_mark:)

### Agree and fix
> 🔴 Security Issue: User ID from body
✅ Good catch! Fixed in commit abc123.

### Disagree with reason
> 🟡 Use pattern X instead
I considered this, but pattern Y is more appropriate here because:
1. Reason 1
2. Reason 2
Would you like to discuss further?

### Ask for clarification
> 🟡 This seems wrong
Could you elaborate? I'm not sure what issue you're seeing.

### Defer to follow-up
> 🟢 Refactor this module
Created CERN-789 to address this in a follow-up PR to keep
this PR focused on the original scope.
```

---

## 14. Referințe și Resurse

### 14.1 Documente Interne

| Document | Descriere | Locație |
|----------|-----------|---------|
| Master Specification | Specificație normativă completă | `/mnt/project/__Cerniq_Master_Spec_Normativ_Complet.md` |
| Architecture (arc42) | Documentație arhitectură | `/mnt/project/Cerniq_App_Architecture_arc42_Vertical_Slice.md` |
| Coding Standards (Global) | Standarde generale | `/mnt/project/coding-standards.md` |
| Backup Strategy | Strategie backup | `/mnt/project/backup-strategy.md` |
| Etapa 3 Workers | Documentație workeri | `etapa3-workers-*.md` |
| Etapa 3 Schema | Schema baze de date | `etapa3-schema-*.md` |

### 14.2 Resurse Externe

**TypeScript & JavaScript:**

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

**React & Frontend:**

- [React Documentation](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

**Backend:**

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)

**Database:**

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)

**AI/LLM:**

- [Anthropic API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs/)

**Testing:**

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

### 14.3 Changelog

| Versiune | Data | Modificări |
|----------|------|------------|
| 1.0.0 | 2026-01-19 | Versiune inițială completă |

---

**Document generat pentru Cerniq App - Etapa 3**
**Ultima actualizare: 2026-01-19**
