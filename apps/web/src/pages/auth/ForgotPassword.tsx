import { Link } from "react-router-dom";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";

export function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-s950">
      <div className="w-full max-w-100 rounded-lg border border-s700 bg-s900/80 p-8 text-center backdrop-blur-md">
        <div className="flex justify-center mb-6">
          <CerniqLogo size={40} />
        </div>
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Resetare Parolă
        </h2>
        <p className="mb-6 text-sm text-t3">
          Coming in Etapa 1 — resetare parolă va fi disponibilă în curând.
        </p>
        <Link to="/login" className="text-sm text-b5 hover:underline">
          ← Înapoi la autentificare
        </Link>
      </div>
    </div>
  );
}
