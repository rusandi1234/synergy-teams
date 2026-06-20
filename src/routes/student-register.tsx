import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { externalSupabase } from "@/integrations/external-supabase/client";

export const Route = createFileRoute("/student-register")({
  head: () => ({
    meta: [
      { title: "Student Register · SYNERGY" },
      { name: "description", content: "Create your SYNERGY student account." },
    ],
  }),
  component: StudentRegisterPage,
});

const ROLES = ["Developer", "Designer", "QA", "Business Analyst", "Team Leader"] as const;
const AVAIL = ["Mon Wed Fri", "Tue Thu", "Weekends", "Flexible", "Evenings"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  confirm: z.string(),
  skills: z.string().trim().min(1, "List at least one skill").max(500),
  availability: z.string().min(1),
  role: z.string().min(1),
  workload: z.coerce.number().min(0).max(10),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

function StudentRegisterPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState<string>(AVAIL[3]);
  const [role, setRole] = useState<string>(ROLES[0]);
  const [workload, setWorkload] = useState<number>(3);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password, confirm, skills, availability, role, workload });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { data, error } = await externalSupabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/student`,
          data: { full_name: parsed.data.name },
        },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
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
        navigate({ to: "/student" });
      } else {
        toast.success("Account created — check your email to confirm.");
        navigate({ to: "/student-login" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="size-9 rounded-md bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="font-semibold">SYNERGY</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Create student account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Share your profile so we can match you with the right team.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <Field label="Full Name" value={name} onChange={setName} autoComplete="name" />
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
              <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
            <Field label="Skills (comma separated)" value={skills} onChange={setSkills} placeholder="Python, React, Testing" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Availability" value={availability} onChange={setAvailability} options={AVAIL as unknown as string[]} />
              <Select label="Preferred Role" value={role} onChange={setRole} options={ROLES as unknown as string[]} />
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Workload (0–10): {workload}</span>
              <input type="range" min={0} max={10} value={workload}
                onChange={e => setWorkload(Number(e.target.value))}
                className="mt-2 w-full accent-primary" />
            </label>

            <button disabled={busy} type="submit" className="btn-primary w-full justify-center">
              {busy ? "Creating…" : "Create Account"}
            </button>

            <div className="text-sm text-center pt-2">
              Already have an account?{" "}
              <Link to="/student-login" className="text-primary hover:underline">Sign in</Link>
            </div>
          </form>
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
