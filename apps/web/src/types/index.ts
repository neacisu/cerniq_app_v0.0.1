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

export interface KpiData {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  color?: string;
  path?: string;
}

export interface MockCompany {
  id: string;
  name: string;
  cui: string;
  county: string;
  status: string;
  tier: string;
  quality: number;
  anafValid: boolean;
  termeneValid: boolean;
  score: number;
  revenue: string;
}
