import { z } from "zod";

// Empty text boxes become undefined so "required" errors show instead of 0
const num = (label: string) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v),
    z.coerce.number({ required_error: `${label} is required`, invalid_type_error: `${label} must be a number` }));

// Validation rules for every form. Shared so they are easy to find and test.
const phone = z.string().trim().regex(/^\d{10}$/, "Phone must be exactly 10 digits");

export const patientSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  age: num("Age").pipe(z.number().int("Age must be a whole number").min(0, "Age cannot be negative").max(120, "Age must be 120 or less")),
  gender: z.enum(["Male", "Female", "Other"], { errorMap: () => ({ message: "Please select a gender" }) }),
  phone,
  blood_group: z.string().optional(),
  address: z.string().trim().max(200, "Address is too long").optional(),
});

export const doctorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  specialization: z.string().trim().min(2, "Please enter a specialization").max(60),
  phone,
  email: z.string().trim().email("Enter a valid email").max(255).or(z.literal("")),
  fee: num("Fee").pipe(z.number().min(0, "Fee cannot be negative")),
});

export const appointmentSchema = z.object({
  patient_id: z.string().uuid("Please select a patient"),
  doctor_id: z.string().uuid("Please select a doctor"),
  appointment_date: z.string().min(1, "Please choose a date"),
  appointment_time: z.string().min(1, "Please choose a time"),
  reason: z.string().trim().max(200, "Reason is too long").optional(),
});

export const medicineSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required").max(100),
  quantity: num("Quantity").pipe(z.number().int("Whole numbers only").min(0, "Quantity cannot be negative")),
  price: num("Price").pipe(z.number().min(0, "Price cannot be negative")),
  expiry_date: z.string().min(1, "Please choose an expiry date"),
});

export const billItemSchema = z.object({
  description: z.string().trim().min(1, "Item name required"),
  quantity: z.coerce.number().int().min(1, "Qty must be at least 1"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
});

export const TAX_RATE = 0.05; // 5% tax on bills

export function calcBill(items: { quantity: number; price: number }[]) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  return { subtotal, tax, total: subtotal + tax };
}

// ---------- Equipment ----------
export const EQUIPMENT_CATEGORIES = ["Monitoring", "Diagnostic", "Respiratory", "Mobility", "Furniture", "Emergency", "Therapy", "Other"] as const;
export const EQUIPMENT_CONDITIONS = ["Excellent", "Good", "Fair", "Poor"] as const;
export const EQUIPMENT_STATUSES = ["Operational", "Under Maintenance", "Out of Service", "Retired"] as const;
export const DUE_SOON_DAYS = 30; // "due soon" window

const optDate = z.string().optional().transform((v) => (v ? v : null));

export const equipmentSchema = z.object({
  name: z.string().trim().min(2, "Equipment name is required").max(100),
  asset_id: z.string().trim().min(1, "Asset ID is required").max(30, "Asset ID is too long"),
  category: z.enum(EQUIPMENT_CATEGORIES, { errorMap: () => ({ message: "Please select a category" }) }),
  quantity: num("Quantity").pipe(z.number().int("Whole numbers only").min(1, "Quantity must be at least 1")),
  purchase_date: z.string().min(1, "Please choose a purchase date"),
  warranty_expiry: optDate,
  last_maintenance: optDate,
  next_maintenance: optDate,
  renewal_due: optDate,
  renewal_cost: num("Renewal cost").pipe(z.number().min(0, "Cost cannot be negative").max(100000000, "Cost is too large")),
  condition: z.enum(EQUIPMENT_CONDITIONS, { errorMap: () => ({ message: "Please select a condition" }) }),
  status: z.enum(EQUIPMENT_STATUSES, { errorMap: () => ({ message: "Please select a status" }) }),
});

/** Days from today until a date (negative = overdue). null if no date. */
export function daysUntil(date: string | null | undefined, today = new Date()) {
  if (!date) return null;
  const t = new Date(today.toISOString().slice(0, 10)).getTime();
  return Math.round((new Date(date).getTime() - t) / 86400000);
}

export function dueState(date: string | null | undefined, today = new Date()): "overdue" | "soon" | "ok" | "none" {
  const d = daysUntil(date, today);
  if (d === null) return "none";
  if (d < 0) return "overdue";
  if (d <= DUE_SOON_DAYS) return "soon";
  return "ok";
}

/** Renewal budget = sum of renewal costs for items whose renewal is overdue or due within the window */
export function renewalBudget(items: { renewal_due: string | null; renewal_cost: number }[], today = new Date()) {
  return items
    .filter((i) => ["overdue", "soon"].includes(dueState(i.renewal_due, today)))
    .reduce((s, i) => s + Number(i.renewal_cost), 0);
}
