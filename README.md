# Sophos Firewall Sizer

Multi-site sizing questionnaire for Sophos Firewall, Switch, and Wireless (AP) products, with vanity URLs, a presales dashboard, role-based access, and a catalog admin page.

## Features

- **Vanity URLs** — presales creates `/r/{slug}` links to send to customers, along with the recipient's name/email; the customer must confirm that exact email before the sizing wizard unlocks
- **Multi-site wizard** — customers add one or more named sites and pick which products (Firewall / Switches / Wireless) apply at each
- **Firewall sizing** — Minimum / Recommended / Optimal model tiers from public Sophos XGS specs, across physical, virtual, AWS, and Azure environments
- **Switch sizing** — Minimum / Recommended / Optimal Sophos Switch 200/1000 series tiers based on port count, GbE, uplink, and PoE requirements
- **Wireless / AP handoff** — collects site survey info and uploaded site plans, then generates a pre-filled email + downloadable summary for `presalesdesk-wireless@sophos.com`
- **Roles** — Account Managers see only their own links; Sales Engineers see every link and who created it
- **Catalog admin** (Sales Engineers only) — edit firewall/switch model specs and real order SKUs from the app, no redeploy required
- **Tier overrides** — an AM/SE can re-quote a site's BOM against the Minimum/Recommended/Optimal tier instead of the default
- **Presales dashboard** — view submissions, consolidated bill of materials, and copyable quote summaries

## Stack

- Next.js 16 (App Router)
- PostgreSQL via Neon + Drizzle ORM
- Auth.js (credentials) for presales login
- Vercel Blob for wireless site plan uploads (falls back to inline storage if unconfigured)
- Tailwind CSS + shadcn/ui + Base UI

## Local development

### 1. Clone and install

```bash
cd ~/Projects/sophos-firewall-sizer
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string. **Omit this to run in demo mode** (in-memory data, no setup required). |
| `AUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `AUTH_URL` | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local vanity links |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for wireless site plan uploads. Optional — uploads fall back to inline storage if unset (fine for local/demo use). |

### 3. Set up the database

Create a free database at [neon.tech](https://neon.tech), then push the schema:

```bash
npm run db:push
```

If you're upgrading an existing database from an earlier version of this app rather than starting fresh, also run the numbered migration scripts in `scripts/` in order (`migrate-v2.sql`, `migrate-v3.sql`, `migrate-v4.sql`) against your database before `db:push`/`db:seed`.

Seed the presales users (one Account Manager, one Sales Engineer) and the firewall/switch catalogs:

```bash
npm run db:seed
npm run db:seed-catalog
```

Default credentials (override via env vars in `.env.local`):

| Role | Email | Password |
|------|-------|----------|
| Account Manager | `admin@example.com` | `changeme123` |
| Sales Engineer | `se@example.com` | `changeme123` |

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and create a sizing link.

## Deploy to Vercel + Neon

### Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string

### Vercel Blob (site plan uploads)

1. In the Vercel dashboard: Storage → Create Database → Blob
2. Connect it to this project — this automatically sets `BLOB_READ_WRITE_TOKEN` for you
3. Run `vercel env pull` locally if you want the same token for local dev

### Vercel

1. Import the repository in [vercel.com](https://vercel.com)
2. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string |
| `AUTH_SECRET` | Production secret |
| `AUTH_URL` | `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` |
| `BLOB_READ_WRITE_TOKEN` | Set automatically if you connected Blob storage above |

3. Deploy, then run migrations and seed against production:

```bash
DATABASE_URL="your-neon-url" npm run db:push
DATABASE_URL="your-neon-url" SEED_ADMIN_EMAIL=you@company.com SEED_ADMIN_PASSWORD=secure-password npm run db:seed
DATABASE_URL="your-neon-url" npm run db:seed-catalog
```

### Custom domain

1. Add your domain in Vercel → Project → Settings → Domains
2. Update `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your custom domain
3. Redeploy

Example vanity URL: `https://sizer.yourcompany.com/r/acme-corp-jul2026`

## Sizing logic

- Firewall engine: `lib/sizing/engine.ts`
- Switch engine: `lib/sizing/switch-engine.ts`
- Wireless handoff (no automated sizing — presales wireless team scopes APs): `lib/sizing/wireless-handoff.ts`
- Multi-site orchestration: `lib/sizing/submission-engine.ts`

Model specs live in the `firewall_models` / `switch_models` database tables (seeded from `lib/sizing/catalog.json` and `lib/sizing/switch-catalog.json`). **Sales Engineers can edit specs and real order SKUs directly at `/dashboard/admin/catalog`** — changes apply immediately, no redeploy needed. If the database is unreachable or a table is empty, the engine falls back to the bundled JSON files.

To reset a model back to its shipped defaults, re-run `npm run db:seed-catalog` (this overwrites any admin edits for models that still exist in the bundled JSON).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Lint |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:seed` | Create/update Account Manager + Sales Engineer users |
| `npm run db:seed-catalog` | Seed/reset firewall + switch catalog tables from bundled JSON |

## Project structure

```
app/
  api/blob/upload/    Vercel Blob client-upload token endpoint
  dashboard/          Presales dashboard (requests, new link, catalog admin)
  login/              Presales sign-in
  r/[slug]/           Customer multi-site questionnaire
components/
  admin/              Catalog admin tables (SE-only)
  dashboard/          Dashboard UI (submission detail, tier controls, BOM)
  form/               Multi-site wizard + per-product forms
lib/
  sizing/             Engines (firewall, switch, wireless), catalog store, types
  db/                 Drizzle schema, demo in-memory store
  actions.ts          Core server actions (requests, submissions, dashboard)
  catalog-actions.ts  Catalog admin CRUD server actions
  tier-actions.ts     Tier override server action
scripts/
  migrate-v2.sql      Roles + mandatory label migration
  migrate-v3.sql      Catalog admin tables migration
  migrate-v4.sql      Contact name/email columns on sizing_requests
  seed.ts             User seeding
  seed-catalog.ts      Catalog seeding
```

## Known limitations / ideas for next steps

- BOM line items are sizing SKUs without pricing — pricing is expected to happen downstream (SFDC/CPQ)
- No submission history/audit trail — each sizing link accepts a single submission
- Wireless APs are never auto-sized; this app only collects and hands off scoping info to the presales wireless team
- No rate limiting/lockout on repeated wrong-email guesses at the customer email gate
- Sizing links created before this feature have no contact email on file and remain ungated
