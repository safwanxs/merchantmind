// Core domain types for MerchantMind.
// Kept deliberately small — every type here is used by real UI/logic.

export type CustomerSegment =
  | "vip"
  | "high_value"
  | "returning"
  | "new"
  | "at_risk"
  | "inactive";

export type ProductCategory =
  | "Electronics"
  | "Fashion"
  | "Home & Living"
  | "Accessories"
  | "Beauty"
  | "Sports"
  | "Books"
  | "Groceries";

export interface Customer {
  id: string;
  name: string;
  email: string;
  previousPurchases: number;
  lifetimeValue: number;
  lastPurchaseDate: string;
  customerSegment: CustomerSegment;
  averageOrderValue?: number;
  totalSpent?: number;
  lastActiveDays?: number;
}

export type TransactionStatus =
  | "completed"
  | "abandoned"
  | "payment_failed"
  | "pending";

export interface Transaction {
  id: string;
  customerId: string;
  productName: string;
  productCategory?: ProductCategory;
  cartValue: number;
  status: TransactionStatus;
  createdAt: string;
  paymentFailureReason?: string;
}

export type OpportunityProblem = "abandoned_cart" | "payment_failure";
export type RecommendedAction = "discount" | "payment_retry_suggestion" | "payment_reminder";
export type RiskLevel = "low" | "medium" | "high";
export type PriorityLevel = "critical" | "high" | "medium" | "low";

export interface OpportunityExplanation {
  whyCustomer: string[];
  whyAction: string;
  whyAmount: string;
  estimatedIncrementalRevenue: number;
}

export interface Opportunity {
  id: string;
  customerId: string;
  customerName: string;
  customerSegment?: CustomerSegment;
  productCategory?: ProductCategory;
  productName?: string;
  transactionId: string;
  problem: OpportunityProblem;
  cartValue: number;
  recommendedAction: RecommendedAction;
  recommendedDiscount: number;
  confidence: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  expectedRecovery: number;
  reasoning: string;
  explanation?: OpportunityExplanation;
  recommendationFactors: string[];
  riskLevel: RiskLevel;
}


export interface AnalysisResponse {
  summary: string;
  opportunities: Opportunity[];
  source: "ai" | "fallback";
}

// Guardrail Engine types (used from Phase 5 onward; declared now so the
// AnalysisResponse -> Guardrail -> Approval pipeline can be typed end-to-end
// as each phase is implemented).
export interface GuardrailCheck {
  name: string;
  passed: boolean;
  explanation: string;
}

export interface GuardrailResult {
  allowed: boolean;
  checks: GuardrailCheck[];
}

// Audit + payment types (wired starting Phase 6/7). Declared here so
// lib/types.ts remains the single source of truth for the whole app.
export type AuditActor = "AI_AGENT" | "SYSTEM" | "MERCHANT" | "RAZORPAY";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: AuditActor;
  actionType: string;
  status: string;
  description: string;
  metadata?: Record<string, unknown>;
}


export type PaymentActionStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "order_created"
  | "success"
  | "failed";

// Per-opportunity workflow status (Phase 6 onward). Tracked client-side
// alongside the opportunity, not stored on the Opportunity object itself,
// so a fresh analysis run never carries stale workflow state.
export type OpportunityWorkflowStatus =
  | "guardrail_review"
  | "blocked"
  | "pending_approval"
  | "rejected"
  | "processing_payment"
  | "payment_success"
  | "payment_failed";

export interface PaymentAction {
  id: string;
  opportunityId: string;
  status: PaymentActionStatus;
  orderId?: string;
  paymentId?: string;
  amount: number;
  createdAt: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
