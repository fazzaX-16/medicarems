import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import { appointmentSchema } from "@/lib/schemas";
import { PageHeader, Field, TableWrap, th, td, selectClass, fieldErrors, StatusBadge } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — MediCare HMS" },
      { name: "description", content: "Book appointments and update their status." },
      { property: "og:title", content: "Appointments — MediCare HMS" },
      { property: "og:description", content: "Book appointments and update their status." },
    ],
  }),
  component: AppointmentsPage,
});

const empty = { patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "", reason: "" };
const STATUSES = ["Scheduled", "Completed", "Cancelled"];

function AppointmentsPage() {
  const { data, isLoading } = useTable<any>("appointments", "*, patients(name), doctors(name, specialization)");
  const patients = useTable<any>("patients");
  const doctors = useTable<any>("doctors");
  const refresh = useRefresh();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [errors, setErrors] = useState<any>({});

  const list = (data ?? []).filter(
    (a) =>
      (filter === "All" || a.status === filter) &&
      `${a.patients?.name} ${a.doctors?.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function book(): Promise<any> {
    const parsed = appointmentSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    const { error } = await supabase.from("appointments").insert(parsed.data as any);
    if (error) return toast.error("Could not book: " + error.message);
    toast.success("Appointment booked"); setOpen(false); refresh();
  }

  async function updateStatus(id: string, status: string): Promise<any> {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error("Could not update: " + error.message);
    toast.success(`Status changed to ${status}`); refresh();
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Book and track patient visits"
        action={<Button onClick={() => { setForm(empty); setErrors({}); setOpen(true); }}><Plus className="h-4 w-4" /> Book Appointment</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder="Search patient or doctor…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={`${selectClass} sm:w-44`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <TableWrap>
        <thead><tr>
          <th className={th}>Patient</th><th className={th}>Doctor</th><th className={th}>Date & Time</th>
          <th className={th}>Reason</th><th className={th}>Status</th><th className={th}>Change status</th>
        </tr></thead>
        <tbody>
          {isLoading && <tr><td className={td} colSpan={6}>Loading…</td></tr>}
          {!isLoading && list.length === 0 && <tr><td className={`${td} text-muted-foreground`} colSpan={6}>No appointments found.</td></tr>}
          {list.map((a) => (
            <tr key={a.id} className="hover:bg-muted/50">
              <td className={`${td} font-medium`}>{a.patients?.name}</td>
              <td className={td}>{a.doctors?.name}<div className="text-xs text-muted-foreground">{a.doctors?.specialization}</div></td>
              <td className={`${td} whitespace-nowrap`}>{a.appointment_date} · {a.appointment_time}</td>
              <td className={td}>{a.reason || "—"}</td>
              <td className={td}><StatusBadge status={a.status} /></td>
              <td className={td}>
                <select className={`${selectClass} w-36`} value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient *" error={errors.patient_id}>
              <select className={selectClass} value={form.patient_id} onChange={set("patient_id")}>
                <option value="">Select patient…</option>
                {(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Doctor *" error={errors.doctor_id}>
              <select className={selectClass} value={form.doctor_id} onChange={set("doctor_id")}>
                <option value="">Select doctor…</option>
                {(doctors.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
              </select>
            </Field>
            <Field label="Date *" error={errors.appointment_date}><Input type="date" value={form.appointment_date} onChange={set("appointment_date")} /></Field>
            <Field label="Time *" error={errors.appointment_time}><Input type="time" value={form.appointment_time} onChange={set("appointment_time")} /></Field>
            <div className="sm:col-span-2"><Field label="Reason" error={errors.reason}><Input value={form.reason} onChange={set("reason")} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={book}>Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
