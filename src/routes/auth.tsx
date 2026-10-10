import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, HeartPulse, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setRememberMe } from "@/lib/remember";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Staff Login — MediCare HMS" },
      { name: "description", content: "Secure sign-in for MediCare HMS hospital staff." },
      { property: "og:title", content: "Staff Login — MediCare HMS" },
      { property: "og:description", content: "Secure sign-in for MediCare HMS hospital staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setInfo("");
    const parsed = mode === "forgot" ? schema.pick({ email: true }).safeParse({ email }) : schema.safeParse({ email, password });
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      return setErrors(out);
    }
    setErrors({});
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setInfo("If that email has an account, a reset link is on its way.");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setInfo("Account created. Check your email and click the confirmation link, then sign in.");
        setMode("signin");
      } else {
        setRememberMe(remember);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
        navigate({ to: target, replace: true });
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      setErrors({ form: msg.includes("Invalid login") ? "Incorrect email or password." : msg.includes("not confirmed") ? "Please confirm your email first (check your inbox)." : msg });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? "Staff sign in" : mode === "signup" ? "Create staff account" : "Reset your password";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><HeartPulse className="h-6 w-6" /></div>
          <span className="text-xl font-bold">MediCare HMS</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Caring for patients,<br />organised in one place.</h2>
          <p className="mt-4 max-w-md opacity-80">Patients, doctors, appointments, pharmacy, billing and equipment — securely available to signed-in staff only.</p>
        </div>
        <p className="flex items-center gap-2 text-sm opacity-70"><ShieldCheck className="h-4 w-4" /> Records are only readable after sign-in.</p>
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8 shadow-sm" noValidate>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HeartPulse className="h-5 w-5" /></div>
            <span className="text-lg font-bold">MediCare HMS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{mode === "forgot" ? "We'll email you a reset link." : "Use your hospital staff email."}</p>
          </div>

          {errors.form && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.form}</p>}
          {info && <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{info}</p>}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.com" />
            {errors.email && <p className="text-xs font-medium text-destructive">{errors.email}</p>}
          </div>

          {mode !== "forgot" && (
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input id="password" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-2 top-1.5 p-1 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-medium text-destructive">{errors.password}</p>}
            </div>
          )}

          {mode === "signin" && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-primary" /> Remember me</label>
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("forgot"); setErrors({}); setInfo(""); }}>Forgot password?</button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>New staff member? <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("signup"); setErrors({}); setInfo(""); }}>Create an account</button></>
            ) : (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("signin"); setErrors({}); }}>Back to sign in</button>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
