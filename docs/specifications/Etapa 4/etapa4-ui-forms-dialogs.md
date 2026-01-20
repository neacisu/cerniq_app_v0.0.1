# CERNIQ.APP — ETAPA 4: UI/UX FORMS & DIALOGS
## Complete Form and Dialog Specifications
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Credit Override Dialog

```tsx
interface CreditOverrideDialogProps {
  order: Order;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreditOverrideData) => Promise<void>;
}

export function CreditOverrideDialog({ order, open, onClose, onSubmit }: CreditOverrideDialogProps) {
  const form = useForm<CreditOverrideFormData>({
    defaultValues: {
      reason: '',
      overrideType: 'ONE_TIME',
      proposedLimit: order.totalAmount
    }
  });
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicită Override Credit</DialogTitle>
          <DialogDescription>
            Comandă {order.orderNumber} - {formatCurrency(order.totalAmount)}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Credit Info */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Credit Disponibil:</span>
                <span className="font-medium">{formatCurrency(order.client.creditProfile.creditAvailable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valoare Comandă:</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Depășire:</span>
                <span className="font-medium">{formatCurrency(order.totalAmount - order.client.creditProfile.creditAvailable)}</span>
              </div>
            </div>
            
            {/* Override Type */}
            <FormField
              control={form.control}
              name="overrideType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip Override</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">Doar această comandă</SelectItem>
                      <SelectItem value="TEMPORARY">Temporar (30 zile)</SelectItem>
                      <SelectItem value="PERMANENT">Mărire permanentă limită</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              rules={{ required: 'Motivul este obligatoriu' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivul Solicitării</FormLabel>
                  <Textarea {...field} placeholder="Explicați de ce este necesară această excepție..." rows={3} />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Anulează</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Trimite Solicitare
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 2. Manual Reconciliation Dialog

```tsx
export function ManualReconciliationDialog({ payment, open, onClose }: ManualReconciliationDialogProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: invoices } = useQuery({
    queryKey: ['invoices-pending', searchQuery],
    queryFn: () => searchPendingInvoices(searchQuery)
  });
  
  const handleSubmit = async () => {
    if (!selectedInvoice) return;
    await reconcileManually(payment.id, selectedInvoice);
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reconciliere Manuală</DialogTitle>
        </DialogHeader>
        
        {/* Payment Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Plată de reconciliat:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-gray-500">Sumă:</span>
            <span className="font-medium">{formatCurrency(payment.amount)}</span>
            <span className="text-gray-500">De la:</span>
            <span>{payment.counterpartyName}</span>
            <span className="text-gray-500">Descriere:</span>
            <span>{payment.description || '-'}</span>
            <span className="text-gray-500">Data:</span>
            <span>{formatDateTime(payment.transactionDate)}</span>
          </div>
        </div>
        
        {/* Invoice Search */}
        <div className="space-y-4">
          <Input
            placeholder="Caută factură după număr sau client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {invoices?.map((invoice) => (
              <div
                key={invoice.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedInvoice === invoice.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedInvoice(invoice.id)}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                  <span className={`font-medium ${Math.abs(invoice.totalAmount - payment.amount) < 0.01 ? 'text-green-600' : ''}`}>
                    {formatCurrency(invoice.totalAmount)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">{invoice.client.companyName}</div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSubmit} disabled={!selectedInvoice}>
            Reconciliază
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. Return Request Dialog

```tsx
export function ReturnRequestDialog({ order, open, onClose }: ReturnRequestDialogProps) {
  const form = useForm<ReturnRequestFormData>({
    defaultValues: {
      items: order.items.map(item => ({ itemId: item.id, quantity: 0, selected: false })),
      reason: '',
      reasonDetails: ''
    }
  });
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitare Retur</DialogTitle>
          <DialogDescription>Comandă {order.orderNumber}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Select Items */}
            <div>
              <FormLabel>Selectează produsele pentru retur:</FormLabel>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {order.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 border rounded">
                    <Checkbox
                      checked={form.watch(`items.${index}.selected`)}
                      onCheckedChange={(checked) => form.setValue(`items.${index}.selected`, checked)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-gray-500">Cantitate comandată: {item.quantity}</div>
                    </div>
                    {form.watch(`items.${index}.selected`) && (
                      <Input
                        type="number"
                        className="w-20"
                        min={1}
                        max={item.quantity}
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivul Returului</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selectează motiv" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WRONG_PRODUCT">Produs greșit</SelectItem>
                      <SelectItem value="DAMAGED_IN_TRANSIT">Deteriorat în transport</SelectItem>
                      <SelectItem value="DEFECTIVE">Defect</SelectItem>
                      <SelectItem value="NOT_AS_DESCRIBED">Nu corespunde descrierii</SelectItem>
                      <SelectItem value="CUSTOMER_CHANGED_MIND">M-am răzgândit</SelectItem>
                      <SelectItem value="OTHER">Altul</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            {/* Details */}
            <FormField
              control={form.control}
              name="reasonDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalii (opțional)</FormLabel>
                  <Textarea {...field} rows={2} />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Anulează</Button>
              <Button type="submit">Trimite Solicitare</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. HITL Approval Dialog

```tsx
export function HITLApprovalDialog({ task, open, onClose }: HITLApprovalDialogProps) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [notes, setNotes] = useState('');
  
  const handleSubmit = async () => {
    if (!decision) return;
    await resolveHitlTask(task.id, { decision, notes });
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            <Badge variant={task.priority === 'CRITICAL' ? 'destructive' : task.priority === 'HIGH' ? 'warning' : 'secondary'}>
              {task.priority}
            </Badge>
            {' • '}SLA: {formatDistanceToNow(new Date(task.slaDeadline))}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Task Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm">{task.description}</p>
            
            {task.metadata && (
              <div className="mt-3 space-y-1 text-sm">
                {Object.entries(task.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{typeof value === 'number' ? formatCurrency(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Decision Buttons */}
          <div className="flex gap-3">
            <Button
              variant={decision === 'APPROVED' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setDecision('APPROVED')}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Aprobă
            </Button>
            <Button
              variant={decision === 'REJECTED' ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => setDecision('REJECTED')}
            >
              <XCircle className="w-4 h-4 mr-2" /> Respinge
            </Button>
          </div>
          
          {/* Notes */}
          {decision && (
            <div>
              <Label>Note (opțional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adaugă note sau explicații..."
                rows={2}
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={handleSubmit} disabled={!decision}>
            Confirmă {decision === 'APPROVED' ? 'Aprobarea' : 'Respingerea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. Payment Reminder Settings Form

```tsx
export function PaymentReminderSettingsForm({ settings, onSave }: PaymentReminderSettingsProps) {
  const form = useForm({
    defaultValues: {
      firstReminderDays: settings.firstReminderDays || 7,
      secondReminderDays: settings.secondReminderDays || 14,
      finalReminderDays: settings.finalReminderDays || 21,
      autoBlockAfterDays: settings.autoBlockAfterDays || 30,
      channels: settings.channels || ['email', 'whatsapp']
    }
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Setări Reminder Plăți</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstReminderDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primul Reminder (zile după scadență)</FormLabel>
                  <Input type="number" {...field} min={1} />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="secondReminderDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Al Doilea Reminder</FormLabel>
                  <Input type="number" {...field} min={1} />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="finalReminderDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder Final</FormLabel>
                  <Input type="number" {...field} min={1} />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="autoBlockAfterDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Blocare Automată După</FormLabel>
                  <Input type="number" {...field} min={1} />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="channels" render={({ field }) => (
              <FormItem>
                <FormLabel>Canale Notificare</FormLabel>
                <div className="flex gap-4">
                  {['email', 'whatsapp', 'sms'].map((channel) => (
                    <label key={channel} className="flex items-center gap-2">
                      <Checkbox
                        checked={field.value.includes(channel)}
                        onCheckedChange={(checked) => {
                          if (checked) field.onChange([...field.value, channel]);
                          else field.onChange(field.value.filter(c => c !== channel));
                        }}
                      />
                      <span className="capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </FormItem>
            )} />
            
            <Button type="submit">Salvează Setări</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
