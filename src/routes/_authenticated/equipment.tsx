import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Wrench, CheckCircle2, CalendarClock, RefreshCcw, IndianRupee, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import {
  equipmentSchema, EQUIPMENT_CATEGORIES, EQUIPMENT_CONDITIONS, EQUIPMENT_STATUSES,
  dueState, daysUntil, renewalBudget,
} from "@/lib/schemas";
import { PageHeader, Field, Panel, TableWrap, th, td, fieldErrors, inr, selectClass } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Management — MediCare HMS" },
      { name: "description", content: "Track hospital equipment, maintenance schedules, warranties and renewal budgets." },
      { property: "og:title", content: "Equipment Management — MediCare HMS" },
      { property: "og:description", content: "Track hospital equipment, maintenance schedules, warranties and renewal budgets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EquipmentPage,
});

const empty = {
  name: "", asset_id: "", category: "", quantity: "1", purchase_date: "", warranty_expiry: "",
  last_maintenance: "", next_maintenance: "", renewal_due: "", renewal_cost: "", condition: "Good", status: "Operational",
};

function DueBadge({ date }: { date: string | null }) {
  const s = dueState(date);
  if (s === "none") return <span className="text-muted-foreground">—</span>;
  const d = daysUntil(date)!;
  const cls = s === "overdue" ? "bg-destructive/15 text-destructive" : s === "soon" ? "bg-warning/20 text-foreground" : "bg-success/15 text-success";
  const label = s === "overdue" ? `Overdue ${-d}d` : s === "soon" ? `Due in ${d}d` : "On track";
  return (
    <div className="space-y-1">
      <div className="text-xs">{date}</div>
      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "Operational" ? "bg-success/15 text-success"
    : status === "Under Maintenance" ? "bg-warning/20 text-foreground"
    : status === "Out of Service" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}

function EquipmentPage() {
  const { data, isLoading, error } = useTable<any>("equipment");
  const refresh = useRefresh();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [cond, setCond] = useState("");
  const [stat, setStat] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [errors, setErrors] = useState<any>({});

  const all = data ?? [];
  const q = search.toLowerCase();
  const list = all.filter((e) =>
    (e.name.toLowerCase().includes(q) || e.asset_id.toLowerCase().includes(q)) &&
    (!cat || e.category === cat) && (!cond || e.condition === cond) && (!stat || e.status === stat));

  const needsAttention = (s: string) => s === "overdue" || s === "soon";
  const maintDue = all.filter((e) => needsAttention(dueState(e.next_maintenance)));
  const renewDue = all.filter((e) => needsAttention(dueState(e.renewal_due)));
  const alerts = all.flatMap((e) => [
    { e, type: "Maintenance", date: e.next_maintenance },
    { e, type: "Warranty renewal", date: e.warranty_expiry },
    { e, type: "Replacement / renewal", date: e.renewal_due },
  ]).filter((a) => needsAttention(dueState(a.date)))
    .sort((a, b) => (daysUntil(a.date) ?? 0) - (daysUntil(b.date) ?? 0));

  const cards = [
    { label: "Total Equipment", value: all.reduce((s, e) => s + e.quantity, 0), sub: `${all.length} asset types`, icon: Wrench },
    { label: "Operational", value: all.filter((e) => e.status === "Operational").length, sub: "asset types", icon: CheckCircle2 },
    { label: "Maintenance Due Soon", value: maintDue.length, sub: "incl. overdue", icon: CalendarClock },
    { label: "Renewal Due Soon", value: renewDue.length, sub: "incl. overdue", icon: RefreshCcw },
    { label: "Renewal Budget", value: inr(renewalBudget(all)), sub: "overdue + next 30 days", icon: IndianRupee },
  ];

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  async function save(): Promise<any> {
    const parsed = equipmentSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({}); setSaving(true);
    const res = editingId
      ? await supabase.from("equipment").update(parsed.data as any).eq("id", editingId)
      : await supabase.from("equipment").insert(parsed.data as any);
    setSaving(false);
    if (res.error) {
      if (res.error.code === "23505") return setErrors({ asset_id: "This Asset ID already exists" });
      return toast.error("Could not save: " + res.error.message);
    }
    toast.success(editingId ? "Equipment updated" : "Equipment added"); setOpen(false); refresh();
  }

  async function remove(id: string, name: string): Promise<any> {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await supabase.from("equipment").delete().eq("id", id);
    if (error) return toast.error("Could not delete: " + error.message);
    toast.success("Equipment deleted"); refresh();
  }

  function edit(e: any) {
    const f: any = {};
    for (const k of Object.keys(empty)) f[k] = e[k] == null ? "" : String(e[k]);
    setForm(f); setEditingId(e.id); setErrors({}); setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Equipment Management"
        subtitle="Hospital equipment, maintenance and renewals"
        action={<Button onClick={() => { setForm(empty); setEditingId(null); setErrors({}); setOpen(true); }}><Plus className="h-4 w-4" /> Add Equipment</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <Panel key={label} className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="truncate text-xl font-bold">{isLoading ? "…" : value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-6 p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> Alerts — needs attention</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
          : alerts.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due in the next 30 days.</p>
          : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {alerts.map((a, i) => {
                const d = daysUntil(a.date)!;
                const overdue = d < 0;
                return (
                  <li key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${overdue ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/10"}`}>
                    <div><p className="font-medium">{a.e.name} <span className="text-muted-foreground">({a.e.asset_id})</span></p><p className="text-xs text-muted-foreground">{a.type} · {a.date}</p></div>
                    <span className={`whitespace-nowrap text-xs font-semibold ${overdue ? "text-destructive" : "text-foreground"}`}>{overdue ? `Overdue ${-d}d` : `In ${d}d`}</span>
                  </li>
                );
              })}
            </ul>
          )}
      </Panel>

      <div className="mt-6 mb-4 flex flex-col gap-3 md:flex-row">
        <div className="relative md:max-w-xs md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="bg-card pl-9" placeholder="Search name or asset ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select aria-label="Filter category" className={`${selectClass} md:w-44`} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>{EQUIPMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter condition" className={`${selectClass} md:w-40`} value={cond} onChange={(e) => setCond(e.target.value)}>
          <option value="">All conditions</option>{EQUIPMENT_CONDITIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter status" className={`${selectClass} md:w-48`} value={stat} onChange={(e) => setStat(e.target.value)}>
          <option value="">All statuses</option>{EQUIPMENT_STATUSES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <TableWrap>
        <thead><tr>
          <th className={th}>Equipment</th><th className={th}>Category</th><th className={th}>Qty</th>
          <th className={th}>Warranty</th><th className={th}>Next Maintenance</th><th className={th}>Renewal Due</th>
          <th className={th}>Renewal Cost</th><th className={th}>Condition</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
        </tr></thead>
        <tbody>
          {isLoading && <tr><td className={td} colSpan={10}><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading equipment…</td></tr>}
          {error && <tr><td className={`${td} text-destructive`} colSpan={10}>Could not load equipment: {(error as Error).message}</td></tr>}
          {!isLoading && !error && list.length === 0 && <tr><td className={`${td} text-muted-foreground`} colSpan={10}>No equipment found.</td></tr>}
          {list.map((e) => (
            <tr key={e.id} className="align-top hover:bg-muted/50">
              <td className={td}><p className="font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.asset_id} · bought {e.purchase_date}</p></td>
              <td className={td}>{e.category}</td><td className={td}>{e.quantity}</td>
              <td className={td}><DueBadge date={e.warranty_expiry} /></td>
              <td className={td}><DueBadge date={e.next_maintenance} />{e.last_maintenance && <p className="mt-1 text-xs text-muted-foreground">Last: {e.last_maintenance}</p>}</td>
              <td className={td}><DueBadge date={e.renewal_due} /></td>
              <td className={td}>{inr(e.renewal_cost)}</td>
              <td className={td}>{e.condition}</td>
              <td className={td}><StatusPill status={e.status} /></td>
              <td className={`${td} whitespace-nowrap text-right`}>
                <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => edit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(e.id, e.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit Equipment" : "Add Equipment"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Equipment name *" error={errors.name}><Input value={form.name} onChange={set("name")} /></Field>
            <Field label="Asset ID *" error={errors.asset_id}><Input value={form.asset_id} onChange={set("asset_id")} placeholder="EQ-1009" /></Field>
            <Field label="Category *" error={errors.category}>
              <select className={selectClass} value={form.category} onChange={set("category")}><option value="">Select…</option>{EQUIPMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Quantity *" error={errors.quantity}><Input type="number" value={form.quantity} onChange={set("quantity")} /></Field>
            <Field label="Purchase date *" error={errors.purchase_date}><Input type="date" value={form.purchase_date} onChange={set("purchase_date")} /></Field>
            <Field label="Warranty expiry" error={errors.warranty_expiry}><Input type="date" value={form.warranty_expiry} onChange={set("warranty_expiry")} /></Field>
            <Field label="Last maintenance" error={errors.last_maintenance}><Input type="date" value={form.last_maintenance} onChange={set("last_maintenance")} /></Field>
            <Field label="Next maintenance" error={errors.next_maintenance}><Input type="date" value={form.next_maintenance} onChange={set("next_maintenance")} /></Field>
            <Field label="Renewal / replacement due" error={errors.renewal_due}><Input type="date" value={form.renewal_due} onChange={set("renewal_due")} /></Field>
            <Field label="Estimated renewal cost (₹) *" error={errors.renewal_cost}><Input type="number" value={form.renewal_cost} onChange={set("renewal_cost")} /></Field>
            <Field label="Condition *" error={errors.condition}>
              <select className={selectClass} value={form.condition} onChange={set("condition")}>{EQUIPMENT_CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Status *" error={errors.status}>
              <select className={selectClass} value={form.status} onChange={set("status")}>{EQUIPMENT_STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
