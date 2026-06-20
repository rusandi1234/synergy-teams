import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/AppLayout";
import { MetricCard } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents } from "@/lib/synergy";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Users, BarChart3, Target, Layers } from "lucide-react";

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

function AnalyticsPage() {
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);

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

  const workloadData = useMemo(() => {
    const buckets = [
      { name: "0–25%", value: 0 }, { name: "26–50%", value: 0 },
      { name: "51–75%", value: 0 }, { name: "76–100%", value: 0 },
    ];
    students.forEach(s => {
      const i = s.workload <= 25 ? 0 : s.workload <= 50 ? 1 : s.workload <= 75 ? 2 : 3;
      buckets[i].value++;
    });
    return buckets;
  }, [students]);

  const compatData = teams.map(t => ({ name: t.name.replace("Team ", ""), value: t.compatibility }));

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

  return (
    <>
      <PageHeader title="Analytics Dashboard" subtitle="Distributions across roles, skills, workload, and team compatibility." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Cohort Size" value={students.length} icon={Users} accent="navy" hint="Active students" />
        <MetricCard label="Unique Skills" value={skillData.length} icon={Layers} accent="info" hint={`Top: ${topSkill}`} />
        <MetricCard label="Teams Formed" value={teams.length} icon={BarChart3} accent="primary" hint="Generated this session" />
        <MetricCard label="Avg Compatibility" value={`${avgCompat}%`} icon={Target} accent="success" hint={avgCompat >= 75 ? "Above target" : "Build teams"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Role Distribution" subtitle="Balance of disciplines across the cohort">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55} paddingAngle={2} label>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Workload Distribution" subtitle="Number of students per workload bucket">
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
              <Bar dataKey="value" fill="url(#wlGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top Skills (Top 10)" subtitle="Most represented skills">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={skillData} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1E3A8A" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Team Compatibility Scores" subtitle="Higher is better — target ≥ 75%">
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
                <Bar dataKey="value" fill="url(#compGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] grid place-items-center text-sm text-muted-foreground">
              Generate teams to see compatibility analytics.
            </div>
          )}
        </Card>

        {radarData.length > 0 && (
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
