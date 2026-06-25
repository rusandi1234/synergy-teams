import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader, Badge } from "@/components/AppLayout";
import { MetricCard, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import {
  FileCheck2, CheckCircle2, Clock, XCircle, Search, ExternalLink, Github, FolderOpen,
  BookOpen, Award, FileText, MessageSquare, ThumbsUp, ThumbsDown, HelpCircle,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/evidence")({
  head: () => ({
    meta: [
      { title: "Skill Evidence Review · SYNERGY" },
      { name: "description", content: "Verify optional skill evidence submitted by students." },
    ],
  }),
  component: EvidencePage,
});

type EvidenceType = "GitHub Repository" | "Portfolio" | "Previous Coursework" | "Certificates" | "Project Files";
type Status = "Verified" | "Pending" | "Rejected";

interface Evidence {
  id: string;
  studentId: string;
  studentName: string;
  role: string;
  skills: string[];
  type: EvidenceType;
  link: string;
  submittedAt: string;
  status: Status;
  comments: string;
}

const TYPES: EvidenceType[] = ["GitHub Repository", "Portfolio", "Previous Coursework", "Certificates", "Project Files"];
const STORE_KEY = "synergy-evidence-v1";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seedFromStudents(students: { id: string; name: string; role: string; skills: string[] }[]): Evidence[] {
  return students.slice(0, Math.min(students.length, 18)).map((s, i) => {
    const t = TYPES[hash(s.id + "t") % TYPES.length];
    const status: Status = (["Pending", "Verified", "Rejected", "Pending", "Pending", "Verified"] as Status[])[hash(s.id) % 6];
    const daysAgo = (hash(s.id + "d") % 30) + 1;
    const date = new Date(Date.now() - daysAgo * 86400_000).toISOString().slice(0, 10);
    const link =
      t === "GitHub Repository" ? `https://github.com/${s.name.toLowerCase().replace(/\s+/g, "-")}/capstone` :
      t === "Portfolio" ? `https://${s.name.toLowerCase().replace(/\s+/g, "")}.dev` :
      t === "Certificates" ? `https://credentials.edu/${1000 + i}` :
      t === "Previous Coursework" ? `https://lms.univ.edu/course/${200 + i}` :
      `https://drive.synergy.app/file/${s.id}`;
    return {
      id: `ev-${s.id}`, studentId: s.id, studentName: s.name, role: s.role, skills: s.skills,
      type: t, link, submittedAt: date, status, comments: "",
    };
  });
}

function loadStore(): Record<string, { status: Status; comments: string }> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveStore(s: Record<string, { status: Status; comments: string }>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

function typeIcon(t: EvidenceType) {
  return t === "GitHub Repository" ? Github
    : t === "Portfolio" ? FolderOpen
    : t === "Certificates" ? Award
    : t === "Previous Coursework" ? BookOpen
    : FileText;
}

function statusBadge(s: Status) {
  if (s === "Verified") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 text-success border border-success/30"><CheckCircle2 className="size-3" /> Verified</span>;
  if (s === "Pending") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/20 text-foreground border border-warning/40"><Clock className="size-3" /> Pending</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-destructive/15 text-destructive border border-destructive/30"><XCircle className="size-3" /> Rejected</span>;
}

function EvidencePage() {
  const { data: students = [] } = useStudents();
  const [overrides, setOverrides] = useState<Record<string, { status: Status; comments: string }>>({});
  useEffect(() => { setOverrides(loadStore()); }, []);

  const baseList = useMemo(() => seedFromStudents(students), [students]);
  const list: Evidence[] = useMemo(
    () => baseList.map(e => overrides[e.id] ? { ...e, status: overrides[e.id].status, comments: overrides[e.id].comments } : e),
    [baseList, overrides],
  );

  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | Status>("All");
  const [filterType, setFilterType] = useState<"All" | EvidenceType>("All");
  const [open, setOpen] = useState<Evidence | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => { if (open) setComment(open.comments || ""); }, [open]);

  const filtered = list.filter(e => {
    if (filterStatus !== "All" && e.status !== filterStatus) return false;
    if (filterType !== "All" && e.type !== filterType) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      e.studentName.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.skills.join(" ").toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q)
    );
  });

  const total = list.length;
  const verified = list.filter(e => e.status === "Verified").length;
  const pending = list.filter(e => e.status === "Pending").length;
  const rejected = list.filter(e => e.status === "Rejected").length;

  function update(id: string, status: Status, comments?: string) {
    const next = { ...overrides, [id]: { status, comments: comments ?? overrides[id]?.comments ?? "" } };
    setOverrides(next); saveStore(next);
  }

  function decide(action: "approve" | "reject" | "request") {
    if (!open) return;
    if (action === "approve") { update(open.id, "Verified", comment); toast.success(`Approved evidence from ${open.studentName}`); }
    else if (action === "reject") { update(open.id, "Rejected", comment); toast.success(`Rejected evidence from ${open.studentName}`); }
    else { update(open.id, "Pending", comment || "More information requested."); toast.message(`Requested more information from ${open.studentName}`); }
    setOpen(null);
  }

  return (
    <>
      <PageHeader
        title="Skill Evidence Review"
        subtitle="Verify optional evidence submitted by students to back up their declared skills."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Submitted" value={total} icon={FileCheck2} accent="navy" />
        <MetricCard label="Verified" value={verified} icon={CheckCircle2} accent="success" />
        <MetricCard label="Pending Review" value={pending} icon={Clock} accent="warning" />
        <MetricCard label="Rejected" value={rejected} icon={XCircle} accent="primary" hint="Needs follow-up" />
      </div>

      <div className="surface-elevated p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, role, skill, or evidence type…"
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="text-sm px-3 py-1.5 rounded-md border border-border bg-background">
          <option>All</option><option>Verified</option><option>Pending</option><option>Rejected</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value as any)}
          className="text-sm px-3 py-1.5 rounded-md border border-border bg-background">
          <option>All</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="surface-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Skills</th>
                <th className="px-4 py-3">Evidence</th>
                <th className="px-4 py-3">Link</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No evidence matches your filters.</td></tr>
              )}
              {filtered.map(e => {
                const TypeIcon = typeIcon(e.type);
                return (
                  <tr key={e.id} onClick={() => setOpen(e)}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.studentName}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone="primary">{e.role}</Badge></td>
                    <td className="px-4 py-3 max-w-[220px] truncate text-muted-foreground">{e.skills.slice(0, 3).join(", ")}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2"><TypeIcon className="size-4 text-primary" /> {e.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={e.link} target="_blank" rel="noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:underline">
                        Open <ExternalLink className="size-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{e.submittedAt}</td>
                    <td className="px-4 py-3">{statusBadge(e.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.studentName}</SheetTitle>
                <SheetDescription>Evidence review · {open.type}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <section>
                  <SectionHeader title="Student Information" subtitle="Profile snapshot" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Info label="Role" value={open.role} />
                    <Info label="Submitted" value={open.submittedAt} />
                    <Info label="Status" value={open.status} />
                    <Info label="Evidence Type" value={open.type} />
                  </div>
                </section>

                <section>
                  <SectionHeader title="Claimed Skills" />
                  <div className="flex flex-wrap gap-2">
                    {open.skills.map(s => (
                      <span key={s} className="px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                    ))}
                    {open.skills.length === 0 && <span className="text-xs text-muted-foreground">No declared skills.</span>}
                  </div>
                </section>

                <section>
                  <SectionHeader title="Evidence Preview" />
                  <a href={open.link} target="_blank" rel="noreferrer"
                    className="block p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                        {(() => { const I = typeIcon(open.type); return <I className="size-5" />; })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{open.type}</div>
                        <div className="text-xs text-muted-foreground truncate">{open.link}</div>
                      </div>
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </div>
                  </a>
                </section>

                <section>
                  <SectionHeader icon={MessageSquare} title="Faculty Comments" />
                  <textarea
                    value={comment} onChange={e => setComment(e.target.value)}
                    rows={4} placeholder="Add comments visible to the student…"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </section>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <button onClick={() => decide("approve")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-success text-white hover:bg-success/90">
                    <ThumbsUp className="size-4" /> Approve Evidence
                  </button>
                  <button onClick={() => decide("reject")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <ThumbsDown className="size-4" /> Reject Evidence
                  </button>
                  <button onClick={() => decide("request")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-border bg-warning/15 text-foreground hover:bg-warning/25">
                    <HelpCircle className="size-4" /> Request More Info
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
