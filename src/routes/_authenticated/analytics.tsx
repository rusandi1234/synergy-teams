import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { MetricCard } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents } from "@/lib/synergy";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Users, BarChart3, Target, Layers, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · SYNERGY" },
      { name: "description", content: "Visual analytics for student roles, skills, workload distribution, and team compatibility." },
    ],
  }),
  component: AnalyticsPage,
});

const COLORS = ["#DC2626", "#1E3A8A", "#0EA5E9", "#F59E0B", "#10B981", "#7C3AED"];

type Drill = null | { kind: "role"; value: string } | { kind: "skill"; value: string } | { kind: "workload"; bucket: string; min: number; max: number } | { kind: "team"; name: string };

function AnalyticsPage() {
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);

  const [drill, setDrill] = useState<Drill>(null);
  const [focus, setFocus] = useState<"all" | "roles" | "skills" | "workload" | "teams">("all");

  const roleData = useMemo(() => {
    const m: Record<string, number> = {};
    students.forEach(s => (m[s.role] = (m[s.role] ?? 0) + 1));
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [students]);

  const skillData = useMemo(() => {
    const m: Record<string, number> = {};
    students.forEach(s => s.skills.forEach(k => (m[k] = (m[k] ?? 0) + 1)));
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [students]);

  const workloadBuckets = [
    { name: "0–25%", min: 0, max: 25 },
    { name: "26–50%", min: 26, max: 50 },
    { name: "51–75%", min: 51, max: 75 },
    { name: "76–100%", min: 76, max: 100 },
  ];
  const workloadData = useMemo(() =>
    workloadBuckets.map(b => ({ name: b.name, value: students.filter(s => s.workload >= b.min && s.workload <= b.max).length })),
  [students]);

  const compatData = teams.map(t => ({ name: t.name.replace("Team ", ""), value: t.compatibility, id: t.id }));

  const radarData = useMemo(() => {
    if (!teams.length) return [];
    const avg = (k: keyof typeof teams[0]["scores"]) =>
      Math.round(teams.reduce((a, t) => a + t.scores[k], 0) / teams.length);
    return [
      { axis: "Skills", value: avg("skillDiversity") },
      { axis: "Availability", value: avg("availability") },
      { axis: "Roles", value: avg("roleCompat") },
      { axis: "Balance", value: avg("workloadBalance") },
    ];
  }, [teams]);

  const avgCompat = teams.length ? Math.round(teams.reduce((a, t) => a + t.compatibility, 0) / teams.length) : 0;
  const topSkill = skillData[0]?.name ?? "—";

  // Drill-down rows
  const drillRows = useMemo(() => {
    if (!drill) return [];
    if (drill.kind === "role") return students.filter(s => s.role === drill.value);
    if (drill.kind === "skill") return students.filter(s => s.skills.includes(drill.value));
    if (drill.kind === "workload") return students.filter(s => s.workload >= drill.min && s.workload <= drill.max);
    if (drill.kind === "team") {
      const t = teams.find(x => x.name.replace("Team ", "") === drill.name || x.name === drill.name);
      return t ? t.members : [];
    }
    return [];
  }, [drill, students, teams]);

  const drillTitle = !drill ? "" :
    drill.kind === "role" ? `Students in role: ${drill.value}` :
    drill.kind === "skill" ? `Students with skill: ${drill.value}` :
    drill.kind === "workload" ? `Students in workload ${drill.bucket}` :
    `Members of Team ${drill.name}`;

  const show = (k: typeof focus) => focus === "all" || focus === k;

  return (
    <>
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Distributions across roles, skills, workload, and team compatibility. Click any card or chart bar to drill in."
        actions={focus !== "all" ? (
          <button onClick={() => setFocus("all")} className="btn-ghost text-sm"><X className="size-4" /> Show all</button>
        ) : null}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button onClick={() => setFocus("all")} className="text-left">
          <MetricCard label="Cohort Size" value={students.length} icon={Users} accent="navy" hint="Show all charts" />
        </button>
        <button onClick={() => setFocus("skills")} className="text-left">
          <MetricCard label="Unique Skills" value={skillData.length} icon={Layers} accent="info" hint={`Top: ${topSkill}`} />
        </button>
        <button onClick={() => setFocus("teams")} className="text-left">
          <MetricCard label="Teams Formed" value={teams.length} icon={BarChart3} accent="primary" hint="Focus team charts" />
        </button>
        <button onClick={() => setFocus("teams")} className="text-left">
          <MetricCard label="Avg Compatibility" value={`${avgCompat}%`} icon={Target} accent="success" hint={avgCompat >= 75 ? "Above target" : "Build teams"} />
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {show("roles") && (
          <Card title="Role Distribution" subtitle="Click a slice to drill down">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55} paddingAngle={2} label
                  onClick={(d: any) => d?.name && setDrill({ kind: "role", value: d.name })}
                  style={{ cursor: "pointer" }}
                >
                  {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {show("workload") && (
          <Card title="Workload Distribution" subtitle="Click a bar to see students in that range">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={workloadData}>
                <defs>
                  <linearGradient id="wlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="value" fill="url(#wlGrad)" radius={[6, 6, 0, 0]} cursor="pointer"
                  onClick={(d: any) => {
                    const b = workloadBuckets.find(x => x.name === d?.name);
                    if (b) setDrill({ kind: "workload", bucket: b.name, min: b.min, max: b.max });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {show("skills") && (
          <Card title="Top Skills (Top 10)" subtitle="Click a bar to list students with that skill">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={skillData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="value" fill="#1E3A8A" radius={[0, 6, 6, 0]} cursor="pointer"
                  onClick={(d: any) => d?.name && setDrill({ kind: "skill", value: d.name })}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {show("teams") && (
          <Card title="Team Compatibility Scores" subtitle="Click a bar to inspect team members">
            {compatData.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={compatData}>
                  <defs>
                    <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar
                    dataKey="value" fill="url(#compGrad)" radius={[6, 6, 0, 0]} cursor="pointer"
                    onClick={(d: any) => d?.name && setDrill({ kind: "team", name: d.name })}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] grid place-items-center text-sm text-muted-foreground">
                Generate teams to see compatibility analytics.
              </div>
            )}
          </Card>
        )}

        {show("teams") && radarData.length > 0 && (
          <Card title="Compatibility Profile" subtitle="Average score across all four dimensions">
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{drillTitle}</DialogTitle>
            <DialogDescription>{drillRows.length} matching student{drillRows.length === 1 ? "" : "s"}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto space-y-1.5">
            {drillRows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No matches.</div>
            ) : drillRows.map(s => (
              <div key={s.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-background/60 text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.skills.join(", ") || "—"}</div>
                </div>
                <div className="text-xs text-muted-foreground">{s.role} · {s.workload}%</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="surface-elevated p-5">
      <div className="mb-3">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
