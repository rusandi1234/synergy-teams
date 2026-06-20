import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { externalSupabase, type ExternalStudentRow } from "@/integrations/external-supabase/client";
import { Route as AuthRoute } from "./route";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, CompatibilityRing, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents } from "@/lib/synergy";
import { User, Sparkles, Calendar, Briefcase, Activity, Users2, ListChecks, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({
    meta: [
      { title: "My Dashboard · SYNERGY" },
      { name: "description", content: "Your student profile, team assignment, and tasks." },
    ],
  }),
  component: StudentDashboard,
});

function useMyProfile(userId: string) {
  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await externalSupabase
        .from("Students")
        .select("student_id,name,skills,availability,workload,Roles,auth_user_id,email")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as ExternalStudentRow | null;
    },
    staleTime: 30_000,
  });
}

function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[,;/|]| and /i).map(s => s.trim()).filter(Boolean);
}

function StudentDashboard() {
  const { user } = AuthRoute.useRouteContext();
  const { data: profile, isLoading } = useMyProfile(user.id);
  const { data: allStudents = [] } = useStudents();
  const { teams } = useSynergyForStudents(allStudents);

  const myTeam = useMemo(
    () => teams.find(t => t.members.some(m => String(m.id) === String(profile?.student_id))),
    [teams, profile?.student_id],
  );

  const skills = parseSkills(profile?.skills);
  const workloadPct = profile?.workload != null ? Math.min(100, profile.workload * 20) : 0;

  // Mock tasks until a real tasks table exists
  const tasks = myTeam ? [
    { id: 1, title: `Kickoff sync for ${myTeam.name}`, status: "Pending" as const },
    { id: 2, title: `Share your ${profile?.Roles ?? "role"} deliverables`, status: "In Progress" as const },
    { id: 3, title: "Weekly progress update", status: "Pending" as const },
  ] : [];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading your profile…</div>;
  }

  if (!profile) {
    return (
      <div className="surface-elevated p-8 text-center">
        <h2 className="text-lg font-semibold">No student profile found</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your account isn't linked to a student record yet. Please contact faculty.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.name}`}
        subtitle="Your profile, assigned team, and tasks at a glance."
        actions={<Badge tone="primary">Student</Badge>}
      />

      {/* HERO PROFILE */}
      <div className="relative overflow-hidden rounded-2xl hero-gradient text-navy-foreground p-7 mb-8 shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium uppercase tracking-wider">
              <Sparkles className="size-3.5 text-primary" /> {profile.Roles ?? "Student"}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{profile.name}</h1>
            <p className="mt-2 text-sm opacity-80">{profile.email ?? user.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15">{s}</span>
              ))}
              {skills.length === 0 && <span className="text-xs opacity-60">No skills listed</span>}
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
        <MetricCard label="Preferred Role" value={profile.Roles ?? "—"} icon={Briefcase} accent="navy" />
        <MetricCard label="Availability" value={profile.availability ?? "—"} icon={Calendar} accent="primary" />
        <MetricCard label="Workload" value={`${workloadPct}%`} hint={`${profile.workload ?? 0}/10`} icon={Activity} accent={workloadPct > 60 ? "warning" : "success"} />
        <MetricCard label="Compatibility" value={myTeam ? `${myTeam.compatibility}%` : "—"} hint={myTeam ? "With your team" : "No team yet"} icon={Target} accent="success" />
      </div>

      {/* TEAM + TASKS */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-elevated p-6">
          <SectionHeader
            icon={Users2}
            title="Assigned Team"
            subtitle={myTeam ? `${myTeam.members.length} members` : "Awaiting team assignment"}
            action={myTeam && <Badge tone={myTeam.status === "Published" ? "success" : myTeam.status === "Approved" ? "info" : "warning"}>{myTeam.status}</Badge>}
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
                    <div className="font-medium text-sm truncate">{m.name}{String(m.id) === String(profile.student_id) && <span className="ml-1 text-xs text-primary">(you)</span>}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.role} · load {m.workload}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-elevated p-6">
          <SectionHeader icon={ListChecks} title="My Tasks" subtitle="Assignments from your team" />
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">No tasks yet.</div>
          ) : (
            <ul className="space-y-2 mt-2">
              {tasks.map(t => (
                <li key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{t.title}</div>
                  </div>
                  <Badge tone={t.status === "In Progress" ? "info" : "warning"}>{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 surface-elevated p-6">
        <SectionHeader icon={User} title="Profile Details" subtitle="Edit via faculty for now" />
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Detail label="Full Name" value={profile.name} />
          <Detail label="Email" value={profile.email ?? user.email ?? "—"} />
          <Detail label="Preferred Role" value={profile.Roles ?? "—"} />
          <Detail label="Availability" value={profile.availability ?? "—"} />
          <Detail label="Workload" value={`${profile.workload ?? 0}/10`} />
          <Detail label="Skills" value={skills.join(", ") || "—"} />
        </div>
      </div>
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
