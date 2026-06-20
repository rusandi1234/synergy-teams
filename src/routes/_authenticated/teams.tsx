import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { CompatibilityRing, ScoreBar } from "@/components/SynergyUI";
import { useSynergy, updateTeamStatus, approveAll, publishAll, runGeneration } from "@/lib/synergy";
import { useStudents } from "@/lib/useStudents";
import { Play, CheckCircle2, Send, Users2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({
    meta: [
      { title: "Team Review · SYNERGY" },
      { name: "description", content: "Review every generated team, inspect compatibility scores, and approve or publish assignments." },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { teams } = useSynergy();
  const { data: students = [] } = useStudents();

  return (
    <>
      <PageHeader
        title="Team Review"
        subtitle="Inspect generated teams, balance scores, and progress them through the approval workflow."
        actions={
          <>
            <button onClick={() => { runGeneration(students); toast.success("Teams regenerated"); }} className="btn-secondary">
              <Play className="size-4" /> Regenerate
            </button>
            <button onClick={() => { if (!teams.length) return; approveAll(); toast.success("All teams approved"); }} className="btn-secondary">
              <CheckCircle2 className="size-4" /> Approve All
            </button>
            <button onClick={() => { if (!teams.length) return; publishAll(); toast.success("Teams published"); }} className="btn-primary">
              <Send className="size-4" /> Publish All
            </button>
          </>
        }
      />

      {!teams.length ? (
        <div className="surface-elevated p-12 text-center">
          <Users2 className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-muted-foreground">
            No teams yet. Head to the Faculty Dashboard and click <span className="font-medium text-foreground">Generate Teams</span>.
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {teams.map(t => (
            <div key={t.id} className="surface-elevated p-5 hover:shadow-[var(--shadow-elegant)] transition-all relative overflow-hidden group">
              <div className="absolute -top-16 -right-16 size-40 rounded-full bg-primary/5 blur-3xl pointer-events-none group-hover:bg-primary/10 transition" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-bold tracking-tight">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.members.length} members · avg workload {t.avgWorkload}%
                  </div>
                  <div className="mt-2">
                    <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>{t.status}</Badge>
                  </div>
                </div>
                <CompatibilityRing value={t.compatibility} size={88} />
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
                <ScoreBar label="Skill Diversity" value={t.scores.skillDiversity} />
                <ScoreBar label="Availability" value={t.scores.availability} />
                <ScoreBar label="Role Coverage" value={t.scores.roleCompat} />
                <ScoreBar label="Workload Balance" value={t.scores.workloadBalance} />
              </div>

              <div className="relative mt-5 space-y-2">
                {t.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-2 bg-background/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-navy/20 grid place-items-center text-[11px] font-bold shrink-0">
                        {m.name.split(" ").map(p => p[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{m.skills.slice(0, 3).join(" · ")}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge tone={roleTone(m.role)}>{m.role}</Badge>
                      <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">{m.workload}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative mt-5 flex items-center justify-end gap-2">
                <button className="btn-ghost text-xs" onClick={() => updateTeamStatus(t.id, "Pending Review")}>Pending</button>
                <button className="btn-secondary text-xs" onClick={() => updateTeamStatus(t.id, "Approved")}>Approve</button>
                <button className="btn-primary text-xs" onClick={() => updateTeamStatus(t.id, "Published")}>Publish</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
