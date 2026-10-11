import { NextResponse } from "next/server";
import { appendAuditEvent, clearAuditLog, getAuditLog } from "@/lib/audit";
import type { ApiResponse, AuditEvent } from "@/lib/types";

export async function GET() {
  const result: ApiResponse<AuditEvent[]> = { success: true, data: await getAuditLog() };
  return NextResponse.json(result);
}
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AuditEvent>;
    if (!body.actor || !body.actionType || !body.status || !body.description) return NextResponse.json({ success: false, error: "Invalid audit event." }, { status: 400 });
    const event = await appendAuditEvent({ actor: body.actor, actionType: body.actionType, status: body.status, description: body.description, metadata: body.metadata });
    return NextResponse.json({ success: true, data: event });
  } catch { return NextResponse.json({ success: false, error: "Invalid audit request." }, { status: 400 }); }
}
export async function DELETE() { await clearAuditLog(); return NextResponse.json({ success: true, data: null }); }
