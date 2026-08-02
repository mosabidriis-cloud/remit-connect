# REOS AI Roadmap

## Authority

CURRENT_SPRINT.md is the single source of truth for active sprint scope. This document tracks sprint sequencing only.

## Completed

- Sprint 10 Enterprise UI
- Sprint 11 Shared Batch Upload
- Sprint 12 Branch Assignment
- Sprint 13 Branch Processing - stabilization complete (2 open business decisions carried forward as risk - actor-role gating, unifying duplicate validation logic; see TECH_DEBT.md, not blocking sprint sequencing).
- Sprint 14 Proof Management - architecture, workflow integration, and Assignment consolidation delivered across 8 milestones (0 through Stabilization & Closure). The critical route-mounting defect found mid-sprint (REOS pages not mounted in the live router) was found and fixed within the same sprint. See CURRENT_SPRINT.md "Milestones Delivered" (superseded by Sprint 15's own log; historical detail remains in git history of this file).
- Sprint 15 Stabilization & Verification - proved the Sprint 14 workflow at runtime (it was previously verified only statically), found and fixed two further defects only visible at runtime (a missing Assignment -> Branch Processing navigation link, and a critical Branch Processing queue hydration bug that silently discarded completed work on ordinary navigation), completed UI consistency migration for the last 4 Proof Management components, removed a second dead route-constants file, and fixed a lifecycle-status mislabeling bug. See CURRENT_SPRINT.md for full milestone-by-milestone detail.

## Active

- None. Sprint 15 is the most recently completed sprint; Sprint 16 is not yet scoped.

## Upcoming

- Sprint 16 - not yet scoped. Candidates, per TECH_DEBT.md: `BranchAssignmentPage.tsx`'s inability to select a real uploaded batch; Branch Processing's missing actor-role gating; the orphaned `proofOfPaymentService.markProofDownloaded`; proof expiry not enforced against `expiresAt`; the Sidebar's remaining placeholder links (Proof Download, Transaction Processing, User Details/Edit); Reporting's missing Performance Reports category and disabled export actions; a small React Hooks lint cleanup (`set-state-in-render`/`set-state-in-effect`) surfaced during Sprint 15 Stabilization & Closure.

## Future

### Phase 2

- Direct Remit API
- Notifications
- Analytics
- Mobile App
