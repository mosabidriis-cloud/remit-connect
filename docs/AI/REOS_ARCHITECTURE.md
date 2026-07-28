# REOS Architecture

## Boundary

REOS is implemented as an isolated feature module under src/features/reos.

The REOS module owns:

- REOS domain types
- REOS services
- REOS components
- REOS pages
- REOS route definitions
- REOS operational workflow and audit rules

The REOS module does not own:

- Application authentication
- Supabase configuration
- Application layout outside REOS
- Direct Remit source data

## Ownership Model

Direct Remit remains the source of truth for batches.

REOS owns operational workflow and audit only.

Direct Remit Officer owns the batch lifecycle:

- Upload batch
- Validate batch
- Create Shared Batch
- Assign Shared Batch to a branch
- Download proof-of-payment files
- Upload proofs back to Direct Remit

Operations Manager owns the system lifecycle:

- Users
- Branches
- Audit
- Reports
- Dashboards
- Settings
- Administrative Shared Batch reassignment override

Branch Officer owns branch transaction processing:

- View only batches assigned to their branch
- Process assigned transactions
- Upload proof-of-payment screenshots
- Complete transactions after at least one proof exists
- Return transactions with a predefined Return Reason

## Active Module

The active module is defined by CURRENT_SPRINT.md.

For Sprint 6, Credit-to-Account Processing is in scope.

## Workflow Constraints

- One Shared Batch is assigned to exactly one branch.
- Shared Batches cannot be split across multiple branches.
- Assignment is manual.
- A Shared Batch is locked immediately after assignment.
- Branch Officers cannot assign or reassign Shared Batches.
- Operations Manager reassignment is an administrative override.
- Imported transaction data is read-only during processing.
- Proof uploads are temporary image files.
- Proof metadata is retained permanently.
- Cleanup is represented in the proof metadata model, but no scheduler is implemented.

## Persistence

No persistence is implemented unless explicitly approved by the active sprint.
