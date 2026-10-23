<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router, Turbopack) app — the "Sophos Firewall Sizer". Standard commands live in `package.json` and `README.md`; prefer those over duplicating here.

- Demo mode: with no `DATABASE_URL` set, the app runs entirely on an in-memory store (`lib/db/demo-store.ts`) and auto-seeds demo users, so no Postgres/Neon is needed to run or test locally. `isDemoMode()` is true when `DATABASE_URL` is unset or `DEMO_MODE=true`. This is the default dev setup here.
- Auth requires `AUTH_SECRET`. A gitignored `.env.local` is created during setup with `AUTH_SECRET`, `AUTH_URL=http://localhost:3000`, and `NEXT_PUBLIC_APP_URL=http://localhost:3000`. If `.env.local` is missing, recreate it (e.g. `AUTH_SECRET=$(openssl rand -base64 32)`); `.env*` is gitignored so it never gets committed.
- Demo login credentials (seeded automatically in demo mode): Account Manager `admin@example.com` / `changeme123`, Sales Engineer `se@example.com` / `changeme123`. Demo data is in-memory only and resets on server restart.
- Run: `npm run dev` (http://localhost:3000). Lint: `npm run lint`. Build: `npm run build`.
- To use a real database instead of demo mode, set `DATABASE_URL` to a Neon Postgres string, then run `npm run db:push`, `npm run db:seed`, and `npm run db:seed-catalog` (see `README.md`). The `db:*` scripts require `DATABASE_URL` and are not needed for demo-mode development.
- `middleware.ts` emits a deprecation warning (rename to `proxy`) on this Next version — it is harmless and does not affect running the app.
