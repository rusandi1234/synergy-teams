import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, AlertOctagon, AlertTriangle, Info, CheckCircle2, Circle } from "lucide-react";

/* ---------- Premium Stat Card with icon + trend ---------- */
export function MetricCard({
  label, value, hint, icon: Icon, accent = "primary", trend, trendValue,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "navy" | "success" | "warning" | "info";
  trend?: "up" | "down" | "flat";
  trendValue?: string;
}) {
  const accentMap = {
    primary: "from-primary/15 to-primary/0 text-primary",
    navy: "from-navy/15 to-navy/0 text-navy",
    success: "from-success/15 to-success/0 text-success",
    warning: "from-warning/20 to-warning/0 text-foreground",
    info: "from-info/15 to-info/0 text-info",
  } as const;
  const ringMap = {
    primary: "ring-primary/20",
    navy: "ring-navy/20",
    success: "ring-success/20",
    warning: "ring-warning/30",
    info: "ring-info/20",
  } as const;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendCls = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="relative overflow-hidden surface-elevated p-5 group transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]">
      <div className={`absolute -top-10 -right-10 size-32 rounded-full bg-gradient-to-br ${accentMap[accent]} blur-2xl opacity-70`} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <div className={`shrink-0 size-10 rounded-xl grid place-items-center bg-card ring-1 ${ringMap[accent]} ${accentMap[accent].split(" ").pop()}`}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className={`relative mt-3 inline-flex items-center gap-1 text-xs font-medium ${trendCls}`}>
          <TrendIcon className="size-3.5" /> {trendValue}
        </div>
      )}
    </div>
  );
}

/* ---------- Compatibility Ring (SVG radial) ---------- */
export function CompatibilityRing({ value, size = 96, label = "Match" }: { value: number; size?: number; label?: string }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  const color = value >= 80 ? "var(--color-success)" : value >= 60 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-none">
          <div className="text-xl font-bold tabular-nums">{value}<span className="text-xs font-medium text-muted-foreground">%</span></div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Score Bar (gradient) ---------- */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const cls = value >= 70 ? "from-success to-success/70" : value >= 45 ? "from-warning to-warning/70" : "from-destructive to-destructive/70";
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span><span className="tabular-nums text-foreground font-semibold">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${cls}`} style={{ width: `${value}%`, transition: "width 500ms ease" }} />
      </div>
    </div>
  );
}

/* ---------- Severity Badge ---------- */
export function SeverityBadge({ severity }: { severity: "High" | "Medium" | "Low" }) {
  const map = {
    High: { cls: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/30", Icon: AlertOctagon },
    Medium: { cls: "bg-warning/90 text-foreground", Icon: AlertTriangle },
    Low: { cls: "bg-info/90 text-white", Icon: Info },
  } as const;
  const { cls, Icon } = map[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="size-3" /> {severity}
    </span>
  );
}

/* ---------- Workflow Timeline (vertical, premium) ---------- */
export function WorkflowTimeline({ steps }: { steps: { label: string; description: string; done: boolean; active?: boolean }[] }) {
  return (
    <ol className="relative space-y-5">
      {steps.map((s, i) => {
        const Icon = s.done ? CheckCircle2 : Circle;
        const last = i === steps.length - 1;
        return (
          <li key={i} className="relative pl-10">
            {!last && (
              <span className={`absolute left-[15px] top-7 bottom-[-22px] w-px ${s.done ? "bg-primary/60" : "bg-border"}`} />
            )}
            <span className={`absolute left-0 top-0 size-8 rounded-full grid place-items-center ring-4 ring-background
              ${s.done ? "bg-primary text-primary-foreground" : s.active ? "bg-warning/20 text-warning border border-warning" : "bg-muted text-muted-foreground"}`}>
              <Icon className="size-4" />
            </span>
            <div className="flex items-baseline gap-2">
              <div className={`font-semibold text-sm ${s.done ? "" : "text-muted-foreground"}`}>{s.label}</div>
              {s.active && <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">In progress</span>}
              {s.done && <span className="text-[10px] font-semibold uppercase tracking-wider text-success">Complete</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Section Header ---------- */
export function SectionHeader({ icon: Icon, title, subtitle, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
