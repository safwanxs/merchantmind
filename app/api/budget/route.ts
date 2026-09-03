import { NextResponse } from "next/server";
import { getApprovedIncentiveTotal, recordApprovedIncentive, rollbackApprovedIncentive } from "@/lib/budget";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const total = getApprovedIncentiveTotal();
  const success: ApiResponse<{ approvedIncentiveTotal: number }> = {
    success: true,
    data: { approvedIncentiveTotal: total },
  };
  return NextResponse.json(success);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    const discount = typeof body.discount === "number" ? body.discount : 0;

    let updated = getApprovedIncentiveTotal();
    if (action === "approve") {
      updated = recordApprovedIncentive(discount);
    } else if (action === "rollback") {
      updated = rollbackApprovedIncentive(discount);
    }

    const success: ApiResponse<{ approvedIncentiveTotal: number }> = {
      success: true,
      data: { approvedIncentiveTotal: updated },
    };
    return NextResponse.json(success);
  } catch {
    const failure: ApiResponse<never> = { success: false, error: "Invalid budget request." };
    return NextResponse.json(failure, { status: 400 });
  }
}
