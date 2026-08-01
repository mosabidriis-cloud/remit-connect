# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 14

## Current Module

Proof Management

## Current Milestone

Stabilization & Closure - COMPLETE. **Sprint 14 is closed.**

- Deleted the dead `src/features/reos/routes/ReosRoutes.tsx` (re-confirmed unreferenced; deletion does not orphan `AppLayout`, still used via `layouts/ReosLayout.tsx`).
- Removed the obsolete "Mark Ready for Download" button and all its plumbing (`onMarkReadyForDownload` prop, `canMarkReady` condition, `handleMarkReadyForDownload` handler) - the transition is automatic on page open since Milestone 2C. The `markSharedBatchReadyForDownload` service function is retained; it is what the automatic transition calls.
- Single-ownership verified: one Assignment creator (`branchAssignmentService.ts`), one Shared Batch lifecycle mutator (`sharedBatchStore.updateSharedBatchLifecycleStatus`, four sequential call sites), one Proof workflow.

The chain Shared Batch -> Assignment -> Branch Processing -> Proof Management is implemented, reachable, and free of duplicate ownership. Verification was static (call-site inspection + route/bundle checks); it was not exercised at runtime in a browser - see CURRENT_SPRINT.md "Caveat on verified".

## Current Git Tag

v0.13.2-processing-completion (latest tag). Working tree has uncommitted changes beyond this tag: the whole of Sprint 14 (Milestones 0, 1, 1.5, 2, 2B, Route Integration Audit, 2C, and Stabilization & Closure) on top of Sprint 13's stabilization changes. Sprint 14 touched one file outside `src/features/reos/`: `src/routes/AppRoutes.tsx`, to mount the previously-unmounted REOS routes.

## Build Status

Both checked and passing as of this session (2026-08-01, after Stabilization & Closure):
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded. 133 modules, 750.00 kB (`index-b9nsB3vQ.js`). Build emits a >500 kB chunk-size warning (informational; no code splitting configured, out of scope).

STANDING CAVEAT: a passing build alone does not prove changed code ships. During Sprint 14 the Milestone 2B bundle was byte-identical to Milestone 2's, because the changed pages were unreachable from the app entry and were tree-shaken out. When touching a page, confirm it is mounted in `src/routes/AppRoutes.tsx` and verify its code appears in the built bundle.

## Last Completed Milestone

Sprint 14 Stabilization & Closure - **Sprint 14 is closed**. Deleted the dead `ReosRoutes.tsx`; removed the obsolete "Mark Ready for Download" button and all its dead plumbing; verified single ownership of the Assignment workflow, the Shared Batch lifecycle, and the Proof workflow.

Full Sprint 14 milestone list and detail: see CURRENT_SPRINT.md "Milestones Delivered".

## Next Planned Milestone

Sprint 15 - not yet scoped. Recommended first task: a **runtime smoke test** of the full workflow in a browser. Sprint 14's verification was static (call-site inspection, route registration, bundle content); the chain was never exercised end to end at runtime, and two conditions constrain such a run - the `ProtectedReosRoute` auth gate, and the fact that only the Shared Batch Upload flow produces a batch with real transactions.

Then, from TECH_DEBT.md: `BranchAssignmentPage.tsx`'s empty-beneficiary limitation; the unreferenced `constants/routes.ts`; `layout/Sidebar.tsx`'s placeholder link; the orphaned `markProofDownloaded`; proof expiry not checked against `expiresAt`; Branch Processing's missing actor-role gating.

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md).
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No frozen business rule may be changed (BUSINESS_RULES.md).
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).
- Exactly one owner for Assignment creation/management (DECISIONS.md DEC-006).

## Last Updated

2026-08-01
