# ADR-0010: Error Handling Pattern Standardizat

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm un pattern consistent pentru error handling care:

- Permite debugging ușor
- Include correlation IDs pentru tracing
- Respectă RFC 7807 (Problem Details)

## Decizie

Implementăm **Error Response Format Standard** bazat pe RFC 7807.

## Consecințe

### Pattern Standard

```typescript
// Error response format
interface ErrorResponse {
  error: {
    code: string;           // e.g., 'VALIDATION_ERROR', 'NOT_FOUND'
    message: string;        // Human-readable
    details?: unknown;      // Structured details (validation errors, etc.)
    stack?: string;         // Only in development
  };
  requestId: string;        // Pentru tracing
  timestamp: string;        // ISO 8601
}

// Custom error classes
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details: z.ZodError) {
    super('VALIDATION_ERROR', 'Validation failed', 400, details.errors);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}
```

### Global Error Handler

```typescript
fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;
  const code = error.code ?? 'INTERNAL_ERROR';
  
  // Log with correlation ID
  request.log.error({
    err: error,
    requestId: request.id,
    correlationId: request.headers['x-correlation-id'],
  });
  
  reply.status(statusCode).send({
    error: {
      code,
      message: error.message,
      details: error.details,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
});
```
