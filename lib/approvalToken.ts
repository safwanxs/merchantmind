import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/env";
import { getStore } from "@/lib/store";

const TOKEN_TTL_SECONDS = 15 * 60;
export function issueApprovalToken(opportunityId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${opportunityId}:${timestamp}`;
  return `${opportunityId}.${timestamp}.${createHmac("sha256", getEnv().APPROVAL_TOKEN_SECRET).update(payload).digest("hex")}`;
}
export async function verifyApprovalToken(token: string, opportunityId: string): Promise<boolean> {
  if (!token || !opportunityId) return false;
  const [tokenOppId, timestampStr, signature] = token.split(".");
  const timestamp = Number(timestampStr);
  if (!tokenOppId || !signature || tokenOppId !== opportunityId || !Number.isFinite(timestamp)) return false;
  if (Date.now() - timestamp > TOKEN_TTL_SECONDS * 1000 || timestamp > Date.now() + 60000) return false;
  const expected = createHmac("sha256", getEnv().APPROVAL_TOKEN_SECRET).update(`${tokenOppId}:${timestampStr}`).digest("hex");
  const valid = expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return false;
  return getStore().setIfNotExists(`merchantmind:approval:${token}`, true, TOKEN_TTL_SECONDS);
}
