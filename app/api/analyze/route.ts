import { NextResponse } from "next/server";
import { runAnalysis, runDeterministicAnalysis } from "@/lib/ai";
import type { ApiResponse, AnalysisResponse } from "@/lib/types";
import customers from "@/data/customers.json";
import transactions from "@/data/transactions.json";
import type { Customer, Transaction } from "@/lib/types";

export async function POST(request: Request) {
  // Demo Scenarios control (Phase 8): "AI API Failure" forces the
  // deterministic fallback path so a reviewer can see it without needing
  // to actually break the AI provider.
  let forceFallback = false;
  try {
    const body = await request.json();
    forceFallback = body?.forceFallback === true;
  } catch {
    // No/invalid body is fine — default to the normal analysis path.
  }

  try {
    const result = forceFallback
      ? runDeterministicAnalysis(customers as Customer[], transactions as Transaction[])
      : await runAnalysis(customers as Customer[], transactions as Transaction[]);

    const body: ApiResponse<AnalysisResponse> = { success: true, data: result };
    return NextResponse.json(body);
  } catch (error) {
    console.error("analyze route error:", error);
    const body: ApiResponse<never> = {
      success: false,
      error: "Analysis failed. Please try again.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
