export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: { count: number; type: "danger" | "warning" };
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navigation: NavSection[] = [
  {
    title: "PRINCIPAL",
    items: [{ label: "Dashboard", path: "/dashboard", icon: "Home" }],
  },
  {
    title: "ETAPA 1 — ENRICHMENT",
    items: [
      { label: "Import", path: "/import", icon: "Upload" },
      { label: "Bronze", path: "/bronze", icon: "Database" },
      { label: "Silver", path: "/silver", icon: "Building2" },
      { label: "Silver Dedup", path: "/silver/dedup", icon: "GitMerge" },
      { label: "Gold", path: "/gold", icon: "Star" },
      {
        label: "Approvals HITL",
        path: "/approvals",
        icon: "ClipboardList",
      },
      { label: "Enrichment Queues", path: "/enrichment/queue", icon: "ListTodo" },
      { label: "Enrichment Logs", path: "/enrichment/logs", icon: "ScrollText" },
      { label: "Field Mappings", path: "/settings/mappings", icon: "Columns" },
      { label: "Integrations", path: "/settings/integrations", icon: "Plug" },
    ],
  },
  {
    title: "ETAPA 2 — OUTREACH",
    items: [
      { label: "Outreach Dashboard", path: "/outreach/dashboard", icon: "Send" },
      { label: "Leads", path: "/outreach/leads", icon: "Users" },
      { label: "Sequences", path: "/outreach/sequences", icon: "BarChart3" },
      { label: "Templates", path: "/outreach/templates", icon: "FileText" },
      { label: "Phones WA", path: "/outreach/phones", icon: "Phone" },
      { label: "Campanii Email", path: "/outreach/campaigns", icon: "Mail" },
      { label: "Review Queue", path: "/outreach/review", icon: "MessageSquare" },
      { label: "Analytics", path: "/outreach/analytics", icon: "TrendingUp" },
      { label: "Setări Outreach", path: "/outreach/settings", icon: "Settings" },
    ],
  },
  {
    title: "ETAPA 3 — AI SALES",
    items: [
      { label: "AI Dashboard", path: "/ai-dashboard", icon: "Bot" },
      { label: "Negotiations", path: "/negotiations", icon: "MessageSquare" },
      { label: "Offers", path: "/offers", icon: "FileText" },
      { label: "Invoices", path: "/invoices", icon: "CreditCard" },
      { label: "Guardrails", path: "/guardrails", icon: "Shield" },
    ],
  },
  {
    title: "ETAPA 4 — POST-VÂNZARE",
    items: [
      { label: "Payments Revolut", path: "/payments", icon: "CreditCard" },
      { label: "Credit Scoring", path: "/credit", icon: "TrendingUp" },
      { label: "Logistics AWB", path: "/logistics", icon: "Truck" },
      { label: "Returns RMA", path: "/returns", icon: "Package" },
    ],
  },
  {
    title: "ETAPA 5 — NURTURING",
    items: [
      { label: "Retenție", path: "/nurturing", icon: "Heart" },
      { label: "Referrals", path: "/referrals", icon: "Gift" },
      { label: "Churn Risk", path: "/churn", icon: "AlertTriangle" },
      { label: "Hartă Geografică", path: "/geo-map", icon: "Globe" },
    ],
  },
  {
    title: "COGNITIVE BRAIN",
    items: [{ label: "Cognitive Brain", path: "/brain", icon: "Brain" }],
  },
  {
    title: "SISTEM",
    items: [
      { label: "Workers Status", path: "/workers", icon: "Activity" },
      { label: "Setări", path: "/settings", icon: "Settings" },
    ],
  },
];
