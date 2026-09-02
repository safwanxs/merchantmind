import type { GuardrailResult, Opportunity } from "./types";
import { formatINR } from "./calculations";

// ---------------------------------------------------------------------------
// Guardrail Engine (Phase 5). Every AI-recommended action is re-validated
// here, independently of whatever the analysis engine (AI or fallback)
// already clamped, before it can ever reach merchant approval. Nothing
// downstream should trust an opportunity that hasn't passed through this
// module.
// ---------------------------------------------------------------------------

export const GUARDRAIL_CONFIG = {
  MAX_DISCOUNT_PERCENT: 5, // percent
  MAX_DISCOUNT_AMOUNT: 500, // INR
  MIN_CONFIDENCE: 0.7,
  MAX_TOTAL_INCENTIVE: 5000, // INR, running total across approved actions
  MERCHANT_APPROVAL_REQUIRED: true,
} as const;

/**
 * Validates a single opportunity against every guardrail. `approvedIncentiveTotal`
 * is the running sum of `recommendedDiscount` across actions already approved
 * in this session — used to enforce the campaign-wide incentive budget.
 */
export function validateOpportunity(
  opportunity: Opportunity,
  approvedIncentiveTotal: number = 0
): GuardrailResult {
  const confidencePercent = Math.round(opportunity.confidence * 100);
  const minConfidencePercent = Math.round(GUARDRAIL_CONFIG.MIN_CONFIDENCE * 100);
  const confidencePassed = opportunity.confidence >= GUARDRAIL_CONFIG.MIN_CONFIDENCE;

  const discountPercentOfCart =
    opportunity.cartValue > 0
      ? (opportunity.recommendedDiscount / opportunity.cartValue) * 100
      : 0;
  const discountPercentPassed =
    discountPercentOfCart <= GUARDRAIL_CONFIG.MAX_DISCOUNT_PERCENT;

  const discountAmountPassed =
    opportunity.recommendedDiscount <= GUARDRAIL_CONFIG.MAX_DISCOUNT_AMOUNT;

  const projectedTotal = approvedIncentiveTotal + opportunity.recommendedDiscount;
  const budgetPassed = projectedTotal <= GUARDRAIL_CONFIG.MAX_TOTAL_INCENTIVE;

  const validOpportunityPassed = Boolean(opportunity.id && opportunity.customerId);
  const validTransactionPassed = Boolean(opportunity.transactionId && opportunity.cartValue > 0);
  const validActionTypePassed =
    opportunity.recommendedAction === "discount" ||
    opportunity.recommendedAction === "payment_retry_suggestion" ||
    opportunity.recommendedAction === "payment_reminder";

  const checks: GuardrailResult["checks"] = [
    {
      name: "Confidence threshold",
      passed: confidencePassed,
      explanation: confidencePassed
        ? `${confidencePercent}% confidence exceeds required ${minConfidencePercent}%.`
        : `${confidencePercent}% confidence is below the required ${minConfidencePercent}%.`,
    },
    {
      name: "Discount percentage",
      passed: discountPercentPassed,
      explanation: discountPercentPassed
        ? `${discountPercentOfCart.toFixed(1)}% is below maximum ${GUARDRAIL_CONFIG.MAX_DISCOUNT_PERCENT}%.`
        : `${discountPercentOfCart.toFixed(1)}% exceeds maximum ${GUARDRAIL_CONFIG.MAX_DISCOUNT_PERCENT}% of cart value.`,
    },
    {
      name: "Maximum discount amount",
      passed: discountAmountPassed,
      explanation: discountAmountPassed
        ? `${formatINR(opportunity.recommendedDiscount)} is below maximum ${formatINR(
            GUARDRAIL_CONFIG.MAX_DISCOUNT_AMOUNT
          )}.`
        : `${formatINR(opportunity.recommendedDiscount)} exceeds maximum ${formatINR(
            GUARDRAIL_CONFIG.MAX_DISCOUNT_AMOUNT
          )}.`,
    },
    {
      name: "Campaign budget",
      passed: budgetPassed,
      explanation: budgetPassed
        ? `Campaign incentive budget available (${formatINR(projectedTotal)} of ${formatINR(
            GUARDRAIL_CONFIG.MAX_TOTAL_INCENTIVE
          )} used).`
        : `Approving this action would use ${formatINR(projectedTotal)}, exceeding the ${formatINR(
            GUARDRAIL_CONFIG.MAX_TOTAL_INCENTIVE
          )} campaign budget.`,
    },
    {
      name: "Valid opportunity & customer",
      passed: validOpportunityPassed,
      explanation: validOpportunityPassed
        ? `Opportunity ${opportunity.id} matched with customer ${opportunity.customerName}.`
        : "Opportunity or customer record missing.",
    },
    {
      name: "Valid transaction",
      passed: validTransactionPassed,
      explanation: validTransactionPassed
        ? `Transaction ${opportunity.transactionId} verified with cart value ${formatINR(opportunity.cartValue)}.`
        : "Invalid or zero-value transaction.",
    },
    {
      name: "Valid action type",
      passed: validActionTypePassed,
      explanation: validActionTypePassed
        ? `Action '${opportunity.recommendedAction}' is supported by policy.`
        : `Unsupported action type: '${opportunity.recommendedAction}'.`,
    },
    {
      name: "Merchant approval required",
      passed: true,
      explanation: "🔒 Merchant sign-off required before execution. No automated payment execution allowed.",
    },
  ];

  const allowed = checks
    .filter((c) => c.name !== "Merchant approval required")
    .every((c) => c.passed);

  return { allowed, checks };
}

