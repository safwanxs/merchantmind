"use client";

import { useState } from "react";
import type { Opportunity } from "@/lib/types";
import { formatINR } from "@/lib/calculations";
import type { CreateOrderResult } from "@/app/api/payment/create-order/route";
import type { PaymentVerificationResult } from "@/app/api/payment-status/route";
import type { DemoScenario } from "./DemoScenarios";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
  theme?: { color: string };
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentModal({
  opportunity,
  demoScenario,
  onClose,
  onOrderCreated,
  onSuccess,
  onFailure,
}: {
  opportunity: Opportunity;
  demoScenario: DemoScenario;
  onClose: () => void;
  onOrderCreated: (orderId: string) => void;
  onSuccess: (result: PaymentVerificationResult) => void;
  onFailure: (isSimulated: boolean) => void;
}) {
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const finalAmount = opportunity.expectedRecovery;
  const isSimulatedFailureDemo = demoScenario === "payment_failure";

  async function handleProceed() {
    setError(null);

    // Phase 8: Failed Payment demo scenario never touches Razorpay order
    // creation or signature verification — it only affects local demo
    // state/messaging, so a reviewer can see the graceful failure UX
    // without a real failed transaction.
    if (isSimulatedFailureDemo) {
      setStatus("processing");
      window.setTimeout(() => {
        onFailure(true);
      }, 600);
      return;
    }

    setStatus("processing");

    try {
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: opportunity.id }),
      });
      const orderBody: { success: boolean; data?: CreateOrderResult; error?: string } =
        await orderRes.json();

      if (!orderBody.success || !orderBody.data) {
        setError(orderBody.error ?? "Could not create payment order.");
        setStatus("error");
        return;
      }

      onOrderCreated(orderBody.data.orderId);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setError("Could not load Razorpay Checkout. Please try again.");
        setStatus("error");
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderBody.data.keyId,
        amount: Math.round(orderBody.data.amount * 100),
        currency: orderBody.data.currency,
        order_id: orderBody.data.orderId,
        name: "MerchantMind",
        description: "Demo payment for approved revenue recovery workflow.",
        theme: { color: "#111827" },
        handler: async (response) => {
          try {
            const verifyRes = await fetch("/api/payment-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                opportunityId: opportunity.id,
              }),
            });
            const verifyBody: {
              success: boolean;
              data?: PaymentVerificationResult;
              error?: string;
            } = await verifyRes.json();

            if (verifyBody.success && verifyBody.data) {
              onSuccess(verifyBody.data);
            } else {
              // Invalid/failed signature verification — real failure, not simulated.
              onFailure(false);
            }
          } catch {
            onFailure(false);
          }
        },
        modal: {
          // Checkout modal dismissed without completing payment — Phase 8
          // failure handling: stop the workflow, no auto-retry.
          ondismiss: () => onFailure(false),
        },
      });

      razorpay.open();
      setStatus("idle");
    } catch (err) {
      console.error("payment flow error:", err);
      setError("Something went wrong starting the payment. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="payment-modal-heading" className="text-sm font-semibold text-ink">Complete Payment</h3>
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              isSimulatedFailureDemo
                ? "bg-[var(--pending-bg)] text-[var(--pending)]"
                : "bg-[var(--success-bg)] text-[var(--success)]"
            }`}
          >
            {isSimulatedFailureDemo ? "Simulated demo failure" : "Real Razorpay test payment"}
          </span>
        </div>

        <p className="mb-4 text-sm text-muted">
          Demo payment for approved revenue recovery workflow.
        </p>

        <dl className="mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Original amount</dt>
            <dd className="text-ink">{formatINR(opportunity.cartValue)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Discount</dt>
            <dd className="text-ink">−{formatINR(opportunity.recommendedDiscount)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-medium">
            <dt className="text-ink">Final amount</dt>
            <dd className="text-ink">{formatINR(finalAmount)}</dd>
          </div>
        </dl>

        {status === "error" && error && (
          <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={status === "processing"}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={status === "processing"}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "processing" ? "Processing…" : "Proceed to Test Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
