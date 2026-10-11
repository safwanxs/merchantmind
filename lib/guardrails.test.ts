import { describe, expect, it } from "vitest";
import { validateOpportunity } from "./guardrails";
import type { Opportunity } from "./types";

const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "opp_txn_1", customerId: "cust_1", customerName: "Test", transactionId: "txn_1", problem: "abandoned_cart", cartValue: 10000,
  recommendedAction: "discount", recommendedDiscount: 100, confidence: 0.7, priorityScore: 50, priorityLevel: "medium", expectedRecovery: 6900,
  reasoning: "test", recommendationFactors: [], riskLevel: "low", ...overrides,
});

describe("guardrails", () => {
  it.each([[0.69, false], [0.7, true]])("confidence boundary %s", (confidence, allowed) => expect(validateOpportunity(opportunity({ confidence })).allowed).toBe(allowed));
  it.each([[500, true], [501, false]])("discount amount boundary %s", (discount, allowed) => expect(validateOpportunity(opportunity({ recommendedDiscount: discount, cartValue: 20000 })).allowed).toBe(allowed));
  it.each([[5000, true], [5001, false]])("session budget boundary %s", (total, allowed) => expect(validateOpportunity(opportunity({ recommendedDiscount: 100 }), total - 100).allowed).toBe(allowed));
  it("rejects unknown IDs and actions", () => {
    const result = validateOpportunity(opportunity({ id: "", recommendedAction: "unknown" as Opportunity["recommendedAction"] }));
    expect(result.allowed).toBe(false);
    expect(result.checks.filter((check) => !check.passed).map((check) => check.name)).toEqual(expect.arrayContaining(["Valid opportunity & customer", "Valid action type"]));
  });
});
