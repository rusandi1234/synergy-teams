import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, SectionHeader, CompatibilityRing } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents, updateTeamStatus, type Team } from "@/lib/synergy";
import {
  ClipboardCheck, CheckCircle2, Clock, AlertTriangle, Send, Shuffle, XCircle,
  Sparkles, ArrowRight, User as UserIcon, Circle,
} from "lucide-react";
import { Route as AuthRoute } from "./route";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals · SYNERGY" },
      { name: "description", content: "Faculty approval workflow for generated teams." },
    ],
  }),
  component: ApprovalsPage,
});

type Stage = "Generated" | "Conflict Analysis" | "Faculty Review" | "Approved" | "Published";
const STAGES: Stage[] = ["Generated", "Conflict Analysis", "Faculty Review", "Approved", "Published"];

function stageIndex(status: Team["status"]) {
  if (status === "Published") return 4;
  if (status === "Approved") return 3;
  return 2; // Pending Review sits at Faculty Review
}

function hashTime(seed: string, offsetHours: number) {
  let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const base = Date.now() - (Math.abs(h) % 72) * 3600_000 - offsetHours * 3600_000;
  return new Date(base).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ApprovalsPage() {
  const { data: students = [] } = useStudents();
  const { teams } = useSynergyForStudents(students);
  const { user } = AuthRoute.useRouteContext();
  const facultyName = user.email?.split("@")[0]?.replace(/[._-]/g, " ") || "Faculty";

  const stats = useMemo(() => {
    const pending = teams.filter(t => t.status === "Pending Review").length;
    const approved = teams.filter(t => t.status === "Approved").length;
    const published = teams.filter(t => t.status === "Published").length;
    return { pending, approved, published, total: teams.length };
  }, [teams]);

  function act(t: Team, action: "approve" | "request" | "rebalance" | "reject" | "publish") {
    if (action === "approve") { updateTeamStatus(t.id, "Approved"); toast.success(`${t.name} approved`); }
    else if (action === "publish") { updateTeamStatus(t.id, "Published"); toast.success(`${t.name} published`); }
    else if (action === "reject") { updateTeamStatus(t.id, "Pending Review"); toast.message(`${t.name} returned for changes`); }
    else if (action === "request") { toast.message(`Requested changes from team lead of ${t.name}`); }
    else if (action === "rebalance") { toast.message(`${t.name} sent to Rebalancing queue`); }
  }

  return (
    <>
      <PageHeader
        title="Faculty Approval"
        subtitle="Walk every team through generation, conflict analysis, review, and publishing."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Teams" value={stats.total} icon={ClipboardCheck} accent="navy" />
        <MetricCard label="Pending Review" value={stats.pending} icon={Clock} accent="warning" />
        <MetricCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="success" />
        <MetricCard label="Published" value={stats.published} icon={Send} accent="primary" />
      </div>

      {!teams.length ? (
        <div className="surface-elevated p-12 text-center">
          <ClipboardCheck className="size-10 mx-auto text-muted-foreground/40 mb-3" />
          <div className="text-muted-foreground">
            No teams to approve yet. <Link to="/" className="text-primary font-medium">Generate teams</Link> first.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {teams.map(t => {
            const current = stageIndex(t.status);
            return (
              <div key={t.id} className="surface-elevated p-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-10 size-56 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold tracking-tight">{t.name}</h3>
                      <Badge tone={t.status === "Published" ? "success" : t.status === "Approved" ? "info" : "warning"}>{t.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.members.length} members · compatibility {t.compatibility}% · avg workload {t.avgWorkload}%
                    </div>
                  </div>
                  <CompatibilityRing value={t.compatibility} size={80} />
                </div>

                {/* Workflow Timeline (horizontal) */}
                <div className="relative mt-6">
                  <div className="grid grid-cols-5 gap-2">
                    {STAGES.map((s, i) => {
                      const done = i < current;
                      const active = i === current && t.status !== "Published";
                      return (
                        <div key={s} className="relative">
                          {i < 4 && (
                            <div className={`absolute top-4 left-1/2 right-0 h-0.5 -translate-y-1/2 ${i < current ? "bg-primary" : "bg-border"}`} style={{ width: "100%" }} />
                          )}
                          <div className="relative flex flex-col items-center text-center">
                            <span className={`size-8 rounded-full grid place-items-center ring-4 ring-background z-10 ${
                              done ? "bg-primary text-primary-foreground" :
                              active ? "bg-warning/20 text-warning border border-warning" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {done ? <CheckCircle2 className="size-4" /> : active ? <Clock className="size-4" /> : <Circle className="size-4" />}
                            </span>
                            <div className={`mt-2 text-[11px] font-semibold ${done || active ? "" : "text-muted-foreground"}`}>{s}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{hashTime(t.id + s, (4 - i) * 6)}</div>
                            <div className="text-[10px] text-muted-foreground italic truncate max-w-full">{
                              i === 0 ? "AI Engine"
                              : i === 1 ? "Synergy AI"
                              : i === 2 ? facultyName
                              : i === 3 ? facultyName
                              : "Faculty"
                            }</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative mt-6 flex flex-wrap gap-2">
                  <button onClick={() => act(t, "approve")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-success text-white hover:bg-success/90">
                    <CheckCircle2 className="size-3.5" /> Approve Team
                  </button>
                  <button onClick={() => act(t, "request")} className="btn-ghost text-xs">
                    <AlertTriangle className="size-3.5" /> Request Changes
                  </button>
                  <Link to="/rebalancing" onClick={() => act(t, "rebalance")} className="btn-ghost text-xs">
                    <Shuffle className="size-3.5" /> Send for Rebalancing
                  </Link>
                  <button onClick={() => act(t, "reject")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10">
                    <XCircle className="size-3.5" /> Reject Team
                  </button>
                  <button onClick={() => act(t, "publish")} className="btn-primary text-xs ml-auto">
                    <Send className="size-3.5" /> Publish Team
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
