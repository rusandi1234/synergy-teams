import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, SectionHeader, SeverityBadge, ScoreBar } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents, type Team, type Student } from "@/lib/synergy";
import {
  Shuffle, Users2, CheckCircle2, XCircle, Eye, AlertTriangle, Sparkles,
  UserMinus, Wrench, MessageSquareWarning, Activity, CalendarClock, ListChecks, ClipboardCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/rebalancing")({
  head: () => ({
    meta: [
      { title: "Rebalancing · SYNERGY" },
      { name: "description", content: "Mid-semester team rebalancing with AI replacement recommendations." },
    ],
  }),
  component: RebalancingPage,
});

type IssueType = "Student Withdrawal" | "Skill Gap" | "Poor Collaboration" | "High Workload" | "Schedule Conflict";
type Severity = "High" | "Medium" | "Low";

interface Issue {
  team: Team;
  type: IssueType;
  severity: Severity;
  reason: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Recommendation {
  id: string;
  teamId: string;
  student: Student;
  compatibility: number;
}

type Decision = "approved" | "rejected";

function hashScore(seed: string, lo = 70, hi = 96) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const range = hi - lo;
  return lo + Math.abs(h) % range;
}

function detectIssues(teams: Team[]): Issue[] {
  const issues: Issue[] = [];
  for (const t of teams) {
    if (t.members.length < 3) {
      issues.push({
        team: t, type: "Student Withdrawal", severity: "High",
        reason: `${t.name} dropped below minimum strength (${t.members.length} member${t.members.length === 1 ? "" : "s"}). A replacement is required to restore project velocity.`,
        icon: UserMinus,
      });
      continue;
    }
    const roles = new Set(t.members.map(m => m.role));
    const missing = ["Developer", "Designer", "QA"].filter(r => !roles.has(r));
    if (missing.length) {
      issues.push({
        team: t, type: "Skill Gap", severity: "High",
        reason: `${t.name} is missing critical role coverage: ${missing.join(", ")}. Deliverables are at risk without a domain specialist.`,
        icon: Wrench,
      });
      continue;
    }
    if (t.scores.workloadBalance < 55 || t.avgWorkload > 70) {
      issues.push({
        team: t, type: "High Workload", severity: "Medium",
        reason: `Average workload at ${t.avgWorkload}% with imbalance score ${t.scores.workloadBalance}%. Swap in a lighter peer to prevent burnout.`,
        icon: Activity,
      });
      continue;
    }
    if (t.scores.availability < 50) {
      issues.push({
        team: t, type: "Schedule Conflict", severity: "Medium",
        reason: `Members operate on disjoint schedules (availability alignment ${t.scores.availability}%). Sync windows are too narrow for sprint reviews.`,
        icon: CalendarClock,
      });
      continue;
    }
    if (t.compatibility < 70) {
      issues.push({
        team: t, type: "Poor Collaboration", severity: "Low",
        reason: `Overall compatibility at ${t.compatibility}% suggests friction. A culturally aligned addition can lift productivity.`,
        icon: MessageSquareWarning,
      });
    }
  }
  return issues;
}

function buildRecommendations(issues: Issue[], allStudents: Student[], teams: Team[]): Recommendation[] {
  const taken = new Set(teams.flatMap(t => t.members.map(m => m.id)));
  const pool = allStudents.filter(s => !taken.has(s.id));
  const recs: Recommendation[] = [];
  for (const issue of issues) {
    const { team } = issue;
    const teamRoles = new Set(team.members.map(m => m.role));
    let scored = pool.map(s => {
      const fillsGap = !teamRoles.has(s.role) ? 25 : 0;
      const lightLoad = Math.max(0, 30 - s.workload * 0.3);
      const base = hashScore(`${team.id}-${s.id}`, 60, 92);
      return { s, score: Math.min(99, base + fillsGap * 0.4 + lightLoad * 0.2) };
    });
    scored.sort((a, b) => b.score - a.score);
    for (const { s, score } of scored.slice(0, 2)) {
      recs.push({
        id: `${team.id}::${s.id}`,
        teamId: team.id,
        student: s,
        compatibility: Math.round(score),
      });
    }
  }
  return recs;
}

function RebalancingPage() {
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [profile, setProfile] = useState<Recommendation | null>(null);

  const issues = useMemo(() => detectIssues(teams), [teams]);
  const recommendations = useMemo(
    () => buildRecommendations(issues, students, teams),
    [issues, students, teams],
  );

  const approvedCount = Object.values(decisions).filter(d => d === "approved").length;
  const rejectedCount = Object.values(decisions).filter(d => d === "rejected").length;
  const pendingCount = recommendations.length - approvedCount - rejectedCount;

  const decide = (rec: Recommendation, decision: Decision) => {
    setDecisions(prev => ({ ...prev, [rec.id]: decision }));
    toast.success(
      decision === "approved"
        ? `Approved ${rec.student.name} → ${teams.find(t => t.id === rec.teamId)?.name}`
        : `Rejected recommendation for ${rec.student.name}`,
    );
  };

  return (
    <>
      <PageHeader
        title="Rebalancing"
        subtitle="Resolve mid-semester team issues with AI-recommended replacements."
        actions={<Badge tone="primary"><Shuffle className="size-3 mr-1 inline" /> Live monitor</Badge>}
      />

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Teams Needing Rebalancing" value={issues.length} icon={AlertTriangle} accent="warning" hint={issues.length ? "Action required" : "All teams stable"} />
        <MetricCard label="Recommended Replacements" value={recommendations.length} icon={Sparkles} accent="primary" hint="AI-generated" />
        <MetricCard label="Approved Changes" value={approvedCount} icon={CheckCircle2} accent="success" hint={`${rejectedCount} rejected`} />
        <MetricCard label="Pending Faculty Review" value={pendingCount} icon={ClipboardCheck} accent="info" hint="Awaiting decision" />
      </div>

      {!teams.length ? (
        <div className="surface-elevated p-12 text-center">
          <Users2 className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-muted-foreground">
            No teams to monitor. Generate teams on the{" "}
            <Link to="/" className="text-primary hover:underline font-medium">Faculty Dashboard</Link>{" "}
            to surface rebalancing candidates.
          </div>
        </div>
      ) : issues.length === 0 ? (
        <div className="surface-elevated p-12 text-center">
          <CheckCircle2 className="size-10 mx-auto text-success/60 mb-3" />
          <div className="font-semibold">All teams are healthy</div>
          <div className="text-sm text-muted-foreground mt-1">No rebalancing actions required at this time.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {issues.map(issue => {
            const teamRecs = recommendations.filter(r => r.teamId === issue.team.id);
            const Icon = issue.icon;
            return (
              <div key={issue.team.id} className="surface-elevated p-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                {/* ISSUE HEADER */}
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-bold tracking-tight">{issue.team.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {issue.team.members.length} current members · compatibility {issue.team.compatibility}%
                        </div>
                      </div>
                      <SeverityBadge severity={issue.severity} />
                      <Badge tone="warning">{issue.type}</Badge>
                    </div>
                  </div>
                </div>

                {/* CURRENT MEMBERS */}
                <div className="relative mt-5">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">Current Members</div>
                  <div className="flex flex-wrap gap-2">
                    {issue.team.members.map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background/60 text-xs">
                        <div className="size-6 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-[10px]">
                          {m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                        </div>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground">· {m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* REASON */}
                <div className="relative mt-4 p-3 rounded-lg bg-warning/10 border border-warning/25 text-sm">
                  <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-foreground/70 mb-1">
                    Reason for Rebalancing
                  </div>
                  <p className="leading-relaxed">{issue.reason}</p>
                </div>

                {/* RECOMMENDATIONS */}
                <div className="relative mt-6">
                  <SectionHeader
                    icon={Sparkles}
                    title="AI Recommended Replacements"
                    subtitle={`${teamRecs.length} candidate${teamRecs.length === 1 ? "" : "s"} ranked by predicted fit`}
                  />
                  {teamRecs.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4">No external candidates available — every student is already assigned.</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {teamRecs.map(rec => {
                        const decision = decisions[rec.id];
                        return (
                          <div key={rec.id} className={`rounded-xl border p-4 bg-card transition-all ${
                            decision === "approved" ? "border-success/40 bg-success/5" :
                            decision === "rejected" ? "border-destructive/30 bg-destructive/5 opacity-70" :
                            "border-border hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5"
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="size-9 rounded-full bg-gradient-to-br from-primary/25 to-navy/20 grid place-items-center text-xs font-bold shrink-0">
                                    {rec.student.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate">{rec.student.name}</div>
                                    <div className="text-xs text-muted-foreground">{rec.student.role}</div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold tabular-nums text-primary leading-none">{rec.compatibility}%</div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">Match</div>
                              </div>
                            </div>

                            <div className="mt-3">
                              <ScoreBar label="Compatibility Score" value={rec.compatibility} />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                              <InfoRow label="Availability" value={rec.student.availability} />
                              <InfoRow label="Preferred Role" value={rec.student.role} />
                              <InfoRow label="Workload" value={`${rec.student.workload}%`} />
                              <InfoRow label="Skills" value={`${rec.student.skills.length} listed`} />
                            </div>

                            <div className="mt-3">
                              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-1">Top Skills</div>
                              <div className="flex flex-wrap gap-1">
                                {rec.student.skills.slice(0, 4).map(s => (
                                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                                ))}
                                {rec.student.skills.length === 0 && <span className="text-[10px] text-muted-foreground">No skills listed</span>}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                disabled={!!decision}
                                onClick={() => decide(rec, "approved")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-success text-white hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                <CheckCircle2 className="size-3.5" /> Approve Replacement
                              </button>
                              <button
                                disabled={!!decision}
                                onClick={() => decide(rec, "rejected")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                <XCircle className="size-3.5" /> Reject
                              </button>
                              <button
                                onClick={() => setProfile(rec)}
                                className="btn-ghost text-xs"
                              >
                                <Eye className="size-3.5" /> View Full Profile
                              </button>
                              {decision && (
                                <Badge tone={decision === "approved" ? "success" : "danger"}>
                                  {decision === "approved" ? "Approved" : "Rejected"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PROFILE DIALOG */}
      <Dialog open={!!profile} onOpenChange={(o) => !o && setProfile(null)}>
        <DialogContent className="max-w-lg">
          {profile && (
            <>
              <DialogHeader>
                <DialogTitle>{profile.student.name}</DialogTitle>
                <DialogDescription>
                  Predicted {profile.compatibility}% compatibility with {teams.find(t => t.id === profile.teamId)?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Preferred Role" value={profile.student.role} />
                <Detail label="Availability" value={profile.student.availability} />
                <Detail label="Current Workload" value={`${profile.student.workload}%`} />
                <Detail label="Skill Count" value={String(profile.student.skills.length)} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">All Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.student.skills.length === 0 && <span className="text-xs text-muted-foreground">No skills listed</span>}
                  {profile.student.skills.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                  ))}
                </div>
              </div>
              <ScoreBar label="Predicted Compatibility" value={profile.compatibility} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}
