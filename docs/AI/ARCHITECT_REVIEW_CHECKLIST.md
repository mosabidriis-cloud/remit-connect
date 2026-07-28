# REOS Architect Review Checklist

## Purpose

This document defines the mandatory architecture review performed after every sprint implementation and before any commit is approved.

---

# 1. Scope Review

- Is the implementation fully inside the active sprint?
- Is there any scope creep?
- Were unrelated modules modified?

Result:
- PASS
- FAIL

---

# 2. Business Rules Review

Verify implementation against:

- BUSINESS_RULES.md

Questions:

- Were business rules preserved?
- Were any frozen rules modified?
- Are user permissions respected?
- Are lifecycle rules respected?

Result:
- PASS
- FAIL

---

# 3. Architecture Review

Verify implementation against:

- REOS_ARCHITECTURE.md

Questions:

- Does the implementation respect module boundaries?
- Is business logic placed correctly?
- Is the architecture unchanged?
- Were existing services reused?
- Were reusable components preferred?

Result:
- PASS
- FAIL

---

# 4. Lifecycle Review

Verify implementation against:

- LIFECYCLE.md

Questions:

- Are only valid lifecycle transitions allowed?
- Are invalid transitions prevented?
- Are lifecycle states represented consistently?

Result:
- PASS
- FAIL

---

# 5. UI Review

Questions:

- Does every screen answer a business question?
- Is navigation correct?
- Are actions role-based?
- Are components reusable?

Result:
- PASS
- FAIL

---

# 6. Code Review

Questions:

- Strong TypeScript?
- No duplicated logic?
- No placeholder business logic?
- No unnecessary dependencies?
- Existing code reused?

Result:
- PASS
- FAIL

---

# 7. Documentation Review

Questions:

- CURRENT_SPRINT.md updated?
- CHANGELOG.md updated?
- ROADMAP.md updated (if applicable)?
- Documentation synchronized?

Result:
- PASS
- FAIL

---

# 8. Validation Review

Required:

- TypeScript build passes
- Production build passes

Commands:

npx tsc -p tsconfig.app.json --noEmit --incremental false

npm run build

Result:
- PASS
- FAIL

---

# 9. Git Review

Questions:

- Clean git status?
- Logical commit?
- Appropriate tag?

Result:
- PASS
- FAIL

---

# Final Decision

APPROVED

or

REJECTED

Every sprint must pass every section before merge.
