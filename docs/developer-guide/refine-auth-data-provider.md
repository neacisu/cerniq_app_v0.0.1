# Refine în SPA (`CerniqRefineProvider`)

## Rol

- **`@refinedev/core`** este folosit cu un **`dataProvider`** custom (`cerniqDataProvider`) care mapează resursele la [`/api/v1`](../../apps/web/src/providers/data-provider.tsx).
- **`authProvider`** nu înlocuiește `AuthProvider` / `ProtectedRoute`; reflectă același contract prin hook-ul `useAuth()`.

## Comportament autentificare

| Metodă | Comportament |
| ------ | ------------ |
| `check` | `authenticated` din [`refineAuthenticatedFromAuth`](../../apps/web/src/lib/refine-auth.ts): `true` când `loading` (`useAuth`, ca `ProtectedRoute`) sau când există `user`. |
| `login` | `success: false` — fluxul real este pagina `/login` + `AuthProvider.login`. |
| `logout` | Apelează `auth.logout()` și sugerează redirect la `/login`. |
| `getIdentity` | Din obiectul `user` persistat / `me`. |

## Dependențe

- Pachetul `@refinedev/react-table` este declarat în `package.json` dar **nu** este importat în sursele actuale; tabelele folosesc `@tanstack/react-table` direct. Eliminarea Refine ar necesita înlocuirea `dataProvider`-ului dacă se folosește din alte puncte.

## Legături

- [`apps/web/src/lib/refine-auth.ts`](../../apps/web/src/lib/refine-auth.ts)
- [`apps/web/src/providers/refine-provider.tsx`](../../apps/web/src/providers/refine-provider.tsx)
- [`apps/web/src/providers/auth-provider.tsx`](../../apps/web/src/providers/auth-provider.tsx)
- ADR [ADR-0012](../adr/ADR%20Etapa%200/ADR-0012-React-19-cu-Refine-v5.md) — context stack React + Refine
