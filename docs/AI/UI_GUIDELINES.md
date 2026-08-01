# UI Guidelines

## Purpose

UI_GUIDELINES.md is the canonical UI standard for REOS. It consolidates UI-related rules already approved elsewhere in docs/AI (CODING_RULES.md, REPORTING_STANDARDS.md, ARCHITECT_REVIEW_CHECKLIST.md). It does not introduce new business or design rules.

## Technology

React 19, Vite, TypeScript, Tailwind CSS v4, React Router, shadcn/ui. See CODING_RULES.md.

## Component Standard

- Keep components small and reusable.
- Prefer existing components over creating new ones.
- Avoid duplicated code.
- Actions shown must be role-based and respect the current user's approved role and permissions. See BUSINESS_RULES.md.

## Screen Standard

- Every screen must answer a business question.
- Navigation must be correct and consistent.

## Report Layout Standard

REOS report screens use this layout, in order: Header, Filters, Summary, Detail Table, Totals, Export Actions. See REPORTING_STANDARDS.md for full detail.

## Table Standard

Tables must support: sorting, pagination, empty state, loading state, a totals row where applicable, a consistent date format, and consistent status badges. See REPORTING_STANDARDS.md.

## Out of Scope

Do not introduce generic ERP, CRM, Treasury, or Banking Core UI patterns. Do not add UI for features listed as out of scope in BUSINESS_RULES.md.
