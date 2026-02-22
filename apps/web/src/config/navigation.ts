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
      { label: "Gold", path: "/gold", icon: "Star" },
      {
        label: "Approvals HITL",
        path: "/approvals",
        icon: "ClipboardList",
        badge: { count: 3, type: "danger" },
      },
    ],
  },
  {
    title: "ETAPA 2 — OUTREACH",
    items: [
      { label: "Outreach Dashboard", path: "/outreach", icon: "Send" },
      {
        label: "Leads",
        path: "/leads",
        icon: "Users",
        badge: { count: 127, type: "warning" },
      },
      { label: "Sequences", path: "/sequences", icon: "BarChart3" },
      { label: "Templates", path: "/templates", icon: "FileText" },
      { label: "Phones WA", path: "/phones", icon: "Phone" },
      {
        label: "Review Queue",
        path: "/review",
        icon: "MessageSquare",
        badge: { count: 8, type: "danger" },
      },
    ],
  },
  {
    title: "ETAPA 3 — AI SALES",
    items: [
      { label: "AI Dashboard", path: "/ai-dashboard", icon: "Bot" },
      {
        label: "Negotiations",
        path: "/negotiations",
        icon: "MessageSquare",
        badge: { count: 5, type: "warning" },
      },
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
    title: "SISTEM",
    items: [
      { label: "Workers Status", path: "/workers", icon: "Activity" },
      { label: "Setări", path: "/settings", icon: "Settings" },
    ],
  },
];
