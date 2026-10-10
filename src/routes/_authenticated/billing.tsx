import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Printer, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { supabase, useTable, useRefresh } from "@/lib/db";
import { billItemSchema, calcBill, TAX_RATE } from "@/lib/schemas";
import { PageHeader, Field, Panel, TableWrap, th, td, selectClass, inr } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — MediCare HMS" },
      { name: "description", content: "Create patient bills, calculate totals and print invoices." },
      { property: "og:title", content: "Billing — MediCare HMS" },
      { property: "og:description", content: "Create patient bills, calculate totals and print invoices." },
    ],
  }),
  component: BillingPage,
});

type Item = { description: string; quantity: string; price: string };
const newItem = (): Item => ({ description: "", quantity: "1", price: "" });

function BillingPage() {
  const bills = useTable<any>("bills", "*, patients(name, phone)");
  const patients = useTable<any>("patients");
  const refresh = useRefresh();
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState<any>(null);

  const numeric = items.map((i) => ({ quantity: Number(i.quantity) || 0, price: Number(i.price) || 0 }));
  const totals = calcBill(numeric);

  const update = (idx: number, k: keyof Item, v: string) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  async function createBill(): Promise<any> {
    setError("");
    if (!patientId) return setError("Please select a patient.");
    const parsed = items.map((i) => billItemSchema.safeParse(i));
    const bad = parsed.findIndex((p) => !p.success);
    if (bad >= 0) {
      const p: any = parsed[bad];
      return setError(`Item ${bad + 1}: ${p.error.issues[0].message}`);
    }
    const clean = parsed.map((p) => (p as any).data);
    const t = calcBill(clean);
    const { error } = await supabase.from("bills").insert({ patient_id: patientId, items: clean, ...t } as any);
    if (error) return toast.error("Could not create bill: " + error.message);
    toast.success("Bill created");
    setPatientId(""); setItems([newItem()]); refresh();
  }

  function print(bill: any) {
    setPrinting(bill);
    setTimeout(() => window.print(), 100);
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Create bills and print invoices" />
      <div className="no-print grid gap-6 lg:grid-cols-5">
        <Panel className="p-5 lg:col-span-3">
          <h2 className="mb-4 font-semibold">New Bill</h2>
          <Field label="Patient *">
            <select className={selectClass} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select patient…</option>
              {(patients.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
              <span className="col-span-6">Item / Service</span><span className="col-span-2">Qty</span><span className="col-span-3">Price (₹)</span>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input className="col-span-6" placeholder="e.g. Consultation" value={it.description} onChange={(e) => update(idx, "description", e.target.value)} />
                <Input className="col-span-2" type="number" min={1} value={it.quantity} onChange={(e) => update(idx, "quantity", e.target.value)} />
                <Input className="col-span-3" type="number" min={0} value={it.price} onChange={(e) => update(idx, "price", e.target.value)} />
                <Button className="col-span-1" size="icon" variant="ghost" aria-label="Remove item" disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, newItem()])}><Plus className="h-4 w-4" /> Add item</Button>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
        </Panel>
        <Panel className="h-fit p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax ({TAX_RATE * 100}%)</span><span>{inr(totals.tax)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold"><span>Total</span><span className="text-primary">{inr(totals.total)}</span></div>
          </div>
          <Button className="mt-5 w-full" onClick={createBill}>Create Bill</Button>
        </Panel>
      </div>

      <h2 className="no-print mb-3 mt-8 font-semibold">Previous Bills</h2>
      <div className="no-print">
        <TableWrap>
          <thead><tr>
            <th className={th}>Date</th><th className={th}>Patient</th><th className={th}>Items</th>
            <th className={th}>Total</th><th className={`${th} text-right`}>Invoice</th>
          </tr></thead>
          <tbody>
            {bills.isLoading && <tr><td className={td} colSpan={5}>Loading…</td></tr>}
            {bills.data?.length === 0 && <tr><td className={`${td} text-muted-foreground`} colSpan={5}>No bills yet.</td></tr>}
            {(bills.data ?? []).map((b) => (
              <tr key={b.id} className="hover:bg-muted/50">
                <td className={td}>{new Date(b.created_at).toLocaleDateString("en-IN")}</td>
                <td className={`${td} font-medium`}>{b.patients?.name}</td>
                <td className={td}>{b.items.length}</td>
                <td className={`${td} font-semibold`}>{inr(b.total)}</td>
                <td className={`${td} text-right`}><Button size="sm" variant="outline" onClick={() => print(b)}><Printer className="h-4 w-4" /> Print</Button></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      {printing && <Invoice bill={printing} />}
    </>
  );
}

function Invoice({ bill }: { bill: any }) {
  return (
    <div className="hidden print:block">
      <div className="flex items-center justify-between border-b-2 border-primary pb-4">
        <div className="flex items-center gap-2 text-primary"><HeartPulse className="h-8 w-8" /><span className="text-2xl font-bold">MediCare HMS</span></div>
        <div className="text-right text-sm">
          <p className="font-semibold">INVOICE</p>
          <p>#{bill.id.slice(0, 8).toUpperCase()}</p>
          <p>{new Date(bill.created_at).toLocaleDateString("en-IN")}</p>
        </div>
      </div>
      <p className="mt-4 text-sm">Billed to: <b>{bill.patients?.name}</b> · {bill.patients?.phone}</p>
      <table className="mt-4 w-full text-left text-sm">
        <thead><tr className="border-b border-border"><th className="py-2">Item</th><th>Qty</th><th>Price</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {bill.items.map((i: any, idx: number) => (
            <tr key={idx} className="border-b border-border">
              <td className="py-2">{i.description}</td><td>{i.quantity}</td><td>{inr(i.price)}</td><td className="text-right">{inr(i.quantity * i.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{inr(bill.subtotal)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>{inr(bill.tax)}</span></div>
        <div className="flex justify-between border-t border-border pt-1 text-base font-bold"><span>Total</span><span>{inr(bill.total)}</span></div>
      </div>
      <p className="mt-10 text-center text-xs text-muted-foreground">Thank you for choosing MediCare. This is a computer-generated invoice (demo).</p>
    </div>
  );
}
