# Internationalization (i18n) Strategy

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

Cerniq uses Romanian (ro-RO) as primary language and English as secondary. This document covers react-intl/i18next setup, date/number formatting, currency (RON/EUR), and legal text translations.

---

## 1. Library Choice

**Recommended:** `react-intl` (FormatJS) or `i18next` + `react-i18next`

- **react-intl:** Strong date/number/currency support, ICU message format
- **i18next:** Flexible, plugin ecosystem, lazy loading

Both support Romanian locale. Choose one and standardize.

---

## 2. Setup (react-intl)

```typescript
import { IntlProvider } from 'react-intl';
import ro from './locales/ro.json';
import en from './locales/en.json';

const messages = { ro, en };
const locale = getUserLocale(); // from profile or browser

<IntlProvider locale={locale} messages={messages[locale] ?? ro}>
  <App />
</IntlProvider>
```

---

## 3. Date Formatting (Romanian Locale)

- **Short:** 22.02.2026 (DD.MM.YYYY)
- **Long:** 22 februarie 2026
- **Time:** 14:30 (24h format)

```typescript
import { FormattedDate } from 'react-intl';

<FormattedDate value={date} year="numeric" month="long" day="numeric" />
```

Romanian uses comma as decimal separator and space as thousands separator.

---

## 4. Number Formatting

- **Decimal:** 1.234,56 (Romanian)
- **Integer:** 1 234
- **Percent:** 24% (TVA)

```typescript
<FormattedNumber value={1234.56} style="decimal" />
<FormattedNumber value={0.24} style="percent" />
```

---

## 5. Currency (RON/EUR)

- **RON** (Leu românesc): primary for Romanian market
- **EUR:** for international clients

```typescript
<FormattedNumber value={amount} style="currency" currency="RON" />
<FormattedNumber value={amount} style="currency" currency="EUR" />
```

Symbol: RON (or Lei in informal contexts). EUR for cross-border.

---

## 6. Legal Text Translations

- **GDPR consent:** Must be available in ro and en
- **Terms of Service / Privacy Policy:** Translate and version
- **e-Factura / ANAF:** Romanian-only (legal requirement)
- **Invoice templates:** Romanian primary; English optional for export

Store legal text in DB or static JSON; avoid hardcoding.

---

## 7. Message Keys

Use namespaced keys: `common.save`, `leads.title`, `errors.notFound`

```json
{
  "common": { "save": "Salvează", "cancel": "Anulare" },
  "leads": { "title": "Prospecte", "add": "Adaugă prospect" }
}
```

---

## 8. Fallback

Default to Romanian if locale not supported. English as fallback for missing keys.

---

## 9. Server-Side i18n (API)

For emails, PDFs, and system messages: load locale from user profile or request header `Accept-Language`. Use same message keys; resolve at render time.

---

## 10. Pluralization

Romanian has different plural forms (0, 1, few, many). react-intl and i18next support ICU plural rules. Example: `{count, plural, one {# prospect} few {# prospecte} other {# prospecte}}`.

---

## 11. Lazy Loading

Load locale files on demand to reduce initial bundle:

```typescript
const messages = await import(`./locales/${locale}.json`);
```

---

## 12. Related Documents

- `pdf-generation.md` — PDF templates in Romanian
- `email-integration.md` — Email templates
- `notification-system.md` — Multi-channel content

---

## Checklist

- [ ] react-intl or i18next configured
- [ ] ro-RO and en locales
- [ ] Date/number/currency formatting
- [ ] RON and EUR support
- [ ] Legal text translatable
- [ ] Fallback strategy
- [ ] Pluralization for Romanian
