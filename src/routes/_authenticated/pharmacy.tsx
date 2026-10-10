import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import { medicineSchema } from "@/lib/schemas";
import { PageHeader, Field, TableWrap, th, td, fieldErrors, inr } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "Pharmacy — MediCare HMS" },
      { name: "description", content: "Manage medicine stock quantities and expiry dates." },
      { property: "og:title", content: "Pharmacy — MediCare HMS" },
      { property: "og:description", content: "Manage medicine stock quantities and expiry dates." },
    ],
  }),
  component: PharmacyPage,
});

const empty = { name: "", quantity: "", price: "", expiry_date: "" };

function stockStatus(m: { quantity: number; expiry_date: string }) {
  const days = (new Date(m.expiry_date).getTime() - Date.now()) / 86400000;
  if (days < 0) return { label: "Expired", cls: "bg-destructive/15 text-destructive" };
  if (days < 30) return { label: "Expiring soon", cls: "bg-warning/20 text-foreground" };
  if (m.quantity < 20) return { label: "Low stock", cls: "bg-warning/20 text-foreground" };
  return { label: "OK", cls: "bg-success/15 text-success" };
}

function PharmacyPage() {
  const { data, isLoading } = useTable<any>("medicines");
  const refresh = useRefresh();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [errors, setErrors] = useState<any>({});

  const list = (data ?? []).filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(): Promise<any> {
    const parsed = medicineSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    const res = editingId
      ? await supabase.from("medicines").update(parsed.data as any).eq("id", editingId)
      : await supabase.from("medicines").insert(parsed.data as any);
    if (res.error) return toast.error("Could not save: " + res.error.message);
    toast.success(editingId ? "Medicine updated" : "Medicine added"); setOpen(false); refresh();
  }

  async function remove(id: string, name: string): Promise<any> {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("medicines").delete().eq("id", id);
    if (error) return toast.error("Could not delete: " + error.message);
    toast.success("Medicine deleted"); refresh();
  }

  return (
    <>
      <PageHeader
        title="Pharmacy"
        subtitle="Medicine inventory"
        action={<Button onClick={() => { setForm(empty); setEditingId(null); setErrors({}); setOpen(true); }}><Plus className="h-4 w-4" /> Add Medicine</Button>}
      />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="bg-card pl-9" placeholder="Search medicine…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <TableWrap>
        <thead><tr>
          <th className={th}>Medicine</th><th className={th}>Stock</th><th className={th}>Price</th>
          <th className={th}>Expiry</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
        </tr></thead>
        <tbody>
          {isLoading && <tr><td className={td} colSpan={6}>Loading…</td></tr>}
          {!isLoading && list.length === 0 && <tr><td className={`${td} text-muted-foreground`} colSpan={6}>No medicines found.</td></tr>}
          {list.map((m) => {
            const s = stockStatus(m);
            return (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className={`${td} font-medium`}>{m.name}</td><td className={td}>{m.quantity}</td>
                <td className={td}>{inr(m.price)}</td><td className={td}>{m.expiry_date}</td>
                <td className={td}><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span></td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setForm({ ...m, quantity: String(m.quantity), price: String(m.price) }); setEditingId(m.id); setErrors({}); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(m.id, m.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit Medicine" : "Add Medicine"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Medicine name *" error={errors.name}><Input value={form.name} onChange={set("name")} /></Field></div>
            <Field label="Stock quantity *" error={errors.quantity}><Input type="number" value={form.quantity} onChange={set("quantity")} /></Field>
            <Field label="Unit price (₹) *" error={errors.price}><Input type="number" value={form.price} onChange={set("price")} /></Field>
            <Field label="Expiry date *" error={errors.expiry_date}><Input type="date" value={form.expiry_date} onChange={set("expiry_date")} /></Field>
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
