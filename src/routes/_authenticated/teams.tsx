import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { CompatibilityRing, ScoreBar } from "@/components/SynergyUI";
import {
  useSynergyForStudents, updateTeamStatus, approveAll, publishAll, runGeneration,
  rebalanceTeam, renameTeam, deleteTeam, type Team,
} from "@/lib/synergy";
import { useStudents } from "@/lib/useStudents";
import { Play, CheckCircle2, Send, Users2, Eye, Pencil, Shuffle, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);

  const [detail, setDetail] = useState<Team | null>(null);
  const [editing, setEditing] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);

  const openEdit = (t: Team) => { setEditing(t); setEditName(t.name); };
  const saveEdit = () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name) return toast.error("Team name cannot be empty");
    renameTeam(editing.id, name);
    toast.success("Team renamed");
    setEditing(null);
  };

  const onRebalance = (t: Team) => {
    const r = rebalanceTeam(t.id);
    r.ok ? toast.success(r.message) : toast.message(r.message);
    if (detail) setDetail(prev => prev && prev.id === t.id ? (teams.find(x => x.id === t.id) ?? prev) : prev);
  };

  // Keep `detail` in sync if the underlying team mutated
  const liveDetail = detail ? teams.find(t => t.id === detail.id) ?? null : null;

  return (
    <>
      <PageHeader
        title="Team Review"
        subtitle="Inspect generated teams, balance scores, and progress them through the approval workflow."
        actions={
          <>
            <button onClick={() => { if (!students.length) return toast.error("No students loaded"); runGeneration(students); toast.success("Teams regenerated"); }} className="btn-secondary">
              <Play className="size-4" /> Regenerate
            </button>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); approveAll(); toast.success("All teams approved"); }} className="btn-secondary">
              <CheckCircle2 className="size-4" /> Approve All
            </button>
            <button onClick={() => { if (!teams.length) return toast.error("Generate teams first"); setConfirmPublish(true); }} className="btn-primary">
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
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>{t.status}</Badge>
                    {t.members.length < 2 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        <AlertTriangle className="size-3" /> Under-staffed
                      </span>
                    )}
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

              <div className="relative mt-5 flex flex-wrap items-center justify-end gap-2">
                <button className="btn-ghost text-xs" onClick={() => setDetail(t)}><Eye className="size-3.5" /> View Details</button>
                <button className="btn-ghost text-xs" onClick={() => openEdit(t)}><Pencil className="size-3.5" /> Edit Team</button>
                <button className="btn-ghost text-xs" onClick={() => onRebalance(t)}><Shuffle className="size-3.5" /> Rebalance</button>
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition"
                  onClick={() => setConfirmDelete(t)}
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
                <button className="btn-secondary text-xs" onClick={() => { updateTeamStatus(t.id, "Approved"); toast.success(`${t.name} approved`); }}>Approve</button>
                <button className="btn-primary text-xs" onClick={() => { updateTeamStatus(t.id, "Published"); toast.success(`${t.name} published`); }}>Publish</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!liveDetail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          {liveDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{liveDetail.name}</DialogTitle>
                <DialogDescription>
                  {liveDetail.members.length} members · compatibility {liveDetail.compatibility}% · avg workload {liveDetail.avgWorkload}%
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <ScoreBar label="Skill Diversity" value={liveDetail.scores.skillDiversity} />
                <ScoreBar label="Availability" value={liveDetail.scores.availability} />
                <ScoreBar label="Role Coverage" value={liveDetail.scores.roleCompat} />
                <ScoreBar label="Workload Balance" value={liveDetail.scores.workloadBalance} />
              </div>
              <div className="mt-2 space-y-1.5 max-h-72 overflow-auto">
                {liveDetail.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-background/60 text-sm">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.skills.join(", ") || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={roleTone(m.role)}>{m.role}</Badge>
                      <span className="text-xs tabular-nums">{m.workload}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter className="gap-2">
                <button className="btn-secondary text-sm" onClick={() => onRebalance(liveDetail)}>
                  <Shuffle className="size-4" /> Rebalance
                </button>
                <button className="btn-primary text-sm" onClick={() => { updateTeamStatus(liveDetail.id, "Published"); toast.success("Team published"); setDetail(null); }}>
                  <Send className="size-4" /> Publish
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Rename this team. Members are managed via Rebalance or Regenerate.</DialogDescription>
          </DialogHeader>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Team Name</span>
            <input
              value={editName} onChange={e => setEditName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <DialogFooter className="gap-2">
            <button className="btn-ghost text-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary text-sm" onClick={saveEdit}>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish All confirm */}
      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish all teams?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark every team as Published and is visible to students immediately. You can regenerate to reset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { publishAll(); toast.success("All teams published"); }}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
