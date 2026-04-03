import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Introduceți o adresă de email validă.");
      return;
    }
    setLoading(true);
    // Simulate API call — backend endpoint not yet available
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSent(true);
    toast.success("Cerere de resetare înregistrată.");
  }

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

        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 size={48} className="text-ok" />
            </div>
            <p className="text-sm text-t2">
              Cererea de resetare a parolei a fost înregistrată pentru{" "}
              <span className="font-semibold text-t1">{email}</span>.
            </p>
            <p className="text-xs text-t3">
              Administratorul de sistem vă va contacta în curând cu instrucțiunile de resetare.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-b5 hover:underline mt-2"
            >
              <ArrowLeft size={14} />
              Înapoi la autentificare
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-t3 text-center mb-6">
              Introduceți adresa de email asociată contului. Vă vom contacta cu instrucțiunile de
              resetare.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="text-xs text-t3 block mb-1">
                  Adresă Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-t3 pointer-events-none"
                  />
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@companie.ro"
                    className="w-full rounded-md border border-s600 bg-s800 pl-9 pr-3 py-2 text-sm text-t1 placeholder:text-t3 focus:outline-none focus:border-b5 transition-colors"
                  />
                </div>
                {error && <p className="text-xs text-er mt-1">{error}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-b5 hover:bg-b5/90 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                {loading ? "Se trimite..." : "Trimite Cerere Reset"}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-t3 hover:text-b5 transition-colors"
              >
                <ArrowLeft size={13} />
                Înapoi la autentificare
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
