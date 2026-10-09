import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Stethoscope, CalendarDays, IndianRupee, AlertTriangle } from "lucide-react";
import { useTable } from "@/lib/db";
import { PageHeader, Panel, inr, StatusBadge } from "@/components/AppLayout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediCare HMS" },
      { name: "description", content: "Overview of patients, doctors, appointments and revenue." },
      { property: "og:title", content: "Dashboard — MediCare HMS" },
      { property: "og:description", content: "Overview of patients, doctors, appointments and revenue." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const patients = useTable("patients");
  const doctors = useTable("doctors");
  const appts = useTable<any>("appointments", "*, patients(name), doctors(name)");
  const bills = useTable<any>("bills");
  const meds = useTable<any>("medicines");

  const revenue = (bills.data ?? []).reduce((s, b) => s + Number(b.total), 0);
  const lowStock = (meds.data ?? []).filter((m) => m.quantity < 20);

  const cards = [
    { label: "Total Patients", value: patients.data?.length, icon: Users, to: "/patients" },
    { label: "Doctors", value: doctors.data?.length, icon: Stethoscope, to: "/doctors" },
    { label: "Appointments", value: appts.data?.length, icon: CalendarDays, to: "/appointments" },
    { label: "Revenue", value: bills.data ? inr(revenue) : undefined, icon: IndianRupee, to: "/billing" },
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Welcome back! Here's today's hospital overview." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Panel className="flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value ?? "…"}</p>
              </div>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Recent Appointments</h2>
          <ul className="divide-y divide-border">
            {(appts.data ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{a.patients?.name}</p>
                  <p className="text-muted-foreground">
                    {a.doctors?.name} · {a.appointment_date} {a.appointment_time}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
            {appts.data?.length === 0 && <p className="text-sm text-muted-foreground">No appointments yet.</p>}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" /> Low Stock Medicines
          </h2>
          <ul className="space-y-2 text-sm">
            {lowStock.map((m) => (
              <li key={m.id} className="flex justify-between">
                <span>{m.name}</span>
                <span className="font-semibold text-destructive">{m.quantity} left</span>
              </li>
            ))}
            {meds.data && lowStock.length === 0 && <p className="text-muted-foreground">All stocked up.</p>}
          </ul>
        </Panel>
      </div>
    </>
  );
}

