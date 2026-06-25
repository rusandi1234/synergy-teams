import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents, type Team, type Student } from "@/lib/synergy";
import {
  Brain, AlertTriangle, Trophy, UserPlus, Sparkles, Activity, Crown,
  Check, X, ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/recommendations")({
  head: () => ({
    meta: [
      { title: "AI Recommendations · SYNERGY" },
      { name: "description", content: "Intelligent recommendation center for faculty." },
    ],
  }),
  component: RecommendationsPage,
});

const KEY = "synergy-rec-decisions-v1";
type Decision = "accepted" | "dismissed";
function loadDecisions(): Record<string, Decision> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function saveDecisions(d: Record<string, Decision>) { localStorage.setItem(KEY, JSON.stringify(d)); }

function RARE_SKILLS(allStudents: Student[]): Set<string> {
  const counts: Record<string, number> = {};
  for (const s of allStudents) for (const k of s.skills) counts[k] = (counts[k] || 0) + 1;
  const total = allStudents.length;
  return new Set(Object.entries(counts).filter(([, n]) => n <= Math.max(1, total * 0.15)).map(([k]) => k));
}

function RecommendationsPage() {
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  useEffect(() => { setDecisions(loadDecisions()); }, []);
  function decide(id: string, d: Decision) {
    const next = { ...decisions, [id]: d };
    setDecisions(next); saveDecisions(next);
    toast.success(d === "accepted" ? "Recommendation accepted" : "Dismissed");
  }

  const assigned = useMemo(() => new Set(teams.flatMap(t => t.members.map(m => m.id))), [teams]);
  const rare = useMemo(() => RARE_SKILLS(students), [students]);

  const highRisk = teams.filter(t => t.compatibility < 65).slice(0, 5);
  const bestPerf = [...teams].sort((a, b) => b.compatibility - a.compatibility).slice(0, 4);
  const noTeam = students.filter(s => !assigned.has(s.id)).slice(0, 6);
  const rareStudents = students.filter(s => s.skills.some(k => rare.has(k))).slice(0, 6);
  const overloaded = students.filter(s => s.workload >= 7).slice(0, 6);
  const leaders = students.filter(s => s.role === "Team Leader" || (s.workload <= 6 && s.skills.length >= 3)).slice(0, 6);

  return (
    <>
      <PageHeader
        title="AI Recommendations"
        subtitle="The intelligence center — actionable suggestions ranked by impact."
        actions={<Badge tone="primary"><Sparkles className="size-3 inline-block mr-1" /> Live signals</Badge>}
      />

      <div className="space-y-6">
        <Group icon={AlertTriangle} title="High Risk Teams" subtitle="Compatibility below 65%" accent="warning">
          {highRisk.length === 0 ? <Empty>No high-risk teams. Healthy roster!</Empty> : highRisk.map(t => (
            <RecCard key={`hr-${t.id}`} id={`hr-${t.id}`} decisions={decisions} onDecide={decide}
              title={t.name} subtitle={`Compatibility ${t.compatibility}% · avg workload ${t.avgWorkload}%`}
              reasons={[
                `Compatibility ${t.compatibility}% sits in the bottom quartile`,
                `Skill diversity score ${t.scores.skillDiversity}`,
                `Workload variance flagged by balancer (${t.scores.workloadBalance})`,
                "Consider running Rebalance or replacing one member",
              ]}
              cta={<Link to="/rebalancing" className="btn-secondary text-xs">Open Rebalancing <ChevronRight className="size-3" /></Link>}
            />
          ))}
        </Group>

        <Group icon={Trophy} title="Best Performing Teams" subtitle="High compatibility, balanced workload" accent="success">
          {bestPerf.map(t => (
            <RecCard key={`bp-${t.id}`} id={`bp-${t.id}`} decisions={decisions} onDecide={decide}
              title={t.name} subtitle={`Compatibility ${t.compatibility}%`}
              reasons={[
                `Top-quartile compatibility (${t.compatibility}%)`,
                `Strong role coverage (${t.scores.roleCompat})`,
                `Balanced workload (${t.scores.workloadBalance})`,
                "Recommended as showcase team for the cohort",
              ]}
              cta={<Link to="/teams" className="btn-ghost text-xs">View team <ChevronRight className="size-3" /></Link>}
            />
          ))}
        </Group>

        <Group icon={UserPlus} title="Students Without Teams" subtitle="Unassigned in current generation" accent="info">
          {noTeam.length === 0 ? <Empty>Every student is currently on a team.</Empty> : noTeam.map(s => (
            <StudentRec key={`nt-${s.id}`} id={`nt-${s.id}`} decisions={decisions} onDecide={decide} student={s}
              reasons={[
                `Not assigned in the latest generation`,
                `Preferred role: ${s.role}`,
                `Workload capacity ${s.workload}/10 — has room`,
                `Skills (${s.skills.slice(0, 3).join(", ") || "—"}) match open slots`,
              ]} />
          ))}
        </Group>

        <Group icon={Sparkles} title="Students With Rare Skills" subtitle="Underrepresented capabilities in the cohort" accent="primary">
          {rareStudents.length === 0 ? <Empty>No rare-skill signals detected.</Empty> : rareStudents.map(s => (
            <StudentRec key={`rs-${s.id}`} id={`rs-${s.id}`} decisions={decisions} onDecide={decide} student={s}
              reasons={[
                `Holds rare skills: ${s.skills.filter(k => rare.has(k)).join(", ")}`,
                `Best fit for projects needing ${s.skills.filter(k => rare.has(k))[0]}`,
                `Compatible role: ${s.role}`,
                `Spread across multiple teams may dilute value — concentrate`,
              ]} />
          ))}
        </Group>

        <Group icon={Activity} title="Overloaded Students" subtitle="Workload capacity ≥ 7/10" accent="warning">
          {overloaded.length === 0 ? <Empty>No overload signals — workload is healthy.</Empty> : overloaded.map(s => (
            <StudentRec key={`ov-${s.id}`} id={`ov-${s.id}`} decisions={decisions} onDecide={decide} student={s}
              reasons={[
                `Reported workload ${s.workload}/10 (above safe band)`,
                `Currently in role: ${s.role}`,
                `Recommend reducing concurrent assignments`,
                `Pair with lighter peer to redistribute load`,
              ]} />
          ))}
        </Group>

        <Group icon={Crown} title="Students Suitable For Leadership" subtitle="Balanced workload, broad skills" accent="navy">
          {leaders.map(s => (
            <StudentRec key={`ld-${s.id}`} id={`ld-${s.id}`} decisions={decisions} onDecide={decide} student={s}
              reasons={[
                s.role === "Team Leader" ? "Declared Team Leader preference" : `Strong fit despite preferring ${s.role}`,
                `Workload ${s.workload}/10 leaves bandwidth to coordinate`,
                `Skill breadth (${s.skills.length}) supports cross-functional decisions`,
                `Compatible availability window: ${s.availability}`,
              ]} />
          ))}
        </Group>
      </div>
    </>
  );
}

function Group({ icon: Icon, title, subtitle, accent, children }: { icon: any; title: string; subtitle: string; accent: "warning" | "success" | "info" | "primary" | "navy"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    warning: "bg-warning/15 text-foreground border-warning/30",
    success: "bg-success/10 text-success border-success/20",
    info: "bg-info/10 text-info border-info/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    navy: "bg-navy/10 text-navy border-navy/20",
  };
  return (
    <section className="surface-elevated p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`size-10 rounded-xl grid place-items-center border ${map[accent]}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="col-span-full text-sm text-muted-foreground py-6 text-center">{children}</div>;
}

function RecCard({ id, title, subtitle, reasons, cta, decisions, onDecide }: {
  id: string; title: string; subtitle: string; reasons: string[]; cta?: React.ReactNode;
  decisions: Record<string, Decision>; onDecide: (id: string, d: Decision) => void;
}) {
  const d = decisions[id];
  return (
    <div className={`relative p-4 rounded-lg border bg-card transition ${d === "accepted" ? "border-success/40 bg-success/5" : d === "dismissed" ? "border-border opacity-60" : "border-border hover:border-primary/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        {d && <Badge tone={d === "accepted" ? "success" : "default"}>{d}</Badge>}
      </div>
      <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Recommended because</div>
      <ul className="mt-1.5 space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="text-xs flex items-start gap-2">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" /> <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-2">
        {cta || <span />}
        {!d && (
          <div className="flex gap-1.5">
            <button onClick={() => onDecide(id, "accepted")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success text-white hover:bg-success/90">
              <Check className="size-3" /> Accept
            </button>
            <button onClick={() => onDecide(id, "dismissed")} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-border hover:bg-muted">
              <X className="size-3" /> Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentRec({ id, student, reasons, decisions, onDecide }: {
  id: string; student: Student; reasons: string[];
  decisions: Record<string, Decision>; onDecide: (id: string, d: Decision) => void;
}) {
  return (
    <RecCard id={id} decisions={decisions} onDecide={onDecide}
      title={student.name}
      subtitle={`${student.role} · workload ${student.workload}/10 · ${student.availability}`}
      reasons={reasons}
    />
  );
}
