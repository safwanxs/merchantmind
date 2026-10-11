import "server-only";
import Razorpay from "razorpay";
import { getEnv } from "@/lib/env";

// ---------------------------------------------------------------------------
// Server-only Razorpay client wrapper (Phase 7). RAZORPAY_KEY_SECRET must
// never leave this module — nothing in this file's exports exposes it.
// ---------------------------------------------------------------------------

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret } = getEnv();

  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return client;
}
