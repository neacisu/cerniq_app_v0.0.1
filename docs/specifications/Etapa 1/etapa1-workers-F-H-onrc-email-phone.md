# CERNIQ.APP — ETAPA 1: WORKERS CATEGORIA F-H
## ONRC, Email Enrichment & Phone Validation
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. CATEGORIA F: ONRC WORKERS

## 1.1 F.1 - ONRC Data Worker

```typescript
// apps/workers/src/silver/onrc-data.worker.ts

import { createWorker } from '@cerniq/queue';
import { OnrcApiClient } from '@cerniq/integrations/onrc';
import { db, silverCompanies } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface OnrcDataJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  nrRegCom?: string;
  correlationId: string;
}

export const onrcDataWorker = createWorker<OnrcDataJobData, OnrcDataResult>({
  queueName: 'silver:enrich:onrc-data',
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 45000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui, nrRegCom } = job.data;
    
    logger.info({ cui, nrRegCom }, 'Fetching ONRC data');
    
    const onrcClient = new OnrcApiClient({
      baseUrl: process.env.ONRC_API_URL,
      apiKey: process.env.ONRC_API_KEY,
    });
    
    try {
      // Search by CUI or Nr. Reg. Com
      const response = nrRegCom 
        ? await onrcClient.getByNrRegCom(nrRegCom)
        : await onrcClient.getByCui(cui);
      
      if (!response) {
        logger.warn({ cui }, 'Company not found in ONRC');
        return { status: 'not_found' };
      }
      
      const fieldsUpdated: string[] = [];
      
      const updateData: Partial<typeof silverCompanies.$inferInsert> = {
        // Registration data
        nrRegCom: response.numar_registru || nrRegCom,
        dataInfiintare: response.data_infiintare 
          ? new Date(response.data_infiintare) 
          : undefined,
        formaJuridica: response.forma_juridica || undefined,
        capitalSocial: response.capital_social || undefined,
        
        // Address from ONRC (often more accurate)
        adresaSediu: response.adresa_sediu || undefined,
        localitate: response.localitate || undefined,
        judet: response.judet || undefined,
        judetCod: mapJudetToCode(response.judet),
        codPostal: response.cod_postal || undefined,
        
        // Activity
        obiectActivitate: response.obiect_activitate || undefined,
        durataSocietate: response.durata || undefined,
        
        // Enrichment tracking
        enrichmentSourcesCompleted: db.sql`
          array_append(
            array_remove(enrichment_sources_completed, 'onrc_data'),
            'onrc_data'
          )
        `,
        lastEnrichmentAt: new Date(),
        updatedAt: new Date(),
      };
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) fieldsUpdated.push(key);
      });
      
      await db.update(silverCompanies)
        .set(updateData)
        .where(eq(silverCompanies.id, companyId));
      
      await db.insert(silverEnrichmentLog).values({
        tenantId,
        entityType: 'company',
        entityId: companyId,
        source: 'onrc_data',
        operation: 'fetch',
        status: 'success',
        fieldsUpdated,
      });
      
      logger.info({ cui, fieldsUpdated }, 'ONRC data updated');
      
      return { status: 'success', fieldsUpdated };
      
    } catch (error) {
      logger.error({ error, cui }, 'ONRC API error');
      throw error;
    }
  },
});

function mapJudetToCode(judet: string): string | undefined {
  const judetMap: Record<string, string> = {
    'ALBA': 'AB', 'ARAD': 'AR', 'ARGES': 'AG', 'BACAU': 'BC',
    'BIHOR': 'BH', 'BISTRITA-NASAUD': 'BN', 'BOTOSANI': 'BT', 'BRAILA': 'BR',
    'BRASOV': 'BV', 'BUCURESTI': 'B', 'BUZAU': 'BZ', 'CALARASI': 'CL',
    'CARAS-SEVERIN': 'CS', 'CLUJ': 'CJ', 'CONSTANTA': 'CT', 'COVASNA': 'CV',
    'DAMBOVITA': 'DB', 'DOLJ': 'DJ', 'GALATI': 'GL', 'GIURGIU': 'GR',
    'GORJ': 'GJ', 'HARGHITA': 'HR', 'HUNEDOARA': 'HD', 'IALOMITA': 'IL',
    'IASI': 'IS', 'ILFOV': 'IF', 'MARAMURES': 'MM', 'MEHEDINTI': 'MH',
    'MURES': 'MS', 'NEAMT': 'NT', 'OLT': 'OT', 'PRAHOVA': 'PH',
    'SALAJ': 'SJ', 'SATU MARE': 'SM', 'SIBIU': 'SB', 'SUCEAVA': 'SV',
    'TELEORMAN': 'TR', 'TIMIS': 'TM', 'TULCEA': 'TL', 'VALCEA': 'VL',
    'VASLUI': 'VS', 'VRANCEA': 'VN',
  };
  return judetMap[judet?.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
}
```

## 1.2 F.2 - ONRC Administratori Worker

```typescript
// apps/workers/src/silver/onrc-administratori.worker.ts

export const onrcAdministratoriWorker = createWorker<OnrcAdminJobData, OnrcAdminResult>({
  queueName: 'silver:enrich:onrc-administratori',
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 45000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const onrcClient = new OnrcApiClient({
      apiKey: process.env.ONRC_API_KEY,
    });
    
    try {
      const response = await onrcClient.getAdministratori(cui);
      
      if (!response || !response.administratori) {
        return { status: 'not_found' };
      }
      
      const administratori = response.administratori;
      
      // Store contacts
      for (const admin of administratori) {
        await db.insert(silverContacts).values({
          tenantId,
          silverCompanyId: companyId,
          fullName: admin.nume_complet,
          role: admin.functie || 'ADMINISTRATOR',
          cnp: admin.cnp ? maskCNP(admin.cnp) : undefined, // Masked for GDPR
          cetatenie: admin.cetatenie || 'ROMANA',
          dataNumire: admin.data_numire ? new Date(admin.data_numire) : undefined,
          puteri: admin.puteri || undefined,
          sourceData: { source: 'onrc', raw: admin },
        }).onConflictDoUpdate({
          target: [silverContacts.silverCompanyId, silverContacts.fullName, silverContacts.role],
          set: {
            dataNumire: admin.data_numire ? new Date(admin.data_numire) : undefined,
            puteri: admin.puteri,
            updatedAt: new Date(),
          },
        });
      }
      
      // Update company summary
      await db.update(silverCompanies)
        .set({
          numarAdministratori: administratori.length,
          administratorPrincipal: administratori.find(a => 
            a.functie?.toLowerCase().includes('director') || 
            a.functie?.toLowerCase().includes('administrator unic')
          )?.nume_complet || administratori[0]?.nume_complet,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'onrc_admin'),
              'onrc_admin'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ cui, count: administratori.length }, 'Administratori updated');
      
      return { status: 'success', count: administratori.length };
      
    } catch (error) {
      logger.error({ error, cui }, 'ONRC administratori error');
      throw error;
    }
  },
});

function maskCNP(cnp: string): string {
  if (!cnp || cnp.length !== 13) return cnp;
  return cnp.substring(0, 1) + '**********' + cnp.substring(11);
}
```

## 1.3 F.3 - ONRC Sedii/Puncte de Lucru Worker

```typescript
// apps/workers/src/silver/onrc-sedii.worker.ts

export const onrcSediiWorker = createWorker<OnrcSediiJobData, OnrcSediiResult>({
  queueName: 'silver:enrich:onrc-sedii',
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 45000,

  processor: async (job, logger) => {
    const { tenantId, companyId, cui } = job.data;
    
    const onrcClient = new OnrcApiClient({
      apiKey: process.env.ONRC_API_KEY,
    });
    
    try {
      const response = await onrcClient.getSedii(cui);
      
      if (!response) {
        return { status: 'not_found' };
      }
      
      const sedii = response.sedii || [];
      const puncteLucru = response.puncte_lucru || [];
      
      // Store locations in separate table
      for (const sediu of [...sedii, ...puncteLucru]) {
        await db.insert(silverCompanyLocations).values({
          tenantId,
          silverCompanyId: companyId,
          tipLocatie: sediu.tip || 'SEDIU_SOCIAL',
          adresaCompleta: sediu.adresa,
          localitate: sediu.localitate,
          judet: sediu.judet,
          codPostal: sediu.cod_postal,
          activ: sediu.activ !== false,
        }).onConflictDoUpdate({
          target: [silverCompanyLocations.silverCompanyId, silverCompanyLocations.adresaCompleta],
          set: { activ: sediu.activ !== false, updatedAt: new Date() },
        });
      }
      
      // Update company with counts
      await db.update(silverCompanies)
        .set({
          numarSedii: sedii.length,
          numarPuncteLucru: puncteLucru.length,
          areMultipleLocatii: (sedii.length + puncteLucru.length) > 1,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'onrc_sedii'),
              'onrc_sedii'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ 
        cui, 
        sedii: sedii.length, 
        puncteLucru: puncteLucru.length 
      }, 'Sedii updated');
      
      return { 
        status: 'success', 
        sediiCount: sedii.length,
        puncteLucruCount: puncteLucru.length,
      };
      
    } catch (error) {
      logger.error({ error, cui }, 'ONRC sedii error');
      throw error;
    }
  },
});
```

---

# 2. CATEGORIA G: EMAIL WORKERS

## 2.1 G.1 - Hunter.io Email Finder Worker

```typescript
// apps/workers/src/silver/hunter-email-finder.worker.ts

import { createWorker } from '@cerniq/queue';
import { HunterApiClient } from '@cerniq/integrations/hunter';
import { db, silverCompanies, silverContacts } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface HunterEmailJobData {
  tenantId: string;
  companyId: string;
  domain?: string;
  companyName?: string;
  correlationId: string;
}

// Rate limit: 15 requests/second for Hunter.io
export const hunterEmailFinderWorker = createWorker<HunterEmailJobData, HunterEmailResult>({
  queueName: 'silver:enrich:hunter-email-finder',
  concurrency: 5,
  limiter: { max: 15, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, companyId, domain, companyName } = job.data;
    
    if (!domain) {
      logger.warn({ companyId }, 'No domain provided for Hunter search');
      return { status: 'skipped', reason: 'no_domain' };
    }
    
    logger.info({ domain }, 'Searching emails with Hunter.io');
    
    const hunterClient = new HunterApiClient({
      apiKey: process.env.HUNTER_API_KEY!,
    });
    
    try {
      // Domain search to find all emails
      const response = await hunterClient.domainSearch(domain);
      
      if (!response || !response.data?.emails) {
        return { status: 'not_found' };
      }
      
      const emails = response.data.emails;
      let storedCount = 0;
      
      for (const emailData of emails) {
        // Skip generic emails
        if (isGenericEmail(emailData.value)) continue;
        
        // Create or update contact
        await db.insert(silverContacts).values({
          tenantId,
          silverCompanyId: companyId,
          email: emailData.value.toLowerCase(),
          emailVerified: emailData.verification?.status === 'valid',
          emailConfidence: emailData.confidence || 0,
          fullName: [emailData.first_name, emailData.last_name].filter(Boolean).join(' ') || undefined,
          firstName: emailData.first_name || undefined,
          lastName: emailData.last_name || undefined,
          role: emailData.position || emailData.department || undefined,
          linkedinUrl: emailData.linkedin || undefined,
          sourceData: { source: 'hunter', raw: emailData },
        }).onConflictDoUpdate({
          target: [silverContacts.silverCompanyId, silverContacts.email],
          set: {
            emailVerified: emailData.verification?.status === 'valid',
            emailConfidence: emailData.confidence,
            updatedAt: new Date(),
          },
        });
        
        storedCount++;
      }
      
      // Update company with best email
      const bestEmail = emails
        .filter(e => e.verification?.status === 'valid' && !isGenericEmail(e.value))
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
      
      if (bestEmail) {
        await db.update(silverCompanies)
          .set({
            emailPrincipal: bestEmail.value.toLowerCase(),
            emailVerificat: true,
            emailConfidence: bestEmail.confidence,
          })
          .where(eq(silverCompanies.id, companyId));
      }
      
      // Update enrichment tracking
      await db.update(silverCompanies)
        .set({
          numarEmailuriGasite: emails.length,
          enrichmentSourcesCompleted: db.sql`
            array_append(
              array_remove(enrichment_sources_completed, 'hunter_email'),
              'hunter_email'
            )
          `,
          lastEnrichmentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({ domain, found: emails.length, stored: storedCount }, 'Hunter search complete');
      
      return { status: 'success', emailsFound: emails.length, stored: storedCount };
      
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      logger.error({ error, domain }, 'Hunter API error');
      throw error;
    }
  },
});

function isGenericEmail(email: string): boolean {
  const genericPrefixes = [
    'info', 'contact', 'office', 'sales', 'support', 'hello', 
    'admin', 'noreply', 'no-reply', 'marketing', 'press', 'media'
  ];
  const prefix = email.split('@')[0].toLowerCase();
  return genericPrefixes.some(g => prefix.startsWith(g));
}
```

## 2.2 G.2 - ZeroBounce Email Validation Worker

```typescript
// apps/workers/src/silver/zerobounce-validation.worker.ts

export const zerobounceValidationWorker = createWorker<ZerobounceJobData, ZerobounceResult>({
  queueName: 'silver:enrich:zerobounce-validation',
  concurrency: 10,
  limiter: { max: 100, duration: 1000 }, // ZeroBounce allows higher rate
  attempts: 3,
  backoff: { type: 'fixed', delay: 1000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, contactId, email } = job.data;
    
    if (!email) {
      return { status: 'skipped', reason: 'no_email' };
    }
    
    logger.info({ email }, 'Validating email with ZeroBounce');
    
    const zbClient = new ZeroBounceClient({
      apiKey: process.env.ZEROBOUNCE_API_KEY!,
    });
    
    try {
      const result = await zbClient.validate(email);
      
      const isValid = result.status === 'valid';
      const isCatchAll = result.status === 'catch-all';
      const isDisposable = result.sub_status === 'disposable';
      
      // Update contact
      await db.update(silverContacts)
        .set({
          emailVerified: isValid,
          emailStatus: result.status,
          emailSubStatus: result.sub_status,
          emailIsCatchAll: isCatchAll,
          emailIsDisposable: isDisposable,
          emailValidatedAt: new Date(),
          emailValidationSource: 'zerobounce',
        })
        .where(eq(silverContacts.id, contactId));
      
      logger.info({ 
        email, 
        status: result.status, 
        isValid 
      }, 'Email validated');
      
      return { 
        status: 'success', 
        emailStatus: result.status,
        isValid,
      };
      
    } catch (error) {
      logger.error({ error, email }, 'ZeroBounce API error');
      throw error;
    }
  },
});
```

## 2.3 G.3 - Email Enricher Worker (Clearbit-style)

```typescript
// apps/workers/src/silver/email-enricher.worker.ts

export const emailEnricherWorker = createWorker<EmailEnricherJobData, EmailEnricherResult>({
  queueName: 'silver:enrich:email-enricher',
  concurrency: 5,
  limiter: { max: 10, duration: 1000 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, contactId, email } = job.data;
    
    // Use multiple sources for enrichment
    const enrichmentSources = [
      { name: 'linkedin', fn: () => searchLinkedIn(email) },
      { name: 'clearbit', fn: () => enrichWithClearbit(email) },
      { name: 'fullcontact', fn: () => enrichWithFullContact(email) },
    ];
    
    const results: Record<string, any> = {};
    
    for (const source of enrichmentSources) {
      try {
        const data = await source.fn();
        if (data) {
          results[source.name] = data;
        }
      } catch (error) {
        logger.warn({ source: source.name, error }, 'Enrichment source failed');
      }
    }
    
    if (Object.keys(results).length === 0) {
      return { status: 'not_found' };
    }
    
    // Merge results (prefer LinkedIn data)
    const merged = mergeEnrichmentData(results);
    
    await db.update(silverContacts)
      .set({
        fullName: merged.fullName || undefined,
        firstName: merged.firstName || undefined,
        lastName: merged.lastName || undefined,
        role: merged.role || undefined,
        linkedinUrl: merged.linkedinUrl || undefined,
        photoUrl: merged.photoUrl || undefined,
        bio: merged.bio || undefined,
        enrichmentData: results,
        enrichedAt: new Date(),
      })
      .where(eq(silverContacts.id, contactId));
    
    logger.info({ email, sources: Object.keys(results) }, 'Email enriched');
    
    return { status: 'success', sources: Object.keys(results) };
  },
});
```

## 2.4 G.4 - Email Pattern Validator Worker

```typescript
// apps/workers/src/silver/email-pattern-validator.worker.ts

export const emailPatternValidatorWorker = createWorker<EmailPatternJobData, EmailPatternResult>({
  queueName: 'silver:enrich:email-pattern',
  concurrency: 5,
  attempts: 2,
  timeout: 15000,

  processor: async (job, logger) => {
    const { tenantId, companyId, domain, contacts } = job.data;
    
    if (!contacts || contacts.length < 2) {
      return { status: 'skipped', reason: 'insufficient_data' };
    }
    
    // Detect email pattern from existing emails
    const patterns = detectEmailPatterns(contacts);
    
    if (!patterns.bestPattern) {
      return { status: 'no_pattern_detected' };
    }
    
    // Update company with detected pattern
    await db.update(silverCompanies)
      .set({
        emailPattern: patterns.bestPattern,
        emailPatternConfidence: patterns.confidence,
        emailPatternExamples: patterns.examples,
      })
      .where(eq(silverCompanies.id, companyId));
    
    logger.info({ 
      domain, 
      pattern: patterns.bestPattern,
      confidence: patterns.confidence,
    }, 'Email pattern detected');
    
    return { 
      status: 'success', 
      pattern: patterns.bestPattern,
      confidence: patterns.confidence,
    };
  },
});

interface Contact {
  email: string;
  firstName?: string;
  lastName?: string;
}

function detectEmailPatterns(contacts: Contact[]) {
  const patterns: Record<string, number> = {
    '{first}.{last}': 0,
    '{first}_{last}': 0,
    '{first}{last}': 0,
    '{f}{last}': 0,
    '{first}.{l}': 0,
    '{first}': 0,
    '{last}': 0,
  };
  
  for (const contact of contacts) {
    if (!contact.email || !contact.firstName || !contact.lastName) continue;
    
    const emailPrefix = contact.email.split('@')[0].toLowerCase();
    const first = contact.firstName.toLowerCase();
    const last = contact.lastName.toLowerCase();
    const f = first[0];
    const l = last[0];
    
    if (emailPrefix === `${first}.${last}`) patterns['{first}.{last}']++;
    else if (emailPrefix === `${first}_${last}`) patterns['{first}_{last}']++;
    else if (emailPrefix === `${first}${last}`) patterns['{first}{last}']++;
    else if (emailPrefix === `${f}${last}`) patterns['{f}{last}']++;
    else if (emailPrefix === `${first}.${l}`) patterns['{first}.{l}']++;
    else if (emailPrefix === first) patterns['{first}']++;
    else if (emailPrefix === last) patterns['{last}']++;
  }
  
  const sorted = Object.entries(patterns)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) {
    return { bestPattern: null, confidence: 0, examples: [] };
  }
  
  const [bestPattern, count] = sorted[0];
  const confidence = count / contacts.length;
  
  return {
    bestPattern,
    confidence,
    examples: contacts.slice(0, 3).map(c => c.email),
  };
}
```

## 2.5 G.5 - Email Generator Worker

```typescript
// apps/workers/src/silver/email-generator.worker.ts

export const emailGeneratorWorker = createWorker<EmailGenJobData, EmailGenResult>({
  queueName: 'silver:enrich:email-generator',
  concurrency: 5,
  attempts: 2,
  timeout: 15000,

  processor: async (job, logger) => {
    const { tenantId, contactId, firstName, lastName, domain, pattern } = job.data;
    
    if (!firstName || !lastName || !domain || !pattern) {
      return { status: 'skipped', reason: 'missing_data' };
    }
    
    // Generate email based on pattern
    const generatedEmail = generateEmail(firstName, lastName, domain, pattern);
    
    // Mark as generated (not verified)
    await db.update(silverContacts)
      .set({
        email: generatedEmail,
        emailGenerated: true,
        emailVerified: false,
        emailGeneratedPattern: pattern,
      })
      .where(eq(silverContacts.id, contactId));
    
    // Trigger validation
    await emailValidationQueue.add('validate', {
      tenantId,
      contactId,
      email: generatedEmail,
    });
    
    logger.info({ contactId, generatedEmail }, 'Email generated');
    
    return { status: 'success', email: generatedEmail };
  },
});

function generateEmail(firstName: string, lastName: string, domain: string, pattern: string): string {
  const first = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const last = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const f = first[0];
  const l = last[0];
  
  const prefix = pattern
    .replace('{first}', first)
    .replace('{last}', last)
    .replace('{f}', f)
    .replace('{l}', l);
  
  return `${prefix}@${domain}`;
}
```

---

# 3. CATEGORIA H: PHONE WORKERS

## 3.1 H.1 - Phone Normalizer Worker

```typescript
// apps/workers/src/silver/phone-normalizer.worker.ts

import { createWorker } from '@cerniq/queue';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { db, silverCompanies, silverContacts } from '@cerniq/db';
import { eq } from 'drizzle-orm';

interface PhoneNormalizerJobData {
  tenantId: string;
  entityType: 'company' | 'contact';
  entityId: string;
  rawPhone: string;
  correlationId: string;
}

export const phoneNormalizerWorker = createWorker<PhoneNormalizerJobData, PhoneNormalizerResult>({
  queueName: 'silver:enrich:phone-normalizer',
  concurrency: 20, // High concurrency - CPU-bound
  attempts: 2,
  timeout: 10000,

  processor: async (job, logger) => {
    const { tenantId, entityType, entityId, rawPhone } = job.data;
    
    if (!rawPhone) {
      return { status: 'skipped', reason: 'no_phone' };
    }
    
    logger.info({ rawPhone }, 'Normalizing phone number');
    
    // Clean input
    const cleaned = rawPhone.replace(/[^\d+]/g, '');
    
    // Try to parse with Romania as default country
    let parsed;
    let isValid = false;
    let phoneType = 'UNKNOWN';
    let nationalFormat = cleaned;
    let internationalFormat = cleaned;
    
    try {
      // Add +40 if starts with 07xx (Romanian mobile)
      let phoneToparse = cleaned;
      if (cleaned.match(/^0[237]\d{8}$/)) {
        phoneToparse = '+40' + cleaned.substring(1);
      } else if (cleaned.match(/^40[237]\d{8}$/)) {
        phoneToparse = '+' + cleaned;
      }
      
      parsed = parsePhoneNumber(phoneToparse, 'RO');
      isValid = parsed.isValid();
      
      if (isValid) {
        nationalFormat = parsed.formatNational();
        internationalFormat = parsed.formatInternational();
        phoneType = parsed.getType() || 'UNKNOWN';
      }
    } catch (error) {
      logger.warn({ rawPhone, error }, 'Phone parsing failed');
    }
    
    // Update based on entity type
    if (entityType === 'company') {
      await db.update(silverCompanies)
        .set({
          telefonPrincipal: internationalFormat,
          telefonNormalizat: nationalFormat,
          telefonValid: isValid,
          tipTelefon: phoneType,
          telefonTara: isValid ? 'RO' : undefined,
        })
        .where(eq(silverCompanies.id, entityId));
    } else {
      await db.update(silverContacts)
        .set({
          phone: internationalFormat,
          phoneNormalized: nationalFormat,
          phoneValid: isValid,
          phoneType,
        })
        .where(eq(silverContacts.id, entityId));
    }
    
    // If valid mobile, trigger HLR lookup
    if (isValid && phoneType === 'MOBILE') {
      await hlrLookupQueue.add('lookup', {
        tenantId,
        entityType,
        entityId,
        phone: internationalFormat,
      });
    }
    
    logger.info({ 
      rawPhone, 
      normalized: internationalFormat, 
      isValid,
      phoneType,
    }, 'Phone normalized');
    
    return { 
      status: 'success', 
      normalized: internationalFormat,
      isValid,
      phoneType,
    };
  },
});
```

## 3.2 H.2 - HLR Lookup Worker

```typescript
// apps/workers/src/silver/hlr-lookup.worker.ts

export const hlrLookupWorker = createWorker<HlrLookupJobData, HlrLookupResult>({
  queueName: 'silver:enrich:hlr-lookup',
  concurrency: 5,
  limiter: { max: 10, duration: 1000 }, // API rate limit
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 30000,

  processor: async (job, logger) => {
    const { tenantId, entityType, entityId, phone } = job.data;
    
    logger.info({ phone }, 'Performing HLR lookup');
    
    const hlrClient = new HlrApiClient({
      apiKey: process.env.HLR_API_KEY!,
    });
    
    try {
      const result = await hlrClient.lookup(phone);
      
      const updateData = {
        hlrStatus: result.status,
        hlrReachable: result.reachable === true,
        hlrCarrier: result.carrier || undefined,
        hlrCarrierType: result.carrier_type || undefined,
        hlrCountryCode: result.country_code || undefined,
        hlrMccMnc: result.mcc_mnc || undefined,
        hlrPortedStatus: result.ported || undefined,
        hlrLookupAt: new Date(),
      };
      
      if (entityType === 'company') {
        await db.update(silverCompanies)
          .set(updateData)
          .where(eq(silverCompanies.id, entityId));
      } else {
        await db.update(silverContacts)
          .set(updateData)
          .where(eq(silverContacts.id, entityId));
      }
      
      logger.info({ 
        phone, 
        reachable: result.reachable,
        carrier: result.carrier,
      }, 'HLR lookup complete');
      
      return { 
        status: 'success',
        reachable: result.reachable,
        carrier: result.carrier,
      };
      
    } catch (error) {
      logger.error({ error, phone }, 'HLR lookup error');
      throw error;
    }
  },
});
```

## 3.3 H.3 - Carrier Detection Worker

```typescript
// apps/workers/src/silver/carrier-detection.worker.ts

export const carrierDetectionWorker = createWorker<CarrierDetectionJobData, CarrierDetectionResult>({
  queueName: 'silver:enrich:carrier-detection',
  concurrency: 20,
  attempts: 2,
  timeout: 10000,

  processor: async (job, logger) => {
    const { tenantId, entityType, entityId, phone } = job.data;
    
    // Romanian mobile prefixes
    const romanianPrefixes: Record<string, { carrier: string; type: string }> = {
      // Vodafone
      '0721': { carrier: 'Vodafone', type: 'MOBILE' },
      '0722': { carrier: 'Vodafone', type: 'MOBILE' },
      '0723': { carrier: 'Vodafone', type: 'MOBILE' },
      '0724': { carrier: 'Vodafone', type: 'MOBILE' },
      '0725': { carrier: 'Vodafone', type: 'MOBILE' },
      '0726': { carrier: 'Vodafone', type: 'MOBILE' },
      '0727': { carrier: 'Vodafone', type: 'MOBILE' },
      '0728': { carrier: 'Vodafone', type: 'MOBILE' },
      '0729': { carrier: 'Vodafone', type: 'MOBILE' },
      
      // Orange
      '0740': { carrier: 'Orange', type: 'MOBILE' },
      '0741': { carrier: 'Orange', type: 'MOBILE' },
      '0742': { carrier: 'Orange', type: 'MOBILE' },
      '0743': { carrier: 'Orange', type: 'MOBILE' },
      '0744': { carrier: 'Orange', type: 'MOBILE' },
      '0745': { carrier: 'Orange', type: 'MOBILE' },
      '0746': { carrier: 'Orange', type: 'MOBILE' },
      '0747': { carrier: 'Orange', type: 'MOBILE' },
      '0748': { carrier: 'Orange', type: 'MOBILE' },
      '0749': { carrier: 'Orange', type: 'MOBILE' },
      '0750': { carrier: 'Orange', type: 'MOBILE' },
      '0751': { carrier: 'Orange', type: 'MOBILE' },
      '0752': { carrier: 'Orange', type: 'MOBILE' },
      '0753': { carrier: 'Orange', type: 'MOBILE' },
      '0754': { carrier: 'Orange', type: 'MOBILE' },
      '0755': { carrier: 'Orange', type: 'MOBILE' },
      '0756': { carrier: 'Orange', type: 'MOBILE' },
      '0757': { carrier: 'Orange', type: 'MOBILE' },
      '0758': { carrier: 'Orange', type: 'MOBILE' },
      '0759': { carrier: 'Orange', type: 'MOBILE' },
      
      // Telekom (Digi)
      '0760': { carrier: 'Digi', type: 'MOBILE' },
      '0761': { carrier: 'Digi', type: 'MOBILE' },
      '0762': { carrier: 'Digi', type: 'MOBILE' },
      '0763': { carrier: 'Digi', type: 'MOBILE' },
      '0764': { carrier: 'Digi', type: 'MOBILE' },
      '0765': { carrier: 'Digi', type: 'MOBILE' },
      '0766': { carrier: 'Digi', type: 'MOBILE' },
      '0767': { carrier: 'Digi', type: 'MOBILE' },
      '0768': { carrier: 'Digi', type: 'MOBILE' },
      '0769': { carrier: 'Digi', type: 'MOBILE' },
      
      // Landlines
      '021': { carrier: 'Bucuresti', type: 'FIXED' },
      '031': { carrier: 'Bucuresti', type: 'FIXED' },
      '0239': { carrier: 'Braila', type: 'FIXED' },
    };
    
    // Normalize to national format
    let nationalPhone = phone
      .replace(/^\+40/, '0')
      .replace(/^40/, '0')
      .replace(/[^\d]/g, '');
    
    // Find carrier by prefix
    let detected = null;
    for (const [prefix, info] of Object.entries(romanianPrefixes)) {
      if (nationalPhone.startsWith(prefix)) {
        detected = info;
        break;
      }
    }
    
    if (!detected) {
      return { status: 'unknown_carrier' };
    }
    
    const updateData = {
      detectedCarrier: detected.carrier,
      detectedPhoneType: detected.type,
    };
    
    if (entityType === 'company') {
      await db.update(silverCompanies)
        .set(updateData)
        .where(eq(silverCompanies.id, entityId));
    } else {
      await db.update(silverContacts)
        .set(updateData)
        .where(eq(silverContacts.id, entityId));
    }
    
    logger.info({ phone, carrier: detected.carrier }, 'Carrier detected');
    
    return { 
      status: 'success',
      carrier: detected.carrier,
      phoneType: detected.type,
    };
  },
});
```

---

# 4. QUEUE CONFIGURATION SUMMARY

| Worker | Queue Name | Concurrency | Rate Limit | Attempts |
|--------|-----------|-------------|------------|----------|
| F.1 ONRC Data | `silver:enrich:onrc-data` | 5 | 10/s | 3 |
| F.2 ONRC Admin | `silver:enrich:onrc-administratori` | 5 | 10/s | 3 |
| F.3 ONRC Sedii | `silver:enrich:onrc-sedii` | 5 | 10/s | 3 |
| G.1 Hunter Finder | `silver:enrich:hunter-email-finder` | 5 | 15/s | 3 |
| G.2 ZeroBounce | `silver:enrich:zerobounce-validation` | 10 | 100/s | 3 |
| G.3 Email Enricher | `silver:enrich:email-enricher` | 5 | 10/s | 3 |
| G.4 Email Pattern | `silver:enrich:email-pattern` | 5 | - | 2 |
| G.5 Email Gen | `silver:enrich:email-generator` | 5 | - | 2 |
| H.1 Phone Norm | `silver:enrich:phone-normalizer` | 20 | - | 2 |
| H.2 HLR Lookup | `silver:enrich:hlr-lookup` | 5 | 10/s | 3 |
| H.3 Carrier Det | `silver:enrich:carrier-detection` | 20 | - | 2 |

---

**Document generat:** 15 Ianuarie 2026
**Total workers:** 11 (F.1-F.3, G.1-G.5, H.1-H.3)
**Conformitate:** Master Spec v1.2
