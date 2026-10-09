import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import { doctorSchema } from "@/lib/schemas";
import { PageHeader, Field, Panel, fieldErrors, inr } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Doctors — MediCare HMS" },
      { name: "description", content: "Add and view hospital doctors and their specializations." },
      { property: "og:title", content: "Doctors — MediCare HMS" },
      { property: "og:description", content: "Add and view hospital doctors and their specializations." },
    ],
  }),
  component: DoctorsPage,
});

const empty = { name: "", specialization: "", phone: "", email: "", fee: "" };

function DoctorsPage() {
  const { data, isLoading } = useTable<any>("doctors");
  const refresh = useRefresh();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [errors, setErrors] = useState<any>({});

  const list = (data ?? []).filter((d) =>
    (d.name + d.specialization).toLowerCase().includes(search.toLowerCase()),
  );
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(): Promise<any> {
    const parsed = doctorSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    const { error } = await supabase.from("doctors").insert(parsed.data as any);
    if (error) return toast.error("Could not save: " + error.message);
    toast.success("Doctor added"); setOpen(false); refresh();
  }

  return (
    <>
      <PageHeader
        title="Doctors"
        subtitle="Hospital medical staff"
        action={<Button onClick={() => { setForm(empty); setErrors({}); setOpen(true); }}><Plus className="h-4 w-4" /> Add Doctor</Button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Search name or specialization…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && list.length === 0 && <p className="text-sm text-muted-foreground">No doctors found.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => (
          <Panel key={d.id} className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary">
                {d.name.replace("Dr. ", "").charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{d.name}</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{d.specialization}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {d.phone}</p>
              {d.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {d.email}</p>}
              <p className="pt-1 font-medium text-foreground">Consultation fee: {inr(d.fee)}</p>
            </div>
          </Panel>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Doctor</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" error={errors.name}><Input value={form.name} onChange={set("name")} placeholder="Dr. …" /></Field>
            <Field label="Specialization *" error={errors.specialization}><Input value={form.specialization} onChange={set("specialization")} placeholder="e.g. Cardiology" /></Field>
            <Field label="Phone *" error={errors.phone}><Input value={form.phone} onChange={set("phone")} placeholder="10 digits" /></Field>
            <Field label="Email" error={errors.email}><Input value={form.email} onChange={set("email")} /></Field>
            <Field label="Consultation fee (₹) *" error={errors.fee}><Input type="number" value={form.fee} onChange={set("fee")} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
