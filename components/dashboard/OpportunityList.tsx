"use client";

import { useMemo, useState } from "react";
import type { CustomerSegment, Opportunity, PriorityLevel, RecommendedAction } from "@/lib/types";
import RevenueOpportunity from "./RevenueOpportunity";

type SortOption = "priority" | "revenue" | "score" | "newest";

export default function OpportunityList({
  opportunities,
  onReview,
}: {
  opportunities: Opportunity[];
  onReview?: (opportunity: Opportunity) => void;
}) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | "all">("all");
  const [segmentFilter, setSegmentFilter] = useState<CustomerSegment | "all">("all");
  const [problemFilter, setProblemFilter] = useState<"all" | "abandoned_cart" | "payment_failure">("all");
  const [actionFilter, setActionFilter] = useState<RecommendedAction | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("priority");

  const filteredAndSorted = useMemo(() => {
    return opportunities
      .filter((opp) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = opp.customerName.toLowerCase().includes(q);
          const matchProd = (opp.productName || "").toLowerCase().includes(q);
          const matchCustId = opp.customerId.toLowerCase().includes(q);
          const matchTxnId = opp.transactionId.toLowerCase().includes(q);
          if (!matchName && !matchProd && !matchCustId && !matchTxnId) return false;
        }

        // Priority filter
        if (priorityFilter !== "all" && opp.priorityLevel !== priorityFilter) {
          return false;
        }

        // Segment filter
        if (segmentFilter !== "all" && opp.customerSegment !== segmentFilter) {
          return false;
        }

        // Problem filter
        if (problemFilter !== "all" && opp.problem !== problemFilter) {
          return false;
        }

        // Action filter
        if (actionFilter !== "all" && opp.recommendedAction !== actionFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          return (b.priorityScore || 0) - (a.priorityScore || 0);
        }
        if (sortBy === "revenue") {
          return b.cartValue - a.cartValue;
        }
        if (sortBy === "score") {
          return b.confidence - a.confidence;
        }
        if (sortBy === "newest") {
          return b.id.localeCompare(a.id);
        }
        return 0;
      });
  }, [opportunities, search, priorityFilter, segmentFilter, problemFilter, actionFilter, sortBy]);

  const hasFiltersActive =
    search.trim() !== "" ||
    priorityFilter !== "all" ||
    segmentFilter !== "all" ||
    problemFilter !== "all" ||
    actionFilter !== "all";

  function clearFilters() {
    setSearch("");
    setPriorityFilter("all");
    setSegmentFilter("all");
    setProblemFilter("all");
    setActionFilter("all");
    setSortBy("priority");
  }

  if (opportunities.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="text-sm font-semibold text-ink">NO OPPORTUNITIES FOUND</p>
        <p className="text-xs text-muted">
          MerchantMind is analyzing transaction patterns or no eligible recovery targets exist in the dataset.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, Sorting */}
      <div className="card p-4 space-y-3 bg-canvas/60">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by customer name, product, customer ID, or txn ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink placeholder-muted focus:border-brand focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2 text-xs text-muted hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted font-medium whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
            >
              <option value="priority">Highest Priority Score</option>
              <option value="revenue">Highest Revenue At Risk</option>
              <option value="score">Highest Recovery Score</option>
              <option value="newest">Newest Transaction</option>
            </select>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 text-xs">
          {/* Priority */}
          <div>
            <label className="text-[10px] text-muted font-medium block mb-1">PRIORITY</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | "all")}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical 🔥 (90–100)</option>
              <option value="high">High 🔴 (75–89)</option>
              <option value="medium">Medium 🟡 (50–74)</option>
              <option value="low">Low 🟢 (0–49)</option>
            </select>
          </div>

          {/* Segment */}
          <div>
            <label className="text-[10px] text-muted font-medium block mb-1">SEGMENT</label>
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as CustomerSegment | "all")}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="all">All Segments</option>
              <option value="vip">VIP</option>
              <option value="high_value">High Value</option>
              <option value="returning">Returning</option>
              <option value="new">New</option>
              <option value="at_risk">At Risk</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Problem */}
          <div>
            <label className="text-[10px] text-muted font-medium block mb-1">PROBLEM TYPE</label>
            <select
              value={problemFilter}
              onChange={(e) => setProblemFilter(e.target.value as any)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="all">All Problems</option>
              <option value="abandoned_cart">Abandoned Cart</option>
              <option value="payment_failure">Payment Failure</option>
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="text-[10px] text-muted font-medium block mb-1">RECOMMENDED ACTION</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-ink"
            >
              <option value="all">All Actions</option>
              <option value="discount">Offer Discount</option>
              <option value="payment_retry_suggestion">Suggest Retry</option>
              <option value="payment_reminder">Send Reminder (₹0)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end">
            {hasFiltersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-md border border-border bg-surface hover:bg-canvas px-2.5 py-1 text-xs text-brand font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted pt-1">
          <span>
            Showing <strong className="text-ink">{filteredAndSorted.length}</strong> of{" "}
            <strong className="text-ink">{opportunities.length}</strong> opportunities
          </span>
          {hasFiltersActive && <span>Filtered Results</span>}
        </div>
      </div>

      {/* Filtered List or Empty State */}
      {filteredAndSorted.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-ink">NO DATA MATCHES SEARCH OR FILTERS</p>
          <p className="text-xs text-muted">Try adjusting your filters or search terms to see all opportunities.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 inline-block rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSorted.map((opportunity) => (
            <RevenueOpportunity key={opportunity.id} opportunity={opportunity} onReview={onReview} />
          ))}
        </div>
      )}
    </div>
  );
}
