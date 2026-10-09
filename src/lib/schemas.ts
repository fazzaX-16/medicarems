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
