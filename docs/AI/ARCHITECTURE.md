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

- Application authentication
- Supabase configuration
- Application layout outside REOS
- Direct Remit source data

## Data Ownership

Direct Remit remains the source of truth for batches.

REOS owns operational workflow and audit only.

## Persistence Boundary

No persistence is implemented unless explicitly approved by the active sprint.
