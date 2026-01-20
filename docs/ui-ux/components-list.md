# Lista Componentelor UI

Această listă include componentele atomice (Shadcn/UI) și componentele moleculare specifice business-ului Cerniq.app.

## 1. Primitives (Atomic)

Acestea se regăsesc în `components/ui/*.tsx`.

| Componentă | Descriere | Shadcn Original |
| ---------- | --------- | --------------- |
| `Button` | Buton standard cu variante (default, destructive, outline). | Yes |
| `Input` | Câmp text simplu. | Yes |
| `Select` | Dropdown nativ-like. | Yes |
| `DataTable` | Tabel cu sortare, filtrare (TanStack Table). | Yes |
| `Dialog` | Modal windows. | Yes |
| `Toast` | Notificări efemere (Sonner). | Yes |
| `Badge` | Etichete status (ex: "APPROVED"). | Yes |
| `Calendar` | Date picker (Day.js integrat). | Yes |

## 2. Business Components (Molecular)

Acestea sunt specifice Cerniq și compun primitivele de mai sus.

### `LeadStatusBadge`

- **Input**: `status` (COLD, WARM, etc).
- **Output**: Badge colorat conform `design-tokens.md` (Gold pentru Negotiation, Green pentru Converted).

### `CuiInput`

- **Descriere**: Input text cu validare automată format CIF/CUI românesc.
- **Features**: Auto-trim, numeric check.

### `PhoneInputRO`

- **Descriere**: Input telefon fixat pe prefix `+40`.
- **Features**: Validare lungime 10 cifre.

### `KanbanBoard`

- **Descriere**: Vizualizare pipeline vânzări (Etapa 3/Lead Journey).
- **Drag & Drop**: Integrat pentru schimbarea statusului.

### `ChatInterface`

- **Descriere**: Fereastră conversație stil WhatsApp/Grok.
- **Features**: Istoric mesaje, input, file attachment, "Stop AI" button.
