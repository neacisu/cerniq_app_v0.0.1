import { lazy, Suspense } from "react";
import { Navigate, Route } from "react-router-dom";
import * as Auth from "@/providers/auth-provider.js";
import { AppLayout } from "@/components/layout/AppLayout.js";
import { Dashboard } from "@/pages/dashboard/index.js";
import { Import } from "@/pages/etapa1/import.js";
import { Bronze } from "@/pages/etapa1/bronze.js";
import { Silver } from "@/pages/etapa1/silver.js";
import { Gold } from "@/pages/etapa1/gold.js";
import { Approvals } from "@/pages/etapa1/approvals.js";
import { DashboardE1 } from "@/pages/etapa1/dashboard-e1.js";
import { ImportNew } from "@/pages/etapa1/import-new.js";
import { ImportDetail } from "@/pages/etapa1/import-detail.js";
import { ImportMapping } from "@/pages/etapa1/import-mapping.js";
import { BronzeDetail } from "@/pages/etapa1/bronze-detail.js";
import { SilverContacts } from "@/pages/etapa1/silver-contacts.js";
import { SilverDedup } from "@/pages/etapa1/silver-dedup.js";
import { GoldContacts } from "@/pages/etapa1/gold-contacts.js";
import { SilverCompanyDetail } from "@/pages/etapa1/silver-company-detail.js";
import { GoldCompanyDetail } from "@/pages/etapa1/gold-company-detail.js";
import { EnrichmentQueues } from "@/pages/etapa1/enrichment-queues.js";
import { EnrichmentLogs } from "@/pages/etapa1/enrichment-logs.js";
import { ApprovalReview } from "@/pages/etapa1/approval-review.js";
import { SettingsMappings } from "@/pages/etapa1/settings-mappings.js";
import { SettingsIntegrations } from "@/pages/etapa1/settings-integrations.js";
import { Outreach } from "@/pages/etapa2/outreach.js";
import { Leads } from "@/pages/etapa2/leads.js";
import { LeadsImport } from "@/pages/etapa2/leads-import.js";
import { LeadDetail } from "@/pages/etapa2/lead-detail.js";
import { ConversationView } from "@/pages/etapa2/conversation-view.js";
import { Sequences } from "@/pages/etapa2/sequences.js";
import { SequenceNew } from "@/pages/etapa2/sequence-new.js";
import { SequenceEdit } from "@/pages/etapa2/sequence-edit.js";
import { Templates } from "@/pages/etapa2/templates.js";
import { TemplateNew } from "@/pages/etapa2/template-new.js";
import { TemplateEdit } from "@/pages/etapa2/template-edit.js";
import { Phones } from "@/pages/etapa2/phones.js";
import { PhoneDetail } from "@/pages/etapa2/phone-detail.js";
import { Review } from "@/pages/etapa2/review.js";
import { Campaigns } from "@/pages/etapa2/campaigns.js";
import { Analytics } from "@/pages/etapa2/analytics.js";
import { OutreachSettingsPage } from "@/pages/etapa2/outreach-settings.js";
import { AiDashboard } from "@/pages/etapa3/ai-dashboard.js";
import { Negotiations } from "@/pages/etapa3/negotiations.js";
import { Offers } from "@/pages/etapa3/offers.js";
import { Invoices } from "@/pages/etapa3/invoices.js";
import { Guardrails } from "@/pages/etapa3/guardrails.js";
import { Payments } from "@/pages/etapa4/payments.js";
import { Credit } from "@/pages/etapa4/credit.js";
import { Logistics } from "@/pages/etapa4/logistics.js";
import { Returns } from "@/pages/etapa4/returns.js";
import { DashboardE4 } from "@/pages/etapa4/dashboard-e4.js";
import { Nurturing } from "@/pages/etapa5/nurturing.js";
import { Referrals } from "@/pages/etapa5/referrals.js";
import { Churn } from "@/pages/etapa5/churn.js";
import { GeoMap } from "@/pages/etapa5/geo-map.js";
import { NegotiationConversation } from "@/pages/etapa3/NegotiationConversation.js";
import { ProductCatalog } from "@/pages/etapa3/ProductCatalog.js";
import { FiscalDocuments } from "@/pages/etapa3/FiscalDocuments.js";
import { OrderDashboard } from "@/pages/etapa4/OrderDashboard.js";
import { CreditProfile } from "@/pages/etapa4/CreditProfile.js";
import { ContractBuilder } from "@/pages/etapa4/ContractBuilder.js";
import { NurturingDashboard } from "@/pages/etapa5/NurturingDashboard.js";
import { ReferralManager } from "@/pages/etapa5/ReferralManager.js";
import { Workers } from "@/pages/system/workers.js";
import { Settings } from "@/pages/system/settings.js";
import { BrainBatchRedirect } from "@/routing/brain-batch-redirect.js";

const CognitiveBrainPage = lazy(async () => {
  const m = await import("@/pages/CognitiveBrain.js");
  return { default: m.CognitiveBrainPage };
});

const DesignTokensPreviewPage = lazy(async () => {
  const m = await import("@/components/ui/design-tokens-preview.js");
  return { default: m.DesignTokensPreviewPage };
});

/** Grup de rute sub AppLayout + ProtectedRoute (identic cu App). */
export function ProtectedLayoutRouteGroup() {
  return (
    <Route
      element={
        <Auth.ProtectedRoute>
          <AppLayout />
        </Auth.ProtectedRoute>
      }
    >
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/etapa1/dashboard" element={<DashboardE1 />} />
      <Route path="/import" element={<Import />} />
      <Route path="/imports" element={<Import />} />
      <Route path="/imports/new" element={<ImportNew />} />
      <Route path="/imports/:id" element={<ImportDetail />} />
      <Route path="/imports/:id/mapping" element={<ImportMapping />} />
      <Route path="/bronze" element={<Bronze />} />
      <Route path="/bronze/contacts" element={<Bronze />} />
      <Route path="/bronze/contacts/:id" element={<BronzeDetail />} />
      <Route path="/silver" element={<Silver />} />
      <Route path="/silver/companies" element={<Silver />} />
      <Route path="/silver/companies/:id" element={<SilverCompanyDetail />} />
      <Route path="/silver/contacts" element={<SilverContacts />} />
      <Route path="/silver/dedup" element={<SilverDedup />} />
      <Route path="/gold" element={<Gold />} />
      <Route path="/gold/companies" element={<Gold />} />
      <Route path="/gold/companies/:id" element={<GoldCompanyDetail />} />
      <Route path="/gold/contacts" element={<GoldContacts />} />
      <Route path="/approvals" element={<Approvals />} />
      <Route path="/approvals/:id" element={<ApprovalReview />} />
      <Route path="/enrichment/queue" element={<EnrichmentQueues />} />
      <Route path="/enrichment/logs" element={<EnrichmentLogs />} />
      <Route path="/settings/mappings" element={<SettingsMappings />} />
      <Route path="/settings/integrations" element={<SettingsIntegrations />} />
      <Route path="/outreach" element={<Outreach />} />
      <Route path="/outreach/dashboard" element={<Outreach />} />
      <Route path="/outreach/leads" element={<Leads />} />
      <Route path="/outreach/leads/import" element={<LeadsImport />} />
      <Route path="/outreach/leads/:id" element={<LeadDetail />} />
      <Route path="/outreach/leads/:id/conversation" element={<ConversationView />} />
      <Route path="/outreach/sequences" element={<Sequences />} />
      <Route path="/outreach/sequences/new" element={<SequenceNew />} />
      <Route path="/outreach/sequences/:id/edit" element={<SequenceEdit />} />
      <Route path="/outreach/templates" element={<Templates />} />
      <Route path="/outreach/templates/new" element={<TemplateNew />} />
      <Route path="/outreach/templates/:id/edit" element={<TemplateEdit />} />
      <Route path="/outreach/phones" element={<Phones />} />
      <Route path="/outreach/phones/:phoneId" element={<PhoneDetail />} />
      <Route path="/outreach/review" element={<Review />} />
      <Route path="/outreach/campaigns" element={<Campaigns />} />
      <Route path="/outreach/analytics" element={<Analytics />} />
      <Route path="/outreach/settings" element={<OutreachSettingsPage />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/sequences" element={<Sequences />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/phones" element={<Phones />} />
      <Route path="/review" element={<Review />} />
      <Route path="/ai-dashboard" element={<AiDashboard />} />
      <Route path="/negotiations" element={<Negotiations />} />
      <Route path="/offers" element={<Offers />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/guardrails" element={<Guardrails />} />
      <Route path="/postsale/dashboard" element={<DashboardE4 />} />
      <Route path="/payments" element={<Payments />} />
      <Route path="/credit" element={<Credit />} />
      <Route path="/logistics" element={<Logistics />} />
      <Route path="/returns" element={<Returns />} />
      <Route path="/nurturing" element={<Nurturing />} />
      <Route path="/referrals" element={<Referrals />} />
      <Route path="/churn" element={<Churn />} />
      <Route path="/geo-map" element={<GeoMap />} />
      <Route path="/negotiations/conversation" element={<NegotiationConversation />} />
      <Route path="/products" element={<ProductCatalog />} />
      <Route path="/fiscal/documents" element={<FiscalDocuments />} />
      <Route path="/orders/board" element={<OrderDashboard />} />
      <Route path="/credit/profile" element={<CreditProfile />} />
      <Route path="/contracts/builder" element={<ContractBuilder />} />
      <Route path="/nurturing/dashboard" element={<NurturingDashboard />} />
      <Route path="/referral/manager" element={<ReferralManager />} />
      <Route path="/workers" element={<Workers />} />
      <Route path="/settings" element={<Settings />} />
      {import.meta.env.DEV ? (
        <Route
          path="/settings/design-system"
          element={
            <Suspense fallback={<div className="p-6 text-t3">Se încarcă…</div>}>
              <DesignTokensPreviewPage />
            </Suspense>
          }
        />
      ) : null}
      <Route
        path="/brain"
        element={
          <Suspense fallback={<div className="p-6 text-muted-foreground">Se încarcă…</div>}>
            <CognitiveBrainPage />
          </Suspense>
        }
      />
      <Route path="/brain/:batchId" element={<BrainBatchRedirect />} />
    </Route>
  );
}
