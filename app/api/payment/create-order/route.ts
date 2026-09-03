import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { getTrustedOpportunityById } from "@/lib/ai";
import { validateOpportunity } from "@/lib/guardrails";
import { getApprovedIncentiveTotal, isOpportunityCompleted } from "@/lib/budget";
import type { ApiResponse } from "@/lib/types";

interface CreateOrderRequestBody {
  opportunityId?: unknown;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number; // rupees
  currency: string;
  keyId: string;
  opportunityId: string;
}

export async function POST(request: Request) {
  let body: CreateOrderRequestBody;
  try {
    body = await request.json();
  } catch {
    const failure: ApiResponse<never> = { success: false, error: "Invalid request body." };
    return NextResponse.json(failure, { status: 400 });
  }

  const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : "";

  if (!opportunityId) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "opportunityId is required.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Duplicate Execution Guard: Refuse if payment is already recorded for this opportunity
  if (isOpportunityCompleted(opportunityId)) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Payment already completed for this opportunity. Duplicate execution rejected.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Look up trusted server-side opportunity & recalculate financial values
  const opportunity = getTrustedOpportunityById(opportunityId);
  if (!opportunity) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Opportunity not found or untrusted.",
    };
    return NextResponse.json(failure, { status: 404 });
  }

  // Re-run guardrails server-side using server-persisted budget total
  const approvedIncentiveTotal = getApprovedIncentiveTotal();
  const guardrailResult = validateOpportunity(opportunity, approvedIncentiveTotal);
  if (!guardrailResult.allowed) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Opportunity blocked by server-side financial guardrails.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Server determines the exact final amount
  const finalAmount = opportunity.expectedRecovery;

  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Razorpay is not configured on the server.",
    };
    return NextResponse.json(failure, { status: 500 });
  }

  try {
    const client = getRazorpayClient();

    // Server-side only — RAZORPAY_KEY_SECRET never leaves lib/razorpay.ts.
    const order = await client.orders.create({
      amount: Math.round(finalAmount * 100), // paise
      currency: "INR",
      receipt: `mm_${opportunityId}_${Date.now()}`,
      notes: { opportunityId },
    });

    const result: CreateOrderResult = {
      orderId: order.id,
      amount: finalAmount,
      currency: "INR",
      keyId,
      opportunityId,
    };

    const success: ApiResponse<CreateOrderResult> = { success: true, data: result };
    return NextResponse.json(success);
  } catch (error) {
    console.error("create-order error:", error);
    const failure: ApiResponse<never> = {
      success: false,
      error: "Could not create Razorpay order. Please try again.",
    };
    return NextResponse.json(failure, { status: 502 });
  }
}

