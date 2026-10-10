import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Pill,
  Receipt,
  Menu,
  X,
  HeartPulse,
  Wrench,
  LogOut,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/appointments", label: "Appointments", icon: CalendarDays },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/equipment", label: "Equipment Management", icon: Wrench },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Brand />
        <button aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div
          className="no-print fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <Brand />
          <button className="lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-3 bottom-4 space-y-3">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
          <p className="px-2 text-xs opacity-60">BSc CS Mini-Project · Demo data</p>
        </div>
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <HeartPulse className="h-5 w-5" />
      </div>
      <span className="text-lg font-bold">MediCare HMS</span>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card shadow-sm ${className}`}>{children}</div>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </Panel>
  );
}

export const th = "border-b border-border bg-secondary px-4 py-3 text-xs font-semibold uppercase tracking-wide text-secondary-foreground";
export const td = "border-b border-border px-4 py-3";

/** Turns a zod error into { fieldName: "message" } for showing under inputs */
export function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export const inr = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Completed"
      ? "bg-success/15 text-success"
      : status === "Cancelled"
        ? "bg-destructive/15 text-destructive"
        : "bg-primary/15 text-primary";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
