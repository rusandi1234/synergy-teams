import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { GraduationCap, BookOpenCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Route as AuthRoute } from "./route";


export const Route = createFileRoute("/_authenticated/complete-profile")({
  head: () => ({
    meta: [
      { title: "Complete your profile · SYNERGY" },
      { name: "description", content: "Finish setting up your SYNERGY profile to continue." },
    ],
  }),
  component: CompleteProfilePage,
});

const ROLES = ["Developer", "Designer", "QA", "Business Analyst", "Team Leader"] as const;
const AVAIL = ["Mon Wed Fri", "Tue Thu", "Weekends", "Flexible", "Evenings"] as const;
const DEPARTMENTS = [
  "Computer Science", "Information Technology", "Electronics",
  "Mechanical", "Civil", "Electrical", "Mathematics", "Other",
] as const;

type Role = "student" | "faculty";

const studentSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  skills: z.string().trim().min(1, "List at least one skill").max(500),
  availability: z.string().min(1),
  preferredRole: z.string().min(1),
  workload: z.coerce.number().min(0).max(10),
});

const facultySchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120),
  department: z.string().min(1),
});

const parseSkills = (raw: string) =>
  raw.split(/[,;/|]| and /i).map(s => s.trim()).filter(Boolean);

function CompleteProfilePage() {
  const { user } = AuthRoute.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);

  const goTo = async (path: "/" | "/student") => {
    await qc.invalidateQueries({ queryKey: ["user-role"] });
    await qc.invalidateQueries({ queryKey: ["my-student-profile"] });
    navigate({ to: path, replace: true });
  };


  const metaName = (user.user_metadata as any)?.full_name ?? "";
  const metaRole = (user.user_metadata as any)?.role as Role | undefined;

  const [name, setName] = useState(metaName);
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState<string>(AVAIL[3]);
  const [preferredRole, setPreferredRole] = useState<string>(ROLES[0]);
  const [workload, setWorkload] = useState<number>(3);
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);

  useEffect(() => {
    if (metaRole === "student" || metaRole === "faculty") setRole(metaRole);
  }, [metaRole]);

  // Detect existing role and skip if already complete
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const r = roles?.[0]?.role as Role | undefined;
      if (!r) return;
      const table = r === "faculty" ? "faculty_profiles" : "student_profiles";
      const { data: prof } = await supabase
        .from(table as any).select("user_id").eq("user_id", user.id).maybeSingle();
      if (prof) await goTo(r === "faculty" ? "/" : "/student");
      else setRole(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);


  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Ensure role row exists
      const { data: existing } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const hasRole = (existing ?? []).some((r: any) => r.role === role);
      if (!hasRole) {
        const { error: rErr } = await supabase
          .from("user_roles").insert({ user_id: user.id, role });
        if (rErr) throw rErr;
      }

      if (role === "student") {
        const parsed = studentSchema.safeParse({ name, skills, availability, preferredRole, workload });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.from("student_profiles").upsert({
          user_id: user.id,
          name: parsed.data.name,
          email: user.email ?? "",
          skills: parseSkills(parsed.data.skills),
          availability: parsed.data.availability,
          preferred_role: parsed.data.preferredRole,
          workload: parsed.data.workload,
        }, { onConflict: "user_id" });
        if (error) throw error;
        toast.success("Profile complete — welcome!");
        await goTo("/student");
      } else {
        const parsed = facultySchema.safeParse({ name, department });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.from("faculty_profiles").upsert({
          user_id: user.id,
          name: parsed.data.name,
          email: user.email ?? "",
          department: parsed.data.department,
        }, { onConflict: "user_id" });
        if (error) throw error;
        toast.success("Profile complete — welcome!");
        await goTo("/");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save profile");
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="surface-elevated p-6 md:p-8">
        <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Finish setting up
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Signed in as {user.email}. Choose your role and fill in your details to continue.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <RoleCard active={role === "student"} onClick={() => setRole("student")}
            icon={<GraduationCap className="size-5" />} title="Student" desc="Share profile, join a team" />
          <RoleCard active={role === "faculty"} onClick={() => setRole("faculty")}
            icon={<BookOpenCheck className="size-5" />} title="Faculty" desc="Form & publish teams" />
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <Field label="Full Name" value={name} onChange={setName} />
          {role === "student" ? (
            <>
              <Field label="Skills (comma separated)" value={skills} onChange={setSkills} placeholder="Python, React, Testing" />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Availability" value={availability} onChange={setAvailability} options={AVAIL as unknown as string[]} />
                <Select label="Preferred Role" value={preferredRole} onChange={setPreferredRole} options={ROLES as unknown as string[]} />
              </div>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Workload Capacity (0–10): {workload}</span>
                <input type="range" min={0} max={10} value={workload}
                  onChange={e => setWorkload(Number(e.target.value))}
                  className="mt-2 w-full accent-primary" />
              </label>
            </>
          ) : (
            <Select label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS as unknown as string[]} />
          )}
          <button disabled={busy} type="submit" className="btn-primary w-full justify-center">
            {busy ? "Saving…" : "Save & continue"}
          </button>
        </form>
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

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} required value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
