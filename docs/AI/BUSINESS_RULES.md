# REOS Business Rules

## Project

REOS (Remit Exchange Operations System)

Internal Operations Portal for Remit Exchange.

---

# Approved Business Flow

Direct Remit Officer

↓

Upload Batch

↓

Validate Batch

↓

Create Shared Batch

↓

Assign Beneficiaries to Branches

↓

Branch Officer

↓

Credit-to-Account Processing

↓

Upload Receipt Screenshot

↓

Completed

OR

Returned

↓

Return Reason

---

# Approved Roles

## Operations Manager

- Full operational visibility.
- Manage users.
- Manage branches.
- Manage master data.
- Monitor all operations.

---

## Direct Remit Officer

- Upload Direct Remit batches.
- Validate uploaded batches.
- Create Shared Batches.
- Assign beneficiaries to branches.

---

## Branch Officer

- Belongs to one branch.
- Processes assigned beneficiaries.
- Performs Credit-to-Account.
- Uploads receipt screenshots.
- Marks Completed or Returned.

---

# Frozen Rules

One User = One Role.

One User = One Branch.

Exception:

Operations Manager has enterprise-wide visibility.

Imported beneficiary data is read-only.

Direct Remit Reference is the operational transaction identifier.

Bank field is parsed into:

- bankName
- accountNumber

Branch Officers cannot edit imported beneficiary information.

Receipt Screenshot is proof of payment.

Return Reason is required when a beneficiary is returned.

---

# Out of Scope

No Treasury.

No Cash Pickup.

No Banking Core.

No ERP.

No CRM.

No generic approval workflows.

No generic workflow engine.

No notifications unless explicitly approved.

---

# Source of Truth

When business rules conflict with implementation,
the business rules always win.

Do not redesign approved workflows.

Do not invent missing business processes.