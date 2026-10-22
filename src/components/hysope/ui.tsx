import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_CLS: Record<OrderStatus, string> = {
  en_cours: "bg-warning/20 text-warning-foreground",
  pret: "bg-success/15 text-success",
  retire: "bg-muted text-muted-foreground",
  a_livrer: "bg-info/15 text-info",
  livre: "bg-muted text-muted-foreground",
  annule: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CLS[status])}>{STATUS_LABEL[status]}</span>;
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "success" | "warning" | "destructive" | "info" }) {
  const cls = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  }[tone];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>{children}</span>;
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-soft", accent && "bg-brand text-primary-foreground")}>
      <div className={cn("text-sm", accent ? "opacity-80" : "text-muted-foreground")}>{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", accent ? "opacity-75" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function AdminOnly({ isAdmin, children }: { isAdmin: boolean | undefined; children: ReactNode }) {
  if (isAdmin === undefined) return null;
  if (!isAdmin) return <Empty>Cette page est réservée aux administrateurs.</Empty>;
  return <>{children}</>;
}
