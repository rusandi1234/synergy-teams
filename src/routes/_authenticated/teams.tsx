import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { useSynergy, updateTeamStatus, approveAll, publishAll, runGeneration } from "@/lib/synergy";
import { useStudents } from "@/lib/useStudents";
import { Play, CheckCircle2, Send } from "lucide-react";

export const Route = createFileRoute("/teams")({
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
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          No teams yet. Head to the Faculty Dashboard and click <span className="font-medium">Generate Teams</span>.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {teams.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.members.length} members · avg workload {t.avgWorkload}%
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-semibold ${compatTone(t.compatibility)}`}>{t.compatibility}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Compatibility</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <ScoreBar label="Skill" value={t.scores.skillDiversity} />
                <ScoreBar label="Avail." value={t.scores.availability} />
                <ScoreBar label="Roles" value={t.scores.roleCompat} />
                <ScoreBar label="Balance" value={t.scores.workloadBalance} />
              </div>

              <div className="mt-4 space-y-2">
                {t.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.skills.slice(0, 3).join(" · ")}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={roleTone(m.role)}>{m.role}</Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">{m.workload}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>{t.status}</Badge>
                <div className="flex gap-2">
                  <button className="btn-ghost text-xs" onClick={() => updateTeamStatus(t.id, "Pending Review")}>Pending</button>
                  <button className="btn-secondary text-xs" onClick={() => updateTeamStatus(t.id, "Approved")}>Approve</button>
                  <button className="btn-primary text-xs" onClick={() => updateTeamStatus(t.id, "Published")}>Publish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${value > 70 ? "bg-success" : value > 45 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${value}%` }} />
      </div>
      <div className="text-xs mt-1 tabular-nums">{value}%</div>
    </div>
  );
}

function compatTone(v: number) {
  if (v >= 80) return "text-success";
  if (v >= 60) return "text-warning";
  return "text-destructive";
}

function roleTone(r: string): any {
  return r === "Developer" ? "primary"
    : r === "Designer" ? "info"
    : r === "QA" ? "warning"
    : r === "Business Analyst" ? "success"
    : r === "Team Leader" ? "navy" : "default";
}
