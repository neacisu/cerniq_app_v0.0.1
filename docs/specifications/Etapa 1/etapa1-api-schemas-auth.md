# CERNIQ.APP — ETAPA 1: API SCHEMAS & AUTHENTICATION

## Request/Response Validation & Auth System

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. API VALIDATION SCHEMAS

### 1.1 Common Schemas

```typescript
// packages/validation/src/schemas/common.ts

import { z } from 'zod';

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Date range
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  (data) => !data.from || !data.to || data.from <= data.to,
  { message: 'from date must be before to date' }
);

// Romanian CUI
export const cuiSchema = z.string()
  .transform((val) => val.replace(/\s+/g, '').replace(/^RO/i, ''))
  .pipe(z.string().regex(/^\d{6,10}$/, 'CUI must be 6-10 digits'));

// Romanian phone
export const phoneRoSchema = z.string()
  .transform((val) => val.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(\+40|0)[2-9]\d{8}$/, 'Invalid Romanian phone number'));

// Email
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .transform((val) => val.toLowerCase().trim());

// Generic response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    meta: z.object({
      page: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      totalPages: z.number().optional(),
    }).optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    }).optional(),
  });
```

### 1.2 Bronze Schemas

```typescript
// packages/validation/src/schemas/bronze.ts

import { z } from 'zod';
import { cuiSchema, emailSchema, phoneRoSchema, paginationSchema } from './common';

// Create bronze contact
export const createBronzeContactSchema = z.object({
  extractedName: z.string().min(2).max(255),
  extractedCui: cuiSchema.optional(),
  extractedEmail: emailSchema.optional(),
  extractedPhone: phoneRoSchema.optional(),
  extractedAddress: z.string().max(500).optional(),
  extractedWebsite: z.string().url().optional(),
  sourceType: z.enum(['csv', 'xlsx', 'xls', 'api', 'webhook', 'manual']),
  externalId: z.string().max(255).optional(),
  rawPayload: z.record(z.any()).optional(),
});

export type CreateBronzeContactInput = z.infer<typeof createBronzeContactSchema>;

// List bronze contacts query
export const listBronzeContactsSchema = paginationSchema.extend({
  processingStatus: z.enum([
    'pending', 'processing', 'validated', 'promoted', 
    'failed', 'duplicate', 'invalid'
  ]).optional(),
  batchId: z.string().uuid().optional(),
  sourceType: z.enum(['csv', 'xlsx', 'xls', 'api', 'webhook', 'manual']).optional(),
  search: z.string().max(100).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type ListBronzeContactsInput = z.infer<typeof listBronzeContactsSchema>;

// Import configuration
export const importConfigSchema = z.object({
  hasHeader: z.boolean().default(true),
  delimiter: z.enum([',', ';', '\t', '|']).default(','),
  encoding: z.enum(['utf-8', 'windows-1252', 'iso-8859-1']).default('utf-8'),
  sheetName: z.string().optional(),
  mapping: z.object({
    name: z.string().min(1),
    cui: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    website: z.string().optional(),
  }),
  skipDuplicates: z.boolean().default(true),
  validateCui: z.boolean().default(true),
});

export type ImportConfigInput = z.infer<typeof importConfigSchema>;
```

### 1.3 Silver Schemas

```typescript
// packages/validation/src/schemas/silver.ts

import { z } from 'zod';
import { cuiSchema, emailSchema, phoneRoSchema, paginationSchema, uuidSchema } from './common';

// Silver company filter
export const listSilverCompaniesSchema = paginationSchema.extend({
  enrichmentStatus: z.enum([
    'pending', 'in_progress', 'complete', 'partial', 'failed'
  ]).optional(),
  promotionStatus: z.enum([
    'eligible', 'review_required', 'blocked', 'promoted'
  ]).optional(),
  isAgricultural: z.coerce.boolean().optional(),
  agriculturalCategory: z.enum([
    'CULTIVARE', 'SILVICULTURA', 'PESCUIT'
  ]).optional(),
  judet: z.string().max(50).optional(),
  localitate: z.string().max(100).optional(),
  minQualityScore: z.coerce.number().min(0).max(100).optional(),
  maxQualityScore: z.coerce.number().min(0).max(100).optional(),
  isMasterRecord: z.coerce.boolean().default(true),
  search: z.string().max(100).optional(),
  cui: cuiSchema.optional(),
});

export type ListSilverCompaniesInput = z.infer<typeof listSilverCompaniesSchema>;

// Update silver company (manual edit)
export const updateSilverCompanySchema = z.object({
  // Editable fields only
  emailPrincipal: emailSchema.optional(),
  telefonPrincipal: phoneRoSchema.optional(),
  website: z.string().url().optional(),
  adresaCompleta: z.string().max(500).optional(),
  localitate: z.string().max(100).optional(),
  judet: z.string().max(50).optional(),
  codPostal: z.string().regex(/^\d{6}$/).optional(),
  suprafataAgricola: z.number().min(0).max(100000).optional(),
  culturiPrincipale: z.array(z.string()).max(10).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' }
);

export type UpdateSilverCompanyInput = z.infer<typeof updateSilverCompanySchema>;

// Trigger enrichment
export const triggerEnrichmentSchema = z.object({
  sources: z.array(z.enum([
    'anaf', 'termene', 'onrc', 'email', 'phone', 
    'scraping', 'geocoding', 'agricultural'
  ])).min(1).optional(),
  force: z.boolean().default(false),
});

export type TriggerEnrichmentInput = z.infer<typeof triggerEnrichmentSchema>;

// Dedup review decision
export const dedupDecisionSchema = z.object({
  decision: z.enum(['merge', 'reject']),
  masterId: uuidSchema.optional(), // Which record becomes master
  reason: z.string().max(500).optional(),
});

export type DedupDecisionInput = z.infer<typeof dedupDecisionSchema>;
```

### 1.4 Gold Schemas

```typescript
// packages/validation/src/schemas/gold.ts

import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common';

// Gold company filter
export const listGoldCompaniesSchema = paginationSchema.extend({
  currentState: z.enum([
    'COLD', 'WARM', 'HOT', 'QUALIFIED', 'CONVERTED', 'LOST'
  ]).optional(),
  assignedTo: uuidSchema.optional(),
  unassigned: z.coerce.boolean().optional(),
  minLeadScore: z.coerce.number().min(0).max(100).optional(),
  minFitScore: z.coerce.number().min(0).max(100).optional(),
  isAgricultural: z.coerce.boolean().optional(),
  judet: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
  hasNextAction: z.coerce.boolean().optional(),
  nextActionBefore: z.coerce.date().optional(),
});

export type ListGoldCompaniesInput = z.infer<typeof listGoldCompaniesSchema>;

// Update lead state
export const updateLeadStateSchema = z.object({
  newState: z.enum([
    'COLD', 'WARM', 'HOT', 'QUALIFIED', 'CONVERTED', 'LOST'
  ]),
  reason: z.string().max(500).optional(),
});

export type UpdateLeadStateInput = z.infer<typeof updateLeadStateSchema>;

// Assign lead
export const assignLeadSchema = z.object({
  assignTo: uuidSchema,
});

export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

// Schedule next action
export const scheduleActionSchema = z.object({
  nextActionAt: z.coerce.date(),
  nextActionType: z.enum([
    'call', 'email', 'meeting', 'follow_up', 'demo', 'proposal'
  ]),
  notes: z.string().max(1000).optional(),
});

export type ScheduleActionInput = z.infer<typeof scheduleActionSchema>;
```

### 1.5 HITL Schemas

```typescript
// packages/validation/src/schemas/hitl.ts

import { z } from 'zod';
import { paginationSchema, uuidSchema } from './common';

// List approval tasks
export const listApprovalTasksSchema = paginationSchema.extend({
  status: z.enum([
    'pending', 'assigned', 'approved', 'rejected', 
    'escalated', 'expired', 'cancelled'
  ]).optional(),
  approvalType: z.enum([
    'dedup_review', 'quality_review', 'ai_structuring_review',
    'ai_merge_review', 'low_confidence_review', 'data_anomaly',
    'manual_verification', 'error_review'
  ]).optional(),
  priority: z.enum(['critical', 'high', 'normal', 'low']).optional(),
  assignedTo: uuidSchema.optional(),
  unassigned: z.coerce.boolean().optional(),
  overdue: z.coerce.boolean().optional(),
  pipelineStage: z.string().max(10).optional(),
});

export type ListApprovalTasksInput = z.infer<typeof listApprovalTasksSchema>;

// Assign task
export const assignTaskSchema = z.object({
  userId: uuidSchema,
});

export type AssignTaskInput = z.infer<typeof assignTaskSchema>;

// Make decision
export const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'merge', 'skip']),
  reason: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export type DecisionInput = z.infer<typeof decisionSchema>;

// Escalate task
export const escalateTaskSchema = z.object({
  escalateTo: uuidSchema,
  reason: z.string().min(10).max(500),
});

export type EscalateTaskInput = z.infer<typeof escalateTaskSchema>;
```

---

## 2. AUTHENTICATION SYSTEM

### 2.1 Auth Configuration

```typescript
// packages/auth/src/config.ts

export const AUTH_CONFIG = {
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'cerniq.app',
    audience: 'cerniq-api',
  },
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: 12,
  },
};
```

### 2.2 JWT Service

```typescript
// packages/auth/src/jwt.service.ts

import jwt from 'jsonwebtoken';
import { AUTH_CONFIG } from './config';

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
  tokenFamily: string;
}

export class JWTService {
  /**
   * Generate access token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      AUTH_CONFIG.jwt.accessTokenSecret,
      {
        expiresIn: AUTH_CONFIG.jwt.accessTokenExpiry,
        issuer: AUTH_CONFIG.jwt.issuer,
        audience: AUTH_CONFIG.jwt.audience,
      }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: TokenPayload, tokenFamily: string): string {
    return jwt.sign(
      { ...payload, type: 'refresh', tokenFamily },
      AUTH_CONFIG.jwt.refreshTokenSecret,
      {
        expiresIn: AUTH_CONFIG.jwt.refreshTokenExpiry,
        issuer: AUTH_CONFIG.jwt.issuer,
        audience: AUTH_CONFIG.jwt.audience,
      }
    );
  }

  /**
   * Generate token pair
   */
  generateTokenPair(payload: TokenPayload): {
    accessToken: string;
    refreshToken: string;
    tokenFamily: string;
  } {
    const tokenFamily = crypto.randomUUID();
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload, tokenFamily),
      tokenFamily,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, AUTH_CONFIG.jwt.accessTokenSecret, {
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }) as AccessTokenPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = jwt.verify(token, AUTH_CONFIG.jwt.refreshTokenSecret, {
      issuer: AUTH_CONFIG.jwt.issuer,
      audience: AUTH_CONFIG.jwt.audience,
    }) as RefreshTokenPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  }
}

export const jwtService = new JWTService();
```

### 2.3 Auth Middleware

```typescript
// apps/api/src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { jwtService, AccessTokenPayload } from '@cerniq/auth';
import { db } from '@cerniq/db';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      tenantId: string;
      userEmail: string;
      userRole: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.slice(7);

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    // Set request context
    req.userId = payload.userId;
    req.tenantId = payload.tenantId;
    req.userEmail = payload.email;
    req.userRole = payload.role;

    // Set PostgreSQL context for RLS
    await db.execute(sql`
      SELECT set_config('app.current_tenant_id', ${payload.tenantId}, true),
             set_config('app.current_user_id', ${payload.userId}, true)
    `);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
    }
    next();
  };
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = jwtService.verifyAccessToken(token);
      
      req.userId = payload.userId;
      req.tenantId = payload.tenantId;
      req.userEmail = payload.email;
      req.userRole = payload.role;

      await db.execute(sql`
        SELECT set_config('app.current_tenant_id', ${payload.tenantId}, true),
               set_config('app.current_user_id', ${payload.userId}, true)
      `);
    } catch {
      // Ignore errors for optional auth
    }
  }
  
  next();
}
```

### 2.4 Auth Routes

```typescript
// apps/api/src/routes/auth.routes.ts

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { jwtService } from '@cerniq/auth';
import { db, users, refreshTokens } from '@cerniq/db';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../middleware/validate';
import { AUTH_CONFIG } from '@cerniq/auth/config';

const router = Router();

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(AUTH_CONFIG.password.minLength)
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  name: z.string().min(2).max(100),
  tenantId: z.string().uuid(),
});

// POST /api/v1/auth/login
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    });
  }

  // Check if user is active
  if (!user.active) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCOUNT_DISABLED',
        message: 'Account is disabled',
      },
    });
  }

  // Generate tokens
  const { accessToken, refreshToken, tokenFamily } = jwtService.generateTokenPair({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
  });

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenFamily,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Update last login
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    },
  });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Refresh token required',
      },
    });
  }

  try {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Check if token family is valid
    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.userId, payload.userId),
        eq(refreshTokens.tokenFamily, payload.tokenFamily),
        eq(refreshTokens.revoked, false)
      ),
    });

    if (!storedToken) {
      // Token reuse detected - revoke all tokens for user
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.userId, payload.userId));

      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REUSE',
          message: 'Token reuse detected',
        },
      });
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or disabled',
        },
      });
    }

    // Rotate refresh token
    const newTokens = jwtService.generateTokenPair({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    // Revoke old token, store new
    await db.update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenFamily: newTokens.tokenFamily,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      },
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      const payload = jwtService.verifyRefreshToken(refreshToken);
      
      // Revoke token family
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(and(
          eq(refreshTokens.userId, payload.userId),
          eq(refreshTokens.tokenFamily, payload.tokenFamily)
        ));
    } catch {
      // Ignore errors during logout
    }
  }

  res.json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
});

export default router;
```

---

## 3. REQUEST VALIDATION MIDDLEWARE

```typescript
// apps/api/src/middleware/validate.ts

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  target?: ValidationTarget;
  stripUnknown?: boolean;
}

export function validateRequest<T extends ZodSchema>(
  schema: T,
  options: ValidationOptions = {}
) {
  const { target = 'body', stripUnknown = true } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      
      const parseOptions = stripUnknown ? { strict: false } : { strict: true };
      const parsed = await schema.parseAsync(data, parseOptions);
      
      // Replace with parsed/transformed data
      req[target] = parsed;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Validation error',
        },
      });
    }
  };
}

// Shorthand validators
export const validateBody = <T extends ZodSchema>(schema: T) =>
  validateRequest(schema, { target: 'body' });

export const validateQuery = <T extends ZodSchema>(schema: T) =>
  validateRequest(schema, { target: 'query' });

export const validateParams = <T extends ZodSchema>(schema: T) =>
  validateRequest(schema, { target: 'params' });
```

---

## 4. ERROR HANDLING

```typescript
// apps/api/src/middleware/error-handler.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '@cerniq/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      userId: req.userId,
      tenantId: req.tenantId,
    },
  });

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Handle Drizzle errors
  if (err.name === 'PostgresError') {
    const pgError = err as any;
    
    if (pgError.code === '23505') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Resource already exists',
        },
      });
    }

    if (pgError.code === '23503') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced resource not found',
        },
      });
    }
  }

  // Default 500 error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
    },
  });
}
```

---

## 5. RLS CONTEXT

```typescript
// packages/db/src/rls.ts

import { sql } from 'drizzle-orm';
import { db } from './client';

/**
 * Execute query within RLS context
 */
export async function withRLSContext<T>(
  tenantId: string,
  userId: string,
  callback: () => Promise<T>
): Promise<T> {
  // Set context
  await db.execute(sql`
    SELECT 
      set_config('app.current_tenant_id', ${tenantId}, true),
      set_config('app.current_user_id', ${userId}, true)
  `);

  try {
    return await callback();
  } finally {
    // Clear context
    await db.execute(sql`
      SELECT 
        set_config('app.current_tenant_id', '', true),
        set_config('app.current_user_id', '', true)
    `);
  }
}

/**
 * Transaction with RLS context
 */
export async function transactionWithRLS<T>(
  tenantId: string,
  userId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT 
        set_config('app.current_tenant_id', ${tenantId}, true),
        set_config('app.current_user_id', ${userId}, true)
    `);
    
    return callback(tx);
  });
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
