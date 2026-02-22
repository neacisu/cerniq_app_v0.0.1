import { Link } from "react-router-dom";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";

export function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-s950)]">
      <div className="w-full max-w-[400px] p-8 rounded-[var(--radius-lg)] border border-[var(--color-s700)] bg-[var(--color-s900)]/80 backdrop-blur-[12px] text-center">
        <div className="flex justify-center mb-6">
          <CerniqLogo size={40} />
        </div>
        <h2
          className="text-xl font-bold mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Resetare Parolă
        </h2>
        <p className="text-sm text-[var(--color-t3)] mb-6">
          Funcționalitate disponibilă în Etapa 1
        </p>
        <Link
          to="/login"
          className="text-sm text-[var(--color-b5)] hover:underline"
        >
          ← Înapoi la autentificare
        </Link>
      </div>
    </div>
  );
}
