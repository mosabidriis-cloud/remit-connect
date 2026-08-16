# REOS Architecture Handover Document

Prepared 2026-08-15 for a lead-architect transition on REOS (Remit Exchange Operations System, repository `remit-connect`). This document is written for an incoming AI or human architect with zero prior context on this codebase. It is a synthesis of the canonical `docs/AI/**` framework and a direct repository/database inspection performed the same day (RC1 Product Readiness Review) — not a replacement for that framework. Where this document and any file under `docs/AI/**` disagree, treat it as a contradiction to report, not something to resolve by assumption (see "Governance Model" below).

No source code was written or modified to produce this document.

---

## 0. How This Repository Expects an Architect to Operate

Before anything else: this project runs on a **documentation-driven governance model**, not tribal knowledge. It matters more than any individual technical fact below, because it is what prevents scope creep and rule-drift as ownership changes hands.

- **`docs/AI/CLAUDE.md`** is the entry point. Required reading order: `CURRENT_SPRINT.md` → `PROJECT_STATE.md` → `ARCHITECTURE.md`, before touching any implementation file.
- **`CURRENT_SPRINT.md`** is the single source of truth for active scope. Where any other document conflicts with it, it governs.
- **`docs/AI/README.md`** is the documentation index — every canonical doc is listed there with its authority.
- **Decision Gate**: if a business decision is missing or unclear, the correct move is to stop and report the blocker, never to assume an answer.
- **Frozen rules never change silently.** Every rule change in this project's history is recorded as a numbered decision in `DECISIONS.md` with a date, context, and rationale — including the two known cases where a rule changed (DEC-014 superseding DEC-006) or a prior citation was found to be wrong (DEC-022's correction note). The pattern to follow: record the change, don't just make it.
- **Never commit or push without explicit instruction.** The working tree is routinely left in a validated, uncommitted state between milestones (`tsc`/build/lint clean) pending explicit approval to commit.
- **Every milestone updates the same seven documents**: `CURRENT_SPRINT.md`, `PROJECT_STATE.md`, `MODULE_STATUS.md`, `TECH_DEBT.md`, `DECISIONS.md` (when a real architectural decision was made), `ROADMAP.md`, and the relevant architecture doc. This is why the framework has stayed internally consistent across 22+ decisions and five out-of-sprint production-readiness phases — with one known exception, flagged in Section 5.

---

## 1. Project Goals & Scope

**What REOS is.** An internal, employee-only operations portal for Remit Exchange. It manages the operational workflow around Direct Remit payment batches — from import through branch payout to proof handoff and audit — for three fixed roles: Operations Manager, Direct Remit Officer, Branch Officer.

**What REOS is not.** REOS does not originate transactions and is not the system of record for them. Direct Remit is, and remains, the source of truth for Direct Remit batches (DEC-001). **REOS owns operational workflow and audit only.**

**Primary objective, in one line:** take a Direct Remit export, get every transaction paid out by the correct branch with proof captured, hand proof back to Direct Remit, and make the whole process auditable and reportable — without becoming a system of record, a treasury, or a financial-reporting tool.

### Strict boundaries — out of scope unless explicitly re-approved

From `BUSINESS_RULES.md`, verbatim:

- Treasury
- Cash Pickup
- Banking Core
- ERP
- CRM
- Generic approval workflows
- Generic workflow engine
- Notifications
- Supabase persistence
- Authentication changes
- Automatic cleanup scheduler

**Important nuance for the incoming architect:** two of these gates — Supabase persistence and Authentication changes — have since been formally, individually re-approved and exercised (see Section 4). That is the correct pattern: the blanket rule stays in force, and each exception is a named, dated decision, not a reinterpretation of the rule itself. Do not treat "we already did persistence once" as a standing license to add more persistence without a fresh decision.

Also out of scope, from `REPORTING_STANDARDS.md` (financial reporting is banned everywhere in REOS, not just in one module):

- Revenue, profit, USD processed, FX margin, commission, treasury, accounting, financial analytics, forecasting, AI insights.

And, by explicit prior business decision, not a technical limitation: **multi-source ingestion** (Western Union, RIA, MoneyGram, TerraPay) is descoped — Direct Remit is the only supported import source, and no parser exists for any other format.

---

## 2. Strict Business Rules

These are frozen. They must be preserved exactly; changing any of them requires a recorded decision in `DECISIONS.md`, not a silent implementation choice. Canonical source: `docs/AI/BUSINESS_RULES.md`.

### Approved Business Flow

1. Direct Remit Officer uploads a Direct Remit batch.
2. Direct Remit Officer validates the uploaded batch.
3. REOS parses beneficiary records.
4. REOS normalizes the Bank field into `bankName` and `accountNumber`.
5. REOS detects duplicate Direct Remit References and flags duplicates for manual review.
6. Direct Remit Officer creates a Shared Batch.
7. **Operations Manager** manually assigns the Shared Batch to one branch (DEC-014 — supersedes an earlier rule that gave this step to the Direct Remit Officer; the change is deliberate and recorded, not an inconsistency to "fix back").
8. The Shared Batch becomes locked immediately after assignment.
9. Branch Officer processes assigned transactions only.
10. Branch Officer uploads one or more proof-of-payment screenshots for completed transactions.
11. Direct Remit Officer downloads proof-of-payment files and uploads proofs back to Direct Remit.

### Role Boundaries (exactly three roles — do not add a fourth without a recorded decision)

- **Operations Manager** — owns the system lifecycle; manages users, branches, audit, reports, dashboards, settings, master data; assigns and reassigns Shared Batches; enterprise-wide visibility (frozen).
- **Direct Remit Officer** — owns the batch lifecycle; uploads, validates, creates Shared Batches; views completed batches; downloads and returns proofs. Does **not** process branch transactions and does **not** assign or reassign batches.
- **Branch Officer** — belongs to exactly one branch; processes and views only their own branch's assigned batches; uploads proofs; completes/returns transactions. Cannot assign/reassign, cannot edit imported data, cannot delete completed transactions, cannot manage users.

### Frozen Rules (verbatim)

- One User = One Role. One User = One Branch.
- Operations Manager has enterprise-wide visibility.
- Imported beneficiary data is read-only. Branch Officers cannot edit it.
- Direct Remit Reference is the operational transaction identifier.
- Bank field is parsed into `bankName` and `accountNumber`.
- Read-only transaction fields: Direct Remit Reference, Beneficiary Name, Bank Name, Account Number, Amount, Currency, Transaction Date.
- One Shared Batch is assigned to exactly one branch; Shared Batches cannot be split across branches.
- Batch assignment is manual. Batch becomes locked immediately after assignment.
- No manual amount entry. No transfer reference entry.
- A transaction may contain multiple proof-of-payment screenshots. Proof uploads are image files only.
- A transaction cannot be completed until at least one proof exists.
- Return Transaction requires a predefined Return Reason; comment optional.
- Proof-of-payment files are temporary, auto-deleted 90 minutes after upload (enforcement is currently incomplete — see Section 5). Only proof metadata remains permanently.
- **REOS's responsibility ends after the Direct Remit Officer downloads proof files.** Do not scope-creep into what Direct Remit does with them afterward.

### Domain constraints an architect must not relax without a decision

- Bank names are imported **as written**, unnormalized (DEC-010) — a deliberate choice, not an oversight; normalizing them is an operations judgment call with routing consequences.
- No financial figures (revenue/margin/commission/USD processed) may appear anywhere in REOS, including dashboards. Where this rule has been violated in the current build, it is tracked as a defect, not a feature — see Section 5.
- Liquidity account balances and funding amounts are classified as **operational capacity data, not financial reporting** (DEC-015) — this is a deliberately drawn line, not an implicit exception to the rule above; do not extend it further (e.g., to anything that sums into a revenue-shaped number) without a fresh decision.

---

## 3. Current Architecture

Canonical sources: `ARCHITECTURE.md`, `CODING_RULES.md`, plus each module's own design doc.

### Tech Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · React Router v7 · shadcn/ui · Supabase (Postgres, Auth, Storage, Edge Functions). No deployment pipeline, hosting target, or CI configuration was found anywhere in the documentation set reviewed — **this is an open item for the incoming architect to establish, not an oversight to assume away.**

### Module Boundary

REOS is an isolated feature module under `src/features/reos`. It owns its own types, services, components, pages, routes, and operational/audit rules.

It does **not** own, by default: Supabase project configuration, application layout outside REOS, Direct Remit's own data. One standing exception: REOS now owns its own authentication integration end to end (`reosAuthService.ts`, `profiles` table, route guards) rather than reusing the legacy, pre-existing `src/services/authService.ts` — that legacy file is a different, non-REOS auth path with a different role vocabulary and is **not** used by REOS (see Section 5 for a related security finding).

A second, entirely separate legacy application tree exists outside `src/features/reos` (`src/pages/branches`, `treasury`, `funding`, `auth`, `credit-account`, `controller`, `shared-batches`) — pre-existing, not built by REOS, and only partially investigated in this handover. Treat it as foreign territory until proven otherwise for each directory.

### Persistence Boundary

Default: no persistence beyond in-memory unless explicitly approved per instance (DEC-004). This gate has been exercised five times, each as its own recorded decision — not because the rule loosened, but because each was individually justified and approved. **As of this handover, no REOS operational store remains in-memory-only**; every real store is Supabase-backed. See Section 4 for the list.

### System Design — the five-stage operational pipeline

```
Shared Batch Upload → Branch Assignment → Branch Processing → Proof Management → Reporting/Dashboards
                                                    |
                                          Liquidity Management
                                        (wired into completion)
```

Two additional, structurally separate layers sit alongside this pipeline:

- **Import Intelligence / Operational Dataset** — an independent, additive ledger (`import_batches`, `import_beneficiaries`) for duplicate detection, reporting-period derivation, and data-coverage/historical-performance analytics. It is explicitly **not** the operational workflow's source of truth, and Branch Processing/Liquidity Management deliberately do **not** read through it (DEC-017) — they keep their own live state. Do not merge these two layers without a fresh decision; they were kept separate on purpose.
- **Audit Trail** — one append-only table (`audit_events`), written to directly by the service layer that performs each action (never by a page), with the actor's role resolved server-side. It is a pure write-and-persist layer with, as of this handover, **no read UI** — see Section 5, this is the single most important open item.

### The Reporting Projection Layer — the one architectural pattern to preserve above all others

`reportingProjectionService.ts` is the **only** module permitted to read operational state for reporting purposes. The dependency direction is strict and one-way:

```
Pages  →  reportService / dashboardService  →  reportingProjectionService  →  operational stores
```

No operational module may import the projection layer. No page or component may read a store directly. No page may aggregate data itself. This single rule is what prevents the specific class of defect this project has hit **four separate times** (Reporting and the Operations Dashboard both once had no reachable data source at all, invisible to `tsc`/build, only found by driving the app in a real browser). **Any change that lets a page or component reach around this layer to read a store directly should be treated as a regression, not a shortcut.**

### Database Structure (Supabase project `remit-connect`)

| Table | Owning module | Notes |
|---|---|---|
| `profiles` | Authentication | 1:1 with `auth.users`; role/branch/status |
| `shared_batches`, `beneficiaries`, `assignments` | Shared Batch / Assignment | `Assignment`'s transaction-list fields are a computed view over `beneficiaries`, not stored twice |
| `branch_processing_queue_items`, `proofs`, `branch_processing_status` | Branch Processing | branch-level lock is a **one-way** lock — see Section 5 |
| `payout_accounts`, `funding_events`, `funding_entries` | Liquidity Management | balance is the one field in REOS most likely to need careful handling — it does not reconstruct from anything else |
| `audit_events` | Audit Trail | append-only; no UPDATE/DELETE policy for any role, by design |
| `import_batches`, `import_beneficiaries` | Import Intelligence | independent ledger, see above |

Storage: one private bucket, `proof-of-payment`.

RLS helpers (both `SECURITY DEFINER`, to avoid self-recursion): `current_user_role()`, `current_user_branch_id()`.

### Authentication

Real Supabase Auth. The only path that provisions a real credential is the `admin-create-user` Edge Function (client JS cannot safely call the Admin API) — it self-authorizes to Operations-Manager-only, with a self-closing "first user becomes admin" bootstrap rule for an empty `profiles` table. Exactly three provisionable roles: `OPERATIONS_MANAGER`, `DIRECT_REMIT_OFFICER`, `BRANCH_OFFICER`.

---

## 4. Completed Work — Finalized and Approved

Everything below is implemented, verified live in a browser or via direct API calls at least once, and recorded in `DECISIONS.md`. Treat all of it as a stable foundation, not a draft.

**Core workflow (Sprints 10–17):** Enterprise UI shell; Shared Batch Upload with a real, production-file-verified import path (the real Direct Remit export now parses 63/63 transactions, up from 0/63 at the start of that effort); Branch Assignment via one canonical service (`branchAssignmentService.ts`, DEC-006); Branch Processing with full queue/proof/completion workflow; Proof Management's full `COMPLETED → READY_FOR_DOWNLOAD → DOWNLOADED` chain; Reporting and both dashboards migrated off a dead `location.state` data source onto the Projection Layer (DEC-007).

**Out-of-sprint modules:**
- **Liquidity Management** (DEC-015) — branch payout accounts, manual funding with full history, live balance consumption wired into transaction completion, its own dashboard and six report definitions. A pre-existing, unrelated legacy Treasury/Funding system was found and deliberately *not* reused — different grain, different (approval-gated) process, mocked data. That legacy system still exists in the repo, unreconciled — see Section 5.
- **Import Intelligence** (DEC-016) and the **Operational Dataset** layer above it (DEC-017) — REOS's first durable persistence: file fingerprinting, duplicate detection, reporting-period derivation, data coverage, historical performance.

**REOS v1.0 Production Readiness — all five phases complete:**
1. **Authentication & Authorization** (DEC-018) — real Supabase Auth, RLS, RBAC replace a development bypass.
2. **Operational Persistence**, three milestones (DEC-019/020/021) — every live operational store migrated from in-memory to Supabase, one module at a time, each independently verified across fresh browser sessions to prove real persistence, not just a successful write.
3. **Audit Trail** (DEC-022) — a real, append-only, correctly-attributed audit log for 18 action types, closing a previously-blocked report category.
4. **Production Hardening, first pass** — full internal lint cleanup (zero findings inside REOS), confirmed cross-branch RLS isolation via a real negative-path test with a positive control.
5. **Full end-to-end regression** — the entire chain proven working together, not just module by module, in one continuous session.

**Full decision log:** DEC-001 through DEC-022, all status `APPROVED`, in `docs/AI/DECISIONS.md`. Read that file in full before making any decision that might duplicate or reverse one of them — several early rules (e.g., initial-assignment ownership) already changed once, and the record of *why* is what prevents re-litigating settled questions.

---

## 5. Pending Review & Next Steps

An RC1 Product Readiness Review was completed the same day this handover was prepared (read-only; no code changed). Its full findings are the concrete, prioritized starting point for the incoming architect — review and approve (or challenge) each of these before building anything new.

### Immediate contradiction to resolve first

`MODULE_STATUS.md`'s "Production Readiness" row still reads **"NOT STARTED / 0%"** while `CURRENT_SPRINT.md`, `PROJECT_STATE.md`, `ROADMAP.md`, and `DECISIONS.md` all state Phases 1–5 are complete. This is a direct contradiction between two canonical documents in the same framework — the exact condition this project's own process defines as a hard stop. It has not yet been corrected. Fix it before relying on `MODULE_STATUS.md` for anything.

### Architectural decisions requiring your judgment (not yet resolved)

| Item | What needs deciding |
|---|---|
| `branch_processing_status` one-way lock | Once a branch finalizes to `COMPLETED`, nothing ever resets it to `PROCESSING`. Whether that is correct depends on REOS's real operating cadence (one batch ever vs. recurring cycles) — this has been carried as open debt across three persistence milestones without being escalated as a business decision. Escalate it. |
| Legacy Treasury/Funding/Branches tree | A complete, separate, unreconciled system answering the same "can this branch pay out" question as Liquidity Management, still present and reachable in the running app. Retire it, or formally re-scope it as a distinct surface — do not leave it in limbo. |
| `payout_accounts` INSERT policy | Broader than the UI's own intent, as a consequence of Postgres upsert mechanics (a Branch Officer can, via a crafted request, create a payout account for their own branch — something only the UI restricts to Operations Manager). Currently accepted as low-risk for a single-tenant internal app; get that acceptance in writing from whoever owns security sign-off, or tighten it. |
| Seven open Decisions (D-1, D-2, D-3, D-7, D-8, D-9, and half of D-6) | Report-category taxonomy, Executive/Branch dashboards, disabled exports, branch registry completeness, the unapproved `GENERAL_MANAGER` role, dead financial dashboard columns, and remaining Performance report definitions. Full detail in `DECISIONS.md` and `PROJECT_STATE.md`'s "Active Constraints" section. |

### Concrete gaps to build (foundation is sound; these are finishing work, not redesign)

1. **Audit Trail has no UI.** The data model is genuinely correct — immutable, RLS-scoped, well-attributed — and nobody can view it without a direct database credential. This is the single largest gap found in the RC1 review.
2. **Report/dashboard export is completely disabled** (Excel/PDF/Print are non-functional placeholders), in direct violation of `REPORTING_STANDARDS.md`'s own Export Standard.
3. **The Operations Dashboard shows three permanently-`$0.00` financial columns** (USD Value, Revenue, USD Processed) that should never have existed per `REPORTING_STANDARDS.md` — visible to every viewer, reads as broken.
4. **`USER_CREATED` audit events intermittently fail to persist**, root cause not fully isolated in the prior investigation (see `TECH_DEBT.md`, "Audit Trail").
5. **No admin password-reset path** — the first real production lockout has no supported recovery short of direct database access.
6. **Zero automated tests exist anywhere in the repository** — no test script, no runner, no `*.test.*`/`*.spec.*` file. Every milestone above was verified exactly once, by a hand-written script, then deleted. This is the largest standing technical risk carried into this handover.

### Recommended sequence

The RC1 review proposes: an immediate documentation/decision-hygiene pass (the contradiction above, plus the open decisions), then export + a minimal Audit Trail viewer, then a minimal automated regression suite before scaling past a pilot. Full prioritized detail (P0/P1/P2) is available on request — this document intentionally keeps that breakdown out to stay a handover of *state*, not a re-statement of the full review.

---

## Where to Go From Here

1. Read `docs/AI/CLAUDE.md`, then `CURRENT_SPRINT.md`, then `PROJECT_STATE.md`, then `ARCHITECTURE.md` — in that order, as the framework itself requires.
2. Read `docs/AI/DECISIONS.md` in full — every rule that looks surprising in this document has its reasoning recorded there.
3. Treat the "Pending Review & Next Steps" section above as your starting backlog, not a suggestion list — nothing in it requires new architecture, only decisions and finishing work.
4. Preserve the governance model in Section 0. It is the reason this handover document could be written accurately at all.
