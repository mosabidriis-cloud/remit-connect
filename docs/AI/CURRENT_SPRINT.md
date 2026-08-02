# CURRENT SPRINT

Version: 15.7

Status: SPRINT 15 COMPLETE - STABILIZED AND CLOSED

Last Updated: 2026-08-02

## Authority

This document is the single source of truth for active REOS sprint scope, module, milestone, allowed directories, and acceptance criteria. Where any other document under docs/AI conflicts with this file, this file governs. PROJECT_STATE.md is a fast-glance snapshot of these same facts, not a separate authority.

## Current Sprint

Sprint 15 - Stabilization & Verification

## Current Module

Cross-module (Proof Management, Branch Processing, shared UI)

## Scope Approval

Sprint 15 scope was approved by the business owner on 2026-08-01 and is frozen per DECISIONS.md DEC-005. Scope was explicitly chosen to require **no new business decisions**; every item below is engineering work with existing precedent or an already-recorded recommendation in TECH_DEBT.md.

## Sprint Goal

Prove the Sprint 14 workflow actually works at runtime, then close out the non-blocked technical debt it left behind. No new features, no new business rules, no persistence, no architecture redesign.

## Milestones

- **M1 - Runtime Verification**: exercise Shared Batch -> Branch Assignment -> Branch Processing -> Proof Management in a running browser. Sprint 14's verification was entirely static, and that sprint produced a case where a green build concealed code that never shipped. Until the chain runs, "works" is unproven. No code changes expected; any defect found is reported, and fixed only if it is unambiguous and in scope.
- **M2 - UI Consistency**: migrate the four remaining Proof Management components (`ProofDownloadPanel`, `BatchDownloadSummary`, `DownloadHistory`, `BatchDownloadActions`) from raw Tailwind to the shared `theme.ts` design tokens. Direct precedent: Sprint 13 performed exactly this migration across Branch Processing. Mandated by UI_GUIDELINES.md.
- **M3 - Dead Code**: resolve the unreferenced `src/features/reos/constants/routes.ts`. TECH_DEBT.md already recommends deleting or wiring it; it is the same hazard class as the `ReosRoutes.tsx` deleted in Sprint 14 - a second, unmounted source of route truth.
- **M4 - Correctness**: fix `getBatchDownloadSummary`'s `downloadStatus`, which mislabels a `COMPLETED` batch as `READY_FOR_DOWNLOAD`. The correct value is derivable from the batch's actual lifecycle status; requires a small `types/proofDownload.ts` widening.
- **Stabilization & Closure**: remove any dead code introduced, synchronize AI documentation, run final validation, produce the sprint completion report.

## Allowed Directories

src/features/reos, docs/AI. `src/routes/AppRoutes.tsx` only if M3 requires wiring rather than deletion.

## Acceptance Criteria

- The full workflow is exercised at runtime, and the result - pass or fail - is reported honestly with evidence.
- All four Proof Management components use shared theme tokens; no raw Tailwind remains in them.
- `constants/routes.ts` is either deleted or wired to a single source of truth; no second unmounted route definition remains.
- `downloadStatus` reports the batch's true lifecycle status.
- No new business features, business rules, dependencies, persistence, or architecture changes.
- One owner per workflow preserved (DEC-006 unaffected).
- TypeScript compiles; production build succeeds; changed code verified present in the built bundle.

## Explicitly Out of Scope (blocked - business decisions required)

These remain in TECH_DEBT.md and must not be actioned during Sprint 15:

1. `proofOfPaymentService.markProofDownloaded` is orphaned - needs a ZIP-vs-individual product decision.
2. `BranchAssignmentPage.tsx` cannot select a real uploaded Shared Batch - needs a data-source redesign decision.
3. Branch Processing has no actor-role gating - needs a decision on who may finalize a branch.
4. Proof expiry is not enforced against `expiresAt` - enforcement policy undefined, and no scheduler is permitted.
5. `layout/Sidebar.tsx` placeholder proof-download link - no defined target.
6. Reporting Performance reports and export actions - would require new dependencies.
7. Unifying the two completion/return validation implementations - architecture decision.

## Milestone Log

### M1 - Runtime Verification: COMPLETE - ARCHITECTURAL BLOCKER FOUND

No source code was changed. Method: ran the app in a real browser (`npm run dev`), authenticated via the existing dev auth gate, generated a minimal 2-row `.xlsx` fixture with the `xlsx` package already in `package.json` (no new dependency), and drove the UI directly (file upload, clicks, form input) rather than calling services from the console.

**What worked, confirmed live:**
- Shared Batch Upload: file validated (2/2 valid records), "Confirm Upload" succeeded.
- The Milestone 1.5 `isLocked`-timing fix works at runtime: the "locked" indicator correctly appeared only after assignment, not after upload-confirm as it did before that fix.
- Branch Assignment: assigning to Port Sudan Branch succeeded through the canonical `branchAssignmentService.ts` path - batch reached `ASSIGNED`, 1 assignment group, 2 transactions, matching the UI's own summary exactly.

**Blocker found - no working path connects Assignment to Branch Processing:**

1. `layout/Sidebar.tsx` hardcodes literal placeholder tokens in five nav hrefs, not real ids: `/reos/branches/BRANCH_ID/processing`, `.../BATCH_ID/transactions/TRANSACTION_ID`, `/reos/shared-batches/BATCH_ID/proof-download`, `/reos/administration/users/USER_ID`, `.../USER_ID/edit`. TECH_DEBT.md previously recorded only the proof-download instance; the placeholder pattern is sidebar-wide, five links, not one.
2. Independent of the sidebar: after a successful assignment, `SharedBatchUploadPage.tsx` shows a summary but contains no link at all to that branch's Branch Processing queue - not broken, simply absent.
3. Consequence: there is currently no client-side (React Router) path from "assignment confirmed" to Branch Processing. The only way to reach it is a hard URL navigation (typed by hand, or via a placeholder link that resolves nowhere useful) - confirmed live: hard-navigating to `/reos/branches/PORT_SUDAN/processing` after a successful assignment showed "Assigned transactions: 0". This is not a store bug; it is the expected, already-documented consequence of DEC-004 (in-memory only, `sharedBatchStore.ts` state does not survive a page reload). A hard navigation is a full reload.

**Why this is reported as a blocker, not fixed:** the combination is real - an in-memory-only store (DEC-004, approved) plus no client-side link between two already-correct stages means the Sprint 14 workflow, as it stands, cannot be completed by a real user in one continuous session. Closing it needs a scope decision (what should the placeholder links resolve to for a global static sidebar item with no "current record" context; is a contextual link from the Assignment summary the right fix, mirroring the `ProofDownloadNavigation.tsx` pattern from Sprint 14 Milestone 2B) - that is new UI behavior, which M1's approved scope ("no code changes expected... fixed only if unambiguous and in scope") does not cover. Per the Decision Gate, this is reported rather than assumed.

**Not yet exercised** (deferred - the blocker above makes it unreachable via the intended path): Branch Processing transaction completion, Branch Processing finalize, and Proof Management. `proofDownloadService.ts`/`branchProcessingQueueService.ts` were already inspected by call-site analysis in Sprint 14 and are not re-litigated here.

TypeScript and build re-run after M1 (no source changed): both clean, bundle hash identical to Sprint 14's closing build - confirms no drift.

### M1.5 - Assignment -> Branch Processing Navigation: COMPLETE AND VERIFIED LIVE

Approved by the business owner on 2026-08-02 as a scope amendment (per DECISIONS.md DEC-005's requirement for explicit approval, not in-flight assumption): add a contextual link, mirroring `ProofDownloadNavigation.tsx` (Sprint 14 Milestone 2B), rather than redesigning the Sidebar.

**What changed:**
- New `components/BranchProcessingNavigation.tsx` - same shape and style as `ProofDownloadNavigation.tsx`: takes a list of `{ branchId, branchName }` targets, renders nothing if empty, one `<Link>` per target to the existing route `/reos/branches/:branchId/processing`.
- `SharedBatchUploadPage.tsx`: computes targets directly from its own `assignments` state (already carries real `assignedBranchId`/`assignedBranchName` - no store lookup needed) and renders the new component once assignment is finalized.

TypeScript and build: both clean; 134 modules (+1, the new component), bundle hash changed, confirming it shipped.

**Verified live in the browser** (same session as M1, continued): re-ran Upload -> Assign, the "Open Branch Processing - Port Sudan Branch" link appeared with a real `href="/reos/branches/PORT_SUDAN/processing"` (not a placeholder), clicking it performed a genuine client-side (React Router) navigation, and Branch Processing correctly showed "Assigned transactions: 2" - the original blocker is closed and confirmed, not just plausible.

### NEW FINDING (CRITICAL) - Branch Processing queue hydration silently discards in-progress work on every remount

Found while continuing the M1.5 verification through to Proof Management. Not fixed - reported per the Decision Gate, same as M1's finding.

**Reproduction, live:** completed both test transactions (proof uploaded, marked Complete) and clicked Finalize Processing - branch reached `COMPLETED`, `SharedBatch.lifecycleStatus` correctly became `COMPLETED` too. Left the page via browser back navigation, then forward again to the same URL (a same-session, client-side round trip - the in-memory store demonstrably survived: `Assigned transactions: 2` still showed, and the new Proof Download link correctly appeared, proving `sharedBatchStore` state was intact). But the Transaction Queue had reverted: both transactions showed `Assigned` again, not `Completed`, and their uploaded proofs were gone. Following the (now-working) Proof Download link then showed "0 proof image(s)" and "0 completed transactions" for a batch that had genuinely been completed with proof moments earlier.

**Root cause** (`branchProcessingQueueService.ts`, `hydrateBranchProcessingQueue`, pre-dates Sprint 14/15 - Sprint 13 code, confirmed by inspection): this function runs unconditionally every time `BranchProcessingQueue.tsx` mounts (i.e. every time the route is entered, by any navigation method). It always builds fresh queue items at `status: "ASSIGNED"` with empty `proofs`, discards the branch's previous items outright (`otherBranchItems` filters the branch's own old entries *out*), and calls `branchProcessingStatusState.delete(branchId)` - unconditionally resetting the branch-level status back to `PROCESSING` too. It is not idempotent: it has no check for "this branch already has progress, preserve it," so any remount - a real user leaving the page and coming back, not just my back/forward test - silently wipes completed work, uploaded proofs, and the branch's finalized status.

**Severity:** this is worse than the M1 navigation gap. That gap prevented reaching the workflow; this defect corrupts real, completed work whenever a Branch Officer legitimately navigates away and returns - which is a completely ordinary thing to do (check another page, get interrupted, etc.), not an edge case. It also explains why Sprint 14's `finalizeBranchProcessing` -> `SharedBatch.lifecycleStatus` wiring, while itself correct, produces a downstream Proof Management view with no real data whenever this happens - proof of a genuine data-integrity issue, not merely a UI inconvenience.

**Why not fixed here:** making `hydrateBranchProcessingQueue` idempotent (preserve existing items' `status`/`proofs` for a branch, only add genuinely-new ones from the current `assignments`, and don't blindly reset `branchProcessingStatusState`) is a behavior change to shared service logic that Branch Processing, Sprint 13, and Sprint 14 have all depended on as-is. It is very likely the correct fix, but changing it without confirmation risks side effects across a component (`BranchProcessingQueue.tsx`) I have not been asked to modify this milestone, and the instructions require stopping at exactly this kind of finding rather than assuming.

### M1.75 - Fix Branch Processing Queue Hydration: COMPLETE AND VERIFIED LIVE

Approved by the business owner on 2026-08-02 as a scope amendment (DECISIONS.md DEC-005), same pattern as M1.5.

**What changed** (`branchProcessingQueueService.ts`, `hydrateBranchProcessingQueue` only):
- Before rebuilding, it now looks up this branch's existing queue items by their deterministic id (`${assignment.id}-${beneficiary.id}`).
- For an id that already exists, the existing item object is kept as-is (its `status`, `proofs`, `returnReason`, `returnComment` untouched) instead of being overwritten with a fresh `ASSIGNED`/empty-proofs item.
- Only assignment-beneficiary pairs with no existing item get a new item, exactly as before - this still correctly picks up genuinely new assignments added to a branch later.
- The unconditional `branchProcessingStatusState.delete(branchId)` was removed entirely, so a branch already at `COMPLETED` stays `COMPLETED` across a remount instead of silently reverting to the implicit default `PROCESSING`.
- No other function in the file changed. No new business logic: this is a pure idempotency fix to an existing function's own stated contract (hydrate the queue for a branch), not a new capability.

TypeScript and build: both clean; 134 modules (unchanged count - no new files), bundle hash changed, confirming the fix shipped.

**Verified live in the browser**, reproducing the exact failing sequence from the finding above, step for step: uploaded and assigned the same test batch, opened Branch Processing via the M1.5 link, started and completed both transactions with real proof uploads, finalized the branch (reached `COMPLETED`), then navigated back and forward through the exact same browser round trip that previously reproduced the bug. Result this time: branch still `COMPLETED`, both transactions still `Completed`, queue still correctly locked ("Processing session locked. Queue is read-only."), Proof Download link still present. Followed it through to Proof Download: **2 proof images, 2 completed transactions**, both individual proof rows showing real filenames and upload timestamps - not 0/0 as before the fix. The full chain Shared Batch -> Assignment -> Branch Processing -> Proof Management now works end to end, with real data, surviving realistic navigation.

Sprint 15 now proceeds to M2 (UI Consistency) as originally scoped.

### M2 - UI Consistency: COMPLETE AND VERIFIED LIVE

Migrated the four remaining Proof Management components from raw Tailwind classes to the shared `theme.ts` design tokens, per UI_GUIDELINES.md and the Sprint 13 precedent.

**What changed:**
- `ProofDownloadPanel.tsx`: rewritten to reuse the existing shared `common/DataTable.tsx` and `common/EmptyState.tsx` components (both already theme-token styled) instead of a hand-rolled Tailwind `<table>`. Removes duplication - `DataTable` already exists and is used by `UserTable.tsx`; the general sprint rule "remove duplication if discovered" applied here even though M2 was scoped as a styling task.
- `BatchDownloadSummary.tsx`, `DownloadHistory.tsx`, `BatchDownloadActions.tsx`: mechanical conversion of Tailwind `className`s to inline styles using `colors`/`radius`/`spacing`/`typography` from `../theme`, matching the pattern already used throughout Branch Processing and the rest of Proof Management (`ProofUpload.tsx`, `ProofGallery.tsx`, Sprint 13/14). No prop interfaces, conditionals, or behavior changed - `BatchDownloadActions.tsx` in particular was already touched twice this sprint's predecessors (button added in Sprint 14 M2, removed in Sprint 14 Stabilization); this pass is styling-only.
- `BatchLifecycleBadge.tsx` (used by `BatchDownloadSummary.tsx`) was already theme-token styled via the shared `StatusBadge` - left unchanged.

TypeScript and build: both clean; 134 modules (unchanged - no new files), CSS bundle shrank (22.16 kB -> 21.72 kB, fewer Tailwind utility classes now compiled), confirming the migration is real.

**Verified live in the browser**: re-ran the full Upload -> Assign -> Process -> Finalize -> Proof Download sequence. All four migrated components render correctly and consistently with the rest of the design system (screenshot-inspected), and the data displayed is correct - 2 proof images, 2 completed transactions - confirming M1.75's hydration fix still holds after this styling pass (no regression).

**Minor finding, not a regression, not fixed:** confirmed that `BranchProcessingPage.tsx`'s `ProofDownloadNavigation` link does not appear immediately after clicking Finalize Processing within the same page mount - only after leaving and returning (its `useMemo` depends on `branchAssignments`, which doesn't change when `finalizeBranchProcessing` mutates the store as a side effect in a sibling component). This was already implicitly present during M1.75's own verification (the link only appeared after that milestone's back/forward round trip too) - it is a pre-existing reactivity gap, not something M2 introduced. Recorded in TECH_DEBT.md.

Sprint 15 now proceeds to M3 (Dead Code).

### M3 - Dead Code: COMPLETE

Resolved `src/features/reos/constants/routes.ts` - confirmed (re-verified) unreferenced anywhere in `src`. Chose **deletion** over wiring it into `AppRoutes.tsx`: two of its constants (`OPERATIONS`, `SETTINGS`) have no corresponding route at all, so wiring could never fully resolve the file either way; `AppRoutes.tsx` uses inline literal path strings throughout with no existing constants convention, and it is the file Sprint 14/15 already found to be fragile (the route-mounting incident) - editing every one of its route definitions to import constants for marginal DRY benefit was a larger, riskier change than deleting an already-dead file. Same resolution precedent as the Sprint 14 deletion of `ReosRoutes.tsx` (same hazard class: a second, unmounted source of route truth).

`src/features/reos/constants/` now contains only its pre-existing placeholder `index.ts` (`export {};`), matching the same barrel-stub convention already left in place for `routes/` after Sprint 14.

TypeScript and build: both clean; bundle hash identical to M2's build, confirming the deleted file was genuinely dead code with zero observable effect.

Sprint 15 now proceeds to M4 (Correctness).

### M4 - Correctness: COMPLETE

Fixed `getBatchDownloadSummary`'s `downloadStatus`, which mislabeled a `COMPLETED` batch as `READY_FOR_DOWNLOAD` (the field's type only permitted those two values, so the code fell back to a wrong default). Per the acceptance criterion "`downloadStatus` reports the batch's true lifecycle status": widened `BatchDownloadSummary.downloadStatus` in `types/proofDownload.ts` from `Extract<SharedBatchLifecycleStatus, "READY_FOR_DOWNLOAD" | "DOWNLOADED">` to the full `SharedBatchLifecycleStatus`, and changed `proofDownloadService.getBatchDownloadSummary` to set it directly from `batch.lifecycleStatus` (matching the already-correct `processingStatus` field) instead of the previous two-way ternary. `BatchLifecycleBadge.tsx` (which renders the field) already had labels/tones for all five statuses, so no component change was needed.

TypeScript and build: both clean; bundle hash changed, confirming it shipped.

**Verification note:** because Sprint 14 Milestone 2C's auto-transition fires on page open for a Direct Remit Officer, a `COMPLETED` batch is bumped to `READY_FOR_DOWNLOAD` essentially immediately when viewed through the normal flow, making the specific previously-wrong case hard to observe live without also constructing an Operations Manager (read-only) view, where the auto-transition is correctly guarded off. Not separately live-tested for that reason; this is a one-line, type-checked mirror of an already-correct sibling field, not complex logic, so the change was validated by `tsc` (which confirms every consumer accepts the widened type) rather than an additional live pass.

Sprint 15 now proceeds to Stabilization & Closure.

### Stabilization & Closure: COMPLETE - SPRINT 15 CLOSED

- **Dead code**: ran `npm run lint` for the first time in this documentation-driven workflow. It surfaced 11 pre-existing errors and 3 warnings, but **none in any file this sprint modified** (cross-checked against `git status`) - `BranchProcessingQueue.tsx`, `ProofDownloadPage.tsx`, `layout/Sidebar.tsx`, `excelValidationService.ts`, and three files in unrelated modules all carry pre-existing issues, none introduced by Sprint 15. Recorded in TECH_DEBT.md as a new "Linting" section rather than fixed - out of this sprint's approved scope, and fixing hook-dependency behavior in files not otherwise touched risks side effects the Decision Gate says to avoid assuming into.
- **Documentation synchronized**: ROADMAP.md updated (Sprint 14 and 15 both moved to Completed, accurate open items carried into "Upcoming"); MODULE_STATUS.md updated (Branch Processing, Proof Management, Shared Batch Upload rows reflect Sprint 15's live-verified state); TECH_DEBT.md reflects every item resolved or newly found this sprint; DECISIONS.md reviewed - no new architectural decision this sprint met that log's bar (the hydration fix is a bug fix, not an architecture decision; DEC-006 already governs the Assignment workflow M1.5 built on).
- **Final validation**: `tsc` clean, `npm run build` succeeded, bundle hash unchanged since M4 (confirms the documentation-only edits since then didn't touch shipped code).

## Sprint 15 Summary

Seven milestones delivered: M1 (Runtime Verification - found a navigation gap), M1.5 (fixed it, approved amendment), M1.75 (found and fixed a critical hydration/data-integrity defect, approved amendment), M2 (UI Consistency), M3 (Dead Code), M4 (Correctness), Stabilization & Closure.

The headline result: **the full Shared Batch -> Assignment -> Branch Processing -> Proof Management workflow was proven to work at runtime for the first time**, in a real browser, with real uploaded data, real proof images, and real navigation - not just a passing `tsc`/`build`. Two genuine defects were found this way that no amount of static analysis had caught across three prior sprints, and both were fixed and re-verified against their own exact reproduction steps before being marked done.
