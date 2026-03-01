# CERNIQ.APP — ETAPA 5: UI FORMS & DIALOGS

## Complete Form Specifications

### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Referral Forms

### CreateReferralForm

```typescript
interface CreateReferralFormData {
  referrerClientId: string; // Pre-filled from context
  referredContactName: string; // Required
  referredContactPhone: string; // Optional, Romanian format
  referredContactEmail: string; // Optional, email validation
  referredCompanyName: string; // Optional
  relationship: ReferralRelationship; // Required dropdown
  relationshipDetail: string; // Optional text
  howTheyKnowUs: string; // Optional dropdown
  notes: string; // Optional textarea
  consentConfirmed: boolean; // Required checkbox
}

// Form Schema (Zod)
const createReferralSchema = z.object({
  referrerClientId: z.string().uuid(),
  referredContactName: z.string().min(2).max(200),
  referredContactPhone: z
    .string()
    .regex(/^(\+40|0)[0-9]{9}$/)
    .optional(),
  referredContactEmail: z.string().email().optional(),
  referredCompanyName: z.string().max(200).optional(),
  relationship: z.enum([
    "NEIGHBOR",
    "FAMILY",
    "BUSINESS_PARTNER",
    "ASSOCIATION_MEMBER",
    "FRIEND",
    "OTHER",
  ]),
  relationshipDetail: z.string().max(500).optional(),
  howTheyKnowUs: z
    .enum(["RECOMMENDED_BY_US", "SAW_OUR_WORK", "HEARD_ABOUT_US", "OTHER"])
    .optional(),
  notes: z.string().max(1000).optional(),
  consentConfirmed: z.boolean().refine((v) => v === true, {
    message: "Trebuie să confirmați acordul pentru partajare",
  }),
});

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Adaugă Referral Nou                              [X]   │
├────────────────────────────────────────────────────────┤
│ Referrer: [Ion Popescu - Agro Farm SRL] (readonly)    │
│                                                        │
│ Persoană Referită *                                   │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Nume complet                                     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Date Contact (opțional)                               │
│ ┌──────────────────────┐ ┌──────────────────────┐    │
│ │ Telefon              │ │ Email                │    │
│ └──────────────────────┘ └──────────────────────┘    │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Firma (opțional)                                 │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Relație cu referrer-ul *                              │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ▼ Selectează                                     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Note adiționale                                       │
│ ┌──────────────────────────────────────────────────┐  │
│ │                                                  │  │
│ │                                                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ☑ Confirm că am acordul clientului să partajez       │
│   informațiile de contact ale persoanei referite *   │
│                                                        │
│              [Anulează]  [Salvează Referral]          │
└────────────────────────────────────────────────────────┘
*/
```

### ReferralConsentRequestForm

```typescript
interface ConsentRequestFormData {
  channel: "WHATSAPP" | "EMAIL";
  customMessage: string;
  useTemplate: boolean;
  templateId: string;
}

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Solicită Consimțământ pentru Referral            [X]   │
├────────────────────────────────────────────────────────┤
│ Referral: Maria Ionescu (de la Ion Popescu)           │
│                                                        │
│ Canal de comunicare *                                 │
│ ○ WhatsApp (recomandat)                               │
│ ○ Email                                               │
│                                                        │
│ Mesaj                                                 │
│ ○ Folosește template standard                         │
│ ● Mesaj personalizat                                  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Bună ziua! Am vorbit cu domnul Ion Popescu,     │  │
│ │ care mi-a recomandat să vă contactez în         │  │
│ │ legătură cu produsele noastre agricole...       │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Preview mesaj final:                                  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ [Rendered preview]                               │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│              [Anulează]  [Trimite Solicitare]         │
└────────────────────────────────────────────────────────┘
*/
```

---

## 2. Churn Intervention Forms

### ChurnInterventionForm

```typescript
interface ChurnInterventionFormData {
  clientId: string;
  interventionType: InterventionType;
  priority: "CRITICAL" | "HIGH" | "NORMAL";
  scheduledAt: Date | null;
  assignedTo: string | null;
  notes: string;
  offerType: string | null;
  offerValue: number | null;
  offerValidDays: number;
}

// Form Schema
const churnInterventionSchema = z
  .object({
    clientId: z.string().uuid(),
    interventionType: z.enum(["CALL", "EMAIL", "VISIT", "OFFER", "ESCALATE"]),
    priority: z.enum(["CRITICAL", "HIGH", "NORMAL"]),
    scheduledAt: z.date().optional(),
    assignedTo: z.string().uuid().optional(),
    notes: z.string().max(2000),
    offerType: z
      .enum(["DISCOUNT", "CREDIT", "FREE_SHIPPING", "GIFT"])
      .optional(),
    offerValue: z.number().positive().max(50).optional(), // Max 50%
    offerValidDays: z.number().int().min(7).max(90).default(30),
  })
  .refine(
    (data) => {
      if (data.interventionType === "OFFER") {
        return data.offerType && data.offerValue;
      }
      return true;
    },
    { message: "Oferta necesită tip și valoare" },
  );

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Intervenție Client la Risc                       [X]   │
├────────────────────────────────────────────────────────┤
│ Client: Ferma Nord SRL                                 │
│ Scor Churn: 🔴 85%  │  Zile inactive: 47             │
│                                                        │
│ Semnale active:                                       │
│ • Competitor mention (Strength: 70)                   │
│ • Payment delay 21 days (Strength: 55)                │
│ • Communication fade (Strength: 40)                   │
│                                                        │
│ ─────────────────────────────────────────────────────  │
│                                                        │
│ Tip Intervenție *                                     │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ▼ Telefon personal                               │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Prioritate *                                          │
│ ○ 🔴 Critical (< 2h)                                 │
│ ● 🟠 High (< 24h)                                    │
│ ○ 🟡 Normal (< 72h)                                  │
│                                                        │
│ Programare                                            │
│ ┌──────────────────────┐ ┌──────────────────────┐    │
│ │ 📅 Data              │ │ 🕐 Ora               │    │
│ └──────────────────────┘ └──────────────────────┘    │
│                                                        │
│ Asignat la                                            │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ▼ Selectează agent                               │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ☑ Include ofertă specială                            │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│   │ Tip: ▼     │ │ Val: 15 % │ │ Valid: 30d │       │
│   └────────────┘ └────────────┘ └────────────┘       │
│                                                        │
│ Note pentru agent                                     │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Client important cu istoric bun. A menționat    │  │
│ │ prețurile de la competiție...                   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│              [Anulează]  [Programează Intervenție]    │
└────────────────────────────────────────────────────────┘
*/
```

---

## 3. Win-Back Campaign Forms

### CreateWinBackCampaignForm

```typescript
interface CreateWinBackCampaignFormData {
  clientId: string;
  campaignType: WinBackCampaignType;
  strategy: "STANDARD" | "AGGRESSIVE" | "CUSTOM";
  customSteps: WinBackStep[];
  offerType: string | null;
  offerValue: number | null;
  personalizedMessage: string;
  useAiMessage: boolean;
  messageTone: "FORMAL" | "FRIENDLY" | "URGENT";
  startImmediately: boolean;
  scheduledStart: Date | null;
}

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Creează Campanie Win-Back                        [X]   │
├────────────────────────────────────────────────────────┤
│ Client: Agro Plus SRL                                  │
│ Zile churned: 95  │  Revenue istoric: €8,450         │
│                                                        │
│ Tip Campanie *                                        │
│ ○ 💬 Ofertă discount (pentru clienți standard)       │
│ ● 📞 Apel personal (pentru clienți valoroși)         │
│ ○ 📧 Update produse (pentru clienți curioși)         │
│                                                        │
│ Strategie                                             │
│ ○ Standard (4 pași în 14 zile)                        │
│ ● Agresiv (6 pași în 21 zile)                         │
│ ○ Personalizat                                        │
│                                                        │
│ Preview pași:                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Ziua 0: Email inițial                            │  │
│ │ Ziua 3: WhatsApp follow-up                       │  │
│ │ Ziua 7: Email cu ofertă                          │  │
│ │ Ziua 10: WhatsApp reminder                       │  │
│ │ Ziua 14: Apel telefonic                          │  │
│ │ Ziua 21: Email final                             │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Ofertă (opțional)                                     │
│ ┌────────────────┐ ┌────────────────┐                 │
│ │ Tip: Discount▼│ │ Valoare: 15% │                 │
│ └────────────────┘ └────────────────┘                 │
│                                                        │
│ Mesaj personalizat                                    │
│ ○ Generează cu AI (recomandat)                        │
│ ● Scrie manual                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Dragă domnule Ionescu, ne-a părut rău să        │  │
│ │ vedem că nu am mai colaborat în ultima          │  │
│ │ perioadă...                                     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Start                                                 │
│ ● Imediat                                             │
│ ○ Programat: [📅 Data] [🕐 Ora]                      │
│                                                        │
│              [Anulează]  [Creează Campanie]           │
└────────────────────────────────────────────────────────┘
*/
```

---

## 4. NPS Survey Forms

### NPSResponseForm

```typescript
interface NPSResponseFormData {
  surveyId: string;
  npsScore: number; // 0-10
  satisfactionScore: number; // 1-5
  wouldRecommend: boolean;
  feedbackText: string;
  selectedTopics: string[]; // Predefined topics
}

// Layout (WhatsApp Interactive / Web)
/*
┌────────────────────────────────────────────────────────┐
│ Feedback-ul Dumneavoastră                              │
├────────────────────────────────────────────────────────┤
│ Pe o scară de la 0 la 10, cât de probabil ați        │
│ recomanda Cerniq unui prieten sau coleg?             │
│                                                        │
│ 😞 0  1  2  3  4  5  6  7  8  9  10 😊               │
│    ○  ○  ○  ○  ○  ○  ○  ○  ●  ○  ○                  │
│                                                        │
│ ─────────────────────────────────────────────────────  │
│                                                        │
│ Cât de mulțumit sunteți de ultima comandă?           │
│ ★ ★ ★ ★ ☆  (4/5)                                    │
│                                                        │
│ Ce v-a plăcut cel mai mult? (selectați)              │
│ ☑ Calitatea produselor                               │
│ ☐ Prețurile                                          │
│ ☑ Livrarea rapidă                                    │
│ ☐ Comunicarea                                        │
│ ☐ Suportul tehnic                                    │
│                                                        │
│ Aveți sugestii pentru noi?                           │
│ ┌──────────────────────────────────────────────────┐  │
│ │                                                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│                         [Trimite Feedback]            │
└────────────────────────────────────────────────────────┘
*/
```

---

## 5. HITL Resolution Forms

### HITLResolutionForm

```typescript
interface HITLResolutionFormData {
  taskId: string;
  decision: HITLDecision;
  notes: string;
  actionTaken: string;
  scheduledFollowup: Date | null;
  assignTo: string | null;
  escalateTo: string | null;
  customFields: Record<string, any>;
}

// Form Schema
const hitlResolutionSchema = z
  .object({
    taskId: z.string().uuid(),
    decision: z.enum([
      "APPROVED",
      "REJECTED",
      "MODIFIED",
      "ESCALATED",
      "DEFERRED",
    ]),
    notes: z.string().min(10).max(2000),
    actionTaken: z.string().max(500).optional(),
    scheduledFollowup: z.date().optional(),
    assignTo: z.string().uuid().optional(),
    escalateTo: z.string().uuid().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === "ESCALATED") {
        return !!data.escalateTo;
      }
      return true;
    },
    { message: "Selectați persoana pentru escalare" },
  );

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Rezolvă Task HITL                                [X]   │
├────────────────────────────────────────────────────────┤
│ Task: CHURN_INTERVENTION                               │
│ Client: Ferma Nord SRL                                 │
│ Prioritate: 🔴 CRITICAL  │  SLA: ⏰ 45 min rămase    │
│                                                        │
│ Context:                                               │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Scor churn 85%, competitor mention în ultima    │  │
│ │ conversație. Client cu revenue €45K în ultimul │  │
│ │ an. Recomandat: apel telefonic urgent.         │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Decizie *                                             │
│ ○ ✅ Aprob (execută acțiunea recomandată)            │
│ ○ ✏️ Modific (ajustez parametrii)                    │
│ ● 📞 Am luat legătura (rezolvat manual)              │
│ ○ ⏰ Amân (programez pentru mai târziu)              │
│ ○ ⬆️ Escalez (transfer la superior)                  │
│                                                        │
│ Acțiune efectuată                                     │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Am sunat clientul. A menționat că a testat     │  │
│ │ produse de la X dar nu este mulțumit. Vrea     │  │
│ │ să revină cu o comandă săptămâna viitoare...   │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ☐ Programează follow-up                               │
│   [📅 Data] [🕐 Ora]                                 │
│                                                        │
│ Note interne                                          │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Risc scăzut acum. Monitorizare în 2 săptămâni. │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│                    [Anulează]  [Finalizează Task]     │
└────────────────────────────────────────────────────────┘
*/
```

---

## 6. Cluster Management Forms

### ManualClusterForm

```typescript
interface ManualClusterFormData {
  clusterName: string;
  clusterType: ClusterType;
  description: string;
  linkedAssociationId: string | null;
  initialMemberIds: string[];
  kolClientId: string | null;
}

// Layout
/*
┌────────────────────────────────────────────────────────┐
│ Creează Cluster Manual                           [X]   │
├────────────────────────────────────────────────────────┤
│ Nume Cluster *                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Grupul Fermierilor din Comuna Baldovinești      │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Tip Cluster *                                         │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ▼ Geographic (vecinătate)                        │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Asociație formală legată (opțional)                  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🔍 Caută asociație...                           │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Membri inițiali *                                     │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 🔍 Caută și adaugă clienți...                   │  │
│ └──────────────────────────────────────────────────┘  │
│ Selectați: 5 clienți                                 │
│ • Ion Popescu - Agro Farm SRL         [×]            │
│ • Maria Ionescu - Green Farm          [×]            │
│ • ...                                                │
│                                                        │
│ Key Opinion Leader                                    │
│ ┌──────────────────────────────────────────────────┐  │
│ │ ▼ Ion Popescu (cel mai central)                  │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ Descriere                                             │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Grup informal de fermieri...                    │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│              [Anulează]  [Creează Cluster]            │
└────────────────────────────────────────────────────────┘
*/
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
