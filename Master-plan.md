# Doctor Tracker: Master Plan

---

## >>> PROJECT STATUS: READ THIS FIRST <<<

**Last updated:** 2026-11-02 · **Repo state:** Phases 0-4 complete · **NEXT: Phase 5 (demo-data seed, polish, `explain` evidence, a few service tests)**

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo (npm workspaces), single root `.gitignore`, tooling, env config | DONE |
| 1 | Server auth + seed users; client foundation (`DESIGN.md`, tokens, app shell, login with show/hide password and demo buttons, route protection) | DONE |
| 2 | Doctors (API + indexes + UI) and the delete/reassign flow | DONE (Mongo-specific parts unverified, see below) |
| 3 | Patients (API + UI) | DONE (Mongo-specific parts unverified, see below) |
| 4 | Dashboard (aggregations + charts) | DONE (aggregations unverified on real MongoDB, see below) |
| **5** | **Demo-data seed, polish, `explain` evidence, a few service tests** | **NEXT** |
| 6 | README, screenshots, deployment, final QA | todo |

### How to resume (for the next developer or AI session)

1. Unzip, then `npm install` at the repo root (installs `client` and `server`).
2. `cp server/.env.example server/.env` (set `MONGODB_URI`, `JWT_SECRET`), `cp client/.env.example client/.env.local`.
3. **Run `npm run seed` then `npm run smoke -w server` against a REAL MongoDB first** (see "Not yet verified" below), then `npm run dev`, then log in with the Admin demo button.
4. Start Phase 5: `server/src/scripts/seed-demo.ts` (fake doctors across all SPECIALIZATIONS, 2+ per specialization so reassign works, hospitals, 300-1000 patients with `createdAt` spread over the last 90 days and a realistic condition mix; idempotent: tag demo records or wipe-and-reseed; make `npm run seed` run both scripts). Then polish (empty/loading/error states are in place; review motion and mobile), capture `explain` evidence from `npm run smoke -w server` for the README, and fill the remaining service tests only where a rule is untested.
5. Before writing UI, read `client/DESIGN.md` and run its anti-slop and usability checklists after each screen.
6. When a phase ends, update this status block (table, "What exists", "Decisions") so the next session can continue.

### What exists now

```
package.json            npm workspaces + root scripts (dev, build, lint, typecheck, seed)
.gitignore              single root file for both apps (.env.example files are the only tracked env files)
README.md               partial; finish in Phase 6
server/                 Express 5 + TS (CommonJS output), Mongoose, Zod 3
  src/config/           env (Zod-validated), db, logger (pino)
  src/middleware/       auth (requireAuth, requireRole), validate, errorHandler, rateLimit
  src/modules/auth/     model, schema, token, service, controller, routes   (login, logout, me)
  src/shared/           AppError, constants (USER_ROLES, LOGIN_ENABLED_ROLES, cookie name)
  src/scripts/seed-users.ts   seeds admin/doctor/patient users (npm run seed)
  src/routes.ts         API v1 router: add each new module here
  tests/auth.test.ts    14 HTTP-level tests (fake User model, no MongoDB needed)
client/                 Next.js 16 (App Router), React 19, Tailwind v4, TanStack Query 5
  DESIGN.md             design tokens and rules (READ BEFORE UI WORK)
  src/proxy.ts          Next 16 "proxy" (renamed middleware): UX redirects only
  src/app/(auth)/login  login page; src/app/(app)/ authenticated shell with dashboard/doctors/patients placeholders
  src/features/auth/    api, hooks, schemas, demo-accounts, login components
  src/components/       ui/ (button, input, label, password-input), layout/ (sidebar, topbar, app-shell), shared/ (logo, page-header, empty-state)
  src/lib/              api client (ApiError, same-origin fetch), session handling, navigation config, utils
```

### Phase 2 additions (what exists now, on top of the tree above)

```
server/src/shared/        constants (SPECIALIZATIONS, CONDITIONS, GENDERS, PAGINATION), pagination, search (escapeRegex, namePrefixFilter, date range, idParams, phone), transaction (runAtomically)
server/src/modules/doctors/   model, schema, service, controller, routes   (CRUD, list+filters, reassign-candidates, reassign-and-delete, meta, /:id/patients GET+POST)
server/src/modules/patients/  model, schema, service, controller, routes   (doctor-scoped list/create, DELETE /patients/:id; rest is Phase 3)
server/src/scripts/smoke-doctors.ts   integration check for a REAL MongoDB (npm run smoke -w server)
server/tests/             fakeDb.ts (in-memory model stand-in) + doctors.test.ts; 36 tests total
client/src/features/doctors/  api, hooks, schemas, components/ (list, filters, table+mobile cards, form, detail, patients list, add-patient sheet, delete/reassign dialog)
client/src/features/patients/ api (type + delete), schemas
client/src/components/ui/     + dialog (Radix, restores focus to opener), select, field, skeleton
client/src/components/shared/ + pagination, error-state, confirm-dialog
client/src/lib/               + constants (mirror), format, forms, use-url-params, use-url-search (debounced, URL-synced); api.ts gained apiPage() and qs()
```

Phase 2 decisions:
- Delete flow follows section 6, with one addition: the dialog opens with a plain "Delete?" confirmation first (soft delete without a prompt is too easy to misclick); the server's 409 `DOCTOR_HAS_PATIENTS` then swaps it to the reassign state. Server re-validates source/target/specialization; reassign runs in a transaction when supported, otherwise in the idempotent order (patients first, doctor last). Plain delete and patient creation use soft-delete-then-recount / insert-then-recheck to close the race windows.
- `GET /doctors` does two index-backed queries (page of doctors, then one grouped patient count for those ids) rather than `$lookup`. `patientCount` is therefore not a sortable column (sorts: name, specialization, hospital, createdAt).
- Search is a prefix match on `nameLower` (index-friendly). Hospital filter is an exact match against `GET /doctors/meta/specializations`.
- No TanStack Table: a plain table plus mobile cards with server-driven sort was enough. Native `<select>` is used for dropdowns.
- Email uniqueness: pre-check (friendly `EMAIL_TAKEN` field error) plus the partial unique index as the backstop.
- Express 5 does not parse nested query objects, so `?search[$ne]=x` is just an ignored unknown key (tested).

### Phase 3 additions

```
server/src/modules/patients/   + GET /patients (filters: condition, gender, doctorId, from, to, search; sort: name, age, condition, createdAt), GET/PATCH /patients/:id (PATCH may change doctorId)
server/src/modules/doctors/    + GET /doctors/meta/options (id, name, specialization of all active doctors, capped at 1000, for dropdowns)
server/tests/patients.test.ts  8 tests (44 total)
client/src/features/patients/  api, hooks (usePatients, useDoctorOptions, useUpdatePatient, useDeletePatient, useInvalidateAll), schemas, components/ (patients-list, filters, table + mobile cards, edit-patient-sheet, patient-fields)
client/src/components/shared/  + sort-button (extracted from the doctors table)
client/src/app/(app)/patients/page.tsx
```

Phase 3 decisions:
- Patient list returns each patient's `doctor {id,name,specialization}` via one extra query for the page's doctors (not `$lookup`), keeping the patient query on its index.
- Reassigning a single patient (PATCH `doctorId`) is allowed to ANY active doctor (the same-specialization rule only protects the bulk move when deleting a doctor). Target is validated, and re-checked after the save so a concurrent doctor delete cannot orphan the patient.
- Patients are still only CREATED from a doctor's page (add-patient slide-over); the patients page has no "Add" button by design (a patient must belong to a doctor), and its empty state points to Doctors.
- Doctor dropdown uses the options endpoint (fine to ~1000 doctors; async search is the scale-up path).
- Every patient mutation invalidates `['doctors']`, `['patients']` and `['dashboard']`, so counts stay right across pages (verified in the browser).

### Phase 4 additions

```
server/src/modules/dashboard/  utils (periodBounds, fillDays), schema (days: 7|30|90), service, controller, routes   -> GET /api/v1/dashboard/stats?days=30
server/tests/dashboard.test.ts 9 tests (51 total); fakeDb.ts now interprets $match/$group/$sort/$limit so the real service code runs in tests
client/src/features/dashboard/ api, hooks, components/ (dashboard-view, range-toggle, stat-tile (count-up), ranked-bars, patients-area-chart)
client/src/app/(app)/dashboard/page.tsx
```

Response shape: `{ range, totals {doctors, patients, patientsAdded, patientsAddedPrev, doctorsAdded, doctorsAddedPrev}, patientsPerDoctor [top 8], othersCount, series [{date,count}] zero-filled, conditions [{condition,count}] }`.

Phase 4 decisions (several differ from the first plan on purpose):
- **Hand-built SVG/HTML charts instead of Recharts.** Recharts could not be installed in the build sandbox (its registry mirror 404'd on a transitive dependency), so it could not be built or verified. The hand-built area chart (~150 lines) gives full control of marks and the hover layer, adds no dependency and no bundle cost. Swapping in Recharts later is contained to `patients-area-chart.tsx` and `ranked-bars.tsx`.
- **Condition breakdown is ranked bars, not a donut.** There are 11 conditions; part-to-whole with more than 6 parts is read better as bars on one baseline (dataviz guidance). Patients-per-doctor is ranked bars too (top 8 + "All other doctors" in gray so bars add up to the total).
- **Time series is one series (patients) on one axis.** Doctors added is a stat tile with a delta, because two series of very different scale on one chart would need a second axis.
- **Delta on the "added" tiles** compares with the previous period of the same length ("233% up vs previous 30 days"): icon + words + color, never color alone.
- **Period vs "right now":** stat tiles for "added" and the time series follow the 7/30/90-day toggle (kept in the URL); totals, per-doctor and per-condition are current snapshots, and each card's subtitle says which.
- Days are **UTC days** (stated on the chart). Top-8 doctor names come from one extra `find` by id (not `$lookup`), like the patients list.
- No server-side cache: every doctor/patient mutation already invalidates `['dashboard']`, and a 60 s cache would show stale numbers right after an edit. Redis/short TTL is the documented scale-up.
- Chart colour is the brand cobalt (`primary-600`, passes the dataviz palette validator on the white card surface); one hue for all single-series marks; gray only for "other". Accessibility: legend not needed (single series), a "View data as table" for the time series, keyboard arrows/Home/End on the chart, `aria-live` readout, reduced-motion honoured (count-up is instant).
- Added index `Doctor {isDeleted, createdAt}` for the doctors-added counts.

### Credentials (seeded by `npm run seed`)

Shared password **`Asdfghjk`** for all. `admin@gmail.com` (role admin, **can log in**), `dr@gmail.com` (doctor) and `patient@gmail.com` (patient) exist but the server rejects their login with 403 `ROLE_NOT_ENABLED` ("coming soon"). To enable a portal later: add the role to `LOGIN_ENABLED_ROLES` (server `shared/constants.ts`), set `enabled: true` in `client/src/features/auth/demo-accounts.ts`, and protect its routes with `requireRole`.
(The brief said "dr/petent"; interpreted as `dr@gmail.com` and `patient@gmail.com`.)

### Conventions established in Phases 0-1 (follow these)

- **Stack versions:** Express 5 (async errors are caught automatically, no `asyncHandler` needed), Zod 3, Mongoose 8, Next 16 (`proxy.ts`, Turbopack), React 19 (`ref` is a normal prop), Tailwind v4 (tokens in `@theme`), `bcryptjs` (pure JS, no native build).
- **API response shape:** success `{ data, meta? }`; error `{ error: { code, message, details? } }`. Throw `AppError.*` from services; the central `errorHandler` formats it (also handles Zod, JWT, duplicate-key 11000, CastError, bad JSON).
- **New server module** = `modules/<name>/{model,schema,service,controller,routes}.ts`, mounted in `src/routes.ts` behind `requireAuth` (e.g. `apiRouter.use('/doctors', requireAuth, doctorsRouter)`). Validate every input with `validate({ body, query, params })`. Business rules live in services, not controllers.
- **Express 5 note:** `req.query` and `req.params` are getters; `validate` already handles this. Read validated values from `req.query`/`req.params` as usual.
- **New client feature** = `src/features/<name>/{api.ts,hooks.ts,schemas.ts,components/}`. Use the `api()` wrapper (never raw `fetch`). TanStack Query keys include all filters. Filters, search and page live in URL search params. 401 from any query triggers `handleSessionExpired()` automatically (global QueryCache handler).
- **Auth/redirect safety:** `?next=` is sanitized by `safeRedirectPath`. `handleSessionExpired` clears the cookie via the API before going to `/login` (prevents a redirect loop with a stale cookie).
- **Fonts** come from `@fontsource*` npm packages (no runtime Google Fonts request, works offline).
- **Shared constants** (specializations, conditions) are mirrored: server `src/shared/constants.ts` is the source of truth; copy to `client/src/lib/constants.ts` and keep in sync (a shared package is a scale-up option, not worth it now).
- **Search/index decisions from section 7 still apply**; `isDeleted` boolean (not `deletedAt: null`) is used for partial indexes.

### Decisions changed since the first draft of this plan

- Desktop sidebar is **fixed** (not collapsible); mobile uses a drawer. (Less complexity, no UX loss.)
- Seed script is `seed-users.ts` (was `seed-admin.ts`); `seed-demo.ts` for fake doctors/patients arrives in Phase 5, and `npm run seed` should then run both.
- Next.js 16 renamed middleware to `proxy.ts`; section 5.1 below says "Next.js middleware" but it means `src/proxy.ts`.
- Login rate limit counts failed attempts only (10 per 15 min per IP), so shared-network reviewers using demo login are never locked out.
- `User.role` now allows `admin | doctor | patient`.

### Not yet verified (important)

- **MongoDB was not reachable from the build sandbox** (no local mongod, binary download blocked, and the remote host's port 27017 is not reachable from it). Tests use in-memory fakes, and the browser runs used the real Express app with those fakes. Everything MongoDB-specific is **unverified**: the seed script, index creation (incl. the partial unique email index), aggregations, transactions and `explain` plans. **First action next session: `npm run seed`, then `npm run smoke -w server`** (it checks indexes, the reassign flow, patient list/update and prints explain plans for doctor and patient queries, then deletes its test data). Paste its explain output into the README in Phase 5/6.
- Phase 4 browser run (production build, desktop + mobile, 23/23): tiles + count-up, delta wording, chart hover/keyboard/table view, 7/30/90 toggle in the URL (7/30/90 points), ranked-bar mark specs, dashboard refreshes after a patient is deleted elsewhere, mobile overflow and 44px targets. Phases 2 and 3 suites re-run: 30/30 and 20/20. The test data is tiny, so the line chart is nearly flat; Phase 5's demo seed makes it meaningful. **The dashboard aggregations themselves (`$group`, `$dateToString`, counts) are only exercised against the in-memory interpreter; `npm run smoke -w server` runs them for real and checks that series/breakdowns reconcile with the totals.**
- Phase 3 browser run (same setup, 20/20) covered: patients list, search, condition/gender/doctor/date filters, sort, empty state, edit + reassign (cache refresh on the doctor page), delete, mobile. The Phase 2 suite was re-run after the refactor: 30/30.
- Phase 2 browser run (production build, Playwright, desktop 1440 and mobile 390, 30/30 checks) covered: pagination, debounced search, filters, date filter, sorting, URL sync, both delete paths (reassign and no-candidate), form validation incl. server EMAIL_TAKEN, add/delete patient, edit, not-found state, Escape/focus restore, no overflow, 44px targets.
- Verified in a real browser (production build, Playwright): redirects and route protection, login/logout, show/hide password, demo buttons (Admin works, Doctor/Patient disabled), cookie flags (HttpOnly, SameSite=Lax), forged-cookie handling, open-redirect protection, mobile layout (no overflow, 44px targets, drawer), 32/32 checks. Screenshots reviewed.
- Colors checked against WCAG AA (all key pairs at least 4.5:1).
- `npm run dev` (watch mode) was not exercised; `build` and `start` were.

### Working agreements with the product owner

Senior-engineer mindset: concise, direct, push back on insecure/unscalable ideas. Plan first, then code. TypeScript everywhere, functional React with hooks, ES module syntax, comments only for non-obvious logic. It is an **interview task**: do not over-engineer, but do document assumptions and the scale-up path in the README. The doctor delete flow must be highlighted in the README as a problem-solving decision.

---


> Interview task. Goal: a clean, fast, secure admin portal for managing doctors and patients, built so it can grow later without a rewrite.
> Principle: **simple now, extensible later.** No over-engineering, but no decisions that block growth.

---

## 1. Product Summary

**What:** Admin-only web portal to manage doctors and their patients, with an analytics dashboard.
**Problem:** One secure place to see who the doctors are, which patients belong to whom, and how numbers trend over time, with fast search, filters and pagination.
**Users:** A single seeded admin (role-based structure is in place for more roles later).

---

## 2. Decisions and Assumptions

The spec leaves these open. Each one is documented in the README under *Technical Assumptions*.

| Topic | Decision |
|---|---|
| Architecture | **Separate** Next.js client and Express server (the later, more explicit spec instruction) in **one monorepo**: npm workspaces, one root `.gitignore` |
| Demo access | Login page has Admin / Doctor / Patient demo buttons. Only Admin is enabled; Doctor and Patient are disabled "coming soon" to show the role structure |
| Users and roles | Single admin, seeded via script. No public registration. `role` field kept for extensibility |
| Auth | JWT in HttpOnly cookie, bcrypt-hashed passwords, same-origin via Next.js rewrites (see 5.1) |
| Deletion | **Soft delete** for doctors and patients (`isDeleted`, `deletedAt`) |
| Doctor deletion | Blocked while patients are assigned; patients must be moved to another doctor of the **same specialization** first (see 6) |
| Patient reassignment | Allowed (edit patient, change doctor) |
| Doctor editing | Included (not in spec, but expected) |
| Date filters | Use `createdAt` |
| Analytics | Exclude soft-deleted records |
| Specialization | Fixed shared list (so "same field" matching is reliable) |
| Patient condition | Fixed shared list plus `Other` |
| Patient fields | name, age, gender, phone, condition, doctorId, createdAt, updatedAt |
| Data volume | Assume thousands of records: everything is server-side (search, filter, sort, pagination) |
| Dark mode | Out of scope |

---

## 3. Scope

### In scope (must ship)
- Login/logout, protected routes (client redirect and server enforcement)
- Doctors: create, edit, list, search, filter, paginate, detail page with patients, add/delete patient under a doctor, delete doctor (with reassign flow)
- Patients: list, edit, delete, search, filter, paginate
- Dashboard: totals, patients per doctor, date-based stats, charts
- Responsive, polished UI (desktop and mobile)
- Seed script (admin plus realistic demo data) so charts are meaningful
- README with all required sections

### Out of scope (documented as scale-up options only)
Multi-tenant, appointments, billing, file uploads, audit logs, dark mode, e2e test suite.

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Client | Next.js (App Router), TypeScript | Spec requirement, file-based routing, middleware for redirects |
| Styling | Tailwind CSS v4 (tokens in `@theme`), shadcn/ui (Radix) restyled to our design tokens | Accessible primitives without the default look |
| Server state | TanStack Query | Caching, loading and error states, query keys include filters |
| Tables | TanStack Table (column defs only, manual/server-side mode) | Typed columns, no client-side data processing |
| Forms | react-hook-form + Zod | Shared validation approach with the server |
| Charts | Recharts | Simple, React-native, good enough for the brief |
| Motion | `motion` (Framer Motion) | Dialog transitions, count-up numbers, row exit |
| Toasts | sonner | Lightweight |
| Icons | lucide-react | |
| Server | Node.js, Express, TypeScript | Spec requirement |
| DB | MongoDB (Atlas for live link), Mongoose | Spec requirement |
| Validation | Zod (request body, query, params) | Single source of truth for types |
| Security | bcrypt, jsonwebtoken, helmet, express-rate-limit, cookie-parser | |
| Logging | pino (pino-http) | Structured logs |
| Tooling | ESLint, Prettier, `tsx`, Vitest (a few service-level tests) | |

---

## 5. System Architecture

```
Browser ──► Next.js (client + rewrites) ──► Express API ──► MongoDB
            same origin as the browser      /api/v1/*
```

### 5.1 Same-origin proxy (important)
Cross-site cookies (`vercel.app` to `onrender.com`) are blocked by Safari and Chrome. Next.js `rewrites` proxy `/api/*` to the Express server, so:
- the cookie is first-party: `HttpOnly; Secure; SameSite=Lax`
- no CORS and a much smaller CSRF surface (SameSite=Lax plus JSON-only bodies)
- Express stays fully standalone and RESTful (still has a CORS allowlist for direct use)

**Security rule:** Next.js `proxy.ts` (Next 16 name for middleware) only redirects unauthenticated users to `/login` (UX). **The real authorization check is in Express** (`requireAuth` and `requireRole`).

### 5.2 Monorepo layout
One repository, two apps, **one root `.gitignore`** (no nested ones) and **npm workspaces** so a single `npm install` at the root sets up both. Root scripts: `dev` (runs client and server together via `concurrently`), `build`, `lint`, `seed`.

```
doctor-tracker/
├─ README.md
├─ Master-plan.md
├─ package.json                 # workspaces: ["client", "server"], root scripts
├─ .gitignore                   # single file, covers client and server (see below)
├─ client/                      # Next.js
│  ├─ DESIGN.md                 # design tokens and rules (see section 9)
│  ├─ .env.example
│  └─ src/
│     ├─ app/
│     │  ├─ (auth)/login/
│     │  └─ (app)/             # authenticated shell (sidebar and topbar)
│     │     ├─ dashboard/
│     │     ├─ doctors/ (page, new/, [id]/, [id]/edit/)
│     │     └─ patients/
│     ├─ features/              # feature-first, one folder per domain
│     │  ├─ auth/ doctors/ patients/ dashboard/
│     │  │   each: api.ts, hooks.ts, schemas.ts, components/
│     ├─ components/ui/         # shadcn primitives (restyled)
│     ├─ components/shared/     # DataTable, FilterBar, Pagination, StatCard, EmptyState, ConfirmDialog
│     ├─ lib/                   # api client, query client, utils, constants
│     └─ types/
└─ server/                      # Express
   ├─ .env.example
   └─ src/
      ├─ app.ts  server.ts
      ├─ config/                # env (Zod-validated), db
      ├─ middleware/            # auth, validate, errorHandler, rateLimit, notFound
      ├─ modules/
      │  ├─ auth/      routes, controller, service, schema
      │  ├─ doctors/   routes, controller, service, model, schema
      │  ├─ patients/  routes, controller, service, model, schema
      │  └─ dashboard/ routes, controller, service
      ├─ shared/                # constants (specializations, conditions), pagination helper, AppError, escapeRegex
      └─ scripts/               # seed-users.ts, seed-demo.ts (Phase 5)
```
**Root `.gitignore`** (patterns without a leading slash match in every workspace):
```gitignore
# dependencies
node_modules/

# builds
.next/
dist/
build/
out/
*.tsbuildinfo
next-env.d.ts

# env files: ignore all, keep the templates
.env
.env.*
!.env.example

# logs and coverage
*.log
npm-debug.log*
coverage/

# OS and editor
.DS_Store
Thumbs.db
.vscode/*
!.vscode/extensions.json
.idea/

# deployment tooling
.vercel/
```
Rule: `.env.example` files (one in `client/`, one in `server/`) are committed; real `.env*` files never are.

Layering on the server: `route → validate → controller → service → model`. Controllers stay thin; **all business rules live in services** (single responsibility, easy to test).

---

## 6. Doctor Deletion Flow (key problem-solving feature)

**Rule:** A doctor with assigned patients cannot be deleted until those patients are moved to another doctor in the **same specialization**. The server enforces this; the UI guides the admin through it.

```
Admin clicks Delete on a doctor
        │
        ▼
 DELETE /doctors/:id
   ├─ no patients ─► doctor soft-deleted ─► toast "Doctor deleted"
   └─ has patients ─► 409 { code: "DOCTOR_HAS_PATIENTS", patientCount, specialization }
            │
            ▼
   Modal: "Dr. X has N patients. Move them to another {specialization} doctor to continue."
            │
            ▼
   GET /doctors/:id/reassign-candidates   (same specialization, not deleted, excludes Dr. X)
      ├─ candidates exist ─► <select> of doctors (name, hospital, current patient count)
      │        └─ Confirm ─► POST /doctors/:id/reassign-and-delete { targetDoctorId }
      │                       └─ toast "N patients moved to Dr. Y, Dr. X deleted"
      └─ none ─► message "No other {specialization} doctor available"
               └─ [Add doctor] button ─► /doctors/new?specialization=...  (flow ends here)
```

**Simple by design:** after adding the new doctor, the admin simply tries the delete again. No resume or return state to maintain.

### Server-side guarantees (never trust the UI)
`POST /doctors/:id/reassign-and-delete` validates:
1. Source doctor exists and is not deleted
2. Target exists, is not deleted, is **not the same doctor**, and has the **same specialization**
3. Moves patients first (`updateMany`), then soft-deletes the doctor. Order matters: a retry after a partial failure is safe (idempotent)
4. Uses a Mongo transaction when a replica set is available (Atlas), and falls back to the idempotent order on a standalone local `mongod`

Known and accepted edge case: a patient added to the source doctor in the tiny window between the move and the delete. Mitigation: patient creation rejects deleted doctors, and the delete step re-checks that zero active patients remain (409 again if not).

### UX details
- One dialog, content swaps between "confirm", "reassign" and "no candidate" states with a short fade/slide
- Confirm button disabled until a target is selected; loading state while the request runs
- Row animates out of the table on success; list and dashboard queries are invalidated

---

## 7. Data Models

### User
`email` (unique), `passwordHash`, `role` (`admin`), `createdAt`, `updatedAt`

### Doctor
| Field | Notes |
|---|---|
| `name`, `nameLower` | `nameLower` is the normalized search key, set in a pre-save hook |
| `specialization` | enum from shared list |
| `hospital`, `phone`, `email` | validated |
| `isDeleted` (default `false`), `deletedAt` | soft delete |
| `createdAt`, `updatedAt` | timestamps |

### Patient
| Field | Notes |
|---|---|
| `name`, `nameLower` | search key |
| `age` (0–120), `gender` (`male`/`female`/`other`), `phone` | |
| `condition` | enum from shared list (+ `Other`) |
| `doctorId` | ObjectId ref, required |
| `isDeleted`, `deletedAt`, `createdAt`, `updatedAt` | |

> Why `isDeleted` (boolean) and not just `deletedAt: null`? MongoDB partial indexes can't reliably filter on `null`/`$exists:false`; a boolean equality filter is supported and index-friendly.

### Indexes
| Collection | Index | Purpose |
|---|---|---|
| Doctor | `{ email: 1 }` unique, **partial** `{ isDeleted: false }` | Unique among active doctors; email reusable after delete |
| Doctor | `{ isDeleted: 1, nameLower: 1 }` | Prefix search plus sorted listing |
| Doctor | `{ isDeleted: 1, specialization: 1, createdAt: -1 }` | Specialization filter, date filter/sort, reassign candidates |
| Patient | `{ isDeleted: 1, doctorId: 1, createdAt: -1 }` | Doctor's patient list, per-doctor counts |
| Patient | `{ isDeleted: 1, nameLower: 1 }` | Prefix search |
| Patient | `{ isDeleted: 1, condition: 1, createdAt: -1 }` | Condition and date filters, condition chart |
| Patient | `{ isDeleted: 1, createdAt: -1 }` | Dashboard time series |

Verify with `explain("executionStats")` and put the evidence in the README.

---

## 8. REST API (`/api/v1`)

### Conventions
- Success: `{ data, meta? }`. List meta: `{ page, limit, total, totalPages }`
- Error: `{ error: { code, message, details? } }` with correct HTTP status (400/401/403/404/409/422/429/500)
- List query params: `page`, `limit` (max 50), `search`, `sort`, `order`, `from`, `to` (creation date) plus resource filters
- Every endpoint validates params/query/body with Zod and sanitizes input (escape regex, strip unknown keys)

| Resource | Endpoint | Notes |
|---|---|---|
| Auth | `POST /auth/login` | rate-limited; sets HttpOnly cookie; generic error on failure |
| | `POST /auth/logout` | clears cookie |
| | `GET /auth/me` | session check |
| Doctors | `GET /doctors` | filters: `specialization`, `hospital`, `from`, `to`; includes `patientCount` |
| | `POST /doctors` | |
| | `GET /doctors/:id` | |
| | `PATCH /doctors/:id` | |
| | `DELETE /doctors/:id` | 409 `DOCTOR_HAS_PATIENTS` if active patients |
| | `GET /doctors/:id/reassign-candidates` | same specialization, excludes self |
| | `POST /doctors/:id/reassign-and-delete` | body `{ targetDoctorId }` |
| | `GET /doctors/meta/specializations` | list of values plus hospitals for filters |
| Doctor's patients | `GET /doctors/:id/patients` | paginated |
| | `POST /doctors/:id/patients` | |
| Patients | `GET /patients` | filters: `condition`, `gender`, `doctorId`, `from`, `to` |
| | `GET /patients/:id`, `PATCH /patients/:id`, `DELETE /patients/:id` | PATCH supports changing `doctorId` |
| Dashboard | `GET /dashboard/stats?days=30` | see section 10 |
| Health | `GET /health` | for deployment checks |

---

## 9. Frontend and UX Plan

### 9.1 Design system (`client/DESIGN.md`)
Inspired by the structure of Mercury, IBM Carbon and Coinbase design analyses (from the provided `awesome-design-md` pack), adapted for an admin app. We borrow principles, not brand identity.

| Token | Value |
|---|---|
| Primary | Cobalt blue `#0052FF`, hover `#003ECC`, 10% tint for secondary actions |
| Sidebar / login panel | Deep ink-navy `#0B1220` |
| Canvas / cards | `#F7F9FC` / white; **separation by fill and hairline, not heavy shadows** |
| Text | Ink `#16203A`, muted `#5B6783` |
| Semantic | success / warning / error used as text and badges only |
| Fonts | Plus Jakarta Sans (UI), IBM Plex Mono (phones, IDs) via `next/font` |
| Radius | cards 12px, inputs 10px, buttons and chips as pills |
| Spacing | 4/8px grid |

Rules: one solid primary button per group; secondary buttons are tinted, not outlined; table rows use hairline dividers; focus rings always visible; no generic default look.

### 9.2 Screens
| Screen | Highlights |
|---|---|
| **Login** | Split layout: navy brand panel and minimal form; inline errors; disabled/loading submit; **show/hide password** toggle; **demo login** buttons (see 9.2.1) |
| **App shell** | Fixed navy sidebar (Dashboard, Doctors, Patients), topbar with user and sign out; drawer on mobile |
| **Dashboard** | 4 stat cards (count-up), patients-per-doctor horizontal bar (top 8 + Others), patients-over-time area chart with 7/30/90-day toggle, condition donut |
| **Doctors list** | Debounced search, filter chips (specialization, hospital, date range) synced to the URL, sortable columns, server pagination, patient-count column, row actions, add-doctor button |
| **Doctor form** | Create/edit, same component, Zod validation, prefilled specialization when arriving from the delete flow |
| **Doctor detail** | Profile header plus paginated patient list, "Add patient" slide-over, delete patient with confirm |
| **Patients list** | Search, filters (condition, gender, doctor, date range), edit in slide-over, reassign doctor, delete with confirm |
| **Delete-doctor modal** | Section 6 |

#### 9.2.1 Login details

**Show/hide password:** an eye icon button inside the password field. `type="button"` (never submits the form), `aria-label` ("Show password" / "Hide password"), `aria-pressed`, 44px tap target, keyboard accessible, and it keeps focus and caret position in the input.

**Demo login:** a "Quick demo access" row of three buttons, **Admin**, **Doctor**, **Patient**, driven by one config array so adding a role later is one line:

```ts
// client/src/features/auth/demo-accounts.ts
export const DEMO_ACCOUNTS = [
  { role: 'admin',   label: 'Admin',   enabled: true  },
  { role: 'doctor',  label: 'Doctor',  enabled: false }, // coming soon
  { role: 'patient', label: 'Patient', enabled: false }, // coming soon
] as const;
```

| Button | Behavior |
|---|---|
| **Admin** | One click fills the email and password fields (so the reviewer sees it happen) and submits; shows a loading state; on success goes to the dashboard |
| **Doctor / Patient** | Visibly disabled (`aria-disabled`, "Coming soon" tooltip and badge). Signals that the role-based structure is ready (`User.role`, `requireRole`) and these portals are the planned next step |

Notes:
- Demo credentials come from env (`NEXT_PUBLIC_DEMO_LOGIN=true`, `NEXT_PUBLIC_DEMO_ADMIN_EMAIL`, `NEXT_PUBLIC_DEMO_ADMIN_PASSWORD`), listed in `client/.env.example`. Setting the flag to `false` removes the whole section.
- Trade-off, stated in the README: demo credentials are visible in the client bundle. That is acceptable only because this is a public demo account holding seeded fake data. A real deployment turns the flag off.
- The demo button calls the same `POST /auth/login` as the form. No backdoor endpoint, no special server logic.

### 9.3 UX standards
- Filters, search and page live in **URL search params** (shareable, survive refresh)
- Skeleton rows matching table layout, never blank screens; designed empty and error states with retry
- Mobile: tables collapse into cards, sidebar becomes a drawer, 44px touch targets
- Accessible: semantic HTML, labelled inputs, keyboard-navigable dialogs (Radix), AA contrast

### 9.3.1 UI quality gates (three layers)

Source: the AI-UI/UX video summary you shared. The `awesome-design-md` pack only covers layer 1; layers 2 and 3 are handled by checklists plus real-browser checks, with no extra tooling dependency.

| Layer | What | How we do it |
|---|---|---|
| **1. Style direction** | Give the AI concrete rules instead of letting it default to the "average" look | `client/DESIGN.md` (tokens from section 9.1) is read before any UI work |
| **2. Design review (anti-slop)** | Remove generic AI-design clichés | Manual checklist after each screen: no gradient text, no oversized hero-style headlines inside the app, no emoji used as icons or card art, no default shadcn look (all primitives restyled), consistent spacing and type scale, real hierarchy |
| **3. Usability and testing** | A good-looking UI can still fail in daily use | Checklist below, then a real-browser pass (Playwright, desktop 1440px and mobile 390px) that screenshots every screen and checks for overflow, misalignment and broken states |

**Usability checklist** (based on the Vercel web interface guidelines):
- Tap targets at least 44px; never disable mobile zoom (no `user-scalable=no`)
- Every submit shows a loading state and disables itself against double submit
- Every input has a visible label; errors appear inline next to the field
- Visible focus rings, full keyboard navigation, dialogs trap and restore focus
- Icon-only buttons have `aria-label`s
- Honor `prefers-reduced-motion`
- Loading, empty and error states exist for every data view
- Long text truncates cleanly; numbers use tabular figures in tables

The Playwright screenshots double as the README's desktop and mobile "Visual Evidence".

### 9.4 State and performance
- **Server state:** TanStack Query, query keys include filters, `keepPreviousData` for smooth pagination, targeted invalidation after mutations
- **UI state:** local component state and URL params. No Redux/global store needed (documented as a decision)
- Debounced search (300 ms), memoized columns and row components, no derived data in state
- Server Components for static shell; client components only where interactive
- `next/font`, dynamic import for chart bundle

---

## 10. Dashboard Analytics (MongoDB aggregation, not in-memory)

`GET /dashboard/stats?days=30` returns in one response:
1. **Totals:** active doctors, active patients, patients added in the period
2. **Patients per doctor:** `$match {isDeleted:false}` → `$group by doctorId` → `$sort` → `$limit 8` → `$lookup` doctor names (+ "Others" bucket)
3. **Time series:** patients (and doctors) created per day using `$dateToString`, with missing days zero-filled on the server
4. **Condition breakdown:** `$group by condition`

Runs the pipelines in parallel (`Promise.all`), all backed by the indexes in section 7. Optional: 60 s in-memory cache (noted as scale-up if skipped).

---

## 11. Security Checklist
- [ ] bcrypt (cost 12), generic login errors, login rate limit
- [ ] JWT in `HttpOnly; Secure; SameSite=Lax` cookie, short expiry
- [ ] `requireAuth` on every non-auth route; `requireRole('admin')` structure in place
- [ ] Zod validation on all input, unknown keys stripped, body size limit
- [ ] Regex search input escaped (no ReDoS/injection), no raw query operators from the client (`$` keys rejected)
- [ ] `helmet`, CORS allowlist, no secrets in repo, `.env.example` provided
- [ ] Central error handler: no stack traces or internals to the client in production
- [ ] React escapes output by default; no `dangerouslySetInnerHTML`

---

## 12. Build Phases (vertical slices)

| Phase | Deliverable | Done when |
|---|---|---|
| **0** | Monorepo (npm workspaces), single root `.gitignore`, tooling, env config, Mongo connection | `npm install` and `npm run dev` at the root start both apps, `/health` works, `git status` shows no `.env`, `.next`, `dist` or `node_modules` |
| **1** | Server auth, seed-users, client scaffold: `DESIGN.md`, tokens, app shell, login (show/hide password, demo login buttons), route protection | Login works end to end through the proxy; demo Admin button logs in with one click; unauthenticated API calls get 401 |
| **2** | **Doctors** (API, indexes, list/filter/search/pagination, create/edit, detail with patients, add/delete patient) and the **delete/reassign flow** | All doctor requirements and section 6 pass |
| **3** | **Patients** (API and UI) | List, edit, delete, search, filters, pagination |
| **4** | **Dashboard** (aggregations and charts) | Real data, fast queries |
| **5** | Seed demo data, polish (motion, mobile, empty/loading/error states), index `explain` evidence, a few service tests | Screenshots look good on desktop and mobile |
| **6** | README, screenshots, deployment (Vercel plus Render/Railway plus Atlas), final QA against checklist | Live link works from a fresh browser |

---

## 13. README Plan (required template)
1. **Elevator pitch** (one paragraph)
2. **Setup guide** (prerequisites, install, `.env.example`, seed, run both apps)
3. **System architecture** (diagram, data flow, why the proxy)
4. **Technical decisions** (deep dive on two):
   - **Decision 1: Doctor deletion with patient reassignment**: the problem (orphaned patients, data integrity), options considered (cascade delete, block only, orphan, reassign), why reassign-within-specialization, server-side guarantees, edge cases, and the flow diagram from section 6
   - **Decision 2: Search, filtering and indexing strategy**: why normalized-field prefix search over regex/text index, compound indexes, `explain` results
5. **Technical assumptions and business rules** (table from section 2)
6. **Scalability and future roadmap** (section 14)
7. **Visual evidence**: desktop and mobile screenshots (login, dashboard, doctors, doctor detail, patients, delete modal)
8. **Live link, credentials for demo admin (with the demo-login trade-off noted), API overview**
9. **Design system note**: `DESIGN.md` approach and the three UI quality layers (9.3.1)

---

## 14. Scale-Up Roadmap (document only, not built now)

The structure already supports growth into a **Hospital Management** or **Diagnostic Center Management** system.

### What is already future-friendly
| Choice now | Future benefit |
|---|---|
| Feature-first modules (client and server), one folder per domain | Add `appointments`, `billing`, `lab-tests`, `inventory` without touching existing modules |
| `User.role` plus `requireRole` middleware | Move to RBAC (doctor, receptionist, lab technician, accountant) with permissions |
| Business logic in services, thin controllers | Reuse logic from jobs, queues or other services |
| Shared constants and Zod schemas | Easy to evolve enums into DB-managed collections |
| Versioned API `/api/v1` | Non-breaking evolution |
| Soft delete and timestamps everywhere | Audit trail and data recovery foundation |
| Generic pagination/filter helper | Reused by every new list endpoint |

### Growth path
| Stage | Additions |
|---|---|
| **Hospital Management** | `Hospital` / `Department` / `Branch` collections (replace the `hospital` string, with a migration), `Appointment` and scheduling, `Admission`/wards, staff and shifts, prescriptions, billing and invoices |
| **Diagnostic Center** | `Test`/`Package` catalog, `Order` → `Sample` → `Report` workflow, result entry and PDF reports, referral doctors and commissions, machine/inventory tracking |
| **Platform-level** | Multi-tenancy (`tenantId` on all documents plus compound indexes), RBAC permissions, audit log, file storage (S3) for reports, notifications (email/SMS), patient portal |
| **Performance and ops** | Cursor-based pagination for very large collections, Redis cache for dashboard, read replicas, background jobs (BullMQ), rate limiting per tenant, observability (metrics, tracing), CI/CD, Docker, e2e tests |
| **Architecture** | Start as a modular monolith; extract modules (billing, reporting) into services only if scale demands it |

---

## 15. Acceptance Checklist (mapped to the spec)

- [ ] Only authenticated users can access anything; unauthenticated API calls return 401
- [ ] Doctor: create, edit, list, search, filter (date and others), paginate, view patients, add/delete patients
- [ ] Doctor delete blocked with patients; reassign to same specialization works; no-candidate path shows "Add doctor"
- [ ] Patients page: list, edit, delete, pagination, search, filters (date, condition, others)
- [ ] Dashboard: totals, patients per doctor, date stats, charts, all from aggregations
- [ ] Indexes in place and verified with `explain`
- [ ] Single root `.gitignore` covers both apps; only `.env.example` files are committed
- [ ] Login: show/hide password works; Admin demo button logs in; Doctor and Patient demo buttons visibly disabled
- [ ] Responsive on mobile; clean, distinctive UI; passes the usability checklist (9.3.1)
- [ ] Validation and error handling on every endpoint, consistent error shape
- [ ] No unnecessary re-renders (debounce, memoization, stable query keys)
- [ ] README complete, `.env.example` present, screenshots (desktop and mobile)
- [ ] Live link and GitHub repo ready, demo credentials documented
