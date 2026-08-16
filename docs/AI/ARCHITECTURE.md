# REOS Architecture

## Module Boundary

REOS is implemented as an isolated feature module under src/features/reos.

The REOS module owns:

- REOS domain types
- REOS services
- REOS components
- REOS pages
- REOS route definitions
- REOS operational workflow and audit rules

The REOS module does not own:

- Supabase configuration
- Application layout outside REOS
- Direct Remit source data

**Exception, approved 2026-08-08 (DECISIONS.md DEC-018):** REOS now owns its own authentication integration - a real Supabase Auth session (`reosAuthService.ts`), its own `profiles` table (role, branch, status), and its own route/branch gating (`ReosAuthProvider`, `RouteGuards.tsx`). It does not reuse or modify `src/services/authService.ts`/`src/auth/types.ts`, which belong to the legacy, non-REOS pages and use a different role vocabulary. See AUTHENTICATION.md.

## Data Ownership

Direct Remit remains the source of truth for batches.

REOS owns operational workflow and audit only.

## Persistence Boundary

No persistence is implemented unless explicitly approved by the active sprint.

**Exception, approved 2026-08-08 (DECISIONS.md DEC-016):** the Import Intelligence ledger (`import_batches`, `import_beneficiaries` in the `remit-connect` Supabase project) is real, durable persistence - the first in REOS. It is narrowly scoped: a durable record of what has been imported, for duplicate detection, reporting period, and data coverage. It is not the live operational workflow. See IMPORT_INTELLIGENCE.md.

**Read-layer clarification (DECISIONS.md DEC-017, 2026-08-08):** `operationalDatasetService.ts` reads the ledger above for Reporting/Dashboards/Coverage/Historical Analytics only. It does not extend to Branch Processing or Liquidity Management - both keep reading their own in-memory state, unaffected by this or any exception above. See IMPORT_INTELLIGENCE.md Section 13.

**Exception, approved 2026-08-09 (DECISIONS.md DEC-019, Production Readiness Phase 2 Milestone 1):** `sharedBatchStore.ts` (`shared_batches`, `beneficiaries`, `assignments`) is also real, durable persistence now - REOS's live Shared Batch/Beneficiary/Assignment data, not just an import ledger's evidence copy of it. See OPERATIONAL_PERSISTENCE.md.

**Exception, approved 2026-08-09 (DECISIONS.md DEC-020, Production Readiness Phase 2 Milestone 2):** `branchProcessingQueueService.ts`'s queue-item state and branch-level lock (`branch_processing_queue_items`, `branch_processing_status`) and proof-of-payment files (`proofs` table plus the private Storage bucket `proof-of-payment`) are also real, durable persistence now. See OPERATIONAL_PERSISTENCE.md.

**Exception, approved 2026-08-13 (DECISIONS.md DEC-021, Production Readiness Phase 2 Milestone 3):** `liquidityStore.ts` (`payout_accounts`, `funding_events`, `funding_entries`) is also real, durable persistence now. **This closes Phase 2** - no REOS operational store remains in-memory-only. See OPERATIONAL_PERSISTENCE.md.

**Exception, approved 2026-08-13 (DECISIONS.md DEC-022, Production Readiness Phase 3):** a new `audit_events` table is real, durable, append-only persistence for every real business action across REOS - not a migration of an existing in-memory store, but new state that did not exist before (the audit objects it replaces - `TransactionProcessingAudit`, `ProofDownloadHistoryEntry`, `SharedBatchReassignmentAudit` - were previously constructed and immediately discarded). See AUDIT_TRAIL.md.
