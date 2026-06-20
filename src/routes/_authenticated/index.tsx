import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, CompatibilityRing, WorkflowTimeline, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import {
  useSynergyForStudents, runGeneration, approveAll, publishAll, resetSynergy,
} from "@/lib/synergy";
import {
  Play, CheckCircle2, Send, RotateCcw, AlertTriangle, Workflow, Sparkles,
  Users, Users2, Target, Activity, Lightbulb, ArrowRight, Zap,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/")({
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
  const { teams, conflicts, recommendations } = useSynergyForStudents(students);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const navigate = useNavigate();
  const demoRunning = useRef(false);

  const avgCompat = useMemo(
    () => (teams.length ? Math.round(teams.reduce((a, t) => a + t.compatibility, 0) / teams.length) : 0),
    [teams],
  );
  const highConflicts = conflicts.filter(c => c.severity === "High").length;
  const medConflicts = conflicts.filter(c => c.severity === "Medium").length;
  const publishedCount = teams.filter(t => t.status === "Published").length;
  const approvedCount = teams.filter(t => t.status === "Approved" || t.status === "Published").length;
  const avgWorkload = useMemo(
    () => (students.length ? Math.round(students.reduce((a, s) => a + s.workload, 0) / students.length) : 0),
    [students],
  );

  const onGenerate = () => {
    if (!students.length) return toast.error("No students loaded yet.");
    const { teams: t, conflicts: c } = runGeneration(students);
    toast.success(`Generated ${t.length} teams · ${c.length} conflicts detected`);
  };

  const onDemo = async () => {
    if (demoRunning.current) return;
    if (!students.length) return toast.error("No students loaded yet.");
    demoRunning.current = true;
    const toastId = toast.loading("Running demo · generating teams…");
    try {
      const { teams: t, conflicts: c } = runGeneration(students);
      await new Promise(r => setTimeout(r, 500));
      toast.loading(`Reviewing ${c.length} conflicts…`, { id: toastId });
      await new Promise(r => setTimeout(r, 500));
      approveAll();
      toast.loading("Approving teams…", { id: toastId });
      await new Promise(r => setTimeout(r, 500));
      publishAll();
      toast.success(`Demo complete · ${t.length} teams published`, { id: toastId });
      navigate({ to: "/teams" });
    } finally {
      demoRunning.current = false;
    }
  };

  const stage =
    publishedCount === teams.length && teams.length > 0 ? "Published"
    : approvedCount === teams.length && teams.length > 0 ? "Approved"
    : teams.length > 0 ? "Review"
    : "Idle";

  return (
    <>
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl hero-gradient text-navy-foreground p-7 md:p-9 mb-8 shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
        <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-medium uppercase tracking-wider">
              <Zap className="size-3.5 text-primary" /> Live · {stage}
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Faculty Command Center
            </h1>
            <p className="mt-2 text-sm md:text-base opacity-80 max-w-2xl">
              Intelligent allocation, conflict detection, and one-click publishing — generate balanced student project teams in under two minutes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onDemo} className="btn-premium">
                <Sparkles className="size-4" /> Run Demo Scenario
              </button>
              <button onClick={onGenerate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15 backdrop-blur border border-white/15 transition">
                <Play className="size-4" /> Generate Teams
              </button>
              <Link to="/teams" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-transparent hover:bg-white/10 border border-white/15 transition">
                Review <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center bg-white/8 backdrop-blur rounded-2xl px-6 py-5 border border-white/10">
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Avg Compatibility</div>
            <div className="mt-3"><CompatibilityRing value={avgCompat} size={120} label="Overall" /></div>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/students" className="block cursor-pointer rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <MetricCard label="Total Students" value={isLoading ? "…" : students.length} hint={`Avg load ${avgWorkload}%`} icon={Users} accent="navy" trend="flat" trendValue="Active cohort" />
        </Link>
        <Link to="/teams" className="block cursor-pointer rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <MetricCard label="Generated Teams" value={teams.length} hint={`${publishedCount} published · ${approvedCount} approved`} icon={Users2} accent="primary" trend={teams.length ? "up" : "flat"} trendValue={teams.length ? "Allocation complete" : "Awaiting run"} />
        </Link>
        <Link to="/conflicts" className="block cursor-pointer rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <MetricCard label="Conflicts" value={conflicts.length} hint={`${highConflicts} high · ${medConflicts} medium`} icon={AlertTriangle} accent="warning" trend={highConflicts ? "down" : "flat"} trendValue={highConflicts ? "Needs review" : "Stable"} />
        </Link>
        <Link to="/analytics" className="block cursor-pointer rounded-2xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <MetricCard label="Avg Compatibility" value={`${avgCompat}%`} hint={avgCompat >= 75 ? "Healthy" : avgCompat > 0 ? "Optimise" : "—"} icon={Target} accent="success" trend={avgCompat >= 75 ? "up" : "flat"} trendValue={avgCompat >= 75 ? "Above target" : "Build teams"} />
        </Link>
      </div>

      {/* WORKFLOW + EXECUTIVE SUMMARY */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 surface-elevated p-6">
          <SectionHeader
            icon={Workflow}
            title="Approval Workflow"
            subtitle="Track the end-to-end faculty review pipeline"
            action={
              <Badge tone={stage === "Published" ? "success" : stage === "Approved" ? "info" : stage === "Review" ? "warning" : "default"}>
                {stage}
              </Badge>
            }
          />
          <WorkflowTimeline
            steps={[
              { label: "Roster Loaded", description: `${students.length} students with skills, roles & availability ingested`, done: students.length > 0 },
              { label: "Generate Teams", description: "AI engine balances skills, roles, and workload", done: teams.length > 0, active: students.length > 0 && !teams.length },
              { label: "Detect Conflicts", description: `${conflicts.length} issue${conflicts.length === 1 ? "" : "s"} flagged with severity & suggested fix`, done: teams.length > 0, active: teams.length > 0 && approvedCount < teams.length },
              { label: "Faculty Approval", description: `${approvedCount}/${teams.length || 0} teams approved for publication`, done: teams.length > 0 && approvedCount === teams.length, active: teams.length > 0 && approvedCount > 0 && approvedCount < teams.length },
              { label: "Publish Assignments", description: "Final teams pushed to students", done: teams.length > 0 && publishedCount === teams.length },
            ]}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/teams" className="btn-secondary"><CheckCircle2 className="size-4" /> Review Teams</Link>
            <Link to="/conflicts" className="btn-secondary"><AlertTriangle className="size-4" /> Review Conflicts</Link>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); approveAll(); toast.success("All teams approved"); }} className="btn-secondary">
              <CheckCircle2 className="size-4" /> Approve All
            </button>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); setConfirmPublish(true); }} className="btn-primary">
              <Send className="size-4" /> Publish Teams
            </button>
            <button onClick={() => { resetSynergy(); toast.message("Workflow reset"); }} className="btn-ghost">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        <div className="surface-elevated p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 size-40 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <SectionHeader icon={Activity} title="Executive Summary" subtitle="Auto-generated insight brief" />
          <div className="space-y-3 text-sm">
            <SummaryRow label="Cohort" value={`${students.length} students`} />
            <SummaryRow label="Teams" value={`${teams.length} formed`} />
            <SummaryRow label="Avg Compatibility" value={`${avgCompat}%`} tone={avgCompat >= 75 ? "success" : avgCompat > 0 ? "warning" : "muted"} />
            <SummaryRow label="High Conflicts" value={String(highConflicts)} tone={highConflicts === 0 ? "success" : "danger"} />
            <SummaryRow label="Publication" value={publishedCount === teams.length && teams.length ? "Ready" : "Pending"} tone={publishedCount === teams.length && teams.length ? "success" : "warning"} />
          </div>

          <div className="mt-5 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs leading-relaxed">
            {teams.length > 0
              ? (highConflicts > 0
                ? <><strong className="text-primary">Recommendation:</strong> Resolve {highConflicts} high-severity conflict{highConflicts === 1 ? "" : "s"} before publication.</>
                : <><strong className="text-success">Recommendation:</strong> Teams look healthy — safe to publish.</>)
              : <><strong className="text-primary">Next step:</strong> Click <em>Run Demo Scenario</em> to generate the full workflow.</>}
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <Lightbulb className="size-3.5 text-primary" /> Top Recommendations
            </div>
            {recommendations.length === 0 ? (
              <div className="text-xs text-muted-foreground">Generate teams to see recommendations.</div>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="text-primary mt-0.5">→</span>
                    <span className="leading-snug">{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* LATEST TEAMS */}
      {teams.length > 0 && (
        <div className="surface-elevated p-6">
          <SectionHeader
            icon={Users2}
            title="Latest Teams"
            subtitle="Highest compatibility first"
            action={<Link to="/teams" className="text-sm text-primary hover:underline inline-flex items-center gap-1">View all <ArrowRight className="size-3.5" /></Link>}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...teams].sort((a, b) => b.compatibility - a.compatibility).slice(0, 4).map(t => (
              <div key={t.id} className="group relative overflow-hidden border border-border rounded-xl p-4 bg-card hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 transition-all">
                <div className="absolute -top-8 -right-8 size-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{t.members.length} members · load {t.avgWorkload}%</div>
                    <div className="mt-2">
                      <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                  <CompatibilityRing value={t.compatibility} size={64} label="Score" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish all teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks every team as Published and is immediately visible to students. Resolve high-severity conflicts first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { publishAll(); toast.success("Teams published"); }}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SummaryRow({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "success" | "warning" | "danger" }) {
  const toneCls =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${toneCls}`}>{value}</span>
    </div>
  );
}
