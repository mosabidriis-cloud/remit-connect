# REOS – Project Scope

## Purpose

REOS (Remit Exchange Operations System) manages operational workflows after Direct Remit shares payout batches.

REOS is not a banking system, ERP, or accounting platform.

---

# Core Workflow

Direct Remit

↓

Shared Batches

↓

Batch Assignment

↓

Credit to Account Workspace

↓

Transaction Processing

↓

Proof of Payment

↓

Completion

---

# Current Development Stage

Completed

- Operations Control Center
- Shared Batches
- Batch Assignment
- Credit to Account Workspace (Read Only)

---

# Development Rules

- Reuse existing architecture.
- Reuse shared UI components.
- Do not redesign working modules.
- Replace complete files only.
- Verify build after every milestone.
- Stop after each approved milestone.

---

# Out of Scope

Do not implement unless specifically requested:

- Reports
- Analytics
- OCR
- AI
- Notifications
- Audit
- Roles
- Users
- Settings

---

# Business Rules

- Shared Batches originate from Direct Remit.
- Branches process assigned batches.
- Credit to Account is branch-driven.
- Proof of Payment is uploaded after payment.
- Operations Manager assigns batches.
- Treasury supports branch funding.
- REOS replaces the current WhatsApp proof-sharing workflow.

---

# Coding Standards

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- shadcn/ui

Maintain consistent architecture throughout the project.