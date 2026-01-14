# ADR-0018: Authentication Flow (JWT + Refresh Tokens)

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Cerniq.app necesită autentificare securizată pentru:

- API access
- Frontend SPA
- Mobile apps (viitor)

## Decizie

Utilizăm **JWT în HttpOnly cookies** cu **refresh token rotation**.

## Consecințe

### Pattern

```typescript
// Auth configuration
const authConfig = {
  accessToken: {
    expiresIn: '15m',          // 15 minute
    algorithm: 'RS256',
  },
  refreshToken: {
    expiresIn: '7d',           // 7 zile
    rotation: true,            // New refresh token la fiecare use
  },
  cookie: {
    name: 'auth_token',
    httpOnly: true,
    secure: true,              // HTTPS only
    sameSite: 'strict',
    path: '/',
  },
};

// Fastify JWT plugin
fastify.register(fastifyJwt, {
  secret: {
    private: readSecret('JWT_PRIVATE_KEY'),
    public: readSecret('JWT_PUBLIC_KEY'),
  },
  sign: { algorithm: 'RS256' },
  cookie: authConfig.cookie,
});
```

### Token Payload

```typescript
interface JWTPayload {
  sub: string;           // User ID
  tenantId: string;      // Tenant ID
  role: string;          // User role
  permissions: string[]; // RBAC permissions
  iat: number;
  exp: number;
}
```
