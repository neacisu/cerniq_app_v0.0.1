# CERNIQ.APP — ETAPA 2: UI/UX PAGES
## Cold Outreach Interface - Complete Page Specifications
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. NAVIGATION STRUCTURE

```
/outreach
├── /dashboard                 # Overview metrics
├── /leads                     # Lead management
│   ├── /[leadId]             # Lead detail
│   └── /[leadId]/conversation # Conversation view
├── /sequences                 # Sequence management
│   ├── /create               # Create sequence
│   └── /[sequenceId]/edit    # Edit sequence
├── /templates                 # Template library
│   └── /[templateId]/edit    # Edit template
├── /phones                    # WhatsApp phones
│   └── /[phoneId]            # Phone detail
├── /campaigns                 # Email campaigns
├── /review                    # Human review queue
└── /analytics                 # Detailed analytics
```

---

# 2. OUTREACH DASHBOARD

## 2.1 Page: /outreach/dashboard

```tsx
// pages/outreach/dashboard.tsx

export default function OutreachDashboard() {
  return (
    <PageLayout title="Cold Outreach Dashboard">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Leads Contactați Azi"
          value={stats.contactedToday}
          change={+12}
          icon={<Users />}
        />
        <KPICard
          title="Răspunsuri Primite"
          value={stats.repliesToday}
          change={+5}
          icon={<MessageSquare />}
        />
        <KPICard
          title="Rate Răspuns"
          value={`${stats.replyRate}%`}
          change={+2.3}
          icon={<TrendingUp />}
        />
        <KPICard
          title="Review Pending"
          value={stats.pendingReviews}
          change={-3}
          icon={<Clock />}
          variant={stats.pendingReviews > 10 ? 'warning' : 'default'}
        />
      </div>

      {/* Quota Usage Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Utilizare Cotă WhatsApp</CardTitle>
          <CardDescription>20 numere × 200 contacte/zi = 4,000 max</CardDescription>
        </CardHeader>
        <CardContent>
          <QuotaUsageGrid phones={phones} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performanță per Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelPerformanceChart data={channelData} />
          </CardContent>
        </Card>

        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadFunnelChart 
              stages={[
                { name: 'COLD', count: 1250, color: '#94a3b8' },
                { name: 'CONTACTED', count: 890, color: '#60a5fa' },
                { name: 'WARM_REPLY', count: 234, color: '#34d399' },
                { name: 'NEGOTIATION', count: 89, color: '#fbbf24' },
                { name: 'CONVERTED', count: 23, color: '#22c55e' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Activitate Recentă</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed activities={recentActivities} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

## 2.2 QuotaUsageGrid Component

```tsx
// components/outreach/QuotaUsageGrid.tsx

interface Phone {
  id: string;
  label: string;
  phoneNumber: string;
  status: 'ACTIVE' | 'OFFLINE' | 'BANNED';
  quotaUsed: number;
  quotaLimit: number;
}

export function QuotaUsageGrid({ phones }: { phones: Phone[] }) {
  return (
    <div className="grid grid-cols-10 gap-2">
      {phones.map((phone) => {
        const percentage = (phone.quotaUsed / phone.quotaLimit) * 100;
        const color = phone.status !== 'ACTIVE' 
          ? 'bg-red-500' 
          : percentage >= 90 
            ? 'bg-amber-500' 
            : 'bg-green-500';
        
        return (
          <Tooltip key={phone.id}>
            <TooltipTrigger>
              <div className="relative">
                <div className="w-full h-16 bg-muted rounded overflow-hidden">
                  <div 
                    className={`absolute bottom-0 w-full ${color} transition-all`}
                    style={{ height: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-center block mt-1">
                  {phone.label}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{phone.phoneNumber}</p>
              <p>{phone.quotaUsed}/{phone.quotaLimit} utilizat</p>
              <p>Status: {phone.status}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
```

---

# 3. LEADS MANAGEMENT

## 3.1 Page: /outreach/leads

```tsx
// pages/outreach/leads.tsx

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadFilters>({
    stage: undefined,
    assignedTo: undefined,
    channel: undefined,
    hasReply: undefined,
  });

  return (
    <PageLayout 
      title="Lead-uri Outreach" 
      actions={
        <Button onClick={() => router.push('/outreach/leads/import')}>
          <Upload className="w-4 h-4 mr-2" />
          Import Leads
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap">
            <Select 
              value={filters.stage} 
              onValueChange={(v) => setFilters(f => ({ ...f, stage: v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate stările" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COLD">Cold</SelectItem>
                <SelectItem value="CONTACTED_WA">Contactat WA</SelectItem>
                <SelectItem value="CONTACTED_EMAIL">Contactat Email</SelectItem>
                <SelectItem value="WARM_REPLY">Răspuns Primit</SelectItem>
                <SelectItem value="NEGOTIATION">În Negociere</SelectItem>
                <SelectItem value="CONVERTED">Convertit</SelectItem>
                <SelectItem value="DEAD">Pierdut</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.channel}
              onValueChange={(v) => setFilters(f => ({ ...f, channel: v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Toate canalele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL_COLD">Email Cold</SelectItem>
                <SelectItem value="EMAIL_WARM">Email Warm</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hasReply" 
                checked={filters.hasReply}
                onCheckedChange={(v) => setFilters(f => ({ ...f, hasReply: !!v }))}
              />
              <label htmlFor="hasReply">Cu răspuns</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="needsReview" 
                checked={filters.needsReview}
                onCheckedChange={(v) => setFilters(f => ({ ...f, needsReview: !!v }))}
              />
              <label htmlFor="needsReview">Necesită review</label>
            </div>

            <Input 
              placeholder="Caută companie, email..."
              className="w-[250px]"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <LeadsDataTable 
        filters={filters}
        columns={leadsColumns}
        onRowClick={(lead) => router.push(`/outreach/leads/${lead.id}`)}
      />
    </PageLayout>
  );
}

const leadsColumns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'company.denumire',
    header: 'Companie',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.company.denumire}</p>
        <p className="text-sm text-muted-foreground">{row.original.company.judet}</p>
      </div>
    ),
  },
  {
    accessorKey: 'currentState',
    header: 'Stare',
    cell: ({ row }) => <StageBadge stage={row.original.currentState} />,
  },
  {
    accessorKey: 'lastChannelUsed',
    header: 'Ultimul Canal',
    cell: ({ row }) => <ChannelIcon channel={row.original.lastChannelUsed} />,
  },
  {
    accessorKey: 'sentimentScore',
    header: 'Sentiment',
    cell: ({ row }) => <SentimentIndicator score={row.original.sentimentScore} />,
  },
  {
    accessorKey: 'replyCount',
    header: 'Răspunsuri',
    cell: ({ row }) => row.original.replyCount || 0,
  },
  {
    accessorKey: 'lastContactAt',
    header: 'Ultimul Contact',
    cell: ({ row }) => formatDistanceToNow(row.original.lastContactAt, { 
      addSuffix: true, 
      locale: ro 
    }),
  },
  {
    accessorKey: 'nextActionAt',
    header: 'Următoarea Acțiune',
    cell: ({ row }) => row.original.nextActionAt 
      ? format(row.original.nextActionAt, 'dd MMM HH:mm', { locale: ro })
      : '-',
  },
];
```

## 3.2 Page: /outreach/leads/[leadId]

```tsx
// pages/outreach/leads/[leadId].tsx

export default function LeadDetailPage({ params }: { params: { leadId: string } }) {
  const { data: lead } = useQuery(['lead', params.leadId], () => fetchLead(params.leadId));
  
  return (
    <PageLayout 
      title={lead?.company.denumire}
      breadcrumbs={[
        { label: 'Outreach', href: '/outreach' },
        { label: 'Leads', href: '/outreach/leads' },
        { label: lead?.company.denumire || '' },
      ]}
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="col-span-2 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informații Companie</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyInfoGrid company={lead.company} />
            </CardContent>
          </Card>

          {/* Conversation Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Conversație</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/outreach/leads/${lead.id}/conversation`)}
              >
                <Expand className="w-4 h-4 mr-2" />
                Deschide Full
              </Button>
            </CardHeader>
            <CardContent>
              <ConversationTimeline 
                messages={lead.communications} 
                maxMessages={5}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Lead Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Stare Curentă</label>
                <StageBadge stage={lead.currentState} size="lg" />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground">Sentiment</label>
                <SentimentIndicator score={lead.sentimentScore} showLabel />
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Canal Preferat</label>
                <p>{lead.preferredChannel || 'Nedeterminat'}</p>
              </div>

              <Separator />

              <div>
                <label className="text-sm text-muted-foreground">Telefon WhatsApp Atribuit</label>
                <p>{lead.assignedPhone?.phoneLabel || 'Neatribuit'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Secvență Activă</label>
                <p>{lead.currentSequence?.name || 'Nicio secvență'}</p>
                {lead.currentSequence && (
                  <p className="text-sm text-muted-foreground">
                    Pas {lead.sequenceStep}/{lead.currentSequence.totalSteps}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Acțiuni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleSendMessage}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Trimite Mesaj
              </Button>
              
              <Button variant="outline" className="w-full" onClick={handleStartSequence}>
                <Play className="w-4 h-4 mr-2" />
                Pornește Secvență
              </Button>

              <Button variant="outline" className="w-full" onClick={handleAssignUser}>
                <User className="w-4 h-4 mr-2" />
                Atribuie Utilizator
              </Button>

              <Separator />

              <Button 
                variant="ghost" 
                className="w-full text-destructive"
                onClick={handleMarkDead}
              >
                <X className="w-4 h-4 mr-2" />
                Marchează Pierdut
              </Button>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Istoric Activitate</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog leadId={lead.id} limit={10} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
```

## 3.3 Conversation View Component

```tsx
// components/outreach/ConversationTimeline.tsx

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  channel: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM';
  content: string;
  sentAt: Date;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  isAiGenerated?: boolean;
}

export function ConversationTimeline({ 
  messages, 
  maxMessages 
}: { 
  messages: Message[];
  maxMessages?: number;
}) {
  const displayMessages = maxMessages 
    ? messages.slice(-maxMessages) 
    : messages;

  return (
    <div className="space-y-4">
      {displayMessages.map((msg) => (
        <div 
          key={msg.id}
          className={cn(
            "flex",
            msg.direction === 'OUTBOUND' ? "justify-end" : "justify-start"
          )}
        >
          <div className={cn(
            "max-w-[70%] rounded-lg px-4 py-2",
            msg.direction === 'OUTBOUND' 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <ChannelIcon channel={msg.channel} size="sm" />
              {msg.isAiGenerated && (
                <Badge variant="outline" className="text-xs">AI</Badge>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="text-xs opacity-70">
                {format(msg.sentAt, 'HH:mm')}
              </span>
              {msg.direction === 'OUTBOUND' && (
                <MessageStatusIcon status={msg.status} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

# 4. HUMAN REVIEW QUEUE

## 4.1 Page: /outreach/review

```tsx
// pages/outreach/review.tsx

export default function ReviewQueuePage() {
  return (
    <PageLayout title="Review Queue">
      {/* Priority Tabs */}
      <Tabs defaultValue="urgent">
        <TabsList>
          <TabsTrigger value="urgent">
            Urgent ({counts.urgent})
          </TabsTrigger>
          <TabsTrigger value="high">
            High ({counts.high})
          </TabsTrigger>
          <TabsTrigger value="medium">
            Medium ({counts.medium})
          </TabsTrigger>
          <TabsTrigger value="low">
            Low ({counts.low})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="urgent">
          <ReviewItemsList priority="URGENT" />
        </TabsContent>
        {/* ... other tabs */}
      </Tabs>
    </PageLayout>
  );
}

function ReviewItemsList({ priority }: { priority: string }) {
  const { data: items } = useQuery(['reviews', priority], () => fetchReviews(priority));

  return (
    <div className="space-y-4 mt-4">
      {items?.map((item) => (
        <ReviewCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: ReviewItem }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={getPriorityVariant(item.priority)}>
                {item.priority}
              </Badge>
              <Badge variant="outline">{item.reason}</Badge>
              <SLACountdown dueAt={item.slaDueAt} />
            </div>
            
            <h3 className="font-medium">{item.lead.company.denumire}</h3>
            
            {item.triggerContent && (
              <div className="mt-2 p-3 bg-muted rounded">
                <p className="text-sm">{item.triggerContent}</p>
              </div>
            )}

            {item.suggestedResponse && (
              <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Răspuns Sugerat AI:</p>
                <p className="text-sm">{item.suggestedResponse}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Button size="sm" onClick={() => handleApprove(item.id)}>
              <Check className="w-4 h-4 mr-1" />
              Aprobă
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleRespond(item.id)}>
              <MessageSquare className="w-4 h-4 mr-1" />
              Răspunde
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTakeover(item.id)}>
              <User className="w-4 h-4 mr-1" />
              Preia
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleIgnore(item.id)}>
              <X className="w-4 h-4 mr-1" />
              Ignoră
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

# 5. WHATSAPP PHONES MANAGEMENT

## 5.1 Page: /outreach/phones

```tsx
// pages/outreach/phones.tsx

export default function PhonesPage() {
  return (
    <PageLayout title="Telefoane WhatsApp">
      <div className="grid grid-cols-4 gap-4">
        {phones.map((phone) => (
          <PhoneCard key={phone.id} phone={phone} />
        ))}
      </div>
    </PageLayout>
  );
}

function PhoneCard({ phone }: { phone: Phone }) {
  const quotaPercent = (phone.quotaUsed / phone.quotaLimit) * 100;
  
  return (
    <Card className={cn(
      phone.status !== 'ACTIVE' && 'border-red-500'
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{phone.label}</CardTitle>
          <StatusBadge status={phone.status} />
        </div>
        <CardDescription>{phone.phoneNumber}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quota Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Cotă Utilizată</span>
              <span>{phone.quotaUsed}/{phone.quotaLimit}</span>
            </div>
            <Progress value={quotaPercent} className={cn(
              quotaPercent >= 90 && 'bg-amber-100',
              quotaPercent >= 100 && 'bg-red-100'
            )} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Leads Atribuiți</span>
              <p className="font-medium">{phone.totalLeadsAssigned}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mesaje Azi</span>
              <p className="font-medium">{phone.messagesToday}</p>
            </div>
          </div>

          {/* Last Activity */}
          <div className="text-sm">
            <span className="text-muted-foreground">Ultima Activitate</span>
            <p>{formatDistanceToNow(phone.lastMessageSentAt, { addSuffix: true })}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {phone.status === 'ACTIVE' ? (
          <Button variant="outline" size="sm" onClick={() => pausePhone(phone.id)}>
            <Pause className="w-4 h-4 mr-1" />
            Pauză
          </Button>
        ) : (
          <Button size="sm" onClick={() => resumePhone(phone.id)}>
            <Play className="w-4 h-4 mr-1" />
            Reactivează
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => router.push(`/outreach/phones/${phone.id}`)}>
          Detalii
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

# 6. SEQUENCES MANAGEMENT

## 6.1 Page: /outreach/sequences

```tsx
// pages/outreach/sequences.tsx

export default function SequencesPage() {
  return (
    <PageLayout 
      title="Secvențe Outreach"
      actions={
        <Button onClick={() => router.push('/outreach/sequences/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Secvență Nouă
        </Button>
      }
    >
      <div className="space-y-4">
        {sequences.map((seq) => (
          <SequenceCard key={seq.id} sequence={seq} />
        ))}
      </div>
    </PageLayout>
  );
}

function SequenceCard({ sequence }: { sequence: Sequence }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{sequence.name}</h3>
            <p className="text-sm text-muted-foreground">{sequence.description}</p>
            
            <div className="flex gap-4 mt-4">
              <div>
                <span className="text-sm text-muted-foreground">Pași</span>
                <p className="font-medium">{sequence.steps.length}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Leads Înrolați</span>
                <p className="font-medium">{sequence.totalLeadsEnrolled}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Rată Răspuns</span>
                <p className="font-medium">{sequence.avgResponseRate}%</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Conversii</span>
                <p className="font-medium">{sequence.totalConversions}</p>
              </div>
            </div>

            {/* Steps Preview */}
            <div className="flex gap-2 mt-4">
              {sequence.steps.map((step, idx) => (
                <div 
                  key={step.id}
                  className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded"
                >
                  <ChannelIcon channel={step.channel} size="xs" />
                  <span>+{step.delayHours}h</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              checked={sequence.isActive}
              onCheckedChange={(v) => toggleSequence(sequence.id, v)}
            />
            <Button variant="ghost" size="sm">
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

# 7. REUSABLE COMPONENTS

## 7.1 Stage Badge

```tsx
const stageConfig: Record<string, { label: string; color: string }> = {
  COLD: { label: 'Cold', color: 'bg-slate-500' },
  CONTACTED_WA: { label: 'Contactat WA', color: 'bg-blue-500' },
  CONTACTED_EMAIL: { label: 'Contactat Email', color: 'bg-indigo-500' },
  WARM_REPLY: { label: 'Răspuns Primit', color: 'bg-green-500' },
  NEGOTIATION: { label: 'În Negociere', color: 'bg-amber-500' },
  CONVERTED: { label: 'Convertit', color: 'bg-emerald-600' },
  DEAD: { label: 'Pierdut', color: 'bg-red-500' },
  PAUSED: { label: 'Pauză', color: 'bg-gray-500' },
};

export function StageBadge({ stage, size = 'default' }: { stage: string; size?: 'sm' | 'default' | 'lg' }) {
  const config = stageConfig[stage] || { label: stage, color: 'bg-gray-500' };
  
  return (
    <Badge className={cn(config.color, 'text-white', size === 'lg' && 'text-base px-3 py-1')}>
      {config.label}
    </Badge>
  );
}
```

## 7.2 Sentiment Indicator

```tsx
export function SentimentIndicator({ 
  score, 
  showLabel = false 
}: { 
  score: number; 
  showLabel?: boolean;
}) {
  const getColor = (s: number) => {
    if (s >= 50) return 'text-green-500';
    if (s >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIcon = (s: number) => {
    if (s >= 50) return <ThumbsUp className="w-4 h-4" />;
    if (s >= 0) return <Minus className="w-4 h-4" />;
    return <ThumbsDown className="w-4 h-4" />;
  };

  const getLabel = (s: number) => {
    if (s >= 50) return 'Pozitiv';
    if (s >= 0) return 'Neutru';
    return 'Negativ';
  };

  return (
    <div className={cn('flex items-center gap-1', getColor(score))}>
      {getIcon(score)}
      <span className="font-medium">{score}</span>
      {showLabel && <span className="text-sm">({getLabel(score)})</span>}
    </div>
  );
}
```

## 7.3 Channel Icon

```tsx
export function ChannelIcon({ 
  channel, 
  size = 'default' 
}: { 
  channel: string; 
  size?: 'xs' | 'sm' | 'default';
}) {
  const sizeClass = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    default: 'w-5 h-5',
  }[size];

  switch (channel) {
    case 'WHATSAPP':
      return <MessageCircle className={cn(sizeClass, 'text-green-500')} />;
    case 'EMAIL_COLD':
      return <Mail className={cn(sizeClass, 'text-blue-500')} />;
    case 'EMAIL_WARM':
      return <Mail className={cn(sizeClass, 'text-amber-500')} />;
    default:
      return <HelpCircle className={sizeClass} />;
  }
}
```

---

**Document generat:** 15 Ianuarie 2026
**Total Pages:** 12+
**Conformitate:** Master Spec v1.2
