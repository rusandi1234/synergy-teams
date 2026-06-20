import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader, StatCard, Badge } from "@/components/AppLayout";
import { useStudents } from "@/lib/useStudents";
import {
  useSynergy, runGeneration, approveAll, publishAll, resetSynergy,
} from "@/lib/synergy";
import {
  Play, CheckCircle2, Send, RotateCcw, AlertTriangle, Workflow, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard · SYNERGY" },
      { name: "description", content: "Faculty control center for generating, reviewing, and publishing student project teams." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: students = [], isLoading } = useStudents();
  const { teams, conflicts, recommendations } = useSynergy();

  const avgCompat = useMemo(
    () => (teams.length ? Math.round(teams.reduce((a, t) => a + t.compatibility, 0) / teams.length) : 0),
    [teams],
  );
  const highConflicts = conflicts.filter(c => c.severity === "High").length;
  const publishedCount = teams.filter(t => t.status === "Published").length;

  const onGenerate = () => {
    if (!students.length) return toast.error("No students loaded yet.");
    const { teams: t, conflicts: c } = runGeneration(students);
    toast.success(`Generated ${t.length} teams · ${c.length} conflicts detected`);
  };

  const onDemo = async () => {
    if (!students.length) return toast.error("No students loaded yet.");
    toast.info("Demo: generating teams…");
    runGeneration(students);
    await new Promise(r => setTimeout(r, 600));
    toast.info("Demo: reviewing conflicts…");
    await new Promise(r => setTimeout(r, 600));
    approveAll();
    toast.info("Demo: approving teams…");
    await new Promise(r => setTimeout(r, 500));
    publishAll();
    toast.success("Demo complete · teams published");
  };

  return (
    <>
      <PageHeader
        title="Faculty Dashboard"
        subtitle="Generate balanced project teams, review conflicts, and publish final assignments."
        actions={
          <>
            <button onClick={onDemo} className="btn-secondary">
              <Sparkles className="size-4" /> Demo Scenario
            </button>
            <button onClick={onGenerate} className="btn-primary">
              <Play className="size-4" /> Generate Teams
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={isLoading ? "…" : students.length} accent="navy" />
        <StatCard label="Generated Teams" value={teams.length} accent="primary" />
        <StatCard label="Conflicts" value={conflicts.length} hint={`${highConflicts} high priority`} accent="warning" />
        <StatCard label="Avg Compatibility" value={`${avgCompat}%`} hint={`${publishedCount} published`} accent="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Approval Workflow</h2>
          </div>
          <WorkflowSteps
            studentsLoaded={students.length > 0}
            generated={teams.length > 0}
            conflictsReviewed={teams.length > 0}
            approved={teams.length > 0 && teams.every(t => t.status === "Approved" || t.status === "Published")}
            published={teams.length > 0 && teams.every(t => t.status === "Published")}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/teams" className="btn-secondary"><CheckCircle2 className="size-4" /> Review Teams</Link>
            <Link to="/conflicts" className="btn-secondary"><AlertTriangle className="size-4" /> Review Conflicts</Link>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); approveAll(); toast.success("All teams approved"); }} className="btn-secondary">
              <CheckCircle2 className="size-4" /> Approve All
            </button>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); publishAll(); toast.success("Teams published"); }} className="btn-primary">
              <Send className="size-4" /> Publish Teams
            </button>
            <button onClick={() => { resetSynergy(); toast.message("Workflow reset"); }} className="btn-ghost">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Executive Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {students.length} students analysed. {teams.length} teams generated.{" "}
            {highConflicts} high-priority conflict{highConflicts === 1 ? "" : "s"} detected.{" "}
            Average compatibility score: {avgCompat}%.{" "}
            {teams.length > 0
              ? (highConflicts > 0
                ? "Faculty review recommended before publication."
                : "Teams look healthy — safe to publish.")
              : "Click Generate Teams to begin."}
          </p>

          <div className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Top Recommendations</h3>
            {recommendations.length === 0 ? (
              <div className="text-xs text-muted-foreground">Generate teams to see recommendations.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {recommendations.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {teams.length > 0 && (
        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Latest Teams</h2>
            <Link to="/teams" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {teams.slice(0, 4).map(t => (
              <div key={t.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>
                    {t.status}
                  </Badge>
                </div>
                <div className="text-2xl font-semibold mt-2">{t.compatibility}%</div>
                <div className="text-xs text-muted-foreground">{t.members.length} members · avg load {t.avgWorkload}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function WorkflowSteps(props: { studentsLoaded: boolean; generated: boolean; conflictsReviewed: boolean; approved: boolean; published: boolean }) {
  const steps = [
    { label: "Students Loaded", done: props.studentsLoaded },
    { label: "Generate Teams", done: props.generated },
    { label: "Detect Conflicts", done: props.conflictsReviewed },
    { label: "Approve Teams", done: props.approved },
    { label: "Publish Teams", done: props.published },
  ];
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2 flex-1 min-w-[120px]">
          <div className={`flex flex-col items-center gap-2 flex-1`}>
            <div className={`size-9 rounded-full grid place-items-center text-sm font-semibold border-2 ${s.done ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
              {i + 1}
            </div>
            <div className={`text-xs text-center ${s.done ? "font-medium" : "text-muted-foreground"}`}>{s.label}</div>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 ${steps[i + 1].done ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
