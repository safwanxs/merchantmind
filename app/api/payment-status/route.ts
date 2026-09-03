import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getTrustedOpportunityById } from "@/lib/ai";
import { recordCompletedOpportunity } from "@/lib/budget";
import type { ApiResponse } from "@/lib/types";

interface VerifyRequestBody {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
  opportunityId?: unknown;
}

export interface PaymentVerificationResult {
  paymentId: string;
  orderId: string;
  timestamp: string;
  amount: number;
  actionId: string;
}

/**
 * Verifies the Razorpay payment signature server-side using
 * RAZORPAY_KEY_SECRET. The client's reported success is never trusted on
 * its own — this HMAC check and server-side amount check is the only source of truth.
 */
function isValidSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: Request) {
  let body: VerifyRequestBody;
  try {
    body = await request.json();
  } catch {
    const failure: ApiResponse<never> = { success: false, error: "Invalid request body." };
    return NextResponse.json(failure, { status: 400 });
  }

  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : "";

  if (!orderId || !paymentId || !signature || !opportunityId) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Missing required payment verification fields.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Look up trusted server-side opportunity to get verified amount
  const opportunity = getTrustedOpportunityById(opportunityId);
  if (!opportunity) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Opportunity not found or untrusted.",
    };
    return NextResponse.json(failure, { status: 404 });
  }

  const valid = isValidSignature(orderId, paymentId, signature);
  if (!valid) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Payment signature verification failed.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Record completion server-side to prevent duplicate executions
  recordCompletedOpportunity(opportunityId);

  const verifiedAmount = opportunity.expectedRecovery;

  const result: PaymentVerificationResult = {
    paymentId,
    orderId,
    timestamp: new Date().toISOString(),
    amount: verifiedAmount,
    actionId: opportunityId,
  };

  const success: ApiResponse<PaymentVerificationResult> = { success: true, data: result };
  return NextResponse.json(success);
}

