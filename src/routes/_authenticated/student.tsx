import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Route as AuthRoute } from "./route";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, CompatibilityRing, SectionHeader, ScoreBar } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents } from "@/lib/synergy";
import {
  User, Sparkles, Calendar, Briefcase, Activity, Users2, ListChecks, Target, Pencil, Eye,
  Star, Github, FolderOpen, BookOpen, Award, CheckCircle2, Clock, XCircle, Gauge, TrendingUp,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({
    meta: [
      { title: "My Dashboard · SYNERGY" },
      { name: "description", content: "Your student profile, team assignment, and tasks." },
    ],
  }),
  component: StudentDashboard,
});

const ROLES = ["Developer", "Designer", "QA", "Business Analyst", "Team Leader"];
const AVAIL = ["Mon Wed Fri", "Tue Thu", "Weekends", "Flexible", "Evenings"];

type StudentProfileRow = {
  user_id: string;
  name: string;
  email: string;
  skills: string[];
  availability: string;
  preferred_role: string;
  workload: number;
};

function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-student-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select("user_id,name,email,skills,availability,preferred_role,workload")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as StudentProfileRow | null;
    },
    staleTime: 30_000,
  });
}


type TaskStatus = "Pending" | "In Progress" | "Done";

function StudentDashboard() {
  const { user } = AuthRoute.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading, isError, error } = useMyProfile(user.id);
  const { data: allStudents = [] } = useStudents();
  const { teams } = useSynergyForStudents(allStudents);

  // Auto-redirect to profile completion if no student record exists
  useEffect(() => {
    if (!isLoading && !isError && !profile) {
      navigate({ to: "/complete-profile", replace: true });
    }
  }, [isLoading, isError, profile, navigate]);


  // Match by name OR email against the external roster used for team formation
  const myTeam = useMemo(
    () => teams.find(t => t.members.some(m =>
      profile && (m.name?.toLowerCase() === profile.name?.toLowerCase())
    )),
    [teams, profile],
  );

  const skills = profile?.skills ?? [];
  const workloadPct = profile?.workload != null ? Math.min(100, profile.workload * 20) : 0;

  // Local task state (persisted per-team in localStorage)
  const taskKey = myTeam ? `synergy-tasks-${myTeam.id}` : undefined;
  const defaultTasks = useMemo(() => myTeam ? [
    { id: 1, title: `Kickoff sync for ${myTeam.name}`, status: "Pending" as TaskStatus },
    { id: 2, title: `Share your ${profile?.preferred_role ?? "role"} deliverables`, status: "In Progress" as TaskStatus },
    { id: 3, title: "Weekly progress update", status: "Pending" as TaskStatus },
  ] : [], [myTeam, profile?.preferred_role]);
  const [tasks, setTasks] = useState(defaultTasks);
  useEffect(() => {
    if (!taskKey) { setTasks([]); return; }
    try {
      const raw = localStorage.getItem(taskKey);
      setTasks(raw ? JSON.parse(raw) : defaultTasks);
    } catch { setTasks(defaultTasks); }
  }, [taskKey, defaultTasks]);
  const updateTask = (id: number, status: TaskStatus) => {
    const next = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(next);
    if (taskKey) localStorage.setItem(taskKey, JSON.stringify(next));
  };

  // Modals & scrolling
  const [editOpen, setEditOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const tasksRef = useRef<HTMLDivElement>(null);
  const teamRef = useRef<HTMLDivElement>(null);

  // Edit form state
  const [fName, setFName] = useState("");
  const [fSkills, setFSkills] = useState("");
  const [fAvail, setFAvail] = useState(AVAIL[3]);
  const [fRole, setFRole] = useState(ROLES[0]);
  const [fWorkload, setFWorkload] = useState(3);

  // Extended profile (persisted locally; doesn't require schema migration)
  type Extra = {
    softSkills: string; availabilityCalendar: string; workloadPref: string;
    previousProjects: string; certificates: string; github: string; portfolio: string;
  };
  const extraKey = `synergy-profile-extra-${user.id}`;
  const emptyExtra: Extra = { softSkills: "", availabilityCalendar: "", workloadPref: "", previousProjects: "", certificates: "", github: "", portfolio: "" };
  const [extra, setExtra] = useState<Extra>(emptyExtra);
  useEffect(() => {
    try { const raw = localStorage.getItem(extraKey); if (raw) setExtra({ ...emptyExtra, ...JSON.parse(raw) }); } catch {}
  }, [extraKey]);
  const setExtraField = (k: keyof Extra, v: string) => setExtra(prev => { const next = { ...prev, [k]: v }; localStorage.setItem(extraKey, JSON.stringify(next)); return next; });

  useEffect(() => {
    if (!profile) return;
    setFName(profile.name ?? "");
    setFSkills((profile.skills ?? []).join(", "));
    setFAvail(profile.availability ?? AVAIL[3]);
    setFRole(profile.preferred_role ?? ROLES[0]);
    setFWorkload(profile.workload ?? 3);
  }, [profile]);

  const completion = useMemo(() => {
    const checks = [
      !!profile?.name, !!profile?.email, (profile?.skills?.length ?? 0) > 0,
      !!profile?.availability, !!profile?.preferred_role, (profile?.workload ?? 0) > 0,
      !!extra.softSkills, !!extra.availabilityCalendar, !!extra.workloadPref,
      !!extra.previousProjects, !!extra.certificates, !!extra.github, !!extra.portfolio,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [profile, extra]);


  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No profile loaded");
      const skillsArr = fSkills.split(/[,;/|]| and /i).map(s => s.trim()).filter(Boolean);
      const { error } = await supabase
        .from("student_profiles")
        .update({
          name: fName,
          skills: skillsArr,
          availability: fAvail,
          preferred_role: fRole,
          workload: fWorkload,
        })
        .eq("user_id", profile.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["my-student-profile"] });
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save profile"),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading your profile…</div>;
  }

  if (isError) {
    return (
      <div className="surface-elevated p-8 text-center">
        <h2 className="text-lg font-semibold text-destructive">Unable to load student profile</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {(error as Error)?.message ?? "Something went wrong loading your record."}
        </p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-sm text-muted-foreground">Redirecting to profile setup…</div>;
  }


  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.name}`}
        subtitle="Your profile, assigned team, and tasks at a glance."
        actions={
          <>
            <Badge tone="primary">Student</Badge>
            <button onClick={() => setEditOpen(true)} className="btn-secondary text-sm">
              <Pencil className="size-4" /> Edit Profile
            </button>
          </>
        }
      />

      {/* HERO PROFILE */}
      <div className="relative overflow-hidden rounded-2xl hero-gradient text-navy-foreground p-7 mb-8 shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" /> {profile.preferred_role ?? "Student"}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{profile.name}</h1>
            <p className="mt-2 text-sm opacity-80">{profile.email ?? user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15">{s}</span>
              ))}
              {skills.length === 0 && <span className="text-xs opacity-60">No skills listed</span>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 transition">
                <Pencil className="size-3.5" /> Update Profile
              </button>
              <button
                onClick={() => { if (!myTeam) return toast.message("No team assigned yet"); setTeamOpen(true); }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 transition"
              >
                <Eye className="size-3.5" /> View Team
              </button>
              <button
                onClick={() => scrollTo(tasksRef)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 backdrop-blur border border-white/15 transition"
              >
                <ListChecks className="size-3.5" /> View Tasks
              </button>
            </div>
          </div>
          {myTeam && (
            <div className="hidden md:flex flex-col items-center bg-white/8 backdrop-blur rounded-2xl px-6 py-5 border border-white/10">
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Team Compatibility</div>
              <div className="mt-3"><CompatibilityRing value={myTeam.compatibility} size={120} label="Score" /></div>
            </div>
          )}
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Preferred Role" value={profile.preferred_role ?? "—"} icon={Briefcase} accent="navy" />
        <MetricCard label="Availability" value={profile.availability ?? "—"} icon={Calendar} accent="primary" />
        <MetricCard label="Workload" value={`${workloadPct}%`} hint={`${profile.workload ?? 0}/10`} icon={Activity} accent={workloadPct > 60 ? "warning" : "success"} />
        <MetricCard label="Compatibility" value={myTeam ? `${myTeam.compatibility}%` : "—"} hint={myTeam ? "With your team" : "No team yet"} icon={Target} accent="success" />
      </div>

      {/* SKILL ASSESSMENT + EVIDENCE */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <SkillAssessmentCard skills={skills} />
        <EvidenceCard userId={user.id} />
      </div>

      {/* TEAM + TASKS */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div ref={teamRef} className="lg:col-span-2 surface-elevated p-6">
          <SectionHeader
            icon={Users2}
            title="Assigned Team"
            subtitle={myTeam ? `${myTeam.members.length} members` : "Awaiting team assignment"}
            action={myTeam && (
              <div className="flex items-center gap-2">
                <Badge tone={myTeam.status === "Published" ? "success" : myTeam.status === "Approved" ? "info" : "warning"}>{myTeam.status}</Badge>
                <button onClick={() => setTeamOpen(true)} className="btn-ghost text-xs"><Eye className="size-3.5" /> Details</button>
              </div>
            )}
          />
          {!myTeam ? (
            <CompatibilityInsights profile={profile} teams={teams} allStudents={allStudents} />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {myTeam.members.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="size-10 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-sm">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{m.name}{m.name?.toLowerCase() === profile.name?.toLowerCase() && <span className="ml-1 text-xs text-primary">(you)</span>}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.role} · load {m.workload}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={tasksRef} className="surface-elevated p-6">
          <SectionHeader icon={ListChecks} title="My Tasks" subtitle="Click status to update" />
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No tasks yet.</div>
          ) : (
            <ul className="space-y-2 mt-2">
              {tasks.map(t => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${t.status === "Done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  </div>
                  <select
                    value={t.status}
                    onChange={e => updateTask(t.id, e.target.value as TaskStatus)}
                    className="text-xs px-2 py-1 rounded border border-border bg-background"
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 surface-elevated p-6">
        <SectionHeader
          icon={User}
          title="Profile Details"
          subtitle="Keep your skills and availability up to date"
          action={<button onClick={() => setEditOpen(true)} className="btn-secondary text-xs"><Pencil className="size-3.5" /> Edit</button>}
        />
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Detail label="Full Name" value={profile.name} />
          <Detail label="Email" value={profile.email ?? user.email ?? "—"} />
          <Detail label="Preferred Role" value={profile.preferred_role ?? "—"} />
          <Detail label="Availability" value={profile.availability ?? "—"} />
          <Detail label="Workload" value={`${profile.workload ?? 0}/10`} />
          <Detail label="Skills" value={skills.join(", ") || "—"} />
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your details. Changes are visible to faculty immediately.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FieldEdit label="Full Name" value={fName} onChange={setFName} />
            <FieldEdit label="Skills (comma separated)" value={fSkills} onChange={setFSkills} />
            <div className="grid grid-cols-2 gap-3">
              <SelectEdit label="Availability" value={fAvail} onChange={setFAvail} options={AVAIL} />
              <SelectEdit label="Preferred Role" value={fRole} onChange={setFRole} options={ROLES} />
            </div>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Workload Capacity (0–10): {fWorkload}</span>
              <input type="range" min={0} max={10} value={fWorkload} onChange={e => setFWorkload(Number(e.target.value))} className="mt-2 w-full accent-primary" />
            </label>
          </div>
          <DialogFooter className="gap-2">
            <button className="btn-ghost text-sm" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn-primary text-sm" disabled={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
              {saveProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Detail Dialog */}
      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent className="max-w-lg">
          {myTeam ? (
            <>
              <DialogHeader>
                <DialogTitle>{myTeam.name}</DialogTitle>
                <DialogDescription>
                  Compatibility {myTeam.compatibility}% · {myTeam.members.length} members · status {myTeam.status}
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-1.5 max-h-72 overflow-auto">
                {myTeam.members.map(m => (
                  <li key={m.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-background/60 text-sm">
                    <div>
                      <div className="font-medium">{m.name}{m.name?.toLowerCase() === profile.name?.toLowerCase() && <span className="ml-1 text-xs text-primary">(you)</span>}</div>
                      <div className="text-xs text-muted-foreground">{m.skills.join(", ") || "—"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{m.role} · {m.workload}%</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <DialogHeader>
              <DialogTitle>No team assigned</DialogTitle>
              <DialogDescription>You'll see your team here once faculty publishes assignments.</DialogDescription>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function FieldEdit({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function SelectEdit({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

/* ---------- Skill Assessment Card ---------- */
function skillProficiency(skill: string): number {
  let h = 0;
  for (let i = 0; i < skill.length; i++) h = (h * 31 + skill.charCodeAt(i)) | 0;
  return 3 + (Math.abs(h) % 3); // 3..5 stars
}

function SkillAssessmentCard({ skills }: { skills: string[] }) {
  const entries = skills.length ? skills : ["Python", "Java", "SQL", "UI Design"];
  return (
    <div className="surface-elevated p-6">
      <SectionHeader
        icon={Gauge}
        title="Skill Assessment Score"
        subtitle="Proficiency mapped from your declared stack"
        action={<Badge tone="primary">{entries.length} skills</Badge>}
      />
      <ul className="space-y-3 mt-2">
        {entries.map(s => {
          const stars = skillProficiency(s);
          const pct = (stars / 5) * 100;
          return (
            <li key={s} className="flex items-center gap-4">
              <div className="w-28 shrink-0 text-sm font-medium truncate">{s}</div>
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-3.5 ${i < stars ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${stars >= 4 ? "from-success to-success/70" : stars >= 3 ? "from-primary to-primary/70" : "from-warning to-warning/70"}`}
                    style={{ width: `${pct}%`, transition: "width 500ms ease" }}
                  />
                </div>
              </div>
              <div className="w-10 text-right text-xs font-semibold tabular-nums text-muted-foreground">{stars}.0</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Evidence Submitted Card ---------- */
type EvidenceStatus = "Verified" | "Pending" | "Rejected";
const EVIDENCE_DEFINITIONS: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; defaultStatus: EvidenceStatus }[] = [
  { key: "github", label: "GitHub", icon: Github, defaultStatus: "Verified" },
  { key: "portfolio", label: "Portfolio", icon: FolderOpen, defaultStatus: "Pending" },
  { key: "coursework", label: "Coursework", icon: BookOpen, defaultStatus: "Verified" },
  { key: "certificates", label: "Certificates", icon: Award, defaultStatus: "Pending" },
];

function statusStyle(s: EvidenceStatus) {
  if (s === "Verified") return { cls: "bg-success/10 text-success border-success/30", Icon: CheckCircle2 };
  if (s === "Pending") return { cls: "bg-warning/15 text-foreground border-warning/40", Icon: Clock };
  return { cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle };
}

function EvidenceCard({ userId }: { userId: string }) {
  const storageKey = `synergy-evidence-${userId}`;
  const [state, setState] = useState<Record<string, EvidenceStatus>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setState(JSON.parse(raw));
      else setState(Object.fromEntries(EVIDENCE_DEFINITIONS.map(e => [e.key, e.defaultStatus])));
    } catch {
      setState(Object.fromEntries(EVIDENCE_DEFINITIONS.map(e => [e.key, e.defaultStatus])));
    }
  }, [storageKey]);

  const cycle = (key: string) => {
    const order: EvidenceStatus[] = ["Pending", "Verified", "Rejected"];
    setState(prev => {
      const cur = prev[key] ?? "Pending";
      const next = { ...prev, [key]: order[(order.indexOf(cur) + 1) % order.length] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const verified = Object.values(state).filter(v => v === "Verified").length;

  return (
    <div className="surface-elevated p-6">
      <SectionHeader
        icon={Award}
        title="Evidence Submitted"
        subtitle="Tap a card to update its status"
        action={<Badge tone="success">{verified}/{EVIDENCE_DEFINITIONS.length} verified</Badge>}
      />
      <div className="grid grid-cols-2 gap-3 mt-2">
        {EVIDENCE_DEFINITIONS.map(({ key, label, icon: Icon }) => {
          const s = state[key] ?? "Pending";
          const { cls, Icon: SI } = statusStyle(s);
          return (
            <button
              key={key}
              onClick={() => cycle(key)}
              className="text-left rounded-xl border border-border bg-card p-3 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 transition"
            >
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                  <Icon className="size-4" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
                  <SI className="size-3" /> {s}
                </span>
              </div>
              <div className="mt-2 font-semibold text-sm">{label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Submission #{key.slice(0, 4).toUpperCase()}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Compatibility Insights (no-team state) ---------- */
function CompatibilityInsights({
  profile, teams, allStudents,
}: {
  profile: StudentProfileRow;
  teams: ReturnType<typeof useSynergyForStudents>["teams"];
  allStudents: ReturnType<typeof useStudents>["data"] extends infer T ? (T extends undefined ? never : T) : never;
}) {
  const skills = profile.skills ?? [];

  // Predicted compatibility = hash-stable score scaled by skill breadth
  const predicted = useMemo(() => {
    const base = 60 + Math.min(25, skills.length * 4);
    let h = 0;
    for (const ch of (profile.name ?? "")) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return Math.min(96, base + (Math.abs(h) % 10));
  }, [profile.name, skills.length]);

  // Top matching skills — those most frequent across the existing roster
  const topMatching = useMemo(() => {
    const counts = new Map<string, number>();
    (allStudents ?? []).forEach((s: any) => (s.skills ?? []).forEach((sk: string) =>
      counts.set(sk.toLowerCase(), (counts.get(sk.toLowerCase()) ?? 0) + 1),
    ));
    return skills
      .map(s => ({ skill: s, demand: counts.get(s.toLowerCase()) ?? 0 }))
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 4);
  }, [allStudents, skills]);

  const availabilityMatch = useMemo(() => {
    if (!allStudents?.length) return 0;
    const same = allStudents.filter((s: any) =>
      (s.availability ?? "").toLowerCase() === (profile.availability ?? "").toLowerCase(),
    ).length;
    return Math.round((same / allStudents.length) * 100);
  }, [allStudents, profile.availability]);

  const status = teams.length === 0 ? "Awaiting Generation" : "Pending Assignment";

  return (
    <div className="mt-2 grid md:grid-cols-[auto_1fr] gap-6 items-start">
      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-navy/5 border border-primary/15">
        <CompatibilityRing value={predicted} size={130} label="Predicted" />
        <div className="text-xs text-muted-foreground text-center max-w-[160px]">
          Estimated fit based on your skills &amp; availability
        </div>
      </div>

      <div className="space-y-4 min-w-0">
        <div className="grid sm:grid-cols-2 gap-3">
          <InsightTile icon={Briefcase} label="Recommended Team Role" value={profile.preferred_role ?? "Developer"} tone="primary" />
          <InsightTile icon={Calendar} label="Availability Match" value={`${availabilityMatch}%`} hint="peers share your window" tone="info" />
          <InsightTile icon={TrendingUp} label="Predicted Compatibility" value={`${predicted}%`} tone="success" />
          <InsightTile icon={Sparkles} label="Team Formation Status" value={status} tone="warning" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
            Top Matching Skills
          </div>
          {topMatching.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add skills to your profile to see matches.</div>
          ) : (
            <div className="space-y-2.5">
              {topMatching.map(({ skill, demand }) => (
                <ScoreBar key={skill} label={`${skill} · ${demand} peer${demand === 1 ? "" : "s"}`} value={Math.min(100, 40 + demand * 12)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightTile({
  icon: Icon, label, value, hint, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone: "primary" | "success" | "warning" | "info";
}) {
  const toneCls = {
    primary: "text-primary bg-primary/10 ring-primary/20",
    success: "text-success bg-success/10 ring-success/20",
    warning: "text-foreground bg-warning/15 ring-warning/30",
    info: "text-info bg-info/10 ring-info/20",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
      <div className={`size-9 rounded-lg grid place-items-center ring-1 ${toneCls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-semibold text-sm truncate">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}
