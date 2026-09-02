"use client";

import { useState } from "react";
import type { AnalysisResponse, ApiResponse, Opportunity } from "@/lib/types";
import OpportunityList from "./OpportunityList";
import LoadingState from "@/components/shared/LoadingState";
import StatusBadge from "@/components/shared/StatusBadge";
import type { DemoScenario } from "./DemoScenarios";

export default function AgentAnalysis({
  demoScenario,
  onAnalysisComplete,
  onReview,
}: {
  demoScenario: DemoScenario;
  onAnalysisComplete?: (result: AnalysisResponse, forcedFallback: boolean) => void;
  onReview?: (opportunity: Opportunity) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forcedFallback, setForcedFallback] = useState(false);

  async function runAnalysis() {
    setStatus("loading");
    setError(null);
    const forceFallback = demoScenario === "ai_failure";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceFallback }),
      });
      const body: ApiResponse<AnalysisResponse> = await res.json();

      if (!body.success) {
        setError(body.error);
        setStatus("error");
        return;
      }

      setResult(body.data);
      setForcedFallback(forceFallback);
      setStatus("idle");
      onAnalysisComplete?.(body.data, forceFallback);
    } catch {
      setError("Could not reach the analysis service. Please try again.");
      setStatus("error");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Revenue Intelligence</h2>
          <p className="text-sm text-muted">AI-powered analysis of your commerce activity.</p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={status === "loading"}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Analyzing…" : "Run AI Analysis"}
        </button>
      </div>

      {status === "loading" && <LoadingState label="Analyzing commerce data…" />}

      {status === "error" && error && (
        <div className="card border-[var(--danger)] p-4 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {forcedFallback && result && status !== "loading" && (
        <div className="card border-[var(--pending)] p-4 text-sm text-[var(--pending)]">
          AI provider unavailable. Running deterministic recovery analysis.
        </div>
      )}

      {result && status !== "loading" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">{result.summary}</p>
            <StatusBadge
              label={result.source === "fallback" ? "Demo analysis mode" : "AI analysis"}
              tone={result.source === "fallback" ? "pending" : "success"}
            />
          </div>
          <OpportunityList opportunities={result.opportunities} onReview={onReview} />
        </div>
      )}

      {!result && status === "idle" && (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">
            Run AI analysis to surface revenue recovery opportunities from your commerce data.
          </p>
        </div>
      )}
    </section>
  );
}
