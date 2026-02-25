import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { REDIRECT_LOGIN_EVENT } from "./lib/api-url.js";
import { Refine } from "@refinedev/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toast.js";
import { ThemeProvider } from "./providers/theme-provider.js";
import { AuthProvider } from "./providers/auth-provider.js";
import { ProtectedRoute } from "./providers/auth-provider.js";
import { cerniqDataProvider } from "./providers/data-provider.js";
import { AppLayout } from "./components/layout/AppLayout.js";
import { Login } from "./pages/auth/Login.js";
import { ForgotPassword } from "./pages/auth/ForgotPassword.js";
import { Dashboard } from "./pages/dashboard/index.js";
import { Import } from "./pages/etapa1/import.js";
import { Bronze } from "./pages/etapa1/bronze.js";
import { Silver } from "./pages/etapa1/silver.js";
import { Gold } from "./pages/etapa1/gold.js";
import { Approvals } from "./pages/etapa1/approvals.js";
import { Outreach } from "./pages/etapa2/outreach.js";
import { Leads } from "./pages/etapa2/leads.js";
import { Sequences } from "./pages/etapa2/sequences.js";
import { Templates } from "./pages/etapa2/templates.js";
import { Phones } from "./pages/etapa2/phones.js";
import { Review } from "./pages/etapa2/review.js";
import { AiDashboard } from "./pages/etapa3/ai-dashboard.js";
import { Negotiations } from "./pages/etapa3/negotiations.js";
import { Offers } from "./pages/etapa3/offers.js";
import { Invoices } from "./pages/etapa3/invoices.js";
import { Guardrails } from "./pages/etapa3/guardrails.js";
import { Payments } from "./pages/etapa4/payments.js";
import { Credit } from "./pages/etapa4/credit.js";
import { Logistics } from "./pages/etapa4/logistics.js";
import { Returns } from "./pages/etapa4/returns.js";
import { Nurturing } from "./pages/etapa5/nurturing.js";
import { Referrals } from "./pages/etapa5/referrals.js";
import { Churn } from "./pages/etapa5/churn.js";
import { GeoMap } from "./pages/etapa5/geo-map.js";
import { Workers } from "./pages/system/workers.js";
import { Settings } from "./pages/system/settings.js";
import { NotFound } from "./pages/NotFound.js";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary.js";

const queryClient = new QueryClient();

function RedirectToLoginListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => navigate("/login", { replace: true });
    window.addEventListener(REDIRECT_LOGIN_EVENT, handler);
    return () => window.removeEventListener(REDIRECT_LOGIN_EVENT, handler);
  }, [navigate]);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Refine
            dataProvider={cerniqDataProvider}
            authProvider={{
              login: async () => ({ success: true }),
              logout: async () => ({ success: true, redirectTo: "/login" }),
              check: async () => ({ authenticated: true }),
              getIdentity: async () => null,
              onError: async () => ({ logout: false }),
            }}
          >
            <BrowserRouter>
              <RedirectToLoginListener />
              <Toaster position="top-right" richColors />
              <ErrorBoundary>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/import" element={<Import />} />
                    <Route path="/bronze" element={<Bronze />} />
                    <Route path="/silver" element={<Silver />} />
                    <Route path="/gold" element={<Gold />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/outreach" element={<Outreach />} />
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
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/credit" element={<Credit />} />
                    <Route path="/logistics" element={<Logistics />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/nurturing" element={<Nurturing />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/churn" element={<Churn />} />
                    <Route path="/geo-map" element={<GeoMap />} />
                    <Route path="/workers" element={<Workers />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </Refine>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
