import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Spinner } from "@/components/ui/spinner.js";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { useAuth } from "@/providers/auth-provider.js";

const loginSchema = z.object({
  email: z.string().min(1, "Email obligatoriu").email("Email invalid"),
  password: z.string().min(6, "Minim 6 caractere"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@demo-tenant.com",
      password: "demo123456",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setSubmitError("");
    const result = await login(data.email, data.password);
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setSubmitError(result.error ?? "Autentificare eșuată");
    }
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="lbl" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="email@companie.ro"
              error={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="ferr">{errors.email.message}</p>}
          </div>
          <div>
            <label className="lbl" htmlFor="password">
              Parolă
            </label>
            <div className="inpw">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                error={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="inpi"
                aria-label="Arată/ascunde parola"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="ferr">{errors.password.message}</p>}
          </div>
          {submitError && <p className="ferr">{submitError}</p>}
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
