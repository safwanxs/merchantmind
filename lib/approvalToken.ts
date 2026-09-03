import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  return (
    process.env.APPROVAL_TOKEN_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    "dev_merchantmind_approval_secret_key_2026"
  );
}

export function issueApprovalToken(opportunityId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${opportunityId}:${timestamp}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${opportunityId}.${timestamp}.${hmac}`;
}

export function verifyApprovalToken(token: string, opportunityId: string): boolean {
  if (!token || typeof token !== "string" || !opportunityId) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenOppId, timestampStr, signature] = parts;

  // Confirm opportunityId matches token payload exactly
  if (tokenOppId !== opportunityId) return false;

  // Timestamp validity & expiration check (15 minutes limit)
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > TOKEN_TTL_MS || timestamp > now + 60000) {
    return false;
  }

  // HMAC signature comparison using timingSafeEqual
  const payload = `${tokenOppId}:${timestampStr}`;
  const expectedHmac = createHmac("sha256", getSecret()).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expectedHmac, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
