import { Link } from "react-router-dom";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { Mail, ArrowLeft, Info } from "lucide-react";

/**
 * Resetare parolă: backend-ul nu expune încă POST /api/v1/auth/forgot-password (sau echivalent).
 * Nu simulăm succes HTTP — utilizatorul vede starea reală (self-service indisponibil).
 */
export function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-s950">
      <div className="w-full max-w-[420px] rounded-lg border border-s700 bg-s900/80 p-8 backdrop-blur-md">
        <div className="flex justify-center mb-6">
          <CerniqLogo size={40} />
        </div>
        <h2
          className="text-xl font-bold mb-2 text-center text-t1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Resetare Parolă
        </h2>

        <aside className="mb-6 flex gap-3 rounded-md border border-s600 bg-s800/60 p-4 text-left">
          <Info className="h-5 w-5 shrink-0 text-b5 mt-0.5" aria-hidden />
          <div className="space-y-2 text-sm text-t2">
            <p className="font-medium text-t1">Resetarea automată nu este disponibilă momentan</p>
            <p>
              Platforma nu are încă endpoint API pentru cereri de resetare parolă. Pentru acces,
              contactați administratorul tenantului sau echipa de suport.
            </p>
          </div>
        </aside>

        <div className="flex items-center justify-center gap-2 text-sm text-t3 mb-4">
          <Mail size={15} className="text-t3" aria-hidden />
          <span>Nu se trimite niciun email din această pagină până la activarea API-ului.</span>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-b5 hover:underline"
          >
            <ArrowLeft size={14} aria-hidden />
            Înapoi la autentificare
          </Link>
        </div>
      </div>
    </div>
  );
}
