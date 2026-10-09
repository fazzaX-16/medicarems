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

import { renewalBudget, dueState, equipmentSchema } from "./schemas";
describe("equipment", () => {
  const today = new Date("2026-10-09T00:00:00Z");
  it("marks past dates overdue and dates within 30 days as due soon", () => {
    expect(dueState("2026-10-01", today)).toBe("overdue");
    expect(dueState("2026-11-08", today)).toBe("soon");
    expect(dueState("2026-11-09", today)).toBe("ok");
  });
  it("renewal budget sums only overdue or due-soon items", () => {
    expect(renewalBudget([
      { renewal_due: "2026-10-01", renewal_cost: 1000 },
      { renewal_due: "2026-10-20", renewal_cost: 500 },
      { renewal_due: "2027-06-01", renewal_cost: 9999 },
    ], today)).toBe(1500);
  });
  it("rejects a negative renewal cost", () => {
    const r = equipmentSchema.safeParse({ name: "Bed", asset_id: "A1", category: "Furniture", quantity: 1, purchase_date: "2026-01-01", renewal_cost: -5, condition: "Good", status: "Operational" });
    expect(r.success).toBe(false);
  });
});
