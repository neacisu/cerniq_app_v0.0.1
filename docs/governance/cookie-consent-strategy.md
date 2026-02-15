# CERNIQ.APP — Cookie Consent Strategy

## ePrivacy Directive + GDPR Compliance

**Document ID:** COOKIE-001  
**Versiune:** 1.0  
**Data:** 01 Februarie 2026  
**Status:** APROBAT

---

## 1. Scopul Documentului

Acest document definește strategia de gestionare a cookie-urilor și mecanismul de consent pentru Cerniq.app, în conformitate cu:

- **GDPR** (Regulamentul 2016/679) — Art. 6, 7
- **ePrivacy Directive** (2002/58/EC, modificată de 2009/136/EC)
- **Legea 506/2004** (România) — Comunicații electronice
- **Recomandări EDPB** — Guidelines 05/2020 on consent

---

## 2. Categorii de Cookies

### 2.1 Clasificare

| Categorie              | Descriere                                  | Consent Necesar | Legal Basis           |
| ---------------------- | ------------------------------------------ | --------------- | --------------------- |
| **Strictly Necessary** | Esențiale pentru funcționarea site-ului    | ❌ NU           | Art. 6(1)(b) Contract |
| **Functionality**      | Preferințe utilizator, setări UI           | ✅ DA           | Art. 6(1)(a) Consent  |
| **Analytics**          | Măsurare performanță, comportament agregat | ✅ DA           | Art. 6(1)(a) Consent  |
| **Marketing**          | Retargeting, personalizare reclame         | ✅ DA           | Art. 6(1)(a) Consent  |

### 2.2 Inventar Cookies

| Cookie Name      | Categorie     | Provider                    | Scop                               | Durată  | First/Third Party |
| ---------------- | ------------- | --------------------------- | ---------------------------------- | ------- | ----------------- |
| `cerniq_session` | Necessary     | Cerniq.app                  | Session management                 | Session | First             |
| `cerniq_auth`    | Necessary     | Cerniq.app                  | JWT authentication                 | 7 zile  | First             |
| `cerniq_csrf`    | Necessary     | Cerniq.app                  | CSRF protection                    | Session | First             |
| `cerniq_consent` | Necessary     | Cerniq.app                  | Consent preferences storage        | 12 luni | First             |
| `cerniq_locale`  | Functionality | Cerniq.app                  | Preferință limbă                   | 1 an    | First             |
| `cerniq_theme`   | Functionality | Cerniq.app                  | Dark/Light mode                    | 1 an    | First             |
| `cerniq_sidebar` | Functionality | Cerniq.app                  | Sidebar state                      | 1 an    | First             |
| _(rezervat)_     | Analytics     | Observability (self-hosted) | Telemetrie RUM (daca se activeaza) | -       | First             |

> **Notă:** În prezent, Cerniq.app NU utilizează cookies de marketing/retargeting. Dacă se vor adăuga în viitor, acest document va fi actualizat.

---

## 3. Cerințe Cookie Banner

### 3.1 Principii EDPB

| Principiu            | Implementare                                                                |
| -------------------- | --------------------------------------------------------------------------- |
| **Prior Consent**    | Cookies non-esențiale blocate până la obținerea consimțământului            |
| **Granular Choice**  | Utilizatorul poate accepta/refuza pe categorie                              |
| **Equal Options**    | Butoanele "Accept" și "Reject" au aceeași vizibilitate                      |
| **Informed Consent** | Scop, durată, terți afișați clar                                            |
| **Easy Withdrawal**  | Posibilitate de retragere la fel de ușoară ca acordarea                     |
| **No Cookie Walls**  | Accesul la serviciu nu este condiționat de acceptarea cookies non-esențiale |

### 3.2 Specificații UI Banner

```
┌─────────────────────────────────────────────────────────────────────┐
│  🍪 Folosim cookies pentru a îmbunătăți experiența ta              │
│                                                                     │
│  Folosim cookies strict necesare pentru funcționarea site-ului.    │
│  Cu permisiunea ta, folosim și cookies pentru analiză și           │
│  preferințe.                                                        │
│                                                                     │
│  [Politica Cookies]  [Setări]                                      │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ Refuză toate   │  │ Acceptă toate  │  │ Personalizează │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Modal Personalizare

```
┌─────────────────────────────────────────────────────────────────────┐
│  Setări Cookies                                              [X]   │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  ☑ Strict Necesare (nu pot fi dezactivate)                         │
│    Session, autentificare, securitate                              │
│                                                                     │
│  ☐ Funcționalitate                                                 │
│    Preferințe limbă, temă, setări UI                               │
│                                                                     │
│  ☐ Analiză                                                         │
│    Măsurare performanță și comportament agregat                    │
│                                                                     │
│  ┌────────────────────┐                                            │
│  │ Salvează preferințe│                                            │
│  └────────────────────┘                                            │
│                                                                     │
│  Mai multe detalii în [Politica de Confidențialitate]              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementare Tehnică

### 4.1 Stack Tehnologic

| Component               | Tehnologie                           | Responsabilitate |
| ----------------------- | ------------------------------------ | ---------------- |
| **Banner UI**           | React component custom (`apps/web/`) | Frontend         |
| **State Management**    | React Context + localStorage         | Frontend         |
| **Server-side Control** | Fastify middleware                   | Backend          |
| **Consent Storage**     | PostgreSQL `user_consent_logs`       | Backend          |
| **Cookie Control**      | HTTP headers `Set-Cookie`            | Backend          |

### 4.2 Componente React

```
apps/web/src/
├── components/
│   └── cookies/
│       ├── CookieBanner.tsx       # Banner principal
│       ├── CookieModal.tsx        # Modal personalizare
│       ├── CookieContext.tsx      # Context provider
│       └── useCookieConsent.ts    # Hook custom
├── lib/
│   └── cookies/
│       ├── categories.ts          # Definire categorii
│       ├── storage.ts             # LocalStorage helpers
│       └── api.ts                 # API calls consent
```

### 4.3 API Endpoints

| Endpoint                 | Method | Descriere                    |
| ------------------------ | ------ | ---------------------------- |
| `POST /api/v1/consent`   | POST   | Salvare preferințe consent   |
| `GET /api/v1/consent`    | GET    | Retrieve preferințe curente  |
| `DELETE /api/v1/consent` | DELETE | Retragere consent (ștergere) |

### 4.4 Request/Response Schema

```typescript
// POST /api/v1/consent
interface ConsentRequest {
  categories: {
    necessary: true; // Always true, cannot be changed
    functionality: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  bannerVersion: string; // e.g., "1.0.0"
}

// Response
interface ConsentResponse {
  success: boolean;
  data: {
    consentId: string;
    categories: ConsentCategories;
    consentGivenAt: string; // ISO timestamp
    expiresAt: string; // ISO timestamp
  };
}
```

---

## 5. Schema Bază de Date

### 5.1 Tabel `user_consent_logs`

```sql
CREATE TABLE user_consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Identificare utilizator
    user_id UUID REFERENCES users(id),           -- NULL pentru anonimi
    user_identifier TEXT NOT NULL,               -- Hashed IP pentru anonimi

    -- Consent details
    consent_version INTEGER NOT NULL DEFAULT 1,
    consent_categories JSONB NOT NULL,           -- {"necessary": true, "analytics": false, ...}
    banner_version TEXT NOT NULL,                -- "1.0.0"

    -- Timestamps
    consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consent_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
    consent_withdrawn_at TIMESTAMPTZ,

    -- Audit
    consent_ip_hash TEXT NOT NULL,               -- SHA256(IP + salt)
    user_agent TEXT,
    consent_method TEXT NOT NULL DEFAULT 'banner', -- 'banner', 'settings', 'api'

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_categories CHECK (
        consent_categories ? 'necessary' AND
        (consent_categories->>'necessary')::boolean = true
    )
);

-- Indexes
CREATE INDEX idx_consent_user ON user_consent_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_consent_identifier ON user_consent_logs(user_identifier);
CREATE INDEX idx_consent_tenant ON user_consent_logs(tenant_id);
CREATE INDEX idx_consent_expires ON user_consent_logs(consent_expires_at);

-- RLS
ALTER TABLE user_consent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON user_consent_logs
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 5.2 Funcții Helper

```sql
-- Verificare consent valid pentru un utilizator
CREATE OR REPLACE FUNCTION has_valid_consent(
    p_user_identifier TEXT,
    p_category TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_consent_logs
        WHERE user_identifier = p_user_identifier
          AND consent_withdrawn_at IS NULL
          AND consent_expires_at > NOW()
          AND (consent_categories->>p_category)::boolean = true
        ORDER BY consent_given_at DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 6. Politici și Proceduri

### 6.1 Obținere Consent

```
Utilizator accesează site
         │
         ▼
┌─────────────────────┐
│ Cookie existent?    │──DA──▶ Verifică validitate
└─────────────────────┘              │
         │                           │
         NO                          │
         │                     ┌─────┴─────┐
         ▼                     │ Valid?    │
┌─────────────────────┐        └───────────┘
│ Afișare Banner      │             │
└─────────────────────┘        NO   │   DA
         │                     │    │    │
         ▼                     ▼    │    ▼
┌─────────────────────┐  Re-afișare │  Aplică
│ Utilizator alege    │   Banner    │  preferințe
└─────────────────────┘             │  salvate
         │                          │
         ▼                          │
┌─────────────────────┐             │
│ Salvare consent     │◀────────────┘
│ (cookie + DB)       │
└─────────────────────┘
         │
         ▼
    Aplică preferințe
```

### 6.2 Retragere Consent

| Metodă          | Implementare                               |
| --------------- | ------------------------------------------ |
| **Link footer** | "Setări Cookies" vizibil pe toate paginile |
| **Setări cont** | Secțiune dedicată în profil utilizator     |
| **Email DPO**   | dpo@cerniq.app pentru cereri manuale       |

### 6.3 Renewal Policy

| Trigger                     | Acțiune                            |
| --------------------------- | ---------------------------------- |
| **12 luni** de la acordare  | Re-prompt pentru reînnoire         |
| **Modificare categorii**    | Re-prompt cu noile opțiuni         |
| **Upgrade banner versiune** | Re-prompt dacă schimbări materiale |

---

## 7. Cookie Policy Page

### 7.1 Locație

`https://cerniq.app/cookie-policy` sau `https://cerniq.app/politica-cookies`

### 7.2 Conținut Obligatoriu

1. **Ce sunt cookies** — explicație generală
2. **Ce cookies folosim** — tabel complet (secțiunea 2.2)
3. **De ce le folosim** — scop per categorie
4. **Cum să gestionezi** — instrucțiuni retragere consent
5. **Terți** — lista furnizorilor care setează cookies
6. **Contact** — dpo@cerniq.app

---

## 8. Conformitate și Audit

### 8.1 Checklist Conformitate

- [x] Banner afișat înaintea setării cookies non-esențiale
- [x] Opțiuni egale "Accept" / "Refuză"
- [x] Granularitate pe categorii
- [x] Informații clare despre scop și durată
- [x] Retragere consent ușoară
- [x] Proof of consent stocat
- [x] Cookies expiră conform declarației
- [x] Cookie Policy page accesibilă

### 8.2 Audit Log

Toate acțiunile de consent sunt loggate în `user_consent_logs` pentru audit GDPR.

---

## 9. Documente Conexe

| Document                                                   | Descriere                         |
| ---------------------------------------------------------- | --------------------------------- |
| [gdpr-compliance.md](./gdpr-compliance.md)                 | Politică GDPR generală            |
| [gdpr-dpia.md](./gdpr-dpia.md)                             | Data Protection Impact Assessment |
| [gdpr-compliance.md](./gdpr-compliance.md)                 | Privacy Policy (GDPR Compliance)  |
| [schema-database.md](../specifications/schema-database.md) | Schema completă DB                |

---

**Document tip:** Governance — Cookie Consent  
**Actualizat:** 01 Februarie 2026
