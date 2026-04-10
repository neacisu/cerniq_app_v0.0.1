import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { REDIRECT_LOGIN_EVENT } from "./lib/api-url.js";
import { QueryClientProvider } from "@tanstack/react-query";
import { appQueryClient } from "./query-client.js";
import { Toaster } from "./components/ui/toast.js";
import { ThemeProvider } from "./providers/theme-provider.js";
import * as Auth from "./providers/auth-provider.js";
import { CerniqRefineProvider } from "./providers/refine-provider.js";
import { Login } from "./pages/auth/Login.js";
import { ForgotPassword } from "./pages/auth/ForgotPassword.js";
import { NotFound } from "./pages/NotFound.js";
import { ErrorBoundary } from "./components/feedback/ErrorBoundary.js";
import { CookieConsentBanner } from "./components/gdpr/CookieConsentBanner.js";
import { ProtectedLayoutRouteGroup } from "./routing/protected-layout-routes.js";

export { BrainBatchRedirect } from "./routing/brain-batch-redirect.js";

const redirectEventTarget: Pick<typeof globalThis, "addEventListener" | "removeEventListener"> =
  globalThis;

export function RedirectToLoginListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => navigate("/login", { replace: true });
    redirectEventTarget.addEventListener(REDIRECT_LOGIN_EVENT, handler);
    return () => redirectEventTarget.removeEventListener(REDIRECT_LOGIN_EVENT, handler);
  }, [navigate]);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={appQueryClient}>
      <ThemeProvider>
        <CookieConsentBanner />
        <Auth.AuthProvider>
          <BrowserRouter>
            <CerniqRefineProvider>
              <RedirectToLoginListener />
              <Toaster position="top-right" richColors />
              <ErrorBoundary>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  {ProtectedLayoutRouteGroup()}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </CerniqRefineProvider>
          </BrowserRouter>
        </Auth.AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
