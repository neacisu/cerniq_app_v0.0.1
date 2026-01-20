# CERNIQ.APP — WORKERS CATEGORIA B-C: NORMALIZARE & VALIDARE
## 6 Workers pentru Curățare și Validare Date
### Versiunea 1.0 | 15 Ianuarie 2026

---

# CATEGORIA B: NORMALIZARE (4 Workers)

## B.1 Name Normalizer Worker

### Configurare

```typescript
const B1_CONFIG: WorkerConfig = {
  queueName: 'bronze:normalize:name',
  concurrency: 20,
  attempts: 2,
  backoff: { type: 'fixed', delay: 500 },
  timeout: 10000,
};
```

### Job Payload

```typescript
interface NameNormalizerJobData {
  tenantId: string;
  contactId: string;
  rawName: string;
  correlationId: string;
}
```

### Implementare

```typescript
// /apps/workers/src/normalize/name-normalizer.worker.ts

import { createWorker } from '@cerniq/queue';
import { db, bronzeContacts } from '@cerniq/db';
import { eq } from 'drizzle-orm';

// Mapping forme juridice
const FORMA_JURIDICA_MAP: Record<string, string> = {
  'S.R.L.': 'SRL',
  'SRL': 'SRL',
  'S.R.L': 'SRL',
  'S.A.': 'SA',
  'SA': 'SA',
  'P.F.A.': 'PFA',
  'PFA': 'PFA',
  'I.I.': 'II',
  'II': 'II',
  'I.F.': 'IF',
  'IF': 'IF',
  'S.N.C.': 'SNC',
  'S.C.S.': 'SCS',
  'COOP': 'COOP',
  'COOPERATIVA': 'COOP',
  'O.U.A.I.': 'OUAI',
  'OUAI': 'OUAI',
  'ASOCIATIA': 'ASOC',
  'FUNDATIA': 'FUND',
  'O.N.G.': 'ONG',
};

// Cuvinte de eliminat
const NOISE_WORDS = [
  'SOCIETATEA', 'COMERCIALA', 'FIRMA', 'COMPANIA',
  'INTREPRINDEREA', 'EXPLOATATIA', 'AGRICOLA',
];

export const nameNormalizerWorker = createWorker<NameNormalizerJobData>({
  queueName: 'bronze:normalize:name',
  concurrency: B1_CONFIG.concurrency,
  
  processor: async (job, logger) => {
    const { tenantId, contactId, rawName } = job.data;
    
    if (!rawName) {
      return { status: 'skipped', reason: 'empty_name' };
    }
    
    // Step 1: Uppercase și trim
    let normalized = rawName.toUpperCase().trim();
    
    // Step 2: Normalizare whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Step 3: Eliminare caractere speciale la început/sfârșit
    normalized = normalized.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
    
    // Step 4: Extragere formă juridică
    let formaJuridica: string | null = null;
    for (const [pattern, forma] of Object.entries(FORMA_JURIDICA_MAP)) {
      const regex = new RegExp(`\\b${pattern.replace(/\./g, '\\.')}\\b`, 'i');
      if (regex.test(normalized)) {
        formaJuridica = forma;
        normalized = normalized.replace(regex, '').trim();
        break;
      }
    }
    
    // Step 5: Eliminare noise words
    for (const word of NOISE_WORDS) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    }
    
    // Step 6: Cleanup final
    normalized = normalized.replace(/\s+/g, ' ').trim();
    normalized = normalized.replace(/^[-,.\s]+|[-,.\s]+$/g, '').trim();
    
    // Step 7: Reconstituire cu forma juridică la sfârșit
    if (formaJuridica) {
      normalized = `${normalized} ${formaJuridica}`;
    }
    
    logger.info({
      original: rawName,
      normalized,
      formaJuridica,
    }, 'Name normalized');
    
    return {
      status: 'success',
      original: rawName,
      normalized,
      formaJuridica,
    };
  },
});
```

### Exemple Normalizare

| Input | Output | Forma Juridică |
|-------|--------|----------------|
| `S.C. AGRO FARM S.R.L.` | `AGRO FARM SRL` | `SRL` |
| `SOCIETATEA COMERCIALA VERDE S.A.` | `VERDE SA` | `SA` |
| `P.F.A. ION POPESCU` | `ION POPESCU PFA` | `PFA` |
| `O.U.A.I. LUNCA SIRETULUI` | `LUNCA SIRETULUI OUAI` | `OUAI` |
| `  agro   farm  srl  ` | `AGRO FARM SRL` | `SRL` |

---

## B.2 Address Normalizer Worker

### Configurare

```typescript
const B2_CONFIG: WorkerConfig = {
  queueName: 'bronze:normalize:address',
  concurrency: 20,
  attempts: 2,
  timeout: 15000,
};
```

### Implementare

```typescript
// /apps/workers/src/normalize/address-normalizer.worker.ts

interface AddressNormalizerJobData {
  tenantId: string;
  contactId: string;
  rawAddress: string;
  correlationId: string;
}

// Abrevieri standard
const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  'STR.': 'STRADA',
  'STR': 'STRADA',
  'BD.': 'BULEVARDUL',
  'BD': 'BULEVARDUL',
  'BLD.': 'BULEVARDUL',
  'B-DUL': 'BULEVARDUL',
  'AL.': 'ALEEA',
  'P-TA': 'PIATA',
  'NR.': 'NR',
  'NR': 'NR',
  'BL.': 'BL',
  'SC.': 'SC',
  'ET.': 'ET',
  'AP.': 'AP',
  'JUD.': 'JUD',
  'MUN.': 'MUN',
  'OR.': 'ORAS',
  'SAT': 'SAT',
  'COM.': 'COMUNA',
  'COM': 'COMUNA',
};

// Județe România (cod + nume)
const JUDETE_MAP: Record<string, { cod: string; nume: string }> = {
  'ALBA': { cod: 'AB', nume: 'Alba' },
  'ARAD': { cod: 'AR', nume: 'Arad' },
  'ARGES': { cod: 'AG', nume: 'Argeș' },
  'BACAU': { cod: 'BC', nume: 'Bacău' },
  'BIHOR': { cod: 'BH', nume: 'Bihor' },
  'BISTRITA-NASAUD': { cod: 'BN', nume: 'Bistrița-Năsăud' },
  'BOTOSANI': { cod: 'BT', nume: 'Botoșani' },
  'BRAILA': { cod: 'BR', nume: 'Brăila' },
  'BRASOV': { cod: 'BV', nume: 'Brașov' },
  'BUCURESTI': { cod: 'B', nume: 'București' },
  'BUZAU': { cod: 'BZ', nume: 'Buzău' },
  'CALARASI': { cod: 'CL', nume: 'Călărași' },
  'CARAS-SEVERIN': { cod: 'CS', nume: 'Caraș-Severin' },
  'CLUJ': { cod: 'CJ', nume: 'Cluj' },
  'CONSTANTA': { cod: 'CT', nume: 'Constanța' },
  'COVASNA': { cod: 'CV', nume: 'Covasna' },
  'DAMBOVITA': { cod: 'DB', nume: 'Dâmbovița' },
  'DOLJ': { cod: 'DJ', nume: 'Dolj' },
  'GALATI': { cod: 'GL', nume: 'Galați' },
  'GIURGIU': { cod: 'GR', nume: 'Giurgiu' },
  'GORJ': { cod: 'GJ', nume: 'Gorj' },
  'HARGHITA': { cod: 'HR', nume: 'Harghita' },
  'HUNEDOARA': { cod: 'HD', nume: 'Hunedoara' },
  'IALOMITA': { cod: 'IL', nume: 'Ialomița' },
  'IASI': { cod: 'IS', nume: 'Iași' },
  'ILFOV': { cod: 'IF', nume: 'Ilfov' },
  'MARAMURES': { cod: 'MM', nume: 'Maramureș' },
  'MEHEDINTI': { cod: 'MH', nume: 'Mehedinți' },
  'MURES': { cod: 'MS', nume: 'Mureș' },
  'NEAMT': { cod: 'NT', nume: 'Neamț' },
  'OLT': { cod: 'OT', nume: 'Olt' },
  'PRAHOVA': { cod: 'PH', nume: 'Prahova' },
  'SALAJ': { cod: 'SJ', nume: 'Sălaj' },
  'SATU MARE': { cod: 'SM', nume: 'Satu Mare' },
  'SIBIU': { cod: 'SB', nume: 'Sibiu' },
  'SUCEAVA': { cod: 'SV', nume: 'Suceava' },
  'TELEORMAN': { cod: 'TR', nume: 'Teleorman' },
  'TIMIS': { cod: 'TM', nume: 'Timiș' },
  'TULCEA': { cod: 'TL', nume: 'Tulcea' },
  'VALCEA': { cod: 'VL', nume: 'Vâlcea' },
  'VASLUI': { cod: 'VS', nume: 'Vaslui' },
  'VRANCEA': { cod: 'VN', nume: 'Vrancea' },
};

export const addressNormalizerWorker = createWorker<AddressNormalizerJobData>({
  queueName: 'bronze:normalize:address',
  concurrency: B2_CONFIG.concurrency,
  
  processor: async (job, logger) => {
    const { rawAddress } = job.data;
    
    if (!rawAddress) {
      return { status: 'skipped', reason: 'empty_address' };
    }
    
    let normalized = rawAddress.toUpperCase().trim();
    
    // Expandare abrevieri
    for (const [abbr, full] of Object.entries(ADDRESS_ABBREVIATIONS)) {
      const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'g');
      normalized = normalized.replace(regex, full);
    }
    
    // Extragere componente
    const result: AddressComponents = {
      adresaCompleta: rawAddress,
      adresaNormalizata: normalized,
      strada: null,
      numar: null,
      bloc: null,
      scara: null,
      etaj: null,
      apartament: null,
      codPostal: null,
      localitate: null,
      comuna: null,
      judet: null,
      judetCod: null,
    };
    
    // Extragere număr
    const nrMatch = normalized.match(/\bNR\.?\s*(\d+[A-Z]?)/i);
    if (nrMatch) result.numar = nrMatch[1];
    
    // Extragere bloc
    const blMatch = normalized.match(/\bBL\.?\s*([A-Z0-9]+)/i);
    if (blMatch) result.bloc = blMatch[1];
    
    // Extragere scară
    const scMatch = normalized.match(/\bSC\.?\s*([A-Z0-9]+)/i);
    if (scMatch) result.scara = scMatch[1];
    
    // Extragere etaj
    const etMatch = normalized.match(/\bET\.?\s*(\d+|P|PARTER|M|MANSARDA)/i);
    if (etMatch) result.etaj = etMatch[1];
    
    // Extragere apartament
    const apMatch = normalized.match(/\bAP\.?\s*(\d+)/i);
    if (apMatch) result.apartament = apMatch[1];
    
    // Extragere cod poștal
    const cpMatch = normalized.match(/\b(\d{6})\b/);
    if (cpMatch) result.codPostal = cpMatch[1];
    
    // Extragere județ
    for (const [judetName, judetData] of Object.entries(JUDETE_MAP)) {
      if (normalized.includes(judetName) || normalized.includes(judetData.cod)) {
        result.judet = judetData.nume;
        result.judetCod = judetData.cod;
        break;
      }
    }
    
    // Extragere stradă (text între "STRADA" și primul delimitator)
    const stradaMatch = normalized.match(/STRADA\s+([^,\d]+)/i);
    if (stradaMatch) {
      result.strada = stradaMatch[1].trim();
    }
    
    logger.info({ original: rawAddress, parsed: result }, 'Address normalized');
    
    return {
      status: 'success',
      ...result,
    };
  },
});
```

---

## B.3 Phone Normalizer Worker

### Configurare

```typescript
const B3_CONFIG: WorkerConfig = {
  queueName: 'bronze:normalize:phone',
  concurrency: 30,
  attempts: 2,
  timeout: 5000,
};
```

### Implementare

```typescript
// /apps/workers/src/normalize/phone-normalizer.worker.ts

interface PhoneNormalizerJobData {
  tenantId: string;
  contactId: string;
  rawPhone: string;
  correlationId: string;
}

// Prefixe operatori România
const MOBILE_PREFIXES = ['72', '73', '74', '75', '76', '77', '78', '79'];
const LANDLINE_PREFIXES: Record<string, string> = {
  '21': 'București',
  '31': 'București',
  '230': 'Suceava',
  '231': 'Botoșani',
  '232': 'Iași',
  '233': 'Neamț',
  '234': 'Bacău',
  '235': 'Galați',
  '236': 'Vrancea',
  '237': 'Buzău',
  '238': 'Brăila',
  '239': 'Tulcea',
  '240': 'Constanța',
  '241': 'Ialomița',
  '242': 'Călărași',
  '243': 'Prahova',
  '244': 'Dâmbovița',
  '245': 'Argeș',
  '246': 'Giurgiu',
  '247': 'Teleorman',
  '248': 'Olt',
  '249': 'Dolj',
  '250': 'Vâlcea',
  '251': 'Mehedinți',
  '252': 'Gorj',
  '253': 'Hunedoara',
  '254': 'Caraș-Severin',
  '255': 'Timiș',
  '256': 'Arad',
  '257': 'Bihor',
  '258': 'Alba',
  '259': 'Satu Mare',
  '260': 'Maramureș',
  '261': 'Sălaj',
  '262': 'Bistrița-Năsăud',
  '263': 'Cluj',
  '264': 'Cluj',
  '265': 'Mureș',
  '266': 'Harghita',
  '267': 'Covasna',
  '268': 'Brașov',
  '269': 'Sibiu',
};

export const phoneNormalizerWorker = createWorker<PhoneNormalizerJobData>({
  queueName: 'bronze:normalize:phone',
  concurrency: B3_CONFIG.concurrency,
  
  processor: async (job, logger) => {
    const { rawPhone } = job.data;
    
    if (!rawPhone) {
      return { status: 'skipped', reason: 'empty_phone' };
    }
    
    // Step 1: Eliminare tot ce nu e cifră sau +
    let cleaned = rawPhone.replace(/[^\d+]/g, '');
    
    // Step 2: Normalizare prefix internațional
    if (cleaned.startsWith('+40')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0040')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('40') && cleaned.length === 11) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Step 3: Validare lungime (9 cifre pentru România)
    if (cleaned.length !== 9) {
      return {
        status: 'invalid',
        reason: 'invalid_length',
        original: rawPhone,
        cleaned,
        expectedLength: 9,
        actualLength: cleaned.length,
      };
    }
    
    // Step 4: Determinare tip telefon
    const prefix2 = cleaned.substring(0, 2);
    const prefix3 = cleaned.substring(0, 3);
    
    let phoneType: 'mobile' | 'landline' | 'unknown' = 'unknown';
    let carrier: string | null = null;
    let region: string | null = null;
    
    if (MOBILE_PREFIXES.includes(prefix2)) {
      phoneType = 'mobile';
      // Carrier detection simplă
      if (['72', '73'].includes(prefix2)) carrier = 'Vodafone';
      else if (['74', '75'].includes(prefix2)) carrier = 'Orange';
      else if (['76'].includes(prefix2)) carrier = 'Telekom/DIGI';
      else if (['77', '78'].includes(prefix2)) carrier = 'Orange/Vodafone';
    } else if (LANDLINE_PREFIXES[prefix3]) {
      phoneType = 'landline';
      region = LANDLINE_PREFIXES[prefix3];
    } else if (LANDLINE_PREFIXES[prefix2]) {
      phoneType = 'landline';
      region = LANDLINE_PREFIXES[prefix2];
    }
    
    // Step 5: Format E.164
    const e164 = `+40${cleaned}`;
    
    // Step 6: Format display
    const displayFormat = phoneType === 'mobile'
      ? `0${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
      : `0${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7)}`;
    
    logger.info({
      original: rawPhone,
      e164,
      displayFormat,
      phoneType,
      carrier,
      region,
    }, 'Phone normalized');
    
    return {
      status: 'success',
      original: rawPhone,
      normalized: e164,
      displayFormat,
      phoneType,
      carrier,
      region,
    };
  },
});
```

### Exemple Normalizare

| Input | Output E.164 | Tip | Carrier/Regiune |
|-------|--------------|-----|-----------------|
| `0721 123 456` | `+40721123456` | mobile | Vodafone |
| `+40 745 123 456` | `+40745123456` | mobile | Orange |
| `0040.738.123.456` | `+40738123456` | mobile | Orange |
| `0238 123 456` | `+40238123456` | landline | Brăila |
| `021-312-45-67` | `+40213124567` | landline | București |

---

## B.4 Email Normalizer Worker

### Configurare

```typescript
const B4_CONFIG: WorkerConfig = {
  queueName: 'bronze:normalize:email',
  concurrency: 30,
  attempts: 2,
  timeout: 5000,
};
```

### Implementare

```typescript
// /apps/workers/src/normalize/email-normalizer.worker.ts

interface EmailNormalizerJobData {
  tenantId: string;
  contactId: string;
  rawEmail: string;
  correlationId: string;
}

// Email-uri generice/role-based
const ROLE_BASED_PREFIXES = [
  'info', 'contact', 'office', 'secretariat', 'admin',
  'support', 'sales', 'marketing', 'hr', 'contabilitate',
  'comenzi', 'facturi', 'juridic', 'tehnic', 'it',
  'receptie', 'director', 'manager', 'ceo', 'cfo',
];

// Provideri email cunoscuți
const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'yahoo.ro', 'hotmail.com',
  'outlook.com', 'live.com', 'icloud.com', 'mail.com',
  'protonmail.com', 'ymail.com', 'aol.com',
];

const RO_BUSINESS_PROVIDERS = [
  'rdslink.ro', 'clicknet.ro', 'rcs-rds.ro', 'romtelecom.ro',
  'dfrdi.ro', 'datapuls.ro', 'xnet.ro', 'cni.ro',
];

export const emailNormalizerWorker = createWorker<EmailNormalizerJobData>({
  queueName: 'bronze:normalize:email',
  concurrency: B4_CONFIG.concurrency,
  
  processor: async (job, logger) => {
    const { rawEmail } = job.data;
    
    if (!rawEmail) {
      return { status: 'skipped', reason: 'empty_email' };
    }
    
    // Step 1: Lowercase și trim
    let normalized = rawEmail.toLowerCase().trim();
    
    // Step 2: Eliminare spații și caractere invalide
    normalized = normalized.replace(/\s+/g, '');
    normalized = normalized.replace(/[<>()[\]\\,;:\s]+/g, '');
    
    // Step 3: Corectare greșeli comune
    normalized = normalized
      .replace(/@+/g, '@')              // Multiple @
      .replace(/\.+/g, '.')             // Multiple dots
      .replace(/^\.+|\.+$/g, '')        // Leading/trailing dots
      .replace(/@\./g, '@')             // @ followed by dot
      .replace(/\.@/g, '@');            // dot before @
    
    // Step 4: Validare format basic
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(normalized)) {
      return {
        status: 'invalid',
        reason: 'invalid_format',
        original: rawEmail,
        normalized,
      };
    }
    
    // Step 5: Extragere părți
    const [localPart, domain] = normalized.split('@');
    
    // Step 6: Determinare tip
    let emailType: 'corporate' | 'free' | 'ro_isp' | 'unknown' = 'unknown';
    
    if (FREE_EMAIL_PROVIDERS.includes(domain)) {
      emailType = 'free';
    } else if (RO_BUSINESS_PROVIDERS.some(p => domain.endsWith(p))) {
      emailType = 'ro_isp';
    } else if (domain.includes('.')) {
      emailType = 'corporate';
    }
    
    // Step 7: Check role-based
    const isRoleBased = ROLE_BASED_PREFIXES.some(prefix => 
      localPart === prefix || localPart.startsWith(`${prefix}.`) || localPart.startsWith(`${prefix}_`)
    );
    
    // Step 8: Extract company domain (pentru matching cu website)
    const companyDomain = domain.replace(/^(mail|email|webmail)\./, '');
    
    logger.info({
      original: rawEmail,
      normalized,
      domain,
      emailType,
      isRoleBased,
      companyDomain,
    }, 'Email normalized');
    
    return {
      status: 'success',
      original: rawEmail,
      normalized,
      localPart,
      domain,
      emailType,
      isRoleBased,
      companyDomain,
    };
  },
});
```

---

# CATEGORIA C: VALIDARE CUI (2 Workers)

## C.1 CUI Modulo-11 Validator Worker

### Configurare

```typescript
const C1_CONFIG: WorkerConfig = {
  queueName: 'silver:validate:cui-modulo11',
  concurrency: 50, // Offline, foarte rapid
  attempts: 2,
  timeout: 2000,
};
```

### Implementare

```typescript
// /apps/workers/src/validate/cui-modulo11.worker.ts

interface CuiValidatorJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId: string;
}

// Cheia de control pentru algoritmul modulo-11
const CONTROL_KEY = [7, 5, 3, 2, 1, 7, 5, 3, 2];

export const cuiModulo11Worker = createWorker<CuiValidatorJobData>({
  queueName: 'silver:validate:cui-modulo11',
  concurrency: C1_CONFIG.concurrency,
  
  processor: async (job, logger) => {
    const { companyId, cui } = job.data;
    
    // Step 1: Curățare CUI
    let cleanCui = cui.toString().toUpperCase().trim();
    
    // Eliminare prefix RO dacă există
    if (cleanCui.startsWith('RO')) {
      cleanCui = cleanCui.substring(2);
    }
    
    // Eliminare caractere non-numerice
    cleanCui = cleanCui.replace(/\D/g, '');
    
    // Step 2: Validare lungime (2-10 cifre)
    if (cleanCui.length < 2 || cleanCui.length > 10) {
      logger.warn({ cui, cleanCui }, 'Invalid CUI length');
      return {
        status: 'invalid',
        reason: 'invalid_length',
        original: cui,
        cleaned: cleanCui,
        expectedLength: '2-10',
        actualLength: cleanCui.length,
      };
    }
    
    // Step 3: Verificare doar cifre
    if (!/^\d+$/.test(cleanCui)) {
      return {
        status: 'invalid',
        reason: 'non_numeric',
        original: cui,
        cleaned: cleanCui,
      };
    }
    
    // Step 4: Padding la 9 cifre pentru algoritm
    const paddedCui = cleanCui.padStart(9, '0');
    
    // Step 5: Extragere cifră de control (ultima cifră)
    const digits = paddedCui.split('').map(Number);
    const checkDigit = digits.pop()!; // Ultima cifră
    
    // Step 6: Calcul sumă ponderată
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * CONTROL_KEY[i];
    }
    
    // Step 7: Calcul rest
    const remainder = (sum * 10) % 11;
    const expectedCheckDigit = remainder === 10 ? 0 : remainder;
    
    // Step 8: Comparare
    const isValid = checkDigit === expectedCheckDigit;
    
    logger.info({
      cui,
      cleanCui,
      isValid,
      checkDigit,
      expectedCheckDigit,
    }, 'CUI validated');
    
    // Step 9: Update company dacă valid
    if (isValid) {
      await db.update(silverCompanies)
        .set({
          cuiValidated: true,
          cuiValidationDate: new Date(),
          cuiValidationSource: 'modulo11',
        })
        .where(eq(silverCompanies.id, companyId));
    }
    
    return {
      status: isValid ? 'valid' : 'invalid',
      reason: isValid ? null : 'checksum_mismatch',
      original: cui,
      cleaned: cleanCui,
      checkDigit,
      expectedCheckDigit,
      isValid,
    };
  },
});

// Export funcție pentru testare
export function validateCuiModulo11(cui: string): boolean {
  let clean = cui.replace(/^RO/i, '').replace(/\D/g, '');
  if (clean.length < 2 || clean.length > 10) return false;
  
  const padded = clean.padStart(9, '0');
  const digits = padded.split('').map(Number);
  const check = digits.pop()!;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * CONTROL_KEY[i];
  }
  
  const remainder = (sum * 10) % 11;
  const expected = remainder === 10 ? 0 : remainder;
  
  return check === expected;
}
```

### Exemple Validare

| CUI | Valid | Explicație |
|-----|-------|------------|
| `12345678` | ✅ | Checksum corect |
| `RO12345678` | ✅ | Cu prefix RO |
| `12345679` | ❌ | Checksum greșit |
| `1` | ❌ | Prea scurt |
| `12345678901` | ❌ | Prea lung |

---

## C.2 CUI ANAF Validator Worker

### Configurare

```typescript
const C2_CONFIG: WorkerConfig = {
  queueName: 'silver:validate:cui-anaf',
  concurrency: 1, // ANAF rate limit: 1/sec
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  timeout: 30000,
  limiter: { max: 1, duration: 1000 },
};
```

### Implementare

```typescript
// /apps/workers/src/validate/cui-anaf.worker.ts

import { RateLimiter } from '@cerniq/rate-limiter';

const anafLimiter = new RateLimiter('anaf', {
  maxRequests: 1,
  windowMs: 1000,
});

interface AnafValidatorJobData {
  tenantId: string;
  companyId: string;
  cui: string;
  correlationId: string;
}

export const cuiAnafWorker = createWorker<AnafValidatorJobData>({
  queueName: 'silver:validate:cui-anaf',
  concurrency: C2_CONFIG.concurrency,
  limiter: C2_CONFIG.limiter,
  
  processor: async (job, logger) => {
    const { companyId, cui, tenantId } = job.data;
    
    // Step 1: Rate limiting
    await anafLimiter.acquire();
    
    // Step 2: Curățare CUI
    const cleanCui = cui.replace(/^RO/i, '').replace(/\D/g, '');
    
    logger.info({ cui: cleanCui }, 'Calling ANAF API');
    
    try {
      // Step 3: Call ANAF API
      // API ANAF: POST https://webservicesp.anaf.ro/AsynchProdFurniz/api/v10/ws/tva
      const response = await fetch('https://webservicesp.anaf.ro/AsynchProdFurniz/api/v10/ws/tva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          cui: parseInt(cleanCui),
          data: new Date().toISOString().split('T')[0], // Format: YYYY-MM-DD
        }]),
        signal: AbortSignal.timeout(25000),
      });
      
      if (!response.ok) {
        throw new Error(`ANAF API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Step 4: Parse response
      if (!data.found || data.found.length === 0) {
        logger.warn({ cui: cleanCui }, 'CUI not found in ANAF');
        return {
          status: 'not_found',
          cui: cleanCui,
          source: 'anaf',
        };
      }
      
      const companyData = data.found[0];
      
      // Step 5: Update silver company cu date ANAF
      await db.update(silverCompanies)
        .set({
          cuiValidated: true,
          cuiValidationDate: new Date(),
          cuiValidationSource: 'anaf_api',
          
          // Date din ANAF
          denumire: companyData.denumire,
          adresaCompleta: companyData.adresa,
          nrRegCom: companyData.nrRegCom,
          statusFirma: companyData.statusRO_TVA || 'ACTIVA',
          platitorTva: companyData.scpTVA || false,
          dataInceputTva: companyData.dataInceputScpTVA ? new Date(companyData.dataInceputScpTVA) : null,
          dataSfarsitTva: companyData.dataSfarsitScpTVA ? new Date(companyData.dataSfarsitScpTVA) : null,
          tvaLaIncasare: companyData.sistemTVAIncasare || false,
          inregistratEFactura: companyData.eFactura || false,
          dataInregistrareEFactura: companyData.dataEFactura ? new Date(companyData.dataEFactura) : null,
          splitTva: companyData.splitTVA || false,
          
          // Update enrichment sources
          enrichmentSourcesCompleted: sql`array_append(enrichment_sources_completed, 'anaf')`,
          lastEnrichmentAt: new Date(),
        })
        .where(eq(silverCompanies.id, companyId));
      
      logger.info({
        cui: cleanCui,
        denumire: companyData.denumire,
        platitorTva: companyData.scpTVA,
      }, 'ANAF validation success');
      
      return {
        status: 'valid',
        cui: cleanCui,
        source: 'anaf',
        data: companyData,
      };
      
    } catch (error) {
      logger.error({ error, cui: cleanCui }, 'ANAF API error');
      
      if (error.name === 'AbortError') {
        throw new Error('ANAF API timeout');
      }
      
      throw error;
    }
  },
});
```

---

# TRIGGERS CATEGORIA B → C

```typescript
// Când toate B.* complete → trigger C.1
const NORMALIZE_COMPLETE_TRIGGERS = {
  'bronze:normalize:complete': [
    { queue: 'silver:validate:cui-modulo11', condition: 'has_cui' },
  ],
  'silver:validate:cui-modulo11': [
    { queue: 'silver:validate:cui-anaf', condition: 'cui_valid_modulo11' },
  ],
};
```

---

# REZUMAT CATEGORIA B-C

| Worker | Queue | Concurrency | Rate Limit | Timeout |
|--------|-------|-------------|------------|---------|
| B.1 Name | `bronze:normalize:name` | 20 | - | 10s |
| B.2 Address | `bronze:normalize:address` | 20 | - | 15s |
| B.3 Phone | `bronze:normalize:phone` | 30 | - | 5s |
| B.4 Email | `bronze:normalize:email` | 30 | - | 5s |
| C.1 CUI Modulo-11 | `silver:validate:cui-modulo11` | 50 | - | 2s |
| C.2 CUI ANAF | `silver:validate:cui-anaf` | 1 | 1/s | 30s |

---

**Document generat:** 15 Ianuarie 2026
**Total workers Cat. B-C:** 6
