# Sophos Firewall Sizer

Multi-site sizing questionnaire for Sophos Firewall, Switch, and Wireless (AP) products, with vanity URLs, a presales dashboard, role-based access, partner magic links, SE review workflow, and admin-only catalog management.

## Features

- **Vanity URLs** — AM/SE/partner creates `/r/{slug}` links; anyone on the contact’s email domain confirms email before the wizard unlocks
- **Multi-site wizard** — customers add sites and pick Firewall / Switches / Wireless; drafts autosave in the browser and on the server
- **Firewall sizing** — Minimum / Recommended / Optimal tiers from public Sophos XGS specs (physical, virtual, AWS, Azure)
- **Switch sizing** — port/PoE/speed tiers with **switch quantity** for multi-unit campuses
- **Wireless / AP handoff** — site survey + uploads; email/summary for `presalesdesk-wireless@sophos.com` (no automated AP BOM)
- **Roles**
  - **Account Manager** — own links only; Flag for SE; export unlocked after SE review
  - **Sales Engineer** — all requests; SE review queue; Mark reviewed / Needs changes (notifies AM); SE correction
  - **Partner** — magic-link portal to create links (sponsored by an SE)
  - **Admin** — catalog admin, archive, recalculate open BOMs
- **Flag → Review → export** — Flag notifies SEs; Reviewed / Needs changes notifies the AM; AM CSV/quote export soft-gated until reviewed
- **Resubmit & version history** — reopen for customer correction or SE answer correction; prior submissions archived
- **Catalog admin (admins only)** — edit specs/SKUs, CSV import/export, audit trail, recalculate BOMs for open deals
- **User guides** — PDFs in `public/guides/` (regenerate with `npm run docs:guides`)

## Stack

- Next.js 16 (App Router)
- PostgreSQL via Neon + Drizzle ORM
- Auth.js (credentials) for presales login; partner magic links; optional passkeys/SSO
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

If you're upgrading an existing database, run the numbered migration scripts in `scripts/` in order (`migrate-v2.sql` … `migrate-v13.sql`) against your database before or alongside `db:push`.

Seed users and catalogs:

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

## Workflow (AM ↔ SE)

1. Create link (AM/partner picks an **aligned SE**) → customer submits → AM (and SEs) notified
2. AM **Flag for SE** → notifies the **aligned SE by default** (optional “Notify all SEs”); SE queue filter on dashboard
3. SE uses the flagged checklist + optional needs-changes templates → **Mark reviewed** or **Needs changes** → AM notified
4. AM exports CSV / quote only after **reviewed** (SE can always export)
5. Mistakes: **Allow customer resubmit** or **SE correction** (version history kept)

Pilot tip: use `/dashboard/admin/pilot` for 2-week funnel metrics, and `public/guides/when-to-use-sizer.pdf` for AM enablement.

## Sizing logic

- Firewall engine: `lib/sizing/engine.ts` — Min/Rec/Opt use **headroom bands** (≥25% / ≥50%), sorted by the same TLS-aware throughput metric used for comparison
- Switch engine: `lib/sizing/switch-engine.ts` — spare-port bands (≥4 / ≥12)
- Wireless handoff: `lib/sizing/wireless-handoff.ts`
- Multi-site orchestration: `lib/sizing/submission-engine.ts`
- Human-readable algorithm: `/dashboard/admin/sizing-logic`

Model specs live in `firewall_models` / `switch_models` (seeded from bundled JSON). **Admins** edit specs and SKUs at `/dashboard/admin/catalog`. Changes apply to new submissions immediately; use **Recalculate open BOMs** to refresh active submitted deals. If the database is unreachable or empty, the engine falls back to bundled JSON.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Lint |
| `npm run db:push` | Push schema to Postgres |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:seed` | Create/update seed users |
| `npm run db:seed-catalog` | Seed/reset catalog tables from bundled JSON |
| `npm run docs:guides` | Regenerate PDF user guides in `public/guides/` |
| `npm test` | Run golden sizing engine tests |

## Project structure

```
app/                  # App Router pages (dashboard, public /r/[slug], partner, admin)
components/           # UI, forms, dashboard, admin tables
lib/sizing/           # Engines, catalog, BOM export, submission versions
lib/db/               # Drizzle schema + demo store
scripts/              # Seed, migrations, PDF guide generator
public/guides/        # Generated AM/SE and customer PDFs
```

## Notes

- Subscription term pricing (1/3/5-yr) is intentionally out of scope for the BOM today — size first, price in CPQ.
- Some protection/support lines may still use sizing-only SKUs until mapped to orderable catalog entries.
