import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { externalSupabase } from "@/integrations/external-supabase/client";
import { Sparkles } from "lucide-react";
import { getUserRole } from "@/lib/useRole";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In · SYNERGY" },
      { name: "description", content: "Sign in or register to access the SYNERGY workspace." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const ROLES = ["Developer", "Designer", "QA", "Business Analyst", "Team Leader"] as const;
const AVAIL = ["Mon Wed Fri", "Tue Thu", "Weekends", "Flexible", "Evenings"] as const;

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signupSchema = signinSchema.extend({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  confirm: z.string(),
  skills: z.string().trim().min(1, "List at least one skill"),
  availability: z.string().min(1),
  role: z.string().min(1),
  workload: z.coerce.number().min(0).max(10),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // signup extras
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState<string>(AVAIL[3]);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [workload, setWorkload] = useState<number>(3);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { data, error } = await externalSupabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      const userId = data.user?.id;
      const resolvedRole = userId ? await getUserRole(userId) : null;
      if (resolvedRole === "faculty") {
        toast.success("Welcome back!");
        navigate({ to: "/", replace: true });
      } else {
        await externalSupabase.auth.signOut();
        toast.error("This account is not a faculty account. Please use the student login.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally { setBusy(false); }
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email, password, confirm, name, skills, availability, role, workload });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { data, error } = await externalSupabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: parsed.data.name },
        },
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId) {
        // Insert student profile row
        const { error: insErr } = await externalSupabase.from("Students").insert({
          auth_user_id: userId,
          email: parsed.data.email,
          name: parsed.data.name,
          skills: parsed.data.skills,
          availability: parsed.data.availability,
          workload: parsed.data.workload,
          Roles: parsed.data.role,
        });
        if (insErr) console.error("Profile insert failed:", insErr);
      }
      if (data.session) {
        toast.success("Account created — welcome!");
        navigate({ to: "/" });
      } else {
        toast.success("Account created — check your email to confirm.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally { setBusy(false); }
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return toast.error("Enter a valid email");
    setBusy(true);
    try {
      const { error } = await externalSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent. Check your email.");
      setMode("signin");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send reset email");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between hero-gradient text-navy-foreground p-12 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="relative flex items-center gap-2">
          <div className="size-10 rounded-md bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-lg">SYNERGY</div>
            <div className="text-xs uppercase tracking-wider opacity-60">Team Formation AI</div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight">
            Intelligent Student<br />Team Formation
          </h1>
          <p className="mt-4 text-sm opacity-70 max-w-md">
            Sign in as faculty to review and publish teams, or register as a student to share your profile and view your assignment.
          </p>
        </div>
        <div className="relative text-xs opacity-50">University Edition · v1.0</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-md bg-primary grid place-items-center">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="font-semibold">SYNERGY</div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Faculty sign in" : mode === "signup" ? "Create student account" : "Reset password"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" && "Faculty only. Students use the student login."}
            {mode === "signup" && "Register as a student to share your profile."}
            {mode === "forgot" && "We'll email you a reset link."}
          </p>

          {mode === "signin" && (
            <form onSubmit={onSignIn} className="mt-6 space-y-3">
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
              <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
                {busy ? "Please wait…" : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-sm pt-2">
                <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:underline">Forgot password?</button>
                <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">Register</button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={onSignUp} className="mt-6 space-y-3">
              <Field label="Full Name" value={name} onChange={setName} autoComplete="name" />
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                <Field label="Confirm" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </div>
              <Field label="Skills (comma separated)" value={skills} onChange={setSkills} placeholder="Python, React, Testing" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Availability" value={availability} onChange={setAvailability} options={AVAIL as unknown as string[]} />
                <Select label="Preferred Role" value={role} onChange={setRole} options={ROLES as unknown as string[]} />
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Workload (0–10): {workload}</span>
                <input type="range" min={0} max={10} value={workload} onChange={e => setWorkload(Number(e.target.value))}
                  className="mt-2 w-full accent-primary" />
              </label>
              <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
                {busy ? "Creating…" : "Create Account"}
              </button>
              <div className="text-sm text-center pt-2">
                Already have an account?{" "}
                <button type="button" onClick={() => setMode("signin")} className="text-primary hover:underline">Sign in</button>
              </div>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onForgot} className="mt-6 space-y-3">
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
                {busy ? "Sending…" : "Send reset link"}
              </button>
              <div className="text-sm text-center pt-2">
                <button type="button" onClick={() => setMode("signin")} className="text-primary hover:underline">Back to sign in</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; autoComplete?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type} required value={value} onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete} placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
