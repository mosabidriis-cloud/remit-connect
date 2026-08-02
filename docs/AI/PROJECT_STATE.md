# Project State

This document is a fast-glance operational snapshot of REOS. It exists to minimize repository scanning: read this file, CURRENT_SPRINT.md, and ARCHITECTURE.md before inspecting any implementation files.

This is a snapshot, not an authority. CURRENT_SPRINT.md governs active sprint scope; this file only reports state.

## Project Name

REOS (Remit Exchange Operations System) - repository `remit-connect`.

## Current Git Branch

develop

## Current Sprint

Sprint 15 - Stabilization & Verification (scope approved 2026-08-01; two scope amendments approved 2026-08-02, DECISIONS.md DEC-005)

## Current Module

Cross-module (Proof Management, Branch Processing, shared UI)

## Current Milestone

Stabilization & Closure - COMPLETE. **Sprint 15 is closed.**

`npm run lint` run for the first time this workflow; surfaced pre-existing issues, none in files Sprint 15 touched (recorded in TECH_DEBT.md, not fixed - out of scope). ROADMAP.md and MODULE_STATUS.md brought up to date. Final validation clean, bundle hash unchanged since M4.

## Sprint 15 Summary

Seven milestones: M1 (Runtime Verification), M1.5 (approved amendment - fixed the Assignment -> Branch Processing navigation gap M1 found), M1.75 (approved amendment - fixed a critical Branch Processing hydration/data-integrity defect found while verifying M1.5), M2 (UI Consistency), M3 (Dead Code), M4 (Correctness), Stabilization & Closure.

**Headline result**: the full Shared Batch -> Assignment -> Branch Processing -> Proof Management workflow was proven to work at runtime for the first time - in a real browser, with real uploaded data, real proof images, and real navigation, not just a passing build. Two genuine defects were found this way that three prior sprints of static analysis had missed, and both were fixed and re-verified against their own exact reproduction before being marked done. Full milestone-by-milestone detail: CURRENT_SPRINT.md.

**The full workflow now works end to end, with real data, verified live in a browser three times over** (M1 found the first gap, M1.5 closed it and was re-verified, M1.75 found and closed a second, more severe gap and was re-verified against the exact sequence that first exposed it):

- Shared Batch Upload -> Branch Assignment: works.
- Assignment -> Branch Processing: works (M1.5 added the missing navigation link).
- Branch Processing: transaction completion with real proof, and Finalize Processing, both work and now **survive realistic navigation** (M1.75 fixed `hydrateBranchProcessingQueue`, which previously discarded all progress - status and proofs - on every remount, e.g. a user leaving the page and coming back).
- Branch Processing -> Proof Management: works, including the Sprint 14 Milestone 2C auto-transition (`COMPLETED -> READY_FOR_DOWNLOAD` on page open); Proof Download now correctly shows real completed transactions and real proof images rather than 0/0.

Full detail for all three milestones: CURRENT_SPRINT.md "Milestone Log".

## Current Git Tag

v0.13.2-processing-completion (latest tag). Working tree has two code changes beyond Sprint 14's closing state: M1.5 (`components/BranchProcessingNavigation.tsx`, new; `SharedBatchUploadPage.tsx`, wired) and M1.75 (`branchProcessingQueueService.ts`, `hydrateBranchProcessingQueue` made idempotent).

## Build Status

Both checked after M1.75's fix:
- `npx tsc -p tsconfig.app.json --noEmit --incremental false` - clean, no errors.
- `npm run build` - succeeded. 134 modules (unchanged from M1.5 - no new files this milestone), bundle hash changed, confirming the fix shipped.

STANDING CAVEAT: a passing build alone does not prove changed code ships, is reachable by a real user, or preserves data correctly across ordinary navigation. Three separate incidents this sprint and last (Sprint 14's route-mounting gap, Sprint 15 M1's navigation gap, Sprint 15 M1.75's hydration defect) were all invisible to `tsc`/`build` and were only found by driving the app through a realistic sequence of actions in a real browser.

## Last Completed Milestone

Sprint 15 M1.75 - Fix Branch Processing Queue Hydration, verified live against the exact reproduction that found it. See CURRENT_SPRINT.md for full detail.

Preceding: Sprint 15 M1.5 (Assignment -> Branch Processing Navigation); Sprint 15 M1 (Runtime Verification, found the M1.5 gap); Sprint 14 Stabilization & Closure (Sprint 14 is closed).

## Next Planned Milestone

Sprint 15 M2 - UI Consistency: migrate the four remaining Proof Management components (`ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions`) from raw Tailwind to shared `theme.ts` design tokens, as originally scoped.

## Active Constraints

- No persistence beyond in-memory unless explicitly approved by the active sprint (ARCHITECTURE.md).
- No Treasury, Cash Pickup, Banking Core, ERP, CRM, or generic workflow engine features (BUSINESS_RULES.md).
- No frozen business rule may be changed (BUSINESS_RULES.md).
- Sprint scope is frozen once approved (DECISIONS.md, DEC-005).
- Modify only files required by the active sprint (CLAUDE.md).
- Exactly one owner for Assignment creation/management (DECISIONS.md DEC-006).

## Last Updated

2026-08-02
