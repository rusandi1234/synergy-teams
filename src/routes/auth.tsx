import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles, GraduationCap, BookOpenCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/useRole";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In · SYNERGY" },
      { name: "description", content: "Sign in or register for SYNERGY as a student or faculty member." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";
type Role = "student" | "faculty";

const ROLES = ["Developer", "Designer", "QA", "Business Analyst", "Team Leader"] as const;
const AVAIL = ["Mon Wed Fri", "Tue Thu", "Weekends", "Flexible", "Evenings"] as const;
const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Electronics",
  "Mechanical",
  "Civil",
  "Electrical",
  "Mathematics",
  "Other",
] as const;

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const studentSchema = signinSchema.extend({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  confirm: z.string(),
  skills: z.string().trim().min(1, "List at least one skill").max(500),
  availability: z.string().min(1),
  preferredRole: z.string().min(1),
  workload: z.coerce.number().min(0).max(10),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

const facultySchema = signinSchema.extend({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  confirm: z.string(),
  department: z.string().min(1, "Select a department"),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function parseSkills(raw: string): string[] {
  return raw.split(/[,;/|]| and /i).map(s => s.trim()).filter(Boolean);
}

function AuthPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState<string>(AVAIL[3]);
  const [preferredRole, setPreferredRole] = useState<string>(ROLES[0]);
  const [workload, setWorkload] = useState<number>(3);
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);

  const redirectFor = (r: Role) => (r === "faculty" ? "/" : "/student");

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) throw error;
      const userId = data.user?.id;
      // Ensure no stale role/profile cache from a previous session
      await qc.invalidateQueries({ queryKey: ["user-role"] });
      await qc.invalidateQueries({ queryKey: ["my-student-profile"] });
      const resolvedRole = userId ? await getUserRole(userId) : null;
      if (!resolvedRole) {
        toast.info("Finish setting up your profile to continue.");
        navigate({ to: "/complete-profile", replace: true });
        return;
      }
      toast.success("Welcome back!");
      navigate({ to: redirectFor(resolvedRole), replace: true });

    } catch (err: any) {
      toast.error(err?.message ?? "Sign in failed");
    } finally { setBusy(false); }
  };


  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // If the auth account already exists, sign them in with the supplied password
      // and finish role/profile setup inline instead of erroring out.
      const tryExistingSignIn = async (): Promise<string | null> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) return null;
        return data.user.id;
      };

      if (role === "student") {
        const parsed = studentSchema.safeParse({
          email, password, confirm, name, skills, availability, preferredRole, workload,
        });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/student`,
            data: { full_name: parsed.data.name, role: "student" },
          },
        });
        let userId = data?.user?.id ?? null;
        if (error) {
          if ((error as any)?.code === "user_already_exists" || /already/i.test(error.message)) {
            userId = await tryExistingSignIn();
            if (!userId) { toast.error("This email is already registered. Use the correct password to sign in."); return; }
          } else { throw error; }
        }
        if (!userId) {
          toast.success("Check your email to confirm your account.");
          setMode("signin"); return;
        }

        const { data: existingRoles } = await supabase
          .from("user_roles").select("role").eq("user_id", userId);
        if (!(existingRoles ?? []).some((r: any) => r.role === "student")) {
          const { error: roleErr } = await supabase
            .from("user_roles").insert({ user_id: userId, role: "student" });
          if (roleErr) throw roleErr;
        }


        const { error: profErr } = await supabase
          .from("student_profiles")
          .upsert({
            user_id: userId,
            name: parsed.data.name,
            email: parsed.data.email,
            skills: parseSkills(parsed.data.skills),
            availability: parsed.data.availability,
            preferred_role: parsed.data.preferredRole,
            workload: parsed.data.workload,
          }, { onConflict: "user_id" });
        if (profErr) throw profErr;

        await qc.invalidateQueries({ queryKey: ["user-role"] });
        await qc.invalidateQueries({ queryKey: ["my-student-profile"] });
        toast.success("Account ready — welcome!");
        navigate({ to: "/student", replace: true });
      } else {
        const parsed = facultySchema.safeParse({ email, password, confirm, name, department });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: parsed.data.name, role: "faculty" },
          },
        });
        let userId = data?.user?.id ?? null;
        if (error) {
          if ((error as any)?.code === "user_already_exists" || /already/i.test(error.message)) {
            userId = await tryExistingSignIn();
            if (!userId) { toast.error("This email is already registered. Use the correct password to sign in."); return; }
          } else { throw error; }
        }
        if (!userId) {
          toast.success("Check your email to confirm your account.");
          setMode("signin"); return;
        }

        const { data: existingRoles } = await supabase
          .from("user_roles").select("role").eq("user_id", userId);
        if (!(existingRoles ?? []).some((r: any) => r.role === "faculty")) {
          const { error: roleErr } = await supabase
            .from("user_roles").insert({ user_id: userId, role: "faculty" });
          if (roleErr) throw roleErr;
        }

        const { error: facErr } = await supabase
          .from("faculty_profiles")
          .upsert({
            user_id: userId,
            name: parsed.data.name,
            email: parsed.data.email,
            department: parsed.data.department,
          }, { onConflict: "user_id" });
        if (facErr) throw facErr;

        toast.success("Faculty account ready — welcome!");
        navigate({ to: "/", replace: true });
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
            Sign in or create an account as a student to share your profile, or as faculty to review and publish teams.
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

          <div className="inline-flex rounded-md border border-border p-1 bg-muted/40 mb-5">
            {(["signin", "signup"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`px-4 py-1.5 text-sm rounded ${mode === m ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                {m === "signin" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" && "Sign in to access your dashboard."}
            {mode === "signup" && "Choose your role to get started."}
            {mode === "forgot" && "We'll email you a reset link."}
          </p>

          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3 mt-5">
              <RoleCard active={role === "student"} onClick={() => setRole("student")}
                icon={<GraduationCap className="size-5" />} title="Student" desc="Share profile, join a team" />
              <RoleCard active={role === "faculty"} onClick={() => setRole("faculty")}
                icon={<BookOpenCheck className="size-5" />} title="Faculty" desc="Form & publish teams" />
            </div>
          )}

          {mode === "signin" && (
            <form onSubmit={onSignIn} className="mt-6 space-y-3">
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
              <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
                {busy ? "Please wait…" : "Sign in"}
              </button>
              <div className="flex items-center justify-between text-sm pt-2">
                <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:underline">Forgot password?</button>
                <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">Create account</button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={onSignUp} className="mt-5 space-y-3">
              <Field label="Full Name" value={name} onChange={setName} autoComplete="name" />
              <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                <Field label="Confirm" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
              </div>

              {role === "student" ? (
                <>
                  <Field label="Skills (comma separated)" value={skills} onChange={setSkills} placeholder="Python, React, Testing" />
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Availability" value={availability} onChange={setAvailability} options={AVAIL as unknown as string[]} />
                    <Select label="Preferred Role" value={preferredRole} onChange={setPreferredRole} options={ROLES as unknown as string[]} />
                  </div>
                  <label className="block">
                    <span className="text-xs font-medium text-muted-foreground">Workload Capacity (0–10): {workload}</span>
                    <input type="range" min={0} max={10} value={workload} onChange={e => setWorkload(Number(e.target.value))}
                      className="mt-2 w-full accent-primary" />
                  </label>
                </>
              ) : (
                <Select label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS as unknown as string[]} />
              )}

              <button disabled={busy} className="btn-primary w-full justify-center" type="submit">
                {busy ? "Creating…" : `Create ${role === "faculty" ? "Faculty" : "Student"} Account`}
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

function RoleCard({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`text-left rounded-lg border p-3 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
      <div className="flex items-center gap-2 font-medium text-sm">{icon}{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
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
