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

- Sprint 16 Reporting Architecture - **architecture only, scope proposed 2026-08-02 and awaiting business owner approval** (DECISIONS.md DEC-005). Two design-only deliverables: REPORTING_ARCHITECTURE.md (following the PROOF_MANAGEMENT.md precedent from Sprint 14) and REPORTING_PROJECTION_LAYER.md (the read-only boundary between operational state and reporting). No application source code written or modified. Implementation (M4) is blocked on nine open business decisions (D-1 through D-9). Headline finding: Reporting and the Operations Dashboard have no data source - both pages read from React Router `location.state` and nothing navigates to them with state, so both render permanently empty for a real user. See CURRENT_SPRINT.md.

## Upcoming

- **Sprint 17 (candidate) - Reporting Implementation.** Requires D-1 through D-9 resolved first. Natural first milestone: the read-only reporting projection layer, now fully designed in REPORTING_PROJECTION_LAYER.md - it alone closes the "no data source" defect for both Reporting and the existing dashboard, and it requires only Decision D-4 (two additive read-only accessors) to become buildable.
- **Audit trail** - prerequisite for the entire Audit report category, and a gap against BUSINESS_RULES.md's existing audit rules. Recommended as its own scoped work before any Audit report is built (Decision D-5).
- Carried forward, per TECH_DEBT.md: `BranchAssignmentPage.tsx`'s inability to select a real uploaded batch; Branch Processing's missing actor-role gating and its missing processing timestamps/actor attribution (Decision D-6); the orphaned `proofOfPaymentService.markProofDownloaded`; proof expiry not enforced against `expiresAt`; the Sidebar's remaining placeholder links (Proof Download, Transaction Processing, User Details/Edit); removal of out-of-scope financial metrics from the Operations Dashboard (Decision D-9); a small React Hooks lint cleanup (`set-state-in-render`/`set-state-in-effect`) surfaced during Sprint 15 Stabilization & Closure.

## Future

### Phase 2

- Direct Remit API
- Notifications
- Analytics
- Mobile App
