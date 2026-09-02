import "server-only";
import Razorpay from "razorpay";

// ---------------------------------------------------------------------------
// Server-only Razorpay client wrapper (Phase 7). RAZORPAY_KEY_SECRET must
// never leave this module — nothing in this file's exports exposes it.
// ---------------------------------------------------------------------------

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  }

  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return client;
}
