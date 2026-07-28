# REOS Reporting Standards

## Purpose

REPORTING_STANDARDS.md is the canonical reporting standard for REOS.

Every report must answer one business question.

Reports are divided into only two categories:

1. Volume Reports
2. Performance Reports

No financial reporting is allowed.

## Report Categories

### Volume Reports

Business question:

"How much work?"

Approved examples:

- Shared Batches
- Transactions
- Completed Transactions
- Returned Transactions
- Ready for Download
- Downloaded Batches

### Performance Reports

Business question:

"How well was the work done?"

Approved examples:

- Branch Performance
- Officer Performance
- Average Processing Time
- Return Rate
- Proof Completion
- Workload Distribution

## Out of Scope

Reports must not include:

- Revenue
- Profit
- USD Processed
- FX Margin
- Commission
- Treasury
- Accounting
- Financial Analytics
- Forecasting
- AI Insights

## Report Layout Standard

Every REOS report must use this layout:

1. Header
2. Filters
3. Summary
4. Detail Table
5. Totals
6. Export Actions

### Header

The header must display:

- Report name
- Report category
- One business question answered by the report
- Generated time

### Filters

Filters must appear before the summary and detail table.

Filters must be reusable across reports where applicable.

### Summary

The summary must contain only the minimum metrics needed to answer the report's single business question.

### Detail Table

The detail table must show the operational records behind the summary.

### Totals

Totals must summarize count-based or performance-based columns only.

Totals must not introduce financial metrics.

### Export Actions

Export actions must appear after the report content or in a consistent report action area.

## Filter Standard

Approved reusable filters:

- Date Range
- Branch
- Batch Reference
- Lifecycle Status
- Officer
- Return Reason
- Transaction Status
- Search

Reports must use only relevant filters.

Reports must not add one-off filters unless the active sprint explicitly approves them.

## Export Standard

Supported export formats:

- Excel (.xlsx)
- PDF
- Print

CSV export is not supported.

Exported reports must preserve:

- Report name
- Applied filters
- Generated time
- Summary
- Detail table
- Totals

## Table Standard

Every report detail table must support:

- Sorting
- Pagination
- Empty State
- Loading State
- Totals Row
- Consistent Date Format
- Consistent Status Badges

### Sorting

Tables must define a default sort that supports the report's business question.

### Pagination

Tables must paginate large result sets.

Pagination must not change report totals.

### Empty State

Empty states must explain that no operational records match the selected filters.

### Loading State

Loading states must preserve the report layout while data is loading.

### Totals Row

Totals rows must summarize only columns that are meaningful to the report category.

### Date Format

Reports must use one consistent date and time format within the same report.

### Status Badges

Lifecycle and transaction statuses must be shown with consistent status badges.

## Permissions

This document recommends visibility only.

It does not change current authorization.

Recommended report visibility:

### Operations Manager

- May view Volume Reports.
- May view Performance Reports.
- May export approved report formats.

### General Manager

- May view read-only overview reports.
- May export approved report formats where current authorization allows.

### Branch Manager

- May view reports scoped to their branch where current authorization allows.

### Direct Remit Officer

- May view reports related to Direct Remit batch lifecycle and proof download where current authorization allows.

## Design Principles

Reports are generated from live operational data.

Operational entities remain the single source of truth.

Reports must never become the system of record.

Reports must not duplicate operational data.

Reports must not create reporting tables.

Reports must not introduce persistence.

Reports must not become dashboards.

Reports must not become financial analytics.

Reports must remain inside the approved REOS reporting categories.
