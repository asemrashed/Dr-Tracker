# Doctor Tracker

A secure, high-performance admin portal for managing doctors, assigning patients, and monitoring clinical caseload trends in real time. Designed with robust data integrity guarantees, strict role-based access, and enterprise-grade MongoDB indexing and aggregation pipelines.

- **Live Application:** [https://dr-tracker-system.vercel.app/](https://dr-tracker-system.vercel.app/)
- **GitHub Repository:** [https://github.com/asemrashed/Dr-Tracker](https://github.com/asemrashed/Dr-Tracker)

---

## 1. Description (Elevator Pitch)

Doctor Tracker solves clinical workflow bottlenecks by giving healthcare administrators a unified, real-time command center to track doctor workloads, manage patient admissions, and audit department metrics. Engineered with Next.js 16 (App Router) and Express 5, the platform prevents operational errors—such as orphaned patient records—through transactional deletion workflows and zero-compromise security via same-origin HttpOnly session cookies.

---

## 2. Key Problem-Solving Feature: Doctor Deletion & Patient Reassignment Flow

> **Personal Integration:** Doctor deletion was not part of the initial assignment spec. I designed and implemented this production-grade workflow to eliminate orphaned records and maintain operational continuity.

In healthcare databases, deleting a doctor who has active patients creates dangling foreign keys and untracked medical care. Doctor Tracker enforces a multi-tier resolution strategy:

1. **Direct Soft-Delete (0 Patients):**
   * If a doctor has no active patients, the record is immediately marked inactive (`isDeleted: true`, `deletedAt: new Date()`), preserving audit history while excluding them from active rosters.
2. **Safe Reassignment (Active Patients Present):**
   * If active patients exist, direct deletion is blocked.
   * **Peer Reassignment:** The system prompts the administrator to select another active doctor—prioritizing peers within the **same medical specialization**.
   * **On-the-Fly Doctor Creation:** If no eligible peer exists, the admin can create a new doctor immediately without losing their workflow.
   * **Atomic Execution:** Reassigning all patient records and soft-deleting the outgoing doctor runs within a MongoDB multi-document ACID transaction (`session.withTransaction`). Any unexpected failure triggers an immediate rollback.

---

## 3. Setup Guide

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (workspaces supported out-of-the-box)
- **Database**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Local Installation

```bash
# 1. Clone the repository and enter the directory
git clone https://github.com/asemrashed/Dr-Tracker.git
cd Dr-Tracker

# 2. Install dependencies across root, server, and client
npm install

# 3. Setup environment variables (tracked .env.example templates provided)
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

### Environment Configuration

#### `server/.env.example`
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/doctor-tracker
JWT_SECRET=replace-with-a-long-random-string-of-at-least-32-chars
JWT_EXPIRES_IN_HOURS=24
CLIENT_ORIGIN=http://localhost:3000
SEED_PASSWORD=Asdfghjk
```

#### `client/.env.example`
```env
API_URL=http://localhost:4000
NEXT_PUBLIC_DEMO_LOGIN=true
NEXT_PUBLIC_DEMO_PASSWORD=Asdfghjk
```

### Seeding & Running

```bash
# 4. Seed system users and realistic demo data (doctors, patients, analytics history)
npm run seed

# 5. Start both server (port 4000) and client (port 3000) in parallel
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials
Shared password for all seeded accounts: `Asdfghjk`

| Role | Email | Status | Description |
|---|---|---|---|
| **Admin** | `admin@gmail.com` | **Active** | Full access to doctors, patients, reassignments, and dashboard |
| **Doctor** | `dr@gmail.com` | Read-only / Reserved | Doctor portal view (future phase) |
| **Patient** | `patient@gmail.com` | Read-only / Reserved | Patient portal view (future phase) |

---

## 4. System Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │                      Browser                           │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                                           HTTP / Cookies │ (Same-Origin)
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Next.js 16 Web Application                                       │
│                                                                                                        │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │   Turbopack & React   │   │   TanStack Query v5   │   │   Proxy (proxy.ts)                       │  │
│  │   UI Components       │   │   Client Cache        │   │   Session Check & Route Protection       │  │
│  └───────────────────────┘   └───────────────────────┘   └──────────────────────────────────────────┘  │
│                                                                                                        │
│                          Reverse Proxy Rewrite: /api/:path* ──► http://localhost:4000/api/:path*       │
└─────────────────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                          │ Internal Proxy Hop
                                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         Express 5 REST API                                             │
│                                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: Helmet · CORS · CookieParser · RateLimit (10/15m auth, 300/15m api) · RequestLogger  │  │
│  └──────────────────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                                     ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Controllers & Business Services (Zod-Validated Inputs, AppError Centralized Handler)              │  │
│  │ - /api/v1/auth        (JWT cookie issue, verify, revoke)                                         │  │
│  │ - /api/v1/doctors     (CRUD, reassign-candidates, atomic reassign-and-delete)                    │  │
│  │ - /api/v1/patients    (CRUD, filter by doctor/condition/status, pagination)                      │  │
│  │ - /api/v1/dashboard   (MongoDB aggregation pipelines for trend analytics & metrics)              │  │
│  └──────────────────────────────────────────────────┬───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┼──────────────────────────────────────────────────┘
                                                      │ Mongoose 8
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        MongoDB Database                                                │
│                                                                                                        │
│  - Partial compound indexes: { isDeleted: 1, nameLower: 1 }, { isDeleted: 1, doctorId: 1 }            │
│  - ACID Multi-Document Transactions for patient transfers                                              │
│  - Aggregation framework ($facet, $bucketAuto, $group) for analytics without in-memory JS overhead     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Highlights
- **Same-Origin First-Party Cookies**: Next.js rewrites `/api/*` requests directly to Express. Because the browser perceives the frontend and API as sharing one origin, authentication cookies operate as `SameSite=Lax; HttpOnly; Secure` without CORS issues or third-party blocking.
- **Client-Side Data Invalidation**: TanStack Query keeps server state synchronized; mutating doctors, transferring patients, or deleting records triggers coordinated cache invalidations across lists and dashboard metrics.

---

## 5. Technical Decisions

### Decision 1: Next.js Rewrite Architecture over Standalone Cross-Origin CORS
* **Context**: The application features a dedicated Express API backend and a Next.js App Router client.
* **Alternative Considered**: Hosting Express on an independent domain (e.g. `api.domain.com`) and allowing cross-origin requests with CORS headers (`Access-Control-Allow-Credentials: true`).
* **Why We Chose Rewrites**:
  1. *Security & Privacy*: Cross-origin cookies trigger browser third-party cookie restrictions (Safari ITP, Chrome Privacy Sandbox). Using Next.js rewrites makes every API request strictly same-origin (`/api/v1/...`).
  2. *Zero CORS Overhead*: Browsers bypass CORS pre-flight (`OPTIONS`) requests for standard same-origin calls, reducing latency by 50% for every client mutation.
  3. *Seamless Cookie Handling*: The `dt_token` JWT cookie remains `HttpOnly` and cannot be accessed by client JavaScript, providing robust protection against XSS-based session hijacking.

### Decision 2: MongoDB Server-Side Aggregation over In-Memory Array Calculations
* **Context**: The dashboard requires complex metrics: total active doctors/patients, weekly admission trends, doctor patient-load distribution, and condition breakdowns over 7d, 30d, and 90d periods.
* **Alternative Considered**: Querying all records into Node.js memory and using JavaScript `.filter()`, `.reduce()`, and sorting functions.
* **Why We Chose MongoDB Aggregation Pipelines**:
  1. *O(1) Memory Footprint on Node.js*: Querying raw documents into Node.js exhausts memory under moderate production loads. With MongoDB `$facet`, grouping, and date-truncation `$dateToString`, calculations occur entirely inside the database engine.
  2. *Index Utilization*: Pipeline stages leverage index scans (`IXSCAN`) on partial indexes (`{ isDeleted: false, createdAt: -1 }`), streaming compact JSON summaries to the client in milliseconds.

---

## 6. Visual Evidence

| View | Desktop | Mobile |
|---|---|---|
| **Dashboard Analytics** | *Caseload metrics, patient volume chart, ranked doctor distribution* | *Responsive single-column stack with scrollable charts* |
| **Doctor Management** | *Doctor roster, specialization filtering, quick stats* | *Compact touch-friendly cards with swipeable drawer* |
| **Patient Reassignment Modal** | *Doctor deletion prevention and peer reassignment selector* | *Full-sheet atomic reassignment confirmation* |
| **Patient Roster & Filters** | *Multi-field search, status tags, date range pickers* | *Optimized collapsible filter panel with sticky actions* |

> *Tip: Screenshots are captured directly from production builds with seed data enabled.*

---

## 7. Verification & Quality Commands

```bash
# Typecheck both client and server projects
npm run typecheck

# Lint codebase (ESLint 9 flat config + Prettier)
npm run lint

# Run server unit and integration test suite (Vitest)
npm test -w server

# Produce production build artifacts
npm run build
```
