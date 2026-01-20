# CERNIQ.APP — ETAPA 1: UI FORMS & DIALOGS
## Form Components, Validation & Dialog Systems
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. FORM ARCHITECTURE

## 1.1 Form Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      FORM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│  React Hook Form v7 + Zod Validation + Shadcn/ui Components     │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │    Form     │───▶│   useForm   │───▶│   Zod      │        │
│  │  Component  │    │   (RHF)     │    │  Schema    │        │
│  └──────┬──────┘    └─────────────┘    └─────────────┘        │
│         │                                                       │
│  ┌──────▼──────┐    ┌─────────────┐                           │
│  │   Field     │───▶│  Controller │                           │
│  │  Components │    │   (RHF)     │                           │
│  └─────────────┘    └─────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Core Form Setup

```typescript
// packages/ui/src/components/form/form.tsx

import * as React from 'react';
import {
  useForm,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface FormProps<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: z.ZodSchema<T>;
  onSubmit: SubmitHandler<T>;
  children: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode);
  className?: string;
}

export function Form<T extends FieldValues>({
  schema,
  onSubmit,
  children,
  className,
  ...props
}: FormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    ...props,
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {typeof children === 'function' ? children(form) : children}
      </form>
    </FormProvider>
  );
}
```

---

# 2. ZOD VALIDATION SCHEMAS

## 2.1 Bronze Contact Schema

```typescript
// packages/validation/src/schemas/bronze.schema.ts

import { z } from 'zod';

// Romanian CUI validation
const cuiSchema = z.string()
  .regex(/^\d{6,10}$/, 'CUI must be 6-10 digits')
  .refine((cui) => validateCuiChecksum(cui), 'Invalid CUI checksum');

// Romanian phone validation
const phoneRoSchema = z.string()
  .regex(/^(\+40|0)[2-9]\d{8}$/, 'Invalid Romanian phone number')
  .optional();

// Email validation
const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .optional();

export const bronzeContactSchema = z.object({
  // Source identification
  sourceType: z.enum(['csv', 'xlsx', 'api', 'webhook', 'manual']),
  batchId: z.string().uuid().optional(),
  
  // Extracted data
  extractedName: z.string().min(2, 'Name too short').max(255),
  extractedCui: cuiSchema.optional(),
  extractedEmail: emailSchema,
  extractedPhone: phoneRoSchema,
  extractedAddress: z.string().max(500).optional(),
  
  // Raw data
  rawPayload: z.record(z.any()).optional(),
});

export type BronzeContactInput = z.infer<typeof bronzeContactSchema>;

// Checksum validation function
function validateCuiChecksum(cui: string): boolean {
  const digits = cui.padStart(10, '0').split('').map(Number);
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i];
  }
  
  const checksum = (sum * 10) % 11 % 10;
  return checksum === digits[9];
}
```

## 2.2 Silver Company Schema

```typescript
// packages/validation/src/schemas/silver.schema.ts

import { z } from 'zod';

export const silverCompanySchema = z.object({
  // Identification
  cui: z.string()
    .regex(/^\d{6,10}$/, 'CUI invalid'),
  denumire: z.string()
    .min(2, 'Denumire prea scurtă')
    .max(255, 'Denumire prea lungă'),
  nrRegCom: z.string()
    .regex(/^J\d{2}\/\d+\/\d{4}$/, 'Format Nr. Reg. Com invalid')
    .optional(),
  
  // Location
  adresaCompleta: z.string().max(500).optional(),
  localitate: z.string().max(100).optional(),
  judet: z.string().max(50).optional(),
  codPostal: z.string()
    .regex(/^\d{6}$/, 'Cod postal invalid')
    .optional(),
  
  // Contact
  emailPrincipal: z.string().email('Email invalid').optional(),
  telefonPrincipal: z.string()
    .regex(/^(\+40|0)[2-9]\d{8}$/, 'Telefon invalid')
    .optional(),
  website: z.string().url('URL invalid').optional(),
  
  // Business
  codCaenPrincipal: z.string()
    .regex(/^\d{4}$/, 'Cod CAEN invalid')
    .optional(),
  formaJuridica: z.enum(['SRL', 'SA', 'PFA', 'II', 'IF', 'SNC', 'SCS', 'ONG', 'COOP', 'OTHER'])
    .optional(),
  
  // Agricultural
  isAgricultural: z.boolean().optional(),
  suprafataAgricola: z.number().min(0).max(100000).optional(),
  culturiPrincipale: z.array(z.string()).max(10).optional(),
});

export type SilverCompanyInput = z.infer<typeof silverCompanySchema>;
```

## 2.3 Import Configuration Schema

```typescript
// packages/validation/src/schemas/import.schema.ts

import { z } from 'zod';

export const importConfigSchema = z.object({
  // File info
  fileName: z.string().min(1, 'File name required'),
  fileType: z.enum(['csv', 'xlsx', 'xls']),
  fileSize: z.number().max(50 * 1024 * 1024, 'File max 50MB'),
  
  // CSV/Excel options
  hasHeader: z.boolean().default(true),
  delimiter: z.enum([',', ';', '\t', '|']).default(','),
  encoding: z.enum(['utf-8', 'windows-1252', 'iso-8859-1']).default('utf-8'),
  sheetName: z.string().optional(), // For Excel
  
  // Column mapping
  mapping: z.object({
    name: z.string().min(1, 'Name column required'),
    cui: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  
  // Options
  skipDuplicates: z.boolean().default(true),
  validateCui: z.boolean().default(true),
});

export type ImportConfigInput = z.infer<typeof importConfigSchema>;
```

---

# 3. FORM FIELD COMPONENTS

## 3.1 FormField Component

```tsx
// packages/ui/src/components/form/form-field.tsx

import * as React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  children: React.ReactElement;
}

export function FormField({
  name,
  label,
  description,
  required,
  children,
}: FormFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name];

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      
      <Controller
        name={name}
        control={control}
        render={({ field }) =>
          React.cloneElement(children, {
            ...field,
            id: name,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${name}-error` : undefined,
          })
        }
      />
      
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
}
```

## 3.2 Input Field

```tsx
// packages/ui/src/components/form/input-field.tsx

import * as React from 'react';
import { Input, InputProps } from '../ui/input';
import { FormField } from './form-field';

interface InputFieldProps extends Omit<InputProps, 'name'> {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
}

export function InputField({
  name,
  label,
  description,
  required,
  ...props
}: InputFieldProps) {
  return (
    <FormField
      name={name}
      label={label}
      description={description}
      required={required}
    >
      <Input {...props} />
    </FormField>
  );
}
```

## 3.3 Select Field

```tsx
// packages/ui/src/components/form/select-field.tsx

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { FormField } from './form-field';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
}

export function SelectField({
  name,
  label,
  description,
  required,
  placeholder = 'Select...',
  options,
}: SelectFieldProps) {
  return (
    <FormField
      name={name}
      label={label}
      description={description}
      required={required}
    >
      <Select>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
```

## 3.4 CUI Input Field (Custom)

```tsx
// packages/ui/src/components/form/cui-input-field.tsx

import * as React from 'react';
import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { FormField } from './form-field';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CuiInputFieldProps {
  name: string;
  label?: string;
  onValidate?: (cui: string) => Promise<boolean>;
}

export function CuiInputField({
  name,
  label = 'CUI',
  onValidate,
}: CuiInputFieldProps) {
  const [validationState, setValidationState] = useState<
    'idle' | 'validating' | 'valid' | 'invalid'
  >('idle');

  const handleValidate = async (value: string) => {
    if (!value || value.length < 6) return;
    
    setValidationState('validating');
    try {
      const isValid = onValidate
        ? await onValidate(value)
        : validateCuiChecksum(value);
      setValidationState(isValid ? 'valid' : 'invalid');
    } catch {
      setValidationState('invalid');
    }
  };

  return (
    <FormField name={name} label={label}>
      <div className="relative">
        <Input
          placeholder="12345678"
          maxLength={10}
          className="pr-10"
          onBlur={(e) => handleValidate(e.target.value)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationState === 'validating' && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {validationState === 'valid' && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {validationState === 'invalid' && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    </FormField>
  );
}
```

## 3.5 Phone Input Field (Romanian)

```tsx
// packages/ui/src/components/form/phone-input-field.tsx

import * as React from 'react';
import { Input } from '../ui/input';
import { FormField } from './form-field';

interface PhoneInputFieldProps {
  name: string;
  label?: string;
}

export function PhoneInputField({ name, label = 'Telefon' }: PhoneInputFieldProps) {
  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as Romanian phone
    if (digits.startsWith('40')) {
      // International format
      return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`.trim();
    } else if (digits.startsWith('0')) {
      // National format
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`.trim();
    }
    
    return value;
  };

  return (
    <FormField name={name} label={label}>
      <Input
        type="tel"
        placeholder="0721 123 456"
        onChange={(e) => {
          e.target.value = formatPhone(e.target.value);
        }}
      />
    </FormField>
  );
}
```

---

# 4. FORM IMPLEMENTATIONS

## 4.1 Manual Entry Form

```tsx
// apps/web/src/components/forms/ManualEntryForm.tsx

import { Form } from '@cerniq/ui/form';
import { InputField, SelectField, CuiInputField, PhoneInputField } from '@cerniq/ui/form';
import { Button } from '@cerniq/ui/button';
import { bronzeContactSchema, BronzeContactInput } from '@cerniq/validation';
import { useCreate } from '@refinedev/core';

export function ManualEntryForm() {
  const { mutate: create, isLoading } = useCreate();

  const handleSubmit = async (data: BronzeContactInput) => {
    create({
      resource: 'bronze/contacts',
      values: {
        ...data,
        sourceType: 'manual',
      },
    });
  };

  return (
    <Form
      schema={bronzeContactSchema}
      onSubmit={handleSubmit}
      defaultValues={{
        sourceType: 'manual',
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="extractedName"
          label="Denumire Firmă"
          required
          placeholder="SC Exemplu SRL"
        />
        
        <CuiInputField
          name="extractedCui"
          label="CUI"
          onValidate={async (cui) => {
            // API validation
            const res = await fetch(`/api/v1/validate/cui/${cui}`);
            return res.ok;
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          name="extractedEmail"
          label="Email"
          type="email"
          placeholder="contact@firma.ro"
        />
        
        <PhoneInputField
          name="extractedPhone"
          label="Telefon"
        />
      </div>

      <InputField
        name="extractedAddress"
        label="Adresă"
        placeholder="Str. Exemplu, Nr. 1, București"
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">
          Anulează
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Se salvează...' : 'Salvează Contact'}
        </Button>
      </div>
    </Form>
  );
}
```

## 4.2 Import Mapping Form

```tsx
// apps/web/src/components/forms/ImportMappingForm.tsx

import { useState } from 'react';
import { Form } from '@cerniq/ui/form';
import { SelectField, SwitchField } from '@cerniq/ui/form';
import { Button } from '@cerniq/ui/button';
import { importConfigSchema, ImportConfigInput } from '@cerniq/validation';
import { Table, TableHead, TableRow, TableCell, TableBody } from '@cerniq/ui/table';

interface ImportMappingFormProps {
  fileColumns: string[];
  previewData: Record<string, string>[];
  onSubmit: (config: ImportConfigInput) => void;
}

export function ImportMappingForm({
  fileColumns,
  previewData,
  onSubmit,
}: ImportMappingFormProps) {
  const columnOptions = [
    { value: '', label: '-- Nu mapează --' },
    ...fileColumns.map((col) => ({ value: col, label: col })),
  ];

  const targetFields = [
    { key: 'name', label: 'Denumire Firmă', required: true },
    { key: 'cui', label: 'CUI', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Telefon', required: false },
    { key: 'address', label: 'Adresă', required: false },
  ];

  return (
    <Form
      schema={importConfigSchema}
      onSubmit={onSubmit}
      className="space-y-6"
    >
      {/* Column Mapping */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Mapare Coloane</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {targetFields.map((field) => (
            <SelectField
              key={field.key}
              name={`mapping.${field.key}`}
              label={field.label}
              required={field.required}
              options={columnOptions}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Preview (primele 5 rânduri)</h3>
        <div className="border rounded-md overflow-auto max-h-64">
          <Table>
            <TableHead>
              <TableRow>
                {fileColumns.map((col) => (
                  <TableCell key={col} className="font-medium">
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.slice(0, 5).map((row, i) => (
                <TableRow key={i}>
                  {fileColumns.map((col) => (
                    <TableCell key={col}>{row[col]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Opțiuni Import</h3>
        
        <div className="flex gap-6">
          <SwitchField
            name="hasHeader"
            label="Fișierul are header"
          />
          <SwitchField
            name="skipDuplicates"
            label="Omite duplicatele"
          />
          <SwitchField
            name="validateCui"
            label="Validează CUI"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline">
          Înapoi
        </Button>
        <Button type="submit">
          Începe Importul
        </Button>
      </div>
    </Form>
  );
}
```

---

# 5. DIALOG COMPONENTS

## 5.1 Base Dialog

```tsx
// packages/ui/src/components/dialog/dialog.tsx

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
);

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

## 5.2 Confirmation Dialog

```tsx
// packages/ui/src/components/dialog/confirmation-dialog.tsx

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@radix-ui/react-alert-dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

type DialogVariant = 'default' | 'destructive' | 'warning' | 'success';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

const variantIcons: Record<DialogVariant, React.ReactNode> = {
  default: <Info className="h-6 w-6 text-blue-500" />,
  destructive: <AlertTriangle className="h-6 w-6 text-red-500" />,
  warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
  success: <CheckCircle className="h-6 w-6 text-green-500" />,
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {variantIcons[variant]}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isLoading}>
              {cancelLabel}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Se procesează...' : confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## 5.3 Company Details Dialog

```tsx
// apps/web/src/components/dialogs/CompanyDetailsDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@cerniq/ui/dialog';
import { Badge } from '@cerniq/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cerniq/ui/tabs';
import { QualityScoreBadge } from '@cerniq/ui/badges';
import { useOne } from '@refinedev/core';

interface CompanyDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  layer: 'silver' | 'gold';
}

export function CompanyDetailsDialog({
  open,
  onOpenChange,
  companyId,
  layer,
}: CompanyDetailsDialogProps) {
  const { data, isLoading } = useOne({
    resource: `${layer}/companies`,
    id: companyId,
    queryOptions: { enabled: open },
  });

  const company = data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {company?.denumire}
            <Badge variant="outline">{company?.cui}</Badge>
            {layer === 'silver' && company?.totalQualityScore && (
              <QualityScoreBadge score={company.totalQualityScore} />
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">Se încarcă...</div>
        ) : company ? (
          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="financial">Financiar</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="enrichment">Îmbogățire</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <InfoSection title="Identificare">
                <InfoRow label="Denumire" value={company.denumire} />
                <InfoRow label="CUI" value={company.cui} />
                <InfoRow label="Nr. Reg. Com" value={company.nrRegCom} />
                <InfoRow label="Formă Juridică" value={company.formaJuridica} />
                <InfoRow label="Status" value={
                  <Badge variant={company.statusFirma === 'ACTIVA' ? 'success' : 'destructive'}>
                    {company.statusFirma}
                  </Badge>
                } />
              </InfoSection>

              <InfoSection title="Locație">
                <InfoRow label="Adresă" value={company.adresaCompleta} />
                <InfoRow label="Localitate" value={company.localitate} />
                <InfoRow label="Județ" value={company.judet} />
                <InfoRow label="Cod Poștal" value={company.codPostal} />
              </InfoSection>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4">
              <InfoSection title="Date Financiare">
                <InfoRow label="Cifră Afaceri" value={formatCurrency(company.cifraAfaceri)} />
                <InfoRow label="Profit Net" value={formatCurrency(company.profitNet)} />
                <InfoRow label="Nr. Angajați" value={company.numarAngajati} />
                <InfoRow label="An Bilanț" value={company.anBilant} />
              </InfoSection>

              <InfoSection title="Risc">
                <InfoRow label="Scor Risc" value={company.scorRiscTermene} />
                <InfoRow label="Categorie" value={
                  <Badge variant={
                    company.categorieRisc === 'LOW' ? 'success' :
                    company.categorieRisc === 'HIGH' ? 'destructive' : 'warning'
                  }>
                    {company.categorieRisc}
                  </Badge>
                } />
              </InfoSection>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <InfoSection title="Contact">
                <InfoRow label="Email" value={company.emailPrincipal} />
                <InfoRow label="Telefon" value={company.telefonPrincipal} />
                <InfoRow label="Website" value={
                  company.website && (
                    <a href={company.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
                      {company.website}
                    </a>
                  )
                } />
              </InfoSection>
            </TabsContent>

            <TabsContent value="enrichment" className="space-y-4">
              <InfoSection title="Surse Completate">
                <div className="flex flex-wrap gap-2">
                  {company.enrichmentSourcesCompleted?.map((source: string) => (
                    <Badge key={source} variant="secondary">{source}</Badge>
                  ))}
                </div>
              </InfoSection>

              <InfoSection title="Scoruri Calitate">
                <InfoRow label="Completitudine" value={`${company.completenessScore}%`} />
                <InfoRow label="Acuratețe" value={`${company.accuracyScore}%`} />
                <InfoRow label="Prospețime" value={`${company.freshnessScore}%`} />
                <InfoRow label="Total" value={
                  <QualityScoreBadge score={company.totalQualityScore} showLabel />
                } />
              </InfoSection>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Compania nu a fost găsită
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
      <dl className="grid grid-cols-2 gap-2">{children}</dl>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || '-'}</dd>
    </>
  );
}
```

## 5.4 Dedup Review Dialog

```tsx
// apps/web/src/components/dialogs/DedupReviewDialog.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@cerniq/ui/dialog';
import { Button } from '@cerniq/ui/button';
import { Badge } from '@cerniq/ui/badge';
import { Progress } from '@cerniq/ui/progress';
import { Card, CardContent } from '@cerniq/ui/card';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface DedupReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ApprovalTask;
  onDecision: (decision: 'merge' | 'reject', reason?: string) => void;
}

export function DedupReviewDialog({
  open,
  onOpenChange,
  task,
  onDecision,
}: DedupReviewDialogProps) {
  const { companyAName, companyBName, confidence, scores } = task.metadata;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Revizuire Duplicat Potențial</DialogTitle>
        </DialogHeader>

        {/* Confidence Score */}
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              Scor Similaritate
            </div>
            <Progress value={confidence * 100} className="h-2" />
          </div>
          <Badge variant={confidence >= 0.85 ? 'success' : 'warning'}>
            {Math.round(confidence * 100)}%
          </Badge>
        </div>

        {/* Similarity Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <ScoreCard label="Nume" score={scores.name} />
          <ScoreCard label="Adresă" score={scores.address} />
          <ScoreCard label="Telefon" score={scores.phone} />
        </div>

        {/* Company Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <CompanyCard
            title="Compania A"
            company={task.metadata.companyA}
          />
          <CompanyCard
            title="Compania B (Master)"
            company={task.metadata.companyB}
            isMaster
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Anulează
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDecision('reject', 'Not duplicates')}
          >
            <XCircle className="w-4 h-4 mr-2" />
            Nu sunt duplicate
          </Button>
          <Button
            onClick={() => onDecision('merge', 'Confirmed duplicate')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Unește <ArrowRight className="w-4 h-4 mx-1" /> B
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={score * 100} className="h-1.5 flex-1" />
          <span className="text-sm font-medium">{Math.round(score * 100)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function CompanyCard({ 
  title, 
  company, 
  isMaster = false 
}: { 
  title: string; 
  company: any; 
  isMaster?: boolean;
}) {
  return (
    <Card className={isMaster ? 'border-primary' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-medium">{title}</h4>
          {isMaster && <Badge>Master</Badge>}
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Denumire</dt>
            <dd className="font-medium">{company.denumire}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">CUI</dt>
            <dd>{company.cui}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Localitate</dt>
            <dd>{company.localitate}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Telefon</dt>
            <dd>{company.telefonPrincipal || '-'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
```

---

# 6. DRAWER COMPONENT

```tsx
// packages/ui/src/components/drawer/drawer.tsx

import * as React from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
);

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/80', className)}
    {...props}
  />
));

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    side?: 'left' | 'right';
  }
>(({ className, children, side = 'right', ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex h-full flex-col bg-background',
        side === 'right' && 'inset-y-0 right-0 w-3/4 max-w-md border-l',
        side === 'left' && 'inset-y-0 left-0 w-3/4 max-w-md border-r',
        className
      )}
      {...props}
    >
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('grid gap-1.5 p-4 border-b', className)}
    {...props}
  />
);

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col gap-2 p-4 border-t', className)}
    {...props}
  />
);

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
