# CERNIQ.APP — ETAPA 2: UI FORMS & DIALOGS

## Complete Form and Dialog Specifications

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. FORMS

### 1.1 Send Message Form

```tsx
// components/outreach/forms/SendMessageForm.tsx

interface SendMessageFormProps {
  leadId: string;
  defaultChannel?: 'WHATSAPP' | 'EMAIL_WARM';
  onSuccess?: () => void;
}

const sendMessageSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL_WARM']),
  templateId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  subject: z.string().max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export function SendMessageForm({ leadId, defaultChannel = 'WHATSAPP', onSuccess }: SendMessageFormProps) {
  const form = useForm<z.infer<typeof sendMessageSchema>>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      channel: defaultChannel,
      content: '',
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['templates', form.watch('channel')],
    queryFn: () => fetchTemplates({ channel: form.watch('channel') }),
  });

  const sendMutation = useMutation({
    mutationFn: (data: z.infer<typeof sendMessageSchema>) =>
      api.post(`/outreach/leads/${leadId}/send-message`, data),
    onSuccess: () => {
      toast.success('Mesaj trimis cu succes');
      onSuccess?.();
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(sendMutation.mutate)} className="space-y-4">
        
        {/* Channel Selection */}
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canal</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectează canal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="WHATSAPP">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-500" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="EMAIL_WARM">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-500" />
                      Email
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Template Selection (Optional) */}
        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template (opțional)</FormLabel>
              <Select onValueChange={(value) => {
                field.onChange(value);
                const template = templates?.find(t => t.id === value);
                if (template) {
                  form.setValue('content', template.content);
                  if (template.subject) {
                    form.setValue('subject', template.subject);
                  }
                }
              }}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Alege template sau scrie manual" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* Subject (for email) */}
        {form.watch('channel') === 'EMAIL_WARM' && (
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subiect</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Subiect email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Content */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mesaj</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Scrie mesajul aici..."
                  rows={6}
                  className="resize-none"
                />
              </FormControl>
              <FormDescription>
                {field.value.length}/4000 caractere
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Schedule Option */}
        <FormField
          control={form.control}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem className="flex items-center gap-4">
              <FormControl>
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const tomorrow9am = new Date();
                      tomorrow9am.setDate(tomorrow9am.getDate() + 1);
                      tomorrow9am.setHours(9, 0, 0, 0);
                      field.onChange(tomorrow9am.toISOString());
                    } else {
                      field.onChange(undefined);
                    }
                  }}
                />
              </FormControl>
              <FormLabel>Programează trimiterea</FormLabel>
              {field.value && (
                <Input
                  type="datetime-local"
                  value={field.value?.slice(0, 16)}
                  onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                  className="w-auto"
                />
              )}
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Anulează
          </Button>
          <Button type="submit" disabled={sendMutation.isPending}>
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Trimite
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 1.2 Create Sequence Form

```tsx
// components/outreach/forms/CreateSequenceForm.tsx

const sequenceSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  primaryChannel: z.enum(['WHATSAPP', 'EMAIL']),
  respectBusinessHours: z.boolean().default(true),
  stopOnReply: z.boolean().default(true),
  steps: z.array(z.object({
    delayHours: z.number().min(0).max(720),
    delayMinutes: z.number().min(0).max(59).default(0),
    channel: z.enum(['WHATSAPP', 'EMAIL_COLD', 'EMAIL_WARM']),
    templateId: z.string().uuid(),
  })).min(1).max(10),
});

export function CreateSequenceForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<z.infer<typeof sequenceSchema>>({
    resolver: zodResolver(sequenceSchema),
    defaultValues: {
      primaryChannel: 'WHATSAPP',
      respectBusinessHours: true,
      stopOnReply: true,
      steps: [{ delayHours: 0, delayMinutes: 0, channel: 'WHATSAPP', templateId: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nume Secvență</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Welcome Sequence" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="primaryChannel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal Principal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descriere (opțional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Descriere secvență..." rows={2} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Options */}
        <div className="flex gap-6">
          <FormField
            control={form.control}
            name="respectBusinessHours"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Respectă orele de lucru (09-18)</FormLabel>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="stopOnReply"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Oprește la răspuns</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Pași Secvență</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ delayHours: 24, delayMinutes: 0, channel: 'WHATSAPP', templateId: '' })}
              disabled={fields.length >= 10}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adaugă Pas
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium">
                  {index + 1}
                </div>
                
                <div className="flex-1 grid grid-cols-4 gap-4">
                  {/* Delay */}
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`steps.${index}.delayHours`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Delay (ore)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {index === 0 && <span className="text-sm text-muted-foreground mt-6">după înrolare</span>}
                    {index > 0 && <span className="text-sm text-muted-foreground mt-6">după pasul anterior</span>}
                  </div>

                  {/* Channel */}
                  <FormField
                    control={form.control}
                    name={`steps.${index}.channel`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Canal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="EMAIL_COLD">Email Cold</SelectItem>
                            <SelectItem value="EMAIL_WARM">Email Warm</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  {/* Template */}
                  <FormField
                    control={form.control}
                    name={`steps.${index}.templateId`}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-xs">Template</FormLabel>
                        <TemplateSelect 
                          channel={form.watch(`steps.${index}.channel`)}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit">Creează Secvență</Button>
        </div>
      </form>
    </Form>
  );
}
```

### 1.3 Create Template Form

```tsx
// components/outreach/forms/CreateTemplateForm.tsx

const templateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  subject: z.string().max(200).optional(),
  content: z.string().min(10).max(4000),
  variables: z.array(z.object({
    name: z.string(),
    required: z.boolean(),
    defaultValue: z.string().optional(),
  })).optional(),
  hasMedia: z.boolean().default(false),
  mediaType: z.enum(['image', 'document', 'video']).optional(),
  mediaUrl: z.string().url().optional(),
});

export function CreateTemplateForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      channel: 'WHATSAPP',
      hasMedia: false,
      variables: [],
    },
  });

  // Extract variables from content
  const content = form.watch('content');
  const detectedVariables = useMemo(() => {
    const matches = content?.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  }, [content]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nume Template</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Initial WhatsApp" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        {form.watch('channel') === 'EMAIL' && (
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subiect Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Subiect..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conținut</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={`Bună ziua {{contactName}},

{Vă contactez|Scriu} în legătură cu {{companyName}}...`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </FormControl>
              <FormDescription>
                Folosește {`{{variabilă}}`} pentru personalizare și {`{opțiune1|opțiune2}`} pentru spintax.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Detected Variables */}
        {detectedVariables.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Variabile Detectate</h4>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map((variable) => (
                <Badge key={variable} variant="secondary">
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Media option for WhatsApp */}
        {form.watch('channel') === 'WHATSAPP' && (
          <FormField
            control={form.control}
            name="hasMedia"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Include media (imagine/document)</FormLabel>
              </FormItem>
            )}
          />
        )}

        {form.watch('hasMedia') && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mediaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tip Media</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectează tip" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="image">Imagine</SelectItem>
                      <SelectItem value="document">Document PDF</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Media</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit">Creează Template</Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## 2. DIALOGS

### 2.1 Takeover Dialog

```tsx
// components/outreach/dialogs/TakeoverDialog.tsx

interface TakeoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  companyName: string;
}

export function TakeoverDialog({ open, onOpenChange, leadId, companyName }: TakeoverDialogProps) {
  const [reason, setReason] = useState('');
  
  const takeoverMutation = useMutation({
    mutationFn: () => api.post(`/outreach/leads/${leadId}/takeover`, { reason }),
    onSuccess: () => {
      toast.success('Conversație preluată cu succes');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preia Conversația Manual</DialogTitle>
          <DialogDescription>
            Vei prelua controlul manual al conversației cu {companyName}. 
            Automatizările vor fi oprite până când returnezi controlul.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Motiv preluare</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Client important, necesită atenție specială..."
              rows={3}
            />
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenție</AlertTitle>
            <AlertDescription>
              Secvențele automate vor fi oprite. Va trebui să răspunzi manual la toate mesajele.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button 
            onClick={() => takeoverMutation.mutate()}
            disabled={takeoverMutation.isPending || !reason}
          >
            Preia Conversația
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2.2 Enroll in Sequence Dialog

```tsx
// components/outreach/dialogs/EnrollSequenceDialog.tsx

interface EnrollSequenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
}

export function EnrollSequenceDialog({ open, onOpenChange, leadIds }: EnrollSequenceDialogProps) {
  const [sequenceId, setSequenceId] = useState('');
  const [startStep, setStartStep] = useState(1);
  const [scheduledStart, setScheduledStart] = useState<Date | undefined>();

  const { data: sequences } = useQuery({
    queryKey: ['sequences', 'active'],
    queryFn: () => fetchSequences({ isActive: true }),
  });

  const enrollMutation = useMutation({
    mutationFn: () => api.post(`/outreach/sequences/${sequenceId}/enroll`, {
      leadIds,
      startStep,
      scheduledStart: scheduledStart?.toISOString(),
    }),
    onSuccess: (data) => {
      toast.success(`${data.enrolled} leads înrolați în secvență`);
      if (data.skipped > 0) {
        toast.warning(`${data.skipped} leads au fost săriți (deja înrolați sau ineligibili)`);
      }
      onOpenChange(false);
    },
  });

  const selectedSequence = sequences?.find(s => s.id === sequenceId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Înrolează în Secvență</DialogTitle>
          <DialogDescription>
            {leadIds.length} lead(s) selectat(e) pentru înrolare
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Secvență</Label>
            <Select value={sequenceId} onValueChange={setSequenceId}>
              <SelectTrigger>
                <SelectValue placeholder="Alege secvența" />
              </SelectTrigger>
              <SelectContent>
                {sequences?.map((seq) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    {seq.name} ({seq.steps.length} pași)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSequence && (
            <>
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Preview Secvență</h4>
                <div className="space-y-2">
                  {selectedSequence.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{idx + 1}</Badge>
                      <ChannelIcon channel={step.channel} size="sm" />
                      <span>+{step.delayHours}h</span>
                      <span className="text-muted-foreground">
                        {step.template?.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Început de la pasul</Label>
                <Select value={startStep.toString()} onValueChange={(v) => setStartStep(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSequence.steps.map((_, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        Pas {idx + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Programează start (opțional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledStart ? format(scheduledStart, 'PPP HH:mm') : 'Imediat'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledStart}
                      onSelect={setScheduledStart}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button 
            onClick={() => enrollMutation.mutate()}
            disabled={enrollMutation.isPending || !sequenceId}
          >
            Înrolează {leadIds.length} Lead(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2.3 Review Resolution Dialog

```tsx
// components/outreach/dialogs/ResolveReviewDialog.tsx

interface ResolveReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewItem;
}

export function ResolveReviewDialog({ open, onOpenChange, review }: ResolveReviewDialogProps) {
  const [action, setAction] = useState<'APPROVE' | 'EDIT' | 'REJECT' | 'TAKEOVER'>('APPROVE');
  const [editedContent, setEditedContent] = useState(review.suggestedResponse || '');
  const [notes, setNotes] = useState('');

  const resolveMutation = useMutation({
    mutationFn: () => api.post(`/outreach/reviews/${review.id}/resolve`, {
      action,
      editedContent: action === 'EDIT' ? editedContent : undefined,
      notes,
    }),
    onSuccess: () => {
      toast.success('Review rezolvat');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rezolvă Review</DialogTitle>
          <DialogDescription>
            {review.leadCompany?.denumire} - {review.reason}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Original Message */}
          {review.triggerContent && (
            <div className="bg-muted p-4 rounded-lg">
              <Label className="text-xs text-muted-foreground">Mesaj Primit</Label>
              <p className="mt-1">{review.triggerContent}</p>
            </div>
          )}

          {/* AI Suggested Response */}
          {review.suggestedResponse && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <Label className="text-xs text-blue-600">Răspuns Sugerat AI</Label>
              <p className="mt-1">{review.suggestedResponse}</p>
            </div>
          )}

          {/* Action Selection */}
          <div>
            <Label>Acțiune</Label>
            <RadioGroup value={action} onValueChange={(v: any) => setAction(v)} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="APPROVE" id="approve" />
                <Label htmlFor="approve">Aprobă și trimite răspunsul sugerat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="EDIT" id="edit" />
                <Label htmlFor="edit">Editează și trimite</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="REJECT" id="reject" />
                <Label htmlFor="reject">Respinge (nu trimite nimic)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TAKEOVER" id="takeover" />
                <Label htmlFor="takeover">Preia conversația manual</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Edit Content */}
          {action === 'EDIT' && (
            <div>
              <Label>Răspuns Editat</Label>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={5}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Note (opțional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note interne despre această decizie..."
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anulează
          </Button>
          <Button 
            onClick={() => resolveMutation.mutate()}
            disabled={resolveMutation.isPending}
            variant={action === 'REJECT' ? 'destructive' : 'default'}
          >
            {action === 'APPROVE' && 'Aprobă și Trimite'}
            {action === 'EDIT' && 'Trimite Editat'}
            {action === 'REJECT' && 'Respinge'}
            {action === 'TAKEOVER' && 'Preia Manual'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Forms:** 3
**Total Dialogs:** 3+
**Conformitate:** Master Spec v1.2
