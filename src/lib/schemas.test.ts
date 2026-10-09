import { describe, it, expect } from "vitest";
import { calcBill, patientSchema } from "./schemas";

describe("billing", () => {
  it("adds 5% tax to the subtotal", () => {
    expect(calcBill([{ quantity: 2, price: 500 }, { quantity: 10, price: 2 }])).toEqual({
      subtotal: 1020,
      tax: 51,
      total: 1071,
    });
  });
});

describe("patient validation", () => {
  it("rejects a phone number that is not 10 digits", () => {
    const r = patientSchema.safeParse({ name: "Test", age: 20, gender: "Male", phone: "12345" });
    expect(r.success).toBe(false);
  });
});
