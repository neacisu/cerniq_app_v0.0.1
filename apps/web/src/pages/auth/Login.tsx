import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Spinner } from "@/components/ui/spinner.js";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@demo-tenant.com");
  const [password, setPassword] = useState("demo123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Completați toate câmpurile");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      navigate("/dashboard");
    }, 1000);
  };

  return (
    <div className="lr">
      <div className="lc w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <CerniqLogo size={40} />
        </div>
        <h2
          className="text-xl font-bold text-center mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Autentificare
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[var(--color-t3)] mb-1 block">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              placeholder="email@companie.ro"
              error={!!error}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-t3)] mb-1 block">
              Parolă
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                error={!!error}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-t3)]"
                aria-label="Toggle password"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-[var(--color-er)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Spinner size={16} />
            ) : (
              <>
                <LogIn size={16} /> Autentificare
              </>
            )}
          </Button>
        </form>

        <p className="text-[0.65rem] text-[var(--color-t4)] text-center mt-6">
          Demo precompletat • GDPR compliant
        </p>
      </div>
    </div>
  );
}
