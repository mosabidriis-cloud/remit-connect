# Decisions

## Template

- Date:
- Decision:
- Context:
- Rationale:
- Status:

## Log

### DEC-001 - Direct Remit is the source of truth

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: Direct Remit remains the source of truth for Direct Remit batches. REOS owns operational workflow and audit only.
- Context: ARCHITECTURE.md data ownership boundary; BUSINESS_RULES.md source of truth.
- Rationale: REOS is an operational workflow and audit layer, not a system of record.
- Status: APPROVED

### DEC-002 - SharedBatch remains the parent object

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: SharedBatch is the parent object once a Direct Remit batch is created into REOS. One Shared Batch is assigned to exactly one branch and cannot be split across branches.
- Context: BUSINESS_RULES.md frozen rules.
- Rationale: Keeps batch assignment and lifecycle unambiguous and auditable.
- Status: APPROVED

### DEC-003 - One transaction belongs to exactly one BranchAssignment

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: A transaction belongs to exactly one BranchAssignment. Shared Batches cannot be split across multiple branches.
- Context: BUSINESS_RULES.md frozen rules.
- Rationale: Preserves single-branch accountability for processing and audit.
- Status: APPROVED

### DEC-004 - Current implementation is in-memory only

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: No persistence is implemented unless explicitly approved by the active sprint. Current REOS implementation is in-memory only.
- Context: ARCHITECTURE.md persistence boundary.
- Rationale: Avoids committing to storage/schema decisions while workflow and UI are still stabilizing. Tracked as ongoing debt - see TECH_DEBT.md (Persistence).
- Status: APPROVED

### DEC-005 - Sprint scope is frozen once approved

- Date: Approved (pre-dates this log; recorded 2026-08-01)
- Decision: Once a sprint's scope is approved in CURRENT_SPRINT.md, it is frozen for that sprint. Expanding scope mid-sprint requires an explicit new decision, not in-flight assumption.
- Context: CURRENT_SPRINT.md; WORKFLOW.md; DEFINITION_OF_DONE.md.
- Rationale: Prevents scope creep and keeps sprint acceptance criteria verifiable.
- Status: APPROVED

### DEC-006 - branchAssignmentService.ts is the canonical Assignment workflow

- Date: Approved 2026-08-01 (Sprint 14 Milestone 1.5)
- Decision: `branchAssignmentService.ts` (`assignSharedBatchToBranch` / `reassignSharedBatch`) is the only entry point that may create or update an `Assignment`. It enforces the frozen role rules (Direct Remit Officer assigns; Operations Manager reassigns) and the one-branch-per-batch lock. Internally it calls `assignmentService.createAssignment` to build the `Assignment` record (beneficiary ready/manual-review/invalid triage) - that function is now an internal implementation detail and must not be called directly from pages or components.
- Context: Two independent Assignment-creation paths were found during Sprint 14 Milestone 1 (`SharedBatchUploadPage.tsx` calling `assignmentService.createAssignment` inline, with no role or lock enforcement, vs. `BranchAssignmentPage.tsx` calling `branchAssignmentService.ts`, which enforced the rules but never produced an `Assignment` object). Consolidated in Milestone 1.5.
- Rationale: `branchAssignmentService.ts` already enforced BUSINESS_RULES.md's role and locking rules; `assignmentService.createAssignment` already correctly built the `Assignment` record Branch Processing depends on. Combining them under one canonical entry point removes the duplicate ownership without discarding either implementation.
- Status: APPROVED

### DEC-007 - Reporting may read operational data through read-only enumerators

- Date: Approved 2026-08-02 (Sprint 16, first implementation milestone - recorded as M4.1)
- Decision: The Reporting module may enumerate operational data enterprise-wide through additive, read-only accessors on the owning stores/services. Approved as REPORTING_ARCHITECTURE.md / REPORTING_PROJECTION_LAYER.md Decision D-4. Three accessors are approved: `getAllSharedBatches` and `getAllAssignments` (`sharedBatchStore.ts`), and `getAllBranchProcessingQueueItems` (`branchProcessingQueueService.ts`). Each must return copies, must never expose an internal collection, must never trigger hydration, and must never modify lifecycle or processing state.
- Context: `sharedBatchStore.ts` exposed only single-record and per-branch reads, and `branchProcessingQueueService.ts` only a per-branch read, so Reporting could not assemble an enterprise-wide result set without knowing every branch id in advance. BUSINESS_RULES.md gives the Operations Manager enterprise-wide visibility as a frozen rule, so this was a genuine capability gap. Recorded in TECH_DEBT.md during the Sprint 16 architecture review.
- Rationale: The alternative - letting Reporting reach into store internals, or having pages aggregate directly - would duplicate store logic and hard-wire consumers to the current in-memory shape. Additive read accessors keep each module the owner of its own data (ARCHITECTURE.md), change no transition, validation rule, or existing signature, and leave DEC-004's persistence boundary untouched. Ownership is unaffected: Reporting owns nothing it reads, and DEC-006 continues to reserve Assignment creation and update to `branchAssignmentService.ts`.
- Status: APPROVED
