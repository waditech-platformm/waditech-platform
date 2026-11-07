import { cn } from "@/lib/cn";
import { AlertCircle, CheckCircle2, Info, Inbox, TriangleAlert } from "lucide-react";

export function Container({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...p} />;
}
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] bg-card ring-1 ring-line shadow-[var(--shadow-card)]", className)} {...p} />;
}
export function SectionHeading({ eyebrow, title, subtitle, action, className, onDark }: {
  eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode; className?: string; onDark?: boolean;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn("mb-2 text-sm font-semibold", onDark ? "text-cyan-300" : "text-royal-600")}>{eyebrow}</p>}
        <h2 className={cn("wt-reveal text-3xl font-extrabold tracking-tight sm:text-4xl", onDark ? "text-white" : "text-navy-900")}>{title}</h2>
        {subtitle && <p className={cn("mt-3 text-lg", onDark ? "text-white/75" : "text-muted")}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
/** Page header for public pages: light, calm, large type (matches the homepage hero). */
export function PageHeader({ title, subtitle, eyebrow, children }: { title: string; subtitle?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    // translucent so the site-wide circuit layer (layout.tsx) runs behind the title too
    <div className="relative isolate overflow-hidden border-b border-line bg-paper/60">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_85%_0%,rgb(0_198_224/0.10),transparent_70%),radial-gradient(45%_70%_at_5%_0%,rgb(0_137_235/0.07),transparent_70%)]" />
      <Container className="relative py-12 sm:py-16 lg:py-20">
        {eyebrow && <p className="wt-rise mb-3 text-sm font-semibold text-royal-600">{eyebrow}</p>}
        <h1 className="wt-rise max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl" style={{ "--i": 1 } as React.CSSProperties}>{title}</h1>
        {subtitle && <p className="wt-rise mt-4 max-w-2xl text-lg leading-relaxed text-muted" style={{ "--i": 2 } as React.CSSProperties}>{subtitle}</p>}
        {children}
      </Container>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface text-muted ring-line",
  blue: "bg-royal-50 text-royal-700 ring-royal-100",
  cyan: "bg-cyan-100 text-cyan-ink ring-cyan-300/50",
  success: "bg-success-bg text-success ring-success/20",
  warning: "bg-warning-bg text-warning ring-warning/20",
  danger: "bg-danger-bg text-danger ring-danger/20",
  dark: "bg-deep-900 text-white ring-deep-900",
} as const;
export type Tone = keyof typeof badgeTones;
export function Badge({ tone = "neutral", className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", badgeTones[tone], className)} {...p} />;
}

export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "danger"; title?: string; children?: React.ReactNode; className?: string }) {
  const map = {
    info: { cls: "bg-royal-50 text-navy-900 ring-royal-100", Icon: Info },
    success: { cls: "bg-success-bg text-success ring-success/20", Icon: CheckCircle2 },
    warning: { cls: "bg-warning-bg text-warning ring-warning/20", Icon: TriangleAlert },
    danger: { cls: "bg-danger-bg text-danger ring-danger/20", Icon: AlertCircle },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl p-4 text-sm ring-1 ring-inset", map.cls, className)}>
      <map.Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{title && <p className="font-semibold">{title}</p>}{children}</div>
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-paper px-6 py-12 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-royal-50 text-royal-600">{icon ?? <Inbox className="size-6" aria-hidden />}</div>
      <p className="font-semibold text-navy-900">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, label, className }: { value: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div className="h-2 overflow-hidden rounded-full bg-royal-50" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-royal-600 to-cyan-500 transition-[width] duration-500" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-muted">{label}{icon}</div>
      <div className="mt-2 text-3xl font-extrabold text-navy-900 tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-subtle">{hint}</div>}
    </Card>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-paper ring-1 ring-line">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface text-start text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 text-start">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}
export function Td({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-top", className)} {...p} />;
}
export function DemoBadge({ show, label }: { show?: boolean; label: string }) {
  if (!show) return null;
  return <Badge tone="warning" className="uppercase tracking-wide">{label}</Badge>;
}
