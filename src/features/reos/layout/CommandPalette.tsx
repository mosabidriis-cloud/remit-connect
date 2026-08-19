import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getAllBranches } from "../services/branchRegistryService";
import { getAllSharedBatches } from "../services/sharedBatchStore";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { ReosSession } from "../types/session";
import type { SharedBatch, SharedBatchLifecycleStatus } from "../types/sharedBatch";
import { getVisibleSidebarSections } from "./sidebarConfig";

type ResultCategory = "Pages" | "Sections" | "Branches" | "Shared Batches";

type PaletteResult = {
  id: string;
  category: ResultCategory;
  label: string;
  detail: string;
  to: string;
};

/**
 * In-page jump targets on the Operations Dashboard - the same three ids
 * OperationsDashboardPage's own handleDrillDown already scrolls to, exposed here as
 * palette results and consumed there via the hash-scroll effect on that page.
 */
const sectionTargets: { id: string; label: string; to: string }[] = [
  { id: "section-exception-center", label: "Exception Center", to: "/reos/dashboard#exception-center" },
  { id: "section-branch-performance", label: "Branch Performance", to: "/reos/dashboard#branch-performance" },
  { id: "section-work-queue", label: "Work Queue", to: "/reos/dashboard#work-queue" },
];

const lifecycleLabel: Record<SharedBatchLifecycleStatus, string> = {
  ASSIGNED: "Assigned",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  READY_FOR_DOWNLOAD: "Ready for download",
  DOWNLOADED: "Downloaded",
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  session: ReosSession;
};

export function CommandPalette({ open, onClose, session }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [batches, setBatches] = useState<SharedBatch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSearchBatches = session.role === "OPERATIONS_MANAGER" || session.role === "DIRECT_REMIT_OFFICER";
  const canSeeDashboardSections = session.role === "OPERATIONS_MANAGER";
  const canSeeBranches = session.role === "OPERATIONS_MANAGER";

  useEffect(() => {
    let cancelled = false;

    // Deferred past the current synchronous effect tick so the open/close state resets
    // below never run synchronously within the effect body itself (react-hooks/set-state-in-effect).
    (async () => {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      if (!open) {
        setQuery("");
        setSelectedIndex(0);
        return;
      }

      inputRef.current?.focus();

      if (!canSearchBatches) {
        return;
      }

      try {
        const result = await getAllSharedBatches();

        if (!cancelled) {
          setBatches([...result]);
        }
      } catch (cause) {
        console.error("Unable to load shared batches for search:", cause);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, canSearchBatches]);

  const allResults = useMemo<PaletteResult[]>(() => {
    const results: PaletteResult[] = [];

    // Only pages whose href is fully resolvable are offered - "User Details"/"Edit
    // User"/"Proof Download" need a specific record and aren't meaningful generic jump
    // targets, the same reasoning Sidebar.tsx applies to BRANCH_ID substitution.
    getVisibleSidebarSections(session.role).forEach((section) => {
      section.items.forEach((item) => {
        const href = item.href.replace("BRANCH_ID", session.branchId ?? "");

        if (href.includes("_ID")) {
          return;
        }

        results.push({ id: `page-${href}`, category: "Pages", label: item.label, detail: section.label, to: href });
      });
    });

    if (canSeeDashboardSections) {
      sectionTargets.forEach((target) => {
        results.push({ id: target.id, category: "Sections", label: target.label, detail: "Operations Dashboard", to: target.to });
      });
    }

    if (canSeeBranches) {
      getAllBranches().forEach((branch) => {
        results.push({
          id: `branch-${branch.id}`,
          category: "Branches",
          label: branch.name,
          detail: "View in Liquidity Dashboard",
          to: "/reos/liquidity/dashboard",
        });
      });
    }

    if (canSearchBatches) {
      batches.forEach((batch) => {
        results.push({
          id: `batch-${batch.id}`,
          category: "Shared Batches",
          label: batch.reference,
          detail: `${batch.fileName} · ${lifecycleLabel[batch.lifecycleStatus]}`,
          to: `/reos/shared-batches/${batch.id}/proof-download`,
        });
      });
    }

    return results;
  }, [session, batches, canSeeDashboardSections, canSeeBranches, canSearchBatches]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matches = normalizedQuery
      ? allResults.filter(
          (result) => result.label.toLowerCase().includes(normalizedQuery) || result.detail.toLowerCase().includes(normalizedQuery),
        )
      : allResults;

    return matches.slice(0, 30);
  }, [allResults, query]);

  const groupedResults = useMemo(() => {
    const groups = new Map<ResultCategory, PaletteResult[]>();

    filteredResults.forEach((result) => {
      const existing = groups.get(result.category) ?? [];
      existing.push(result);
      groups.set(result.category, existing);
    });

    return groups;
  }, [filteredResults]);

  function handleSelect(result: PaletteResult) {
    navigate(result.to);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => Math.min(current + 1, filteredResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredResults[selectedIndex];

      if (selected) {
        handleSelect(selected);
      }
    } else if (event.key === "Escape") {
      onClose();
    }
  }

  if (!open) {
    return null;
  }

  let rowIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" style={{ backgroundColor: "rgba(2, 6, 23, 0.6)" }}>
      <button aria-label="Close search" className="fixed inset-0 cursor-default" onClick={onClose} style={{ background: "transparent" }} type="button" />

      <div className="relative w-full max-w-xl overflow-hidden" style={{ backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: shadows.lg }}>
        <div className="flex items-center gap-3" style={{ backgroundColor: colors.slate900, padding: `${spacing.md}px ${spacing.lg}px` }}>
          <SearchIcon />
          <input
            aria-label="Search REOS"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search branches, batches, and pages..."
            ref={inputRef}
            value={query}
          />
          <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: "rgba(255,255,255,0.2)", color: colors.slate300 }}>
            Esc
          </kbd>
        </div>

        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {filteredResults.length === 0 ? (
            <p style={{ color: colors.muted, fontSize: typography.small, padding: spacing.xl, textAlign: "center" }}>No matches for "{query}".</p>
          ) : (
            Array.from(groupedResults.entries()).map(([category, results]) => (
              <div key={category}>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{ padding: `${spacing.sm}px ${spacing.lg}px 4px` }}>
                  {category}
                </div>
                {results.map((result) => {
                  rowIndex += 1;
                  const isSelected = rowIndex === selectedIndex;

                  return (
                    <button
                      className="flex w-full items-center justify-between gap-3 text-left transition"
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(rowIndex)}
                      style={{
                        backgroundColor: isSelected ? colors.blue50 : "transparent",
                        borderLeft: `3px solid ${isSelected ? colors.primary : "transparent"}`,
                        padding: `${spacing.sm}px ${spacing.lg}px`,
                      }}
                      type="button"
                    >
                      <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{result.label}</span>
                      <span className="truncate" style={{ color: colors.muted, fontSize: typography.caption, maxWidth: "50%" }}>
                        {result.detail}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          className="flex items-center justify-between border-t text-xs"
          style={{ borderColor: colors.slate100, color: colors.muted, padding: `${spacing.sm}px ${spacing.lg}px` }}
        >
          <span>&uarr;&darr; to navigate &middot; Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} viewBox="0 0 24 24" style={{ color: colors.slate300 }}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
