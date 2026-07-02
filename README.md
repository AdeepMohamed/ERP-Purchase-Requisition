# ERP Purchase Requisition-to-Order Automation

A web application automating the full procurement cycle for a team/organization.

**Flow:** Employee submits requisition → Manager approves/rejects (real-time) → System auto-generates Purchase Order → PO "received" updates inventory → Every action is audit-logged immutably.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| State/Data | React Query v5 |
| Real-time | Socket.IO (auto-falls back to polling) |
| Offline | Dexie.js (IndexedDB) |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Database | Neon (Serverless PostgreSQL) |
| Auth | JWT + bcrypt |
| Testing | Vitest + Playwright |

---

## Local Setup

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) account (free tier is sufficient)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd Erp

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment

```bash
# In server/
cp .env.example .env
# Edit .env — add your Neon DATABASE_URL and a JWT_SECRET
```

### 3. Run migrations & seed

```bash
cd server
npx prisma migrate dev --name init
npm run seed
```

### 4. Start dev servers

```bash
# Terminal 1 — backend (port 4000)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

---

## Branch Model

```
main (protected — no direct pushes)
 └── dev
      ├── feature/auth
      ├── feature/requisitions
      ├── feature/approval-queue
      ├── feature/purchase-orders
      ├── feature/inventory
      ├── feature/dashboard
      └── feature/audit-log
```

- Every merge to `main` requires a Pull Request + ≥1 reviewer who is **not** the author.
- Commit format: `type(scope): short description` — e.g., `feat(requisition): add offline queueing`

---

## Seed Users (development only — fake data, no real PII)

| Email | Password | Role |
|---|---|---|
| alice@erpdemo.local | demo1234 | employee |
| bob@erpdemo.local | demo1234 | manager |
| carol@erpdemo.local | demo1234 | manager (dept head) |
| dave@erpdemo.local | demo1234 | admin |

---

## Delivery Phases

1. **Phase 1** — UI shell + mock data + role-based views
2. **Phase 2** — Neon DB + real API, auth, all business rules
3. **Phase 3** — WebSocket real-time + offline queueing
4. **Phase 4** — Responsive QA + E2E tests + audit review
