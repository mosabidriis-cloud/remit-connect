# Authentication & Authorization

Canonical architecture for REOS Production Readiness Phase 1: replacing the development authentication bypass with real Supabase Auth, real roles, and real Row-Level Security. This is the foundation every later phase (persistence, audit trail, hardening) depends on - Phase 2's RLS policies need a real `auth.uid()` to key on, and the audit trail needs a real actor to attribute actions to.

## 1. Existing Architecture Review (performed before any code)

- **`src/services/authService.ts`** already wraps `supabase.auth` (login/logout/getSession/getCurrentUser/onAuthStateChange) and is fully functional - but it is **not reused as-is**. Two reasons:
  1. It maps to `src/auth/types.ts`'s `Role = "Operations Manager" | "Direct Remit Officer" | "Credit to Account Officer"` - a different vocabulary than REOS's own `ReosUserRole = "OPERATIONS_MANAGER" | "DIRECT_REMIT_OFFICER" | "BRANCH_OFFICER"` (`types/user.ts`). `"Credit to Account Officer"` isn't a REOS role at all - this is the legacy/parallel app's type (`src/pages/credit-account/**`), the same class of divergence LIQUIDITY_MANAGEMENT.md Section 3 and IMPORT_INTELLIGENCE.md Section 3 already found and declined to reuse.
  2. It reads role from `user.user_metadata.role` - **Supabase user metadata is self-editable by the user** via `supabase.auth.updateUser()`. Sourcing an authorization role from data the subject themselves can write is a real privilege-escalation hole, not a style preference. REOS's role must come from a server-controlled table instead.
  - `src/auth/types.ts`/`src/services/authService.ts` are left untouched - ARCHITECTURE.md states REOS does not own application authentication, and the legacy pages under `src/pages/**` may still depend on them.
- **`ARCHITECTURE.md`'s "REOS module does not own: Application authentication"** is superseded by this explicit instruction, the same way DEC-016 superseded "no persistence unless explicitly approved." Recorded as DEC-018 (Section 9) and reflected in ARCHITECTURE.md.
- **`ProtectedReosRoute`** (`AppRoutes.tsx`) checks only `localStorage.getItem("reos-auth") === "true"` - no session, no role, identical gate on every route including `/reos/administration/users/create` (Operations-Manager-only per BUSINESS_RULES.md) and `/reos/branches/:branchId/processing` (Branch-Officer-only). Replaced with a real, role-aware gate (Section 5).
- **`userService.ts`** is already async and Map/array-shaped exactly like every other REOS store (`sharedBatchStore.ts`, `liquidityStore.ts`) - its function signatures (`listUsers`, `getUserById`, `createUser`, `updateUser`, `setUserLocked`) are preserved; only the implementation moves from an in-memory array to `profiles` table queries. This is the first store migrated under the "preserve existing interfaces wherever practical" rule that governs Phase 2 too.
- **`UserForm.tsx`'s "Password Hash" field** was a raw, unhashed text input - typed text went straight into `User.passwordHash`, never used by anything. This was never real authentication; removed rather than preserved (Section 4).
- **11 files carry hardcoded actor/role literals** (`"OPERATIONS_MANAGER"`, `"current-user"`, `"BRANCH_OFFICER"`, `"DIRECT_REMIT_OFFICER"`, `"local-validation-engine"`, `"REOS"`) standing in for a session that didn't exist yet - full inventory in Section 6. Every one is replaced with a real session value.
- **Two dead type stubs**, `types/permission.ts`/`types/rolePermission.ts` (a generic `Permission`/`RolePermission` scaffold, never imported anywhere) - not built on. REOS has exactly three fixed roles with capabilities enumerated in BUSINESS_RULES.md, not a dynamic permission matrix; introducing one would be an abstraction with no consumer, the "half-finished implementation" this project's own conventions rule out.

## 2. Data Model

One new table, `public.profiles`, one-to-one with `auth.users` (Supabase Auth's own table, which REOS does not and cannot modify directly):

```sql
profiles
  id uuid primary key references auth.users(id) on delete cascade
  employee_id text not null
  username text not null unique
  full_name text not null
  organization text not null default 'REOS'
  role text not null              -- OPERATIONS_MANAGER | DIRECT_REMIT_OFFICER | BRANCH_OFFICER
  branch_id text                  -- required for BRANCH_OFFICER, null otherwise (matches ProjectionScope's existing contract)
  account text not null default ''
  status text not null default 'ACTIVE'   -- ACTIVE | INACTIVE
  account_locked boolean not null default false
  force_password_change boolean not null default true
  last_login_at timestamptz
  created_by uuid references auth.users(id)
  created_at timestamptz not null default now()
  last_updated_by uuid references auth.users(id)
  last_updated_at timestamptz not null default now()
```

Deliberately dropped from the old `User` type: `passwordHash` (Supabase Auth owns credentials; a second copy is redundant and was never real), `failedLoginAttempts`/`passwordChangedAt` (not observable from client-side Supabase Auth APIs without additional server-side tracking this phase doesn't build - recorded as tech debt, not silently faked).

## 3. Role Storage and the RLS Recursion Problem

A naive RLS policy on `profiles` that queries `profiles` to check the caller's own role causes infinite recursion (a well-documented Supabase pitfall). Fixed with a `SECURITY DEFINER` helper, the standard pattern for this exact problem:

```sql
create function public.current_user_role() returns text
language sql security definer stable set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
```

`SECURITY DEFINER` runs with the function owner's privileges, bypassing RLS internally for this one read, so the outer policy's own RLS check never re-triggers itself.

**Policies:**
- `profiles_select_self_or_admin` - a user may read their own row, or any row if `current_user_role() = 'OPERATIONS_MANAGER'` (BUSINESS_RULES.md: only Operations Manager "manages users").
- `profiles_admin_write` - INSERT/UPDATE/DELETE restricted to `current_user_role() = 'OPERATIONS_MANAGER'`. Client-side `createUser` doesn't need this policy at all - it goes through the `admin-create-user` Edge Function (Section 4), which uses the service-role key and bypasses RLS entirely, because creating a `profiles` row is only half the job; provisioning the matching `auth.users` credential is the other half, and that requires the Admin API.
- `public.clear_force_password_change()` - a second `SECURITY DEFINER` RPC, narrowly scoped to flip exactly one column (`force_password_change = false`) for `auth.uid()`. A user finishing their forced first-password-change needs to clear this flag on their own row without a general self-UPDATE policy that would also let them edit their own `role`.

**Import Intelligence RLS, tightened.** DEC-016's `import_batches`/`import_beneficiaries` policies were permissive to `anon` because no real session existed - TECH_DEBT.md flagged this explicitly as "revisit when real authentication is approved." That moment is now. Both policies are narrowed to `authenticated` users whose `current_user_role()` is `OPERATIONS_MANAGER` or `DIRECT_REMIT_OFFICER` (the two roles with any stated interest in imports/reporting per BUSINESS_RULES.md) - `anon` access is removed entirely.

## 4. Provisioning Credentials - the `admin-create-user` Edge Function

Client-side Supabase JS **cannot** safely create an `auth.users` row with a password - that requires the Admin API (`supabase.auth.admin.createUser`), which requires the service-role key, which must never ship to the browser. The correct, standard pattern is a Supabase Edge Function holding that key server-side.

`admin-create-user` (Deno, **`verify_jwt: false`** - see "Why platform JWT verification is off" below):
1. Counts `profiles`. If zero, this is the **bootstrap** case (see below); otherwise the caller must resolve to `OPERATIONS_MANAGER`.
2. If not bootstrap: reads the caller's bearer token from the `Authorization` header, validates it itself via a service-role client's `auth.getUser()`, then looks up that user's `profiles.role`. Rejects with 401/403 otherwise - the function does not trust the caller's own claim of being an admin, and does not trust the platform to have already verified the token, because it verifies it itself.
3. Calls `admin.createUser({ email, password: initialPassword, email_confirm: true })` - `email_confirm: true` so the account is usable immediately, since this environment cannot verify outbound email delivery is configured, and Section 5's password flow doesn't depend on it.
4. Inserts the `profiles` row (service-role client bypasses RLS), with `force_password_change: true` always set on creation, `created_by`/`last_updated_by` set to the caller's own id (`null` for a true bootstrap call with no session at all).
5. Returns the created profile. Any failure after step 3 (e.g., the profile insert fails) rolls back the created auth user, so a create attempt never leaves an orphaned credential with no profile.

**Bootstrap: the "first user becomes admin" rule.** REOS ships with zero users - the normal `OPERATIONS_MANAGER`-only rule cannot be satisfied by anyone until one exists. When `profiles` is completely empty, this function allows the very first account to be created by any caller, session or not, and that first account must be `OPERATIONS_MANAGER`. Self-closing: this branch can never fire again once one profile exists, which happens as a side effect of the very first successful call. This is a standard, permanent pattern (the same one Django's `createsuperuser` or Rails seed scripts encode as a separate command), not a one-time hack to be reverted later.

**Why platform JWT verification (`verify_jwt`) is off.** Supabase's platform-level JWT check would reject any request with no bearer token before the function body ever runs - which would make the bootstrap case (a caller with no session, because nothing exists yet to sign in as) impossible to reach at all. The function instead implements its own equivalent authentication in step 2, so turning the platform check off does not weaken anything for the non-bootstrap path; it only makes the bootstrap path reachable.

**Why a set initial password, not an email invite:** `admin.inviteUserByEmail` depends on the project's SMTP configuration, which cannot be verified or safely exercised in this environment without sending a real email to a real address - a genuine external side effect, not a reversible local action. It also proved to have a strict rate limit that broke repeated verification runs. An Operations Manager setting an initial password directly, combined with the mandatory `force_password_change` flag (Section 5), delivers the same security property (the operator never keeps using an admin-chosen password) without that dependency, and is fully testable end-to-end in a browser.

**CORS.** Deno's `Deno.serve` adds no CORS headers by default. A browser's preflight `OPTIONS` request to a bare edge function fails with no `Access-Control-Allow-Origin` header, which surfaces to the app as `Failed to send a request to the Edge Function` - found during real browser verification (Section 11), invisible to any server-side or curl-based test since CORS is purely a browser-enforced mechanism. Fixed by answering `OPTIONS` directly and attaching `Access-Control-Allow-Origin`/`-Headers`/`-Methods` to every response.

`userService.createUser` calls this function (`supabase.functions.invoke("admin-create-user", ...)`) instead of an in-memory push. `updateUser`/`setUserLocked` call `supabase.from("profiles").update(...)` directly - the `profiles_admin_write` RLS policy authorizes this for an Operations Manager session without needing the Edge Function, since no credential is being created.

## 5. Session, Route Gating, and the Forced-Password-Change Flow

- **`services/reosAuthService.ts`** (REOS-scoped, distinct from `src/services/authService.ts` per Section 1) - `login`, `logout`, `getSession`, `onAuthStateChange`, `changePassword`, `getDefaultLandingPath`, each working with a `ReosSession` (`types/session.ts`): `{ userId, email, role: ReosUserRole, branchId, fullName, status, forcePasswordChange }`, built by joining the Supabase Auth session with a `profiles` read.
- **`layout/reosAuthContext.ts`** (context + `useReosSession()` hook, split into its own file from the provider component - a file mixing component and non-component exports breaks React Fast Refresh) and **`layout/ReosAuthProvider.tsx`** (`ReosAuthProvider`, and `ReosAuthProviderOutlet` - the actual React Router element used, `<ReosAuthProvider><Outlet/></ReosAuthProvider>`) - one provider instance wraps the entire `/reos/*` route subtree via a parent layout route, not re-created per page. Exposes `{ session, loading, signOut, refresh }`.
- **`layout/RouteGuards.tsx`** - the actual gating, as nested-route elements (not a single component with an `allowedRoles` prop, which the initial design sketched but proved awkward against React Router's nested-route model):
  - `ReosSessionGate` - the `/reos` parent route's element. No session -> `/login`. `INACTIVE`/`accountLocked` -> `/login` (checked here, not just at login, so a deactivation takes effect immediately). `forcePasswordChange` -> `/reos/change-password`. Otherwise renders `<ReosLayout><Outlet/></ReosLayout>` once for every child route.
  - `ReosIndexRedirect` - the `/reos` index route; sends each role to the first page it can actually reach (`getDefaultLandingPath`), not a hardcoded `/reos/dashboard` a Direct Remit Officer or Branch Officer can't open.
  - `ReosChangePasswordGate` - wraps `/reos/change-password` itself, which sits outside `ReosSessionGate` (it cannot be a child of the gate that redirects to it - that would loop).
  - `RoleGate` - wraps an individual route element with `roles: ReosUserRole[]`; renders a plain "You are not authorized to view this page" message (not a silent redirect) so a misrouted click is diagnosable.
  - `BranchGate` - wraps Branch Processing/Transaction Processing routes; `session.role === "OPERATIONS_MANAGER" || session.branchId === routeBranchId`.
- **Route -> role map** (synthesized from BUSINESS_RULES.md's Approved Roles, Section 6 below), applied per-route in `AppRoutes.tsx`, with `OPERATIONS_MANAGER` always additionally allowed everywhere it isn't the primary owner already, matching "owns the system lifecycle": Dashboard/Reports/Assignment/Liquidity/Administration -> Operations Manager; Shared Batch Upload/Proof Download/Import Intelligence -> Direct Remit Officer (+ Operations Manager); Branch Processing/Transaction Processing -> Branch Officer, own branch only (+ Operations Manager, any branch).
- **Forced password change**: `LoginPage.tsx` calls `reosAuthService.login`; if the returned session's `forcePasswordChange` is true, navigates to `/reos/change-password` directly (`ReosSessionGate` also enforces this independently for any other entry point). `ChangePasswordPage.tsx` calls `supabase.auth.updateUser({ password })`, then the `clear_force_password_change()` RPC, then **`refresh()`** on the auth context before navigating onward - see Section 11 for why the explicit refresh is required, not optional.
- **Post-login/post-change landing**: `getDefaultLandingPath(session)` - Operations Manager -> `/reos/dashboard`; Direct Remit Officer -> `/reos/shared-batches/upload`; Branch Officer -> their own branch's processing queue. Used by `LoginPage`, `ChangePasswordPage`, and `ReosIndexRedirect` so all three agree.

## 6. Route -> Role Map (applied interpretation, not stated verbatim in BUSINESS_RULES.md)

BUSINESS_RULES.md's Approved Roles section describes capabilities, not routes. The mapping below is this phase's concrete interpretation, applied consistently:

| Route | Allowed | Reasoning |
|---|---|---|
| `/reos/dashboard`, `/reos/reports` | Operations Manager | "Manages... reports, dashboards" |
| `/reos/shared-batches/upload`, `/proof-download`, `/reos/import-intelligence*` | Direct Remit Officer, Operations Manager | "Uploads... Validates... Creates Shared Batches... Downloads proof-of-payment files" |
| `/reos/shared-batches/assignment` | Operations Manager | "Assigns Shared Batches to branches (DEC-014)" |
| `/reos/liquidity*` | Operations Manager | Matches the actor already hardcoded throughout Liquidity Management; DEC-015 treats balances as operational capacity data Operations Manager owns |
| `/reos/branches/:branchId/processing*` | Branch Officer (own branch only), Operations Manager (any branch) | "Belongs to one branch. Processes assigned transactions only" |
| `/reos/administration/users*` | Operations Manager | "Manages users" |

## 7. The Embedded Assignment Panel - a Pre-Existing Design Wrinkle, Not a New Contradiction

`SharedBatchUploadPage.tsx` renders a `BranchAssignmentPanel` immediately after Confirm Upload, calling `assignSharedBatchToBranch` with a hardcoded `actorRole: "OPERATIONS_MANAGER"`. That action is legitimately Operations-Manager-only (DEC-014), enforced in `branchAssignmentService.ts` regardless of what the UI does. With a real session, a Direct Remit Officer reaching this page (the role this route is gated to) would have their real role passed through and the service would correctly reject the call - previously invisible because the literal always claimed to be an Operations Manager regardless of who was really using the page.

This is real auth correctly exposing an existing UI gap, not a new business-rule conflict: the dedicated `BranchAssignmentPage.tsx` (`/reos/shared-batches/assignment`) has always been the real, role-gated path for this action (established by this session's own dependency analysis, "Shared Batch Assignment Workflow Completed"). Fixed by making the embedded panel role-aware: rendered as an actionable form only when `session.role === "OPERATIONS_MANAGER"`; otherwise it shows an informational note directing to the dedicated Assignment page. No workflow logic changed - only which actor sees an actionable control versus a status note, which is exactly what "enable role-based permissions" asks for.

## 8. What Changes Where (files touched)

New: `docs/AI/AUTHENTICATION.md` (this file); migrations `reos_profiles_and_roles`, `reos_profiles_revoke_anon_execute`, `import_intelligence_tighten_rls`; Edge Function `admin-create-user`; `src/features/reos/types/session.ts`; `src/features/reos/services/reosAuthService.ts`; `src/features/reos/layout/reosAuthContext.ts`; `src/features/reos/layout/ReosAuthProvider.tsx`; `src/features/reos/layout/RouteGuards.tsx`; `src/features/reos/pages/ChangePasswordPage.tsx`.

Modified: `src/routes/AppRoutes.tsx` (nested `/reos` nested route tree, route role map, absolute-path `Navigate`/route definitions replacing the old flat one); `src/pages/auth/LoginPage.tsx`; `src/features/reos/layout/UserMenu.tsx`; `src/features/reos/services/userService.ts` (Supabase-backed, same signatures); `src/features/reos/types/user.ts` (drop `passwordHash`/`failedLoginAttempts`/`passwordChangedAt`, redesign `UserCreateInput`); `src/features/reos/components/UserForm.tsx` (`mode: "create" | "edit"`, email/initialPassword fields replacing the fake password-hash field); `src/features/reos/pages/UserCreatePage.tsx`/`UserEditPage.tsx`/`UserListPage.tsx`/`UserDetailsPage.tsx` (absolute-path navigation - see Section 11); every one of the 11 hardcoded-actor call sites in Section 1's inventory (`BranchAssignmentPage.tsx`, `OperationsDashboardPage.tsx`, `LiquidityManagementPage.tsx`, `LiquidityDashboardPage.tsx`, `ReportsPage.tsx`, `SharedBatchUploadPage.tsx`, `ProofDownloadPage.tsx`, `BranchProcessingQueue.tsx`/`BranchProcessingPage.tsx`, `TransactionProcessingPage.tsx`, `excelValidationService.ts`); `src/lib/database.types.ts` (regenerated).

## 9. Decisions

DECISIONS.md **DEC-018** records that REOS now owns its own authentication integration (superseding ARCHITECTURE.md's prior "does not own" statement, the same pattern DEC-016 used for the persistence boundary) and the role-storage/RLS-recursion design above.

## 10. Technical Debt Carried Forward

- `failedLoginAttempts`/`passwordChangedAt` are not tracked - Supabase Auth's client-side API doesn't expose failed-attempt counts, and building that would mean a second, parallel auth-event log this phase doesn't add. `account_locked` (an explicit Admin action) is enforced; brute-force lockout is not.
- No password-reset-by-admin path - if an Operations Manager needs to reset a locked-out user's forgotten password, no UI exists for it yet. Would be a second, narrow Edge Function (`admin-reset-password`), same pattern as `admin-create-user`.
- Outbound email (invites, password-reset links) is entirely unused by this phase - deliberate, see Section 4.
- Role -> route mapping (Section 6) is this phase's interpretation, not literal BUSINESS_RULES.md text - flagged for confirmation if it doesn't match actual operational practice.

## 11. Runtime Verification, and Three Real Defects It Found

Verified live in a real browser (Playwright/Chromium, installed for the session only): a bootstrap Operations Manager created via the empty-database rule, used to create a real Direct Remit Officer and a real Branch Officer through the actual Create User UI (not seeded directly), then each of the three signed in and exercised their own role's boundaries. **18/18 assertions passed, zero console errors** on the final run - including that an Operations Manager sees an actionable Assignment panel on the Upload page and a Direct Remit Officer sees only an informational note there (Section 7); that a Branch Officer lands on and is confined to their own branch, and is blocked from a different branch's queue and from User Administration; that signing out truly clears the session (a direct hit on a protected route redirects to `/login`, not a stale cached page).

Three real defects were found and fixed during this verification, not assumed away:

1. **CORS on the Edge Function** (Section 4) - `Failed to send a request to the Edge Function` in the browser console the moment an Operations Manager tried to create a user. Invisible to any non-browser test. Fixed by answering `OPTIONS` and attaching CORS headers to every response.
2. **Stale client-side session after password change** - `ChangePasswordPage` called `changePassword()` (which updates `auth.updateUser` and clears the DB's `force_password_change` flag) and then navigated, but the React context's cached `session` object still had `forcePasswordChange: true` - Supabase's `onAuthStateChange` does not fire for a `profiles` row UPDATE, only for real session/token changes. `ReosSessionGate` then read the stale flag and redirected straight back to the change-password page, an invisible bounce a script's `waitForURL` could sail through. Fixed by adding an explicit `refresh()` to the auth context, called before navigating.
3. **Relative navigation broke under the new nested route tree** - `navigate("../" + user.id)` and bare `navigate("edit")`/`navigate(userId)` calls in the User Administration pages resolved correctly under the old flat `<Route path="/reos/administration/users/create">` structure, but silently resolved to the wrong URL (`/reos/<id>`, a 404) once those routes became children nested under a parent `/reos` layout route - React Router's relative-path resolution depends on route-config nesting depth, not just URL segments, and pathless layout routes add a level. Fixed by switching every one of these to an absolute path (`/reos/administration/users/${id}`), which is unaffected by nesting depth and matches how every other `Link`/`navigate` call in REOS is already written.

All three were caught only because verification drove the real UI through a real browser rather than checking each piece in isolation - consistent with this project's standing "a passing build does not prove a real user can complete the flow" caveat (PROJECT_STATE.md).
