import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary.js";
import { Login } from "@/pages/auth/Login.js";
import { ForgotPassword } from "@/pages/auth/ForgotPassword.js";
import { NotFound } from "@/pages/NotFound.js";
import { ProtectedLayoutRouteGroup } from "@/routing/protected-layout-routes.js";

/**
 * O pagină reală per rută (aceleași `Route` ca în App), cu MemoryRouter la calea dată.
 * Necesită `parameters.storybookSkipAppShell` (preview) + seed auth + MSW.
 */
const withAppRoutes: Decorator = (_Story, context) => {
  const initialPath = (context.parameters.initialPath as string) ?? "/dashboard";
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <div className="min-h-screen bg-[var(--color-s950)] text-[var(--color-t1)]">
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <ProtectedLayoutRouteGroup />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </MemoryRouter>
  );
};

const meta = {
  title: "App/Pages",
  parameters: {
    layout: "fullscreen",
    storybookSkipAppShell: true,
  },
  decorators: [withAppRoutes],
  render: () => <span className="sr-only">Pagină randată de decorator (rute)</span>,
} satisfies Meta;

export default meta;

type PageStory = StoryObj;

export const LoginPage: PageStory = {
  name: "Login",
  parameters: { initialPath: "/login", docs: { storyDescription: "Pagină autentificare." } },
};

export const ForgotPasswordPage: PageStory = {
  name: "Forgot password",
  parameters: { initialPath: "/forgot-password" },
};

export const DashboardPage: PageStory = {
  name: "Dashboard principal",
  parameters: { initialPath: "/dashboard" },
};

export const DashboardE1Page: PageStory = {
  name: "Etapa 1 — Dashboard",
  parameters: { initialPath: "/etapa1/dashboard" },
};

export const ImportPage: PageStory = {
  name: "Import",
  parameters: { initialPath: "/import" },
};

export const ImportsNewPage: PageStory = {
  name: "Import nou",
  parameters: { initialPath: "/imports/new" },
};

export const ImportsDetailPage: PageStory = {
  name: "Import detaliu (id mock)",
  parameters: { initialPath: "/imports/00000000-0000-0000-0000-000000000001" },
};

export const ImportsMappingPage: PageStory = {
  name: "Import mapare",
  parameters: { initialPath: "/imports/00000000-0000-0000-0000-000000000001/mapping" },
};

export const BronzePage: PageStory = {
  name: "Bronze",
  parameters: { initialPath: "/bronze" },
};

export const BronzeContactDetailPage: PageStory = {
  name: "Bronze contact detaliu",
  parameters: { initialPath: "/bronze/contacts/00000000-0000-0000-0000-000000000002" },
};

export const SilverPage: PageStory = {
  name: "Silver",
  parameters: { initialPath: "/silver" },
};

export const SilverCompanyDetailPage: PageStory = {
  name: "Silver companie detaliu",
  parameters: { initialPath: "/silver/companies/00000000-0000-0000-0000-000000000003" },
};

export const SilverContactsPage: PageStory = {
  name: "Silver contacte",
  parameters: { initialPath: "/silver/contacts" },
};

export const SilverDedupPage: PageStory = {
  name: "Silver deduplicare",
  parameters: { initialPath: "/silver/dedup" },
};

export const GoldPage: PageStory = {
  name: "Gold",
  parameters: { initialPath: "/gold" },
};

export const GoldCompanyDetailPage: PageStory = {
  name: "Gold companie detaliu",
  parameters: { initialPath: "/gold/companies/00000000-0000-0000-0000-000000000004" },
};

export const GoldContactsPage: PageStory = {
  name: "Gold contacte",
  parameters: { initialPath: "/gold/contacts" },
};

export const ApprovalsPage: PageStory = {
  name: "Aprobări",
  parameters: { initialPath: "/approvals" },
};

export const ApprovalReviewPage: PageStory = {
  name: "Aprobare review",
  parameters: { initialPath: "/approvals/00000000-0000-0000-0000-000000000005" },
};

export const EnrichmentQueuesPage: PageStory = {
  name: "Enrichment cozi",
  parameters: { initialPath: "/enrichment/queue" },
};

export const EnrichmentLogsPage: PageStory = {
  name: "Enrichment loguri",
  parameters: { initialPath: "/enrichment/logs" },
};

export const SettingsMappingsPage: PageStory = {
  name: "Setări mapări",
  parameters: { initialPath: "/settings/mappings" },
};

export const SettingsIntegrationsPage: PageStory = {
  name: "Setări integrări",
  parameters: { initialPath: "/settings/integrations" },
};

export const OutreachPage: PageStory = {
  name: "Outreach",
  parameters: { initialPath: "/outreach" },
};

export const OutreachDashboardAliasPage: PageStory = {
  name: "Outreach dashboard (alias)",
  parameters: { initialPath: "/outreach/dashboard" },
};

export const OutreachLeadsPage: PageStory = {
  name: "Outreach leads",
  parameters: { initialPath: "/outreach/leads" },
};

export const OutreachLeadsImportPage: PageStory = {
  name: "Outreach import leads",
  parameters: { initialPath: "/outreach/leads/import" },
};

export const OutreachLeadDetailPage: PageStory = {
  name: "Outreach lead detaliu",
  parameters: { initialPath: "/outreach/leads/00000000-0000-0000-0000-000000000006" },
};

export const OutreachConversationPage: PageStory = {
  name: "Outreach conversație",
  parameters: {
    initialPath: "/outreach/leads/00000000-0000-0000-0000-000000000006/conversation",
  },
};

export const OutreachSequencesPage: PageStory = {
  name: "Outreach secvențe",
  parameters: { initialPath: "/outreach/sequences" },
};

export const OutreachSequenceNewPage: PageStory = {
  name: "Outreach secvență nouă",
  parameters: { initialPath: "/outreach/sequences/new" },
};

export const OutreachSequenceEditPage: PageStory = {
  name: "Outreach editare secvență",
  parameters: { initialPath: "/outreach/sequences/00000000-0000-0000-0000-000000000007/edit" },
};

export const OutreachTemplatesPage: PageStory = {
  name: "Outreach șabloane",
  parameters: { initialPath: "/outreach/templates" },
};

export const OutreachTemplateNewPage: PageStory = {
  name: "Outreach șablon nou",
  parameters: { initialPath: "/outreach/templates/new" },
};

export const OutreachTemplateEditPage: PageStory = {
  name: "Outreach editare șablon",
  parameters: { initialPath: "/outreach/templates/00000000-0000-0000-0000-000000000008/edit" },
};

export const OutreachPhonesPage: PageStory = {
  name: "Outreach telefoane",
  parameters: { initialPath: "/outreach/phones" },
};

export const OutreachPhoneDetailPage: PageStory = {
  name: "Outreach telefon detaliu",
  parameters: { initialPath: "/outreach/phones/phone-1" },
};

export const OutreachReviewPage: PageStory = {
  name: "Outreach review",
  parameters: { initialPath: "/outreach/review" },
};

export const OutreachCampaignsPage: PageStory = {
  name: "Outreach campanii",
  parameters: { initialPath: "/outreach/campaigns" },
};

export const OutreachAnalyticsPage: PageStory = {
  name: "Outreach analytics",
  parameters: { initialPath: "/outreach/analytics" },
};

export const OutreachSettingsPageStory: PageStory = {
  name: "Outreach setări",
  parameters: { initialPath: "/outreach/settings" },
};

export const LeadsShortcutPage: PageStory = {
  name: "Leads (shortcut)",
  parameters: { initialPath: "/leads" },
};

export const SequencesShortcutPage: PageStory = {
  name: "Secvențe (shortcut)",
  parameters: { initialPath: "/sequences" },
};

export const TemplatesShortcutPage: PageStory = {
  name: "Șabloane (shortcut)",
  parameters: { initialPath: "/templates" },
};

export const PhonesShortcutPage: PageStory = {
  name: "Telefoane (shortcut)",
  parameters: { initialPath: "/phones" },
};

export const ReviewShortcutPage: PageStory = {
  name: "Review (shortcut)",
  parameters: { initialPath: "/review" },
};

export const AiDashboardPage: PageStory = {
  name: "AI Dashboard",
  parameters: { initialPath: "/ai-dashboard" },
};

export const NegotiationsPage: PageStory = {
  name: "Negocieri",
  parameters: { initialPath: "/negotiations" },
};

export const OffersPage: PageStory = {
  name: "Oferte",
  parameters: { initialPath: "/offers" },
};

export const InvoicesPage: PageStory = {
  name: "Facturi",
  parameters: { initialPath: "/invoices" },
};

export const GuardrailsPage: PageStory = {
  name: "Guardrails",
  parameters: { initialPath: "/guardrails" },
};

export const PaymentsPage: PageStory = {
  name: "Plăți",
  parameters: { initialPath: "/payments" },
};

export const CreditPage: PageStory = {
  name: "Credit",
  parameters: { initialPath: "/credit" },
};

export const LogisticsPage: PageStory = {
  name: "Logistică",
  parameters: { initialPath: "/logistics" },
};

export const ReturnsPage: PageStory = {
  name: "Retururi",
  parameters: { initialPath: "/returns" },
};

export const NurturingPage: PageStory = {
  name: "Nurturing",
  parameters: { initialPath: "/nurturing" },
};

export const ReferralsPage: PageStory = {
  name: "Referrals",
  parameters: { initialPath: "/referrals" },
};

export const ChurnPage: PageStory = {
  name: "Churn",
  parameters: { initialPath: "/churn" },
};

export const GeoMapPage: PageStory = {
  name: "Hartă geo",
  parameters: { initialPath: "/geo-map" },
};

export const NegotiationConversationPage: PageStory = {
  name: "Negociere conversație",
  parameters: { initialPath: "/negotiations/conversation" },
};

export const ProductCatalogPage: PageStory = {
  name: "Catalog produse",
  parameters: { initialPath: "/products" },
};

export const FiscalDocumentsPage: PageStory = {
  name: "Documente fiscale",
  parameters: { initialPath: "/fiscal/documents" },
};

export const OrderBoardPage: PageStory = {
  name: "Comenzi board",
  parameters: { initialPath: "/orders/board" },
};

export const CreditProfilePage: PageStory = {
  name: "Profil credit",
  parameters: { initialPath: "/credit/profile" },
};

export const ContractBuilderPage: PageStory = {
  name: "Contract builder",
  parameters: { initialPath: "/contracts/builder" },
};

export const NurturingDashboardPage: PageStory = {
  name: "Nurturing dashboard",
  parameters: { initialPath: "/nurturing/dashboard" },
};

export const ReferralManagerPage: PageStory = {
  name: "Referral manager",
  parameters: { initialPath: "/referral/manager" },
};

export const WorkersPage: PageStory = {
  name: "Workers",
  parameters: { initialPath: "/workers" },
};

export const SettingsPage: PageStory = {
  name: "Setări",
  parameters: { initialPath: "/settings" },
};

export const DesignSystemPage: PageStory = {
  name: "Design system (doar DEV)",
  parameters: { initialPath: "/settings/design-system" },
};

export const CognitiveBrainPage: PageStory = {
  name: "Cognitive Brain",
  parameters: { initialPath: "/brain" },
};

export const BrainBatchRedirectPage: PageStory = {
  name: "Brain batch redirect",
  parameters: { initialPath: "/brain/batch-demo-1" },
};

export const NotFoundPage: PageStory = {
  name: "404",
  parameters: { initialPath: "/__storybook_not_found__" },
};
