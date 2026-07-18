# REOS BUSINESS RULES
**Remit Exchange Operations System (REOS)**

Version: 1.0
Status: Active
Owner: Operations Department
Last Updated: July 2026

---

# Purpose

This document defines the operational business rules used throughout REOS.

All application logic must follow these rules. Business rules take precedence over UI implementation.

---

# 1. Branch Operations

## Branch Status

### Open
- Branch is operating normally.
- All approved services are available.

### Limited Liquidity
- Branch liquidity falls below the minimum threshold.
- Branch can continue operating with restrictions.

### Closed
- Branch is outside operating hours or manually closed.
- No customer transactions are allowed.

### Maintenance
- Branch is temporarily unavailable.
- Transactions are disabled.

---

# 2. Liquidity Management

## Supported Currencies

- USD
- SDG

Future:
- AED
- SAR
- EUR

## Liquidity Health

Healthy
- Available Liquidity ≥ 70%

Warning
- Available Liquidity 40%–69%

Critical
- Available Liquidity < 40%

## Minimum Threshold

Each branch must maintain a configurable minimum liquidity level.

When liquidity falls below the threshold:

- Generate an alert.
- Display warning on Dashboard.
- Highlight branch in Branch Management.

---

# 3. Treasury Rules

Treasury is responsible for:

- Funding branches.
- Monitoring liquidity.
- Approving large transfers.
- Managing vault balances.

Future versions will support:

- Funding Requests
- Treasury Approval Workflow
- Funding History

---

# 4. Cash Management

Each branch maintains:

- USD Cash
- SDG Cash
- Total Liquidity
- Daily Cash Position

Cash balances must never be negative.

---

# 5. Transaction Rules

Every transaction must include:

- Branch
- Operator
- Date & Time
- Currency
- Amount
- Status
- Reference Number

Transaction Status:

- Pending
- Completed
- Cancelled
- Reversed

---

# 6. Exchange Rate Rules

Exchange rates are maintained centrally.

Rules:

- One active rate per currency pair.
- Every rate change is timestamped.
- Historical rates cannot be modified.

Future:

- Approval workflow
- Multi-level authorization
- Scheduled rate activation

---

# 7. Compliance Rules

Every transaction requires:

- Customer verification (KYC)
- AML screening
- Audit trail
- User accountability

Future:

- Sanctions screening
- Risk scoring
- Automated compliance alerts

---

# 8. User Roles

## Operations Manager

- Full operational access
- Dashboard
- Reports
- Liquidity
- Branch Management

## Branch Manager

- Branch dashboard
- Branch transactions
- Liquidity visibility

## Branch Officer

- Daily transactions
- Customer operations

## Treasury

- Branch funding
- Liquidity management

## Compliance

- AML monitoring
- KYC review
- Audit reporting

System Administrator

- User management
- Configuration
- Security

---

# 9. Operational KPIs

Dashboard KPIs include:

- Total Transactions
- Total Outward Amount
- Total Inward Amount
- Active Branches
- Branches Below Liquidity Threshold
- Daily Profit
- Monthly Profit
- Average Transaction Value
- Transaction Growth
- Branch Performance Ranking

---

# 10. Alerts

Critical alerts:

- Branch liquidity critical
- Branch offline
- Treasury funding required
- Large transaction
- Compliance exception

Warning alerts:

- Low liquidity
- High transaction volume
- Delayed approval
- Exchange rate review required

---

# 11. Audit Rules

All business actions must be auditable.

Audit records include:

- User
- Date & Time
- Action
- Previous Value
- New Value
- Branch
- IP Address (future)

Audit logs are immutable.

---

# 12. Business Principles

REOS follows these principles:

1. Business rules before UI.
2. Service layer owns business calculations.
3. React components are presentation only.
4. All operational decisions are traceable.
5. Every important action is auditable.
6. Strong typing for all business entities.
7. Reuse existing components before creating new ones.
8. Build small, verify, then expand.
9. Maintain a single source of truth for business logic.
10. Enterprise scalability over short-term convenience.

---

# Future Modules

- Treasury Management
- Liquidity Forecasting
- Vault Management
- Branch Funding Requests
- Exchange Rate Management
- Customer Management
- Transaction Monitoring
- AML & Compliance
- Financial Reporting
- Executive Dashboard
- Notifications & Alerts
- Workflow & Approvals
## Treasury Risk Management

### SDG Exposure Policy

Cash held in SDG is considered a risk exposure.

Objective:
- Minimize idle SDG balances across all branches.
- Maximize productive use of available SDG liquidity.

### Branch Cash Limit

Target end-of-day SDG balance per branch:

- Preferred: ≤ 10,000,000 SDG
- Maximum: 15,000,000 SDG

Branches exceeding 15,000,000 SDG are considered overfunded.

### System Actions

When a branch exceeds the maximum SDG balance:

- Flag the branch as "Excess SDG".
- Show a Treasury alert on the dashboard.
- Increase the branch's priority for funding outbound transactions.
- Prioritize assigning new outward transaction files to consume the excess SDG.
- Continue prioritizing the branch until its balance returns below the preferred threshold.

### Dashboard Indicators

Display:
- Branches with Excess SDG
- Total Excess SDG
- Branch Priority Score
- Recommended branches for new transaction allocation