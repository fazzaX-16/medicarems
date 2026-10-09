import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import { patientSchema } from "@/lib/schemas";
import { PageHeader, Field, TableWrap, th, td, selectClass, fieldErrors } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patients — MediCare HMS" },
      { name: "description", content: "Add, view, edit and delete patient records." },
      { property: "og:title", content: "Patients — MediCare HMS" },
      { property: "og:description", content: "Add, view, edit and delete patient records." },
    ],
  }),
  component: PatientsPage,
});

type Patient = {
  id: string; name: string; age: number; gender: string; phone: string;
  blood_group: string | null; address: string | null;
};
const empty = { name: "", age: "", gender: "", phone: "", blood_group: "", address: "" };

function PatientsPage() {
  const { data, isLoading, error } = useTable<Patient>("patients");
  const refresh = useRefresh();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);

  const list = (data ?? []).filter((p) =>
    (p.name + p.phone).toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => { setForm(empty); setEditingId(null); setErrors({}); setOpen(true); };
  const openEdit = (p: Patient) => {
    setForm({ ...p, age: String(p.age), blood_group: p.blood_group ?? "", address: p.address ?? "" });
    setEditingId(p.id); setErrors({}); setOpen(true);
  };

  async function save(): Promise<any> {
    const parsed = patientSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setSaving(true);
    const res = editingId
      ? await supabase.from("patients").update(parsed.data as any).eq("id", editingId)
      : await supabase.from("patients").insert(parsed.data as any);
    setSaving(false);
    if (res.error) return toast.error("Could not save: " + res.error.message);
    toast.success(editingId ? "Patient updated" : "Patient added");
    setOpen(false); refresh();
  }

  async function confirmDelete(): Promise<any> {
    if (!deleting) return;
    const { error } = await supabase.from("patients").delete().eq("id", deleting.id);
    if (error) return toast.error("Could not delete: " + error.message);
    toast.success("Patient deleted"); setDeleting(null); refresh();
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle="Manage patient records"
        action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Add Patient</Button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <TableWrap>
        <thead><tr>
          <th className={th}>Name</th><th className={th}>Age</th><th className={th}>Gender</th>
          <th className={th}>Phone</th><th className={th}>Blood</th><th className={`${th} text-right`}>Actions</th>
        </tr></thead>
        <tbody>
          {isLoading && <tr><td className={td} colSpan={6}>Loading…</td></tr>}
          {error && <tr><td className={`${td} text-destructive`} colSpan={6}>Failed to load: {error.message}</td></tr>}
          {!isLoading && list.length === 0 && <tr><td className={`${td} text-muted-foreground`} colSpan={6}>No patients found.</td></tr>}
          {list.map((p) => (
            <tr key={p.id} className="hover:bg-muted/50">
              <td className={`${td} font-medium`}>{p.name}</td><td className={td}>{p.age}</td>
              <td className={td}>{p.gender}</td><td className={td}>{p.phone}</td><td className={td}>{p.blood_group || "—"}</td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <Button size="icon" variant="ghost" aria-label="View" onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDeleting(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Patient" : "Add Patient"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Full name *" error={errors.name}><Input value={form.name} onChange={set("name")} /></Field></div>
            <Field label="Age *" error={errors.age}><Input type="number" value={form.age} onChange={set("age")} /></Field>
            <Field label="Gender *" error={errors.gender}>
              <select className={selectClass} value={form.gender} onChange={set("gender")}>
                <option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label="Phone *" error={errors.phone}><Input value={form.phone} onChange={set("phone")} placeholder="10 digits" /></Field>
            <Field label="Blood group">
              <select className={selectClass} value={form.blood_group} onChange={set("blood_group")}>
                <option value="">Unknown</option>
                {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Address" error={errors.address}><Input value={form.address} onChange={set("address")} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Patient Details</DialogTitle></DialogHeader>
          {viewing && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[["Name", viewing.name], ["Age", viewing.age], ["Gender", viewing.gender], ["Phone", viewing.phone],
                ["Blood group", viewing.blood_group || "—"], ["Address", viewing.address || "—"]].map(([k, v]) => (
                <div key={k as string}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete patient?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently removes <b>{deleting?.name}</b> and their appointments and bills.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
