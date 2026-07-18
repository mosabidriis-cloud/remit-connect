# REOS (Remit Exchange Operations System)

## Master Specification

**Version:** 1.0  
**Status:** Active  
**Project Owner:** Mosab Adris  
**Repository:** remit-connect

---

# 1. Project Vision

REOS is an enterprise Operations Management System for Remit Exchange.

Its purpose is to centralize:

- Branch operations
- Cash management
- Liquidity monitoring
- Money transfer operations
- Compliance
- Reporting
- Management dashboards
- User administration

The system should be scalable, secure, maintainable, and suitable for future integration with external partners.

---

# 2. Technology Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- React Router
- shadcn/ui

---

# 3. Development Principles

- Build reusable components.
- Keep business logic separate from UI.
- Prefer composition over duplication.
- Make small, verified changes.
- Every feature must be testable.

---

# 4. User Roles

- System Administrator
- Operations Manager
- Branch Manager
- Branch Officer
- Compliance Officer
- Finance Officer

---

# 5. Core Modules

- Authentication
- Dashboard
- Branch Management
- Cash & Liquidity
- Transactions
- Reports
- Users & Roles
- Audit Logs
- Settings

---

# 6. Git Workflow

1. Create a feature branch.
2. Implement one task.
3. Test the application.
4. Commit with a meaningful message.
5. Push to GitHub.
6. Merge after review.

---

# 7. AI Workflow

1. Read the project.
2. Read AI_RULES.md.
3. Read this specification.
4. Explain the implementation plan.
5. Modify only approved files.
6. Verify the build.
7. Stop for review.

---

# 8. Current Milestone

Sprint 1 – Foundation

Current focus:

- Stabilize architecture
- Build reusable UI
- Improve dashboard
- Prepare for authentication
- Establish development standards

---

# 9. Future Integrations

- Western Union
- Ria
- TerraPay
- MoneyGram
- Internal reporting systems
- Business Intelligence dashboards

---

# 10. Definition of Done

A task is complete only when:

- Requirements are met.
- Code follows project standards.
- Project builds successfully.
- No unrelated files are changed.
- Changes are committed to Git.