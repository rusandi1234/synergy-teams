import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/AppLayout";
import { useStudents } from "@/lib/useStudents";
import { useSynergy } from "@/lib/synergy";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

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
  const { teams } = useSynergy();

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

  return (
    <>
      <PageHeader title="Analytics Dashboard" subtitle="Distributions across roles, skills, workload, and team compatibility." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Role Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={roleData} dataKey="value" nameKey="name" outerRadius={100} label>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Workload Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workloadData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Top Skills (Top 10)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={skillData} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Team Compatibility Scores">
          {compatData.length ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={compatData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] grid place-items-center text-sm text-muted-foreground">
              Generate teams to see compatibility analytics.
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
