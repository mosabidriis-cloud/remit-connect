# Development Standards

This document captures the project-level development guidance that was previously held in PROJECT_RULES.

## Project Scope

- Build only approved REOS functionality.
- Do not redesign business rules.
- Do not introduce generic ERP, CRM, Treasury, or Banking Core features.
- Do not add features outside the current sprint.
- Do not change frozen business rules.

## Technology Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- React Router
- shadcn/ui

## Development Rules

- Keep modules independent.
- Keep business logic inside REOS.
- Follow the existing project structure.
- TypeScript must compile.
- Do not modify unrelated files.

## Coding Rules

- Use strong typing.
- Keep components small and reusable.
- Avoid duplicated code.
- Do not use mock business data.
- Do not add placeholder business logic.

## Git Expectations

At the end of each sprint, complete:

- Build
- Review
- Git Status
- Commit

## Forbidden Changes

Do NOT:

- Add Treasury features.
- Add Cash Pickup.
- Add generic banking workflows.
- Change frozen business rules.
