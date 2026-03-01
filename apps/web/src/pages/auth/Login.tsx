import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, UserPlus, Building2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Spinner } from "@/components/ui/spinner.js";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.js";
import { useAuth } from "@/providers/auth-provider.js";

const loginSchema = z.object({
  email: z.string().min(1, "Email obligatoriu").email("Email invalid"),
  password: z.string().min(6, "Minim 6 caractere"),
});

const signupSchema = z
  .object({
    name: z.string().min(2, "Minim 2 caractere"),
    email: z.string().min(1, "Email obligatoriu").email("Email invalid"),
    password: z
      .string()
      .min(8, "Minim 8 caractere")
      .regex(/[A-Z]/, "Litera mare obligatorie")
      .regex(/[a-z]/, "Litera mica obligatorie")
      .regex(/[0-9]/, "Cifra obligatorie")
      .regex(/[^A-Za-z0-9]/, "Caracter special obligatoriu"),
    confirmPassword: z.string().min(1, "Confirmare obligatorie"),
    mode: z.enum(["new_company", "invite_code"]),
    companyName: z.string().optional(),
    inviteCode: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Parolele nu coincid",
    path: ["confirmPassword"],
  })
  .refine((d) => d.mode !== "new_company" || (d.companyName?.length ?? 0) >= 2, {
    message: "Numele companiei este obligatoriu (min. 2 caractere)",
    path: ["companyName"],
  })
  .refine((d) => d.mode !== "invite_code" || (d.inviteCode?.length ?? 0) >= 4, {
    message: "Codul de invitație este obligatoriu",
    path: ["inviteCode"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "admin@demo-tenant.com",
      password: "demo123456",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      mode: "new_company",
      companyName: "",
      inviteCode: "",
    },
  });

  const signupMode = useWatch({
    control: signupForm.control,
    name: "mode",
    defaultValue: "new_company",
  }) as "new_company" | "invite_code";

  const onLoginSubmit = async (data: LoginForm) => {
    setLoginLoading(true);
    setLoginError("");
    const result = await login(data.email, data.password);
    setLoginLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setLoginError(result.error ?? "Autentificare eșuată");
    }
  };

  const onSignupSubmit = async (data: SignupForm) => {
    setSignupLoading(true);
    setSignupError("");
    const result = await register({
      name: data.name,
      email: data.email,
      password: data.password,
      mode: data.mode,
      ...(data.mode === "new_company" && data.companyName && { companyName: data.companyName }),
      ...(data.mode === "invite_code" && data.inviteCode && { inviteCode: data.inviteCode }),
    });
    setSignupLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setSignupError(result.error ?? "Inregistrare eșuată");
    }
  };

  return (
    <div className="lr">
      <div className="lc w-full max-w-[400px]">
        <div className="flex justify-center mb-8">
          <CerniqLogo size={40} />
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Autentificare</TabsTrigger>
            <TabsTrigger value="signup">Cont nou</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <h2
              className="text-xl font-bold text-center mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Autentificare
            </h2>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
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
                  error={!!loginForm.formState.errors.email}
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="ferr">{loginForm.formState.errors.email.message}</p>
                )}
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
                    error={!!loginForm.formState.errors.password}
                    {...loginForm.register("password")}
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
                {loginForm.formState.errors.password && (
                  <p className="ferr">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              {loginError && <p className="ferr">{loginError}</p>}
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? (
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
          </TabsContent>

          <TabsContent value="signup">
            <h2
              className="text-xl font-bold text-center mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cont nou
            </h2>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              <div className="space-y-2">
                <span className="lbl">Mod înregistrare</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="new_company"
                      {...signupForm.register("mode")}
                      className="rounded"
                    />
                    <Building2 size={16} />
                    Companie nouă
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="invite_code"
                      {...signupForm.register("mode")}
                      className="rounded"
                    />
                    <Ticket size={16} />
                    Am cod de invitație
                  </label>
                </div>
              </div>

              {signupMode === "new_company" && (
                <div>
                  <label className="lbl" htmlFor="signup-companyName">
                    Nume companie
                  </label>
                  <Input
                    id="signup-companyName"
                    type="text"
                    placeholder="Ex: Agricom SRL"
                    error={!!signupForm.formState.errors.companyName}
                    {...signupForm.register("companyName")}
                  />
                  {signupForm.formState.errors.companyName && (
                    <p className="ferr">{signupForm.formState.errors.companyName.message}</p>
                  )}
                </div>
              )}

              {signupMode === "invite_code" && (
                <div>
                  <label className="lbl" htmlFor="signup-inviteCode">
                    Cod invitație
                  </label>
                  <Input
                    id="signup-inviteCode"
                    type="text"
                    placeholder="Ex: abc12def"
                    error={!!signupForm.formState.errors.inviteCode}
                    {...signupForm.register("inviteCode")}
                  />
                  {signupForm.formState.errors.inviteCode && (
                    <p className="ferr">{signupForm.formState.errors.inviteCode.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="lbl" htmlFor="signup-name">
                  Nume complet
                </label>
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Prenume Nume"
                  error={!!signupForm.formState.errors.name}
                  {...signupForm.register("name")}
                />
                {signupForm.formState.errors.name && (
                  <p className="ferr">{signupForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="lbl" htmlFor="signup-email">
                  Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="email@companie.ro"
                  error={!!signupForm.formState.errors.email}
                  {...signupForm.register("email")}
                />
                {signupForm.formState.errors.email && (
                  <p className="ferr">{signupForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="lbl" htmlFor="signup-password">
                  Parolă
                </label>
                <div className="inpw">
                  <Input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    error={!!signupForm.formState.errors.password}
                    {...signupForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="inpi"
                    aria-label="Arată/ascunde parola"
                  >
                    {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="ferr">{signupForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="lbl" htmlFor="signup-confirmPassword">
                  Confirmare parolă
                </label>
                <Input
                  id="signup-confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  error={!!signupForm.formState.errors.confirmPassword}
                  {...signupForm.register("confirmPassword")}
                />
                {signupForm.formState.errors.confirmPassword && (
                  <p className="ferr">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              {signupError && <p className="ferr">{signupError}</p>}
              <Button type="submit" variant="brand" className="w-full" disabled={signupLoading}>
                {signupLoading ? (
                  <Spinner size={16} />
                ) : (
                  <>
                    <UserPlus size={16} /> Creează cont
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
