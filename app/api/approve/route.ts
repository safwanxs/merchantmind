import { NextResponse } from "next/server";
import { getTrustedOpportunityById } from "@/lib/ai";
import { validateOpportunity } from "@/lib/guardrails";
import { getApprovedIncentiveTotal } from "@/lib/budget";
import { issueApprovalToken } from "@/lib/approvalToken";
import type { ApiResponse } from "@/lib/types";

interface ApproveRequestBody {
  opportunityId?: unknown;
}

export interface ApproveResult {
  opportunityId: string;
  approvalToken: string;
}

export async function POST(request: Request) {
  let body: ApproveRequestBody;
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

  // Look up trusted server-side opportunity
  const opportunity = getTrustedOpportunityById(opportunityId);
  if (!opportunity) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Opportunity not found or untrusted.",
    };
    return NextResponse.json(failure, { status: 404 });
  }

  // Re-run Guardrail Engine independently before issuing approval token
  const approvedIncentiveTotal = getApprovedIncentiveTotal();
  const guardrailResult = validateOpportunity(opportunity, approvedIncentiveTotal);
  if (!guardrailResult.allowed) {
    const failure: ApiResponse<never> = {
      success: false,
      error: "Opportunity blocked by server-side financial guardrails. Approval token refused.",
    };
    return NextResponse.json(failure, { status: 400 });
  }

  // Issue signed approval token
  const approvalToken = issueApprovalToken(opportunityId);

  const result: ApproveResult = {
    opportunityId,
    approvalToken,
  };

  const success: ApiResponse<ApproveResult> = { success: true, data: result };
  return NextResponse.json(success);
}
