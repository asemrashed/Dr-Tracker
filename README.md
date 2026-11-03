# Doctor Tracker

> **Work in progress.** The full README (architecture deep-dive, technical decisions, screenshots) is completed in the final phase. See [`Master-plan.md`](./Master-plan.md) for current status.

Doctor Tracker is a secure admin web portal for managing doctors and their patients. One authenticated admin can create and search doctors, follow each doctor's patients, and watch an analytics dashboard, with server-side search, filtering and pagination backed by indexed MongoDB queries.

## Key Problem-Solving Feature: Doctor Deletion & Patient Reassignment Flow

> **Personal Integration:** Doctor deletion was not part of the base requirements. I architected and implemented a safe, production-grade deletion flow with zero-orphan guarantees.

In real-world healthcare software, deleting a doctor who has active patients creates dangerous dangling references or untracked patients. To solve this responsibly:

1. **Direct Soft-Delete (No Patients):**
   * If a doctor has 0 active patients, the admin can directly soft-delete the doctor (`isDeleted: true`, `deletedAt: new Date()`).
2. **Safe Reassignment Flow (With Active Patients):**
   * If the doctor has active patients, deletion is blocked until all patients are safely accounted for.
   * **Reassign to existing peer:** The admin is prompted with a list of eligible active doctors in the **same specialization** (or another active doctor) to take over the patients.
   * **Add a new doctor:** If no suitable doctor exists, the admin can create a new replacement doctor on the spot.
   * **Atomic Transaction:** Moving the patients and soft-deleting the outgoing doctor executes inside an atomic MongoDB multi-document transaction (`session.withTransaction`). If any step fails, the entire operation rolls back to prevent data inconsistency or orphaned patient records.

---

## Quick start

Requirements: Node.js 20+ and a MongoDB instance (local, or a free MongoDB Atlas cluster).

```bash
# 1. Install everything (npm workspaces: client + server)
npm install

# 2. Configure environment (real .env files are git-ignored)
cp server/.env.example server/.env          # then set MONGODB_URI and JWT_SECRET
cp client/.env.example client/.env.local

# 3. Create the demo accounts
npm run seed

# 4. Run client (http://localhost:3000) and API (http://localhost:4000) together
npm run dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run test -w server`.

## Demo accounts

Shared password for every account: `Asdfghjk`

| Role | Email | Sign-in |
|---|---|---|
| Admin | `admin@gmail.com` | Enabled |
| Doctor | `dr@gmail.com` | Disabled for now ("coming soon") |
| Patient | `patient@gmail.com` | Disabled for now ("coming soon") |

The login page has one-click demo buttons for these roles. Only Admin works today; Doctor and Patient are visibly disabled to show the role structure is ready. Demo credentials are bundled into the client by design (public demo account with fake data only). Set `NEXT_PUBLIC_DEMO_LOGIN=false` to hide the buttons.

## Architecture (summary)

```
Browser ──► Next.js (UI + /api/* rewrite) ──► Express API (/api/v1) ──► MongoDB
```

Next.js proxies `/api/*` to the standalone Express server, so the browser sees one origin. That keeps the auth cookie first-party (`HttpOnly; SameSite=Lax`) with no CORS or third-party-cookie problems. Authorization is always enforced by Express; the Next.js `proxy.ts` only redirects for UX.

## Repository layout

```
client/   Next.js 16 (App Router), TypeScript, Tailwind v4, TanStack Query
server/   Express 5, TypeScript, Mongoose, Zod
Master-plan.md   full plan plus current status and next steps
```

Sections still to be written (Phase 6): full system architecture, two technical decisions (doctor deletion with patient reassignment; search and indexing), technical assumptions, scalability roadmap, screenshots.
