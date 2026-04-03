/** NavItem and NavSection are defined in @/config/navigation. */

export type {
  ApiDataEnvelope,
  ApiListEnvelope,
  ApiListMeta,
  DashboardStatsPayload,
} from "./api.js";
export { REFINE_RESOURCE_EXAMPLES } from "./api.js";

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
