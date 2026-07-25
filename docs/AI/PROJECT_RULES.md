# REOS Project Rules

## Project

REOS (Remit Exchange Operations System)

Internal Operations Portal for Remit Exchange.

---

## Scope

Build only approved REOS functionality.

Do not redesign business rules.

Do not introduce generic ERP, CRM, Treasury, or Banking Core features.

---

## Technology

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- React Router
- shadcn/ui

---

## Development Rules

- Keep modules independent.
- Keep business logic inside REOS.
- Follow existing project structure.
- TypeScript must compile.
- Do not modify unrelated files.

---

## Git

Every sprint must end with:

- Build
- Review
- Git Status
- Commit

---

## Coding Rules

- Strong typing.
- Small reusable components.
- No duplicated code.
- No mock business data.
- No placeholder business logic.

---

## Forbidden

Do NOT:

- Add Treasury features.
- Add Cash Pickup.
- Add generic banking workflows.
- Add features outside the current sprint.
- Change frozen business rules.