# Implementation Workflow

This document captures the implementation workflow guidance that was previously held in CODEX instructions.

## Before Making Changes

1. Read the following documents in order:
   - PROJECT_RULES.md
   - BUSINESS_RULES.md
   - REOS_ARCHITECTURE.md
   - CURRENT_SPRINT.md

2. Never redesign approved business rules.

3. Stay inside the sprint scope.

4. Modify only the files required by the sprint.

5. Prefer existing components over creating new ones.

6. Keep React components small.

7. Keep TypeScript strongly typed.

8. Never introduce generic ERP features.

## Required Reporting

Before concluding implementation work, report:

- Files created
- Files modified
- Assumptions
- Build status

## Decision Gate

Stop and report a blocker if a business decision is missing or unclear.
