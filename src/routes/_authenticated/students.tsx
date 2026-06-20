import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, StatCard, Badge } from "@/components/AppLayout";
import { useStudents } from "@/lib/useStudents";
import { Search } from "lucide-react";

export const Route = createFileRoute("/students")({
  head: () => ({
    meta: [
      { title: "Students · SYNERGY" },
      { name: "description", content: "Browse, search, and filter all enrolled students by role, skill, and workload." },
    ],
  }),
  component: StudentsPage,
});

const ROLES = ["All", "Developer", "Designer", "QA", "Business Analyst", "Team Leader"] as const;

function StudentsPage() {
  const { data: students = [], isLoading } = useStudents();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [skill, setSkill] = useState("All");

  const allSkills = useMemo(() => {
    const s = new Set<string>();
    students.forEach(st => st.skills.forEach(k => s.add(k)));
    return ["All", ...Array.from(s).sort()];
  }, [students]);

  const filtered = students.filter(s => {
    if (role !== "All" && s.role !== role) return false;
    if (skill !== "All" && !s.skills.includes(skill)) return false;
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    students.forEach(s => (c[s.role] = (c[s.role] ?? 0) + 1));
    return c;
  }, [students]);

  return (
    <>
      <PageHeader title="Student Management" subtitle="Searchable directory of students, roles, skills, and current workload." />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total Students" value={isLoading ? "…" : students.length} accent="navy" />
        <StatCard label="Developers" value={counts["Developer"] ?? 0} accent="primary" />
        <StatCard label="Designers" value={counts["Designer"] ?? 0} accent="info" />
        <StatCard label="QA Engineers" value={counts["QA"] ?? 0} accent="warning" />
        <StatCard label="Business Analysts" value={counts["Business Analyst"] ?? 0} accent="success" />
        <StatCard label="Team Leaders" value={counts["Team Leader"] ?? 0} accent="primary" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search students by name…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={role} onChange={e => setRole(e.target.value as any)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          {ROLES.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={skill} onChange={e => setSkill(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          {allSkills.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Skills</th>
              <th className="text-left px-4 py-3">Availability</th>
              <th className="text-left px-4 py-3 w-48">Workload</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3"><Badge tone={roleTone(s.role)}>{s.role}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.skills.map(k => <span key={k} className="px-2 py-0.5 rounded bg-muted text-xs">{k}</span>)}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.availability}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${s.workload > 65 ? "bg-destructive" : s.workload > 40 ? "bg-warning" : "bg-success"}`} style={{ width: `${s.workload}%` }} />
                    </div>
                    <span className="text-xs tabular-nums w-10 text-right">{s.workload}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No students match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function roleTone(r: string): any {
  return r === "Developer" ? "primary"
    : r === "Designer" ? "info"
    : r === "QA" ? "warning"
    : r === "Business Analyst" ? "success"
    : r === "Team Leader" ? "navy" : "default";
}
