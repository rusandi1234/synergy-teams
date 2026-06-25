import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Route as AuthRoute } from "./route";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, CompatibilityRing, SectionHeader } from "@/components/SynergyUI";
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
  useEffect(() => {
    if (!profile) return;
    setFName(profile.name ?? "");
    setFSkills((profile.skills ?? []).join(", "));
    setFAvail(profile.availability ?? AVAIL[3]);
    setFRole(profile.preferred_role ?? ROLES[0]);
    setFWorkload(profile.workload ?? 3);
  }, [profile]);

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
            <div className="text-sm text-muted-foreground py-6">
              Faculty hasn't published a team for you yet. Check back soon.
            </div>
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
