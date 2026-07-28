# CURRENT SPRINT

Version: 1.0

Status: Active

## Module

Sprint 9 - Reporting Module

## Authority

This document is the authoritative definition for the active REOS module.

REPORTING_STANDARDS.md is the canonical reporting standard for this sprint.

## Business Goal

Build the REOS Reporting Module using the canonical reporting standard.

Every report must answer one business question.

Reports must use only the categories, layout, filters, export rules, table behavior, visibility guidance, and design principles defined in REPORTING_STANDARDS.md.

## Users

Recommended visibility is defined in REPORTING_STANDARDS.md.

No new permissions are introduced in this sprint.

## Scope

Create operational reports only.

Reports must follow REPORTING_STANDARDS.md.

## Required Standard

All reporting implementation must reference REPORTING_STANDARDS.md instead of duplicating reporting rules in this sprint document.

## Allowed Directories

src/features/reos

docs/AI

## Out of Scope

Anything outside REPORTING_STANDARDS.md is out of scope unless explicitly approved by a future sprint.

## Acceptance Criteria

- Module compiles.
- Production build succeeds.
- No previous sprint functionality is modified.
- No unrelated application modules are modified.
- Reports follow REPORTING_STANDARDS.md.
- Every report answers one business question.
